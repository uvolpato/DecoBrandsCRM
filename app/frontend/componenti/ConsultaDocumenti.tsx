'use client';
// Documenti affiancati di una pratica, come "Consulta affiancati" del prototipo (§7.3): a sinistra il
// file originale, a destra i dati e il confronto riga per riga con un altro documento della pratica
// (di norma la fase precedente). Le schede e le frecce ← → passano da un documento all'altro.
import { useEffect, useState } from 'react';
import { DataTable, type Colonna } from './DataTable';
import { FilterBar } from './FilterBar';
import { Icona } from './Icona';
import { Dettagli } from './Piccoli';
import { classeSegno, data as dataIt, euro, euroSegno } from '@/lib/formati';

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};
const ORDINE = ['ordine', 'conferma', 'fattura', 'nota_credito'];

export interface RigaDoc {
  codice: string | null; descrizione: string | null;
  quantita: number | null; prezzo: number | null; importo: number | null;
}
export interface DocPratica {
  id: string; tipo: string; numero: string | null; data: string; importo: number;
  arrivo_id: string | null; file_nome: string | null; note?: string | null;
  righe?: RigaDoc[]; riferimento?: string | null;
}
interface Confronto {
  i: number; codice: string; descrizione: string | null; a: RigaDoc | null; b: RigaDoc | null; varia: boolean; delta: number;
}

/** Il documento precedente: quello stornato per la nota di credito, altrimenti l'ultimo della fase prima. */
function precedente(cur: DocPratica, docs: DocPratica[]): DocPratica | null {
  if (cur.riferimento) {
    const x = docs.find((y) => y.numero === cur.riferimento);
    if (x) return x;
  }
  const k = ORDINE.indexOf(cur.tipo);
  for (let i = k - 1; i >= 0; i--) {
    const xs = docs.filter((y) => y.tipo === ORDINE[i]);
    if (xs.length) return xs[xs.length - 1];
  }
  return null;
}

function confronto(cur: DocPratica, rif: DocPratica | null): Confronto[] {
  if (!rif) return [];
  // la nota di credito storna solo le righe che contiene: quelle assenti non sono "tolte"
  const soloNC = cur.tipo === 'nota_credito' || rif.tipo === 'nota_credito';
  const chiave = (r: RigaDoc) => r.codice ?? r.descrizione ?? '';
  const fonti = (soloNC ? [rif, cur].filter((d) => d.tipo === 'nota_credito') : [rif, cur]);
  const codici = [...new Set(fonti.flatMap((d) => (d.righe ?? []).map(chiave)))];
  return codici.map((c, i) => {
    const a = (rif.righe ?? []).find((r) => chiave(r) === c) ?? null;
    const b = (cur.righe ?? []).find((r) => chiave(r) === c) ?? null;
    const varia = !a || !b || a.quantita !== b.quantita || a.prezzo !== b.prezzo;
    if (soloNC) {
      const nc = cur.tipo === 'nota_credito' ? b : a;
      return { i, codice: c, descrizione: (b ?? a)?.descrizione ?? null, a, b, varia: true, delta: nc?.importo ?? 0 };
    }
    return { i, codice: c, descrizione: (b ?? a)?.descrizione ?? null, a, b, varia, delta: (b?.importo ?? 0) - (a?.importo ?? 0) };
  });
}

