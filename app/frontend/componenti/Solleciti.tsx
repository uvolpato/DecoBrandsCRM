'use client';
import { useEffect, useRef, useState } from 'react';
import { avviso } from './Piccoli';
import { Modale } from './Modale';
import { api } from '@/lib/api';

// Finestra dei solleciti (§7.1, §5.14): una scheda per destinatario con il testo già composto dal
// server; *Copia il testo* copia e passa al successivo. I testi non si calcolano qui (V12).

export interface SchedaSollecito { id: string; titolo: string; testo: string; conta?: number }

export function FinestraSolleciti({ titolo, testo, schede, onCopia, onChiudi }: {
  titolo: string; testo: string; schede: SchedaSollecito[];
  onCopia?: (id: string, testo: string) => void; onChiudi: () => void;
}) {
  const [cur, setCur] = useState(schede[0]?.id ?? '');
  const [copiati, setCopiati] = useState<Set<string>>(new Set());
  const area = useRef<HTMLTextAreaElement>(null);
  const scheda = schede.find((s) => s.id === cur) ?? schede[0];

  async function copia() {
    if (!scheda) return;
    const t = area.current?.value ?? scheda.testo;
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      area.current?.select();
      document.execCommand('copy');
    }
    const fatti = new Set(copiati);
    fatti.add(scheda.id);
    setCopiati(fatti);
    onCopia?.(scheda.id, t);
    const prossimo = schede.find((s) => !fatti.has(s.id));
    avviso('Testo per ' + scheda.titolo + ' copiato' + (prossimo ? ': ora ' + prossimo.titolo : ''));
    if (prossimo) setCur(prossimo.id);
  }

  return (
    <Modale titolo={titolo} testo={testo} onChiudi={onChiudi} piede={<>
      <button type="button" className="btn sec" onClick={onChiudi}>Chiudi</button>
      <button type="button" className="btn" onClick={() => void copia()} disabled={!scheda}>Copia il testo</button>
    </>}>
      {!scheda
        ? <p className="testo-tenue">Nessun testo da preparare.</p>
        : <>
          <div className="segmenti solleciti-schede" role="tablist">
            {schede.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={s.id === scheda.id} onClick={() => setCur(s.id)}>
                {s.titolo}{s.conta != null && <span className="n">{s.conta}</span>}{copiati.has(s.id) ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <p className="testo-tenue" style={{ margin: '0 0 6px' }}>A: {scheda.titolo}</p>
          <textarea key={scheda.id} ref={area} className="testo-email" aria-label="Testo da inviare" defaultValue={scheda.testo} />
        </>}
    </Modale>
  );
}

interface Pagamenti {
  per_cliente: { cliente_id: string; cliente: string; fatture: string[]; totale: number; testo: string }[];
}

/** Solleciti di pagamento ai clienti (§5.14): un testo per cliente; copiandolo il server registra il sollecito. */
export function SollecitiPagamento({ clienteId, onChiudi, onCopiato }: { clienteId?: string; onChiudi: () => void; onCopiato?: () => void }) {
  const [dati, setDati] = useState<Pagamenti | null>(null);
  const [errore, setErrore] = useState('');
  useEffect(() => {
    void api<Pagamenti>('pagamenti/solleciti').then((r) => (r.ok ? setDati(r.dati) : setErrore(r.messaggio)));
  }, []);

  if (!dati) {
    return <Modale titolo="Solleciti di pagamento" onChiudi={onChiudi}>
      <p className={errore ? 'modulo-errore' : 'testo-tenue'}>{errore || 'Carico i testi…'}</p>
    </Modale>;
  }
  const clienti = clienteId ? dati.per_cliente.filter((c) => c.cliente_id === clienteId) : dati.per_cliente;
  const schede = clienti.map((c) => ({ id: c.cliente_id, titolo: c.cliente, testo: c.testo, conta: c.fatture.length }));
  const fatture = clienti.reduce((n, c) => n + c.fatture.length, 0);
  return (
    <FinestraSolleciti
      titolo="Solleciti di pagamento"
      testo={fatture
        ? `${fatture} ${fatture === 1 ? 'fattura non pagata' : 'fatture non pagate'}, ${schede.length} ${schede.length === 1 ? 'cliente' : 'clienti'}: un testo per cliente da copiare e inviare. Il fornitore incassa, Decobrands sollecita.`
        : 'Nessuna fattura da sollecitare per questo cliente.'}
      schede={schede}
      onCopia={(id) => { void api('pagamenti/solleciti', { cliente_id: Number(id) }).then((r) => { if (!r.ok) avviso(r.messaggio, true); else onCopiato?.(); }); }}
      onChiudi={onChiudi}
    />
  );
}

interface Conferme {
  totale: number;
  per_fornitore: { fornitore_id: string; fornitore: string; pratiche: number; testo: string }[];
}

/** Solleciti di conferma (§5.12): un testo per fornitore con le sue pratiche in ritardo. */
export function SollecitiConferme({ onChiudi }: { onChiudi: () => void }) {
  const [dati, setDati] = useState<Conferme | null>(null);
  const [errore, setErrore] = useState('');
  useEffect(() => {
    void api<Conferme>('solleciti/conferme').then((r) => (r.ok ? setDati(r.dati) : setErrore(r.messaggio)));
  }, []);

  if (!dati) {
    return <Modale titolo="Solleciti di conferma" onChiudi={onChiudi}>
      <p className={errore ? 'modulo-errore' : 'testo-tenue'}>{errore || 'Carico i testi…'}</p>
    </Modale>;
  }
  const schede = dati.per_fornitore.map((f) => ({ id: f.fornitore_id, titolo: f.fornitore, testo: f.testo, conta: f.pratiche }));
  return (
    <FinestraSolleciti
      titolo="Solleciti di conferma"
      testo={dati.totale
        ? `${dati.totale} ${dati.totale === 1 ? 'pratica in ritardo' : 'pratiche in ritardo'}, ${schede.length} ${schede.length === 1 ? 'fornitore' : 'fornitori'}: un testo per fornitore da copiare e inviare.`
        : 'Nessuna conferma in ritardo.'}
      schede={schede}
      onChiudi={onChiudi}
    />
  );
}
