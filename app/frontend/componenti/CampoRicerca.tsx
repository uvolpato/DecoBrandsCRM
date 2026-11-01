'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { caricaVoci, vociMenu, type Contesto, type Entita } from '@/lib/entita';
import { DataTable, type Colonna } from './DataTable';
import { FilterBar, type CampoFiltro } from './FilterBar';
import { Icona } from './Icona';
import { Modale } from './Modale';

// CampoRicerca e RicercaEntita come nel prototipo (componenti.js, D-20 D-21 D-22 §19), stesso markup.
// Campo di ricerca su un'entità (fornitore, cliente, subagente, …): scrivendo compare un menu con le prime
// voci; la lente o F4 apre la maschera con filtri e tabella. Due modi:
//  - multipla (sempre nei filtri, D-22): il campo chiuso mostra un riassunto ("Filtro multiplo (3)"); il menu
//    ha in alto le voci scelte (clic = toglie) e sotto le altre (clic = aggiunge); resta aperto e
//    onChange parte una volta sola, alla chiusura (Esc, Tab, clic fuori);
//  - singola (nei moduli): pallino verde se il valore è in anagrafica, rosso se scritto a mano.
// Le voci arrivano dall'entità (dal server, V12): qui non ci sono dati.

/** Le voci dell'entità nel contesto: tutte (attive e non), come le restituisce il server. */
export function useVoci<R>(ent: Entita<R>, ctx: Contesto) {
  const [tutte, setTutte] = useState<R[]>([]);
  const k = JSON.stringify(ctx);
  useEffect(() => {
    let vivo = true;
    caricaVoci(ent, ctx).then((v) => { if (vivo) setTutte(v); }).catch(() => { if (vivo) setTutte([]); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- il contesto si confronta per valore (k)
  }, [ent, k]);
  return tutte;
}

type Comuni = { entita: Entita; contesto?: Contesto; placeholder?: string; etichetta?: string; id?: string };
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

function Multipla({ entita: ent, contesto = {}, placeholder, etichetta, id, valori, onChange }: Comuni & { valori: string[]; onChange: (v: string[]) => void }) {
  const tutte = useVoci(ent, contesto);
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
  const qq = q.trim().toLowerCase();
  const corrisponde = (r: unknown) => !qq || [ent.chiave(r), ent.testo(r), ent.cerca?.(r) ?? ''].join(' ').toLowerCase().includes(qq);
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
      <li key={k} role="option" data-i={i} aria-selected={scelta} className={i === attiva ? 'attiva' : undefined}
        onMouseDown={(e) => { e.preventDefault(); alterna(k); }}>
        <i className="spunta-voce" aria-hidden="true">{scelta ? '✓' : ''}</i><b>{r ? ent.testo(r) : k}</b>{r && ent.dettaglio && <span>{ent.dettaglio(r)}</span>}
      </li>
    );
  };

  return (
    <div ref={box} className={'ricerca multipla' + (bozza.length ? ' con-scelte' : '') + (bozza.length > 1 ? ' piu-scelte' : '')}
      onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node) && !maschera) chiudi(); }}>
      <input className="ricerca-testo" id={id} type="text" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={aperto}
        aria-label={etichetta ?? 'Cerca ' + ent.titolo.toLowerCase()} placeholder={ria || vuoto} value={q}
        title={bozza.length ? ent.titolo + ': ' + bozza.map(nome).join(', ') : ''}
        onChange={(e) => { setQ(e.target.value); setAperto(true); setAttiva(bozza.length); }} onFocus={() => { if (dopo.current) dopo.current = false; else apri(); }} onMouseDown={() => { if (document.activeElement === box.current?.querySelector('input')) apri(); }} onKeyDown={tasto} />
      <button type="button" className="ricerca-lente" title={'Apri la ricerca di ' + ent.titolo.toLowerCase() + ' (F4): scelta di più voci'} aria-label="Apri la ricerca" onClick={apriMaschera}><Icona nome="cerca" /></button>
      <ul className="ricerca-menu" role="listbox" aria-multiselectable="true" hidden={!aperto} style={pos}>
        {bozza.length > 0 && <>
          <li className="menu-titolo" role="presentation">Scelti ({bozza.length})
            <button type="button" className="link-azzera" onMouseDown={(e) => { e.preventDefault(); setBozza([]); }}>Togli tutti</button></li>
          {bozza.map((k, i) => li(k, i, true))}
        </>}
        <li className="menu-titolo" role="presentation">{q ? 'Risultati' : bozza.length ? 'Aggiungi' : 'Scegli una o più voci'}</li>
        {sotto.length ? sotto.map((r, i) => li(String(ent.chiave(r)), bozza.length + i, false)) : <li className="nessuna">{q ? 'Nessun risultato' : 'Nessun’altra voce'}</li>}
        <li className="altre" onMouseDown={(e) => { e.preventDefault(); apriMaschera(); }}><Icona nome="cerca" />{altre.length > 8 ? `Altri ${altre.length - 8} risultati: ` : ''}apri la ricerca di {ent.titolo.toLowerCase()}</li>
      </ul>
      {maschera && <RicercaEntita entita={ent} contesto={contesto} voci={vociMenu(ent, contesto, tutte)} testo={q} multipla scelte={bozza}
        onChiudi={() => { dopo.current = true; setTimeout(() => { dopo.current = false; }, 150); setMaschera(false); }} onScelta={(v) => { dopo.current = true; setTimeout(() => { dopo.current = false; }, 150); setMaschera(false); setQ(''); setBozza(v.map((r) => String(ent.chiave(r)))); onChange(v.map((r) => String(ent.chiave(r)))); }} />}
    </div>
  );
}

