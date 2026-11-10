'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { fornitore, subagente } from '@/lib/entita';
import type { CampoProps } from './Campo';
import { FormModal } from './FormModal';
import { Modale } from './Modale';
import { avviso } from './Piccoli';
import { usePuo } from './Utente';

// Finestra dell'agenzia (interscambio) condivisa fra Clienti e Documenti (F2-A5, D-106): nuovo o
// modifica, con il fornitore fisso facoltativo (dal documento) e i valori iniziali (codice cliente,
// data). I messaggi d'errore sono quelli del server. L'eliminazione resta in Clienti.

export interface Agenzia {
  id: string;
  subagente_id: string;
  subagente: string | null;
  subagente_codice: string | null;
  fornitore_id: string;
  fornitore: string | null;
  codice_cliente_fornitore: string | null;
  sconto: number;
  pct_subagente: number | null;
  regola_mensile: string | null;
  valido_dal: string;
  valido_al: string | null;
}

interface Fornitore { id: string; ragione_sociale: string | null; }
interface Subagente { id: string; codice: string; nome: string; cognome: string; }
interface Scaglione { sconto_min: number; valido_dal: string; }

const NOTA_RESP = 'Li cambia un responsabile.'; // D-50 §19

/** Sconti degli scaglioni in vigore (ultima data non futura), per l'aiuto della finestra (§7.6). */
function scontiInVigore(sc: Scaglione[], oggi: string) {
  const dal = sc.map((x) => x.valido_dal).filter((d) => d <= oggi).sort().pop();
  return [...new Set(sc.filter((x) => x.valido_dal === dal).map((x) => x.sconto_min))].sort((a, b) => a - b);
}

// gli scaglioni dei fornitori si tengono in memoria fra un'apertura e l'altra (costa una lettura)
const scaglioni = new Map<string, Scaglione[]>();

export interface FormAgenziaProps {
  cliente: { id: string; nome: string | null };
  agenzia?: Agenzia | null; // null = nuova
  fornitoreFisso?: { id: string; nome: string } | null; // dal documento: il fornitore non si cambia
  iniziali?: { codice_cliente_fornitore?: string | null; valido_dal?: string | null };
  onSalvata: () => void | Promise<void>;
  onChiudi: () => void;
}

