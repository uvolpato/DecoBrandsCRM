'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '@/lib/api';
import { caricaVoci, vociMenu, type Contesto, type Entita } from '@/lib/entita';
import { DataTable, type Colonna } from './DataTable';
import { FilterBar, type CampoFiltro } from './FilterBar';
import { Icona } from './Icona';
import { Modale } from './Modale';
import { usePuo } from './Utente';

// CampoRicerca e RicercaEntita come nel prototipo (componenti.js, D-20 D-21 D-22 §19), stesso markup.
// Campo di ricerca su un'entità (fornitore, cliente, subagente, …): scrivendo compare un menu con le prime
// voci; la lente o F4 apre la maschera con filtri e tabella. Due modi:
//  - multipla (sempre nei filtri, D-22): il campo chiuso mostra un riassunto ("Filtro multiplo (3)"); il menu
//    ha in alto le voci scelte (clic = toglie) e sotto le altre (clic = aggiunge); resta aperto e
//    onChange parte una volta sola, alla chiusura (Esc, Tab, clic fuori);
//  - singola (nei moduli): pallino verde se il valore è in anagrafica, rosso se scritto a mano.
// Le voci arrivano dall'entità (dal server, V12): qui non ci sono dati.

/** Sigle societarie e congiunzioni tolte dalla ricerca per parole (D-153): «Arte Wohnaccessoires
 *  GmbH & Co. KG» e «ARTE WOHNACCESSOIRES GMBH & CO.KG» si ritrovano per le parole vere, non per
 *  il testo intero (punti, spazi e maiuscole diverse fra il documento e l'anagrafica). */
const SIGLE_PAROLE = new Set(['srl', 'snc', 'spa', 'sas', 'gmbh', 'co', 'kg', 'sa', 'ltd', 'inc', 'llc', 'ag', 'ohg', 'ug', 'bv', 'nv', 'sarl', 'and', 'und']);
/** Parole significative di una ricerca: minuscole, senza accenti né punteggiatura, ≥ 3 lettere,
 *  senza le sigle societarie; al massimo 5. */
const paroleDi = (q: string) => q.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !SIGLE_PAROLE.has(p)).slice(0, 5);
/** Tutte le parole significative della ricerca compaiono nel testo (D-153); con ricerca vuota o di
 *  sole sigle vale tutto. */
const cercaParole = (testo: string, q: string) => {
  const parole = paroleDi(q);
  if (!parole.length) return true;
  const t = testo.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return parole.every((p) => t.includes(p));
};

/** Le voci dell'entità nel contesto: tutte (attive e non), come le restituisce il server. */
export function useVoci<R>(ent: Entita<R>, ctx: Contesto) {
  const [tutte, setTutte] = useState<R[]>([]);
  const [caricate, setCaricate] = useState(false);
  const k = JSON.stringify(ctx);
  useEffect(() => {
    let vivo = true;
    caricaVoci(ent, ctx).then((v) => { if (vivo) { setTutte(v); setCaricate(true); } }).catch(() => { if (vivo) { setTutte([]); setCaricate(true); } });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- il contesto si confronta per valore (k)
  }, [ent, k]);
  // D-152: dopo un import da Integra la voce nuova non è nel cache (5 s): si ricarica subito
  const ricarica = () => { caricaVoci(ent, ctx, true).then(setTutte).catch(() => {}); };
  return { tutte, caricate, ricarica };
}

// D-152: la ricerca guarda anche le viste di Integra, per fornitore e cliente. La ricerca la fa il
// server (GET /api/integra/cerca, già esclude i già importati); qui arrivano solo tipo e testo (V12).
type TipoIntegra = 'cliente' | 'fornitore';
interface RigaIntegra { id_integra: number; codice: string; ragione_sociale: string; piva: string; attivo: boolean; }

