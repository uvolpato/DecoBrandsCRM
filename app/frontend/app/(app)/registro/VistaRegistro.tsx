'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { Modale } from '@/componenti/Modale';
import { Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato, type Variante } from '@/componenti/Piccoli';
import type { VoceRiepilogo } from '@/componenti/RiepilogoFiltri';
import { useSagome } from '@/componenti/Sagoma';
import { api } from '@/lib/api';
import { utente } from '@/lib/entita';
import { useMemoria } from '@/lib/memoria';

// Pagina del registro (F5-A2, §7.11, §15.6, D-31): elenco in sola lettura, filtro *Stessa
// operazione*, dettaglio in finestra ed esporta. Filtri, conteggi dei segmenti (D-23), ordinamento,
// pagine e riferimenti arrivano dal server (V12); qui si compone soltanto.

interface Riferimento { testo: string; href: string | null }
interface Riga {
  id: string; ts: string; genere: string; livello: string; codice: string;
  servizio: string | null; entita: string | null; entita_id: string | null; esito: string | null;
  messaggio: string | null; utente: { id: string; nome: string } | null;
  operazione_id: string | null; volte: number; stato: string | null; riferimento: Riferimento;
}
interface Dettaglio extends Riga {
  tipo: string | null; azione: string | null; dettaglio: unknown;
  sessione_id: string | null; ip: string | null; chiave: string | null;
  ultimo: string | null; visto_il: string | null; chiusa_il: string | null;
  utente: { id: string; nome: string; email: string } | null;
}
interface Opzione { valore: string; etichetta: string }
interface Risposta {
  righe: Riga[]; totale: number; pagina: number; pagine: number; per_pagina: number;
  conteggi: { tutto: number; aperte: number; errori: number };
  opzioni: { servizi: Opzione[]; codici: Opzione[]; entita: Opzione[] };
}

const FILTRI: Valori = {
  vista: 'tutto', genere: '', livello: '', servizio: '', codice: '', entita: '',
  utenti: [], dal: '', al: '', q: '',
};
const LIVELLO: Record<string, { testo: string; v: Variante }> = {
  info: { testo: 'Informazione', v: 'neutro' },
  attenzione: { testo: 'Attenzione', v: 'attesa' },
  errore: { testo: 'Errore', v: 'errore' },
};
const GENERI: Record<string, string> = { evento: 'Evento', anomalia: 'Anomalia' };
const livelloDi = (l: string) => LIVELLO[l] ?? { testo: l, v: 'neutro' as Variante };
const scelte = (opzioni: { value: string; label: string }[]) => [{ value: '', label: 'Tutti' }, ...opzioni];
const opz = (v?: Opzione[]) => scelte((v ?? []).map((o) => ({ value: o.valore, label: o.etichetta })));

