'use client';
import { useEffect, useId, useState } from 'react';
import { api } from '@/lib/api';
import { pct, oggi } from '@/lib/formati';
import { Modale } from './Modale';
import { avviso } from './Piccoli';
import { SagomaCorpo, useSagome } from './Sagoma';

// Finestra di UN solo scaglione (D-168): inserirlo o modificarlo. Le percentuali stanno nella tabella
// della pagina Fornitori; qui si cambia una riga per volta. Al salvataggio il frontend ricompone
// l'elenco della versione e lo manda con le rotte che già ci sono (POST versione nuova, PUT
// correzione), così i controlli restano tutti nel server (V12, V13): sovrapposizioni, pct_subagente
// ≤ pct_agente (D-166), chiusure, scaglioni usati da eccezioni o da periodi chiusi.

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

interface ScaglioneInvio { sconto_min: number; pct_agente: number; pct_subagente: number }

export interface FormPercentualiProps {
  idFornitore: string;
  ragioneSociale: string | null;
  scaglione?: ScaglioneVersione | null; // presente = modifica questo scaglione
  validoDal?: string; // proposta per «Valide dal» (default oggi)
  validoDalFisso?: boolean; // modifica o da Apri la pratica: la data non si cambia
  sconto?: number | null; // precompilato (modifica o da Apri la pratica)
  scontoFisso?: boolean;
  onSalvata: (p: Percentuali) => void;
  onChiudi: () => void;
}

export function FormPercentuali({ idFornitore, ragioneSociale, scaglione = null, validoDal, validoDalFisso = false, sconto = null, scontoFisso = false, onSalvata, onChiudi }: FormPercentualiProps) {
  const id = useId();
  const [percentuali, setPercentuali] = useState<Percentuali | null>(null);
  const [dal, setDal] = useState(scaglione ? scaglione.valido_dal : validoDal ?? oggi());
  const [scontoMin, setScontoMin] = useState(scaglione ? String(scaglione.sconto_min) : sconto != null ? String(sconto) : '');
  const [agente, setAgente] = useState(scaglione ? String(scaglione.pct_agente) : '');
  const [sub, setSub] = useState(scaglione ? String(scaglione.pct_subagente) : '');
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    let vivo = true;
    void api<Percentuali>('fornitori/' + idFornitore + '/percentuali').then((r) => {
      if (!vivo) return;
      if (!r.ok) { setErrore(r.messaggio); return; }
      setPercentuali(r.dati);
    });
    return () => { vivo = false; };
  }, [idFornitore]);

  const titolo = (scaglione ? 'Modifica lo scaglione di ' : 'Nuovo scaglione di ') + (ragioneSociale ?? '');
  const sagome = useSagome(!percentuali);

  const margine = agente !== '' && sub !== '' && Number.isFinite(Number(agente)) && Number.isFinite(Number(sub))
    ? Number(agente) - Number(sub) : null;

  async function salva() {
    if (!percentuali) return;
    if (!dal) { setErrore('Indica la data da cui vale.'); return; }
    if (scontoMin.trim() === '') { setErrore('Indica lo sconto.'); return; }
    if (agente === '' || sub === '') { setErrore('Indica le due percentuali.'); return; }
    if (Number(sub) > Number(agente)) { setErrore('La percentuale del subagente supera quella dal fornitore.'); return; }
    const nuovo: ScaglioneInvio = { sconto_min: Number(scontoMin), pct_agente: Number(agente), pct_subagente: Number(sub) };
    setErrore('');
    setAttesa(true);
    // D-168: si ricompone l'elenco della versione (quella alla data, o quella in vigore alla data se la
    // data non esiste ancora) e si manda con le rotte esistenti; i controlli li fa il server.
    // Modifica o versione nuova: lo sconto sostituisce quello uguale (o si aggiunge). Nuovo scaglione
    // su una versione esistente: si accoda sempre, e se lo sconto c'è già il server rifiuta «Uno sconto è ripetuto».
    const versione = percentuali.versioni.find((v) => v.valido_dal === dal);
    const inVigore = versione ?? percentuali.versioni.find((v) => v.valido_dal <= dal);
    const scaglioni = (inVigore?.scaglioni ?? []).map((s) => ({ sconto_min: s.sconto_min, pct_agente: s.pct_agente, pct_subagente: s.pct_subagente }));
    const i = scaglioni.findIndex((s) => s.sconto_min === nuovo.sconto_min);
    if ((scaglione || !versione) && i >= 0) scaglioni[i] = nuovo; else scaglioni.push(nuovo);
    const r = versione
      ? await api<Percentuali>('fornitori/' + idFornitore + '/percentuali/' + versione.valido_dal, { scaglioni }, 'PUT')
      : await api<Percentuali>('fornitori/' + idFornitore + '/percentuali', { valido_dal: dal, scaglioni });
    setAttesa(false);
    if (!r.ok) { setErrore(r.messaggio); return; }
    avviso(scaglione ? 'Scaglione modificato' : 'Scaglione salvato');
    onSalvata(r.dati);
  }

  if (!percentuali) {
    return <Modale titolo={titolo} testo={errore || undefined} onChiudi={onChiudi}>{errore ? null : sagome && <SagomaCorpo />}</Modale>;
  }

  const aiutoDal = validoDalFisso ? undefined
    : 'Deve venire dopo l’ultima chiusura del fornitore. Una data senza versione ne crea una nuova che copia gli scaglioni in vigore a quella data.';

  return (
    <Modale titolo={titolo}
      testo={scaglione ? 'Cambia le percentuali di questo scaglione.' : 'Una data nuova crea una versione che copia gli scaglioni in vigore a quella data e applica questo scaglione.'}
      onChiudi={() => { if (!attesa) onChiudi(); }}
      piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        <button type="submit" form={id} className="btn" disabled={attesa}>{attesa ? 'Attendi…' : 'Salva'}</button>
      </>}>
      <form id={id} className="modulo" onSubmit={(ev) => { ev.preventDefault(); void salva(); }} noValidate>
        <div className="campo">
          <label htmlFor="c-valido_dal">Valide dal</label>
          <input id="c-valido_dal" name="valido_dal" type="date" value={dal} disabled={validoDalFisso} onChange={(e) => setDal(e.target.value)} />
          {aiutoDal && <span className="aiuto">{aiutoDal}</span>}
        </div>
        <div className="campo">
          <label htmlFor="c-sconto">Sconto da %</label>
          <input id="c-sconto" name="sconto_min" type="number" inputMode="decimal" min={0} max={100} value={scontoMin} disabled={scontoFisso} onChange={(e) => setScontoMin(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="c-agente">Provvigione dal fornitore %</label>
          <input id="c-agente" name="pct_agente" type="number" inputMode="decimal" min={0} max={100} value={agente} onChange={(e) => setAgente(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="c-sub">di cui al subagente %</label>
          <input id="c-sub" name="pct_subagente" type="number" inputMode="decimal" min={0} max={100} value={sub} onChange={(e) => setSub(e.target.value)} />
        </div>
        <div className="campo">
          <span className="testo-tenue">Margine Decobrands</span>
          <span>{margine == null ? '—' : pct(margine)}</span>
        </div>
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
    </Modale>
  );
}
