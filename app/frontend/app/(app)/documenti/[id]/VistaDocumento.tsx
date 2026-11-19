'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CampoEuro } from '@/componenti/Campo';
import { CampoRicerca } from '@/componenti/CampoRicerca';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { Scelte, Elenco } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { FormAgenzia, type Agenzia } from '@/componenti/FormAgenzia';
import { FormPercentuali } from '@/componenti/FormPercentuali';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { ConfermaGrave } from '@/componenti/ConfermaGrave';
import { Nota, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { Schede, type Scheda } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { PdfEvidenziato } from '@/componenti/PdfEvidenziato';
import { Copiabile } from '@/componenti/Copiabile';
import { api } from '@/lib/api';
import { cliente as entitaCliente, fornitore as entitaFornitore, type Entita } from '@/lib/entita';
import { data, euro, euroSegno, pct } from '@/lib/formati';

// Documento scelto nella pagina Documenti (F6-A4b, §7.9, D-15): pannello di destra con i dati
// letti, prima l'azione proposta e poi le righe; il file originale sta nella finestra di
// correzione. Azioni, proposta, controlli e affidabilità arrivano dal server (V12, D-28).

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};
// D-204: etichetta del pulsante «Sostituisci» secondo il tipo del documento aggiornato
const SOSTITUISCI_LABEL: Record<string, string> = {
  ordine: 'Sostituisci l’ordine registrato',
  conferma: 'Sostituisci la conferma registrata',
  proforma: 'Sostituisci la proforma registrata',
};
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
// Ugo 15/11/2026: un pagamento non ha un numero; al suo posto «Pagamento del <data> · <importo>» o il nome del file.
const titoloDoc = (tipo: string, numero: string | null, dataDoc: string | null, importo: number | null, fileNome: string) =>
  numero ? `${TIPO[tipo] ?? tipo} ${numero}`
    : dataDoc ? `Pagamento del ${data(dataDoc)}${importo != null ? ' · ' + euro(importo) : ''}`
      : fileNome;
const NOME_CAMPO: Record<string, string> = { numero: 'Numero', numero_ordine_fornitore: 'Ordine fornitore', data: 'Data', codice_cliente: 'Codice cliente', cliente: 'Cliente', piva_cliente: 'P.IVA cliente', piva_fornitore: 'P.IVA fornitore', fornitore: 'Fornitore letto', importo_totale: 'Importo', mese: 'Mese', anno: 'Anno', riferimento_fattura: 'Fattura stornata' };

// D-172 §19: cosa succede davvero a «Rileggi il documento» (dal server documenti.ts `rileggi`):
// torna `in_coda` con i tentativi azzerati e il lettore lo riprende, riscrivendo i campi letti.
const PUNTI_RILEGGI: ReactNode[] = [
  'Il documento torna in coda e viene mandato di nuovo al servizio di lettura.',
  'Tutti i campi letti verranno riscritti, comprese le correzioni fatte a mano; quelle non salvate si perdono.',
  'Fornitore, cliente e abbinamento verranno riconosciuti di nuovo.',
  'La lettura può richiedere qualche minuto: il documento resta in coda finché il servizio non lo riprende.',
];
function ConfermaRileggi({ onRisposta }: { onRisposta: (si: boolean) => void }) {
  return <ConfermaGrave titolo="Rileggere il documento?" punti={PUNTI_RILEGGI}
    etichettaCasella="Ho capito: i dati letti verranno riscritti" etichetta="Rileggi il documento" onRisposta={onRisposta} />;
}
const STATO_PRATICA: Record<string, { testo: string; v: Variante }> = {
  inviato: { testo: 'Attesa conferma', v: 'attesa' },
  confermato: { testo: 'Confermata', v: 'info' },
  fatturato: { testo: 'Fatturata', v: 'ok' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
};
// D-151 §19: le soglie (bordi, «%», conteggio dei punti) arrivano dal server col documento (V12);
// niente soglie fisse nel browser. Il livello del documento resta quello calcolato dal server.
type Soglie = { soglia_ok: number; soglia_bassa: number };

// D-177 §19: stato iniziale del filtro nella ricerca per l'abbinamento, secondo il tipo del documento.
// Ugo 18/11/2026: un pagamento cerca le fatturate senza pagamento («Non pagata»)
const STATO_DAL_TIPO: Record<string, string> = {
  ordine: 'attesa', proforma: 'attesa', conferma: 'attesa',
  fattura: 'confermata', nota_credito: 'fatturata', pagamento: 'non_pagata',
};
// i segmenti del filtro per stato, nella finestra di ricerca: '' = nessun filtro (tutte)
const STATI_ABBUNA = [
  { valore: '', etichetta: 'Tutte' },
  { valore: 'attesa', etichetta: 'Solo ordine' },
  { valore: 'confermata', etichetta: 'Confermata' },
  { valore: 'fatturata', etichetta: 'Fatturata' },
  { valore: 'non_pagata', etichetta: 'Non pagata' },
];
// D-178 §19: filtro per stato delle pratiche suggerite nella scheda «Pratica proposta» (tendina,
// non è un filtro di entità: il server riceve solo la scelta e filtra le candidate, V12)
const STATI_SUGGERITE = [
  { valore: 'aperte', etichetta: 'Aperte' },
  { valore: 'tutte', etichetta: 'Tutte' },
  { valore: 'solo_ordine', etichetta: 'Solo ordine' },
  { valore: 'confermata', etichetta: 'Confermata' },
  { valore: 'fatturata', etichetta: 'Fatturata' },
] as const;
// 15/11/2026: predefinito del filtro delle pratiche suggerite dal tipo (il server fa lo stesso, V12):
// nota di credito e pagamento cercano le pratiche fatturate, gli altri tipi le aperte.
const FILTRO_DAL_TIPO: Record<string, string> = { nota_credito: 'fatturata', pagamento: 'fatturata' };

const PRATICA: Entita = {
  titolo: 'Pratica',
  apriEtichetta: 'Apri la pratica in una nuova scheda',
  voci: async (ctx) => {
    if (!ctx.fornitore_id) return [];
    const p = new URLSearchParams({ fornitore_id: String(ctx.fornitore_id) });
    if (ctx.cliente_id) p.set('cliente_id', String(ctx.cliente_id)); // 15/11/2026: vincolo sul cliente del documento
    if (ctx.stato) p.set('stato', String(ctx.stato)); // D-177 §19: il filtro per stato lo applica il server (V12)
    const r = await api<Record<string, unknown>[]>('pratiche/cerca?' + p.toString());
    return r.ok ? r.dati : [];
  },
  chiave: (p) => p.id,
  testo: (p) => p.numero,
  dettaglio: (p) => p.cliente + ' · ' + data(p.data) + ' · ' + p.stato,
  cerca: (p) => p.cliente + ' ' + p.numero,
  colonne: [
    { key: 'numero', header: 'Pratica' },
    { key: 'cliente', header: 'Cliente', grow: true },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'stato', header: 'Stato' },
    { key: 'importo', header: 'Importo', tipo: 'euro' },
  ],
};

interface Posizione { tipo?: string; pagina?: number; x0?: number; y0?: number; x1?: number; y1?: number }
interface Campo {
  campo: string; valore_letto: string | null; valore_finale: string | null;
  affidabilita: number | null; posizione: Posizione | null; precisione: string | null; verificato: boolean;
}
interface Riga {
  i: number; codice: string | null; descrizione: string | null; quantita: number | null; prezzo: number | null;
  importo: number | null; sconto: number | null; numero_fattura: string | null; data_fattura: string | null; provvigione: number | null;
  spesa?: boolean | null;
}
interface Testata {
  tipo: string | null; numero: string | null; data: string | null; fornitore_id: string | null;
  numero_ordine_fornitore: string | null;
  codice_cliente: string | null; cliente: string | null; cliente_id: string | null; piva_cliente: string | null; piva_fornitore: string | null; fornitore: string | null; importo: number | null;
  mese: number | null; anno: number | null; riferimento_fattura: string | null;
}
interface Controllo { codice: string; campo: string; testo: string; grave: boolean; gruppo: 'lettura' | 'confronto' }
interface Candidato {
  pratica: { id: string; numero: string; cliente: string | null; stato: string; data_ordine: string };
  punteggio: number; motivi: string[]; delta: number;
  ruolo: 'parziale' | 'sostituisce' | null;
}
/** D-152: un soggetto candidato per il documento, dal CRM o da Integra. */
interface CandidatoSoggetto {
  fonte: 'crm' | 'integra'; id: string; ragione_sociale: string | null;
  piva: string | null; citta: string | null; motivo: string;
  punteggio?: number | null;
}
interface Proposta {
  esito: string; candidati: Candidato[]; importo: number;
  abbinamento: { cliente_id: string; cliente: string | null; codice: string | null } | null;
  cliente_riconosciuto: { cliente_id: string; ragione: string | null } | null;
  agenzia_mancante: { cliente_id: string; fornitore_id: string; cliente: string | null; fornitore: string | null; codice_cliente: string | null; data: string | null } | null;
  fornitore_da_integra: { id_integra: number; ragione_sociale: string | null; piva: string | null } | null;
  cliente_da_integra: { id_integra: number | null; ragione_sociale: string | null; piva: string | null; subagente: string | null; sconto: number | null } | null;
  manca_rappresentanza: { cliente: string | null; fornitore: string | null; codice_cliente: string | null } | null;
  candidati_fornitore: CandidatoSoggetto[];
  candidati_cliente: CandidatoSoggetto[];
  integra_non_raggiungibile: boolean;
  pratica_ordine: { pratica: { id: string; numero: string; numero_ordine_fornitore: string; cliente: string | null; cliente_id: string; fornitore: string | null; fornitore_id: string; stato: string; data_ordine: string }; cliente_coincide: boolean | null } | null;
  doppio: { tipo: string; pratica_id: string; pratica_numero: string; documento_id: string; numero: string; data: string; importo: number; righe: number; cliente: string | null } | null;
}
interface Dettaglio {
  id: string; file_nome: string; file_tipo: 'pdf' | 'jpg' | 'png'; stato: string; tipo: string | null;
  livello: string | null; ricevuto_il: string; letto_il: string | null; errore: string | null;
  scaglioni_mancanti: boolean;
  lettura_grezza: boolean;
  fornitore: { id: string; nome: string | null } | null;
  campi: Campo[]; testata: Testata; righe: Riga[]; controlli: Controllo[];
  proposta: Proposta; bollettino: { esiste: boolean } | null;
  // D-126 §19: totali del piede della tabella delle righe dal server, non sommati nel browser (V12)
  totali: { importo: number; provvigione: number };
  soglie: Soglie;
  // D-165: soggetto riconosciuto senza P.IVA e documento con P.IVA valida → suggerimento «Salva la P.IVA»
  piva_da_salvare: { ruolo: 'cliente' | 'fornitore'; soggetto_id: string; ragione_sociale: string; piva: string }[];
  // D-175: corrispondenza codice cliente ↔ cliente associato, calcolata dal server (spunta/avviso)
  codice_cliente_esito: { stato: 'assente' | 'corrisponde' | 'altro_cliente' | 'senza_agenzia' | 'da_confermare'; cliente?: string | null; fornitore?: string | null };
  // ponte di Integra non interrogato o senza risposta: i candidati da importare non sono aggiornati
  integra?: 'non_disponibile' | null;
}

/** Punti da controllare (come M.statoLettura): controlli falliti + campi incerti con un valore. */
function punti(d: Dettaglio) {
  let n = d.controlli.length;
  for (const c of d.campi) {
    if (c.campo === 'tipo' || c.verificato || c.affidabilita == null) continue;
    if (c.affidabilita < d.soglie.soglia_ok && (c.valore_finale ?? c.valore_letto) != null) n++;
  }
  return n;
}

/** Righe con almeno un valore incerto: per il contatore della scheda Righe lette. */
function righeIncerte(d: Dettaglio) {
  const out = new Set<number>();
  for (const c of d.campi) {
    const m = /^righe\[(\d+)\]\./.exec(c.campo);
    if (!m || c.verificato || c.affidabilita == null) continue;
    if (c.affidabilita < d.soglie.soglia_ok && (c.valore_finale ?? c.valore_letto) != null) out.add(Number(m[1]));
  }
  return out;
}

const classeAff = (a: number | null, verificato: boolean, s: Soglie) =>
  a == null ? '' : verificato && a < s.soglia_ok ? 'campo-verificato' : verificato ? '' : a < s.soglia_bassa ? 'incerto-errore' : a < s.soglia_ok ? 'incerto-attesa' : '';

/** D-175: sotto «Codice cliente», spunta verde se il codice è del cliente associato, avviso giallo con il
 *  motivo se no (codice di un altro cliente, senza agenzia, da confermare). Lo stato lo calcola il server. */
