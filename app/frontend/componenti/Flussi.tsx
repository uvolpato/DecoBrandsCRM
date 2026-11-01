'use client';
import Link from 'next/link';
import { useState, type DragEvent, type ReactNode } from 'react';
import { classeSegno, data, euro, euroSegno } from '@/lib/formati';
import { Icona } from './Icona';
import { Stato, type Variante } from './Piccoli';

// Componenti dei flussi di lavoro, come i CRM.* del prototipo (componenti.js), stesso markup e classi:
// Elenco · Matrice · ListaDaFare · GruppiDaFare · ElencoSelezionabile · Scelte · Binario · Cerniera ·
// Periodi · Caricamento. Mostrano quello che il server ha già calcolato (V12); i collegamenti sono
// indirizzi dell'app (`href`), non '#/…'.

/** Lista semplice con testo e valore a destra. Con onClick la riga è un pulsante. */
export function Elenco({ voci, vuoto = 'Nessun elemento' }: { voci: { testo: ReactNode; destra?: ReactNode; onClick?: () => void; titolo?: string }[]; vuoto?: string }) {
  return (
    <ul className="elenco">
      {voci.length ? voci.map((v, i) => v.onClick
        ? <li key={i} className="cliccabile" tabIndex={0} role="button" title={v.titolo} onClick={(e) => { if (!(e.target as Element).closest('a')) v.onClick!(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); v.onClick!(); } }}><span>{v.testo}</span>{v.destra != null && <span className="destra">{v.destra}</span>}</li>
        : <li key={i}><span>{v.testo}</span>{v.destra != null && <span className="destra">{v.destra}</span>}</li>) : <li className="testo-tenue">{vuoto}</li>}
    </ul>
  );
}

export interface CellaMatrice { stato?: ReactNode; valore?: ReactNode; href?: string; azione?: { etichetta: string; onClick: () => void }; vuota?: string }
/** Griglia righe × colonne (es. fornitore × mese) con stato, importo, collegamento o azione per cella. */
export function Matrice({ angolo, colonne, righe }: { angolo?: string; colonne: string[]; righe: { titolo: string; sotto?: string; celle: CellaMatrice[] }[] }) {
  return (
    <div className="matrice" style={{ gridTemplateColumns: `minmax(170px, 1.2fr) repeat(${colonne.length}, minmax(120px, 1fr))` }}>
      <div className="m-intest">{angolo}</div>
      {colonne.map((c) => <div key={c} className="m-intest">{c}</div>)}
      {righe.map((r) => (
        <MatriceRiga key={r.titolo} r={r} />
      ))}
    </div>
  );
}
function MatriceRiga({ r }: { r: { titolo: string; sotto?: string; celle: CellaMatrice[] } }) {
  return <>
    <div className="m-riga"><b>{r.titolo}</b>{r.sotto && <span>{r.sotto}</span>}</div>
    {r.celle.map((c, i) => {
      if (c.vuota) return <div key={i} className="m-cella vuota">{c.vuota}</div>;
      const dentro = <>{c.stato}{c.valore != null && <span className="m-valore">{c.valore}</span>}{c.azione && <button type="button" className="btn testo piccolo" onClick={c.azione.onClick}>{c.azione.etichetta}</button>}</>;
      return c.href ? <Link key={i} className="m-cella" href={c.href}>{dentro}</Link> : <div key={i} className="m-cella">{dentro}</div>;
    })}
  </>;
}

export interface DaFare { tipo: 'errore' | 'attesa' | 'primario'; titolo: string; extra?: ReactNode; dettaglio: string; href: string; azione: string }
/** Attività in ordine di urgenza, ognuna con il pulsante che porta dove si risolve. */
export function ListaDaFare({ voci, vuoto }: { voci: DaFare[]; vuoto: { titolo: string; testo: string } }) {
  return (
    <ul className="da-fare">
      {voci.length ? voci.map((x) => (
        <li key={x.titolo} className={'t-' + x.tipo}>
          <span className="segno" aria-hidden="true" />
          <div><b>{x.titolo}{x.extra}</b><span>{x.dettaglio}</span></div>
          <Link className="btn sec piccolo" href={x.href}>{x.azione}</Link>
        </li>)) : <li className="vuoto"><b>{vuoto.titolo}</b>{vuoto.testo}</li>}
    </ul>
  );
}

