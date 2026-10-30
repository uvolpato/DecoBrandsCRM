'use client';
import { useEffect, useState, type ReactNode } from 'react';

// Tabella come CRM.DataTable del prototipo (stesso markup .dt): riempie lo spazio, intestazione
// fissa, intestazioni ordinabili, paginazione. L'ordinamento vale su TUTTE le righe, la pagina ne
// mostra una fetta; cambiando le righe (filtro) o l'ordinamento si torna alla prima pagina.
// `filtro` (testo) è il filtro corrente: quando cambia si torna alla prima pagina; ricaricare gli
// stessi dati (dopo un salvataggio) lascia la pagina dov'è.
// ponytail: niente totali, tipi euro/data e memoria della schermata (§7.12): arrivano con le
// pagine che li usano (Pratiche, Liquidazioni).
export interface Colonna<R> {
  key: string;
  header: string;
  valore?: (r: R) => string | number | null | undefined; // per ordinare (e da mostrare se manca cell)
  cell?: (r: R) => ReactNode;
  align?: 'left' | 'right' | 'center';
  grow?: boolean;
  sortable?: boolean; // predefinito: sì
  classe?: (r: R) => string;
}

export interface DataTableProps<R> {
  righe: R[];
  colonne: Colonna<R>[];
  chiave: (r: R) => string;
  ordinamentoIniziale?: { key: string; dir: 'asc' | 'desc' };
  rowClass?: (r: R) => string;
  onRowClick?: (r: R) => void;
  compatta?: boolean;
  emptyText?: string;
  emptyHint?: string;
  perPagina?: number;
  filtro?: string;
}

const ordinale = (v: unknown) => (typeof v === 'number' ? v : String(v ?? '').toLowerCase());

export function DataTable<R>({ righe, colonne, chiave, ordinamentoIniziale, rowClass, onRowClick, compatta, emptyText = 'Nessun elemento', emptyHint = '', perPagina = 25, filtro }: DataTableProps<R>) {
  const [ord, setOrd] = useState(ordinamentoIniziale ?? null);
  const [pag, setPag] = useState(0);
  useEffect(() => setPag(0), [filtro]);

  const val = (c: Colonna<R>, r: R) => (c.valore ? c.valore(r) : (r as Record<string, unknown>)[c.key]);
  let tutte = righe;
  if (ord) {
    const c = colonne.find((x) => x.key === ord.key)!;
    tutte = [...righe].sort((a, b) => {
      const x = ordinale(val(c, a)), y = ordinale(val(c, b));
      const s = x < y ? -1 : x > y ? 1 : 0;
      return ord.dir === 'desc' ? -s : s;
    });
  }
  const pagine = Math.max(1, Math.ceil(tutte.length / perPagina));
  const p = Math.min(pag, pagine - 1);
  const lista = tutte.slice(p * perPagina, (p + 1) * perPagina);
  const al = (c: Colonna<R>) => (c.align === 'right' ? 'dx' : c.align === 'center' ? 'cx' : '');

  return (
    <div className={'dt' + (compatta ? ' compatta' : '')}>
      <div className="dt-scorri">
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
                {colonne.map((c) => (
                  <td key={c.key} className={[al(c), c.grow ? 'cresce' : '', c.classe?.(r) ?? ''].join(' ')}>
                    {c.cell ? c.cell(r) : String(val(c, r) ?? '—')}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={colonne.length}><div className="vuoto"><b>{emptyText}</b>{emptyHint}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="dt-piede">
        <span>{pagine > 1 ? `${p * perPagina + 1}–${p * perPagina + lista.length} di ` : ''}{tutte.length}{tutte.length === 1 ? ' elemento' : ' elementi'}</span>
        {pagine > 1 && <NavPagine n={pagine} pag={p} vai={setPag} />}
      </div>
    </div>
  );
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
