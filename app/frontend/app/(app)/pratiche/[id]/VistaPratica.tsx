'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Campo } from '@/componenti/Campo';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { Binario, Caricamento } from '@/componenti/Flussi';
import { Cifre } from '@/componenti/Kpi';
import { Conferma, Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, Dettagli, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { api, caricaPdf } from '@/lib/api';
import { data as dataIt, euro, euroSegno, pct } from '@/lib/formati';

// Dettaglio pratica (F2-A2, §7.3): binario, riepilogo della provvigione, righe a confronto e
// documenti fiscali. Stato, importi, variazioni e provvigioni arrivano già calcolati dal server
// (V12, D-28); qui si compone soltanto.

type Chiave = 'scaduta' | 'attesa' | 'confermata' | 'fatturata';
interface Tappa {
  titolo: string; fatta?: boolean; ritardo?: boolean; numero?: string; data?: string;
  importo?: number; delta?: number; testo?: string; assente?: boolean;
}
interface FaseRiga { tipo: 'ordine' | 'conferma' | 'fattura'; etichetta: string; numero: string; data: string }
interface Riga {
  codice: string; descrizione: string; varia: boolean; delta: number;
  per: ({ qta: number; prezzo: number; importo: number } | null)[];
}
interface Provvigione {
  imponibile: number; sconto: number; valido_dal: string; agente: number; sub_standard: number;
  sub: number; eccezione: boolean; da_fornitore: number; a_decobrands: number; a_subagente: number;
  maturazione: string | null; regole: string[];
}
interface Dettaglio {
  id: string; numero: string;
  cliente_id: string; cliente: string; fornitore_id: string; fornitore: string;
  subagente_id: string | null; subagente: string | null;
  data: string; importo: number; stato: Chiave; nota: string | null; scadenza: string | null;
  fasi: Tappa[];
  confronto: { fasi: FaseRiga[]; righe: Riga[]; variazioni: { numero: number; totale: number } };
  provvigione: Provvigione | null;
  azione: { tipo: string; testo: string };
}
interface Documento {
  id: string; tipo: 'fattura' | 'nota_credito'; numero: string; data: string; importo: number;
  storno_totale: boolean; fattura_id: string | null; stornato?: number; residuo?: number;
  arrivo_id: string | null; file_nome: string | null; stato_incasso: string | null;
  liquidato: boolean; note: string | null;
}
interface Fiscali {
  pratica: { id: string; numero: string; stato: string; importo: number };
  documenti: Documento[];
  totali: { fatture: number; note_credito: number; netto: number };
}

const ETICHETTA: Record<Chiave, { testo: string; v: Variante }> = {
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
};
const TIPO = { fattura: 'Fattura', nota_credito: 'Nota di credito' } as const;
const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export function VistaPratica({ id }: { id: string }) {
  const puo = usePuo();
  const cerca = useSearchParams();
  const puoModifica = puo('provvigioni.modifica');
  const [d, setD] = useState<Dettaglio | null>(null);
  const [fiscali, setFiscali] = useState<Fiscali | null>(null);
  const [errore, setErrore] = useState('');
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [vista, setVista] = useState<'variate' | 'tutte'>('variate');
  const sagome = useSagome(!d || !fiscali);

  const carica = useCallback(async () => {
    const [r, f] = await Promise.all([api<Dettaglio>('pratiche/' + id), api<Fiscali>('pratiche/' + id + '/documenti')]);
    if (r.ok && f.ok) { setD(r.dati); setFiscali(f.dati); setErrore(''); }
    else setErrore(!r.ok ? r.messaggio : f.messaggio);
  }, [id]);

  useEffect(() => { void carica(); }, [carica]);

  const chiudi = () => setFinestra(null);
  const salvato = async (f: Fiscali, testo: string) => {
    setFiscali(f);
    avviso(testo);
    chiudi();
    await carica();
  };

  function apriDoc(doc: Documento) {
    const docs = (fiscali?.documenti ?? []).filter((x) => x.arrivo_id);
    if (!doc.arrivo_id || !docs.length) { avviso('Il PDF di questo documento non è disponibile.', true); return; }
    setFinestra(<Visualizzatore docs={docs} iniziale={doc} onChiudi={chiudi} />);
  }

  function correggi(doc: Documento) {
    setFinestra(<FinestraDocumento pratica={id} documento={doc} tipo={doc.tipo} fatture={[]}
      onChiudi={chiudi} onSalvato={(f) => salvato(f, 'Documento corretto')} />);
  }

  function registra(tipo: 'fattura' | 'nota_credito') {
    setFinestra(<FinestraDocumento pratica={id} documento={null} tipo={tipo}
      fatture={(fiscali?.documenti ?? []).filter((x) => x.tipo === 'fattura' && (x.residuo ?? 0) > 0.005)}
      onChiudi={chiudi} onSalvato={(f) => salvato(f, tipo === 'fattura' ? 'Fattura registrata' : 'Nota di credito registrata')} />);
  }

  async function annulla(doc: Documento) {
    const si = await new Promise<boolean>((ok) => setFinestra(
      <Conferma titolo={'Annullare la ' + (doc.tipo === 'fattura' ? 'fattura' : 'nota di credito') + ' ' + doc.numero + '?'}
        testo="Il documento viene tolto dalla pratica; se aveva un file, torna fra i documenti da controllare."
        etichetta="Annulla il documento" pericolo onRisposta={(x) => { chiudi(); ok(x); }} />,
    ));
    if (!si) return;
    const r = await api('pratiche/' + id + '/documenti/' + doc.id, { note: null }, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Documento annullato');
    await carica();
  }

  if (!d || !fiscali) {
    return (
      <Pagina titolo="Pratica" pieno>
        {errore
          ? <Pannello>
            <div className="vuoto"><b>Pratica non caricata</b>{errore}
              <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button>
            </div>
          </Pannello>
          : sagome && (
            <div className="pila riempi" aria-busy="true">
              <Pannello senzaMargine><Sagoma larghezza="100%" altezza={96} /></Pannello>
              <Sagoma larghezza={280} altezza={40} />
              <div className="colonne riepilogo-pratica">
                <Pannello titolo="Provvigione">
                  <div className="pila">
                    <Sagoma larghezza="55%" altezza={12} />
                    <Sagoma larghezza="80%" altezza={22} />
                    <Sagoma larghezza="70%" altezza={22} />
                    <Sagoma larghezza="90%" altezza={22} />
                  </div>
                </Pannello>
                <Pannello titolo="Documenti fiscali">
                  <div className="pila">
                    <Sagoma larghezza="100%" altezza={34} />
                    <Sagoma larghezza="100%" altezza={34} />
                    <Sagoma larghezza="100%" altezza={34} />
                  </div>
                </Pannello>
              </div>
            </div>
          )}
      </Pagina>
    );
  }

  const s = ETICHETTA[d.stato];
  const variazioni = d.confronto.variazioni;
  // aperta dall'elenco con il filtro Con variazioni: si parte dal confronto (D-12 §19)
  const daVariazioni = cerca.get('righe') === '1' && variazioni.numero > 0;
  const righe = d.confronto.righe;
  const mostra = vista === 'variate' && variazioni.numero ? righe.filter((r) => r.varia) : righe;
  const fatture = fiscali.documenti.filter((x) => x.tipo === 'fattura');
  const vediRighe = () => document.querySelector<HTMLElement>('.schede-barra [data-id="righe"]')?.click();

  const colonneRighe: Colonna<Riga>[] = [
    {
      key: 'codice', header: 'Articolo', grow: true,
      cell: (r) => <><b>{r.codice}</b><span className="sec-riga">{r.descrizione}</span></>,
    },
    ...d.confronto.fasi.map((f, i) => ({
      key: 'f' + i, header: f.etichetta, align: 'right' as const,
      sortValue: (r: Riga) => r.per[i]?.importo ?? -1,
      cell: (r: Riga) => r.per[i]
        ? <>{r.per[i]!.qta} × {euro(r.per[i]!.prezzo)}<span className="sec-riga">{euro(r.per[i]!.importo)}</span></>
        : <span className="testo-tenue">assente</span>,
    })),
    ...(d.confronto.fasi.length > 1 ? [{
      key: 'delta', header: 'Differenza', tipo: 'euro' as const,
      cell: (r: Riga) => Math.abs(r.delta) < 0.01 ? <span className="testo-tenue">—</span> : <b className={r.delta < 0 ? 'negativo' : 'positivo'}>{euroSegno(r.delta)}</b>,
    }] : []),
  ];

  const colonneDoc: Colonna<Documento>[] = [
    { key: 'numero', header: 'Documento', grow: true, cell: (x) => <><b>{x.numero}</b><span className="sec-riga">{TIPO[x.tipo]}</span></> },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'importo', header: 'Importo', tipo: 'euro', totale: 'somma' },
    { key: 'residuo', header: 'Residuo', tipo: 'euro', cell: (x) => x.residuo == null ? <span className="testo-tenue">—</span> : euro(x.residuo) },
    {
      key: 'azioni', header: '', align: 'right', sortable: false,
      cell: (x) => x.liquidato
        ? <Stato v="neutro">liquidato</Stato>
        : <>
          {x.arrivo_id && <button type="button" className="btn testo piccolo" onClick={() => apriDoc(x)}>PDF</button>}
          {puoModifica && x.tipo === 'fattura' && <button type="button" className="btn testo piccolo" onClick={() => correggi(x)}>Correggi</button>}
          {puoModifica && x.tipo === 'nota_credito' && <button type="button" className="btn testo piccolo" onClick={() => correggi(x)}>Correggi</button>}
          {puoModifica && <button type="button" className="btn testo piccolo" onClick={() => void annulla(x)}>Annulla</button>}
        </>,
    },
  ];

  const riepilogo = () => {
    return (
      <>
        {!!variazioni.numero && (
          <div className="avviso-variazioni" role="status">
            <span><b>{variazioni.numero === 1 ? 'Una riga cambia' : variazioni.numero + ' righe cambiano'}</b> fra le fasi,
              in totale <b>{euroSegno(variazioni.totale)}</b>.</span>
            <button type="button" className="btn sec piccolo" onClick={vediRighe}>Vedi le righe</button>
          </div>
        )}
        <div className="colonne riepilogo-pratica">
          <div className="pila">
            <Pannello titolo="Provvigione" nota={fiscali.documenti.length ? 'sul netto fatturato' : 'prevista'}>
              {!d.provvigione ? <Nota>Nessun abbinamento cliente × fornitore: la pratica non genera provvigioni.</Nota> : <>
                <Cifre voci={[
                  { etichetta: 'Imponibile', valore: d.provvigione.imponibile },
                  { etichetta: 'Sconto al cliente', valore: pct(d.provvigione.sconto), nota: 'in vigore dal ' + dataIt(d.provvigione.valido_dal) },
                  { etichetta: 'Da ' + d.fornitore + ' a Decobrands: ' + pct(d.provvigione.agente) + ' + ' + pct(d.provvigione.sub_standard), valore: d.provvigione.a_decobrands },
                  {
                    etichetta: 'A ' + (d.subagente ?? 'subagente') + ': ' + pct(d.provvigione.sub) + (d.provvigione.eccezione ? ' (eccezione personale)' : ''),
                    valore: d.provvigione.a_subagente,
                    nota: d.provvigione.regole.length ? d.provvigione.regole.join(' · ') : undefined,
                  },
                ]} />
                <Nota>
                  {d.fornitore} {d.provvigione.maturazione === 'maturato'
                    ? 'paga sul maturato: la provvigione del subagente si sblocca quando il fornitore la riconosce in un bollettino verificato.'
                    : 'paga sul fatturato: la provvigione del subagente entra nel trimestre della fattura.'}
                </Nota>
              </>}
            </Pannello>
          </div>
          <div className="pila">
            <Pannello titolo="Documenti fiscali" nota={String(fiscali.documenti.length)} riempi
              azioni={puoModifica ? [
                { etichetta: 'Registra fattura', icona: 'piu', onClick: () => registra('fattura') },
                ...(fatture.length ? [{ etichetta: 'Nota di credito', onClick: () => registra('nota_credito') }] : []),
              ] : []}>
              <DataTable righe={fiscali.documenti} colonne={colonneDoc} chiave={(x) => x.id} naturale
                emptyText="Nessun documento fiscale" emptyHint={puoModifica ? 'Registra la fattura quando arriva dal fornitore.' : ''}
                piede={'Netto ' + euro(fiscali.totali.netto)} />
              <Nota>Il netto è fatture − note di credito. Un documento in un bollettino non si cambia: si corregge con una nota di credito.</Nota>
            </Pannello>
          </div>
        </div>
      </>
    );
  };

  const schedaRighe = () => {
    return (
      <>
        <Nota>
          {d.confronto.fasi.length > 1
            ? variazioni.numero ? 'Le righe evidenziate cambiano fra le fasi.' : 'Nessuna variazione fra le fasi.'
            : 'Il confronto parte quando arriva la conferma.'}
        </Nota>
        {!!variazioni.numero && (
          <FilterBar valori={{ vista }} onChange={(v) => setVista(v.vista as 'variate' | 'tutte')} campi={[{
            nome: 'vista', tipo: 'segmenti', opzioni: [
              { value: 'variate', label: 'Solo righe che cambiano', n: variazioni.numero },
              { value: 'tutte', label: 'Tutte le righe', n: righe.length },
            ],
          }]} />
        )}
        <div className="riempi">
          <DataTable righe={mostra} colonne={colonneRighe} chiave={(r) => r.codice} compatta
            ordinamentoIniziale={{ key: 'codice', dir: 'asc' }} filtro={vista}
            rowClass={(r) => r.varia ? 'evidenzia' : ''}
            onRowClick={d.confronto.fasi.length > 1 ? () => {
              const ultimo = [...fiscali.documenti].reverse().find((x) => x.arrivo_id);
              if (ultimo) apriDoc(ultimo);
            } : undefined}
            emptyText="Nessuna riga" emptyHint="Il confronto parte quando arriva la conferma." />
        </div>
      </>
    );
  };

  return (
    <Pagina pieno titolo={d.numero} badge={<Stato v={s.v}>{s.testo}</Stato>}
      sottotitolo={<>{d.cliente} · {d.fornitore}{d.subagente ? ' · seguita da ' + d.subagente : ' · nessun subagente abbinato'}</>}
      azioni={[{ etichetta: 'Torna alle pratiche', icona: 'indietro', variante: 'sec', href: '/pratiche' }]}>
      <div className="pila riempi">
        <Pannello senzaMargine><Binario tappe={d.fasi} /></Pannello>
        <Schede riempi memoria={daVariazioni ? undefined : 'pratica-' + d.id} attiva={daVariazioni ? 'righe' : undefined} schede={[
          { id: 'riepilogo', etichetta: 'Riepilogo', contenuto: riepilogo },
          {
            id: 'righe', etichetta: 'Righe a confronto',
            conta: variazioni.numero ? variazioni.numero + (variazioni.numero === 1 ? ' variazione' : ' variazioni') : righe.length,
            contaVariante: variazioni.numero ? 'errore' : 'neutro', contenuto: schedaRighe,
          },
        ]} />
      </div>
      {finestra}
    </Pagina>
  );
}

/* ---------- Documenti affiancati: PDF a sinistra, dati a destra (§7.3) ---------- */

function Visualizzatore({ docs, iniziale, onChiudi }: { docs: Documento[]; iniziale: Documento; onChiudi: () => void }) {
  const [cur, setCur] = useState(iniziale);
  const src = '/api/documenti/' + cur.arrivo_id + '/file';
  return (
    <Modale larga titolo="Documenti della pratica" onChiudi={onChiudi}
      testo="A sinistra il PDF originale, a destra i dati del documento.">
      <div className="aff-schede" role="tablist" aria-label="Documenti con PDF">
        {docs.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === cur.id} onClick={() => setCur(x)}>
            {TIPO[x.tipo]}<span>{x.numero}</span>
          </button>
        ))}
      </div>
      <div className="colonne pari" style={{ alignItems: 'start' }}>
        <object data={src} type="application/pdf" aria-label={'PDF di ' + cur.numero}
          style={{ width: '100%', height: '430px', border: 0, borderRadius: 8, background: '#f1f3f5' }}>
          <p>Il browser non mostra il PDF qui. <a href={src} target="_blank" rel="noreferrer">Apri il PDF in una scheda</a>.</p>
        </object>
        <div className="pila">
          <Dettagli inColonne voci={[
            { etichetta: 'Tipo', valore: TIPO[cur.tipo] },
            { etichetta: 'Numero', valore: cur.numero },
            { etichetta: 'Data', valore: dataIt(cur.data) },
            { etichetta: 'Importo', valore: euro(cur.importo) },
            ...(cur.tipo === 'fattura' ? [{ etichetta: 'Residuo', valore: euro(cur.residuo ?? 0) }] : []),
          ]} />
          {cur.note && <Nota>{cur.note}</Nota>}
          <p><a href={src} target="_blank" rel="noreferrer">Apri il PDF in una scheda</a></p>
        </div>
      </div>
    </Modale>
  );
}