export function ConsultaDocumenti({ docs, iniziale, pratica, codiceIniziale, onChiudi }: {
  docs: DocPratica[]; iniziale?: DocPratica; pratica: { numero: string; cliente: string | null; fornitore: string | null };
  codiceIniziale?: string | null; onChiudi: () => void;
}) {
  const [cur, setCur] = useState(iniziale ?? docs[0]);
  const [rif, setRif] = useState<DocPratica | null>(() => precedente(iniziale ?? docs[0], docs));
  const [vista, setVista] = useState(codiceIniziale ? 'tutte' : 'variate');
  const [segnata, setSegnata] = useState<string | null>(codiceIniziale ?? null);

  function scegli(d: DocPratica | null) {
    if (!d) return;
    setCur(d); setRif(precedente(d, docs)); setSegnata(null);
  }

  // ← → passano da un documento all'altro, come nel prototipo; Esc chiude
  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onChiudi(); return; }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, select, textarea')) return;
      const i = docs.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1);
      if (i < 0 || i >= docs.length) return;
      e.preventDefault();
      scegli(docs[i]);
    };
    document.addEventListener('keydown', tasto);
    return () => document.removeEventListener('keydown', tasto);
  }, [cur, docs, onChiudi]);

  const righe = confronto(cur, rif);
  const variate = righe.filter((r) => r.varia);
  const mostra = rif && vista === 'variate' && variate.length ? variate : righe;
  const soloNC = cur.tipo === 'nota_credito' || rif?.tipo === 'nota_credito';
  const diff = !rif ? 0 : soloNC ? (cur.tipo === 'nota_credito' ? cur.importo : rif.importo) : cur.importo - rif.importo;
  const src = cur.arrivo_id ? '/api/documenti/' + cur.arrivo_id + '/file' : null;
  const foto = /\.(jpe?g|png)$/i.test(cur.file_nome ?? '');
  const nome = cur.numero || dataIt(cur.data);

  const qp = (r: RigaDoc | null) => r
    ? <>{r.quantita ?? '—'} × {euro(r.prezzo ?? 0)}<span className="sec-riga">{euro(r.importo ?? 0)}</span></>
    : <span className="testo-tenue">assente</span>;
  const colonne: Colonna<Confronto>[] = [
    {
      key: 'codice', header: 'Articolo', grow: true,
      cell: (r) => <><b>{r.codice || '—'}</b><span className="sec-riga">{r.descrizione ?? ''}</span></>,
    },
    ...(rif ? [{ key: 'a', header: TIPO[rif.tipo] + ' ' + (rif.numero ?? ''), align: 'right' as const, cell: (r: Confronto) => qp(r.a) }] : []),
    { key: 'b', header: TIPO[cur.tipo] + ' ' + (cur.numero ?? ''), align: 'right' as const, cell: (r) => qp(r.b) },
    ...(rif ? [{
      key: 'delta', header: 'Differenza',
      cell: (r: Confronto) => Math.abs(r.delta) < 0.01
        ? <span className="testo-tenue">—</span>
        : <b className={classeSegno(r.delta)}>{euroSegno(r.delta)}</b>,
    }] : []),
  ];

  return (
    <div className="velo velo-pieno" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="affiancata" role="dialog" aria-modal="true" aria-label={'Documenti della pratica ' + pratica.numero}>
        <div className="aff-testa" style={{ padding: '14px 20px' }}>
          <div>
            <h2>Documenti della pratica {pratica.numero}</h2>
            <p className="testo-tenue">{pratica.cliente ?? '—'} · {pratica.fornitore ?? '—'}. A sinistra il documento, a destra il confronto con un altro documento della pratica.</p>
          </div>
          <button type="button" className="btn-chiudi" onClick={onChiudi} aria-label="Chiudi"><Icona nome="chiudi" /></button>
        </div>
        <div className="aff-corpo">
          <div className="aff-sx" style={{ display: 'flex', flexDirection: 'column', padding: 0, background: '#525659' }}>
            <div className="aff-schede" role="tablist" aria-label="Documenti della pratica" style={{ padding: '12px 14px 0', marginBottom: 10 }}>
              {docs.map((d) => (
                <button key={d.id} type="button" role="tab" aria-selected={d.id === cur.id} onClick={() => scegli(d)}>
                  {TIPO[d.tipo] ?? d.tipo}<span>{d.numero || dataIt(d.data)}</span>
                </button>
              ))}
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, padding: src && !foto ? 0 : 16 }}>
              {src
                ? foto
                  ? <img src={src} alt={'Foto del documento ' + nome}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  : <object data={src} type="application/pdf" aria-label={'PDF di ' + nome}
                    style={{ width: '100%', height: '100%', border: 0, background: '#525659' }}>
                    <p style={{ padding: 16, color: '#fff' }}>Il browser non mostra il PDF qui. <a href={src} target="_blank" rel="noreferrer" style={{ color: '#fff' }}>Apri il PDF in una scheda</a>.</p>
                  </object>
                : <div style={{ height: '100%', overflow: 'auto' }}><AnteprimaDocumento d={cur} fornitore={pratica.fornitore} /></div>}
            </div>
          </div>
          <div className="aff-divisore" />
          <div className="aff-dx">
            <Dettagli inColonne voci={[
              { etichetta: TIPO[cur.tipo] ?? cur.tipo, valore: <><b>{cur.numero || '—'}</b><span className="sec-riga">del {dataIt(cur.data)}</span></> },
              { etichetta: 'Importo', valore: euro(cur.importo) },
              {
                etichetta: 'Confrontato con',
                valore: <select className="filtro-select" aria-label="Documento con cui confrontare" value={rif?.id ?? ''}
                  onChange={(e) => setRif(docs.find((d) => d.id === e.target.value) ?? null)}>
                  <option value="">Nessun confronto</option>
                  {docs.filter((d) => d.id !== cur.id).map((d) => (
                    <option key={d.id} value={d.id}>{TIPO[d.tipo] + ' ' + (d.numero ?? '')}</option>
                  ))}
                </select>,
              },
              {
                etichetta: 'Differenza',
                valore: rif ? (
                  Math.abs(diff) < 0.01
                    ? <span className="testo-tenue">nessuna</span>
                    : <><b className={classeSegno(diff)}>{euroSegno(diff)}</b>
                      <span className="sec-riga">{variate.length} {variate.length === 1 ? 'riga ' + (soloNC ? 'stornata' : 'cambia') : 'righe ' + (soloNC ? 'stornate' : 'cambiano')}</span></>
                ) : '—',
              },
            ]} />
            {cur.note && <p className="testo-tenue">{cur.note}</p>}
            {src && <p><a href={src} target="_blank" rel="noreferrer">{foto ? 'Apri la foto in una scheda' : 'Apri il PDF in una scheda'}</a></p>}
            {rif && variate.length > 0 && (
              <div style={{ margin: '14px 0 8px' }}>
                <FilterBar
                  campi={[{
                    nome: 'vista', tipo: 'segmenti', opzioni: [
                      { value: 'variate', label: 'Solo righe che cambiano', n: variate.length },
                      { value: 'tutte', label: 'Tutte le righe', n: righe.length },
                    ],
                  }]}
                  valori={{ vista }} onChange={(v) => setVista(String(v.vista))} />
              </div>
            )}
            <div className="riempi">
              <DataTable righe={mostra} colonne={colonne} chiave={(r) => String(r.i)} naturale compatta
                rowClass={(r) => (r.varia ? 'evidenzia ' : '') + (r.codice === segnata ? 'selezionata' : '')}
                onRowClick={(r) => setSegnata(r.codice)}
                emptyText="Nessuna riga" emptyHint={rif ? 'I due documenti non hanno righe in comune.' : 'Scegli un documento con cui confrontare.'} />
            </div>
          </div>
        </div>
        <div className="aff-piede" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--bordo-tenue)' }}>
          <span className="testo-tenue">{docs.length} {docs.length === 1 ? 'documento' : 'documenti'} nella pratica · ← → per scorrere i documenti</span>
          <button type="button" className="btn sec" onClick={onChiudi}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