export function FormAgenzia({ cliente, agenzia = null, fornitoreFisso = null, iniziali, onSalvata, onChiudi }: FormAgenziaProps) {
  const resp = usePuo()('dati.condizioni');
  const [fornitori, setFornitori] = useState<Fornitore[] | null>(null);
  const [subagenti, setSubagenti] = useState<Subagente[] | null>(null);
  const [aiutoSconto, setAiutoSconto] = useState<string | undefined>(undefined);
  const oggi = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [f, s] = await Promise.all([api<Fornitore[]>('fornitori'), api<Subagente[]>('subagenti')]);
      if (!vivo) return;
      const forn = f.ok ? f.dati : [];
      setFornitori(forn);
      setSubagenti(s.ok ? s.dati : []);
      const primo = fornitoreFisso?.id ?? agenzia?.fornitore_id ?? forn[0]?.id;
      await Promise.all(forn.filter((x) => !scaglioni.has(x.id)).map(async (x) => {
        const d = await api<{ scaglioni: Scaglione[] }>('fornitori/' + x.id);
        if (d.ok) scaglioni.set(x.id, d.dati.scaglioni);
      }));
      const voci = [...forn].sort((a, b) => (a.id === primo ? -1 : b.id === primo ? 1 : 0))
        .filter((x) => scaglioni.get(x.id)?.length)
        .map((x) => (x.ragione_sociale ?? x.id) + ': ' + scontiInVigore(scaglioni.get(x.id)!, oggi).join(' · '));
      if (voci.length) setAiutoSconto('Scaglioni in vigore, sconti in %. ' + voci.join(' — '));
    })();
    return () => { vivo = false; };
  }, [agenzia, fornitoreFisso, oggi]);

  const campi: CampoProps[] | null = useMemo(() => {
    if (!fornitori || !subagenti) return null;
    // D-50 §19: percentuale e regola solo al responsabile; per gli altri i campi sono spenti e non si inviano
    const conResp = (c: CampoProps[]) => c.map((x) => ((x.nome === 'pct_subagente' || x.nome === 'regola_mensile') && !resp ? { ...x, disabilitato: true, aiuto: NOTA_RESP } : x));
    const campoFornitore: CampoProps = fornitoreFisso
      ? { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'testo', valore: fornitoreFisso.nome, disabilitato: true }
      : { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: fornitore, valore: agenzia?.fornitore_id ?? fornitori[0]?.id ?? '' };
    return conResp([
      campoFornitore,
      { nome: 'subagente_id', etichetta: 'Subagente', tipo: 'ricerca', entita: subagente, valore: agenzia?.subagente_id ?? subagenti[0]?.id ?? '' },
      { nome: 'codice_cliente_fornitore', etichetta: 'Codice cliente presso il fornitore', tipo: 'testo', valore: agenzia?.codice_cliente_fornitore ?? iniziali?.codice_cliente_fornitore ?? '' },
      { nome: 'sconto', etichetta: 'Sconto %', tipo: 'testo', valore: agenzia ? String(agenzia.sconto) : '0', aiuto: aiutoSconto },
      { nome: 'pct_subagente', etichetta: 'Al subagente per questo cliente % (vuoto = scaglione)', tipo: 'testo', valore: agenzia ? (agenzia.pct_subagente === null ? '' : String(agenzia.pct_subagente)) : '' },
      { nome: 'regola_mensile', etichetta: 'Provvigione al subagente', tipo: 'select', valore: agenzia?.regola_mensile ?? '', opzioni: [{ value: '', label: 'Su ogni fattura' }, { value: 'prima', label: 'Una fattura al mese: la prima' }, { value: 'piu_alta', label: 'Una fattura al mese: la più alta' }] },
      { nome: 'valido_dal', etichetta: 'Valido dal', tipo: 'testo', valore: agenzia?.valido_dal ?? iniziali?.valido_dal ?? oggi },
      { nome: 'valido_al', etichetta: 'Valido al (vuoto = oggi)', tipo: 'testo', valore: agenzia?.valido_al ?? '' },
    ]);
  }, [fornitori, subagenti, agenzia, fornitoreFisso, iniziali, aiutoSconto, resp, oggi]);

  if (!campi) return <Modale titolo={agenzia ? 'Modifica agenzia' : 'Nuova agenzia'} testo="Caricamento…" onChiudi={onChiudi} />;

  return (
    <FormModal titolo={agenzia ? 'Modifica agenzia' : 'Nuova agenzia per ' + (cliente.nome ?? '')} conferma={agenzia ? 'Salva' : 'Crea'} colonne={2}
      campi={campi} onChiudi={onChiudi}
      onConferma={async (v) => {
        const corpo: Record<string, unknown> = {
          fornitore_id: Number(fornitoreFisso?.id ?? v.fornitore_id),
          subagente_id: Number(v.subagente_id),
          codice_cliente_fornitore: v.codice_cliente_fornitore || null,
          sconto: Number(v.sconto ?? 0),
          valido_dal: v.valido_dal,
          valido_al: v.valido_al || null,
        };
        if (v.pct_subagente !== undefined) corpo.pct_subagente = v.pct_subagente ? Number(v.pct_subagente) : null;
        if (v.regola_mensile !== undefined) corpo.regola_mensile = v.regola_mensile || null;
        const r = await api<Agenzia>('clienti/' + cliente.id + (agenzia ? '/agenzie/' + agenzia.id : '/agenzie'), corpo, agenzia ? 'PUT' : undefined);
        if (!r.ok) return r.messaggio;
        avviso(agenzia ? 'Agenzia salvata' : 'Agenzia creata');
        await onSalvata();
        return undefined;
      }} />
  );
}
