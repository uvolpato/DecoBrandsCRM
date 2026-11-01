'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { data as formatoData, euro, num, pct } from '@/lib/formati';
import { useMemoria, useScorrimento } from '@/lib/memoria';

// Tabella come CRM.DataTable del prototipo (stesso markup .dt): riempie lo spazio, intestazione
// fissa, intestazioni ordinabili, totali fissi, piede con conteggio, paginazione. L'ordinamento e i
// totali valgono su TUTTE le righe, la pagina ne mostra una fetta; cambiando il filtro o
// l'ordinamento si torna alla prima pagina. `filtro` (testo) è il filtro corrente; ricaricare gli
// stessi dati (dopo un salvataggio) lascia la pagina dov'è.
// `memoria` (nome): ordinamento, pagina e scorrimento si ritrovano tornando alla pagina (§7.12).
export type TipoColonna = 'testo' | 'euro' | 'numero' | 'pct' | 'data';
export interface Colonna<R> {
  key: string;
  header: string;
  tipo?: TipoColonna; // formato e allineamento (euro, numero, pct a destra)
  valore?: (r: R) => string | number | null | undefined; // per ordinare (e da mostrare se manca cell)
  sortValue?: (r: R) => string | number; // se l'ordine non è quello del valore
  cell?: (r: R) => ReactNode;
  align?: 'left' | 'right' | 'center';
  grow?: boolean;
  sortable?: boolean; // predefinito: sì
  classe?: (r: R) => string;
  totale?: 'somma'; // somma di tutte le righe nel piede fisso
}

export interface DataTableProps<R> {
  righe: R[];
  colonne: Colonna<R>[];
  chiave: (r: R) => string;
  ordinamentoIniziale?: { key: string; dir: 'asc' | 'desc' };
  rowClass?: (r: R) => string;
  onRowClick?: (r: R) => void;
  compatta?: boolean;
  naturale?: boolean; // altezza del contenuto, senza pagine (tabelle brevi impilate)
  emptyText?: string;
  emptyHint?: string;
  perPagina?: number | false; // false: senza pagine
  filtro?: string;
  piede?: ReactNode;
  etichettaTotale?: string;
  memoria?: string;
}

const FORMATI: Record<TipoColonna, (v: unknown) => string> = {
  testo: (v) => (v == null || v === '' ? '—' : String(v)), euro, numero: num, pct, data: (v) => formatoData(v as string),
};
const ordinale = (v: unknown) => (typeof v === 'number' ? v : String(v ?? '').toLowerCase());

