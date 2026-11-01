'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Campo } from '@/componenti/Campo';
import { CampoRicerca } from '@/componenti/CampoRicerca';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { Binario, Caricamento, Cerniera, ElencoSelezionabile, Elenco, GruppiDaFare, ListaDaFare, Matrice, Periodi, Scelte } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { Grafico, COLORI_GRAFICI } from '@/componenti/Grafico';
import { Icona } from '@/componenti/Icona';
import { Cifre, KpiRow } from '@/componenti/Kpi';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { PeriodoMesi } from '@/componenti/PeriodoMesi';
import { avviso, Dettagli, Stato } from '@/componenti/Piccoli';
import { RiepilogoFiltri } from '@/componenti/RiepilogoFiltri';
import { Schede } from '@/componenti/Schede';
import type { Entita } from '@/lib/entita';
import { euro } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Catalogo dei componenti (voce Componenti, come #/componenti del prototipo): un esempio dal vivo per
// componente, con i parametri. I dati di esempio stanno SOLO qui: i componenti non ne hanno (V12).
// Solo per gli amministratori (la voce della barra chiede sistema.utenti; il guscio ricontrolla).

interface Riga { codice: string; cliente: string; data: string; importo: number; pct: number; stato: 'ok' | 'attesa' | 'errore' }
const RIGHE: Riga[] = [
  { codice: 'K-10122', cliente: 'Arredo Bagno Rossi', data: '2026-08-12', importo: 4820.5, pct: 17.5, stato: 'ok' },
  { codice: 'GA-2271', cliente: 'Ceramiche Verdi', data: '2026-07-30', importo: 1240, pct: 12, stato: 'attesa' },
  { codice: 'IN-3150', cliente: 'Casa & Stile', data: '2026-08-21', importo: -310.2, pct: 15, stato: 'errore' },
  { codice: 'K-10140', cliente: 'Bianchi Interni', data: '2026-06-03', importo: 9120, pct: 17.5, stato: 'ok' },
  { codice: 'GA-2290', cliente: 'Ferri Design', data: '2026-08-02', importo: 2210.75, pct: 12, stato: 'ok' },
  { codice: 'IN-3166', cliente: 'Studio Lupi', data: '2026-05-18', importo: 640, pct: 15, stato: 'attesa' },
];
const ST = { ok: ['ok', 'Liquidabile'], attesa: ['attesa', 'In attesa'], errore: ['errore', 'Contestata'] } as const;
const COLONNE: Colonna<Riga>[] = [
  { key: 'codice', header: 'Codice' },
  { key: 'cliente', header: 'Cliente', grow: true },
  { key: 'data', header: 'Data', tipo: 'data' },
  { key: 'importo', header: 'Importo', tipo: 'euro', totale: 'somma' },
  { key: 'pct', header: '%', tipo: 'pct' },
  { key: 'stato', header: 'Stato', cell: (r) => <Stato v={ST[r.stato][0]}>{ST[r.stato][1]}</Stato> },
];

// Entità di esempio (nell'app: dal server, /api/lookup/*)
interface Anag { id: string; nome: string; dettaglio: string; attivo?: boolean }
const entitaDi = (titolo: string, voci: Anag[]): Entita<Anag> => ({
  titolo, voci: () => voci, chiave: (r) => r.id, testo: (r) => r.nome, dettaglio: (r) => r.dettaglio, attiva: (r) => r.attivo !== false,
  colonne: [{ key: 'nome', header: titolo, grow: true }, { key: 'dettaglio', header: 'Dettaglio' }],
});
const FORNITORI = entitaDi('Fornitore', [
  { id: '1', nome: 'Gries Deco Company', dettaglio: 'paga sul maturato' }, { id: '2', nome: 'Gasper', dettaglio: 'paga sul fatturato' },
  { id: '3', nome: 'Ing’s', dettaglio: 'paga sul fatturato' }, { id: '4', nome: 'Nordgarten', dettaglio: 'paga sul maturato' },
]);
const SUBAGENTI = entitaDi('Subagente', [
  { id: '1', nome: 'Mario Bianchi', dettaglio: 'mario@esempio.it' }, { id: '2', nome: 'Laura Neri', dettaglio: 'laura@esempio.it' },
  { id: '3', nome: 'Paolo Riva', dettaglio: 'cessato', attivo: false },
]);
const CLIENTI = entitaDi('Cliente', RIGHE.map((r, i) => ({ id: 'IT0' + i, nome: r.cliente, dettaglio: 'P.IVA IT0' + i })));

const prova = () => avviso('Azione di prova');

function DemoFiltri() {
  // la barra e i suoi valori si ricordano tornando alla pagina (§7.12)
  const [v, setV] = useMemoria<Valori>('catalogo-filtri', { stato: 'tutte', q: '', fornitori: [], clienti: [] });
  const q = String(v.q).toLowerCase(), cl = v.clienti as string[];
  // D-23: il numero di ogni segmento conta le righe con TUTTI gli altri filtri, tranne il segmento stesso
  const senzaStato = useMemo(() => RIGHE.filter((r) => r.cliente.toLowerCase().includes(q) && (!cl.length || cl.includes('IT0' + RIGHE.indexOf(r)))), [q, cl]);
  const conta = (s: string) => senzaStato.filter((r) => s === 'tutte' || r.stato === s).length;
  const righe = senzaStato.filter((r) => v.stato === 'tutte' || r.stato === v.stato);
  return <>
    <FilterBar valori={v} onChange={setV} riepilogo campi={[
      { nome: 'stato', tipo: 'segmenti', opzioni: [{ value: 'tutte', label: 'Tutte', n: conta('tutte') }, { value: 'ok', label: 'Liquidabili', n: conta('ok') }, { value: 'attesa', label: 'In attesa', n: conta('attesa') }, { value: 'errore', label: 'Contestate', n: conta('errore') }] },
      { nome: 'q', tipo: 'cerca', placeholder: 'Cerca cliente' },
      { nome: 'clienti', tipo: 'ricerca', entita: CLIENTI, multipla: true, placeholder: 'Tutti i clienti' },
    ]} />
    <DataTable compatta naturale righe={righe} colonne={COLONNE} chiave={(r) => r.codice} filtro={JSON.stringify(v)} />
  </>;
}

function DemoRicerca() {
  const [sub, setSub] = useState(['1']);
  const [forn, setForn] = useState('1');
  return <div className="modulo modulo-2" style={{ alignItems: 'start' }}>
    <div className="campo"><label htmlFor="d-f">Fornitore (singola)</label><CampoRicerca id="d-f" entita={FORNITORI} valore={forn} onChange={setForn} /></div>
    <div className="campo"><label htmlFor="d-s">Subagenti (selezione multipla)</label><CampoRicerca id="d-s" entita={SUBAGENTI} multipla valori={sub} onChange={setSub} placeholder="Tutti i subagenti" /></div>
    <p className="nota">Scelti: fornitore {forn || '—'} · subagenti {sub.join(', ') || 'tutti'}</p>
  </div>;
}

function DemoFinestre() {
  const [f, setF] = useState<ReactNode>(null);
  const chiudi = () => setF(null);
  return <>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="btn" onClick={() => setF(<FormModal titolo="Contesta la riga F-0912" testo="Il motivo è obbligatorio." conferma="Contesta" pericolo onChiudi={chiudi}
        campi={[{ nome: 'motivo', etichetta: 'Motivo' }, { nome: 'fornitore', etichetta: 'Fornitore', tipo: 'ricerca', entita: FORNITORI }]}
        onConferma={async (v) => { if (!v.motivo) return 'Scrivi il motivo.'; avviso('Contestata: ' + v.motivo); }} />)}>FormModal</button>
      <button type="button" className="btn sec" onClick={() => setF(<Conferma titolo="Chiudere il trimestre?" testo="Gli importi vengono fissati." etichetta="Chiudi il trimestre" onRisposta={(si) => { chiudi(); avviso(si ? 'Confermato' : 'Annullato'); }} />)}>Conferma</button>
      <button type="button" className="btn sec" onClick={() => avviso('Operazione completata')}>Avviso</button>
    </div>
    {f}
  </>;
}

function DemoPeriodo() {
  const [da, setDa] = useMemoria('catalogo-periodo', '2026-04');
  const [a, setA] = useState('2026-09');
  return <><PeriodoMesi da={da} primo="2026-01" ultimo="2026-09" onChange={(d, x) => { setDa(d); setA(x); }} /><p className="nota">Scelto: {da} → {a}</p></>;
}

function DemoKpi() {
  const [s, setS] = useState<string | null>(null);
  return <KpiRow selezionata={s} onSeleziona={(id) => { setS(id); avviso(id ? 'Filtro: ' + id : 'Filtro tolto'); }} voci={[
    { id: 'a', etichetta: 'Mario Bianchi', valore: 1284.4, variante: 'ok', dettagli: [{ testo: 'da liquidare · 6 documenti' }] },
    { id: 'b', etichetta: 'Laura Neri', valore: 512.1, variante: 'attesa', dettagli: [{ testo: 'da liquidare · 3 documenti' }, { testo: '210,00 € in attesa', variante: 'attesa' }] },
    { id: 'c', etichetta: 'Paolo Riva', valore: 0, variante: 'info', dettagli: [{ testo: 'nessun documento' }] },
  ]} />;
}

function DemoRiepilogo() {
  const [forn, setForn] = useState(['Gries', 'Gasper']);
  return <RiepilogoFiltri attivi={1 + forn.length} onAzzera={() => { setForn([]); avviso('Filtri tolti'); }} voci={[
    { etichetta: 'Periodo', testo: 'aprile – settembre 2026' },
    { etichetta: 'Fornitore', valori: forn.map((t) => ({ testo: t, togli: () => setForn(forn.filter((x) => x !== t)) })) },
    { etichetta: 'Cliente', valori: [] },
  ]} />;
}

interface Voce { nome: string; gruppo: string; testo: string; firma: string; alto?: boolean; demo: ReactNode }
const VOCI: Voce[] = [
  { nome: 'Pagina', gruppo: 'Struttura', testo: 'Ogni vista parte da qui: intestazione con titolo, sottotitolo, percorso, etichetta e azioni, poi il corpo dove comporre gli altri componenti. La posizione di scorrimento del corpo si ritrova tornando alla pagina.',
    firma: '<Pagina titolo sottotitolo briciole={[{ etichetta, href }]} badge azioni={[{ etichetta, icona, variante, onClick, href, disabilitato, titolo }]} pieno>',
    demo: <div className="testa" style={{ margin: 0 }}><div><nav className="percorso"><a href="/componenti">Elenco</a> › Dettaglio</nav><h1>Titolo della vista <span className="testa-badge"><Stato v="attesa">Da verificare</Stato></span></h1><div className="sotto">Sottotitolo che spiega a cosa serve la pagina.</div></div><div className="testa-azioni"><button type="button" className="btn sec" onClick={prova}><Icona nome="scarica" />Secondaria</button><button type="button" className="btn" onClick={prova}><Icona nome="spunta" />Principale</button></div></div> },
  { nome: 'Pannello', gruppo: 'Struttura', testo: 'Contenitore bianco con titolo, nota e azioni. Con riempi occupa lo spazio rimasto e scorre al suo interno. Le azioni possono avere un contatore colorato (conta, contaVariante).',
    firma: '<Pannello titolo nota azioni={[{ etichetta, icona, variante, onClick, href, conta, contaVariante }]} riempi senzaMargine>',
    demo: <Pannello titolo="Titolo del pannello" nota="nota a destra" azioni={[{ etichetta: 'Azione', onClick: prova }, { etichetta: 'Correggi i dati letti', conta: 3, contaVariante: 'errore', onClick: prova }]}><Nota>Il contenuto va nel corpo.</Nota></Pannello> },
  { nome: 'Schede', gruppo: 'Struttura', testo: 'Contenuti alternativi nello stesso spazio, con un contatore per scheda (neutro, giallo, rosso, verde). Con memoria la scheda aperta si ritrova tornando alla pagina.',
    firma: '<Schede schede={[{ id, etichetta, conta, contaVariante, contenuto }]} attiva riempi onCambia memoria="nome" />\nTastiera: ← → fra le schede, Home / Fine',
    demo: <Schede memoria="catalogo-schede" schede={[
      { id: 'a', etichetta: 'Percentuali', conta: 5, contenuto: () => <DataTable compatta naturale righe={RIGHE.slice(0, 3)} colonne={COLONNE.slice(0, 4)} chiave={(r) => r.codice} /> },
      { id: 'b', etichetta: 'Da controllare', conta: 2, contaVariante: 'attesa', contenuto: () => <Nota>Contenuto della seconda scheda.</Nota> },
      { id: 'c', etichetta: 'Errori', conta: 1, contaVariante: 'errore', contenuto: () => <Nota>Contenuto della terza scheda.</Nota> },
    ]} /> },
  { nome: 'DataTable', gruppo: 'Dati', alto: true, testo: 'Tabella standard: occupa tutto lo spazio, intestazione fissa, righe scorrevoli, intestazioni ordinabili, totali fissi, conteggio nel piede, paginazione. Ordinamento e totali valgono su tutto l’elenco. Con memoria ordinamento, pagina e scorrimento si ritrovano tornando.',
    firma: '<DataTable righe colonne={[{ key, header, tipo: testo|euro|numero|pct|data, valore, sortValue, cell, align, grow, sortable, classe, totale: \'somma\' }]} chiave\n  onRowClick rowClass emptyText emptyHint ordinamentoIniziale compatta naturale piede etichettaTotale perPagina filtro memoria="nome" />',
    demo: <DataTable memoria="catalogo-tabella" righe={RIGHE} colonne={COLONNE} chiave={(r) => r.codice} onRowClick={(r) => avviso('Riga ' + r.codice)} ordinamentoIniziale={{ key: 'data', dir: 'desc' }} piede="Clic su una riga o su un’intestazione." /> },
  { nome: 'FilterBar', gruppo: 'Dati', testo: 'Barra dei filtri standard (D-22): segmenti con conteggio che segue gli altri filtri (D-23), ricerca, campi di ricerca multipli sulle anagrafiche (mai tendine), riepilogo e azzeramento a icona. Prova: scegli due clienti, poi guarda i numeri dei segmenti.',
    firma: '<FilterBar campi={[{ nome, tipo: segmenti|cerca|select|ricerca, opzioni, placeholder, etichetta, entita, multipla, contesto, predefinito, nelRiepilogo }]} valori onChange riepilogo={true | { prima: [{ etichetta, testo }] }} />\nValore di una ricerca multipla = elenco di chiavi. Il numero n dei segmenti lo ricalcola chi usa la barra (D-23).',
    demo: <DemoFiltri /> },
  { nome: 'CampoRicerca · RicercaEntita', gruppo: 'Dati', testo: 'Campo su un’entità (fornitore, cliente, subagente, …): scrivendo compare un menu con le prime voci (↑ ↓ Invio, Esc); la lente o F4 apre la maschera con filtri e tabella. Il pallino è verde se il valore è in anagrafica. Multipla: riassunto nel campo, scelte nel menu, il cambio parte alla chiusura. Le voci arrivano dal server tramite l’entità (`voci`).',
    firma: '<CampoRicerca entita contesto placeholder etichetta multipla valori|valore onChange />\nEntita { titolo, voci(ctx) (elenco o promessa), chiave, testo, dettaglio, cerca, attiva, colonne, filtri, filtra }\nContesto { limita: [chiavi], tutti, …altro per `voci` }   <Campo tipo="ricerca" entita multipla /> nei moduli',
    demo: <DemoRicerca /> },
  { nome: 'RiepilogoFiltri', gruppo: 'Dati', testo: 'Due pulsanti a icona: l’imbuto con il numero delle voci scelte apre il riquadro con tutti i filtri (× per toglierne una), l’imbuto barrato li toglie tutti.',
    firma: '<RiepilogoFiltri voci={[{ etichetta, testo } | { etichetta, valori: [{ testo, togli }] }]} attivi onAzzera />', demo: <DemoRiepilogo /> },
  { nome: 'PeriodoMesi', gruppo: 'Dati', testo: 'Periodo di N mesi scelto con anno e griglia dei mesi, con scorciatoie a sinistra: si sceglie il mese d’inizio e il periodo si completa da solo dentro i mesi con dati (Bollettini, sempre 6 mesi).',
    firma: '<PeriodoMesi da="aaaa-mm" mesi={6} primo ultimo onChange={(da, a) => …} />\ncompletaPeriodo(da, n, primo, ultimo) → { da, a }', demo: <DemoPeriodo /> },
  { nome: 'Grafico', gruppo: 'Dati', testo: 'Grafici con Chart.js (MIT) nello stile dell’app: barre, linea, ciambella; importi in euro all’italiana; legenda in basso. Clic su una barra o fetta come filtro (onClick, evidenzia); immagine() per Excel e PDF.',
    firma: '<Grafico tipo={bar|line|doughnut} etichette serie={[{ nome, valori, colore, tipo }]} orizzontale impilato altezza euro titolo onClick={(indice) => …} evidenzia ref />\nref.immagine() → { dati, larghezza, altezza }',
    demo: <Grafico altezza={200} etichette={['1° trim.', '2° trim.', '3° trim.']} titolo="Provvigioni per trimestre" serie={[
      { nome: 'Dai fornitori', valori: [2100, 3200, 7780] }, { nome: 'Ai subagenti', valori: [700, 1050, 2390], colore: COLORI_GRAFICI.neutro },
      { nome: 'Margine', valori: [1400, 2150, 5390], colore: COLORI_GRAFICI.ok, tipo: 'line' }]} /> },
  { nome: 'KpiRow', gruppo: 'Dati', testo: 'Riquadri numerici con bordo colorato a sinistra. Con onSeleziona diventano un filtro (clic di nuovo per togliere).',
    firma: '<KpiRow voci={[{ id, etichetta, valore, variante: primario|ok|attesa|errore|info, dettagli: [{ testo, variante }] }]} selezionata onSeleziona={(id) => …} />', demo: <DemoKpi /> },
  { nome: 'Cifre', gruppo: 'Dati', testo: 'Elenco etichetta → importo, per riepiloghi brevi.', firma: '<Cifre voci={[{ etichetta, valore (numero = euro), nota, variante, forte }]} />',
    demo: <Cifre voci={[{ etichetta: 'Atteso dai fornitori', valore: 3120.4 }, { etichetta: 'Già riconosciuto', valore: 2210 }, { etichetta: 'Bloccato', valore: 505.8, variante: 'attesa' }, { etichetta: 'Rettifica', valore: -42.5, nota: 'nota di credito' }]} /> },
  { nome: 'Dettagli', gruppo: 'Dati', testo: 'Coppie etichetta / valore per le schede.', firma: '<Dettagli voci={[{ etichetta, valore }]} inColonne />',
    demo: <Dettagli voci={[{ etichetta: 'Fornitore', valore: 'Gries Deco Company' }, { etichetta: 'Codice cliente', valore: <b>K-10122</b> }, { etichetta: 'Stato', valore: <Stato v="info">Confermata</Stato> }]} /> },
  { nome: 'Elenco', gruppo: 'Dati', testo: 'Lista semplice con testo e valore a destra (registro, documenti di una pratica).', firma: '<Elenco voci={[{ testo, destra, onClick }]} vuoto />',
    demo: <Elenco voci={[{ testo: <><Icona nome="file" /> Ordine <b>DB-2026-0412</b></>, destra: euro(4820.5) }, { testo: <><Icona nome="file" /> Conferma <b>AB-77120</b></>, destra: euro(4790), onClick: prova }]} /> },
  { nome: 'Stato', gruppo: 'Dati', testo: 'Etichetta di stato. Sei varianti, sempre con testo: il colore non porta da solo il significato.', firma: '<Stato v={ok|attesa|errore|info|primario|neutro}>testo</Stato>',
    demo: <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{([['ok', 'Fatturata'], ['info', 'Confermata'], ['attesa', 'Attesa conferma'], ['errore', 'In ritardo'], ['primario', 'Pronto da chiudere'], ['neutro', 'Al prossimo bollettino']] as const).map(([v, t]) => <Stato key={v} v={v}>{t}</Stato>)}</div> },
  { nome: 'Caricamento', gruppo: 'Flussi', testo: 'Area dove trascinare i file o sceglierli: il punto d’ingresso di tutti i documenti.', firma: '<Caricamento titolo testo accetta=".pdf,.xlsx" onFile={(file) => …} />',
    demo: <Caricamento titolo="Trascina qui i documenti" testo="PDF o Excel" onFile={(f) => avviso(f.length + (f.length === 1 ? ' file scelto: ' + f[0].name : ' file scelti'))} /> },
  { nome: 'GruppiDaFare', gruppo: 'Flussi', testo: 'Lista "Da fare" in gruppi richiudibili (aperti o chiusi restano come li lasci), con contatore, riassunto e azioni sul gruppo intero.',
    firma: '<GruppiDaFare gruppi={[{ id, titolo, variante, conta, voci, sommario, azioni, vuoto }]} vuoto filtro />',
    demo: <GruppiDaFare vuoto={{ titolo: 'Tutto in ordine', testo: '' }} gruppi={[
      { id: 'a', titolo: 'Conferme in ritardo', variante: 'errore', conta: 1, azioni: [{ etichetta: 'Prepara i solleciti', icona: 'posta', variante: 'primario', onClick: () => avviso('Solleciti') }],
        voci: [{ tipo: 'errore', titolo: 'Sollecita la conferma di OF/2026/041', extra: <span className="giorni">17 gg</span>, dettaglio: 'Gries · Vivaio Verde Azzurro', href: '/componenti', azione: 'Apri' }] },
      { id: 'b', titolo: 'Documenti da decidere', variante: 'primario', conta: 0, sommario: <><b>3</b> in coda, tutti pronti da abbinare.</>, voci: [], vuoto: 'Nessun documento richiede una decisione.' }]} /> },
  { nome: 'ListaDaFare', gruppo: 'Flussi', testo: 'Attività in ordine di urgenza, ognuna con il pulsante che porta dove si risolve.', firma: '<ListaDaFare voci={[{ tipo: errore|attesa|primario, titolo, dettaglio, href, azione }]} vuoto={{ titolo, testo }} />',
    demo: <ListaDaFare vuoto={{ titolo: '', testo: '' }} voci={[
      { tipo: 'errore', titolo: 'Conferma in ritardo · DB-2026-0398', dettaglio: 'Gasper, attesa da 6 giorni', href: '/componenti', azione: 'Sollecita' },
      { tipo: 'primario', titolo: 'Fattura F-2026-0930 da abbinare', dettaglio: 'Ing’s · abbinamento sicuro', href: '/componenti', azione: 'Abbina' },
      { tipo: 'attesa', titolo: 'Bollettino Gries luglio', dettaglio: '1 riga da decidere', href: '/componenti', azione: 'Verifica' }]} /> },
  { nome: 'ElencoSelezionabile', gruppo: 'Flussi', testo: 'Colonna sinistra di una vista a due pannelli: la voce aperta è evidenziata.', firma: '<ElencoSelezionabile voci={[{ id, href, titolo, valore, sotto, stato }]} selezionata />',
    demo: <ElencoSelezionabile selezionata={1} voci={[
      { id: 1, href: '/componenti', titolo: 'Fattura F-2026-0930', valore: euro(3150), sotto: 'Ing’s · arrivato il 03/09/2026', stato: <Stato v="ok">Abbinamento sicuro</Stato> },
      { id: 2, href: '/componenti', titolo: 'Conferma C-2026/1101', valore: euro(880), sotto: 'Gasper · arrivato il 04/09/2026', stato: <Stato v="errore">Cliente non riconosciuto</Stato> }]} /> },
  { nome: 'Scelte', gruppo: 'Flussi', testo: 'Alternative con i motivi e un’azione ciascuna; quella consigliata è in evidenza.', firma: '<Scelte voci={[{ titolo, sottotitolo, punti, azione: { etichetta, onClick }, consigliata }]} vuoto />',
    demo: <Scelte voci={[
      { titolo: 'DB-2026-0412 · Arredo Bagno Rossi', sottotitolo: <><Stato v="attesa">Attesa conferma</Stato> › <Stato v="info">Confermata</Stato></>, punti: ['codice cliente K-10122', '3 articoli in comune', 'importo uguale all’ordine'], consigliata: true, azione: { etichetta: 'Abbina a DB-2026-0412', onClick: prova } },
      { titolo: 'DB-2026-0420 · Bianchi Interni', punti: ['1 articolo in comune', <span key="x" className="negativo">-120,00 € rispetto all’ordine</span>], azione: { etichetta: 'Abbina a DB-2026-0420', onClick: prova } }]} /> },
  { nome: 'Binario', gruppo: 'Flussi', testo: 'Le fasi documentali di una pratica, con le differenze fra una fase e la precedente.', firma: '<Binario tappe={[{ titolo, fatta, ritardo, numero, data, importo, delta, testo, assente }]} />',
    demo: <Binario tappe={[
      { titolo: 'Ordine', fatta: true, numero: 'DB-2026-0412', data: '2026-07-20', importo: 4820.5 }, { titolo: 'Conferma', fatta: true, numero: 'AB-77120', data: '2026-07-24', importo: 4790, delta: -30.5 },
      { titolo: 'Fattura', ritardo: true, testo: 'In ritardo di 4 giorni' }, { titolo: 'Nota di credito', assente: true, testo: 'Nessuna' }]} /> },
  { nome: 'Matrice', gruppo: 'Flussi', testo: 'Griglia righe × colonne (fornitore × mese) con stato, importo, collegamento o azione per cella.', firma: '<Matrice angolo colonne righe={[{ titolo, sotto, celle: [{ stato, valore, href, azione, vuota }] }]} />',
    demo: <Matrice angolo="Fornitore" colonne={['Luglio 2026', 'Agosto 2026', 'Settembre 2026']} righe={[
      { titolo: 'Gries Deco Company', sotto: 'paga sul maturato', celle: [{ href: '/componenti', stato: <Stato v="attesa">1 riga da decidere</Stato>, valore: euro(1144.5) }, { stato: <Stato v="errore">Non arrivato</Stato>, azione: { etichetta: 'Sollecita', onClick: prova } }, { vuota: 'Mese in corso' }] },
      { titolo: 'Ing’s', sotto: 'paga sul fatturato', celle: [{ href: '/componenti', stato: <Stato v="ok">Verificato</Stato>, valore: euro(420) }, { href: '/componenti', stato: <Stato v="primario">Pronto da chiudere</Stato>, valore: euro(472.5) }, { vuota: 'Mese in corso' }] }]} /> },
  { nome: 'Cerniera', gruppo: 'Flussi', testo: 'Riconciliazione riga per riga: a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura. Gruppi richiudibili.',
    firma: '<Cerniera sinistra destra totali={{ sinistra, destra, differenza }} gruppi={[{ titolo, variante, chiuso, righe: [{ titolo, dettagli, sinistra, destra, differenza, quadra, azioni, esito }] }]} />',
    demo: <Cerniera sinistra="Gries riconosce" destra="Noi calcoliamo" totali={{ sinistra: 1144.5, destra: 1180, differenza: -35.5 }} gruppi={[
      { titolo: 'Da decidere', variante: 'attesa', righe: [{ titolo: <b>F-0912</b>, dettagli: 'Arredo Bagno Rossi · 12/07/2026 · importo diverso', sinistra: { importo: 1144.5, dett: '17,50 % di 6.540,00 €' }, destra: { importo: 1180, dett: '18,04 % di 6.540,00 €' }, differenza: -35.5,
        azioni: [{ etichetta: 'Accetta il loro importo', variante: 'sec', onClick: prova }, { etichetta: 'Contesta', variante: 'pericolo', onClick: prova }] }] },
      { titolo: 'Quadrano', variante: 'ok', chiuso: true, righe: [{ titolo: <b>F-0901</b>, sinistra: { importo: 210 }, destra: { importo: 210 }, differenza: 0, quadra: true }] }]} /> },
  { nome: 'Periodi', gruppo: 'Flussi', testo: 'Striscia di periodi (trimestri) con stato e barra di avanzamento per quello in corso.', firma: '<Periodi voci={[{ href, titolo, sotto, stato, attivo, futuro, avanzamento }]} etichetta />',
    demo: <Periodi voci={[
      { href: '/componenti', titolo: '1° trimestre', sotto: 'gennaio–marzo', stato: 'Liquidato' }, { href: '/componenti', titolo: '2° trimestre', sotto: 'aprile–giugno', stato: 'Liquidato' },
      { href: '/componenti', titolo: '3° trimestre', sotto: 'luglio–settembre', stato: 'In corso', attivo: true, avanzamento: 72 }, { href: '/componenti', titolo: '4° trimestre', sotto: 'ottobre–dicembre', stato: 'Non iniziato', futuro: true }]} /> },
  { nome: 'Campo', gruppo: 'Finestre', testo: 'Campi standard con etichetta e aiuto: testo, password, casella, select, livello e ricerca su un’entità.', firma: '<Campo nome etichetta tipo={testo|password|casella|select|livello|ricerca} valore opzioni aiuto largo disabilitato entita multipla contesto />',
    demo: <div className="modulo modulo-2"><Campo nome="demo_codice" etichetta="Codice del fornitore" aiuto="Come il fornitore chiama il cliente." /><Campo nome="demo_sconto" etichetta="Sconto %" tipo="select" opzioni={[{ value: '0', label: '0 %' }, { value: '5', label: '5 %' }]} /><Campo nome="demo_pw" etichetta="Password" tipo="password" /><Campo nome="demo_resta" etichetta="Resta collegato" tipo="casella" valore /></div> },
  { nome: 'FormModal · Modale · Conferma · Avviso', gruppo: 'Finestre', testo: 'Finestre sopra la pagina. FormModal resta aperta se onConferma restituisce il messaggio d’errore (il controllo vero lo fa il server). Avviso: messaggio temporaneo.',
    firma: '<FormModal titolo testo campi colonne conferma pericolo onConferma={async (valori) => messaggio d’errore | niente} onChiudi />\n<Modale titolo testo piede larga onChiudi>   <Conferma titolo testo etichetta pericolo onRisposta={(si) => …} />   avviso(testo, errore)', demo: <DemoFinestre /> },
  { nome: 'Pulsanti e icone', gruppo: 'Base', testo: 'Quattro varianti di pulsante (principale, secondario, pericolo, testo) in due misure; icone a tratto.', firma: '<button className="btn [sec|pericolo|testo] [piccolo]">   <Icona nome />',
    demo: <><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><button className="btn"><Icona nome="spunta" />Principale</button><button className="btn sec">Secondario</button><button className="btn pericolo">Pericolo</button><button className="btn testo">Testo</button><button className="btn piccolo">Piccolo</button><button className="btn" disabled>Disabilitato</button></div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--testo-intest)' }}>{'oggi arrivo pratiche bollettini liquidazioni fornitori subagenti abbinamenti componenti cerca spunta file scarica carica piu posta avviso'.split(' ').map((n) => <span key={n} title={n}><Icona nome={n} /></span>)}</div></> },
];

export default function Catalogo() {
  let gruppo = '';
  return (
    <Pagina titolo="Componenti" sottotitolo="I componenti standard con cui sono composte tutte le viste: stessi nomi e parametri del prototipo.">
      <div className="catalogo">
        <nav className="catalogo-indice" aria-label="Indice dei componenti">
          {VOCI.map((v, i) => {
            const nuovo = v.gruppo !== gruppo;
            gruppo = v.gruppo;
            return <span key={v.nome} style={{ display: 'contents' }}>
              {nuovo && <div className="gruppo-nome" style={{ color: 'var(--testo-tenue)', padding: '8px 8px 2px' }}>{v.gruppo}</div>}
              <a href={'#comp-' + i} onClick={(e) => { e.preventDefault(); document.getElementById('comp-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{v.nome}</a>
            </span>;
          })}
        </nav>
        <div className="catalogo-voci">
          {VOCI.map((v, i) => (
            <div key={v.nome} id={'comp-' + i}>
              <Pannello titolo={v.nome} nota={v.gruppo}>
                <Nota>{v.testo}</Nota>
                <div className={'esempio' + (v.alto ? ' alto' : '')} style={{ marginTop: 12 }}>{v.demo}</div>
                <pre className="codice">{v.firma}</pre>
              </Pannello>
            </div>
          ))}
        </div>
      </div>
    </Pagina>
  );
}