function EsitoCodiceCliente({ esito, codice }: { esito?: Dettaglio['codice_cliente_esito']; codice: string | null }) {
  if (!codice || !esito || esito.stato === 'assente') return null;
  if (esito.stato === 'corrisponde') {
    return <span className="sec-riga" style={{ color: 'var(--ok)' }}><Icona nome="spunta" /> codice del cliente associato</span>;
  }
  const testo = esito.stato === 'altro_cliente'
    ? `Il codice ${codice} presso ${esito.fornitore ?? ''} è di ${esito.cliente ?? ''}`
    : esito.stato === 'senza_agenzia'
      ? `Codice cliente ${codice} non presente fra i clienti del fornitore`
      : `Codice cliente ${codice}: agenzia dal vecchio CRM, da confermare`;
  return <span className="sec-riga" style={{ color: 'var(--attesa-testo)' }}><Icona nome="avviso" /> {testo}</span>;
}

export function VistaDocumento({ id, onFatto, aggiorna }: { id: string; onFatto?: () => void; aggiorna?: number }) {
  const router = useRouter();
  const puo = usePuo();
  const puoModifica = puo('provvigioni.modifica');
  const puoImporta = puo('dati.importa');
  const puoAgenzia = puo('dati.modifica'); // D-106: l'agenzia si salva con `dati.modifica`
  const [d, setD] = useState<Dettaglio | null>(null);
  const [errore, setErrore] = useState('');
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [scheda, setScheda] = useState('azioni');
  const [altra, setAltra] = useState('');
  const [bollettinoId, setBollettinoId] = useState<string | null>(null);
  const [importando, setImportando] = useState(false); // R2-08: un solo import per volta
  const sagome = useSagome(!d);
  // D-177 §19: filtro per stato nella ricerca «Oppure abbina a un'altra pratica», iniziale dal tipo del documento
  const [statoFiltro, setStatoFiltro] = useState('');
  useEffect(() => { const tipo = d?.testata.tipo; if (tipo) setStatoFiltro(STATO_DAL_TIPO[tipo] ?? ''); }, [d?.testata.tipo]);
  // D-178 §19: filtro per stato delle pratiche suggerite; parte vuoto e lo sceglie il server dal tipo
  // (nota di credito e pagamento → «fatturata», gli altri → «aperte»). Qui arriva solo la scelta dell'utente (V12).
  const [filtro, setFiltro] = useState<'aperte' | 'tutte' | 'solo_ordine' | 'confermata' | 'fatturata' | ''>('');
  const [caricando, setCaricando] = useState(false); // D-59: la lista resta visibile, più tenue, finché arrivano i dati

  const carica = useCallback(async () => {
    const r = await api<Dettaglio>('documenti/' + id + (filtro ? '?filtro=' + filtro : ''));
    if (r.ok) { setD(r.dati); setErrore(''); } else setErrore(r.messaggio);
    setCaricando(false);
  }, [id, filtro]);
  // il dettaglio si rimonta al cambio di documento (`key` in VistaDocumenti, D-94): niente azzeramento qui
  useEffect(() => { void carica(); }, [carica]);
  // il documento selezionato è cambiato sul server (SSE): si richiede il dettaglio, senza doppia lettura al montaggio
  const primoAggiorna = useRef(aggiorna);
  useEffect(() => {
    if (aggiorna === undefined || aggiorna === primoAggiorna.current) return;
    primoAggiorna.current = aggiorna;
    void carica();
  }, [aggiorna, carica]);
  // si torna dal cliente o dalle impostazioni e il documento si rilegge (V12: si richiede al server)
  useEffect(() => {
    const torna = () => { if (document.visibilityState === 'visible') void carica(); };
    window.addEventListener('focus', torna);
    document.addEventListener('visibilitychange', torna);
    return () => { window.removeEventListener('focus', torna); document.removeEventListener('visibilitychange', torna); };
  }, [carica]);

  /** Cambia il filtro delle pratiche suggerite: ricarica dal server, la lista resta più tenue (D-59). */
  const cambiaFiltro = (v: string) => {
    if (v === (filtro || FILTRO_DAL_TIPO[d?.testata.tipo ?? ''] || 'aperte')) return;
    setFiltro(v as typeof filtro);
    setCaricando(true);
  };

  // il bollettino già registrato: serve solo il collegamento alla verifica (D-71)
  useEffect(() => {
    const t = d?.testata;
    if (!d?.bollettino?.esiste || !d.fornitore || !t?.mese || !t?.anno) return;
    const al = t.anno + '-' + String(t.mese).padStart(2, '0');
    void api<{ fornitori: { celle: { mese: string; bollettino_id: string | null }[] }[] }>(
      'bollettini?al=' + al + '&fornitori=' + d.fornitore.id + '&vista=tutti',
    ).then((r) => {
      if (!r.ok) return;
      const cella = r.dati.fornitori[0]?.celle.find((c) => c.mese === al);
      if (cella?.bollettino_id) setBollettinoId(cella.bollettino_id);
    });
  }, [d]);

  const chiudi = () => setFinestra(null);
  const salvato = (x: Dettaglio) => {
    const n = punti(x);
    chiudi();
    onFatto?.();
    avviso(n ? `Dati salvati: restano ${n} ${n === 1 ? 'punto' : 'punti'} da controllare` : 'Dati salvati: lettura controllata, l’abbinamento è ricalcolato');
    void carica(); // D-178: ricarica col filtro corrente, non con quello predefinito della risposta
  };

  if (!d) {
    return (
      <Pannello riempi>
        {errore
          ? <div className="vuoto"><b>Documento non caricato</b>{errore}
            <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div>
          : sagome && (
            <div className="pila" aria-busy="true">
              <Sagoma larghezza="100%" altezza={96} />
              <Sagoma larghezza="100%" altezza={420} />
            </div>
          )}
      </Pannello>
    );
  }

  const doc: Dettaglio = d;
  const t = doc.testata;
  const boll = t.tipo === 'bollettino' || doc.tipo === 'bollettino';
  const nomeFornitore = doc.fornitore?.nome ?? 'non riconosciuto';
  // fornitore riconosciuto: il nome è un link alla sua scheda (catena documento → fornitore, 15/11/2026)
  const valoreFornitore = doc.fornitore?.id ? <Link href={'/fornitori/' + doc.fornitore.id}>{nomeFornitore}</Link> : nomeFornitore;
  const n = punti(doc);
  const incerte = righeIncerte(doc);
  const etichettaTipo = t.tipo ? TIPO[t.tipo] ?? t.tipo : 'Documento';
  const ab = doc.proposta.abbinamento;
  const doppio = doc.proposta.doppio;
  // D-170 §19 (B): il cliente associato al documento (scelto, riconosciuto, o quello della pratica
  // agganciata per numero d'ordine), per la voce «Cliente» dell'intestazione.
  const po = doc.proposta.pratica_ordine?.pratica ?? null;
  const clienteAssociato = ab?.cliente_id
    ? { id: ab.cliente_id, nome: ab.cliente ?? 'cliente riconosciuto' }
    : doc.proposta.cliente_riconosciuto?.cliente_id
      ? { id: doc.proposta.cliente_riconosciuto.cliente_id, nome: doc.proposta.cliente_riconosciuto.ragione }
      : po?.cliente_id
        ? { id: po.cliente_id, nome: po.cliente }
        : null;

  /** 15/11/2026: prima di abbinare, il riepilogo di cosa cambia sulla pratica. I dati veri arrivano dal
   *  server (V12): il dettaglio della pratica ha «Confermato X di Y» (§5.3, D-174) e lo stato. Fattura e
   *  nota di credito si annullano dalla pratica (pulsante Annulla): conferma semplice. Gli altri tipi
   *  lì si possono solo spostare, non togliere: ConfermaGrave con la casella (D-172). */
  async function chiediAbbina(corpo: Record<string, unknown>): Promise<boolean> {
    const r = await api<{
      numero: string; cliente: string | null; fornitore: string | null; stato: string | null;
      numero_ordine_fornitore?: string | null; progresso?: { x: number; y: number } | null;
    }>('pratiche/' + String(corpo.pratica_id));
    if (!r.ok) { avviso(r.messaggio, true); return false; }
    const p = r.dati;
    const ruolo = corpo.ruolo as 'parziale' | 'sostituisce' | undefined;
    const dopo = t.tipo === 'fattura' ? 'fatturata' : t.tipo === 'conferma' || t.tipo === 'proforma' ? 'confermata' : null;
    const eConferma = t.tipo === 'conferma' || t.tipo === 'proforma';
    const stato = p.stato ?? '';
    const nomeStato = (s: string) => STATO_PRATICA[s]?.testo ?? s;
    const punti: ReactNode[] = [
      <>Il documento <b>{etichettaTipo}{t.numero ? ' ' + t.numero : ''}</b> del {data(t.data)} ({euro(Math.abs(doc.proposta.importo))}) entra nella pratica <b>{p.numero}</b>
        {p.cliente ? <> di {p.cliente}</> : null}{p.fornitore ? <> · {p.fornitore}</> : null}{p.numero_ordine_fornitore ? <> · ordine {p.numero_ordine_fornitore}</> : null}.</>,
      ...(ruolo ? [ruolo === 'sostituisce'
        ? <>Ruolo <b>Sostituisce</b>: la conferma o proforma già sulla pratica viene segnata come superata e non conta più.</>
        : <>Ruolo <b>Parziale</b>: si somma alle conferme già sulla pratica.</>] : []),
      ...(eConferma && p.progresso ? [<>
        {ruolo === 'sostituisce' ? 'Oggi risultano confermati' : 'Confermato'} <b>{euro(p.progresso.x)} di {euro(p.progresso.y)}</b>
        {ruolo === 'sostituisce' ? '; con l’abbinamento il documento porta altri ' : ': con l’abbinamento arrivano altri '}
        <b>{euro(Math.abs(doc.proposta.importo))}</b>.
      </>] : []),
      ...(dopo && stato && dopo !== stato && stato !== 'fatturata'
        ? [<>Lo stato della pratica passa da «{nomeStato(stato)}» a «{nomeStato(dopo)}».</>] : []),
      ...(doc.righe.length ? [<>{doc.righe.length} {doc.righe.length === 1 ? 'riga letta viene copiata' : 'righe lette vengono copiate'} nella pratica, per il confronto fra ordine, conferma e fattura.</>] : []),
      ...doc.controlli.slice(0, 3).map((c) => <>{c.testo}</>),
      ...(incerte.size ? [<>{incerte.size} {incerte.size === 1 ? 'riga letta ha' : 'righe lette hanno'} valori incerti: restano da controllare.</>] : []),
    ];
    const titolo = 'Abbinare ' + etichettaTipo.toLowerCase() + (t.numero ? ' ' + t.numero : '') + ' a ' + p.numero + '?';
    const annullabile = t.tipo === 'fattura' || t.tipo === 'nota_credito';
    return new Promise<boolean>((ok) => setFinestra(annullabile
      ? <Conferma titolo={titolo} testo={<ul className="conferma-punti">{punti.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        etichetta="Abbina" onRisposta={(x) => { chiudi(); ok(x); }} />
      : <ConfermaGrave titolo={titolo} punti={punti} etichettaCasella="Ho capito: l’abbinamento non si toglie dalla pratica"
        etichetta="Abbina" onRisposta={(x) => { chiudi(); ok(x); }} />));
  }

  async function inviaAbbina(corpo: Record<string, unknown>, multi_ordine = false, confermato = false) {
    if (!confermato && !(await chiediAbbina(corpo))) return false;
    const c = multi_ordine ? { ...corpo, multi_ordine: true } : corpo;
    const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/abbina', c);
    if (!r.ok) {
      // D-123: la stessa fattura su un'altra pratica chiede la conferma multi-ordine
      if (r.stato === 409 && r.messaggio.includes('su più ordini')) {
        const si = await new Promise<boolean>((ok) => setFinestra(
          <Conferma titolo={'La ' + (TIPO[t.tipo ?? ''] ?? 'fattura').toLowerCase() + ' è già su un’altra pratica'}
            testo={r.messaggio} etichetta="Conferma" onRisposta={(x) => { chiudi(); ok(x); }} />,
        ));
        if (!si) return false;
        return inviaAbbina(corpo, true, true);
      }
      avviso(r.messaggio, true); return false;
    }
    avviso('Documento abbinato alla pratica ' + r.dati.pratica.numero);
    router.push('/pratiche/' + r.dati.pratica.id);
    return true;
  }

  /** Con lettura bassa l'abbinamento chiede conferma (come il prototipo, §6.5 punto 6). */
  async function seAffidabile(fn: () => void | Promise<void>) {
    if (doc.livello !== 'bassa') { await fn(); return; }
    const si = await new Promise<boolean>((ok) => setFinestra(
      <Conferma titolo="Lettura con affidabilità bassa"
        testo={`Ci sono ${n} ${n === 1 ? 'punto' : 'punti'} da controllare nei dati letti. Conviene correggerli prima: vuoi procedere comunque?`}
        etichetta="Procedi comunque" onRisposta={(x) => { chiudi(); ok(x); }} />,
    ));
    if (si) await fn();
  }

  /** Nota di credito: la fattura stornata si cerca nella pratica; se manca si sceglie. */
  async function abbinaNota(praticaId: string) {
    const r = await api<{ documenti: { id: string; tipo: string; numero: string; data: string }[] }>('pratiche/' + praticaId + '/documenti');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    const fatture = r.dati.documenti.filter((x) => x.tipo === 'fattura');
    if (!fatture.length) { avviso('La pratica non ha fatture da stornare: scegline un’altra o scarta il documento.', true); return; }
    const trovata = fatture.find((x) => x.numero === t.riferimento_fattura);
    const abbina = (fatturaId: string) => inviaAbbina({
      tipo: 'nota_credito', pratica_id: Number(praticaId), numero: t.numero, data: t.data,
      importo: t.importo ?? undefined, fattura_id: Number(fatturaId),
    });
    if (trovata) { await abbina(trovata.id); return; }
    setFinestra(
      <FormModal titolo="Quale fattura storna questa nota di credito?"
        testo={t.riferimento_fattura ? `Il riferimento letto è ${t.riferimento_fattura}, ma la pratica non ha una fattura con quel numero.` : 'Il documento non riporta il numero della fattura stornata.'}
        conferma="Abbina" campi={[{
          nome: 'fattura_id', etichetta: 'Fattura stornata', tipo: 'select', largo: true,
          opzioni: fatture.map((f) => ({ value: f.id, label: f.numero + ' del ' + data(f.data) })),
        }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.fattura_id) return 'Scegli la fattura stornata.';
          return (await abbina(v.fattura_id)) ? undefined : 'Abbinamento non riuscito.';
        }} />);
  }

  /** D-174: conferma/proforma su una pratica che ne ha già una → l'operatore sceglie parziale o sostituisce. */
  function chiediRuolo(suggerito: 'parziale' | 'sostituisce'): Promise<'parziale' | 'sostituisce' | null> {
    return new Promise((risolvi) => {
      setFinestra(
        <FormModal titolo={(TIPO[t.tipo ?? ''] ?? 'Documento') + ' in più sulla pratica'}
          testo="Questa pratica ha già una conferma o proforma: scegli come abbinare questa."
          conferma="Abbina" colonne={1}
          campi={[{
            nome: 'ruolo', etichetta: 'Come si abbina?', tipo: 'select', valore: suggerito, largo: true,
            opzioni: [
              { value: 'parziale', label: 'Parziale: si somma alle altre' },
              { value: 'sostituisce', label: 'Sostituisce: revisione, la precedente non conta più' },
            ],
          }]}
          onChiudi={() => { chiudi(); risolvi(null); }}
          onConferma={async (v) => { risolvi((v.ruolo as 'parziale' | 'sostituisce') || suggerito); }}
        />,
      );
    });
  }

  async function abbinaPratica(praticaId: string, ruolo?: 'parziale' | 'sostituisce' | null) {
    if (t.tipo === 'nota_credito') { await abbinaNota(praticaId); return; }
    let scelto = ruolo ?? null;
    if ((t.tipo === 'conferma' || t.tipo === 'proforma') && ruolo != null) {
      scelto = await chiediRuolo(ruolo);
      if (!scelto) return;
    }
    await inviaAbbina({
      tipo: t.tipo, pratica_id: Number(praticaId), numero: t.numero, data: t.data, importo: t.importo ?? undefined,
      ...(scelto ? { ruolo: scelto } : {}),
    });
  }

  function apriNuova() {
    setFinestra(
      <ApriPratica id={id} t={t} clienteIniziale={t.cliente_id ?? ab?.cliente_id ?? doc.proposta.cliente_riconosciuto?.cliente_id ?? ''} pivaDaSalvare={doc.piva_da_salvare} onChiudi={chiudi} onFatto={onFatto} />,
    );
  }

  function apriBollettino() {
    setFinestra(
      <FormModal titolo={'Registra il bollettino di ' + (t.mese ? MESI[t.mese - 1] : '') + ' ' + (t.anno ?? '')}
        conferma="Registra e verifica" colonne={2}
        testo="Dopo la registrazione lo confronti riga per riga con le nostre pratiche."
        campi={[
          { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: entitaFornitore, largo: true, valore: t.fornitore_id ?? '',
            testoIniziale: t.fornitore ? { q: t.fornitore, mostra: t.fornitore } : undefined,
            nomeIniziale: t.fornitore ?? undefined },
          { nome: 'mese', etichetta: 'Mese', tipo: 'select', valore: String(t.mese ?? ''), opzioni: MESI.map((m, i) => ({ value: String(i + 1), label: m })) },
          { nome: 'anno', etichetta: 'Anno', tipo: 'numero', valore: t.anno ?? '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const fornitoreId = v.fornitore_id || t.fornitore_id;
          if (!fornitoreId) return 'Scegli il fornitore.';
          const r = await api<{ id: string }>('bollettini', {
            fornitore_id: Number(fornitoreId), anno: Number(v.anno), mese: Number(v.mese), arrivo_id: Number(id),
          });
          if (!r.ok) return r.messaggio;
          avviso('Bollettino registrato: ora verificalo');
          router.push('/bollettini/' + r.dati.id);
        }} />);
  }

  function scarta() {
    setFinestra(
      <FormModal titolo={'Scartare ' + etichettaTipo.toLowerCase() + (t.numero ? ' ' + t.numero : '') + '?'}
        conferma="Scarta" pericolo colonne={1}
        casella="Ho capito: il documento esce dall'elenco e resta solo fra gli scartati"
        testo="Il documento esce dall’elenco e non viene registrato. Resta fra i documenti scartati per 90 giorni e si può recuperare."
        campi={[
          { nome: 'motivo', etichetta: 'Motivo', tipo: 'select', opzioni: ['Doppione', 'Non riguarda Decobrands', 'Documento illeggibile', 'Altro'].map((x) => ({ value: x, label: x })) },
          { nome: 'nota', etichetta: 'Nota (facoltativa)', segnaposto: 'es. arrivato due volte' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const r = await api('documenti/' + id + '/scarta', { motivo: v.motivo, nota: v.nota || undefined });
          if (!r.ok) return r.messaggio;
          avviso('Documento scartato: lo trovi fra gli scartati');
          onFatto?.();
          router.push('/documenti');
        }} />);
  }

  /** D-204: la versione aggiornata sostituisce il documento registrato nella pratica. Finestra con
   *  prima → dopo (data, importo, righe, cliente) e motivo precompilato; il server fa tutto (V12). */
  function sostituisci() {
    const dd = doc.proposta.doppio;
    if (!dd) return;
    const etichetta = TIPO[t.tipo ?? ''] ?? 'Documento';
    const punti = [
      ['Data', data(dd.data), data(t.data)],
      ['Importo', euro(dd.importo), euro(doc.proposta.importo)],
      ['Righe', String(dd.righe), String(doc.righe.length)],
      ['Cliente', dd.cliente ?? '—', clienteAssociato?.nome ?? '—'],
    ] as const;
    setFinestra(
      <FormModal titolo={'Sostituire ' + etichetta.toLowerCase() + (t.numero ? ' ' + t.numero : '') + '?'}
        conferma="Sostituisci" colonne={1}
        testo={<>
          <p>La versione registrata nella pratica <Link href={'/pratiche/' + dd.pratica_id}><b>{dd.pratica_numero}</b></Link> viene sostituita da questa versione aggiornata.</p>
          <ul className="conferma-punti">
            {punti.map(([nome, prima, dopo]) => <li key={nome}><b>{nome}</b>: {prima} → {dopo}</li>)}
          </ul>
        </>}
        campi={[{ nome: 'motivo', etichetta: 'Motivo', valore: etichetta + ' aggiornato dal fornitore', largo: true }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.motivo) return 'Scrivi il motivo della sostituzione.';
          const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/sostituisci', { motivo: v.motivo });
          if (!r.ok) return r.messaggio;
          avviso(etichetta + ' sostituito nella pratica ' + r.dati.pratica.numero);
          onFatto?.();
          router.push('/pratiche/' + r.dati.pratica.id);
        }} />,
    );
  }

  /** A4-01 / D-170 / D-172: riprova la lettura (chiave o crediti del servizio sistemati, o rileggere
   *  per i campi nuovi). Prima la conferma con casella (D-172): riscrive tutti i campi letti. */
  async function rileggi() {
    const si = await new Promise<boolean>((ok) => setFinestra(
      <ConfermaRileggi onRisposta={(x) => { chiudi(); ok(x); }} />,
    ));
    if (!si) return;
    const r = await api('documenti/' + id + '/rileggi', {});
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Documento rimesso in coda: la lettura riparte al prossimo giro');
    onFatto?.();
    router.push('/documenti');
  }

  /** §7.9: toglie un documento in coda prima della lettura, con lo scarto già esistente (motivo fisso). */
  function togliDallaCoda() {
    setFinestra(
      <ConfermaGrave titolo="Togliere il documento dalla coda?"
        punti={['Il documento non verrà letto né registrato.', 'Va fra i documenti scartati e si può recuperare.']}
        etichetta="Togli dalla coda"
        onRisposta={async (x) => {
          chiudi();
          if (!x) return;
          const r = await api('documenti/' + id + '/scarta', { motivo: 'Tolto dalla coda', nota: 'prima della lettura' });
          if (!r.ok) { avviso(r.messaggio, true); return; }
          avviso('Documento tolto dalla coda: lo trovi fra gli scartati');
          onFatto?.();
          router.push('/documenti');
        }} />,
    );
  }

  const azioni: Azione[] = [
    ...(puoModifica && ['da_controllare', 'errore'].includes(d.stato) ? [{
      etichetta: 'Correggi i dati letti', onClick: () => setFinestra(<FinestraCorreggi d={d} onChiudi={chiudi} onSalvato={salvato} onRileggi={() => void rileggi()} />),
      conta: n || undefined, contaVariante: d.livello === 'bassa' ? 'errore' as const : 'attesa' as const,
      titolo: n + (n === 1 ? ' punto da controllare' : ' punti da controllare'),
    }] : []),
    // A4-01 / D-170: da errore o da controllare si riprova la lettura (servizio sistemato, o rileggere
    // un documento già letto per ricavare i campi nuovi)
    ...(puoModifica && ['errore', 'da_controllare'].includes(d.stato) ? [{
      etichetta: 'Rileggi il documento', onClick: rileggi,
    }] : []),
    // §7.9: un documento in coda si può togliere prima della lettura (scarto con motivo fisso)
    ...(puoModifica && d.stato === 'in_coda' ? [{
      etichetta: 'Togli dalla coda', variante: 'pericolo' as const, onClick: togliDallaCoda,
    }] : []),
    ...(puoModifica && ['da_controllare', 'errore'].includes(d.stato) ? [{
      etichetta: 'Scarta il documento', variante: 'pericolo' as const, onClick: scarta,
    }] : []),
  ];

  const testata = boll ? [
    { etichetta: 'Fornitore', valore: valoreFornitore },
    { etichetta: 'Mese', valore: t.mese ? MESI[t.mese - 1] + ' ' + (t.anno ?? '') : '—' },
    { etichetta: 'Totale riconosciuto', valore: euro(d.proposta.importo) },
  ] : [
    { etichetta: 'Fornitore', valore: valoreFornitore },
    { etichetta: 'Tipo', valore: etichettaTipo },
    { etichetta: 'Data del documento', valore: data(t.data) },
    { etichetta: 'Cliente', valore: clienteAssociato
      ? <Link href={'/clienti/' + clienteAssociato.id}>{clienteAssociato.nome}</Link>
      : <span className="testo-tenue">non ancora associato</span> },
    {
      etichetta: 'Codice cliente', valore: <>
        {t.codice_cliente ?? '—'}{t.codice_cliente ? <Copiabile valore={t.codice_cliente} /> : null}
        <EsitoCodiceCliente esito={doc.codice_cliente_esito} codice={t.codice_cliente} />
      </>,
    },
    { etichetta: 'Importo', valore: t.importo == null ? '—' : euro(t.importo) },
    ...(t.riferimento_fattura ? [{ etichetta: 'Fattura stornata', valore: t.riferimento_fattura }] : []),
  ];

  /** D-106: senza agenzia il documento non entra in pratica; si configura qui, con cliente e fornitore fissi. */
  function configuraAgenzia() {
    const am = doc.proposta.agenzia_mancante;
    if (!am) return;
    setFinestra(
      <FormAgenzia
        cliente={{ id: am.cliente_id, nome: am.cliente }}
        fornitoreFisso={{ id: am.fornitore_id, nome: am.fornitore ?? doc.fornitore?.nome ?? 'Fornitore' }}
        iniziali={{ codice_cliente_fornitore: am.codice_cliente, valido_dal: am.data }}
        onSalvata={async () => { await carica(); onFatto?.(); }}
        onChiudi={chiudi}
      />,
    );
  }

  /** D-111/D-133: il server importa il fornitore e collega il documento nella stessa transazione, così
   *  la proposta si ricalcola e compare «Mancano gli scaglioni» (D-113) senza perdere le righe lette. */
  async function importaFornitore() {
    const fd = doc.proposta.fornitore_da_integra;
    if (!fd || importando) return;
    setImportando(true);
    try {
      const r = await api<{ id: string }>('integra/importa', {
        tipo: 'fornitore', id_integra: fd.id_integra, documento_id: Number(id),
      });
      if (!r.ok) { avviso(r.messaggio, true); return; }
      avviso('Fornitore importato da Integra');
      await carica();
      onFatto?.();
    } finally {
      setImportando(false);
    }
  }

  /** D-111: importa il cliente da Integra; dopo l'import la proposta riconosce il cliente e chiede l'agenzia. */
  async function importaCliente() {
    const cd = doc.proposta.cliente_da_integra;
    if (!cd || cd.id_integra == null || importando) return;
    setImportando(true);
    try {
      const r = await api<{ id: string }>('integra/importa', { tipo: 'cliente', id_integra: cd.id_integra });
      if (!r.ok) { avviso(r.messaggio, true); return; }
      avviso('Cliente importato da Integra');
      await carica();
      onFatto?.();
    } finally {
      setImportando(false);
    }
  }

  /** D-152: la persona sceglie il fornitore o il cliente fra i candidati proposti dal server. */
  async function scegli(ruolo: 'fornitore' | 'cliente', cand: CandidatoSoggetto) {
    if (importando) return;
    setImportando(true);
    try {
      const r = await api<Dettaglio>('documenti/' + id + '/scegli', { ruolo, fonte: cand.fonte, id: cand.id });
      if (!r.ok) { avviso(r.messaggio, true); return; }
      avviso((ruolo === 'fornitore' ? 'Fornitore' : 'Cliente') + ' collegato al documento');
      await carica();
      onFatto?.();
    } finally {
      setImportando(false);
    }
  }

  function azione() {
    const fd = doc.proposta.fornitore_da_integra;
    const cd = doc.proposta.cliente_da_integra;
    const nr = doc.proposta.manca_rappresentanza;
    // D-152: candidati da scegliere (il riconoscimento non è univoco)
    const riquadroScelta = (ruolo: 'fornitore' | 'cliente', candidati: CandidatoSoggetto[]) => (
      <div className="pila">
        <Nota>{ruolo === 'fornitore' ? 'Il fornitore letto non è univoco' : 'Il cliente letto non è univoco'}: scegli fra i candidati.</Nota>
        {doc.proposta.integra_non_raggiungibile && <Nota>Integra non raggiungibile: i candidati sono solo del CRM.</Nota>}
        <Elenco voci={candidati.map((c) => ({
          testo: <><b>{c.ragione_sociale ?? '—'}</b><span className="sec-riga">{[c.piva, c.citta, c.motivo, c.punteggio != null ? 'somiglianza ' + Math.round(c.punteggio * 100) + '%' : null].filter(Boolean).join(' · ')}</span></>,
          destra: <>
            <Stato v={c.fonte === 'crm' ? 'info' : 'neutro'}>{c.fonte === 'crm' ? 'CRM' : 'Integra'}</Stato>
            <button type="button" className="btn sec piccolo" disabled={importando || (c.fonte === 'integra' && !puoImporta)}
              title={c.fonte === 'integra' && !puoImporta ? 'Serve il permesso di importare da Integra' : undefined}
              aria-label={'Scegli ' + (c.ragione_sociale ?? '')}
              onClick={() => void scegli(ruolo, c)}>{importando ? '…' : 'Scegli'}</button>
          </>,
        }))} />
        <div className="azioni-riga">
          <button type="button" className="btn testo" onClick={() => setFinestra(<FinestraCorreggi d={doc} onChiudi={chiudi} onSalvato={salvato} onRileggi={() => void rileggi()} />)}>Nessuno di questi: scegli a mano</button>
        </div>
      </div>
    );
    if (doc.proposta.candidati_fornitore.length) return riquadroScelta('fornitore', doc.proposta.candidati_fornitore);
    if (doc.proposta.candidati_cliente.length) return riquadroScelta('cliente', doc.proposta.candidati_cliente);
    return (
      <>
        {doc.integra === 'non_disponibile' && (
          <Nota>Integra non raggiungibile: i candidati da importare non sono aggiornati.</Nota>
        )}
        {incerte.size > 0 && (
          <div className="avviso-variazioni" role="status">
            <Icona nome="avviso" />
            <span><b>{incerte.size} {incerte.size === 1 ? 'riga letta' : 'righe lette'} con valori incerti</b>: controllale prima di decidere.</span>
            <button type="button" className="btn sec piccolo" onClick={() => setScheda('righe')}>Vedi le righe</button>
          </div>
        )}
        {doc.scaglioni_mancanti && doc.fornitore && !boll && !fd && ['ordine', 'conferma', 'fattura', 'nota_credito'].includes(t.tipo ?? '') && (
          <Nota>Mancano gli scaglioni del fornitore: configurali nella <Link href={'/fornitori/' + doc.fornitore.id}>scheda del fornitore</Link> prima di aprire la pratica.</Nota>
        )}
        {fd ? (
          <div className="pila">
            <Nota>Il fornitore non è in anagrafica. In Integra c'è: <b>{fd.ragione_sociale ?? '—'}</b>{fd.piva ? `, P.IVA ${fd.piva}` : ''}.</Nota>
            <div className="azioni-riga">
              <button type="button" className="btn primario" disabled={!puoImporta || importando} title={!puoImporta ? 'Serve il permesso di importare da Integra' : undefined} onClick={() => void importaFornitore()}>{importando ? 'Importo…' : 'Importa da Integra'}</button>
            </div>
          </div>
        ) : nr ? (
          <div className="pila">
            <Nota>Questo fornitore non è rappresentato per questo cliente: senza agenzia il documento non entra in una pratica.</Nota>
            <div className="azioni-riga">
              <button type="button" className="btn primario" disabled={!puoAgenzia} title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined} onClick={configuraAgenzia}>Configura l’agenzia</button>
            </div>
          </div>
        ) : cd ? (
          <div className="pila">
            <Nota>Il cliente <b>{cd.ragione_sociale ?? '—'}</b> non è in anagrafica.</Nota>
            {cd.subagente != null || cd.sconto != null ? (
              <div className="nota"><b>Dal vecchio CRM</b>: subagente {cd.subagente ?? '—'}{cd.sconto != null ? `, sconto ${cd.sconto}%` : ''}.</div>
            ) : null}
            <div className="azioni-riga">
              {cd.id_integra != null
                ? <button type="button" className="btn primario" disabled={!puoImporta || importando} title={!puoImporta ? 'Serve il permesso di importare da Integra' : undefined} onClick={() => void importaCliente()}>{importando ? 'Importo…' : 'Importa da Integra'}</button>
                : <button type="button" className="btn primario" disabled title="L’import dal vecchio CRM arriva con l’anagrafica">Importa dal vecchio CRM</button>}
            </div>
          </div>
        ) : doc.proposta.esito === 'manca_agenzia' ? (
          <div className="pila">
            <Nota>Il cliente non ha un’agenzia con questo fornitore: senza, il documento non entra in una pratica. È normale al primo ordine.</Nota>
            <div className="azioni-riga">
              <button type="button" className="btn primario" disabled={!puoAgenzia} title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined} onClick={configuraAgenzia}>Configura l’agenzia</button>
            </div>
          </div>
        ) : boll ? (
          doc.bollettino?.esiste ? (
            <Nota>Il bollettino di {t.mese ? MESI[t.mese - 1] : ''} {t.anno ?? ''} di {nomeFornitore} è già registrato:
              {bollettinoId ? <> <Link href={'/bollettini/' + bollettinoId}>aprilo</Link></> : <> aprilo da <Link href="/bollettini">Bollettini</Link></>}.
              Se questo è la versione rettificata, correggi il mese o scartalo.</Nota>
          ) : (
            <Scelte voci={[{
              titolo: 'Registra il bollettino di ' + (t.mese ? MESI[t.mese - 1] : '') + ' ' + (t.anno ?? ''),
              consigliata: true,
              punti: [
                `${doc.righe.length} ${doc.righe.length === 1 ? 'riga letta' : 'righe lette'}, totale ${euro(doc.proposta.importo)}`,
                'dopo la registrazione lo confronti riga per riga con le nostre pratiche',
              ],
              azione: { etichetta: 'Registra e verifica', onClick: () => void seAffidabile(apriBollettino) },
            }]} />
          )
        ) : t.tipo === 'ordine' ? (
          <>
            {doc.proposta.esito === 'doppio' ? (
              doppio ? (
                <div className="pila">
                  <Nota>Questo ordine c’è già nella pratica <Link href={'/pratiche/' + doppio.pratica_id}><b>{doppio.pratica_numero}</b></Link>. Se è la versione aggiornata, sostituiscilo; altrimenti scarta il documento.</Nota>
                  <div className="azioni-riga">
                    <button type="button" className="btn sec" disabled={!puoModifica} onClick={sostituisci}>{SOSTITUISCI_LABEL.ordine}</button>
                  </div>
                </div>
              ) : null
            ) : (
              <>
                {!ab && (doc.proposta.cliente_riconosciuto
                  ? <Nota>Il codice {t.codice_cliente ?? '—'} non è abbinato a {nomeFornitore}, ma il cliente è <b>{doc.proposta.cliente_riconosciuto.ragione ?? ''}</b>. Aggiungi l’agenzia nella <Link href={'/clienti/' + doc.proposta.cliente_riconosciuto.cliente_id}>scheda del cliente</Link>, oppure scegli cliente e fornitore qui sotto.</Nota>
                  : doc.fornitore
                    ? <Nota>Il codice {t.codice_cliente ?? '—'} non corrisponde a nessun cliente di {nomeFornitore}. Correggi il codice letto oppure scegli cliente e fornitore qui sotto.</Nota>
                    : <Nota>Fornitore e codice cliente non letti: correggi i dati letti oppure scegli cliente e fornitore qui sotto.</Nota>)}
                <Scelte voci={[{
                  titolo: (t.numero ?? 'Ordine') + ' · ' + (ab?.cliente ?? 'cliente da scegliere'),
                  sottotitolo: <Stato v="attesa">Nuova pratica</Stato>,
                  consigliata: true,
                  punti: [
                    ab ? `codice cliente ${ab.codice ?? ''} = ${ab.cliente ?? ''}` : 'cliente e fornitore da scegliere',
                    'con l’ordine nasce la pratica e parte l’attesa della conferma',
                  ],
                  azione: { etichetta: 'Apri la pratica', onClick: () => void seAffidabile(apriNuova) },
                }]} />
              </>
            )}
          </>
        ) : (
          <>
            {doc.proposta.esito === 'nessuno' && <h3>A quale pratica appartiene?</h3>}
            {/* Ugo 18/11/2026: la nota segue l'esito del codice; se il codice è buono manca solo la pratica aperta */}
            {doc.proposta.esito === 'nessuno' && ((t.tipo === 'altro' || !t.tipo)
              // 18/11/2026: un documento senza tipo non entra in una pratica; va spiegato, non cercato
              ? <Nota>Letto come «Documento»: un documento generico non entra in una pratica. Se è una conferma, una fattura o un ordine, correggi il tipo con «Correggi i dati letti».</Nota>
              : doc.codice_cliente_esito?.stato === 'corrisponde' || doc.codice_cliente_esito?.stato === 'da_confermare'
              ? <Nota>Nessuna pratica aperta da proporre per {doc.codice_cliente_esito.cliente ?? 'questo cliente'}: scegli la pratica a mano qui sotto.</Nota>
              : t.codice_cliente
                ? <Nota>{doc.fornitore
                  ? <>Il codice {t.codice_cliente} non corrisponde a nessun cliente di {nomeFornitore}. Scegli la pratica a mano oppure correggi il codice.</>
                  : <>Fornitore e codice cliente non letti: scegli la pratica a mano oppure correggi il codice.</>}</Nota>
                // 15/11/2026: codice vuoto (es. il pagamento non ce l'ha) → niente rilievo se il cliente è già scelto
                : !clienteAssociato && <Nota>Manca il codice cliente: scegli il cliente o la pratica a mano.</Nota>)}
            {doc.proposta.esito === 'doppio' && (doppio ? (
              <div className="pila">
                <Nota>Questo {(TIPO[doppio.tipo] ?? 'documento').toLowerCase()} c’è già nella pratica <Link href={'/pratiche/' + doppio.pratica_id}><b>{doppio.pratica_numero}</b></Link>. Se è la versione aggiornata, sostituiscilo; altrimenti scarta il documento.</Nota>
                <div className="azioni-riga">
                  <button type="button" className="btn sec" disabled={!puoModifica} onClick={sostituisci}>{SOSTITUISCI_LABEL[doppio.tipo] ?? 'Sostituisci'}</button>
                </div>
              </div>
            ) : (
              <Nota>Questo documento risulta già registrato: controlla il numero letto o scarta il documento.</Nota>
            ))}
            <div className={caricando ? 'in-aggiornamento' : undefined} aria-busy={caricando}>
              <Scelte vuoto="Nessuna pratica aperta da proporre" voci={doc.proposta.candidati.map((c, i) => {
                const s = STATO_PRATICA[c.pratica.stato] ?? { testo: c.pratica.stato, v: 'neutro' as Variante };
                return {
                  titolo: c.pratica.numero + ' · ' + (c.pratica.cliente ?? ''),
                  // Ugo 18/11/2026: la pratica si apre in una nuova scheda, senza lasciare il documento
                  apri: { href: '/pratiche/' + c.pratica.id + '?vista=sola', etichetta: 'Apri la pratica in una nuova scheda' },
                  sottotitolo: <Stato v={s.v}>{s.testo}</Stato>,
                  consigliata: i === 0 && doc.proposta.esito !== 'nessuno',
                  punti: [...c.motivi, t.tipo === 'nota_credito'
                    ? <>riduce il fatturato della pratica di <b className="negativo">{euro(Math.abs(doc.proposta.importo))}</b></>
                    : Math.abs(c.delta) < 0.01 ? <>importo uguale alla fase prima</>
                      : <><span className={c.delta < 0 ? 'negativo' : 'positivo'}>{euroSegno(c.delta)}</span> rispetto alla fase prima</>],
                  azione: { etichetta: 'Abbina a ' + c.pratica.numero, onClick: () => void seAffidabile(() => abbinaPratica(c.pratica.id, c.ruolo)) },
                };
              })} />
            </div>
          </>
        )}
        {!boll && doc.stato === 'da_controllare' && !['manca_agenzia', 'manca_rappresentanza', 'fornitore_da_integra', 'cliente_da_integra'].includes(doc.proposta.esito) && (
          <div className="abbina-altra">
            <span className="testo-tenue">{clienteAssociato?.id
              ? (t.fornitore_id ? `Oppure abbina a un’altra pratica di ${clienteAssociato.nome} con ${nomeFornitore}:` : `Oppure abbina a un’altra pratica di ${clienteAssociato.nome}:`)
              : (t.fornitore_id ? `Oppure abbina a un’altra pratica di ${nomeFornitore}:` : 'Oppure abbina a un’altra pratica:')}</span>
            <CampoRicerca entita={PRATICA} contesto={{ fornitore_id: t.fornitore_id, cliente_id: clienteAssociato?.id, stato: statoFiltro || undefined }}
              vincoli={t.fornitore_id ? (clienteAssociato?.id ? `Pratiche di ${clienteAssociato.nome} con ${nomeFornitore}` : `Pratiche con ${nomeFornitore} · cliente non ancora scelto`) : undefined}
              valore={altra} onChange={setAltra}
              apriVoce={(id) => '/pratiche/' + id + '?vista=sola'}
              segmenti={{ voci: STATI_ABBUNA, valore: statoFiltro, onCambia: setStatoFiltro }} />
            <button type="button" className="btn sec" disabled={!altra} onClick={() => { setAltra(''); void seAffidabile(() => abbinaPratica(altra)); }}>Abbina</button>
          </div>
        )}
      </>
    );
  }

  function righeLette() {
    const colonne: Colonna<Riga>[] = boll ? [
      { key: 'numero_fattura', header: 'Documento', grow: true },
      { key: 'data_fattura', header: 'Data', tipo: 'data' },
      { key: 'importo', header: 'Imponibile', tipo: 'euro' },
      { key: 'provvigione', header: 'Provvigione', tipo: 'euro', totale: 'somma' },
    ] : [
      { key: 'codice', header: 'Articolo', grow: true, cell: (r) => <><b>{r.codice ?? '—'}</b><span className="sec-riga">{r.descrizione ?? ''}{r.spesa ? ' · spesa' : ''}</span></> },
      { key: 'quantita', header: 'Quantità', tipo: 'numero' },
      { key: 'prezzo', header: 'Prezzo', tipo: 'euro' },
      { key: 'sconto', header: 'Sconto', tipo: 'pct', cell: (r) => r.sconto == null ? '—' : pct(r.sconto) },
      { key: 'importo', header: 'Importo', tipo: 'euro', totale: 'somma' },
    ];
    return (
      <>
        <Nota>{incerte.size
          ? 'Le righe evidenziate hanno valori letti con poca sicurezza: correggili o confermali con Correggi i dati letti.'
          : 'Righe come lette dal documento. Per cambiarle usa Correggi i dati letti.'}</Nota>
        <div className="riempi">
          <DataTable righe={doc.righe} colonne={colonne} chiave={(r) => String(r.i)} compatta
            totali={doc.totali}
            etichettaTotale={boll ? 'Totale provvigioni' : 'Totale documento'}
            rowClass={(r) => incerte.has(r.i) ? 'evidenzia' : ''}
            emptyText="Nessuna riga letta" emptyHint="Correggi i dati letti per aggiungerle." />
      </div>
    </>
  );
}

  const schede: Scheda[] = [
    {
      id: 'azioni',
      etichetta: boll ? 'Cosa farne'
        : doc.proposta.esito === 'fornitore_da_integra' ? 'Fornitore da importare'
        : doc.proposta.esito === 'fornitore_da_scegliere' ? 'Fornitore da scegliere'
        : doc.proposta.esito === 'manca_rappresentanza' ? 'Configura l’agenzia'
        : doc.proposta.esito === 'cliente_da_integra' ? 'Cliente da importare'
        : doc.proposta.esito === 'cliente_da_scegliere' ? 'Cliente da scegliere'
        : t.tipo === 'ordine' ? 'Nuova pratica'
        : doc.proposta.esito === 'nessuno' ? 'Scegli la pratica'
        : 'Pratica proposta',
      contenuto: azione,
    },
    {
      id: 'righe', etichetta: 'Righe lette',
      conta: incerte.size ? incerte.size + ' da controllare' : doc.righe.length,
      contaVariante: incerte.size ? (doc.livello === 'bassa' ? 'errore' : 'attesa') : 'neutro',
      contenuto: righeLette,
    },
  ];

  // D-178 §19: il filtro delle pratiche suggerite sta a destra della barra, solo quando ci sono candidate da proporre
  const mostraFiltro = !boll && t.tipo !== 'ordine' && !doc.proposta.candidati_fornitore.length && !doc.proposta.candidati_cliente.length;
  // 15/11/2026: la tendina mostra il predefinito dal tipo finché l'utente non ne sceglie uno
  const filtroEffettivo = filtro || (t.tipo ? FILTRO_DAL_TIPO[t.tipo] ?? 'aperte' : 'aperte');
  const filtroTendina = mostraFiltro ? (
    <label className="schede-filtro">
      <span>Stato delle pratiche</span>
      <select className="filtro-select" value={filtroEffettivo} onChange={(e) => cambiaFiltro(e.target.value)}>
        {STATI_SUGGERITE.map((s) => <option key={s.valore} value={s.valore}>{s.etichetta}</option>)}
      </select>
    </label>
  ) : undefined;

  return (
    <>
      <Pannello riempi
        titolo={<>{titoloDoc(t.tipo ?? 'altro', t.numero, t.data, t.importo, d.file_nome)}{t.numero ? <Copiabile valore={t.numero} /> : null}{t.numero_ordine_fornitore && t.tipo !== 'ordine' ? <> · ordine {t.numero_ordine_fornitore}<Copiabile valore={t.numero_ordine_fornitore} /></> : null}</>}
        nota={<><Icona nome="file" /> {d.file_nome}</>}
        azioni={azioni}>
        <div className="pila riempi">
          <Dettagli inColonne voci={testata} />
          <Schede schede={schede} attiva={scheda} onCambia={setScheda} memoria={'documento-' + id} riempi azioni={filtroTendina} />
        </div>
      </Pannello>
      {finestra}
    </>
  );
}