/* ---------- Registra fattura / nota di credito, correggi (F2-A3, §4.2.7.1) ---------- */

function FinestraDocumento({ pratica, documento, tipo, fatture, onChiudi, onSalvato }: {
  pratica: string; documento: Documento | null; tipo: 'fattura' | 'nota_credito';
  fatture: Documento[]; onChiudi: () => void; onSalvato: (f: Fiscali) => void | Promise<void>;
}) {
  const id = useId();
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [arrivoId, setArrivoId] = useState<number | null>(null);
  const modifica = !!documento;

  async function invia(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const testo = (k: string) => String(fd.get(k) ?? '').trim();
    const numero = testo('numero'), data = testo('data');
    const importo = testo('importo').replace(',', '.');
    const note = testo('note');
    setErrore('');
    setAttesa(true);
    try {
      let arrivo = arrivoId;
      if (!modifica && file && !arrivo) {
        const c = await caricaPdf(file);
        if (!c.ok) { setErrore(c.messaggio); return; }
        arrivo = Number(c.dati.id);
        setArrivoId(arrivo);
      }
      const corpo: Record<string, unknown> = { numero, data, note: note || (modifica ? null : undefined) };
      if (importo) corpo.importo = Number(importo);
      if (!modifica) corpo.tipo = tipo;
      if (tipo === 'nota_credito' && !modifica) {
        corpo.fattura_id = Number(testo('fattura_id'));
        corpo.storno_totale = fd.get('storno_totale') === 'on';
      }
      if (arrivo) corpo.arrivo_id = arrivo;
      const r = modifica
        ? await api<Fiscali>('pratiche/' + pratica + '/documenti/' + documento.id, corpo, 'PUT')
        : await api<Fiscali>('pratiche/' + pratica + '/documenti', corpo);
      if (!r.ok) { setErrore(r.messaggio); return; }
      await onSalvato(r.dati);
    } finally {
      setAttesa(false);
    }
  }

  const titolo = modifica ? 'Correggi ' + TIPO[tipo].toLowerCase() + ' ' + documento.numero
    : tipo === 'fattura' ? 'Registra la fattura' : 'Registra la nota di credito';

  return (
    <Modale titolo={titolo} onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
      <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
      <button type="submit" form={id} className="btn" disabled={attesa}>{attesa ? 'Attendi…' : modifica ? 'Salva' : 'Registra'}</button>
    </>}>
      <form id={id} className="modulo modulo-2" onSubmit={invia} noValidate>
        {!modifica && tipo === 'nota_credito' && (
          <Campo nome="fattura_id" etichetta="Fattura stornata" tipo="select" largo valore={fatture[0]?.id}
            opzioni={fatture.map((f) => ({ value: f.id, label: f.numero + ' del ' + dataIt(f.data) + ' · residuo ' + euro(f.residuo ?? 0) }))} />
        )}
        <Campo nome="numero" etichetta="Numero" valore={documento?.numero ?? ''} />
        <Campo nome="data" etichetta="Data" tipo="data" valore={documento?.data ?? oggi()} />
        <Campo nome="importo" etichetta="Importo in €" valore={documento ? String(Math.abs(documento.importo)) : ''}
          aiuto={tipo === 'nota_credito' ? 'Positivo: il server lo registra come storno.' : 'Lordo della fattura.'} />
        {!modifica && tipo === 'nota_credito' && (
          <Campo nome="storno_totale" etichetta="Storna tutta la fattura" tipo="casella" largo
            aiuto="L'importo lo calcola il server su quello che resta da stornare." />
        )}
        <Campo nome="note" etichetta="Note" valore={documento?.note ?? ''} largo />
        {!modifica && (
          <div className="campo largo">
            <label>PDF (facoltativo)</label>
            <Caricamento titolo="Allega il PDF" testo="Un file PDF; il server controlla che sia un PDF."
              accetta="application/pdf,.pdf" onFile={(f) => { setFile(f[0] ?? null); setArrivoId(null); }} />
            {file && <span className="aiuto">{file.name}</span>}
          </div>
        )}
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
    </Modale>
  );
}
