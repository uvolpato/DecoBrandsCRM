'use client';
import Link from 'next/link';
import { useEffect, useId, useState, type CSSProperties } from 'react';
import { DataTable } from '@/componenti/DataTable';
import { Campo } from '@/componenti/Campo';
import { Elenco, Periodi } from '@/componenti/Flussi';
import { COLORI_GRAFICI, Grafico } from '@/componenti/Grafico';
import { KpiRow } from '@/componenti/Kpi';
import { Conferma, Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, SagomaRiquadri, SagomaTabella, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { classeSegno, data, euro, num, pct } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Liquidazioni (F4-A1, §7.8, D-18): i quattro trimestri, l'elenco dei subagenti che fa da filtro e i documenti
// del trimestre con lo stato deciso dal server. Numeri e nomi arrivano già calcolati (V12); un trimestre chiuso
// si legge dalla fotografia e non si modifica più (D-33, D-57). La scheda *Report subagenti* arriva con F4-A4.

interface Trimestre { trimestre: number; nome: string; da: string; a: string; chiave: string; etichetta: string; avanzamento: number | null; totale: number | null }
interface Subagente { id: string; nome: string; attivo: boolean; documenti: number; liquidabili: number; imponibile: number; provvigione: number; in_attesa: number; storni: number }
interface Documento {
  documento_id: string; numero: string; tipo: string; data: string; origine: string | null; pratica_id: string;
  cliente: string; codice_cliente: string; fornitore: string; subagente: string; subagente_id: string;
  imponibile: number; pct: number; provvigione: number;
  liquidabile: boolean; incasso: boolean; voce: 'storno' | 'riaccredito' | null; motivo_testo: string | null;
  stato: { etichetta: string; variante: Variante };
  correzione: { tipo: string; valore: number; motivo: string } | null;
}
interface RigaReport { id: string; nome: string; clienti: number; documenti: number; fatturato: number; prese: number; pagate: number; margine: number; quota: number; delta: number | null }
interface NumeriReport {
  fatturato: number; prese: number; pagate: number; margine: number; clienti: number; documenti: number;
  delta: { fatturato: number | null; pagate: number | null; margine: number | null };
  pct: { margine_su_prese: number };
}
interface Report {
  anno: number; trimestre: number; precedente: { anno: number; trimestre: number };
  subagenti?: RigaReport[];
  subagente?: { id: string; nome: string };
  numeri?: NumeriReport;
  trimestri?: { trimestre: number; pagate: number; margine: number; attivo: boolean }[];
  primi_clienti?: { nome: string; fatturato: number; provvigione: number }[];
}
interface Risposta {
  anno: number; trimestre: number;
  stato: { chiave: string; etichetta: string; avanzamento: number | null };
  trimestri: Trimestre[]; subagenti: Subagente[]; senza_documenti: number;
  riepilogo: { documenti: number; liquidabili: number; imponibile: number; provvigione: number; in_attesa: number; bloccanti: number; storni: number } | null;
  chiusura: { possibile: boolean; motivo: string | null };
  chiusa_il: string | null; chiusa_da: string | null;
  documenti: Documento[];
}

export function VistaLiquidazioni({ anno, trimestre }: { anno: number; trimestre: number }) {
  const puo = usePuo();
  const [subSel, setSubSel] = useMemoria<string | null>('subagente', null);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [chiedi, setChiedi] = useState(false);
  const [esporta, setEsporta] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [reportCaricando, setReportCaricando] = useState(true);
  const [reportErrore, setReportErrore] = useState('');
  const [correggiDoc, setCorreggiDoc] = useState<Documento | null>(null);
  const [versione, setVersione] = useState(0); // si rilegge la liquidazione dopo una correzione (D-27)
  const sagome = useSagome(caricando && !dati);
  const sagomeReport = useSagome(reportCaricando && !report);

  useEffect(() => {
    let vivo = true;
    setCaricando(true);
    void api<Risposta>(`liquidazioni?anno=${anno}&trimestre=${trimestre}`).then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
  }, [anno, trimestre, versione]);

  // Report subagenti (F4-A4): si rilegge cambiando trimestre o subagente scelto; numeri dal server (V12)
  useEffect(() => {
    const d = dati && dati.anno === anno && dati.trimestre === trimestre ? dati : null;
    if (!d) { setReportCaricando(true); return; }
    const sub = d.subagenti.some((s) => s.id === subSel) ? subSel : null;
    let vivo = true;
    setReportCaricando(true);
    setReportErrore('');
    const p = new URLSearchParams({ anno: String(anno), trimestre: String(trimestre) });
    if (sub) p.set('subagente', sub);
    void api<Report>('liquidazione/report?' + p.toString()).then((r) => {
      if (!vivo) return;
      setReportCaricando(false);
      if (r.ok) setReport(r.dati); else { setReport(null); setReportErrore(r.messaggio); }
    });
    return () => { vivo = false; };
  }, [dati, anno, trimestre, subSel]);

  // cambio trimestre dall'indirizzo: finché i dati nuovi non arrivano non si mostrano quelli di prima
  const b = dati && dati.anno === anno && dati.trimestre === trimestre ? dati : null;
  if (!b) {
    return (
      <Pagina titolo="Liquidazioni" pieno sottotitolo="Provvigioni ai subagenti per trimestre: gennaio–marzo, aprile–giugno, luglio–settembre, ottobre–dicembre.">
        {errore ? <Pannello><div className="vuoto"><b>Liquidazione non caricata</b>{errore}</div></Pannello>
          : sagome ? <>
            <Sagoma larghezza="100%" altezza={78} arrotondato={10} />
            <div className="colonne riempi" style={{ '--colonne': 'minmax(300px, 0.8fr) minmax(0, 2.2fr)' } as CSSProperties}>
              <Pannello riempi senzaMargine><SagomaTabella righe={8} colonne={2} /></Pannello>
              <Pannello riempi senzaMargine><SagomaTabella righe={8} colonne={4} /></Pannello>
            </div>
          </> : null}
      </Pagina>
    );
  }

  const q = b.trimestri[trimestre - 1];
  const chiusa = b.stato.chiave === 'chiusa';
  const scelto = b.subagenti.find((s) => s.id === subSel) ?? null;
  const rep = report && report.anno === anno && report.trimestre === trimestre && (report.subagente?.id ?? null) === (scelto?.id ?? null) ? report : null;
  const visibili = scelto ? b.documenti.filter((d) => d.subagente_id === scelto.id) : b.documenti;
  const inAttesa = b.riepilogo?.bloccanti ?? 0;
  const puoChiudere = puo('provvigioni.chiudi');
  const puoEsportare = puo('provvigioni.esporta');
  const puoModifica = puo('provvigioni.modifica');
  const analisi = '/analisi?dal=' + q.da.slice(0, 7) + '&al=' + q.a.slice(0, 7) + (scelto ? '&subagenti=' + scelto.id : '');

  /** Esportazione (§11): il server prepara il file dagli stessi numeri della pagina (V12). */
  const scarica = async (contenuto: string, subagente: string | null, formato: string) => {
    const p = new URLSearchParams({ anno: String(anno), trimestre: String(trimestre), contenuto, formato });
    if (contenuto === 'subagente' && subagente) p.set('subagente', subagente);
    const r = await fetch('/api/liquidazione/export?' + p.toString(), { credentials: 'same-origin' });
    if (!r.ok) {
      let messaggio = 'Non è stato possibile esportare: riprova.';
      try { const j = await r.json() as { message?: string }; if (j.message) messaggio = j.message; } catch { /* risposta senza JSON */ }
      avviso(messaggio, true);
      return;
    }
    const nome = (r.headers.get('content-disposition') ?? '').match(/filename="([^"]+)"/)?.[1] ?? ('liquidazione.' + formato);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setEsporta(false);
    avviso('Scaricato ' + nome);
  };

  const chiudi = async () => {
    setChiedi(false);
    const r = await api<Risposta>(`liquidazioni/${anno}/${trimestre}/chiudi`, {});
    if (r.ok) { setDati(r.dati); avviso(`Liquidazione del ${trimestre}° trimestre chiusa`); }
    else avviso(r.messaggio, true);
  };

  return (
    <Pagina titolo="Liquidazioni" pieno sottotitolo="Provvigioni ai subagenti per trimestre: gennaio–marzo, aprile–giugno, luglio–settembre, ottobre–dicembre."
      azioni={[
        {
          etichetta: 'Esporta in Excel', icona: 'scarica', variante: 'sec', consentito: puoEsportare,
          disabilitato: !puoEsportare || !b.documenti.length,
          titolo: !puoEsportare ? 'Non hai il permesso di esportare' : b.documenti.length ? '' : 'Nessun documento nel trimestre',
          onClick: () => setEsporta(true),
        },
        {
          etichetta: chiusa ? 'Liquidazione chiusa' : 'Chiudi il trimestre', icona: 'spunta',
          disabilitato: !b.chiusura.possibile || !puoChiudere,
          titolo: !puoChiudere ? 'Serve il livello responsabile nell’area Provvigioni' : (b.chiusura.motivo ?? ''),
          onClick: () => setChiedi(true),
        },
      ]}>
      <Periodi etichetta={'Trimestri ' + anno} voci={b.trimestri.map((x) => ({
        href: `/liquidazioni/${anno}/${x.trimestre}`, titolo: `${x.trimestre}° trimestre`, sotto: x.nome,
        stato: x.etichetta, attivo: x.trimestre === trimestre, futuro: x.chiave === 'futura', avanzamento: x.avanzamento ?? undefined,
      }))} />

      {chiusa && <p className="nota">Liquidazione chiusa il {data(b.chiusa_il)} da {b.chiusa_da}: gli importi sono fissati.</p>}

      {b.stato.chiave === 'futura'
        ? <Pannello><div className="vuoto"><b>Trimestre non ancora iniziato</b>Le provvigioni compariranno qui con le prime fatture di {q.nome.split('–')[0]}.</div></Pannello>
        : <div className="colonne riempi" style={{ '--colonne': 'minmax(300px, 0.8fr) minmax(0, 2.2fr)' } as CSSProperties}>
          <Pannello titolo="Subagenti" riempi senzaMargine
            nota={`${b.subagenti.length} con documenti${b.senza_documenti ? ` · ${b.senza_documenti} senza` : ''}`}>
            <DataTable compatta righe={b.subagenti} chiave={(s) => s.id}
              ordinamentoIniziale={{ key: 'provvigione', dir: 'desc' }}
              rowClass={(s) => (s.id === subSel ? 'selezionata' : '')}
              onRowClick={(s) => setSubSel(s.id === subSel ? null : s.id)}
              colonne={[
                {
                  key: 'nome', header: 'Subagente',
                  cell: (s) => <><b>{s.nome}</b><span className="sec-riga">{s.documenti} {s.documenti === 1 ? 'documento' : 'documenti'}{s.attivo ? '' : ' · non attivo'}</span></>,
                },
                {
                  key: 'provvigione', header: chiusa ? 'Liquidato' : 'Da liquidare', tipo: 'euro', totale: 'somma',
                  cell: (s) => <>
                    <b className={classeSegno(Math.min(0, s.provvigione))}>{euro(s.provvigione)}</b>
                    {!!s.in_attesa && <span className="sec-riga testo-attesa">{euro(s.in_attesa)} in attesa</span>}
                    {!!s.storni && <span className="sec-riga negativo">{s.storni} {s.storni === 1 ? 'storno' : 'storni'}</span>}
                  </>,
                },
              ]}
              etichettaTotale="Totale" piede="Clic su un subagente per vedere i suoi documenti, di nuovo per tutti."
              emptyText="Nessun subagente" emptyHint="Nessun documento nel trimestre." />
          </Pannello>

          <div className="riempi" style={{ display: 'flex', flexDirection: 'column', minHeight: 'max(24rem, 60vh)' }}>
            <Pannello titolo={scelto ? scelto.nome : 'Tutti i subagenti'} riempi
            nota={<>
              {chiusa ? 'Totale liquidato' : 'Totale da liquidare'} <b>{euro(b.riepilogo?.provvigione ?? 0)}</b>
              {inAttesa ? <> · {inAttesa} {inAttesa === 1 ? 'documento' : 'documenti'} in attesa · <Link href="/bollettini">vai ai bollettini</Link></> : null}
            </>}
            azioni={[{ etichetta: 'Analisi completa', icona: 'analisi', href: analisi }]}>
            <Schede riempi memoria="liquidazioni" schede={[{
              id: 'documenti', etichetta: 'Documenti', conta: visibili.length, contaVariante: inAttesa ? 'attesa' : 'neutro',
              contenuto: () => (
                <div className="riempi">
                  <DataTable righe={visibili} chiave={(d) => d.documento_id + '|' + (d.voce ?? '')} filtro={subSel ?? 'tutti'}
                    ordinamentoIniziale={{ key: 'stato', dir: 'asc' }}
                    colonne={[
                      {
                        key: 'numero', header: 'Documento',
                        cell: (d) => <>
                          <Link href={'/pratiche/' + d.pratica_id}>{d.numero}</Link>
                          {d.voce && <Stato v={d.voce === 'storno' ? 'errore' : 'info'}>{d.voce === 'storno' ? 'Storno' : 'Riaccredito'}</Stato>}
                          <span className="sec-riga">{d.fornitore} · {d.origine ? 'fattura del ' + data(d.origine) : data(d.data)}</span>
                        </>,
                      },
                      {
                        key: 'cliente', header: 'Cliente · subagente', grow: true,
                        cell: (d) => <>{d.cliente}<span className="sec-riga">{d.subagente} · codice {d.codice_cliente}</span></>,
                      },
                      {
                        key: 'provvigione', header: 'Provvigione', tipo: 'euro', totale: 'somma',
                        cell: (d) => <><b className={classeSegno(Math.min(0, d.provvigione))}>{euro(d.provvigione)}</b>
                          <span className="sec-riga">
                            {d.correzione
                              ? 'corretto: ' + (d.correzione.tipo === 'importo' ? euro(d.correzione.valore) : d.correzione.tipo === 'nessuna' ? 'nessuna provvigione' : pct(d.correzione.valore)) + ' — ' + d.correzione.motivo
                              : `${pct(d.pct)} di ${euro(d.imponibile)}`}
                          </span>
                          {!d.voce && !chiusa && puoModifica && (
                            <button type="button" className="btn testo piccolo" onClick={() => setCorreggiDoc(d)}>
                              {d.correzione ? 'Cambia la correzione' : 'Correggi'}
                            </button>
                          )}
                        </>,
                      },
                      {
                        key: 'stato', header: 'Stato', grow: true, sortValue: (d) => (d.liquidabile ? 1 : 0), classe: () => 'avvolgi',
                        cell: (d) => <><Stato v={d.stato.variante}>{d.stato.etichetta}</Stato>{d.motivo_testo && <span className="sec-riga">{d.motivo_testo}</span>}</>,
                      },
                    ]}
                    etichettaTotale="Totale in elenco, compresi i documenti in attesa"
                    piede="Fatturato (es. Gasper, Ing’s): entrano le fatture del trimestre; se il cliente non paga, lo storno è una voce negativa nella liquidazione successiva. Maturato (es. Gries): la fattura entra nel trimestre del bollettino che la riconosce, cioè quando il cliente paga."
                    emptyText="Nessun documento" emptyHint="Nessuna fattura o nota di credito con data in questo trimestre." />
                </div>
              ),
            },
            {
              id: 'report', etichetta: 'Report subagenti',
              contenuto: () => rep ? <ReportSubagenti r={rep} analisi={analisi} />
                : <div className="report-sub">
                  {reportErrore ? <div className="vuoto"><b>Report non caricato</b>{reportErrore}</div>
                    : sagomeReport ? <><SagomaRiquadri n={3} /><SagomaTabella righe={5} colonne={5} naturale /></> : null}
                </div>,
            }]} />
            </Pannello>
          </div>
        </div>}

      {esporta && <FinestraEsporta anno={anno} trimestre={trimestre} chiusa={chiusa} subagenti={b.subagenti} scelto={scelto}
        onChiudi={() => setEsporta(false)} onScarica={scarica} />}

      {chiedi && <Conferma titolo={`Chiudere la liquidazione del ${trimestre}° trimestre?`}
        testo={`Gli importi vengono fissati: ${euro(b.riepilogo?.provvigione ?? 0)} a ${b.subagenti.filter((s) => s.liquidabili > 0).length} subagenti.`}
        etichetta="Chiudi il trimestre" onRisposta={(si) => (si ? void chiudi() : setChiedi(false))} />}

      {correggiDoc && <FinestraCorrezione documento={correggiDoc}
        onChiudi={() => setCorreggiDoc(null)}
        onSalvato={() => { setCorreggiDoc(null); setVersione((v) => v + 1); }} />}
    </Pagina>
  );
}

