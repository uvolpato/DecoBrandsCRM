'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { fornitore, subagente } from '@/lib/entita';
import { oggi } from '@/lib/formati';
import type { CampoProps } from './Campo';
import { FormModal } from './FormModal';
import { Conferma, Modale } from './Modale';
import { avviso } from './Piccoli';
import { SagomaCorpo, useSagome } from './Sagoma';
import { usePuo } from './Utente';

// Finestra dell'agenzia (interscambio) condivisa fra Clienti e Documenti (F2-A5, D-106): nuovo o
// modifica, con il fornitore fisso facoltativo (dal documento) e i valori iniziali (codice cliente,
// data). I messaggi d'errore sono quelli del server. L'eliminazione resta in Clienti.

export interface Agenzia {
  id: string;
  subagente_id: string | null;
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
  da_confermare: boolean;
}

interface Fornitore { id: string; ragione_sociale: string | null; }
interface Subagente { id: string; codice: string; nome: string; cognome: string; }
/** Sconti degli scaglioni in vigore, calcolati dal server (R2-06, V12). */
interface ScontiFornitore { fornitore_id: string; sconti: number[]; }
/** Riga dello storico dei legami (D-112): propone subagente, codice e sconto del vecchio CRM. */
interface RigaStorico {
  id: string;
  cliente_codice_fornitore: string | null;
  subagente_nome: string | null;
  subagente_id: string | null;
  sconto_1: number;
  rappresentato: boolean;
}

const NOTA_RESP = 'Li cambia un responsabile.'; // D-50 §19
// senza subagente la provvigione è tutta di Decobrands: percentuale e regola non hanno senso
const NOTA_SENZA_SUB = 'Senza subagente la provvigione è tutta di Decobrands.';

export interface FormAgenziaProps {
  cliente: { id: string; nome: string | null };
  agenzia?: Agenzia | null; // null = nuova
  fornitoreFisso?: { id: string; nome: string } | null; // dal documento: il fornitore non si cambia
  iniziali?: { codice_cliente_fornitore?: string | null; valido_dal?: string | null };
  // D-158: campi non modificabili (dal documento); il cliente è già fisso per rotta, il fornitore via fornitoreFisso
  bloccati?: ('cliente' | 'fornitore' | 'codice')[];
  onSalvata: () => void | Promise<void>;
  onChiudi: () => void;
}