function useIntegra(tipo: TipoIntegra | undefined, q: string) {
  const [righe, setRighe] = useState<RigaIntegra[]>([]);
  const [stato, setStato] = useState<'vuoto' | 'attesa' | 'ok' | 'errore'>('vuoto');
  useEffect(() => {
    const testo = q.trim();
    if (!tipo || testo.length < 2) { setRighe([]); setStato('vuoto'); return; }
    let vivo = true;
    setRighe([]); setStato('attesa');
    const t = setTimeout(() => {
      api<{ righe?: RigaIntegra[] }>('integra/cerca?tipo=' + tipo + '&q=' + encodeURIComponent(testo))
        .then((r) => { if (!vivo) return; if (!r.ok) { setRighe([]); setStato(r.stato === 403 ? 'vuoto' : 'errore'); return; } setRighe(r.dati.righe ?? []); setStato('ok'); })
        .catch(() => { if (vivo) { setRighe([]); setStato('errore'); } });
    }, 350); // attesa breve fra un tasto e l'altro
    return () => { vivo = false; clearTimeout(t); };
  }, [tipo, q]);
  return { righe, stato };
}

/** Risultati di Integra sotto a quelli del CRM: si sceglie una riga e si importa e sceglie in un passo.
 *  Senza `dati.importa` le righe si vedono ma non si scelgono (nota). `onScelto` riceve id e nome. */
function Integra({ tipo, q, onScelto }: { tipo: TipoIntegra | undefined; q: string; onScelto: (id: string, nome: string, piva?: string) => void | Promise<void> }) {
  const puo = usePuo();
  const consentito = puo('dati.importa');
  const { righe, stato } = useIntegra(tipo, q);
  const [nota, setNota] = useState('');
  const [importando, setImportando] = useState(0);
  if (!tipo || (stato !== 'errore' && !righe.length && !nota)) return null;
  async function scegli(x: RigaIntegra) {
    if (!consentito) { setNota('serve il permesso di importare'); return; }
    setImportando(x.id_integra); setNota('');
    const r = await api<{ id: string; ragione_sociale?: string }>('integra/importa', { tipo, id_integra: x.id_integra });
    setImportando(0);
    if (!r.ok) { setNota(r.messaggio); return; }
    await onScelto(r.dati.id, r.dati.ragione_sociale ?? x.ragione_sociale ?? x.codice, x.piva);
  }
  return (
    <>
      <li className="menu-titolo" role="presentation">Integra</li>
      {nota && <li className="nessuna" role="status">{nota}</li>}
      {stato === 'errore' && <li className="nessuna" role="status">Integra non raggiungibile</li>}
      {righe.map((x) => (
        <li key={x.id_integra} role="option" onMouseDown={(e) => { e.preventDefault(); void scegli(x); }}>
          <b>{x.ragione_sociale || '—'}</b>
          <span>{[x.codice, x.piva, x.attivo ? '' : 'non attivo', importando === x.id_integra ? 'importo…' : ''].filter(Boolean).join(' · ')}</span>
        </li>
      ))}
    </>
  );
}