/** Report subagenti (F4-A4, §7.8, D-18): numeri calcolati dal server. Senza subagente scelto l'elenco con
 *  quota e variazione; con un subagente i suoi numeri, i trimestri dell'anno e i primi clienti. */
function ReportSubagenti({ r, analisi }: { r: Report; analisi: string }) {
  const etPrec = 'sul ' + r.precedente.trimestre + '° trimestre' + (r.precedente.anno !== r.anno ? ' ' + r.precedente.anno : '');
  const conf = (d: number | null) => (d == null
    ? { testo: 'nessun importo ' + etPrec }
    : { testo: (d >= 0 ? '+' : '−') + num(Math.abs(d)) + '% ' + etPrec, variante: (d >= 0 ? 'ok' : 'errore') as 'ok' | 'errore' });
  if (r.subagenti) {
    if (!r.subagenti.length) return <div className="report-sub"><div className="vuoto"><b>Nessun subagente con documenti</b></div></div>;
    return (
      <div className="report-sub">
        <Grafico tipo="bar" orizzontale impilato altezza={Math.max(140, 30 * r.subagenti.length + 56)} titolo="Provvigioni generate per subagente"
          etichette={r.subagenti.map((x) => x.nome)}
          serie={[
            { nome: 'Al subagente', valori: r.subagenti.map((x) => x.pagate), colore: COLORI_GRAFICI.neutro },
            { nome: 'Margine Decobrands', valori: r.subagenti.map((x) => x.margine), colore: COLORI_GRAFICI.ok },
          ]} />
        <DataTable naturale compatta perPagina={false} righe={r.subagenti} chiave={(x) => x.id}
          ordinamentoIniziale={{ key: 'pagate', dir: 'desc' }} etichettaTotale="Totale"
          colonne={[
            {
              key: 'nome', header: 'Subagente', grow: true,
              cell: (x) => <><b>{x.nome}</b><span className="sec-riga">{x.clienti} {x.clienti === 1 ? 'cliente' : 'clienti'} · {x.documenti} {x.documenti === 1 ? 'documento' : 'documenti'}</span></>,
            },
            { key: 'fatturato', header: 'Fatturato', tipo: 'euro', totale: 'somma' },
            { key: 'pagate', header: 'Provvigione', tipo: 'euro', totale: 'somma' },
            { key: 'margine', header: 'Margine', tipo: 'euro', totale: 'somma' },
            {
              key: 'delta', header: 'Sul ' + r.precedente.trimestre + '° trim.', tipo: 'numero', sortValue: (x) => x.delta ?? -1e9,
              cell: (x) => x.delta == null ? <span className="testo-tenue">—</span>
                : <span className={x.delta >= 0 ? 'positivo' : 'negativo'}>{x.delta >= 0 ? '+' : '−'}{num(Math.abs(x.delta))}%</span>,
            },
          ]}
          piede={'Margine = provvigioni dai fornitori meno la provvigione al subagente. Ultima colonna: provvigione al subagente ' + etPrec + '. Clic su un subagente a sinistra per il suo report.'} />
        <Nota>Numeri del trimestre di liquidazione, compresi i documenti in attesa e le voci di storno. L’esportazione di questo trimestre è nel pulsante <b>Esporta</b>; altri periodi e filtri: <Link href={analisi}>Analisi completa</Link>.</Nota>
      </div>
    );
  }
  const n = r.numeri, sub = r.subagente;
  if (!n || !sub) return null;
  return (
    <div className="report-sub">
      <KpiRow voci={[
        {
          id: 'f', etichetta: 'Fatturato dei suoi clienti', valore: n.fatturato, variante: 'primario',
          dettagli: [conf(n.delta.fatturato), { testo: `${n.clienti} ${n.clienti === 1 ? 'cliente' : 'clienti'} · ${n.documenti} ${n.documenti === 1 ? 'documento' : 'documenti'}` }],
        },
        { id: 's', etichetta: 'Provvigione al subagente', valore: n.pagate, variante: 'attesa', dettagli: [conf(n.delta.pagate)] },
        {
          id: 'm', etichetta: 'Margine Decobrands', valore: n.margine, variante: 'ok',
          dettagli: [conf(n.delta.margine), ...(n.prese ? [{ testo: pct(n.pct.margine_su_prese) + ' delle provvigioni' }] : [])],
        },
      ]} />
      <div className="griglia-bi">
        <Pannello titolo={'Trimestri ' + r.anno}>
          <Grafico tipo="bar" impilato altezza={200} titolo="Provvigioni generate per trimestre"
            etichette={(r.trimestri ?? []).map((x) => x.trimestre + '° trim.' + (x.attivo ? ' ●' : ''))}
            serie={[
              { nome: 'Al subagente', valori: (r.trimestri ?? []).map((x) => x.pagate), colore: COLORI_GRAFICI.neutro },
              { nome: 'Margine Decobrands', valori: (r.trimestri ?? []).map((x) => x.margine), colore: COLORI_GRAFICI.ok },
            ]} />
        </Pannello>
        <Pannello titolo="Clienti principali" nota={n.clienti > 5 ? 'primi 5 di ' + n.clienti : ''}>
          <Elenco vuoto="Nessun cliente" voci={(r.primi_clienti ?? []).map((c) => ({
            testo: <><b>{c.nome}</b> <span className="testo-tenue">fatturato {euro(c.fatturato)}</span></>,
            destra: euro(c.provvigione),
          }))} />
        </Pannello>
      </div>
      <Nota>Numeri del trimestre di liquidazione. L’esportazione del trimestre è nel pulsante <b>Esporta</b>; altri periodi e confronti: <Link href={analisi}>Analisi completa di {sub.nome}</Link>.</Nota>
    </div>
  );
}