export function DataTable<R>({ righe, colonne, chiave, ordinamentoIniziale, rowClass, onRowClick, compatta, emptyText = 'Nessun elemento', emptyHint = '', perPagina: pp = 25, filtro, naturale, piede, etichettaTotale, memoria }: DataTableProps<R>) {
  const perPagina = naturale || pp === false ? Number.MAX_SAFE_INTEGER : pp;
  const [ord, setOrd] = useMemoria(memoria && memoria + '|ord', ordinamentoIniziale ?? null);
  const [pag, setPag] = useMemoria(memoria && memoria + '|pagina', 0);
  const scorri = useScorrimento<HTMLDivElement>(memoria, righe.length > 0);
  // salta il primo giro: aprendo la pagina la pagina ricordata non va azzerata
  const [primo, setPrimo] = useState(true);
  useEffect(() => { if (primo) setPrimo(false); else setPag(0); }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al cambio filtro

  const val = (c: Colonna<R>, r: R) => (c.valore ? c.valore(r) : (r as Record<string, unknown>)[c.key]);
  const tipo = (c: Colonna<R>) => c.tipo ?? 'testo';
  const chiaveOrd = (c: Colonna<R>, r: R) => {
    const v = c.sortValue ? c.sortValue(r) : val(c, r);
    return ordinale(tipo(c) === 'testo' || c.sortValue || v == null || Number.isNaN(Number(v)) ? v : Number(v));
  };
  let tutte = righe;
  if (ord) {
    const c = colonne.find((x) => x.key === ord.key);
    if (c) tutte = [...righe].sort((a, b) => {
      const x = chiaveOrd(c, a), y = chiaveOrd(c, b);
      const s = x < y ? -1 : x > y ? 1 : 0;
      return ord.dir === 'desc' ? -s : s;
    });
  }
  const pagine = Math.max(1, Math.ceil(tutte.length / perPagina));
  const p = Math.min(pag, pagine - 1);
  const lista = tutte.slice(p * perPagina, (p + 1) * perPagina);
  const al = (c: Colonna<R>) => (c.align === 'right' || (!c.align && ['euro', 'numero', 'pct'].includes(tipo(c))) ? 'dx' : c.align === 'center' ? 'cx' : '');
  const primoTotale = colonne.findIndex((c) => c.totale);

  return <div className={'dt' + (compatta ? ' compatta' : '') + (naturale ? ' naturale' : '')}>
    <div className="dt-scorri" ref={scorri}>
      <table>
        <thead>
          <tr>
            {colonne.map((c) => {
              const ordinabile = c.sortable !== false, attivo = ord?.key === c.key;
              return (
                <th key={c.key} className={[al(c), ordinabile ? 'ordinabile' : '', attivo ? 'attivo' : ''].join(' ')}
                  aria-sort={ordinabile ? (attivo ? (ord!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  onClick={ordinabile ? () => { setOrd({ key: c.key, dir: attivo && ord!.dir === 'asc' ? 'desc' : 'asc' }); setPag(0); } : undefined}>
                  {c.header}
                  {ordinabile && <span className="freccia" aria-hidden="true">{attivo ? (ord!.dir === 'asc' ? '▲' : '▼') : '▲▼'}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {lista.length ? lista.map((r) => (
            <tr key={chiave(r)} className={[onRowClick ? 'cliccabile' : '', rowClass?.(r) ?? ''].join(' ')}
              onClick={onRowClick ? (e) => { if (!(e.target as Element).closest('a, button')) onRowClick(r); } : undefined}>
              {colonne.map((c) => <td key={c.key} className={[al(c), c.grow ? 'cresce' : '', c.classe?.(r) ?? ''].join(' ')}>
                {c.cell ? c.cell(r) : FORMATI[tipo(c)](val(c, r))}
              </td>)}
            </tr>
          )) : <tr><td colSpan={colonne.length}><div className="vuoto"><b>{emptyText}</b>{emptyHint}</div></td></tr>}
        </tbody>
        {tutte.length > 0 && primoTotale >= 0 && <tfoot><tr>
          <td colSpan={Math.max(1, primoTotale)}>{etichettaTotale ?? 'Totale'}</td>
          {colonne.slice(Math.max(1, primoTotale)).map((c) => <td key={c.key} className={al(c)}>
            {c.totale ? FORMATI[tipo(c) === 'testo' ? 'numero' : tipo(c)](tutte.reduce((s, r) => s + (Number(val(c, r)) || 0), 0)) : ''}
          </td>)}
        </tr></tfoot>}
      </table>
    </div>
    <div className="dt-piede">
      <span>{pagine > 1 ? `${p * perPagina + 1}–${p * perPagina + lista.length} di ` : ''}{tutte.length}{tutte.length === 1 ? ' elemento' : ' elementi'}</span>
      {pagine > 1 && <NavPagine n={pagine} pag={p} vai={setPag} />}
      {piede && <span>{piede}</span>}
    </div>
  </div>;
}

// prima, precedente, numeri vicini (con … se sono molte), successiva
function NavPagine({ n, pag, vai }: { n: number; pag: number; vai: (p: number) => void }) {
  const num: (number | '…')[] = [];
  for (let i = 0; i < n; i++) if (i === 0 || i === n - 1 || Math.abs(i - pag) <= 1) num.push(i); else if (num[num.length - 1] !== '…') num.push('…');
  const b = (p: number, t: ReactNode, titolo: string, dis = false, att = false) => (
    <button key={titolo} type="button" disabled={dis} aria-current={att ? 'page' : undefined} className={att ? 'attiva' : undefined} title={titolo} onClick={() => vai(p)}>{t}</button>
  );
  return (
    <nav className="dt-pagine" aria-label="Pagine">
      {b(pag - 1, '‹', 'Pagina precedente', pag === 0)}
      {num.map((i, k) => (i === '…' ? <span key={'…' + k}>…</span> : b(i, i + 1, 'Pagina ' + (i + 1), false, i === pag)))}
      {b(pag + 1, '›', 'Pagina successiva', pag === n - 1)}
    </nav>
  );
}