function Singola({ entita: ent, contesto = {}, placeholder, id, valore, onChange }: Comuni & { valore: string; onChange: (v: string) => void }) {
  const tutte = useVoci(ent, contesto);
  const box = useRef<HTMLDivElement>(null);
  const trova = (v: string) => { const x = v.trim().toLowerCase(); if (!x) return undefined; const m = vociMenu(ent, contesto, tutte); return m.find((r) => String(ent.chiave(r)).toLowerCase() === x) ?? m.find((r) => ent.testo(r).toLowerCase() === x); };
  const nota = trova(valore);
  const [testo, setTesto] = useState(valore);
  const [aperto, setAperto] = useState(false);
  const [attiva, setAttiva] = useState(0);
  const [maschera, setMaschera] = useState(false);
  useEffect(() => { setTesto(nota ? ent.testo(nota) : valore); }, [valore, tutte]); // eslint-disable-line react-hooks/exhaustive-deps -- da fuori
  const pos = usePosizione(aperto, box, testo);

  // punteggio: inizia con il testo 0 · lo contiene 1 · lo contiene nel resto o nella chiave 2
  const punti = (r: unknown) => {
    const q = testo.trim().toLowerCase(), k = String(ent.chiave(r)).toLowerCase(), t = ent.testo(r).toLowerCase(), c = (ent.cerca?.(r) ?? '').toLowerCase();
    if (!q) return 3; if (t.startsWith(q) || k.startsWith(q)) return 0; if (c.startsWith(q) || t.includes(q)) return 1; if (c.includes(q) || k.includes(q)) return 2; return -1;
  };
  const tutteMenu = vociMenu(ent, contesto, tutte).map((r) => ({ r, s: punti(r) })).filter((x) => x.s >= 0).sort((a, b) => a.s - b.s);
  const prime = tutteMenu.slice(0, 5).map((x) => x.r);

  const imposta = (r: unknown | undefined, libero = '') => {
    setAperto(false);
    const nuovo = r ? String(ent.chiave(r)) : libero;
    if (r) setTesto(ent.testo(r));
    if (nuovo !== valore) onChange(nuovo);
  };
  function tasto(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!aperto) setAperto(true); else setAttiva((attiva + (e.key === 'ArrowDown' ? 1 : -1) + prime.length) % Math.max(prime.length, 1)); }
    else if (e.key === 'Enter' && aperto && prime[attiva]) { e.preventDefault(); imposta(prime[attiva]); }
    else if (e.key === 'Escape' && aperto) { e.stopPropagation(); setAperto(false); }
    else if (e.key === 'F4') { e.preventDefault(); setAperto(false); setMaschera(true); }
  }
  const stato = nota ? 'ok' : valore ? 'ko' : 'vuoto';
  return (
    <div ref={box} className="ricerca"
      onBlur={(e) => { if (box.current?.contains(e.relatedTarget as Node) || maschera) return; setAperto(false); const t = testo.trim(); if (nota && ent.testo(nota) === t) return; const r = trova(t); imposta(r, t); }}>
      <span className={'pallino ' + stato} title={nota ? ent.titolo + ' trovato in anagrafica' : valore ? 'Valore non trovato in anagrafica' : ''} />
      <input className="ricerca-testo" id={id} type="text" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={aperto}
        value={testo} placeholder={placeholder ?? 'Scrivi per cercare'} onChange={(e) => { setTesto(e.target.value); setAperto(true); setAttiva(0); }} onKeyDown={tasto} />
      <button type="button" className="ricerca-lente" title={'Apri la ricerca di ' + ent.titolo.toLowerCase() + ' (F4)'} aria-label="Apri la ricerca" onClick={() => { setAperto(false); setMaschera(true); }}><Icona nome="cerca" /></button>
      <ul className="ricerca-menu" role="listbox" hidden={!aperto} style={pos}>
        {prime.length ? prime.map((r, i) => (
          <li key={String(ent.chiave(r))} role="option" aria-selected={i === attiva} className={i === attiva ? 'attiva' : undefined} data-i={i} onMouseDown={(e) => { e.preventDefault(); imposta(r); }}>
            <b>{ent.testo(r)}</b><span>{ent.dettaglio?.(r) ?? ''}</span></li>
        )) : <li className="nessuna">Nessun risultato</li>}
        <li className="altre" onMouseDown={(e) => { e.preventDefault(); setAperto(false); setMaschera(true); }}><Icona nome="cerca" />{tutteMenu.length > 5 ? `Altri ${tutteMenu.length - 5} risultati: ` : ''}apri la ricerca di {ent.titolo.toLowerCase()}</li>
      </ul>
      {maschera && <RicercaEntita entita={ent} contesto={contesto} voci={vociMenu(ent, contesto, tutte)} testo={nota ? '' : testo}
        onChiudi={() => setMaschera(false)} onScelta={(v) => { setMaschera(false); imposta(v[0]); }} />}
    </div>
  );
}