/** PDF o foto a tutta altezza nel pannello di sinistra, con il rettangolo del campo e l'ingrandimento.
 *  Il rettangolo (§6.6) si disegna solo se la posizione ha davvero le coordinate, su PDF e su foto. */
function FileDocumento({ d, pagina, posizione, mancaPosizione }: { d: Dettaglio; pagina?: number; posizione?: Posizione | null; mancaPosizione?: boolean }) {
  const src = '/api/documenti/' + d.id + '/file';
  const p = posizione && posizione.x0 != null && posizione.x1 != null
    ? { x0: posizione.x0, y0: posizione.y0 ?? 0, x1: posizione.x1, y1: posizione.y1 ?? 0 }
    : null;
  return <PdfEvidenziato src={src} tipo={d.file_tipo} pagina={pagina ?? 1} posizione={p} mancaPosizione={mancaPosizione} />;
}

/** D-165: soggetto riconosciuto senza P.IVA nel CRM e documento con P.IVA valida → «Salva la P.IVA».
 *  Il server salva una versione nuova del soggetto; la nota ricorda di aggiornare anche Integra (mai
 *  toccato dal CRM, D-100). Il suggerimento sparisce dopo il salvataggio. */
function PivaSuggerita({ id, suggerimenti }: { id: string; suggerimenti: Dettaglio['piva_da_salvare'] }) {
  const [attesa, setAttesa] = useState<string | null>(null);
  const [salvate, setSalvate] = useState<Set<string>>(new Set());
  const visibili = (suggerimenti ?? []).filter((s) => !salvate.has(s.ruolo));
  if (!visibili.length) return null;
  return (
    <div className="pila">
      {visibili.map((s) => (
        <div key={s.ruolo} className="avviso-variazioni" role="status">
          <Icona nome="avviso" />
          <span>Il {s.ruolo === 'cliente' ? 'cliente' : 'fornitore'} <b>{s.ragione_sociale}</b> non ha la P.IVA nel CRM: il documento riporta <b>{s.piva}</b>.</span>
          <button type="button" className="btn sec piccolo" disabled={attesa === s.ruolo}
            onClick={() => void (async () => {
              setAttesa(s.ruolo);
              const r = await api('documenti/' + id + '/piva', { ruolo: s.ruolo });
              setAttesa(null);
              if (!r.ok) { avviso(r.messaggio, true); return; }
              setSalvate((x) => new Set(x).add(s.ruolo));
              avviso('P.IVA salvata nel CRM: aggiornala anche in Integra');
            })()}>
            {attesa === s.ruolo ? 'Salvo…' : 'Salva la P.IVA'}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Correggi i dati letti (F6-A4b, §6.5 punto 7) ---------- */

/** D-157 §19: la ricerca del cliente nella modale «Apri la pratica» riceve il fornitore scelto lì
 *  come contesto, così la colonna «Cod. cliente» mostra il codice presso quel fornitore.
 *  D-158: se all'apertura manca l'agenzia, un pulsante la crea qui senza uscire dal flusso.
 *  D-159: un'agenzia del vecchio CRM da confermare non apre da sola la pratica: si conferma o si configura. */
/** D-162: dati del 409 `scaglione_mancante` (server), per aprire la finestra delle percentuali lì. */
interface ScaglioneMancante {
  fornitore_id: string;
  fornitore: string;
  sconto: number;
  data: string;
  ha_percentuali: boolean;
}

function ApriPratica({ id, t, clienteIniziale, pivaDaSalvare, onChiudi, onFatto }: { id: string; t: Testata; clienteIniziale: string; pivaDaSalvare: Dettaglio['piva_da_salvare']; onChiudi: () => void; onFatto?: () => void }) {
  const router = useRouter();
  const puoAgenzia = usePuo()('dati.modifica'); // D-106: l'agenzia si salva con dati.modifica
  const puoPercentuali = usePuo()('dati.condizioni'); // D-162: le percentuali sono del responsabile in Dati
  const [fornitoreId, setFornitoreId] = useState(t.fornitore_id ?? '');
  const [clienteId, setClienteId] = useState(clienteIniziale);
  // D-158: coppia senza agenzia (dall'errore di abbina): il pulsante apre FormAgenzia
  const [manca, setManca] = useState<{ cliente_id: string; fornitore_id: string } | null>(null);
  const [agenzia, setAgenzia] = useState<{ cliente_id: string; cliente: string | null; fornitore_id: string; fornitore: string } | null>(null);
  // D-159: agenzia del vecchio CRM da confermare, con la coppia scelta per confermarla o configurarla
  const [daConfermare, setDaConfermare] = useState<{ agenzia: Agenzia; cliente_id: string; fornitore_id: string } | null>(null);
  const [modifica, setModifica] = useState<{ agenzia: Agenzia; cliente_id: string; cliente: string | null; fornitore_id: string; fornitore: string } | null>(null);
  // D-162: scaglione del fornitore mancante, con la coppia scelta per configurare le percentuali lì
  const [scaglione, setScaglione] = useState<{ d: ScaglioneMancante; cliente_id: string; fornitore_id: string } | null>(null);
  const [configuraPct, setConfiguraPct] = useState<{ d: ScaglioneMancante; cliente_id: string; fornitore_id: string } | null>(null);
  // D-170 §19: lasciare la finestra (link del pallino) con una scelta già fatta chiede conferma
  const [conferma, setConferma] = useState<{ risolvi: (si: boolean) => void } | null>(null);
  const linkConferma = () => new Promise<boolean>((risolvi) => setConferma({ risolvi }));

  async function apriAgenzia() {
    if (!manca) return;
    const r = await api<{ cliente: string | null; fornitore: string | null }>('clienti/' + manca.cliente_id + '/agenzia-nuova?fornitore_id=' + manca.fornitore_id);
    if (!r.ok) { avviso(r.messaggio, true); return; }
    setAgenzia({ cliente_id: manca.cliente_id, cliente: r.dati.cliente, fornitore_id: manca.fornitore_id, fornitore: r.dati.fornitore ?? 'Fornitore' });
  }

  /** Apre la pratica (abbina l'ordine). Ritorna il messaggio d'errore o niente; al 409 dell'agenzia
   *  da confermare salva l'agenzia e la coppia per il riquadro, senza aprire. */
  async function apri(cliente: string, fornitore: string) {
    const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/abbina', {
      tipo: 'ordine', numero: t.numero, data: t.data, importo: t.importo ?? undefined,
      cliente_id: Number(cliente), fornitore_id: Number(fornitore),
    });
    if (!r.ok) {
      const d = r.dati as { code?: string; agenzia?: Agenzia; scaglione?: ScaglioneMancante } | null;
      if (r.stato === 409 && d?.code === 'agenzia_da_confermare' && d.agenzia) {
        setDaConfermare({ agenzia: d.agenzia, cliente_id: cliente, fornitore_id: fornitore });
        return r.messaggio;
      }
      if (r.stato === 409 && d?.code === 'scaglione_mancante' && d.scaglione) {
        setScaglione({ d: d.scaglione, cliente_id: cliente, fornitore_id: fornitore });
        return r.messaggio;
      }
      if (r.stato === 409 && /agenzia/.test(r.messaggio)) setManca({ cliente_id: cliente, fornitore_id: fornitore });
      return r.messaggio;
    }
    avviso('Aperta la pratica ' + r.dati.pratica.numero);
    router.push('/pratiche/' + r.dati.pratica.id);
  }

  async function usaQuesta() {
    if (!daConfermare) return;
    const r = await api('clienti/' + daConfermare.cliente_id + '/agenzie/' + daConfermare.agenzia.id + '/conferma', {});
    if (!r.ok) { avviso(r.messaggio, true); return; }
    setDaConfermare(null);
    await apri(daConfermare.cliente_id, daConfermare.fornitore_id);
  }

  function configura() {
    if (!daConfermare) return;
    setModifica({
      agenzia: daConfermare.agenzia,
      cliente_id: daConfermare.cliente_id,
      cliente: null,
      fornitore_id: daConfermare.fornitore_id,
      fornitore: t.fornitore ?? 'Fornitore',
    });
  }

  if (modifica) {
    return (
      <FormAgenzia
        cliente={{ id: modifica.cliente_id, nome: modifica.cliente }}
        agenzia={modifica.agenzia}
        fornitoreFisso={{ id: modifica.fornitore_id, nome: modifica.fornitore }}
        bloccati={['cliente', 'fornitore', 'codice']}
        onSalvata={() => {
          const dc = modifica;
          setModifica(null); setDaConfermare(null); setManca(null); onFatto?.();
          void apri(dc.cliente_id, dc.fornitore_id);
        }}
        onChiudi={() => setModifica(null)}
      />
    );
  }

  if (agenzia) {
    return (
      <FormAgenzia
        cliente={{ id: agenzia.cliente_id, nome: agenzia.cliente }}
        fornitoreFisso={{ id: agenzia.fornitore_id, nome: agenzia.fornitore }}
        iniziali={{ codice_cliente_fornitore: t.codice_cliente, valido_dal: t.data }}
        bloccati={['cliente', 'fornitore', 'codice']}
        onSalvata={() => { setAgenzia(null); setManca(null); onFatto?.(); }}
        onChiudi={() => setAgenzia(null)}
      />
    );
  }

  // D-162: le percentuali del fornitore si configurano qui, poi si riprova ad aprire la pratica
  if (configuraPct) {
    return (
      <FormPercentuali
        idFornitore={configuraPct.d.fornitore_id}
        ragioneSociale={configuraPct.d.fornitore}
        validoDal={configuraPct.d.data}
        validoDalFisso
        sconto={configuraPct.d.sconto}
        scontoFisso
        onSalvata={() => {
          const s = configuraPct;
          setConfiguraPct(null); setScaglione(null); setManca(null); onFatto?.();
          void apri(s.cliente_id, s.fornitore_id);
        }}
        onChiudi={() => setConfiguraPct(null)}
      />
    );
  }

  return (
    <>
    <FormModal titolo="Apri la pratica" conferma="Apri la pratica" colonne={2}
      testo={<>
        La pratica nasce dall’ordine. Cliente e fornitore servono per l’agenzia e la provvigione.
        <PivaSuggerita id={id} suggerimenti={pivaDaSalvare} />
      </>}
      campi={[
        { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: entitaFornitore, largo: true, valore: fornitoreId,
          testoIniziale: t.fornitore ? { q: t.fornitore, mostra: t.fornitore } : undefined,
          nomeIniziale: t.fornitore ?? undefined,
          onCambia: (v) => setFornitoreId(v), link: (id) => '/fornitori/' + id, linkConferma },
        { nome: 'cliente_id', etichetta: 'Cliente', tipo: 'ricerca', entita: entitaCliente, largo: true, valore: clienteId,
          contesto: { fornitore_id: fornitoreId, codice_cliente: t.codice_cliente },
          testoIniziale: t.cliente ? { q: t.cliente, mostra: t.cliente } : undefined,
          nomeIniziale: t.cliente ?? undefined,
          onCambia: (v) => setClienteId(v), link: (id) => '/clienti/' + id, linkConferma },
      ]}
      erroreExtra={(errore) => daConfermare ? (
        <div className="pila">
          <Nota>Agenzia dal vecchio CRM, da confermare: {[
            daConfermare.agenzia.codice_cliente_fornitore ? 'codice ' + daConfermare.agenzia.codice_cliente_fornitore : null,
            'sconto ' + daConfermare.agenzia.sconto + ' %',
            daConfermare.agenzia.subagente ? 'subagente ' + daConfermare.agenzia.subagente : null,
            'dal ' + data(daConfermare.agenzia.valido_dal),
          ].filter(Boolean).join(' · ')}</Nota>
          <div className="azioni-riga">
            <button type="button" className="btn primario" disabled={!puoAgenzia}
              title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined}
              onClick={() => void usaQuesta()}>Usa questa</button>
            <button type="button" className="btn sec" disabled={!puoAgenzia}
              title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined}
              onClick={configura}>Configura</button>
          </div>
        </div>
      ) : scaglione ? (
        <div className="azioni-riga">
          <button type="button" className="btn primario" disabled={!puoPercentuali}
            title={!puoPercentuali ? 'Serve il livello responsabile in Dati' : undefined}
            onClick={() => setConfiguraPct(scaglione)}>Configura le percentuali</button>
        </div>
      ) : (manca && /agenzia/.test(errore)) ? (
        <div className="azioni-riga">
          <button type="button" className="btn primario" disabled={!puoAgenzia}
            title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined}
            onClick={() => void apriAgenzia()}>Aggiungi l’agenzia</button>
        </div>
      ) : null}
      onChiudi={onChiudi}
      onConferma={async (v) => {
        const fornitoreIdFinale = v.fornitore_id || t.fornitore_id;
        if (!v.cliente_id || !fornitoreIdFinale) return 'Scegli cliente e fornitore.';
        return apri(v.cliente_id, fornitoreIdFinale);
      }} />
    {conferma && <Conferma titolo="Dati non salvati" testo="Hai modifiche non salvate: uscire senza salvare?" etichetta="Esci" annulla="Resta"
      onRisposta={(si) => { const c = conferma; setConferma(null); c.risolvi(si); }} />}
    </>
  );
}