/** Finestra di esportazione (§11): contenuto e formato. Se la pagina è filtrata su un subagente,
 *  quello è già scelto. Il file lo prepara il server dagli stessi numeri della pagina (V12). */
function FinestraEsporta({ anno, trimestre, chiusa, subagenti, scelto, onChiudi, onScarica }: {
  anno: number; trimestre: number; chiusa: boolean; subagenti: Subagente[]; scelto: Subagente | null;
  onChiudi: () => void; onScarica: (contenuto: string, subagente: string | null, formato: string) => Promise<void>;
}) {
  const [contenuto, setContenuto] = useState(scelto ? 'subagente' : 'completa');
  const [sub, setSub] = useState(scelto?.id ?? subagenti[0]?.id ?? '');
  const [formato, setFormato] = useState('xlsx');
  const [attesa, setAttesa] = useState(false);
  const note: Record<string, string> = {
    xlsx: 'Fogli impaginati, totali con formule, pronti da stampare.',
    pdf: 'Stesso contenuto e stessa impaginazione dell’Excel, da inviare o archiviare.',
    csv: 'Solo dati, senza totali né formattazione: separatore punto e virgola, per altri programmi.',
  };
  const scarica = async () => {
    setAttesa(true);
    try { await onScarica(contenuto, contenuto === 'subagente' ? sub : null, formato); }
    finally { setAttesa(false); }
  };
  const scelte = [
    { v: 'completa', t: 'Tutto il trimestre, diviso per subagente', d: `Foglio Riepilogo + un foglio per ognuno dei ${subagenti.length} subagenti con il dettaglio dei documenti e il totale.` },
    { v: 'subagente', t: 'Un solo subagente', d: 'Il dettaglio dei suoi documenti e il suo totale.' },
    { v: 'riepilogo', t: 'Solo il riepilogo', d: 'Una riga per subagente: documenti, imponibile, provvigione da liquidare' + (chiusa ? '.' : ' e in attesa dei bollettini.') },
  ];
  return (
    <Modale titolo={`Esporta la liquidazione del ${trimestre}° trimestre ${anno}`}
      testo="Campi concordati: fornitore, numero e data documento, codice cliente, ragione sociale, importo, % e importo provvigionale."
      onChiudi={() => { if (!attesa) onChiudi(); }}
      piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        <button type="button" className="btn" onClick={scarica} disabled={attesa}>{attesa ? 'Attendi…' : 'Scarica'}</button>
      </>}>
      <div className="scelte-esporta" role="radiogroup" aria-label="Cosa esportare">
        {scelte.map((x) => (
          <label key={x.v} className="scelta-esporta">
            <input type="radio" name="esporta" value={x.v} checked={contenuto === x.v} onChange={() => setContenuto(x.v)} />
            <span>
              <b>{x.t}</b><span>{x.d}</span>
              {x.v === 'subagente' && (
                <select className="filtro-select" id="esporta-sub" aria-label="Subagente" value={sub} disabled={contenuto !== 'subagente'}
                  onChange={(e) => { setSub(e.target.value); setContenuto('subagente'); }}>
                  {subagenti.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              )}
            </span>
          </label>
        ))}
      </div>
      <div className="formato-esporta">
        <span>Formato</span>
        <div className="segmenti" role="radiogroup" aria-label="Formato del file">
          {[['xlsx', 'Excel'], ['pdf', 'PDF'], ['csv', 'CSV']].map(([f, t]) => (
            <button key={f} type="button" role="radio" aria-checked={formato === f} aria-selected={formato === f} onClick={() => setFormato(f)}>{t}</button>
          ))}
        </div>
        <p className="testo-tenue" id="formato-nota">{note[formato]}</p>
      </div>
    </Modale>
  );
}