/** Maschera di ricerca: filtri e tabella. Multipla: casella per riga e "Applica"; singola: riga e "Seleziona". */
export function RicercaEntita({ entita: ent, contesto = {}, voci, testo = '', multipla, scelte = [], onScelta, onChiudi }: {
  entita: Entita; contesto?: Contesto; voci: unknown[]; testo?: string; multipla?: boolean; scelte?: string[];
  onScelta: (voci: unknown[]) => void; onChiudi: () => void;
}) {
  const [valori, setValori] = useState<Record<string, string | string[]>>({ q: testo });
  const [sel, setSel] = useState(() => new Set(scelte.map(String)));
  const [una, setUna] = useState<unknown>(null);
  const k = (r: unknown) => String(ent.chiave(r));
  const righe = useMemo(() => {
    const q = String(valori.q ?? '').trim().toLowerCase();
    return voci.filter((r) => (!q || [ent.chiave(r), ent.testo(r), ent.dettaglio?.(r) ?? '', ent.cerca?.(r) ?? ''].join(' ').toLowerCase().includes(q)) && (!ent.filtra || ent.filtra(r, valori)));
  }, [voci, valori, ent]);
  const alterna = (r: unknown) => setSel((s) => { const n = new Set(s); if (n.has(k(r))) n.delete(k(r)); else n.add(k(r)); return n; });
  const campi: CampoFiltro[] = [{ nome: 'q', tipo: 'cerca', placeholder: 'Cerca ' + ent.titolo.toLowerCase() }, ...(ent.filtri?.(contesto) ?? [])];
  const colonne: Colonna<unknown>[] = multipla
    ? [{ key: '_sel', header: '', sortable: false, cell: (r) => <input type="checkbox" checked={sel.has(k(r))} readOnly aria-label={'Scegli ' + ent.testo(r)} /> }, ...ent.colonne]
    : ent.colonne;
  const applica = () => onScelta(multipla ? voci.filter((r) => sel.has(k(r))) : [una]);

  return (
    <Modale titolo={'Cerca ' + ent.titolo.toLowerCase()} larga corpoClasse="ricerca-corpo" onChiudi={onChiudi}
      testo={multipla ? 'Spunta una o più righe (clic sulla riga), poi premi Applica.' : 'Filtra e scegli una riga, poi premi Seleziona.'}
      piede={<>
        <button type="button" className="btn sec" onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn" disabled={!multipla && !una} onClick={applica}>{multipla ? 'Applica' + (sel.size ? ` (${sel.size})` : '') : 'Seleziona'}</button>
      </>}>
      <FilterBar campi={campi} valori={valori}onChange={setValori} />
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
    </Modale>
  );
}