// Filtro di stato nella finestra di ricerca (es. stato della pratica), tendina a destra del campo:
// il chiamante tiene il valore e ricarica le voci dal server col contesto. Senza il parametro resta com'è.
type SegmentiRicerca = { voci: { valore: string; etichetta: string }[]; valore: string; onCambia: (v: string) => void; etichetta?: string };
type Comuni = { entita: Entita; contesto?: Contesto; placeholder?: string; etichetta?: string; id?: string;
  segmenti?: SegmentiRicerca;
  // vincoli della ricerca (es. «Pratiche di … con …»): mostrati sotto il titolo della finestra
  vincoli?: string;
  // nome letto dal documento (fornitore, cliente): quando il campo è vuoto si offre di cercarlo
  testoIniziale?: { q: string; mostra?: string };
  // nome già noto al chiamante: mostrato al posto dell'id finché le voci non arrivano (D-161 §19)
  nomeIniziale?: string;
  // D-153: quando si sceglie una voce del CRM si riceve il record intero (per riempire i campi, es. cliente)
  onScelto?: (r: unknown) => void;
  // Il pallino verde (valore scelto e trovato) diventa un link alla scheda della voce (15/11/2026)
  link?: (id: string) => string;
  // D-170 §19: il pallino verde apre nella stessa scheda; se il chiamante ha dati non salvati chiede
  // conferma qui (true = procedi). Senza questa prop il link naviga direttamente.
  linkConferma?: () => boolean | Promise<boolean>;
  // D-154: comando dall'esterno (il pulsante › accanto al campo letto): al cambio di `n` fa quello
  // che fa «Cerca questo» col testo attuale `q`, senza ref imperativi.
  cerca?: { q: string; n: number };
  // §16.4 §19: pulsante «apri in una nuova scheda» su ogni riga della maschera di ricerca; dà
  // l'indirizzo della voce (es. la scheda della pratica). Senza il parametro la maschera resta identica.
  apriVoce?: (id: string) => string };
export type CampoRicercaProps = Comuni & (
  | { multipla: true; valori: string[]; onChange: (v: string[]) => void }
  | { multipla?: false; valore: string; onChange: (v: string) => void }
);

const uguali = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function CampoRicerca(p: CampoRicercaProps) {
  return <div className="campo-ricerca">{p.multipla ? <Multipla {...p} /> : <Singola {...p} />}</div>;
}

// posizione fissa: il menu non viene tagliato da tabelle e finestre che scorrono
function usePosizione(aperto: boolean, rif: React.RefObject<HTMLElement | null>, dipende: unknown) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });
  useLayoutEffect(() => {
    const r = rif.current?.getBoundingClientRect();
    if (aperto && r) setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 300) });
  }, [aperto, rif, dipende]);
  return pos;
}

