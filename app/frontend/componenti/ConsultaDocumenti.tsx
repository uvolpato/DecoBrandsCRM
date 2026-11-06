'use client';
// Documenti affiancati di una pratica, come "Consulta affiancati" del prototipo (§7.3): a sinistra il
// file originale, a destra i dati e il confronto riga per riga con un altro documento della pratica
// (di norma la fase precedente). Le schede e le frecce ← → passano da un documento all'altro.
import { useEffect, useState } from 'react';
import { DataTable, type Colonna } from './DataTable';
import { FilterBar } from './FilterBar';
import { Modale } from './Modale';
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

  // ← → passano da un documento all'altro, come nel prototipo
  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
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
  }, [cur, docs]);

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
    <Modale larga titolo={'Documenti della pratica ' + pratica.numero}
      testo={<>{pratica.cliente ?? '—'} · {pratica.fornitore ?? '—'}. A sinistra il documento, a destra il confronto con un altro documento della pratica.</>}
      onChiudi={onChiudi}
      piede={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span className="testo-tenue">{docs.length} {docs.length === 1 ? 'documento' : 'documenti'} nella pratica · ← → per scorrere i documenti</span>
        <button type="button" className="btn sec" onClick={onChiudi}>Chiudi</button>
      </div>}>
      <div className="aff-schede" role="tablist" aria-label="Documenti della pratica">
        {docs.map((d) => (
          <button key={d.id} type="button" role="tab" aria-selected={d.id === cur.id} onClick={() => scegli(d)}>
            {TIPO[d.tipo] ?? d.tipo}<span>{d.numero || dataIt(d.data)}</span>
          </button>
        ))}
      </div>
      <div className="colonne pari" style={{ alignItems: 'start' }}>
        {src
          ? foto
            ? <img src={src} alt={'Foto del documento ' + nome}
              style={{ width: '100%', border: 0, borderRadius: 8, background: '#f1f3f5' }} />
            : <object data={src} type="application/pdf" aria-label={'PDF di ' + nome}
              style={{ width: '100%', height: '430px', border: 0, borderRadius: 8, background: '#f1f3f5' }}>
              <p>Il browser non mostra il PDF qui. <a href={src} target="_blank" rel="noreferrer">Apri il PDF in una scheda</a>.</p>
            </object>
          : <div className="vuoto" style={{ height: 430, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <b>File non disponibile</b>
            Il documento è stato inserito a mano: i dati si confrontano lo stesso.
          </div>}
        <div className="pila">
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
          <p><a href={src ?? '#'} target="_blank" rel="noreferrer" hidden={!src}>{foto ? 'Apri la foto in una scheda' : 'Apri il PDF in una scheda'}</a></p>
          {rif && variate.length > 0 && (
            <FilterBar
              campi={[{
                nome: 'vista', tipo: 'segmenti', opzioni: [
                  { value: 'variate', label: 'Solo righe che cambiano', n: variate.length },
                  { value: 'tutte', label: 'Tutte le righe', n: righe.length },
                ],
              }]}
              valori={{ vista }} onChange={(v) => setVista(String(v.vista))} />
          )}
          <DataTable righe={mostra} colonne={colonne} chiave={(r) => String(r.i)} naturale compatta
            rowClass={(r) => (r.varia ? 'evidenzia ' : '') + (r.codice === segnata ? 'selezionata' : '')}
            onRowClick={(r) => setSegnata(r.codice)}
            emptyText="Nessuna riga" emptyHint={rif ? 'I due documenti non hanno righe in comune.' : 'Scegli un documento con cui confrontare.'} />
        </div>
      </div>
    </Modale>
  );
}
