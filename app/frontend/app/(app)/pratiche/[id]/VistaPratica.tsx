'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Campo } from '@/componenti/Campo';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { Binario, Caricamento, Elenco } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { Cifre } from '@/componenti/Kpi';
import { Conferma, Modale } from '@/componenti/Modale';
import { ConfermaGrave } from '@/componenti/ConfermaGrave';
import { AzioniRiga, type AzioneRiga } from '@/componenti/AzioniRiga';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { SollecitiConferme, SollecitiPagamento } from '@/componenti/Solleciti';
import { usePuo } from '@/componenti/Utente';
import { ConsultaDocumenti } from '@/componenti/ConsultaDocumenti';
import { Copiabile } from '@/componenti/Copiabile';
import { api, caricaPdf } from '@/lib/api';
import type { Entita } from '@/lib/entita';
import { data as dataIt, euro, euroSegno, oggi, pct } from '@/lib/formati';

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
  imponibile: number; netto: number; spese: number; congelato: string | null;
  sconto: number; valido_dal: string; agente: number; sub_standard: number;
  sub: number; eccezione: boolean; da_fornitore: number; a_decobrands: number; a_subagente: number;
  margine: number; margine_pct: number; maturazione: string | null; regole: string[];
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
  numero_ordine_fornitore: string | null;
  cliente_id: string; cliente: string; fornitore_id: string; fornitore: string;
  subagente_id: string | null; subagente: string | null;
  data: string; importo: number; stato: Chiave; nota: string | null; scadenza: string | null;
  pagato: boolean;
  pagamenti: { id: string; numero: string; data: string; importo: number }[];
  fasi: Tappa[];
  progresso: { x: number; y: number; parziale: boolean } | null;
  confronto: { fasi: FaseRiga[]; righe: Riga[]; variazioni: { numero: number; totale: number } };
  provvigione: Provvigione | null;
  sconto_medio: { valore: number; scaglione: number | null; documento: string | null; oltre: boolean; ultimo_scaglione: number | null } | null;
  azione: { tipo: string; testo: string };
  incassi: Incasso[];
}
interface Documento {
  id: string; tipo: Tipo; numero: string; data: string; importo: number;
  storno_totale?: boolean; fattura_id?: string | null; stornato?: number; residuo?: number;
  arrivo_id: string | null; file_nome: string | null; stato_incasso?: string | null;
  liquidato?: boolean; note: string | null;
  ruolo?: 'parziale' | 'sostituisce' | null; superato?: boolean; superato_da?: string | null;
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
// D-171, D-172: anche gli elenchi non DataTable (Elenco, incassi) hanno le azioni a icone in slot fissi
const AZIONI_FISCALE: AzioneRiga[] = [
  { nome: 'correggi', icona: 'matita', etichetta: 'Correggi' },
  { nome: 'annulla', icona: 'cestino', etichetta: 'Annulla', variante: 'pericolo' },
  { nome: 'sposta', icona: 'sposta', etichetta: 'Sposta' },
];
const AZIONI_ALTRO: AzioneRiga[] = [{ nome: 'sposta', icona: 'sposta', etichetta: 'Sposta' }];
const AZIONI_INCASSO: AzioneRiga[] = [
  { nome: 'sollecita', icona: 'posta', etichetta: 'Sollecita' },
  { nome: 'pagata', icona: 'spunta', etichetta: 'Segna come pagata' },
  { nome: 'nonpagata', icona: 'avviso', etichetta: 'Segna come non pagata' },
];
// D-60: i tipi che si registrano a mano dalla tendina, oltre a fattura e nota di credito
const ALTRI: Tipo[] = ['ordine', 'conferma', 'proforma', 'pagamento', 'altro'];

// «Prendi dalla coda» (D-186 §19): un documento in coda compatibile con la pratica, come lo restituisce l'elenco.
interface DocumentoInCoda {
  id: string; tipo: Tipo | null; numero: string | null; data: string | null;
  importo: number | null; file_nome: string; cliente_id: string | null; stato: string;
}

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
      coda={{ fornitore: d!.fornitore_id, cliente: d!.cliente_id, tipo }}
      onChiudi={chiudi} onSalvato={(f) => salvato(f, tipo === 'fattura' ? 'Fattura registrata' : 'Nota di credito registrata')} />);
  }

  // D-60 §19: ordini, conferme, proforma, pagamenti e allegati si registrano a mano scegliendo il tipo
  function registraAltro() {
    setFinestra(<FinestraDocumento pratica={id} documento={null} tipo="altro" scelta={ALTRI} fatture={[]}
      coda={{ fornitore: d!.fornitore_id, cliente: d!.cliente_id }}
      onChiudi={chiudi} onSalvato={(f) => salvato(f, 'Documento registrato')} />);
  }

  // D-60 §19: il documento passa in un'altra pratica dello stesso fornitore; le regole le applica il server
  function sposta(doc: Documento) {
    setFinestra(<SpostaDocumento pratica={id} fornitore={d!.fornitore_id} documento={doc}
      onChiudi={chiudi} onFatto={async (testo) => { avviso(testo); chiudi(); await carica(); }} />);
  }

  async function annulla(doc: Documento) {
    const si = await new Promise<boolean>((ok) => setFinestra(
      <ConfermaGrave titolo={'Annullare la ' + (doc.tipo === 'fattura' ? 'fattura' : 'nota di credito') + ' ' + doc.numero + '?'}
        punti={['Il documento viene tolto dalla pratica.', 'Se aveva un file, torna fra i documenti da controllare.']}
        etichettaCasella="Ho capito: il documento esce dalla pratica"
        etichetta="Annulla il documento" onRisposta={(x) => { chiudi(); ok(x); }} />,
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
        {x.liquidato ? <Stato v="neutro">liquidato</Stato> : puoModifica && (
          <AzioniRiga azioni={AZIONI_FISCALE} oggetto={(x.tipo === 'fattura' ? 'la fattura ' : 'la nota di credito ') + x.numero}
            riga={[
              { nome: 'correggi', onClick: () => correggi(x) },
              { nome: 'annulla', onClick: () => void annulla(x) },
              { nome: 'sposta', onClick: () => sposta(x) },
            ]} />
        )}
      </span>,
    }))} vuoto="Nessun documento fiscale" />
  );

  // D-60: ordini, conferme, proforma, pagamenti e allegati; fuori dal netto e dalla provvigione
  const altri = (
    <Elenco voci={fiscali.altri.map((x) => ({
      onClick: () => apriDoc(x),
      titolo: 'Apri ' + TIPO[x.tipo].toLowerCase() + ' ' + x.numero + ' accanto al confronto',
      testo: <span className={x.superato ? 'testo-tenue' : undefined}>
        <b>{x.numero || TIPO[x.tipo]}</b>
        <span className="sec-riga">
          {x.numero ? TIPO[x.tipo] + ' del ' : ''}{dataIt(x.data)}
          {x.superato ? ' · superata da ' + (x.superato_da ?? 'un’altra') : ''}{x.note ? ' · ' + x.note : ''}
        </span>
      </span>,
      destra: <span className="azioni-cella">
        {euro(x.importo)}
        {puoModifica && <AzioniRiga azioni={AZIONI_ALTRO} oggetto={'il documento ' + (x.numero || TIPO[x.tipo])}
          riga={[{ nome: 'sposta', onClick: () => sposta(x) }]} />}
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
              {d.sconto_medio?.oltre && (
                <div className="avviso-verifica">
                  <span>Lo sconto medio {pct(d.sconto_medio.valore)} del documento che comanda supera l&apos;ultimo scaglione ({pct(d.sconto_medio.ultimo_scaglione ?? 0)}): la provvigione è <b>da decidere</b>. Aggiungi lo scaglione in{' '}
                    <Link href={'/fornitori/' + d.fornitore_id + '?scheda=percentuali'}>percentuali del fornitore</Link>.</span>
                </div>
              )}
              {!d.provvigione ? <Nota>{d.sconto_medio?.oltre ? 'Provvigione da decidere: sconto medio oltre l\'ultimo scaglione.' : 'Nessun abbinamento cliente × fornitore: la pratica non genera provvigioni.'}</Nota> : <>
                <Cifre voci={[
                  {
                    etichetta: 'Base provvigione', valore: d.provvigione.imponibile,
                    nota: d.provvigione.spese > 0 ? <>netto {euro(d.provvigione.netto)} − spese {euro(d.provvigione.spese)} (escluse per accordo col fornitore)</> : undefined,
                  },
                  {
                    etichetta: 'Sconto medio → scaglione', valore: (d.sconto_medio?.valore != null ? pct(d.sconto_medio.valore) + ' → ' + pct(d.sconto_medio.scaglione ?? 0) : pct(d.provvigione.sconto)),
                    nota: <>in vigore dal {dataIt(d.provvigione.valido_dal)} · <Link href={'/fornitori/' + d.fornitore_id + '?scheda=percentuali'}>percentuali del fornitore</Link>
                      {d.provvigione.congelato ? <><span className="testo-tenue"> · fissato il {dataIt(d.provvigione.congelato)}</span></> : null}</>,
                  },
                  { etichetta: 'Da ' + d.fornitore + ' a Decobrands: ' + pct(d.provvigione.agente), valore: d.provvigione.a_decobrands },
                  {
                    etichetta: 'di cui al subagente ' + (d.subagente ?? '') + ': ' + pct(d.provvigione.sub) + (d.provvigione.eccezione ? ' (eccezione personale)' : ''),
                    valore: d.provvigione.a_subagente,
                    nota: d.provvigione.regole.length ? d.provvigione.regole.join(' · ') : undefined,
                  },
                  { etichetta: 'Margine Decobrands: ' + pct(d.provvigione.margine_pct), valore: d.provvigione.margine },
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
                          <AzioniRiga azioni={AZIONI_INCASSO} oggetto={'la fattura ' + x.numero}
                            riga={[
                              ...((st.stato === 'insoluta' || st.stato === 'da_verificare') ? [
                                { nome: 'sollecita', onClick: () => sollecita(x) },
                                { nome: 'pagata', onClick: () => void segnaPagata(x) },
                              ] : []),
                              ...(st.stato !== 'pagata' && st.stato !== 'insoluta' && st.stato !== 'da_verificare' ? [
                                { nome: 'nonpagata', onClick: () => segnaNonPagata(x) },
                              ] : []),
                            ]} />
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

  // D-180 §19: tutti gli ordini della pratica, dalla fase «Ordini» del server (la testata ne dava uno solo);
  // la riga cliente · fornitore · subagente va sempre a capo, su una riga sua.
  const ordini = [...new Set([d.numero_ordine_fornitore, ...(d.fasi[0]?.numeri ?? [])].filter((n): n is string => !!n && n !== d.numero))];
  return (
    <Pagina pieno titolo={d.numero} badge={<><Stato v={s.v}>{s.testo}</Stato><Copiabile valore={d.numero} /></>}
      sottotitolo={<>
        {ordini.length ? <div>{ordini.length > 1 ? 'Ordini' : 'Ordine'} fornitore {ordini.map((n) => <span key={n}><b>{n}</b><Copiabile valore={n} />{' '}</span>)}</div> : null}
        <div><Link href={'/clienti/' + d.cliente_id}>{d.cliente}</Link> · <Link href={'/fornitori/' + d.fornitore_id}>{d.fornitore}</Link>{d.subagente_id ? <> · seguita da <Link href={'/subagenti/' + d.subagente_id}>{d.subagente}</Link></> : ' · nessun subagente abbinato'}</div>
      </>}
      azioni={azioni}>
      <div className="pila riempi">
        <Pannello senzaMargine>
          {d.progresso && <p className="nota" style={{ padding: '14px 18px 0' }}>Confermato <b>{euro(d.progresso.x)}</b> di {euro(d.progresso.y)}{d.progresso.parziale ? ' · confermato in parte' : ''}</p>}
          <Binario tappe={d.fasi} />
        </Pannello>
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

function FinestraDocumento({ pratica, documento, tipo, fatture, scelta, coda, onChiudi, onSalvato }: {
  pratica: string; documento: Documento | null; tipo: Tipo;
  fatture: Documento[]; scelta?: Tipo[]; // tipi fra cui scegliere (registrazione a mano, D-60)
  coda?: { fornitore: string; cliente: string; tipo?: Tipo }; // «Prendi dalla coda» (D-186 §19); `tipo` filtra l'elenco
  onChiudi: () => void; onSalvato: (f: Fiscali) => void | Promise<void>;
}) {
  const id = useId();
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [arrivoId, setArrivoId] = useState<number | null>(null);
  const [multi, setMulti] = useState<{ messaggio: string; corpo: Record<string, unknown> } | null>(null);
  const modifica = !!documento;
  // «Prendi dalla coda»: i documenti compatibili e la scelta fra coda e mano (predefinita sulla coda se ce n'è uno)
  const [modo, setModo] = useState<'coda' | 'mano'>('coda');
  const [codaDocs, setCodaDocs] = useState<DocumentoInCoda[] | null>(null);
  const [scelto, setScelto] = useState<string | null>(null);
  const [fatturaSel, setFatturaSel] = useState<string>('');

  useEffect(() => {
    if (!coda) return;
    void api<{ documenti: DocumentoInCoda[] }>(`documenti?stato=aperte&fornitore_id=${coda.fornitore}&per_pagina=200`).then((r) => {
      if (!r.ok) { setErrore(r.messaggio); setCodaDocs([]); return; }
      // stesso fornitore; fra questi, il cliente riconosciuto uguale alla pratica o nessun cliente riconosciuto
      const tutto = r.dati.documenti.filter((x) => x.stato !== 'in_lettura' && (!x.cliente_id || x.cliente_id === coda.cliente));
      setCodaDocs(tutto);
      // predefinito sulla coda solo se c'è un documento del tipo giusto (il tipo incerto non si può ancora abbinare)
      setModo(tutto.some((x) => !coda.tipo || x.tipo === coda.tipo) ? 'coda' : 'mano');
    });
  }, [coda]);

  async function abbinaDaCoda() {
    if (!scelto) return;
    setErrore('');
    setAttesa(true);
    try {
      // il server ricava tipo, numero, data e importo dal file letto e ricontrolla fornitore e cliente (V12);
      // per la nota di credito si indica la fattura da stornare, come nel flusso a mano
      const corpo: Record<string, unknown> = { pratica_id: Number(pratica) };
      if (tipo === 'nota_credito') corpo.fattura_id = Number(fatturaSel || fatture[0]?.id);
      const r = await api<Fiscali>('documenti/' + scelto + '/abbina', corpo);
      if (!r.ok) { setErrore(r.messaggio); return; }
      await onSalvato(r.dati);
    } finally {
      setAttesa(false);
    }
  }

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

  // «Prendi dalla coda»: il cliente riconosciuto uguale alla pratica sopra, gli altri sotto (stesso fornitore);
  // con `coda.tipo` l'elenco si filtra per tipo, e i documenti col tipo incerto vanno in fondo («tipo da verificare»)
  const inCoda = !!coda && modo === 'coda';
  const delTipo = (x: DocumentoInCoda) => !coda?.tipo || x.tipo === coda.tipo;
  const riconosciuti = (codaDocs ?? []).filter((x) => x.cliente_id === (coda?.cliente ?? '') && delTipo(x));
  const nonRiconosciuti = (codaDocs ?? []).filter((x) => !x.cliente_id && delTipo(x));
  const daVerificare = (codaDocs ?? []).filter((x) => !!coda?.tipo && x.tipo == null);
  const sceltoDoc = (codaDocs ?? []).find((x) => x.id === scelto) ?? null;
  const voce = (x: DocumentoInCoda) => {
    const numero = x.numero || (x.tipo === 'pagamento' ? 'Pagamento del ' + dataIt(x.data) : x.file_nome);
    return {
      onClick: () => setScelto(x.id),
      titolo: 'Scegli ' + (x.numero || x.file_nome),
      testo: <>
        <b>{numero}</b>
        <span className="sec-riga">
          {x.tipo ? TIPO[x.tipo] + ' · ' : ''}{x.data ? dataIt(x.data) : '—'}{x.file_nome ? ' · ' + x.file_nome : ''}
        </span>
      </>,
      destra: x.importo != null ? euro(x.importo) : null,
    };
  };

  return (
    <>
      <Modale titolo={titolo} onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        {inCoda
          ? <button type="button" className="btn" disabled={attesa || !scelto} onClick={() => void abbinaDaCoda()}>{attesa ? 'Attendi…' : 'Abbina alla pratica'}</button>
          : <button type="submit" form={id} className="btn" disabled={attesa}>{attesa ? 'Attendi…' : modifica ? 'Salva' : 'Registra'}</button>}
      </>}>
        {coda && (
          <div className="segmenti" role="radiogroup" aria-label="Origine del documento">
            <button type="button" role="radio" aria-checked={modo === 'coda'} aria-selected={modo === 'coda'} onClick={() => setModo('coda')}>Prendi dalla coda</button>
            <button type="button" role="radio" aria-checked={modo === 'mano'} aria-selected={modo === 'mano'} onClick={() => setModo('mano')}>Inserisci a mano</button>
          </div>
        )}
        {inCoda ? (
          <div className="pila">
            {codaDocs == null
              ? <Nota>Caricamento dei documenti in coda…</Nota>
              : !(riconosciuti.length + nonRiconosciuti.length + daVerificare.length)
                ? <Nota>Nessun documento in coda per questo fornitore e cliente: registralo a mano.</Nota>
                : <>
                  {!!riconosciuti.length && <Elenco voci={riconosciuti.map(voce)} vuoto="" />}
                  {!!nonRiconosciuti.length && (
                    <>
                      <Nota><b>Cliente non riconosciuto</b> — stesso fornitore, cliente da decidere in Documenti.</Nota>
                      <Elenco voci={nonRiconosciuti.map(voce)} vuoto="" />
                    </>
                  )}
                  {!!daVerificare.length && (
                    <>
                      <Nota><b>Tipo da verificare</b> — il lettore non ha deciso il tipo: aprilo in Documenti.</Nota>
                      <Elenco voci={daVerificare.map(voce)} vuoto="" />
                    </>
                  )}
                </>}
            {sceltoDoc && (
              <Dettagli inColonne voci={[
                { etichetta: 'Tipo', valore: sceltoDoc.tipo ? TIPO[sceltoDoc.tipo] : '—' },
                { etichetta: 'Numero', valore: sceltoDoc.numero || '—' },
                { etichetta: 'Data', valore: sceltoDoc.data ? dataIt(sceltoDoc.data) : '—' },
                { etichetta: 'Importo', valore: sceltoDoc.importo != null ? euro(sceltoDoc.importo) : '—' },
                { etichetta: 'File', valore: sceltoDoc.file_nome },
              ]} />
            )}
            {tipo === 'nota_credito' && sceltoDoc && (
              <Campo nome="fattura_id" etichetta="Fattura stornata" tipo="select" largo valore={fatturaSel || fatture[0]?.id}
                opzioni={fatture.map((f) => ({ value: f.id, label: f.numero + ' del ' + dataIt(f.data) + ' · residuo ' + euro(f.residuo ?? 0) }))}
                onCambia={setFatturaSel} />
            )}
            <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
          </div>
        ) : (
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
        )}
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