function Multipla({ entita: ent, contesto = {}, placeholder, etichetta, id, segmenti, vincoli, valori, onChange, apriVoce }: Comuni & { valori: string[]; onChange: (v: string[]) => void }) {
  const { tutte, ricarica } = useVoci(ent, contesto);
  const lid = useId(); // A7-08: collega input e menu per il lettore di schermo
  const box = useRef<HTMLDivElement>(null);
  const [bozza, setBozza] = useState(valori);
  const [q, setQ] = useState('');
  const [aperto, setAperto] = useState(false);
  const [attiva, setAttiva] = useState(0);
  const [maschera, setMaschera] = useState(false);
  const dopo = useRef(false); // chiudendo la maschera il focus torna al campo: il menu non si riapre
  useEffect(() => { setBozza(valori); }, [JSON.stringify(valori)]); // eslint-disable-line react-hooks/exhaustive-deps -- per valore
  const pos = usePosizione(aperto, box, bozza.length + q);

  const voce = (k: string) => tutte.find((r) => String(ent.chiave(r)) === k);
  const nome = (k: string) => { const r = voce(k); return r ? ent.testo(r) : k; }; // una voce scelta resta riconoscibile anche se esce dal periodo
  const vuoto = placeholder ?? 'Scrivi per cercare';
  const ria = !bozza.length ? '' : bozza.length === 1 ? nome(bozza[0]) : 'Filtro multiplo (' + bozza.length + ')';
  // D-153: la ricerca è per parole, non per testo intero (il nome letto può avere punti e sigle diverse)
  const corrisponde = (r: unknown) => cercaParole([ent.chiave(r), ent.testo(r), ent.cerca?.(r) ?? ''].join(' '), q);
  const altre = vociMenu(ent, contesto, tutte).filter((r) => !bozza.includes(String(ent.chiave(r))) && corrisponde(r));
  const sotto = altre.slice(0, 8);
  const chiavi = [...bozza, ...sotto.map((r) => String(ent.chiave(r)))];

  const chiudi = () => { setAperto(false); setQ(''); if (!uguali(bozza, valori)) onChange(bozza); };
  const alterna = (k: string) => { setBozza(bozza.includes(k) ? bozza.filter((x) => x !== k) : [...bozza, k]); setQ(''); setAperto(true); };
  const apri = () => { setAperto(true); setAttiva(bozza.length && !q ? 0 : bozza.length); };
  const apriMaschera = () => { setAperto(false); setMaschera(true); };

  function tasto(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!aperto) apri(); else setAttiva((attiva + (e.key === 'ArrowDown' ? 1 : -1) + chiavi.length) % Math.max(chiavi.length, 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (aperto && chiavi[attiva]) alterna(chiavi[attiva]); else chiudi(); }
    else if (e.key === 'Escape' && aperto) { e.stopPropagation(); chiudi(); }
    else if (e.key === 'F4') { e.preventDefault(); apriMaschera(); }
  }
  const li = (k: string, i: number, scelta: boolean) => {
    const r = voce(k);
    return (
      <li key={k} id={lid + '-' + i} role="option" data-i={i} aria-selected={scelta} className={i === attiva ? 'attiva' : undefined}
        onMouseDown={(e) => { e.preventDefault(); alterna(k); }}>
        <i className="spunta-voce" aria-hidden="true">{scelta ? '✓' : ''}</i><b>{r ? ent.testo(r) : k}</b>{r && ent.dettaglio && <span>{ent.dettaglio(r)}</span>}
      </li>
    );
  };

  return (
    <div ref={box} className={'ricerca multipla' + (bozza.length ? ' con-scelte' : '') + (bozza.length > 1 ? ' piu-scelte' : '')}
      onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node) && !maschera) chiudi(); }}>
      <input className="ricerca-testo" id={id} type="text" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={aperto}
        aria-controls={lid} aria-activedescendant={aperto && chiavi[attiva] ? lid + '-' + attiva : undefined}
        aria-label={etichetta ?? 'Cerca ' + ent.titolo.toLowerCase()} placeholder={ria || vuoto} value={q}
        title={bozza.length ? ent.titolo + ': ' + bozza.map(nome).join(', ') : ''}
        onChange={(e) => { setQ(e.target.value); setAperto(true); setAttiva(bozza.length); }} onFocus={() => { if (dopo.current) dopo.current = false; else apri(); }} onMouseDown={() => { if (document.activeElement === box.current?.querySelector('input')) apri(); }} onKeyDown={tasto} />
      <button type="button" className="ricerca-lente" title={'Apri la ricerca di ' + ent.titolo.toLowerCase() + ' (F4): scelta di più voci'} aria-label="Apri la ricerca" onClick={apriMaschera}><Icona nome="cerca" /></button>
      <ul className="ricerca-menu" id={lid} role="listbox" aria-multiselectable="true" hidden={!aperto} style={pos}>
        {bozza.length > 0 && <>
          <li className="menu-titolo" role="presentation">Scelti ({bozza.length})
            <button type="button" className="link-azzera" onMouseDown={(e) => { e.preventDefault(); setBozza([]); }}>Togli tutti</button></li>
          {bozza.map((k, i) => li(k, i, true))}
        </>}
        <li className="menu-titolo" role="presentation">{q ? 'Risultati' : bozza.length ? 'Aggiungi' : 'Scegli una o più voci'}</li>
        {sotto.length ? sotto.map((r, i) => li(String(ent.chiave(r)), bozza.length + i, false)) : <li className="nessuna">{q ? 'Nessun risultato' : 'Nessun’altra voce'}</li>}
        <li className="altre" onMouseDown={(e) => { e.preventDefault(); apriMaschera(); }}><Icona nome="cerca" />{altre.length > 8 ? `Altri ${altre.length - 8} risultati: ` : ''}apri la ricerca di {ent.titolo.toLowerCase()}</li>
        <Integra tipo={ent.integra} q={q} onScelto={(id) => { setBozza((b) => (b.includes(id) ? b : [...b, id])); ricarica(); }} />
      </ul>
      {maschera && <RicercaEntita entita={ent} contesto={contesto} voci={vociMenu(ent, contesto, tutte)} segmenti={segmenti} vincoli={vincoli} testo={q} multipla scelte={bozza} apriVoce={apriVoce}
        onChiudi={() => { dopo.current = true; setTimeout(() => { dopo.current = false; }, 150); setMaschera(false); }} onScelta={(v) => { dopo.current = true; setTimeout(() => { dopo.current = false; }, 150); setMaschera(false); setQ(''); setBozza(v.map((r) => String(ent.chiave(r)))); onChange(v.map((r) => String(ent.chiave(r)))); }} onImportato={(id) => { const n = bozza.includes(id) ? bozza : [...bozza, id]; setBozza(n); setQ(''); setMaschera(false); ricarica(); onChange(n); }} />}
    </div>
  );
}

