'use client';
import { useEffect, useId, useState } from 'react';
import { api } from '@/lib/api';
import { data as dataIt, pct } from '@/lib/formati';
import { Modale } from './Modale';
import { avviso } from './Piccoli';
import { SagomaCorpo, useSagome } from './Sagoma';

// Finestra delle percentuali/scaglioni del fornitore, condivisa fra Fornitori e «Apri la pratica»
// (D-162). Nuova versione o correzione di una versione esistente, con i messaggi d'errore del server.
// D-163: la correzione accetta anche scaglioni aggiunti o tolti (riga «Aggiungi uno sconto %» e ✕),
// e dall'ordine, se alla data proposta esiste già una versione, la finestra passa da sola alla
// correzione di quella versione con lo sconto dell'agenzia già proposto come riga nuova.

export interface Scaglione {
  id: string;
  sconto_min: number;
  pct_agente: number;
  pct_subagente: number;
  valido_dal: string;
}
export interface EccezioneScaglione {
  id: string;
  subagente_id: string;
  subagente: string;
  pct_personale: number;
  valido_dal: string;
  valido_al: string | null;
}
export interface ScaglioneVersione extends Scaglione {
  dal_fornitore: number;
  clienti: number;
  eccezioni: EccezioneScaglione[];
}
export interface Versione {
  valido_dal: string;
  in_vigore: boolean;
  modificabile: boolean;
  scaglioni: ScaglioneVersione[];
}
export interface Percentuali {
  in_vigore: string | null;
  versioni: Versione[];
}

interface RigaBozza {
  sconto_min: string;
  pct_agente: string;
  pct_subagente: string;
  nuova: boolean;
}

const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export interface FormPercentualiProps {
  idFornitore: string;
  ragioneSociale: string | null;
  correzione?: Versione | null; // presente = correggi questa versione; assente = nuova versione
  validoDalProposta?: string; // nuova: proposta per «Valide dal» (default oggi)
  nonOltre?: string; // nuova dal documento: «Valide dal» non oltre questa data (l'ordine)
  scontoAgenzia?: number; // D-163: dall'ordine, precompila lo sconto della riga nuova quando si passa alla correzione
  onSalvata: (p: Percentuali) => void;
  onChiudi: () => void;
}