interface BozzaRiga {
  i: number | null; codice: string; descrizione: string; quantita: string; prezzo: string; importo: string;
  sconto: string; numero_fattura: string; data_fattura: string; provvigione: string; spesa: boolean;
}
interface Bozza {
  testata: { tipo: string; numero: string; numero_ordine_fornitore: string; data: string; fornitore_id: string; codice_cliente: string; cliente: string; cliente_id: string; piva_cliente: string; piva_fornitore: string; fornitore: string; importo: string; mese: string; anno: string; riferimento_fattura: string };
  righe: BozzaRiga[];
}
const RIGA_KEYS = ['codice', 'descrizione', 'quantita', 'prezzo', 'importo', 'sconto', 'numero_fattura', 'data_fattura', 'provvigione'] as const;
/** Importo calcolato di una riga: quantità × prezzo × (1 − sconto/100); null se mancano quantità o prezzo. */
const importoCalcolato = (r: BozzaRiga) => {
  if (r.quantita.trim() === '' || r.prezzo.trim() === '') return null;
  return (Number(r.quantita) || 0) * (Number(r.prezzo) || 0) * (1 - (Number(r.sconto) || 0) / 100);
};
/** Importo letto diverso dal calcolato (≥ 0,01 €): la riga può passare al calcolato. */
const discordeDaCalcolato = (r: BozzaRiga) => {
  if (r.importo.trim() === '') return false;
  const calc = importoCalcolato(r);
  return calc != null && Math.abs((Number(r.importo) || 0) - calc) >= 0.01;
};
/** Importo di una riga come nel server (`importoRigaLetta`, proposta.ts): quello letto, altrimenti
 *  quantità × prezzo × (1 − sconto/100). La «Somma righe» accanto all'Importo e il piede della tabella
 *  usano la stessa funzione (D-153). */