export interface GruppoDaFare {
  id: string; titolo: string; variante?: string; conta: number; voci: DaFare[]; sommario?: ReactNode; vuoto?: string;
  azioni?: { etichetta: string; icona?: string; variante?: string; onClick?: () => void; href?: string }[];
}
// aperti o chiusi restano come li lasci, anche cambiando pagina
const APERTI: Record<string, boolean> = {};
/** Lista "Da fare" in gruppi richiudibili, con azioni sul gruppo intero; `filtro` mostra un solo gruppo (null = tutti). */
export function GruppiDaFare({ gruppi, vuoto, filtro }: { gruppi: GruppoDaFare[]; vuoto: { titolo: string; testo: string }; filtro?: string | null }) {
  const pieni = gruppi.filter((g) => g.voci.length || g.sommario);
  return (
    <div className="gruppi-fare">
      {!pieni.length && <ul className="da-fare"><li className="vuoto"><b>{vuoto.titolo}</b>{vuoto.testo}</li></ul>}
      {pieni.map((g) => (
        <details key={g.id} className={'gruppo-fare g-' + (g.variante ?? 'neutro')} hidden={!!filtro && filtro !== g.id} open={APERTI[g.id] !== false || filtro === g.id}
          onToggle={(e) => { APERTI[g.id] = (e.target as HTMLDetailsElement).open; }}>
          <summary>
            <span className="gf-titolo">{g.titolo}<span className="gf-conta">{g.conta}</span></span>
            <span className="gf-azioni">
              {(g.azioni ?? []).map((a) => {
                const dentro = <>{a.icona && <Icona nome={a.icona} />}{a.etichetta}</>, cl = 'btn piccolo ' + (a.variante ?? 'sec');
                return a.href ? <Link key={a.etichetta} className={cl} href={a.href} onClick={(e) => e.stopPropagation()}>{dentro}</Link>
                  : <button key={a.etichetta} type="button" className={cl} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.onClick?.(); }}>{dentro}</button>;
              })}
            </span>
          </summary>
          {g.sommario && <p className="gf-sommario">{g.sommario}</p>}
          {g.voci.length ? <ListaDaFare voci={g.voci} vuoto={vuoto} /> : g.vuoto && <p className="gf-sommario testo-tenue">{g.vuoto}</p>}
        </details>
      ))}
    </div>
  );
}

/** Colonna sinistra di una vista a due pannelli: la voce aperta è evidenziata. */
export function ElencoSelezionabile({ voci, selezionata }: { voci: { id: string | number; href: string; titolo: string; valore?: string; sotto?: string; stato?: ReactNode }[]; selezionata?: string | number }) {
  return (
    <ul className="selezionabile">
      {voci.map((v) => (
        <li key={v.id}>
          <Link href={v.href} className={v.id === selezionata ? 'attivo' : undefined} aria-current={v.id === selezionata ? 'true' : undefined}>
            <span className="r1"><span>{v.titolo}</span><span>{v.valore ?? ''}</span></span><span className="r2">{v.sotto ?? ''}</span>{v.stato && <span className="r3">{v.stato}</span>}
          </Link>
        </li>))}
    </ul>
  );
}