function Singola({ entita: ent, contesto = {}, placeholder, etichetta, id, segmenti, vincoli, valore, onChange, testoIniziale, nomeIniziale, onScelto, cerca, link, linkConferma, apriVoce }: Comuni & { valore: string; onChange: (v: string) => void }) {
  const router = useRouter();
  const { tutte, caricate, ricarica } = useVoci(ent, contesto);
  const lid = useId(); // A7-08: collega input e menu per il lettore di schermo
  const box = useRef<HTMLDivElement>(null);
  const trova = (v: string) => { const x = v.trim().toLowerCase(); if (!x) return undefined; const m = vociMenu(ent, contesto, tutte); return m.find((r) => String(ent.chiave(r)).toLowerCase() === x) ?? m.find((r) => ent.testo(r).toLowerCase() === x); };
  const nota = trova(valore);
  // D-161: finché le voci non arrivano il campo non mostra l'id né il pallino rosso: nome già noto o vuoto
  const [testo, setTesto] = useState(valore && nomeIniziale ? nomeIniziale : '');
  const [aperto, setAperto] = useState(false);
  const [attiva, setAttiva] = useState(0);
  const [maschera, setMaschera] = useState(false);
  const [daLetto, setDaLetto] = useState(false); // testo messo da «Cerca questo»: al fuoco perso non diventa un valore
  const campo = useRef<HTMLInputElement>(null);
  // non si sovrascrive quello che l'utente sta scrivendo: le voci arrivano dal server e possono
  // atterrare dopo il primo tasto (prima si perdeva il testo digitato)
  useEffect(() => {
    if (!caricate) return;
    if (document.activeElement !== campo.current && !daLetto) setTesto(nota ? ent.testo(nota) : valore);
  }, [valore, tutte, caricate]); // eslint-disable-line react-hooks/exhaustive-deps -- da fuori
  // D-154: il pulsante › (cerca) fa partire la ricerca da fuori, come cercaLetto ma col testo attuale.
  useEffect(() => {
    if (!cerca?.n) return;
    setTesto(cerca.q); setDaLetto(true); setAperto(true); setAttiva(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scatta solo al cambio di `n`
  }, [cerca?.n]);
  const pos = usePosizione(aperto, box, testo);

  // punteggio: inizia con il testo 0 · lo contiene 1 · lo contiene nel resto o nella chiave 2
  const punti = (r: unknown) => {
    const q = testo.trim().toLowerCase(), k = String(ent.chiave(r)).toLowerCase(), t = ent.testo(r).toLowerCase(), c = (ent.cerca?.(r) ?? '').toLowerCase();
    if (!q) return 3; if (t.startsWith(q) || k.startsWith(q)) return 0; if (c.startsWith(q) || t.includes(q)) return 1; if (c.includes(q) || k.includes(q)) return 2;
    // D-153: il testo intero non corrisponde (punti, spazi o sigle diverse): si ripiega sulle parole
    return cercaParole(t + ' ' + c + ' ' + k, testo) ? 2 : -1;
  };
  // D-157 §19: se il contesto porta il codice letto, la voce col codice cliente uguale va in testa
  // e porta il segno «coincide con il codice letto».
  const letto = String(contesto.codice_cliente ?? '').trim().toLowerCase();
  const coincide = (r: unknown) => !!letto && String((r as { codice_fornitore?: string }).codice_fornitore ?? '').trim().toLowerCase() === letto;
  const tutteMenu = vociMenu(ent, contesto, tutte).map((r) => ({ r, s: punti(r), c: coincide(r) })).filter((x) => x.s >= 0 || x.c).sort((a, b) => (a.c === b.c ? a.s - b.s : a.c ? -1 : 1));
  const prime = tutteMenu.slice(0, 5).map((x) => x.r);

  const imposta = (r: unknown | undefined, libero = '') => {
    setAperto(false);
    const nuovo = r ? String(ent.chiave(r)) : libero;
    if (r) { setTesto(ent.testo(r)); onScelto?.(r); }
    if (nuovo !== valore) onChange(nuovo);
  };
  function tasto(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!aperto) setAperto(true); else setAttiva((attiva + (e.key === 'ArrowDown' ? 1 : -1) + prime.length) % Math.max(prime.length, 1)); }
    else if (e.key === 'Enter' && aperto && prime[attiva]) { e.preventDefault(); imposta(prime[attiva]); }
    else if (e.key === 'Escape' && aperto) { e.stopPropagation(); setAperto(false); }
    else if (e.key === 'F4') { e.preventDefault(); setAperto(false); setMaschera(true); }
  }
  const stato = !caricate && valore ? 'vuoto' : nota ? 'ok' : valore ? 'ko' : 'vuoto';
  // D-152: il nome letto dal documento diventa il testo della ricerca, senza sceglierlo da solo
  const cercaLetto = () => {
    if (!testoIniziale) return;
    setTesto(testoIniziale.q); setDaLetto(true); setAperto(true); setAttiva(0);
  };
  return (
    <div className="ricerca-riga"
      onBlur={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node) || maschera) return; if (daLetto) { setDaLetto(false); setTesto(valore); setAperto(false); return; } setAperto(false); const t = testo.trim(); if (nota && ent.testo(nota) === t) return; const r = trova(t); imposta(r, t); }}>
      <div ref={box} className="ricerca">
        {nota && link ? (
          <Link className="pallino-link" href={link(String(ent.chiave(nota)))}
            title={'Apri la scheda del ' + ent.titolo.toLowerCase() + ' ' + ent.testo(nota)}
            aria-label={'Apri la scheda del ' + ent.titolo.toLowerCase() + ' ' + ent.testo(nota)}
            onClick={async (e) => {
              if (!linkConferma) return; // naviga nella stessa scheda
              e.preventDefault();
              if (await linkConferma()) router.push(link(String(ent.chiave(nota))));
            }}>
            <span className="pallino ok" />
          </Link>
        ) : <span className={'pallino ' + stato} title={!caricate ? '' : nota ? ent.titolo + ' trovato in anagrafica' : valore ? 'Valore non trovato in anagrafica' : ''} />}
        <input ref={campo} className="ricerca-testo" id={id} type="text" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={aperto}
          aria-controls={lid} aria-activedescendant={aperto && prime[attiva] ? lid + '-' + attiva : undefined}
          aria-label={etichetta ?? 'Cerca ' + ent.titolo.toLowerCase()}
          value={testo} placeholder={placeholder ?? 'Scrivi per cercare'} onChange={(e) => { setDaLetto(false); setTesto(e.target.value); setAperto(true); setAttiva(0); }} onKeyDown={tasto} />
        <button type="button" className="ricerca-lente" title={'Apri la ricerca di ' + ent.titolo.toLowerCase() + ' (F4)'} aria-label="Apri la ricerca" onClick={() => { setAperto(false); setMaschera(true); }}><Icona nome="cerca" /></button>
      </div>
      {testoIniziale && !valore && (
        <div className="ricerca-letto" title={testoIniziale.mostra ?? undefined}>
          {testoIniziale.mostra ? <><span>Letto: <b>{testoIniziale.mostra}</b></span>{' · '}</> : null}
          <button type="button" className="link-azzera" onClick={cercaLetto}>Cerca questo</button>
        </div>
      )}
      <ul className="ricerca-menu" id={lid} role="listbox" hidden={!aperto} style={pos}>
        {prime.length ? prime.map((r, i) => (
          <li key={String(ent.chiave(r))} id={lid + '-' + i} role="option" aria-selected={i === attiva} className={i === attiva ? 'attiva' : undefined} data-i={i} onMouseDown={(e) => { e.preventDefault(); imposta(r); }}>
            <b>{ent.testo(r)}</b><span>{ent.dettaglio?.(r) ?? ''}</span>
            {coincide(r) && <span style={{ color: 'var(--ok)' }}>✓ coincide con il codice letto</span>}</li>
        )) : <li className="nessuna">Nessun risultato</li>}
        <li className="altre" onMouseDown={(e) => { e.preventDefault(); setAperto(false); setMaschera(true); }}><Icona nome="cerca" />{tutteMenu.length > 5 ? `Altri ${tutteMenu.length - 5} risultati: ` : ''}apri la ricerca di {ent.titolo.toLowerCase()}</li>
        <Integra tipo={ent.integra} q={aperto ? testo : ''} onScelto={(id, nome, piva) => { setTesto(nome); setAperto(false); if (id !== valore) onChange(id); onScelto?.({ id, nome, piva }); ricarica(); }} />
      </ul>
      {maschera && <RicercaEntita entita={ent} contesto={contesto} voci={vociMenu(ent, contesto, tutte)} segmenti={segmenti} vincoli={vincoli} testo={nota ? '' : testo} apriVoce={apriVoce}
        onChiudi={() => setMaschera(false)} onScelta={(v) => { setMaschera(false); imposta(v[0]); }} onImportato={(id, nome) => { setMaschera(false); imposta({ id, nome }); ricarica(); }} />}
    </div>
  );
}