/** Correzione della quota del subagente su un documento (D-27 §19): vince su ogni altra regola, motivo
 *  obbligatorio, resta nel registro e compare nel prospetto. Il browser manda solo tipo, valore e motivo;
 *  il server ricontrolla e ricalcola (V12). */
function FinestraCorrezione({ documento, onChiudi, onSalvato }: {
  documento: Documento; onChiudi: () => void; onSalvato: () => void;
}) {
  const id = useId();
  const c0 = documento.correzione;
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [chiediTogli, setChiediTogli] = useState(false);

  async function invia(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const tipo = String(fd.get('tipo'));
    const motivo = String(fd.get('motivo') ?? '').trim();
    const valoreTesto = String(fd.get('valore') ?? '').trim().replace(',', '.');
    if (!motivo) { setErrore('Scrivi il motivo della correzione'); return; }
    let valore: number | undefined;
    if (tipo !== 'nessuna') {
      if (!valoreTesto || Number.isNaN(Number(valoreTesto))) { setErrore(tipo === 'pct' ? 'Indica una percentuale fra 0 e 100' : 'Indica un importo in euro'); return; }
      valore = Number(valoreTesto);
      if (tipo === 'pct' && (valore < 0 || valore > 100)) { setErrore('Indica una percentuale fra 0 e 100'); return; }
      if (tipo === 'importo' && valore <= 0) { setErrore('Indica un importo positivo'); return; }
    }
    setErrore(''); setAttesa(true);
    try {
      const r = await api(`documenti-fiscali/${documento.documento_id}/correzione`, { tipo, valore, motivo }, 'PUT');
      if (!r.ok) { setErrore(r.messaggio); return; }
      avviso('Correzione salvata');
      onSalvato();
    } finally {
      setAttesa(false);
    }
  }

  async function togli() {
    setChiediTogli(false);
    setErrore(''); setAttesa(true);
    try {
      const r = await api(`documenti-fiscali/${documento.documento_id}/correzione`, undefined, 'DELETE');
      if (!r.ok) { setErrore(r.messaggio); return; }
      avviso('Correzione tolta');
      onSalvato();
    } finally {
      setAttesa(false);
    }
  }

  return (
    <Modale titolo={`Provvigione di ${documento.subagente} · ${documento.numero}`}
      testo={`${documento.cliente} · ${documento.fornitore} · imponibile ${euro(documento.imponibile)}. Ora: ${euro(documento.provvigione)} (${pct(documento.pct)}${c0 ? ', ' + (c0.tipo === 'importo' ? 'importo fisso' : c0.tipo === 'nessuna' ? 'nessuna provvigione' : 'corretta') + ': ' + c0.motivo : ''}). Cambia solo quanto va al subagente.`}
      onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        {c0 && <button type="button" className="btn pericolo" onClick={() => setChiediTogli(true)} disabled={attesa}>Togli la correzione</button>}
        <button type="submit" form={id} className="btn" disabled={attesa}>{attesa ? 'Attendi…' : 'Salva la correzione'}</button>
      </>}>
      <form id={id} className="modulo modulo-2" onSubmit={invia} noValidate>
        <Campo nome="tipo" etichetta="Provvigione al subagente" tipo="select" largo valore={c0 ? c0.tipo : 'pct'}
          opzioni={[{ value: 'pct', label: 'Altra percentuale' }, { value: 'importo', label: 'Importo fisso' }, { value: 'nessuna', label: 'Nessuna provvigione' }]} />
        <Campo nome="valore" etichetta="Percentuale o importo" valore={c0 && c0.tipo !== 'nessuna' ? String(c0.valore) : ''}
          aiuto="% per «Altra percentuale», € per «Importo fisso»; vuoto per «Nessuna»." />
        <div className="campo largo">
          <label htmlFor="c-motivo">Motivo</label>
          <textarea id="c-motivo" name="motivo" rows={3} defaultValue={c0 ? c0.motivo : ''} />
          <span className="aiuto">Obbligatorio: compare nel prospetto del subagente e nel registro.</span>
        </div>
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
      {chiediTogli && <Conferma titolo="Togliere la correzione?"
        testo="Torna a valere la regola dell’agenzia o la percentuale dello scaglione."
        etichetta="Togli" pericolo onRisposta={(si) => (si ? void togli() : setChiediTogli(false))} />}
    </Modale>
  );
}