/** Opzioni alternative, ognuna con motivi e un'azione (es. pratiche candidate); la consigliata è in evidenza. */
export function Scelte({ voci, vuoto = 'Nessuna opzione disponibile.' }: { voci: { titolo: string; sottotitolo?: ReactNode; punti: ReactNode[]; azione: { etichetta: string; onClick: () => void }; consigliata?: boolean }[]; vuoto?: string }) {
  return (
    <div className="scelte">
      {!voci.length && <p className="testo-tenue">{vuoto}</p>}
      {voci.map((v) => (
        <div key={v.titolo} className={'scelta' + (v.consigliata ? ' consigliata' : '')}>
          <div><h3>{v.titolo}</h3>{v.sottotitolo && <div className="scelta-sotto">{v.sottotitolo}</div>}<ul>{v.punti.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
          <button type="button" className={'btn' + (v.consigliata ? '' : ' sec')} onClick={v.azione.onClick}>{v.azione.etichetta}</button>
        </div>))}
    </div>
  );
}

export interface Tappa { titolo: string; fatta?: boolean; ritardo?: boolean; numero?: string; data?: string; importo?: number; delta?: number; testo?: string; assente?: boolean }
/** Le fasi documentali di una pratica, con le differenze fra una fase e la precedente. */
export function Binario({ tappe }: { tappe: Tappa[] }) {
  return (
    <div className="binario" style={{ '--n': tappe.length } as React.CSSProperties}>
      {tappe.map((t) => t.fatta ? (
        <div key={t.titolo} className="tappa fatta">
          <span className="nodo"><Icona nome="spunta" /></span><h3>{t.titolo}</h3><div className="num">{t.numero}</div>
          <div className="testo-tenue piccolo">{data(t.data)}</div><div className={'imp ' + classeSegno(Math.min(0, t.importo ?? 0))}>{euro(t.importo)}</div>
          {t.delta != null && Math.abs(t.delta) >= 0.01 && <span className="delta">{euroSegno(t.delta)} rispetto alla fase prima</span>}
        </div>
      ) : (
        <div key={t.titolo} className={'tappa' + (t.ritardo ? ' ritardo' : '') + (t.assente ? ' assente' : '')}>
          <span className="nodo" /><h3>{t.titolo}</h3><div className={t.ritardo ? 'negativo' : 'testo-tenue'}>{t.testo}</div>
        </div>))}
    </div>
  );
}

export interface LatoCerniera { importo: number; dett?: string }
export interface RigaCerniera {
  titolo: ReactNode; dettagli?: ReactNode; sinistra: LatoCerniera | null; destra: LatoCerniera | null; differenza: number; quadra?: boolean;
  azioni?: { etichetta: string; variante?: string; onClick?: () => void; href?: string }[]; esito?: ReactNode;
}
export interface GruppoCerniera { titolo: string; variante: Variante; chiuso?: boolean; righe: RigaCerniera[] }
/** Confronto riga per riga fra due parti (fornitore / nostro calcolo), la differenza sulla cucitura. Gruppi richiudibili se hanno `chiuso`. */
export function Cerniera({ sinistra, destra, totali, gruppi }: { sinistra: string; destra: string; totali: { sinistra: number; destra: number; differenza: number }; gruppi: GruppoCerniera[] }) {
  const lato = (x: LatoCerniera | null) => x ? <><span className="cifra">{euro(x.importo)}</span><span className="dett">{x.dett ?? ''}</span></> : <span className="dett">non presente</span>;
  const riga = (r: RigaCerniera, i: number) => (
    <div key={i} className={'c-riga' + (r.esito ? ' decisa' : '')}>
      <div>{r.titolo}{r.dettagli && <span className="sec-riga">{r.dettagli}</span>}</div>
      <div className="c-sx">{lato(r.sinistra)}</div>
      <div className="c-cucitura">{r.quadra ? <Stato v="ok">Quadra</Stato> : <span className={'diff ' + classeSegno(r.differenza)}>{euroSegno(r.differenza)}</span>}</div>
      <div className="c-dx">{lato(r.destra)}</div>
      <div className="c-azioni">{r.esito}{(r.azioni ?? []).map((a) => {
        const cl = 'btn piccolo ' + (a.variante ?? '');
        return a.href ? <Link key={a.etichetta} className={cl} href={a.href}>{a.etichetta}</Link> : <button key={a.etichetta} type="button" className={cl} onClick={a.onClick}>{a.etichetta}</button>;
      })}</div>
    </div>
  );
  return <>
    <section className="cerniera-riepilogo">
      <div className="lato"><span>{sinistra}</span><b>{euro(totali.sinistra)}</b></div>
      <div className="cucitura"><span>Differenza</span><b className={classeSegno(totali.differenza)}>{Math.abs(totali.differenza) < 0.01 ? 'Quadra' : euroSegno(totali.differenza)}</b></div>
      <div className="lato destro"><span>{destra}</span><b>{euro(totali.destra)}</b></div>
    </section>
    <section className="cerniera">
      <div className="c-intest"><div>Documento</div><div className="c-sx">{sinistra}</div><div className="c-cucitura">Differenza</div><div className="c-dx">{destra}</div><div /></div>
      {gruppi.filter((g) => g.righe.length).map((g) => {
        const testa = <span className="c-gruppo-testo"><Stato v={g.variante}>{String(g.righe.length)}</Stato> {g.titolo}</span>;
        return g.chiuso !== undefined
          ? <details key={g.titolo} open={!g.chiuso}><summary className="c-gruppo">{testa}</summary>{g.righe.map(riga)}</details>
          : <div key={g.titolo}><div className="c-gruppo">{testa}</div>{g.righe.map(riga)}</div>;
      })}
    </section>
  </>;
}

/** Striscia di periodi (trimestri) con stato e barra di avanzamento per quello in corso. */
export function Periodi({ voci, etichetta = 'Periodi' }: { voci: { href: string; titolo: string; sotto: string; stato: string; attivo?: boolean; futuro?: boolean; avanzamento?: number }[]; etichetta?: string }) {
  return (
    <nav className="periodi" aria-label={etichetta} style={{ '--n': voci.length } as React.CSSProperties}>
      {voci.map((v) => (
        <Link key={v.titolo} href={v.href} className={(v.attivo ? 'attivo' : '') + (v.futuro ? ' futuro' : '')} aria-current={v.attivo ? 'page' : undefined}>
          <b>{v.titolo}</b><span>{v.sotto}</span><span>{v.stato}</span>
          {v.avanzamento != null && <span className="avanzamento" aria-hidden="true"><i style={{ width: v.avanzamento + '%' }} /></span>}
        </Link>))}
    </nav>
  );
}

/** Area dove trascinare i file o sceglierli. I file li legge il server (V12): qui si raccolgono e basta. */
export function Caricamento({ titolo = 'Trascina qui i file', testo, accetta = '', onFile }: { titolo?: string; testo?: ReactNode; accetta?: string; onFile: (file: File[]) => void }) {
  const [sopra, setSopra] = useState(false);
  const rilascia = (e: DragEvent) => { e.preventDefault(); setSopra(false); if (e.dataTransfer.files.length) onFile(Array.from(e.dataTransfer.files)); };
  return (
    <label className={'caricamento' + (sopra ? ' sopra' : '')} onDragOver={(e) => { e.preventDefault(); setSopra(true); }} onDragLeave={() => setSopra(false)} onDrop={rilascia}>
      <Icona nome="carica" /><b>{titolo}</b><span>{testo}</span><span className="btn sec piccolo">Scegli i file</span>
      <input type="file" multiple accept={accetta} onChange={(e) => { if (e.target.files?.length) onFile(Array.from(e.target.files)); e.target.value = ''; }} />
    </label>
  );
}