/** Maschera di ricerca: filtri e tabella. Multipla: casella per riga e "Applica"; singola: riga e "Seleziona". */
export function RicercaEntita({ entita: ent, contesto = {}, voci, segmenti, vincoli, testo = '', multipla, scelte = [], onScelta, onChiudi, onImportato, apriVoce }: {
  entita: Entita; contesto?: Contesto; voci: unknown[]; segmenti?: SegmentiRicerca; vincoli?: string; testo?: string; multipla?: boolean; scelte?: string[];
  onScelta: (voci: unknown[]) => void; onChiudi: () => void; onImportato: (id: string, nome: string) => void; apriVoce?: (id: string) => string;
}) {
  const [valori, setValori] = useState<Record<string, string | string[]>>({ q: testo });
  const [sel, setSel] = useState(() => new Set(scelte.map(String)));
  const [una, setUna] = useState<unknown>(null);
  const k = (r: unknown) => String(ent.chiave(r));
  const righe = useMemo(() => {
    const q = String(valori.q ?? '').trim();
    // D-153: anche nella maschera la ricerca è per parole, non per testo intero
    return voci.filter((r) => cercaParole([ent.chiave(r), ent.testo(r), ent.dettaglio?.(r) ?? '', ent.cerca?.(r) ?? ''].join(' '), q) && (!ent.filtra || ent.filtra(r, valori)));
  }, [voci, valori, ent]);
  const alterna = (r: unknown) => setSel((s) => { const n = new Set(s); if (n.has(k(r))) n.delete(k(r)); else n.add(k(r)); return n; });
  const campi: CampoFiltro[] = [{ nome: 'q', tipo: 'cerca', placeholder: 'Cerca ' + ent.titolo.toLowerCase() }, ...(ent.filtri?.(contesto) ?? [])];
  const colonneEnt = typeof ent.colonne === 'function' ? ent.colonne(contesto) : ent.colonne;
  // §16.4 §19: pulsante «apri in una nuova scheda» in fondo a ogni riga; il clic non seleziona la riga
  // (la DataTable ignora i clic su <a> e <button>). Generico: vale per ogni entità con `apriVoce`.
  const apriLabel = ent.apriEtichetta ?? 'Apri ' + ent.titolo.toLowerCase() + ' in una nuova scheda';
  const apri: Colonna<unknown>[] = apriVoce ? [{
    key: '_apri', header: '', sortable: false, align: 'center',
    cell: (r) => (
      <a className="btn-riga" href={apriVoce(k(r))} target="_blank" rel="noopener" title={apriLabel} aria-label={apriLabel}>
        <Icona nome="apri-scheda" />
      </a>
    ),
  }] : [];
  const colonne: Colonna<unknown>[] = [
    ...(multipla ? [{ key: '_sel', header: '', sortable: false, cell: (r: unknown) => <input type="checkbox" checked={sel.has(k(r))} readOnly aria-label={'Scegli ' + ent.testo(r)} /> }] : []),
    ...colonneEnt,
    ...apri,
  ];
  const applica = () => onScelta(multipla ? voci.filter((r) => sel.has(k(r))) : [una]);

  return (
    <Modale titolo={'Cerca ' + ent.titolo.toLowerCase()} larga corpoClasse="ricerca-corpo" onChiudi={onChiudi}
      testo={<>{vincoli && <div className="testo-tenue">{vincoli}</div>}{multipla ? 'Spunta una o più righe (clic sulla riga), poi premi Applica.' : 'Filtra e scegli una riga, poi premi Seleziona.'}</>}
      piede={<>
        <button type="button" className="btn sec" onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn" disabled={!multipla && !una} onClick={applica}>{multipla ? 'Applica' + (sel.size ? ` (${sel.size})` : '') : 'Seleziona'}</button>
      </>}>
      <div className="ricerca-filtri">
        <FilterBar campi={campi} valori={valori} onChange={setValori} />
        {segmenti && (
          <select className="filtro-select" aria-label={segmenti.etichetta ?? 'Stato'} value={segmenti.valore}
            onChange={(e) => segmenti.onCambia(e.target.value)}>
            {segmenti.voci.map((o) => <option key={o.valore} value={o.valore}>{o.etichetta}</option>)}
          </select>
        )}
      </div>
      {multipla && <div className="ricerca-scelta-barra">
        <span className="testo-tenue">{sel.size ? sel.size + (sel.size === 1 ? ' scelta' : ' scelte') : 'Nessuna scelta: vale come “tutti”'}</span>
        <span>
          <button type="button" className="link-azzera" onClick={() => setSel((s) => new Set([...s, ...righe.map(k)]))}>Scegli tutte le righe filtrate</button>{' '}
          <button type="button" className="link-azzera" onClick={() => setSel(new Set())}>Togli tutte</button>
        </span>
      </div>}
      <div className="riempi">
        <DataTable compatta righe={righe} filtro={JSON.stringify(valori)} colonne={colonne} chiave={k}
          rowClass={(r) => (multipla ? sel.has(k(r)) : una === r) ? 'selezionata' : ''} onRowClick={multipla ? alterna : setUna}
          emptyText="Nessun risultato" emptyHint="Cambia la ricerca o i filtri." />
      </div>
      {ent.integra && <ul className="ricerca-menu" style={{ position: 'static', width: '100%', boxShadow: 'none', maxHeight: 180 }}>
        <Integra tipo={ent.integra} q={String(valori.q ?? '')} onScelto={(id, nome) => onImportato(id, nome)} />
      </ul>}
    </Modale>
  );
}