export function FormPercentuali({ idFornitore, ragioneSociale, correzione = null, validoDalProposta, nonOltre, scontoAgenzia, onSalvata, onChiudi }: FormPercentualiProps) {
  const id = useId();
  const [percentuali, setPercentuali] = useState<Percentuali | null>(null);
  const [modo, setModo] = useState<'nuova' | 'correggi'>(correzione ? 'correggi' : 'nuova');
  const [versione, setVersione] = useState<Versione | null>(correzione ?? null);
  const [validoDal, setValidoDal] = useState(validoDalProposta ?? oggi());
  const [righe, setRighe] = useState<RigaBozza[]>([]);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  // righe della versione più recente (nuova) o di quella da correggere; in coda la riga nuova vuota
  const righeDa = (v: Versione | null, versioni: Versione[]) => [
    ...(v ? v.scaglioni : versioni[0]?.scaglioni ?? []).map((s) => ({ sconto_min: String(s.sconto_min), pct_agente: String(s.pct_agente), pct_subagente: String(s.pct_subagente), nuova: false })),
    { sconto_min: v && scontoAgenzia !== undefined ? String(scontoAgenzia) : '', pct_agente: '', pct_subagente: '', nuova: true },
  ];

  useEffect(() => {
    let vivo = true;
    setPercentuali(null);
    setErrore('');
    void api<Percentuali>('fornitori/' + idFornitore + '/percentuali').then((r) => {
      if (!vivo) return;
      if (!r.ok) { setErrore(r.messaggio); return; }
      setPercentuali(r.dati);
      // D-163: dall'ordine, se alla data proposta esiste già una versione si corregge quella (non si crea)
      const vCorr = correzione ?? (scontoAgenzia !== undefined && validoDalProposta
        ? r.dati.versioni.find((v) => v.valido_dal === validoDalProposta) ?? null
        : null);
      setModo(vCorr ? 'correggi' : 'nuova');
      setVersione(vCorr);
      setValidoDal(vCorr ? vCorr.valido_dal : validoDalProposta ?? oggi());
      setRighe(righeDa(vCorr, r.dati.versioni));
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFornitore, correzione, validoDalProposta, scontoAgenzia]);

  const titolo = (versione ? 'Correggi le percentuali di ' : 'Nuove percentuali di ') + (ragioneSociale ?? '');
  const sagome = useSagome(!percentuali);

  const metti = (i: number, k: keyof RigaBozza, v: string) => setRighe((x) => x.map((z, j) => j === i ? { ...z, [k]: v } : z));
  const togli = (i: number) => setRighe((x) => x.filter((_, j) => j !== i));
  const nScaglioni = righe.filter((r) => !r.nuova).length;

  async function salva() {
    if (modo === 'nuova' && !validoDal) { setErrore('Indica la data da cui valgono.'); return; }
    const scaglioni: { sconto_min: number; pct_agente: number; pct_subagente: number }[] = [];
    for (const r of righe) {
      if (r.nuova && !r.sconto_min.trim()) continue;
      if (r.pct_agente === '' || r.pct_subagente === '') { setErrore('Indica le due percentuali per lo sconto ' + r.sconto_min + ' %.'); return; }
      scaglioni.push({ sconto_min: Number(r.sconto_min), pct_agente: Number(r.pct_agente), pct_subagente: Number(r.pct_subagente) });
    }
    if (!scaglioni.length) { setErrore('Indica almeno uno scaglione.'); return; }
    setErrore('');
    setAttesa(true);
    const r = modo === 'nuova'
      ? await api<Percentuali>('fornitori/' + idFornitore + '/percentuali', { valido_dal: validoDal, scaglioni })
      : await api<Percentuali>('fornitori/' + idFornitore + '/percentuali/' + versione!.valido_dal, { scaglioni }, 'PUT');
    setAttesa(false);
    if (!r.ok) {
      // D-163: la data scelta ha già una versione → si passa alla correzione di quella versione
      if (modo === 'nuova' && /usa la correzione/.test(r.messaggio)) {
        const vCorr = percentuali?.versioni.find((v) => v.valido_dal === validoDal) ?? null;
        if (vCorr) {
          setModo('correggi'); setVersione(vCorr); setValidoDal(vCorr.valido_dal);
          setRighe(righeDa(vCorr, percentuali!.versioni));
          setErrore('');
          return;
        }
      }
      setErrore(r.messaggio);
      return;
    }
    avviso(modo === 'nuova' ? 'Percentuali salvate: valgono dal ' + dataIt(validoDal) : 'Percentuali corrette');
    onSalvata(r.dati);
  }

  if (!percentuali) {
    return <Modale titolo={titolo} testo={errore || undefined} onChiudi={onChiudi}>{errore ? null : sagome && <SagomaCorpo />}</Modale>;
  }

  const aiutoValidoDal = modo === 'nuova'
    ? 'Deve venire dopo l’ultima chiusura (bollettino verificato o trimestre liquidato); può cadere fra due versioni.' + (nonOltre ? ' Non oltre il ' + nonOltre + ' (data dell’ordine).' : '')
    : undefined;

  return (
    <Modale titolo={titolo}
      testo={modo === 'nuova' ? 'Valgono per i documenti con data uguale o successiva a quella indicata.' : 'La correzione sostituisce le percentuali di questa versione: puoi aggiungere o togliere uno scaglione.'}
      onChiudi={() => { if (!attesa) onChiudi(); }}
      piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        <button type="submit" form={id} className="btn" disabled={attesa}>{attesa ? 'Attendi…' : modo === 'nuova' ? 'Salva le nuove percentuali' : 'Salva la correzione'}</button>
      </>}>
      <form id={id} className="modulo" onSubmit={(ev) => { ev.preventDefault(); void salva(); }} noValidate>
        <div className="campo largo">
          <label htmlFor="c-valido_dal">Valide dal</label>
          <input id="c-valido_dal" name="valido_dal" type="date" value={validoDal} disabled={modo === 'correggi'} onChange={(e) => setValidoDal(e.target.value)} />
          {aiutoValidoDal && <span className="aiuto">{aiutoValidoDal}</span>}
        </div>
        <div className="righe-testa"><h3>Scaglioni</h3></div>
        {righe.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div className="campo" style={{ flex: '0 0 8.5rem' }}>
              <label>Sconto</label>
              {r.nuova
                ? <input id={'c-sconto' + i} value={r.sconto_min} placeholder="Aggiungi uno sconto %" onChange={(e) => metti(i, 'sconto_min', e.target.value)} />
                : <span className="testo-tenue" style={{ padding: '7px 0' }}>{pct(Number(r.sconto_min))}</span>}
            </div>
            <div className="campo" style={{ flex: 1 }}>
              <label htmlFor={'c-agente' + i}>A Decobrands %</label>
              <input id={'c-agente' + i} value={r.pct_agente} inputMode="decimal" onChange={(e) => metti(i, 'pct_agente', e.target.value)} />
            </div>
            <div className="campo" style={{ flex: 1 }}>
              <label htmlFor={'c-sub' + i}>Al subagente %</label>
              <input id={'c-sub' + i} value={r.pct_subagente} inputMode="decimal" onChange={(e) => metti(i, 'pct_subagente', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'flex-end', paddingBottom: 4 }}>
              {!r.nuova && nScaglioni > 1
                ? <button type="button" className="btn testo piccolo" title="Togli lo sconto" aria-label={'Togli lo sconto ' + pct(Number(r.sconto_min))} onClick={() => togli(i)}>✕</button>
                : <span style={{ width: 24 }} />}
            </div>
          </div>
        ))}
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
    </Modale>
  );
}