/** Quando il file vero non c'è (documenti inseriti a mano) si mostra la pagina del prototipo,
 *  costruita dai dati del documento: articolo, quantità, prezzo e totale. */
function AnteprimaDocumento({ d, fornitore }: { d: DocPratica; fornitore: string | null }) {
  const righe = d.righe ?? [];
  const somma = righe.reduce((s, r) => s + (r.importo ?? (r.quantita ?? 0) * (r.prezzo ?? 0)), 0);
  return (
    <div className="doc-pagina">
      <div className="doc-intest">
        <div><b className="doc-marchio">{fornitore ?? 'Fornitore'}</b></div>
        <span className="doc-file">{d.file_nome ?? 'anteprima'}</span>
      </div>
      <div className="doc-titolo">{(TIPO[d.tipo] ?? 'Documento').toUpperCase()} N. {d.numero || '—'}</div>
      <div className="doc-meta"><span>Data <b>{dataIt(d.data)}</b></span>{d.note && <span>{d.note}</span>}</div>
      <table className="doc-tab">
        <thead>
          <tr><th>Articolo</th><th>Descrizione</th><th className="dx">Quantità</th><th className="dx">Prezzo</th><th className="dx">Importo</th></tr>
        </thead>
        <tbody>
          {righe.length ? righe.map((r, i) => (
            <tr key={i}>
              <td>{r.codice ?? '—'}</td>
              <td>{r.descrizione ?? ''}</td>
              <td className="dx">{r.quantita ?? '—'}</td>
              <td className="dx">{euro(r.prezzo ?? 0)}</td>
              <td className="dx">{euro(r.importo ?? (r.quantita ?? 0) * (r.prezzo ?? 0))}</td>
            </tr>
          )) : <tr><td colSpan={5} className="testo-tenue">Nessuna riga letta</td></tr>}
        </tbody>
        <tfoot><tr><td colSpan={4}>Totale documento</td><td className="dx"><b>{euro(d.importo || somma)}</b></td></tr></tfoot>
      </table>
      <p className="doc-nota">Anteprima del documento costruita dai dati. Il file originale non è disponibile.</p>
    </div>
  );
}