const importoRiga = (r: BozzaRiga) => {
  if (r.importo.trim() !== '') return Number(r.importo) || 0;
  return importoCalcolato(r) ?? 0;
};
/** Somma delle righe in centesimi interi (mai float), per la «Somma righe» e il piede della tabella. */
const sommaRighe = (righe: BozzaRiga[]) => righe.reduce((s, r) => s + Math.round(importoRiga(r) * 100), 0) / 100;

/** Campo con il bordo dell'affidabilità (giallo 0,70–0,90 · rosso < 0,70 · verde se confermato).
 *  Il ✓ accanto al campo conferma il valore letto: da lì non conta più fra i punti da controllare. */
function CampoLetto({ x, etichetta, verificato, onConferma, soglie, sopra, children }: {
  x: Campo | undefined; etichetta: string; verificato: boolean; onConferma?: () => void; soglie: Soglie; sopra?: ReactNode; children: ReactNode;
}) {
  const a = x?.affidabilita ?? null;
  const incerto = a != null && !verificato && a < soglie.soglia_ok;
  return (
    <div className={'campo-letto ' + classeAff(a, verificato, soglie)}>
      <label>{etichetta}{incerto && <span className="aff">{Math.round(a * 100)}%</span>}{sopra}</label>
      <div className="campo-riga">
        {children}
        {verificato && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: ' + etichetta}>✓</span>}
        {incerto && <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo" aria-label={'Conferma ' + etichetta} onClick={onConferma}>✓</button>}
      </div>
    </div>
  );
}

function FinestraCorreggi({ d, onChiudi, onSalvato, onRileggi }: { d: Dettaglio; onChiudi: () => void; onSalvato: (x: Dettaglio) => void; onRileggi?: () => void }) {
  const [b, setB] = useState<Bozza>(() => ({
    testata: {
      tipo: d.testata.tipo ?? 'altro', numero: d.testata.numero ?? '', data: d.testata.data ?? '',
      numero_ordine_fornitore: d.testata.numero_ordine_fornitore ?? '',
      fornitore_id: d.testata.fornitore_id ?? '', codice_cliente: d.testata.codice_cliente ?? '',
      cliente: d.testata.cliente ?? '', cliente_id: d.testata.cliente_id ?? d.proposta.abbinamento?.cliente_id ?? d.proposta.cliente_riconosciuto?.cliente_id ?? '', piva_cliente: d.testata.piva_cliente ?? '', piva_fornitore: d.testata.piva_fornitore ?? '', fornitore: d.testata.fornitore ?? '',
      importo: d.testata.importo == null ? '' : String(d.testata.importo),
      mese: d.testata.mese == null ? '' : String(d.testata.mese), anno: d.testata.anno == null ? '' : String(d.testata.anno),
      riferimento_fattura: d.testata.riferimento_fattura ?? '',
    },
    righe: d.righe.map((r) => ({
      i: r.i, codice: r.codice ?? '', descrizione: r.descrizione ?? '',
      quantita: r.quantita == null ? '' : String(r.quantita), prezzo: r.prezzo == null ? '' : String(r.prezzo),
      importo: r.importo == null ? '' : String(r.importo), sconto: r.sconto == null ? '' : String(r.sconto),
      numero_fattura: r.numero_fattura ?? '',
      data_fattura: r.data_fattura ?? '', provvigione: r.provvigione == null ? '' : String(r.provvigione),
      spesa: !!r.spesa,
    })),
  }));
  const [campo, setCampo] = useState<string | null>(null);
  const [riepAperto, setRiepAperto] = useState(false); // D-153: riepilogo chiuso di default
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [ricavando, setRicavando] = useState(false);
  const [sporco, setSporco] = useState(false); // D-170 §19: correzioni non salvate → conferma prima di uscire
  const [confermaUscita, setConfermaUscita] = useState<{ testo: string; risolvi: (si: boolean) => void } | null>(null);
  const [chiediRileggi, setChiediRileggi] = useState(false); // D-172: conferma prima di rileggere dal piede
  const [nuovaRiga, setNuovaRiga] = useState<number | null>(null);
  // per l'Esc: c'è sopra una conferma (uscita o rileggi)? Allora Esc non chiude la finestra intera
  const confermaAperta = useRef(false);
  confermaAperta.current = !!confermaUscita || chiediRileggi;
  // campi già validati (dal server o con il ✓ in questa finestra): non sono più punti da controllare
  const [verificati, setVerificati] = useState<Set<string>>(() => new Set(d.campi.filter((c) => c.verificato).map((c) => c.campo)));
  const af = useMemo(() => new Map(d.campi.map((c) => [c.campo, c])), [d.campi]);
  const boll = b.testata.tipo === 'bollettino';
  // D-154: il pulsante › accanto al campo letto porta il nome nella ricerca e apre il menu (comando
  // esterno, prop `cerca`). Nei moduli (Apri la pratica, Registra il bollettino) il campo letto non c'è,
  // quindi il nome compare come «Letto: … · Cerca questo» (testoIniziale, resta com'è).
  const lettoFornitore = b.testata.fornitore ? { q: b.testata.fornitore } : undefined;
  const [cercaCliente, setCercaCliente] = useState(0);
  const [cercaFornitore, setCercaFornitore] = useState(0);
  const verificato = (k: string) => verificati.has(k);
  const conferma = (k: string) => setVerificati((s) => s.has(k) ? s : new Set(s).add(k));
  const campoSi = (k: string, etichetta: string, children: ReactNode, senzaAff = false) => (
    <CampoLetto x={senzaAff ? undefined : af.get(k)} etichetta={etichetta} verificato={verificato(k)} onConferma={() => conferma(k)} soglie={d.soglie}>{children}</CampoLetto>
  );

  useEffect(() => {
    // Esc chiude la finestra, ma non quando c'è sopra una conferma (D-172): lì Esc annulla solo quella
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confermaAperta.current) onChiudi(); };
    document.addEventListener('keydown', tasto);
    return () => document.removeEventListener('keydown', tasto);
  }, [onChiudi]);

  // D-151: la riga aggiunta si porta in vista e il fuoco va sul suo primo campo
  useEffect(() => {
    if (nuovaRiga == null) return;
    const riga = document.querySelector<HTMLElement>(`[data-riga="${nuovaRiga}"]`);
    riga?.scrollIntoView({ block: 'nearest' });
    riga?.querySelector('input')?.focus();
    setNuovaRiga(null);
  }, [nuovaRiga]);

  const t = (k: keyof Bozza['testata'], v: string) => { setSporco(true); setB((x) => ({ ...x, testata: { ...x.testata, [k]: v } })); };
  const r = (idx: number, k: keyof BozzaRiga, v: string) => { setSporco(true); setB((x) => ({ ...x, righe: x.righe.map((z, j) => j === idx ? { ...z, [k]: v } : z) })); };
  const campoRiga = (riga: BozzaRiga, idx: number, k: string) => `righe[${riga.i ?? idx}].${k}`;
  const pos = campo ? af.get(campo) : null;
  const pagina = pos?.posizione?.pagina;
  // un campo scelto senza posizione: la nota «Posizione del campo non disponibile» va sopra il visualizzatore
  const mancaPosizione = campo != null && !pos?.posizione;
  // punti ancora aperti: controlli falliti + campi incerti non confermati (si aggiorna a ogni ✓)
  const restanti = d.campi.filter((c) => c.campo !== 'tipo' && !verificato(c.campo) && c.affidabilita != null
    && c.affidabilita < d.soglie.soglia_ok && (c.valore_finale ?? c.valore_letto) != null);
  // D-176: i punti si dividono in due gruppi: lettura (il livello) e confronto con la pratica (l'abbinamento)
  const controlliLettura = d.controlli.filter((c) => c.gruppo !== 'confronto');
  const controlliConfronto = d.controlli.filter((c) => c.gruppo === 'confronto');
  const nLettura = controlliLettura.length + restanti.length;
  const nPunti = nLettura + controlliConfronto.length;
  const bassa = controlliLettura.some((c) => c.grave) || restanti.some((c) => (c.affidabilita ?? 1) < d.soglie.soglia_bassa);

  // D-154: «Somma righe» sopra l'Importo, sulla riga dell'etichetta, allineata a destra (solo anteprima,
  // mai salvata). Stessa funzione del piede. Spunta verde se uguale, avviso con la differenza se diversa.
  const somma = sommaRighe(b.righe);
  const haImporto = b.testata.importo.trim() !== '';
  const importo = haImporto ? Number(b.testata.importo) : 0;
  const diff = Math.round((importo - somma) * 100) / 100;
  const uguali = haImporto && Math.abs(diff) < 0.01;
  // Ugo 15/11/2026: niente «· diversa di …» accanto alla somma (allargava la colonna e faceva
  // comparire la barra orizzontale): il testo va a capo, la differenza resta nel title ed è rossa.
  const sommaSopra = (
    <span className={'sopra-riga' + (haImporto && !uguali ? ' diversa' : '')}
      title={uguali ? 'Somma righe uguale all’importo'
        : haImporto ? `Somma righe diversa dall’importo di ${euro(Math.abs(diff))} (può essere IVA inclusa)`
        : 'Importo non indicato'}>
      {uguali && <span className="spunta-ok" aria-label="Somma righe uguale all'importo">✓</span>}
      Somma righe {euro(somma)}
    </span>
  );

  // quante righe hanno l'importo letto diverso dal calcolato: il pulsante le porta tutte al calcolato
  const nDiscordi = boll ? 0 : b.righe.filter(discordeDaCalcolato).length;

  // porta l'attenzione sul campo di un punto (controllo o campo incerto) selezionato dall'elenco
  const saltaAl = (nome: string) => {
    setCampo(nome);
    const mappa: Record<string, string> = { importo_totale: 'importo', totale: 'importo' };
    const el = document.querySelector<HTMLElement>(`[data-campo="${mappa[nome] ?? nome}"]`);
    el?.scrollIntoView({ block: 'nearest' });
    el?.focus();
  };

  /** D-170: ricava il numero d'ordine del fornitore dal testo già letto, senza rileggere. */
  async function ricavaOrdine() {
    if (ricavando) return;
    setRicavando(true);
    setErrore('');
    try {
      const r = await api<{ esito: string; numero?: string; messaggio?: string }>('documenti/' + d.id + '/ricava-ordine', {});
      if (!r.ok) { setErrore(r.messaggio); return; }
      if (r.dati.esito === 'trovato' && r.dati.numero) t('numero_ordine_fornitore', r.dati.numero);
      else setErrore(r.dati.messaggio ?? '');
    } finally {
      setRicavando(false);
    }
  }

  /** D-170 §19: prima di lasciare la finestra con correzioni non salvate chiede conferma (Esci / Resta). */
  const linkConferma = () => {
    if (!sporco) return true;
    return new Promise<boolean>((risolvi) => setConfermaUscita({ testo: 'Hai correzioni non salvate: uscire senza salvare?', risolvi }));
  };

  async function salva() {
    if (!boll && b.testata.tipo !== 'pagamento' && !b.testata.numero.trim()) { setErrore('Il numero del documento è obbligatorio.'); return; }
    setErrore(''); setAttesa(true);
    try {
      const testata = boll
        ? { tipo: 'bollettino', fornitore_id: b.testata.fornitore_id || null, fornitore: b.testata.fornitore, mese: b.testata.mese || null, anno: b.testata.anno || null }
        : {
          tipo: b.testata.tipo, numero: b.testata.numero, data: b.testata.data, fornitore_id: b.testata.fornitore_id || null,
          numero_ordine_fornitore: b.testata.numero_ordine_fornitore,
          fornitore: b.testata.fornitore, piva_cliente: b.testata.piva_cliente, piva_fornitore: b.testata.piva_fornitore,
          codice_cliente: b.testata.codice_cliente, cliente: b.testata.cliente, cliente_id: b.testata.cliente_id || null, importo: b.testata.importo,
          riferimento_fattura: b.testata.riferimento_fattura,
        };
      const righe = b.righe
        .filter((x) => x.i != null || RIGA_KEYS.some((k) => x[k].trim() !== '') || x.spesa)
        .map((x) => ({ i: x.i, ...Object.fromEntries(RIGA_KEYS.map((k) => [k, x[k]])), spesa: x.spesa }));
      // i ✓ valgono per campo: il server segna verificati solo questi (e i valori cambiati)
      const verificatiInviati = [...verificati].filter((k) => !k.startsWith('righe[new-'));
      const res = await api<Dettaglio>('documenti/' + d.id, { testata, righe, verificati: verificatiInviati }, 'PUT');
      if (!res.ok) { setErrore(res.messaggio); return; }
      onSalvato(res.dati);
    } finally {
      setAttesa(false);
    }
  }

  return (
    <>
    <div className="velo velo-pieno" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="affiancata" role="dialog" aria-modal="true" aria-label={'Correggi i dati letti · ' + titoloDoc(b.testata.tipo, b.testata.numero || null, b.testata.data || null, b.testata.importo ? Number(b.testata.importo) : null, d.file_nome)}>
        <div className="aff-testa" style={{ padding: '14px 20px' }}>
          <div>
            <h2>Correggi i dati letti · {titoloDoc(b.testata.tipo, b.testata.numero || null, b.testata.data || null, b.testata.importo ? Number(b.testata.importo) : null, d.file_nome)}</h2>
            <p className="testo-tenue">A sinistra il documento, a destra i dati letti. Correggi o conferma i campi bordati.</p>
          </div>
          <button type="button" className="btn-chiudi" onClick={onChiudi} aria-label="Chiudi"><Icona nome="chiudi" /></button>
        </div>
        <div className="aff-corpo">
          <div className="aff-sx aff-pdf">
            <FileDocumento d={d} pagina={pagina} posizione={pos?.posizione ?? null} mancaPosizione={mancaPosizione} />
          </div>
          <div className="aff-dx">
            {pos?.posizione ? (
              <p className="testo-tenue" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
                {d.file_tipo === 'pdf'
                  ? `Pagina ${pagina ?? 1} · ${pos.precisione === 'approssimata' ? 'posizione approssimativa, controlla sul documento' : 'posizione indicativa'}`
                  : pos.precisione === 'approssimata'
                    ? 'Posizione approssimativa, controlla sul documento'
                    : 'Posizione indicativa'}
              </p>
            ) : !campo ? (
              <p className="testo-tenue" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
                Seleziona un campo per vedere dove è stato letto sul documento (indicativo).
              </p>
            ) : null}
            <div className="aff-riepilogo">
              <button type="button" className="riep-testa" aria-expanded={riepAperto} aria-controls="aff-riep-elenco"
                disabled={!nPunti} onClick={() => setRiepAperto((v) => !v)}>
                <Stato v={bassa ? 'errore' : nLettura ? 'attesa' : 'ok'}>
                  {bassa ? 'Affidabilità bassa' : nLettura ? 'Da controllare' : 'Lettura affidabile'}
                </Stato>
                <span>{nPunti ? nPunti + (nPunti === 1 ? ' punto da controllare' : ' punti da controllare') : 'tutti i campi sono controllati'}</span>
                {nPunti > 0 && <span className="riep-freccia" aria-hidden="true">{riepAperto ? '▾' : '▸'}</span>}
              </button>
              {nPunti > 0 && (
                <ul id="aff-riep-elenco" hidden={!riepAperto}>
                  {nLettura > 0 && (
                    <>
                      <li className="riep-gruppo">Lettura</li>
                      {controlliLettura.map((c) => (
                        <li key={c.codice + c.campo} className={c.grave ? 'grave' : ''}>
                          <button type="button" className="btn testo" onClick={() => saltaAl(c.campo)}>{c.testo}</button>
                        </li>
                      ))}
                      {restanti.map((c) => (
                        <li key={c.campo}>
                          <button type="button" className="btn testo" onClick={() => saltaAl(c.campo)}>{NOME_CAMPO[c.campo] ?? c.campo} · {Math.round((c.affidabilita ?? 0) * 100)}%</button>
                        </li>
                      ))}
                    </>
                  )}
                  {controlliConfronto.length > 0 && (
                    <>
                      <li className="riep-gruppo">Confronto con la pratica</li>
                      {controlliConfronto.map((c) => (
                        <li key={c.codice + c.campo} className={c.grave ? 'grave' : ''}>
                          <button type="button" className="btn testo" onClick={() => saltaAl(c.campo)}>{c.testo}</button>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              )}
            </div>
            <PivaSuggerita id={d.id} suggerimenti={d.piva_da_salvare} />
            <h3>Testata</h3>
            {boll ? (
              <div className="griglia-letti">
                {campoSi('fornitore_id', 'Fornitore',
                  <CampoRicerca entita={entitaFornitore} valore={b.testata.fornitore_id} onChange={(v) => t('fornitore_id', v)} testoIniziale={lettoFornitore} link={(id) => '/fornitori/' + id} />)}
                {campoSi('fornitore', 'Fornitore letto',
                  <input data-campo="fornitore" value={b.testata.fornitore} onFocus={() => setCampo('fornitore')} onChange={(e) => t('fornitore', e.target.value)} />)}
                {campoSi('mese', 'Mese',
                  <select data-campo="mese" value={b.testata.mese} onFocus={() => setCampo('mese')} onChange={(e) => t('mese', e.target.value)}>
                    {MESI.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                  </select>)}
                {campoSi('anno', 'Anno',
                  <input data-campo="anno" type="number" value={b.testata.anno} onFocus={() => setCampo('anno')} onChange={(e) => t('anno', e.target.value)} />)}
              </div>
            ) : (
              <>
                <div className="riga-letti tipo">
                  {campoSi('tipo', 'Tipo',
                    <select data-campo="tipo" value={b.testata.tipo} onFocus={() => setCampo('tipo')} onChange={(e) => t('tipo', e.target.value)}>
                      {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>, true)}
                  {campoSi('numero', b.testata.tipo === 'pagamento' ? 'Riferimento (facoltativo)' : 'Numero',
                    <input data-campo="numero" value={b.testata.numero} onFocus={() => setCampo('numero')} onChange={(e) => t('numero', e.target.value)} />)}
                  <CampoLetto x={af.get('numero_ordine_fornitore')} etichetta="Ordine fornitore" verificato={verificato('numero_ordine_fornitore')} onConferma={() => conferma('numero_ordine_fornitore')} soglie={d.soglie}
                    sopra={!b.testata.numero_ordine_fornitore.trim() && d.lettura_grezza ? (
                      <button type="button" className="btn testo piccolo" disabled={ricavando} onClick={() => void ricavaOrdine()}
                        title="Ricava il numero d’ordine dal testo già letto">
                        {ricavando ? '…' : 'Ricava dal testo'}
                      </button>
                    ) : undefined}>
                    <input data-campo="numero_ordine_fornitore" value={b.testata.numero_ordine_fornitore} onFocus={() => setCampo('numero_ordine_fornitore')} onChange={(e) => t('numero_ordine_fornitore', e.target.value)} />
                  </CampoLetto>
                  {campoSi('data', 'Data',
                    <input data-campo="data" type="date" value={b.testata.data} onFocus={() => setCampo('data')} onChange={(e) => t('data', e.target.value)} />)}
                  <CampoLetto x={af.get('importo_totale')} etichetta="Importo" verificato={verificato('importo_totale')} onConferma={() => conferma('importo_totale')} soglie={d.soglie} sopra={sommaSopra}>
                    <CampoEuro dataCampo="importo" valore={b.testata.importo} onFocus={() => setCampo('importo_totale')} onChange={(v) => t('importo', v)} />
                  </CampoLetto>
                  {b.testata.tipo === 'nota_credito' &&
                    campoSi('riferimento_fattura', 'Fattura stornata',
                      <input data-campo="riferimento_fattura" value={b.testata.riferimento_fattura} onFocus={() => setCampo('riferimento_fattura')} onChange={(e) => t('riferimento_fattura', e.target.value)} />)}
                </div>
                <div className="riga-letti cliente">
                  {campoSi('cliente', 'Cliente letto',
                    <input data-campo="cliente" value={b.testata.cliente} onFocus={() => setCampo('cliente')} onChange={(e) => t('cliente', e.target.value)} />)}
                  <button type="button" className="btn-arrow" aria-label="Cerca il cliente letto" title="Cerca il cliente letto"
                    disabled={!b.testata.cliente.trim() || !!b.testata.cliente_id} onClick={() => setCercaCliente((n) => n + 1)}>›</button>
                  {campoSi('cliente_id', 'Cliente',
                    <CampoRicerca entita={entitaCliente} contesto={{ fornitore_id: b.testata.fornitore_id, codice_cliente: b.testata.codice_cliente }} valore={b.testata.cliente_id} onChange={(v) => t('cliente_id', v)} cerca={{ q: b.testata.cliente, n: cercaCliente }} link={(id) => '/clienti/' + id} linkConferma={linkConferma}
                      onScelto={(r) => { const c = r as { piva?: string }; if (!b.testata.piva_cliente.trim()) t('piva_cliente', c.piva ?? ''); }} />)}
                  {campoSi('codice_cliente', 'Codice cliente',
                    <input data-campo="codice_cliente" value={b.testata.codice_cliente} onFocus={() => setCampo('codice_cliente')} onChange={(e) => t('codice_cliente', e.target.value)} />)}
                  {campoSi('piva_cliente', 'P.IVA cliente',
                    <input data-campo="piva_cliente" value={b.testata.piva_cliente} onFocus={() => setCampo('piva_cliente')} onChange={(e) => t('piva_cliente', e.target.value)} />)}
                </div>
                <div className="riga-letti fornitore">
                  {campoSi('fornitore', 'Fornitore letto',
                    <input data-campo="fornitore" value={b.testata.fornitore} onFocus={() => setCampo('fornitore')} onChange={(e) => t('fornitore', e.target.value)} />)}
                  <button type="button" className="btn-arrow" aria-label="Cerca il fornitore letto" title="Cerca il fornitore letto"
                    disabled={!b.testata.fornitore.trim() || !!b.testata.fornitore_id} onClick={() => setCercaFornitore((n) => n + 1)}>›</button>
                  {campoSi('fornitore_id', 'Fornitore',
                    <CampoRicerca entita={entitaFornitore} valore={b.testata.fornitore_id} onChange={(v) => t('fornitore_id', v)} cerca={{ q: b.testata.fornitore, n: cercaFornitore }} link={(id) => '/fornitori/' + id} linkConferma={linkConferma} />)}
                  {campoSi('piva_fornitore', 'P.IVA fornitore',
                    <input data-campo="piva_fornitore" value={b.testata.piva_fornitore} onFocus={() => setCampo('piva_fornitore')} onChange={(e) => t('piva_fornitore', e.target.value)} />)}
                </div>
              </>
            )}
            <div className="righe-testa">
              <h3>Righe <span className="testo-tenue">{b.righe.length}</span></h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {nDiscordi > 0 && (
                  <button type="button" className="btn sec piccolo" title="Metti il calcolato su tutte le righe diverse"
                    onClick={() => {
                      setSporco(true);
                      setB((x) => ({ ...x, righe: x.righe.map((z) => discordeDaCalcolato(z) ? { ...z, importo: '' } : z) }));
                    }}>
                    Usa importi calcolati ({nDiscordi})
                  </button>
                )}
                <button type="button" className="btn sec piccolo" onClick={() => {
                  setB((x) => ({ ...x, righe: [...x.righe, { i: null, codice: '', descrizione: '', quantita: '', prezzo: '', importo: '', sconto: '', numero_fattura: '', data_fattura: '', provvigione: '', spesa: false }] }));
                  setNuovaRiga(b.righe.length);
                }}>
                  <Icona nome="piu" />Aggiungi riga
                </button>
              </div>
            </div>
            <div className="tab-righe-box">
              <table className="tab-righe">
                <thead>
                  <tr>
                    <th>#</th>
                    {boll ? <><th>Documento</th><th>Data</th><th className="dx">Imponibile</th><th className="dx">Provvigione</th></>
                      : <><th>Articolo</th><th className="largo">Descrizione</th><th className="dx">Quantità</th><th className="dx">Prezzo</th><th className="dx">Sconto</th><th className="dx">Importo</th><th className="dx">Spesa</th></>}
                    <th aria-label="Elimina" />
                  </tr>
                </thead>
                <tbody>
                  {b.righe.map((x, idx) => {
                    const cella = (k: keyof BozzaRiga, tipo: 'text' | 'number' | 'euro' | 'date' = 'text') => {
                      const c = campoRiga(x, idx, k);
                      // una riga nuova non ha affidabilità: la chiave non deve scontrarsi con una riga tolta
                      const keyAff = x.i != null ? c : `righe[new-${idx}].${k}`;
                      const aff = af.get(keyAff)?.affidabilita ?? null;
                      const ver = verificato(keyAff);
                      const extra = k === 'descrizione' ? 'largo ' : k === 'codice' || k === 'numero_fattura' ? 'col-codice ' : '';
                      return (
                          <td key={k} className={extra + classeAff(aff, ver, d.soglie)}>
                          <div className="campo-riga">
                            {tipo === 'number' || tipo === 'euro'
                              ? <CampoEuro dataCampo={c} valore={String(x[k] ?? '')} valuta={tipo === 'euro'}
                                  onFocus={() => setCampo(keyAff)} onChange={(v) => { r(idx, k, v); conferma(keyAff); }} />
                              : <input data-campo={c} type={tipo} value={String(x[k] ?? '')}
                                  onFocus={() => setCampo(keyAff)} onChange={(e) => { r(idx, k, e.target.value); conferma(keyAff); }} />}
                            {ver && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: riga ' + (idx + 1)}>✓</span>}
                            {aff != null && !ver && aff < d.soglie.soglia_ok && (
                              <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo"
                                aria-label={'Conferma la riga ' + (idx + 1)} onClick={() => conferma(keyAff)}>✓</button>
                            )}
                          </div>
                        </td>
                      );
                    };
                    // Importo calcolato o letto: calcolato = cella grigia «calcolato», non modificabile,
                    // si aggiorna da sé al cambio di quantità/prezzo/sconto. Letto = modificabile; se
                    // discorde dal calcolato (≥ 0,01 €) cella in arancio con l'avviso e «Usa … €» che lo
                    // sostituisce col calcolato (importo vuoto → calcolato). Il server ricalcola il vuoto (V12).
                    const cellaImporto = (x: BozzaRiga, idx: number) => {
                      const c = campoRiga(x, idx, 'importo');
                      const keyAff = x.i != null ? c : `righe[new-${idx}].importo`;
                      const aff = af.get(keyAff)?.affidabilita ?? null;
                      const ver = verificato(keyAff);
                      const letto = x.importo.trim() !== '';
                      const calc = importoCalcolato(x);
                      const discorde = discordeDaCalcolato(x);
                      const avviso = discorde && calc != null
                        ? `quantità × prezzo ${euro(calc)} diverso dall'importo ${euro(x.importo)}`
                        : undefined;
                      if (!letto) {
                        return (
                          <td key="importo" className="dx calcolato" title="Importo calcolato: quantità × prezzo × (1 − sconto/100)">
                            <span>{calc != null ? <>calcolato · {euro(calc)}</> : 'calcolato'}</span>
                          </td>
                        );
                      }
                      return (
                        <td key="importo" className={'dx ' + (discorde ? 'importo-discorde ' : '') + classeAff(aff, ver, d.soglie)} title={avviso}>
                          <div className="campo-riga">
                            <CampoEuro dataCampo={c} valore={String(x.importo)} valuta
                              onFocus={() => setCampo(keyAff)} onChange={(v) => { r(idx, 'importo', v); conferma(keyAff); }} />
                            {ver && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: importo riga ' + (idx + 1)}>✓</span>}
                            {aff != null && !ver && aff < d.soglie.soglia_ok && (
                              <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo"
                                aria-label={'Conferma l’importo della riga ' + (idx + 1)} onClick={() => conferma(keyAff)}>✓</button>
                            )}
                            {discorde && calc != null && (
                              <button type="button" className="usa-calcolato" title={avviso}
                                aria-label={'Usa l’importo calcolato ' + euro(calc)}
                                onClick={() => r(idx, 'importo', '')}>Usa {euro(calc)}</button>
                            )}
                          </div>
                        </td>
                      );
                    };
                    return (
                      <tr key={idx} data-riga={idx} className={x.i == null ? 'nuova' : undefined}>
                        <td className="testo-tenue">{idx + 1}</td>
                        {boll ? <>{cella('numero_fattura')}{cella('data_fattura', 'date')}{cella('importo', 'euro')}{cella('provvigione', 'euro')}</>
                          : <>{cella('codice')}{cella('descrizione')}{cella('quantita', 'number')}{cella('prezzo', 'euro')}{cella('sconto', 'number')}{cellaImporto(x, idx)}
                            <td className="dx"><input type="checkbox" checked={x.spesa} aria-label={'Riga ' + (idx + 1) + ' di spesa'}
                              title="Spesa (trasporto, imballo): non è merce, esce dallo sconto medio e dalla base"
                              onChange={(e) => { setSporco(true); setB((z) => ({ ...z, righe: z.righe.map((y, j) => j === idx ? { ...y, spesa: e.target.checked } : y) })); }} /></td>
                          </>}
                        <td><button type="button" className="btn testo piccolo" title="Elimina la riga" aria-label={'Elimina la riga ' + (idx + 1)}
                          onClick={() => setB((z) => ({ ...z, righe: z.righe.filter((_, j) => j !== idx) }))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={boll ? 4 : 7} className="testo-tenue">Totale</td>
                    <td className="dx">{euro(boll ? b.righe.reduce((s, r) => s + (Number(r.provvigione) || 0), 0) : sommaRighe(b.righe))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
          </div>
        </div>
        <div className="aff-piede" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--bordo-tenue)' }}>
          {onRileggi && <button type="button" className="btn sec" style={{ marginRight: 'auto' }} disabled={attesa} onClick={() => setChiediRileggi(true)}>Rileggi il documento</button>}
          <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
          <button type="button" className="btn" onClick={() => void salva()} disabled={attesa}>{attesa ? 'Attendi…' : 'Salva e ricalcola l’abbinamento'}</button>
        </div>
      </div>
    </div>
    {confermaUscita && <Conferma titolo="Correzioni non salvate" testo={confermaUscita.testo} etichetta="Esci" annulla="Resta"
      onRisposta={(si) => { const c = confermaUscita; setConfermaUscita(null); c.risolvi(si); }} />}
    {chiediRileggi && <ConfermaRileggi onRisposta={(si) => { setChiediRileggi(false); if (si) onRileggi?.(); }} />}
    </>
  );
}