export function FormAgenzia({ cliente, agenzia = null, fornitoreFisso = null, iniziali, bloccati, onSalvata, onChiudi }: FormAgenziaProps) {
  const resp = usePuo()('dati.condizioni');
  const [fornitori, setFornitori] = useState<Fornitore[] | null>(null);
  const [subagenti, setSubagenti] = useState<Subagente[] | null>(null);
  // sconti in vigore per fornitore (V12) e fornitore scelto (o fisso dal documento): servono all'aiuto
  // dello sconto, che mostra gli scaglioni del fornitore scelto e non di tutti (15/11/2026).
  const [sconti, setSconti] = useState<Map<string, number[]>>(new Map());
  const [fornitoreScelto, setFornitoreScelto] = useState<string>(fornitoreFisso?.id ?? agenzia?.fornitore_id ?? '');
  // subagente scelto: se vuoto, pct_subagente e regola_mensile si disattivano (provvigione tutta di Decobrands)
  const [subagenteScelto, setSubagenteScelto] = useState<string>(agenzia?.subagente_id ?? '');
  const [errore, setErrore] = useState('');
  // D-170 §19: lasciare la finestra (link del pallino o degli scaglioni) con dati non salvati chiede conferma
  const [conferma, setConferma] = useState<{ risolvi: (si: boolean) => void } | null>(null);
  const linkConferma = () => new Promise<boolean>((risolvi) => setConferma({ risolvi }));

  // D-112: dal documento (fornitore fisso + codice letto) si legge lo storico una volta, all'apertura
  const codice = iniziali?.codice_cliente_fornitore ?? null;
  const daStorico = !agenzia && !!fornitoreFisso && !!codice;
  const [legame, setLegame] = useState<RigaStorico | null>(null);
  const [legameLetto, setLegameLetto] = useState(!daStorico);

  useEffect(() => {
    if (!daStorico) return;
    let vivo = true;
    // D-112: la riga dello storico della coppia (fornitore fisso dal documento, codice letto)
    const q = new URLSearchParams({ fornitore_id: fornitoreFisso!.id, cliente_id: cliente.id, codice: codice! });
    void api<RigaStorico[]>('interscambio/storico?' + q).then((r) => {
      if (!vivo) return;
      // la riga con subagente vince; quella senza dice solo che il fornitore non era rappresentato
      setLegame(r.ok ? (r.dati.find((x) => x.rappresentato) ?? r.dati[0] ?? null) : null);
      setLegameLetto(true);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daStorico, cliente.id, fornitoreFisso?.id, codice]);

  // D-112: la riga dello storico può proporre il subagente; si riflette sullo stato che disattiva i campi
  useEffect(() => {
    if (legame?.rappresentato && legame.subagente_id) setSubagenteScelto((prev) => prev || String(legame.subagente_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legame]);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      // V12: fornitori, subagenti e sconti in vigore si rileggono dal server a ogni apertura
      const [f, s, sc] = await Promise.all([
        api<Fornitore[]>('fornitori'),
        api<Subagente[]>('subagenti'),
        api<ScontiFornitore[]>('fornitori/sconti-in-vigore'),
      ]);
      if (!vivo) return;
      if (!f.ok || !s.ok || !sc.ok) { setErrore(f.messaggio || s.messaggio || sc.messaggio); return; }
      setFornitori(f.dati);
      setSubagenti(s.dati);
      setSconti(new Map(sc.dati.map((x) => [x.fornitore_id, x.sconti])));
      setFornitoreScelto((prev) => prev || fornitoreFisso?.id || agenzia?.fornitore_id || f.dati[0]?.id || '');
    })();
    return () => { vivo = false; };
  }, [agenzia, fornitoreFisso]);

  const campi: CampoProps[] | null = useMemo(() => {
    if (!fornitori || !subagenti) return null;
    // D-50 §19: percentuale e regola solo al responsabile; senza subagente sono spenti (tutta a Decobrands)
    const senzaSub = !subagenteScelto;
    const conResp = (c: CampoProps[]) => c.map((x) => {
      if (x.nome === 'pct_subagente' || x.nome === 'regola_mensile') {
        if (senzaSub) return { ...x, disabilitato: true, aiuto: NOTA_SENZA_SUB };
        if (!resp) return { ...x, disabilitato: true, aiuto: NOTA_RESP };
      }
      return x;
    });
    const campoFornitore: CampoProps = fornitoreFisso
      ? { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'testo', valore: fornitoreFisso.nome, disabilitato: true }
      : { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: fornitore, valore: agenzia?.fornitore_id ?? fornitori[0]?.id ?? '', nomeIniziale: agenzia?.fornitore ?? fornitori[0]?.ragione_sociale ?? undefined, onCambia: (v) => setFornitoreScelto(v), link: (id) => '/fornitori/' + id, linkConferma };
    // D-112, D-134: si precompila solo dalla riga con subagente che il server ha risolto; se resta
    // vuoto lo sceglie l'operatore (mai il primo dell'elenco)
    const pro = legame?.rappresentato ? legame : null;
    // aiuto dello sconto: gli scaglioni del fornitore scelto (non di tutti), il testo è il link alle
    // percentuali, nella stessa scheda con conferma se ci sono dati non salvati — D-166, 15/11/2026
    const scaglioniScelti = sconti.get(fornitoreScelto) ?? [];
    const aiutoSconto: ReactNode = fornitoreScelto
      ? <Link href={'/fornitori/' + fornitoreScelto + '?scheda=percentuali'} title="Apri le percentuali del fornitore"
          onClick={async (e) => { e.preventDefault(); if (await linkConferma()) window.location.assign('/fornitori/' + fornitoreScelto + '?scheda=percentuali'); }}>
        {scaglioniScelti.length ? 'Scaglioni in vigore: ' + scaglioniScelti.join(' · ') + ' %' : 'Nessuno scaglione in vigore'}
      </Link>
      : null;
    return conResp([
      campoFornitore,
      { nome: 'subagente_id', etichetta: 'Subagente', tipo: 'ricerca', entita: subagente, valore: agenzia?.subagente_id ?? pro?.subagente_id ?? '', nomeIniziale: agenzia?.subagente ?? undefined, onCambia: (v) => setSubagenteScelto(v), link: (id) => '/subagenti/' + id, linkConferma },
      { nome: 'codice_cliente_fornitore', etichetta: 'Codice cliente presso il fornitore', tipo: 'testo', disabilitato: bloccati?.includes('codice'), valore: agenzia?.codice_cliente_fornitore ?? iniziali?.codice_cliente_fornitore ?? pro?.cliente_codice_fornitore ?? '' },
      { nome: 'sconto', etichetta: 'Sconto %', tipo: 'testo', valore: agenzia ? String(agenzia.sconto) : pro ? String(pro.sconto_1) : '0', aiuto: aiutoSconto },
      { nome: 'pct_subagente', etichetta: 'Al subagente per questo cliente %', tipo: 'testo', valore: agenzia ? (agenzia.pct_subagente === null ? '' : String(agenzia.pct_subagente)) : '', aiuto: 'Vuoto = lo scaglione del fornitore.' },
      { nome: 'regola_mensile', etichetta: 'Provvigione al subagente', tipo: 'select', valore: agenzia?.regola_mensile ?? '', opzioni: [{ value: '', label: 'Su ogni fattura' }, { value: 'prima', label: 'Una fattura al mese: la prima' }, { value: 'piu_alta', label: 'Una fattura al mese: la più alta' }] },
      { nome: 'valido_dal', etichetta: 'Valido dal', tipo: 'data', valore: agenzia?.valido_dal ?? iniziali?.valido_dal ?? oggi() },
      { nome: 'valido_al', etichetta: 'Valido al (vuoto = oggi)', tipo: 'data', valore: agenzia?.valido_al ?? '' },
    ]);
  }, [fornitori, subagenti, agenzia, fornitoreFisso, iniziali, sconti, fornitoreScelto, subagenteScelto, resp, legame, bloccati]);

  const testoStorico = legame
    ? legame.rappresentato
      ? `Dal vecchio CRM: subagente ${legame.subagente_nome ?? '—'}, sconto ${legame.sconto_1}%`
      : 'Questo fornitore non era rappresentato per questo cliente'
    : undefined;

  const titolo = agenzia ? 'Modifica agenzia' : 'Nuova agenzia per ' + (cliente.nome ?? '');
  // D-59: sagome nel corpo, non «Caricamento…»; sotto i 150 ms la finestra mostra solo il titolo
  const sagome = useSagome(!fornitori || !subagenti || !legameLetto);

  // R2-13: se una lettura fallisce il form non si apre vuoto: si mostra il messaggio del server
  if (errore) return <Modale titolo={titolo} testo={errore} onChiudi={onChiudi} />;
  if (!campi || !legameLetto) return <Modale titolo={titolo} onChiudi={onChiudi}>{sagome && <SagomaCorpo />}</Modale>;

  return (
    <>
      <FormModal titolo={titolo} conferma={agenzia ? 'Salva' : 'Crea'} colonne={2}
        campi={campi} testo={testoStorico} onChiudi={onChiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {
            fornitore_id: Number(fornitoreFisso?.id ?? v.fornitore_id),
            // senza subagente il campo non si manda: la provvigione è tutta di Decobrands
            ...(v.subagente_id ? { subagente_id: Number(v.subagente_id) } : {}),
            // D-158: il campo bloccato non è nel form (disabilitato): si riprende il valore iniziale
            codice_cliente_fornitore: (bloccati?.includes('codice') ? (agenzia?.codice_cliente_fornitore ?? iniziali?.codice_cliente_fornitore) : v.codice_cliente_fornitore) || null,
            sconto: Number(v.sconto ?? 0),
            valido_dal: v.valido_dal,
            valido_al: v.valido_al || null,
          };
          if (legame) corpo.storico_id = Number(legame.id); // D-112: la riga passa a usata nella stessa transazione
          if (v.pct_subagente !== undefined) corpo.pct_subagente = v.pct_subagente ? Number(v.pct_subagente) : null;
          if (v.regola_mensile !== undefined) corpo.regola_mensile = v.regola_mensile || null;
          const r = await api<Agenzia>('clienti/' + cliente.id + (agenzia ? '/agenzie/' + agenzia.id : '/agenzie'), corpo, agenzia ? 'PUT' : undefined);
          if (!r.ok) return r.messaggio;
          avviso(agenzia ? 'Agenzia salvata' : 'Agenzia creata');
          await onSalvata();
          return undefined;
        }} />
      {conferma && <Conferma titolo="Dati non salvati" testo="Hai modifiche non salvate: uscire senza salvare?" etichetta="Esci" annulla="Resta"
        onRisposta={(si) => { const c = conferma; setConferma(null); c.risolvi(si); }} />}
    </>
  );
}
