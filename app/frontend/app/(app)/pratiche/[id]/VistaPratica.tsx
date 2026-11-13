'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Campo } from '@/componenti/Campo';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { Binario, Caricamento, Elenco } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { Cifre } from '@/componenti/Kpi';
import { Conferma, Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { SollecitiConferme, SollecitiPagamento } from '@/componenti/Solleciti';
import { usePuo } from '@/componenti/Utente';
import { ConsultaDocumenti } from '@/componenti/ConsultaDocumenti';
import { api, caricaPdf } from '@/lib/api';
import type { Entita } from '@/lib/entita';
import { data as dataIt, euro, euroSegno, pct } from '@/lib/formati';

// Dettaglio pratica (F2-A2, §7.3): binario, riepilogo della provvigione, righe a confronto e
// documenti fiscali. Stato, importi, variazioni e provvigioni arrivano già calcolati dal server
// (V12, D-28); qui si compone soltanto.

type Chiave = 'scaduta' | 'attesa' | 'confermata' | 'fatturata';
type Tipo = 'ordine' | 'conferma' | 'proforma' | 'fattura' | 'nota_credito' | 'pagamento' | 'altro';
interface Tappa {
  titolo: string; fatta?: boolean; ritardo?: boolean; numero?: string; numeri?: string[]; data?: string;
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
interface Incasso {
  documento_id: string; numero: string; data: string; importo: number;
  stato: {
    stato: string; dal: string | null; bollettino_id: string | null; manuale: boolean; nota: string | null;
    giorni: number; limite: number; solleciti: number; sollecitata_il: string | null;
  } | null;
}
interface Dettaglio {
  id: string; numero: string;
  cliente_id: string; cliente: string; fornitore_id: string; fornitore: string;
  subagente_id: string | null; subagente: string | null;
  data: string; importo: number; stato: Chiave; nota: string | null; scadenza: string | null;
  pagato: boolean;
  pagamenti: { id: string; numero: string; data: string; importo: number }[];
  fasi: Tappa[];
  confronto: { fasi: FaseRiga[]; righe: Riga[]; variazioni: { numero: number; totale: number } };
  provvigione: Provvigione | null;
  azione: { tipo: string; testo: string };
  incassi: Incasso[];
}
interface Documento {
  id: string; tipo: Tipo; numero: string; data: string; importo: number;
  storno_totale?: boolean; fattura_id?: string | null; stornato?: number; residuo?: number;
  arrivo_id: string | null; file_nome: string | null; stato_incasso?: string | null;
  liquidato?: boolean; note: string | null;
  righe: { codice: string | null; descrizione: string | null; quantita: number | null; prezzo: number | null; importo: number | null }[];
  riferimento: string | null;
}
interface Fiscali {
  pratica: { id: string; numero: string; stato: string; importo: number };
  altri: Documento[];
  documenti: Documento[];
  totali: { fatture: number; note_credito: number; netto: number };
}

// D-60 §19: le pratiche dello stesso fornitore fra cui spostare un documento. Servono al campo di
// ricerca della finestra Sposta, a selezione singola come nel prototipo; le cerca il server.
const PRATICA: Entita = {
  titolo: 'Pratica',
  voci: async (ctx) => {
    if (!ctx.fornitore_id) return [];
    const r = await api<Record<string, unknown>[]>('pratiche/cerca?fornitore_id=' + String(ctx.fornitore_id));
    return r.ok ? r.dati : [];
  },
  chiave: (p) => p.id,
  testo: (p) => p.numero,
  dettaglio: (p) => p.cliente + ' · ' + p.fornitore + ' · ' + p.stato,
  cerca: (p) => p.cliente + ' ' + p.numero,
  colonne: [
    { key: 'numero', header: 'Pratica' },
    { key: 'cliente', header: 'Cliente', grow: true },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'stato', header: 'Stato' },
  ],
};

const ETICHETTA: Record<Chiave, { testo: string; v: Variante }> = {
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
};
// Stati d'incasso della fattura (§5.14): il server dice quale, qui si mostra l'etichetta
const INCASSO: Record<string, { testo: string; v: Variante }> = {
  pagata: { testo: 'Pagata', v: 'ok' },
  insoluta: { testo: 'Non pagata', v: 'errore' },
  da_verificare: { testo: 'Incasso da verificare', v: 'attesa' },
  da_incassare: { testo: 'In attesa di incasso', v: 'neutro' },
};
const TIPO: Record<Tipo, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento',
};
// D-60: i tipi che si registrano a mano dalla tendina, oltre a fattura e nota di credito
const ALTRI: Tipo[] = ['ordine', 'conferma', 'proforma', 'pagamento', 'altro'];
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
  const [scheda, setScheda] = useState('');
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

  // Incasso del cliente (§5.14): sollecito, oppure segnalazione del fornitore (pagata / non pagata)
  function sollecita(doc: Incasso) {
    setFinestra(<SollecitiPagamento clienteId={d!.cliente_id} onChiudi={chiudi} onCopiato={() => void carica()} />);
  }
  async function segnaPagata(doc: Incasso) {
    const r = await api('documenti/' + doc.documento_id + '/incasso', { stato: 'pagata' }, 'PUT');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Fattura ' + doc.numero + ' segnata come pagata');
    chiudi();
    await carica();
  }
  function segnaNonPagata(doc: Incasso) {
    setFinestra(<FormModal
      titolo={'Fattura ' + doc.numero + ' non pagata'}
      testo="Il fornitore segnala che il cliente non ha pagato. La fattura passa fra i pagamenti da sollecitare."
      conferma="Segna come non pagata"
      campi={[{ nome: 'nota', etichetta: 'Nota', valore: '', largo: true, aiuto: 'es. email di ' + d!.fornitore + ' del …' }]}
      onChiudi={chiudi}
      onConferma={async (v) => {
        const r = await api('documenti/' + doc.documento_id + '/incasso',
          { stato: 'insoluta', ...(v.nota?.trim() ? { nota: v.nota.trim() } : {}) }, 'PUT');
        if (!r.ok) return r.messaggio;
        avviso('Fattura ' + doc.numero + ' fra i pagamenti da sollecitare');
        chiudi();
        await carica();
      }}
    />);
  }

  function apriDoc(doc?: Documento, codice?: string) {
    // D-60: nel visualizzatore ci sono le schede di tutti i documenti della pratica, fiscali e non;
    // il file c'è solo per quelli arrivati dal canale comune, gli altri si confrontano lo stesso
    const docs = [...(fiscali?.altri ?? []), ...(fiscali?.documenti ?? [])].sort((a, b) => Number(a.id) - Number(b.id));
    if (!docs.length) return;
    setFinestra(<ConsultaDocumenti docs={docs} iniziale={doc ?? docs[0]} codiceIniziale={codice}
      pratica={{ numero: d!.numero, cliente: d!.cliente, fornitore: d!.fornitore }} onChiudi={chiudi} />);
  }

  /** Il documento dell'ultima fase (di norma la fattura): quello che si apre cliccando una riga a confronto. */
  function ultimoDocumento() {
    const tutti = [...(fiscali?.altri ?? []), ...(fiscali?.documenti ?? [])];
    const tipo = d!.confronto.fasi[d!.confronto.fasi.length - 1]?.tipo;
    const delTipo = tipo ? tutti.filter((x) => x.tipo === tipo) : [];
    return (delTipo.length ? delTipo : tutti).sort((a, b) => Number(a.id) - Number(b.id)).pop();
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

  // D-60 §19: ordini, conferme, proforma, pagamenti e allegati si registrano a mano scegliendo il tipo
  function registraAltro() {
    setFinestra(<FinestraDocumento pratica={id} documento={null} tipo="altro" scelta={ALTRI} fatture={[]}
      onChiudi={chiudi} onSalvato={(f) => salvato(f, 'Documento registrato')} />);
  }

  // D-60 §19: il documento passa in un'altra pratica dello stesso fornitore; le regole le applica il server
  function sposta(doc: Documento) {
    setFinestra(<SpostaDocumento pratica={id} fornitore={d!.fornitore_id} documento={doc}
      onChiudi={chiudi} onFatto={async (testo) => { avviso(testo); chiudi(); await carica(); }} />);
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
  const vediRighe = () => setScheda('righe');

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

  // D-60: fatture e note di credito; il netto è fatture − note di credito (lo calcola il server)
  const fiscaliElenco = (
    <Elenco voci={fiscali.documenti.map((x) => ({
      onClick: () => apriDoc(x),
      titolo: 'Apri ' + TIPO[x.tipo].toLowerCase() + ' ' + x.numero + ' accanto al confronto',
      testo: <>
        <b>{x.numero}</b>
        <span className="sec-riga">
          {TIPO[x.tipo]} del {dataIt(x.data)}{x.residuo != null ? ' · residuo ' + euro(x.residuo) : ''}{x.note ? ' · ' + x.note : ''}
        </span>
      </>,
      destra: <span className="azioni-cella">
        {euro(x.importo)}
        {x.liquidato ? <Stato v="neutro">liquidato</Stato> : <>
          {puoModifica && <button type="button" className="btn testo piccolo" onClick={() => correggi(x)}>Correggi</button>}
          {puoModifica && <button type="button" className="btn testo piccolo" onClick={() => void annulla(x)}>Annulla</button>}
          {puoModifica && <button type="button" className="btn testo piccolo" onClick={() => sposta(x)}>Sposta</button>}
        </>}
      </span>,
    }))} vuoto="Nessun documento fiscale" />
  );

  // D-60: ordini, conferme, proforma, pagamenti e allegati; fuori dal netto e dalla provvigione
  const altri = (
    <Elenco voci={fiscali.altri.map((x) => ({
      onClick: () => apriDoc(x),
      titolo: 'Apri ' + TIPO[x.tipo].toLowerCase() + ' ' + x.numero + ' accanto al confronto',
      testo: <>
        <b>{x.numero || TIPO[x.tipo]}</b>
        <span className="sec-riga">
          {x.numero ? TIPO[x.tipo] + ' del ' : ''}{dataIt(x.data)}{x.note ? ' · ' + x.note : ''}
        </span>
      </>,
      destra: <span className="azioni-cella">
        {euro(x.importo)}
        {puoModifica && <button type="button" className="btn testo piccolo" onClick={() => sposta(x)}>Sposta</button>}
      </span>,
    }))} vuoto="Nessun altro documento" />
  );

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
            {d.pagato && (
              <Pannello titolo="Pagamento del cliente" nota="nessun effetto sulla provvigione">
                <div className="pila">
                  <div><Stato v="ok">Pagato</Stato></div>
                  <Elenco voci={d.pagamenti.map((p) => ({
                    testo: <><b>{p.numero || 'Pagamento'}</b> <span className="testo-tenue">del {dataIt(p.data)}</span></>,
                    destra: euro(p.importo),
                  }))} vuoto="Nessun documento di pagamento" />
                </div>
              </Pannello>
            )}
            {!!d.incassi.length && (
              <Pannello titolo="Incasso del cliente" nota={d.provvigione?.maturazione === 'maturato' ? 'sul maturato' : 'sul fatturato'}>
                {d.incassi.map((x) => {
                  const st = x.stato, info = st ? INCASSO[st.stato] : null;
                  // da dove viene lo stato: bollettino del fornitore o segnalazione a mano (§5.14, D-62)
                  const fonte = st?.manuale ? 'segnalazione del fornitore' + (st.nota ? ' · ' + st.nota : '')
                    : st?.bollettino_id ? 'dal bollettino' + (st.dal ? ' del ' + dataIt(st.dal) : '') : '';
                  return (
                    <div className="incasso-riga" key={x.documento_id}>
                      <div>
                        <b>{x.numero}</b> {info ? <Stato v={info.v}>{info.testo}</Stato> : <Stato v="neutro">Nessuna segnalazione</Stato>}
                        <span className="sec-riga">
                          {fonte}{st?.solleciti ? (fonte ? ' · ' : '') + 'sollecitata ' + st.solleciti + (st.solleciti === 1 ? ' volta' : ' volte') + (st.sollecitata_il ? ', ultima il ' + dataIt(st.sollecitata_il) : '') : ''}
                        </span>
                      </div>
                      {puoModifica && st && (
                        <div className="azioni-cella">
                          {(st.stato === 'insoluta' || st.stato === 'da_verificare') && <>
                            <button type="button" className="btn sec piccolo" onClick={() => sollecita(x)}>Sollecita il cliente</button>
                            <button type="button" className="btn testo piccolo" onClick={() => void segnaPagata(x)}>Segna come pagata</button>
                          </>}
                          {st.stato !== 'pagata' && st.stato !== 'insoluta' && st.stato !== 'da_verificare' && (
                            <button type="button" className="btn testo piccolo" onClick={() => segnaNonPagata(x)}>Segna come non pagata</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Pannello>
            )}
            <Pannello titolo="Documenti fiscali" nota={String(fiscali.documenti.length)} riempi
              azioni={puoModifica ? [
                { etichetta: 'Registra fattura', icona: 'piu', onClick: () => registra('fattura') },
                ...(fatture.length ? [{ etichetta: 'Nota di credito', onClick: () => registra('nota_credito') }] : []),
              ] : []}>
              {fiscaliElenco}
              <div className="dt-piede"><span>Netto {euro(fiscali.totali.netto)}</span></div>
              <Nota>Il netto è fatture − note di credito. Un documento in un bollettino non si cambia: si corregge con una nota di credito.</Nota>
            </Pannello>
            <Pannello titolo="Documenti" nota={String(fiscali.altri.length)}
              azioni={[
                { etichetta: 'Consulta affiancati', icona: 'file', onClick: () => apriDoc(), consentito: true },
                ...(puoModifica ? [{ etichetta: 'Registra un documento', icona: 'piu', onClick: registraAltro }] : []),
              ]}>
              {altri}
              <Nota>Ordini, conferme, proforma, pagamenti e allegati: restano fuori dal netto e dalla provvigione.</Nota>
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
            onRowClick={d.confronto.fasi.length > 1 ? (r) => {
              const ultimo = ultimoDocumento();
              if (ultimo) apriDoc(ultimo, r.codice);
            } : undefined}
            emptyText="Nessuna riga" emptyHint="Il confronto parte quando arriva la conferma." />
        </div>
      </>
    );
  };

  // Testata (§7.3): il sollecito di conferma solo finché la conferma è attesa o in ritardo; la copia
  // non scrive nel database, quindi resta disponibile anche in sola lettura.
  const azioni: Azione[] = [
    ...(d.stato === 'attesa' || d.stato === 'scaduta' ? [{
      etichetta: 'Prepara il sollecito', icona: 'posta', variante: 'sec' as const, consentito: true,
      onClick: () => setFinestra(<SollecitiConferme onChiudi={chiudi} />),
    }] : []),
  ];

  return (
    <Pagina pieno titolo={d.numero} badge={<Stato v={s.v}>{s.testo}</Stato>}
      sottotitolo={<>{d.cliente} · {d.fornitore}{d.subagente ? ' · seguita da ' + d.subagente : ' · nessun subagente abbinato'}</>}
      azioni={azioni}>
      <div className="pila riempi">
        <Pannello senzaMargine><Binario tappe={d.fasi} /></Pannello>
        <Schede riempi memoria={daVariazioni ? undefined : 'pratica-' + d.id} attiva={daVariazioni && !scheda ? 'righe' : scheda || undefined} onCambia={setScheda} schede={[
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

/* ---------- Documenti affiancati: componente condiviso con la pagina Documenti (componenti/ConsultaDocumenti) ---------- */

/* ---------- Registra un documento (D-60) / fattura e nota di credito (F2-A3, §4.2.7.1) ---------- */

function FinestraDocumento({ pratica, documento, tipo, fatture, scelta, onChiudi, onSalvato }: {
  pratica: string; documento: Documento | null; tipo: Tipo;
  fatture: Documento[]; scelta?: Tipo[]; // tipi fra cui scegliere (registrazione a mano, D-60)
  onChiudi: () => void; onSalvato: (f: Fiscali) => void | Promise<void>;
}) {
  const id = useId();
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [arrivoId, setArrivoId] = useState<number | null>(null);
  const [multi, setMulti] = useState<{ messaggio: string; corpo: Record<string, unknown> } | null>(null);
  const modifica = !!documento;

  async function invia(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const testo = (k: string) => String(fd.get(k) ?? '').trim();
    const t = (scelta ? testo('tipo') : tipo) as Tipo;
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
      // il numero vuoto non si manda: il server lo richiede solo per ordine, fattura e nota di credito
      const corpo: Record<string, unknown> = { data, note: note || (modifica ? null : undefined) };
      if (numero) corpo.numero = numero;
      if (importo) corpo.importo = Number(importo);
      if (!modifica) corpo.tipo = t;
      if (t === 'nota_credito' && !modifica) {
        corpo.fattura_id = Number(testo('fattura_id'));
        corpo.storno_totale = fd.get('storno_totale') === 'on';
      }
      if (arrivo) corpo.arrivo_id = arrivo;
      await manda(corpo);
    } finally {
      setAttesa(false);
    }
  }

  async function manda(corpo: Record<string, unknown>, conferma = false) {
    const c = conferma ? { ...corpo, multi_ordine: true } : corpo;
    setErrore('');
    setAttesa(true);
    try {
      const r = modifica
        ? await api<Fiscali>('pratiche/' + pratica + '/documenti/' + documento.id, c, 'PUT')
        : await api<Fiscali>('pratiche/' + pratica + '/documenti', c);
      if (!r.ok) {
        // D-123: la stessa fattura su un'altra pratica chiede la conferma multi-ordine
        if (!modifica && r.stato === 409 && r.messaggio.includes('su più ordini')) { setMulti({ messaggio: r.messaggio, corpo }); return; }
        setErrore(r.messaggio); return;
      }
      await onSalvato(r.dati);
    } finally {
      setAttesa(false);
    }
  }

  const titolo = modifica ? 'Correggi ' + TIPO[tipo].toLowerCase() + ' ' + documento.numero
    : tipo === 'fattura' ? 'Registra la fattura'
      : tipo === 'nota_credito' ? 'Registra la nota di credito' : 'Registra un documento';

  return (
    <>
      <Modale titolo={titolo} onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        <button type="submit" form={id} className="btn" disabled={attesa}>{attesa ? 'Attendi…' : modifica ? 'Salva' : 'Registra'}</button>
      </>}>
        <form id={id} className="modulo modulo-2" onSubmit={invia} noValidate>
          {scelta && (
            <Campo nome="tipo" etichetta="Tipo di documento" tipo="select" largo valore={tipo}
              opzioni={scelta.map((t) => ({ value: t, label: TIPO[t] }))}
              aiuto="Numero e data sono obbligatori solo per l'ordine; per gli altri numero facoltativo, data di oggi." />
          )}
          {!modifica && tipo === 'nota_credito' && (
            <Campo nome="fattura_id" etichetta="Fattura stornata" tipo="select" largo valore={fatture[0]?.id}
              opzioni={fatture.map((f) => ({ value: f.id, label: f.numero + ' del ' + dataIt(f.data) + ' · residuo ' + euro(f.residuo ?? 0) }))} />
          )}
          <Campo nome="numero" etichetta="Numero" valore={documento?.numero ?? ''} />
          <Campo nome="data" etichetta="Data" tipo="data" valore={documento?.data ?? oggi()} />
          <Campo nome="importo" etichetta="Importo in €" valore={documento ? String(Math.abs(documento.importo)) : ''}
            aiuto={scelta ? 'Facoltativo: non tocca il netto né la provvigione.'
              : tipo === 'nota_credito' ? 'Positivo: il server lo registra come storno.' : 'Lordo della fattura.'} />
          {!modifica && tipo === 'nota_credito' && (
            <Campo nome="storno_totale" etichetta="Storna tutta la fattura" tipo="casella" largo
              aiuto="L'importo lo calcola il server su quello che resta da stornare." />
          )}
          <Campo nome="note" etichetta="Note" valore={documento?.note ?? ''} largo />
          {!modifica && (
            <div className="campo largo">
              <label>PDF o foto (facoltativo)</label>
              <Caricamento titolo="Allega il file" testo="Un PDF o una foto (JPEG, PNG); il server controlla che sia un documento."
                accetta="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" onFile={(f) => { setFile(f[0] ?? null); setArrivoId(null); }} />
              {file && <span className="aiuto">{file.name}</span>}
            </div>
          )}
          <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
        </form>
      </Modale>
      {multi && <Conferma titolo={'La ' + TIPO[tipo].toLowerCase() + ' è già su un’altra pratica'} testo={multi.messaggio}
        etichetta="Conferma" onRisposta={(si) => { setMulti(null); if (si) void manda(multi.corpo, true); }} />}
    </>
  );
}

/* ---------- Sposta un documento in un'altra pratica dello stesso fornitore (D-60) ---------- */

function SpostaDocumento({ pratica, fornitore, documento, onChiudi, onFatto }: {
  pratica: string; fornitore: string; documento: Documento;
  onChiudi: () => void; onFatto: (testo: string) => void | Promise<void>;
}) {
  const id = useId();
  const [scelta, setScelta] = useState('');
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  async function invia(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!scelta) return;
    setErrore('');
    setAttesa(true);
    try {
      const r = await api('pratiche/' + pratica + '/documenti/' + documento.id + '/sposta', { pratica_id: Number(scelta) });
      if (!r.ok) { setErrore(r.messaggio); return; } // D-60: il 409 del server (liquidato, bollettino, unico ordine, …) si legge qui
      await onFatto('Documento spostato');
    } finally {
      setAttesa(false);
    }
  }

  return (
    <Modale titolo={'Sposta ' + (documento.numero || TIPO[documento.tipo])}
      testo="Il documento passa a un'altra pratica dello stesso fornitore, con le sue righe e il suo file."
      onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        <button type="submit" form={id} className="btn" disabled={attesa || !scelta}>{attesa ? 'Attendi…' : 'Sposta'}</button>
      </>}>
      <form id={id} className="modulo" onSubmit={invia} noValidate>
        <Campo nome="pratica" etichetta="Pratica di arrivo" tipo="ricerca" entita={PRATICA}
          contesto={{ fornitore_id: fornitore }} valore={scelta} onCambia={setScelta} largo
          aiuto="Solo le pratiche dello stesso fornitore." />
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
    </Modale>
  );
}