/** Valore del `dettaglio` JSON in una riga leggibile. */
const mostra = (v: unknown): string => {
  if (v == null) return '—';
  if (typeof v === 'object') {
    return Array.isArray(v) ? v.map(mostra).join(', ')
      : Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${mostra(x)}`).join(' · ');
  }
  return String(v);
};

const giornoRoma = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

export function VistaRegistro() {
  const [valori, setValori] = useMemoria<Valori>('filtri', FILTRI);
  const [operazione, setOperazione] = useState('');
  const [ordine, setOrdine] = useMemoria<{ key: string; dir: 'asc' | 'desc' }>('ordine', { key: 'ts', dir: 'desc' });
  const [pagina, setPagina] = useMemoria<number>('pagina', 0);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const sagome = useSagome(caricando && !dati);
  const primaVolta = useRef(true);

  const parametri = () => {
    const p = new URLSearchParams();
    for (const k of ['vista', 'genere', 'livello', 'servizio', 'codice', 'entita', 'dal', 'al', 'q']) {
      const v = String(valori[k] ?? '');
      if (v) p.set(k, v);
    }
    const utenti = (valori.utenti as string[] | undefined) ?? [];
    if (utenti.length) p.set('utenti', utenti.join(','));
    if (operazione) p.set('operazione', operazione);
    p.set('ordina', ordine.key);
    p.set('dir', ordine.dir);
    p.set('pagina', String(pagina));
    return p;
  };

  // dal riquadro *Errori di oggi* di Oggi (§15.6): solo gli errori di oggi, poi l'indirizzo torna pulito
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('da') === 'oggi') {
      const oggi = giornoRoma();
      setValori({ ...FILTRI, vista: 'errori', dal: oggi, al: oggi });
      setPagina(0);
    }
    if (p.toString()) window.history.replaceState(null, '', window.location.pathname);
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una volta sola all'apertura
  }, []);

  useEffect(() => {
    if (!pronto) return;
    let vivo = true;
    setCaricando(true);
    const t = setTimeout(() => {
      void api<Risposta>('registro?' + parametri().toString()).then((r) => {
        if (!vivo) return;
        setCaricando(false);
        if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
      });
    }, primaVolta.current ? 0 : 250);
    primaVolta.current = false;
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri sono valori (filtri, ordine, pagina)
  }, [pronto, valori, ordine, pagina, operazione]);

  const cambia = (v: Valori) => { setValori(v); setPagina(0); };

  const scarica = async () => {
    const p = parametri();
    for (const k of ['pagina', 'ordina', 'dir']) p.delete(k);
    const r = await fetch('/api/registro/export?' + p.toString(), { credentials: 'same-origin' });
    if (!r.ok) { avviso('Non è stato possibile esportare: riprova.', true); return; }
    const nome = (r.headers.get('content-disposition') ?? '').match(/filename="([^"]+)"/)?.[1] ?? 'registro.csv';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    avviso('Scaricato ' + nome);
  };

  const apri = async (id: string) => {
    const r = await api<Dettaglio>('registro/' + id);
    if (!r.ok) { avviso(r.messaggio, true); return; }
    setFinestra(<DettaglioEvento r={r.dati} onChiudi={() => setFinestra(null)}
      onOperazione={(op) => { setOperazione(op); setPagina(0); setFinestra(null); }} />);
  };

  const azioni: Azione[] = [{
    etichetta: 'Esporta', icona: 'scarica', variante: 'sec', onClick: () => void scarica(),
    disabilitato: !dati?.totale, titolo: dati?.totale ? 'Scarica le righe filtrate in CSV' : 'Nessuna riga con questi filtri',
  }];

  const colonne: Colonna<Riga>[] = [
    { key: 'ts', header: 'Quando', cell: (r) => quando(r.ts) },
    {
      key: 'livello', header: 'Livello', cell: (r) => {
        const l = livelloDi(r.livello);
        return <><Stato v={l.v}>{l.testo}</Stato>{r.genere === 'anomalia' && <span className="sec-riga">anomalia{r.stato === 'chiusa' ? ' chiusa' : ''}</span>}</>;
      },
    },
    {
      key: 'messaggio', header: 'Messaggio', grow: true, cell: (r) => <>
        <b>{r.messaggio ?? r.riferimento.testo}</b>
        <span className="sec-riga">{r.codice}{r.messaggio && r.riferimento.testo !== r.messaggio ? ' · ' + r.riferimento.testo : ''}</span>
      </>,
    },
    {
      key: 'servizio', header: 'Utente o servizio',
      cell: (r) => r.utente?.nome ?? r.servizio ?? <span className="testo-tenue">Sistema</span>,
    },
    {
      key: 'riferimento', header: 'Riferimento', sortable: false, cell: (r) => (r.riferimento.href
        ? <a href={r.riferimento.href}>{r.riferimento.testo}</a>
        : r.riferimento.testo || <span className="testo-tenue">—</span>),
    },
    { key: 'volte', header: 'Volte', tipo: 'numero', cell: (r) => (r.volte > 1 ? r.volte : '') },
  ];

  // il riepilogo mostra anche *Stessa operazione*, che non è un campo della FilterBar
  const extra: VoceRiepilogo[] = [];
  if (operazione) extra.push({ etichetta: 'Stessa operazione', valori: [{ testo: operazione, togli: () => setOperazione('') }] });

  const filtri = (
    <FilterBar valori={valori} onChange={cambia} caricando={sagome}
      riepilogo={{ prima: extra }} campi={[
        {
          nome: 'vista', tipo: 'segmenti', etichetta: 'Vista', opzioni: [
            { value: 'tutto', label: 'Tutto', n: dati?.conteggi.tutto },
            { value: 'aperte', label: 'Anomalie aperte', n: dati?.conteggi.aperte },
            { value: 'errori', label: 'Errori', n: dati?.conteggi.errori },
          ],
        },
        { nome: 'q', tipo: 'cerca', etichetta: 'Ricerca', placeholder: 'Cerca nel messaggio, nel codice o nel riferimento' },
        { nome: 'genere', tipo: 'select', etichetta: 'Genere', opzioni: scelte([{ value: 'evento', label: 'Eventi' }, { value: 'anomalia', label: 'Anomalie' }]) },
        { nome: 'livello', tipo: 'select', etichetta: 'Livello', opzioni: scelte([{ value: 'info', label: 'Informazione' }, { value: 'attenzione', label: 'Attenzione' }, { value: 'errore', label: 'Errore' }]) },
        { nome: 'servizio', tipo: 'select', etichetta: 'Servizio', opzioni: opz(dati?.opzioni.servizi) },
        { nome: 'codice', tipo: 'select', etichetta: 'Codice', opzioni: opz(dati?.opzioni.codici) },
        { nome: 'entita', tipo: 'select', etichetta: 'Entità', opzioni: opz(dati?.opzioni.entita) },
        { nome: 'utenti', tipo: 'ricerca', entita: utente, multipla: true, etichetta: 'Utenti', placeholder: 'Tutti gli utenti' },
        { nome: 'dal', tipo: 'data', etichetta: 'Dal' },
        { nome: 'al', tipo: 'data', etichetta: 'Al' },
      ]} />
  );

  return (
    <Pagina titolo="Registro" pieno azioni={azioni}
      sottotitolo="Eventi e anomalie dell’applicazione, in sola lettura. Il riferimento apre la pratica, il documento o il bollettino.">
      <div className="pila riempi">
        {filtri}
        <div className="riempi">
          {errore && !dati
            ? <Pannello><div className="vuoto"><b>Registro non caricato</b>{errore}</div></Pannello>
            : <DataTable righe={dati?.righe ?? []} colonne={colonne} chiave={(r) => r.id}
                caricando={dati ? caricando : sagome}
                perPagina={dati?.per_pagina ?? 50}
                ordine={ordine} onOrdine={(o) => { setOrdine(o); setPagina(0); }}
                paginaServer={dati ? { pagina: dati.pagina, pagine: dati.pagine, totale: dati.totale } : { pagina: 0, pagine: 1, totale: 0 }}
                onPagina={setPagina}
                filtro={JSON.stringify({ valori, operazione })}
                memoria="registro"
                onRowClick={(r) => void apri(r.id)}
                emptyText="Nessun evento" emptyHint="Prova a togliere un filtro o a cambiare il periodo." />}
        </div>
      </div>
      {finestra}
    </Pagina>
  );
}

/** Dettaglio in finestra (§7.11): campi comuni, `dettaglio` leggibile, diff `prima`/`dopo` affiancato. */
function DettaglioEvento({ r, onChiudi, onOperazione }: { r: Dettaglio; onChiudi: () => void; onOperazione: (id: string) => void }) {
  const d = (r.dettaglio && typeof r.dettaglio === 'object' ? r.dettaglio : {}) as Record<string, unknown>;
  const { etichetta, prima, dopo, ...resto } = d;
  const diffusione = (v: unknown) => (v && typeof v === 'object' ? Object.entries(v as Record<string, unknown>) : []);
  const comune = [
    { etichetta: 'Quando', valore: quando(r.ts) },
    { etichetta: 'Genere', valore: GENERI[r.genere] ?? r.genere },
    { etichetta: 'Livello', valore: <Stato v={livelloDi(r.livello).v}>{livelloDi(r.livello).testo}</Stato> },
    { etichetta: 'Codice', valore: r.codice },
    ...(etichetta ? [{ etichetta: 'Etichetta', valore: String(etichetta) }] : []),
    { etichetta: 'Tipo e azione', valore: [r.tipo, r.azione].filter(Boolean).join(' · ') || '—' },
    { etichetta: 'Esito', valore: r.esito ?? '—' },
    { etichetta: 'Utente', valore: r.utente ? r.utente.nome + (r.utente.email ? ' · ' + r.utente.email : '') : 'Sistema' },
    { etichetta: 'Servizio', valore: r.servizio ?? '—' },
    { etichetta: 'Entità', valore: r.entita ? `${r.entita} ${r.entita_id ?? ''}` : '—' },
    { etichetta: 'Riferimento', valore: r.riferimento.href ? <a href={r.riferimento.href}>{r.riferimento.testo}</a> : r.riferimento.testo || '—' },
    { etichetta: 'Operazione', valore: r.operazione_id ?? '—' },
    { etichetta: 'Volte', valore: String(r.volte) },
    { etichetta: 'Anomalia', valore: r.stato ?? '—' },
    { etichetta: 'Sessione', valore: r.sessione_id ?? '—' },
    { etichetta: 'Indirizzo IP', valore: r.ip ?? '—' },
    ...(r.chiave ? [{ etichetta: 'Chiave', valore: r.chiave }] : []),
    ...(r.ultimo ? [{ etichetta: 'Ultimo', valore: quando(r.ultimo) }] : []),
    ...(r.chiusa_il ? [{ etichetta: 'Chiusa il', valore: quando(r.chiusa_il) }] : []),
    ...(r.visto_il ? [{ etichetta: 'Vista il', valore: quando(r.visto_il) }] : []),
  ];
  const coppie = (v: unknown) => diffusione(v).map(([k, x]) => ({ etichetta: k, valore: mostra(x) }));

  return (
    <Modale titolo={r.messaggio ?? r.riferimento.testo ?? 'Evento'} larga onChiudi={onChiudi} piede={<>
      <button type="button" className="btn sec" onClick={onChiudi}>Chiudi</button>
      {r.operazione_id && <button type="button" className="btn" onClick={() => onOperazione(r.operazione_id!)}>Stessa operazione</button>}
    </>}>
      <Dettagli inColonne voci={comune} />
      {(prima != null || dopo != null) && (
        <div className="colonne" style={{ '--colonne': 'minmax(0,1fr) minmax(0,1fr)' } as CSSProperties}>
          <div><b>Prima</b><Dettagli voci={coppie(prima)} /></div>
          <div><b>Dopo</b><Dettagli voci={coppie(dopo)} /></div>
        </div>
      )}
      {Object.keys(resto).length > 0 && (
        <Dettagli voci={Object.keys(resto).map((k) => ({ etichetta: k, valore: mostra(resto[k]) }))} />
      )}
    </Modale>
  );
}
