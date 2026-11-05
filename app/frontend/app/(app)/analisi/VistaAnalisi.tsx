'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { COLORI_GRAFICI, Grafico, type SerieGrafico } from '@/componenti/Grafico';
import { KpiRow, type Kpi } from '@/componenti/Kpi';
import { Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { PeriodoMesi } from '@/componenti/PeriodoMesi';
import { avviso } from '@/componenti/Piccoli';
import { Sagoma, SagomaRiquadri, SagomaTabella, useSagome } from '@/componenti/Sagoma';
import { api } from '@/lib/api';
import { cliente, fornitore, subagente } from '@/lib/entita';
import { num, pct } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Analisi (F4-A5, §7.22): la BI del CRM. Numeri, grafici e tabella arrivano già calcolati dal server
// (V12, dal motore `fattiAnalisi`: competenza = data del documento, D-19); qui si compone soltanto.
// Un clic su una barra o su una riga aggiunge quella voce al filtro (D-18); ogni grafico per
// dimensione ignora il proprio filtro e mette in risalto le voci scelte.

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const TUTTI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const mpiu = (k: string, n: number) => { const t = Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1 + n; return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0'); };
const etichetta = (k: string) => (TUTTI[Number(k.slice(5, 7)) - 1] ?? '') + ' ' + k.slice(0, 4);
const etichettaBreve = (k: string) => MESI[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(2, 4);
const corto = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

type Dimensione = 'fornitori' | 'subagenti' | 'clienti';
interface Riga {
  chiave: string; nome: string; documenti?: number; clienti?: number; quota?: number;
  fatturato: number; prese: number; pagate: number; margine: number;
  numero?: string; tipo?: string; data?: string; pratica_id?: string; fornitore?: string; subagente?: string;
}
interface GraficoBarre { etichette: string[]; chiavi: (string | null)[]; valori: number[] }
interface Risposta {
  periodo: { da: string; a: string; primo: string; ultimo: string; mesi: number };
  precedente: { da: string; a: string };
  confronto: { possibile: boolean; etichetta: string };
  filtri_attivi: boolean;
  voci: Record<Dimensione, string[]>;
  numeri: {
    fatturato: number; prese: number; pagate: number; margine: number; documenti: number; clienti: number;
    precedente: { fatturato: number; prese: number; pagate: number; margine: number };
    variazione: Record<'fatturato' | 'prese' | 'pagate' | 'margine', number | null>;
    pct: { prese_su_fatturato: number; pagate_su_prese: number; margine_su_prese: number };
  };
  grafici: {
    andamento: { mesi: string[]; serie: SerieGrafico[] };
    fornitori: GraficoBarre;
    subagenti: { etichette: string[]; chiavi: string[]; serie: SerieGrafico[] };
    clienti: GraficoBarre;
  };
  tabella: { raggruppa: string; totale: number; righe: Riga[] };
}

const RAGGRUPPA = [
  { value: 'subagente', label: 'Per subagente' }, { value: 'fornitore', label: 'Per fornitore' }, { value: 'cliente', label: 'Per cliente' },
  { value: 'mese', label: 'Per mese' }, { value: 'documento', label: 'Documenti' },
];
const DIM_FILTRO: Record<string, Dimensione | undefined> = { fornitore: 'fornitori', subagente: 'subagenti', cliente: 'clienti' };
const TITOLO_VOCE: Record<string, string> = { fornitore: 'Fornitore', subagente: 'Subagente', cliente: 'Cliente', mese: 'Mese' };
const NOTE: Record<string, string> = {
  xlsx: 'Foglio Riepilogo con i 4 numeri e il periodo precedente, un foglio per subagente, fornitore, cliente e mese con i totali a formule, l’elenco dei documenti.',
  csv: 'Solo l’elenco dei documenti filtrati, separatore punto e virgola, per altri programmi.',
};

export function VistaAnalisi() {
  const [valori, setValori] = useMemoria<Valori>('filtri', { fornitori: [], subagenti: [], clienti: [] });
  const [periodo, setPeriodo] = useMemoria<{ da: string; a: string }>('periodo', { da: '', a: '' });
  const [raggruppa, setRaggruppa] = useMemoria<string>('raggruppa', 'subagente');
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [esporta, setEsporta] = useState(false);
  const sagome = useSagome(caricando && !dati);

  const parametri = () => {
    const p = new URLSearchParams();
    if (periodo.da) p.set('dal', periodo.da);
    if (periodo.a) p.set('al', periodo.a);
    for (const d of ['fornitori', 'subagenti', 'clienti'] as const) {
      const scelte = (valori[d] as string[] | undefined) ?? [];
      if (scelte.length) p.set(d, scelte.join(','));
    }
    return p;
  };

  // Arrivando dalla Liquidazione con *Analisi completa* i parametri stanno nell'indirizzo (F4-A1, §7.8):
  // si applicano prima della prima richiesta, e l'indirizzo torna pulito così ricaricare non li riapplica.
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const da = p.get('dal'), a = p.get('al');
    const q = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean);
    if (da && a) setPeriodo({ da, a });
    // col link arrivano solo i filtri del pulsante: gli altri si tolgono
    if (p.toString()) {
      setValori({ fornitori: q('fornitori'), subagenti: q('subagenti'), clienti: q('clienti') });
      window.history.replaceState(null, '', window.location.pathname);
    }
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una volta sola all'apertura
  }, []);

  useEffect(() => {
    if (!pronto) return;
    let vivo = true;
    setCaricando(true);
    const p = parametri();
    p.set('raggruppa', raggruppa);
    void api<Risposta>('analisi?' + p.toString()).then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri sono valori (valori, periodo, raggruppa); `pronto` fa partire la prima richiesta
  }, [pronto, valori, periodo, raggruppa]);

  const mesi = dati?.periodo.mesi ?? 12;
  const scelteDi = (d: Dimensione) => (valori[d] as string[] | undefined) ?? [];
  const alterna = (d: Dimensione, chiave: string) => {
    const ch = scelteDi(d);
    setValori({ ...valori, [d]: ch.includes(chiave) ? ch.filter((x) => x !== chiave) : [...ch, chiave] });
  };
  /** Cambiando durata il periodo finisce nello stesso mese di prima (§7.22). */
  const cambia = (v: Valori) => {
    const n = Number(v.mesi);
    if (dati && n !== dati.periodo.mesi) setPeriodo({ da: mpiu(dati.periodo.a, -(n - 1)), a: dati.periodo.a });
    setValori({ fornitori: (v.fornitori as string[] | undefined) ?? [], subagenti: (v.subagenti as string[] | undefined) ?? [], clienti: (v.clienti as string[] | undefined) ?? [] });
  };
  const sposta = (n: number) => { if (dati) setPeriodo({ da: mpiu(dati.periodo.da, n), a: mpiu(dati.periodo.a, n) }); };
  const evidenzia = (chiavi: (string | null)[], d: Dimensione) =>
    chiavi.map((k, i) => (k && scelteDi(d).includes(k) ? i : -1)).filter((i) => i >= 0);

  const kpi = (n: Risposta['numeri'], confronto: Risposta['confronto']): Kpi[] => {
    const varia = (chiave: keyof Risposta['numeri']['variazione']) => {
      if (!confronto.possibile) return { testo: 'nessun dato per il confronto' };
      const v = n.variazione[chiave];
      if (v == null) return { testo: 'nessun importo ' + confronto.etichetta };
      return { testo: (v >= 0 ? '+' : '−') + num(Math.abs(v)) + '% ' + confronto.etichetta, variante: v >= 0 ? 'ok' as const : 'errore' as const };
    };
    return [
      { id: 'f', etichetta: 'Fatturato dei clienti', valore: n.fatturato, variante: 'primario', dettagli: [varia('fatturato'), { testo: `${n.documenti} ${n.documenti === 1 ? 'fattura' : 'fatture'} · ${n.clienti} ${n.clienti === 1 ? 'cliente' : 'clienti'}` }] },
      { id: 'p', etichetta: 'Provvigioni dai fornitori', valore: n.prese, variante: 'info', dettagli: [varia('prese'), { testo: n.fatturato ? pct(n.pct.prese_su_fatturato) + ' del fatturato' : '' }].filter((d) => d.testo) },
      { id: 's', etichetta: 'Provvigioni ai subagenti', valore: n.pagate, variante: 'attesa', dettagli: [varia('pagate'), { testo: n.prese ? pct(n.pct.pagate_su_prese) + ' delle provvigioni' : '' }].filter((d) => d.testo) },
      { id: 'm', etichetta: 'Margine Decobrands', valore: n.margine, variante: 'ok', dettagli: [varia('margine'), { testo: n.prese ? pct(n.pct.margine_su_prese) + ' delle provvigioni' : '' }].filter((d) => d.testo) },
    ];
  };

  const colonneGruppo = (r: string): Colonna<Riga>[] => [
    {
      key: 'nome', header: TITOLO_VOCE[r] ?? 'Voce', grow: true,
      cell: (x) => <><b>{x.nome}</b><span className="sec-riga">{x.documenti} {x.documenti === 1 ? 'fattura' : 'fatture'}{r !== 'cliente' && <> · {x.clienti} {x.clienti === 1 ? 'cliente' : 'clienti'}</>}</span></>,
    },
    { key: 'fatturato', header: 'Fatturato', tipo: 'euro', totale: 'somma' },
    { key: 'prese', header: 'Dai fornitori', tipo: 'euro', totale: 'somma' },
    { key: 'pagate', header: 'Ai subagenti', tipo: 'euro', totale: 'somma' },
    { key: 'margine', header: 'Margine', tipo: 'euro', totale: 'somma' },
    { key: 'quota', header: 'Quota del fatturato', tipo: 'pct' },
  ];
  const colonneDocumenti: Colonna<Riga>[] = [
    { key: 'data', header: 'Data', tipo: 'data' },
    {
      key: 'numero', header: 'Documento',
      cell: (x) => <><Link href={'/pratiche/' + x.pratica_id}>{x.numero}</Link>{x.tipo === 'nota_credito' && <span className="sec-riga">nota di credito</span>}</>,
    },
    {
      key: 'nome', header: 'Cliente', grow: true,
      cell: (x) => <>{x.nome}<span className="sec-riga">{x.fornitore} · {x.subagente}</span></>,
    },
    { key: 'fatturato', header: 'Fatturato', tipo: 'euro', totale: 'somma' },
    { key: 'prese', header: 'Dai fornitori', tipo: 'euro', totale: 'somma' },
    { key: 'pagate', header: 'Ai subagenti', tipo: 'euro', totale: 'somma' },
    { key: 'margine', header: 'Margine', tipo: 'euro', totale: 'somma' },
  ];

  const scarica = async (formato: string) => {
    const p = parametri();
    p.set('formato', formato);
    const r = await fetch('/api/analisi/esporta?' + p.toString(), { credentials: 'same-origin' });
    if (!r.ok) { avviso('Non è stato possibile esportare: riprova.', true); return; }
    const nome = (r.headers.get('content-disposition') ?? '').match(/filename="([^"]+)"/)?.[1] ?? 'analisi.' + formato;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setEsporta(false);
    avviso('Scaricato ' + nome);
  };

  const dim = DIM_FILTRO[raggruppa];
  const periodoTesto = dati ? etichetta(dati.periodo.da) + ' – ' + etichetta(dati.periodo.a) + ' (' + dati.periodo.mesi + ' mesi)' : '';

  return (
    <Pagina titolo="Analisi"
      sottotitolo="Fatturato dei clienti, provvigioni dai fornitori e ai subagenti, margine Decobrands. Scegli periodo e filtri; un clic su un grafico o su una riga filtra tutta la pagina."
      azioni={[{ etichetta: 'Esporta', icona: 'scarica', variante: 'sec', consentito: true, disabilitato: !dati?.tabella.totale, titolo: dati?.tabella.totale ? '' : 'Nessun documento con questi filtri', onClick: () => setEsporta(true) }]}>
      <div className="pila" aria-busy={(!dati && sagome) || undefined}>
        <div className="barra-periodo barra-analisi">
          {dati
            ? <PeriodoMesi da={dati.periodo.da} mesi={dati.periodo.mesi} primo={dati.periodo.primo} ultimo={dati.periodo.ultimo} onChange={(da, a) => setPeriodo({ da, a })} />
            : sagome ? <Sagoma larghezza={190} altezza={34} arrotondato={8} /> : null}
          <div className="sposta-periodo">
            <button type="button" className="btn sec piccolo" title="Sposta il periodo di un mese indietro" disabled={!dati || dati.periodo.da <= dati.periodo.primo} onClick={() => sposta(-1)}>‹</button>
            <button type="button" className="btn sec piccolo" title="Sposta il periodo di un mese avanti" disabled={!dati || dati.periodo.a >= dati.periodo.ultimo} onClick={() => sposta(1)}>›</button>
          </div>
          <FilterBar classe="filtri-entita" valori={{ ...valori, mesi: String(mesi) }} onChange={cambia} caricando={!dati} riepilogo={{ prima: [{ etichetta: 'Periodo', testo: periodoTesto }] }} campi={[
            { nome: 'mesi', tipo: 'segmenti', etichetta: 'Durata', nelRiepilogo: false, opzioni: [{ value: '3', label: '3 mesi' }, { value: '6', label: '6 mesi' }, { value: '12', label: '12 mesi' }] },
            { nome: 'fornitori', tipo: 'ricerca', entita: fornitore, multipla: true, etichetta: 'Fornitore', placeholder: 'Tutti i fornitori', contesto: { limita: dati?.voci.fornitori ?? null } },
            { nome: 'subagenti', tipo: 'ricerca', entita: subagente, multipla: true, etichetta: 'Subagente', placeholder: 'Tutti i subagenti', contesto: { limita: dati?.voci.subagenti ?? null, tutti: true } },
            { nome: 'clienti', tipo: 'ricerca', entita: cliente, multipla: true, etichetta: 'Cliente', placeholder: 'Tutti i clienti', contesto: { limita: dati?.voci.clienti ?? null } },
          ]} />
        </div>

        {errore && !dati
          ? <Pannello><div className="vuoto"><b>Analisi non caricata</b>{errore}</div></Pannello>
          : !dati
            ? (sagome ? <>
              <SagomaRiquadri n={4} />
              <div className="griglia-bi">{[0, 1, 2, 3].map((i) => <Pannello key={i}><div style={{ height: 260 }}><Sagoma larghezza="100%" altezza="100%" /></div></Pannello>)}</div>
              <Pannello><SagomaTabella righe={8} colonne={7} /></Pannello>
            </> : null)
            : <>
              <KpiRow voci={kpi(dati.numeri, dati.confronto)} />
              {!dati.tabella.totale
                ? <Pannello><div className="vuoto"><b>Nessun documento con questi filtri nel periodo</b>Togli un filtro o scegli altri mesi.</div></Pannello>
                : <>
                  <div className={'griglia-bi' + (caricando ? ' in-aggiornamento' : '')}>
                    <Pannello titolo="Andamento" nota="provvigioni mese per mese">
                      <Grafico tipo="bar" altezza={260} titolo="Provvigioni dai fornitori, ai subagenti e margine per mese"
                        etichette={dati.grafici.andamento.mesi.map(etichettaBreve)}
                        serie={dati.grafici.andamento.serie.map((s, i) => ({ ...s, colore: [COLORI_GRAFICI.primario, COLORI_GRAFICI.neutro, COLORI_GRAFICI.ok][i] }))} />
                    </Pannello>
                    <Pannello titolo="Fatturato per fornitore" nota={scelteDi('fornitori').length ? 'clic su una voce scelta per toglierla' : 'clic per filtrare'}>
                      <Grafico tipo="doughnut" altezza={260} titolo="Distribuzione del fatturato per fornitore"
                        etichette={dati.grafici.fornitori.etichette}
                        serie={[{ nome: 'Fatturato', valori: dati.grafici.fornitori.valori, colore: ['#0d6efd', '#6ea8fe', '#198754', '#75b798', '#ffc107', '#ffda6a', '#6f42c1', '#adb5bd'] }]}
                        evidenzia={scelteDi('fornitori').length ? evidenzia(dati.grafici.fornitori.chiavi, 'fornitori') : undefined}
                        onClick={(i) => { const k = dati.grafici.fornitori.chiavi[i]; if (k) alterna('fornitori', k); }} />
                    </Pannello>
                    <Pannello titolo="Subagenti" nota="provvigioni generate dai loro clienti">
                      <Grafico tipo="bar" orizzontale impilato altezza={Math.max(170, 34 * dati.grafici.subagenti.etichette.length + 70)} titolo="Provvigioni generate per subagente"
                        etichette={dati.grafici.subagenti.etichette}
                        serie={dati.grafici.subagenti.serie.map((s, i) => ({ ...s, colore: [COLORI_GRAFICI.neutro, COLORI_GRAFICI.ok][i] }))}
                        evidenzia={scelteDi('subagenti').length ? evidenzia(dati.grafici.subagenti.chiavi, 'subagenti') : undefined}
                        onClick={(i) => { const k = dati.grafici.subagenti.chiavi[i]; if (k) alterna('subagenti', k); }} />
                    </Pannello>
                    <Pannello titolo="Primi 10 clienti" nota="per fatturato">
                      <Grafico tipo="bar" orizzontale altezza={Math.max(170, 30 * dati.grafici.clienti.etichette.length + 50)} titolo="Primi 10 clienti per fatturato"
                        etichette={dati.grafici.clienti.etichette.map((x) => corto(x, 26))}
                        serie={[{ nome: 'Fatturato', valori: dati.grafici.clienti.valori, colore: COLORI_GRAFICI.primario }]}
                        evidenzia={scelteDi('clienti').length ? evidenzia(dati.grafici.clienti.chiavi, 'clienti') : undefined}
                        onClick={(i) => { const k = dati.grafici.clienti.chiavi[i]; if (k) alterna('clienti', k); }} />
                    </Pannello>
                  </div>

                  <div className="pannello pannello-bi">
                    <div className="pannello-testa"><h2>Dettaglio</h2><div className="pannello-destra"><span className="pannello-nota">stessi filtri dei grafici</span></div></div>
                    <div className="pannello-corpo">
                      <FilterBar valori={{ raggruppa }} onChange={(v) => setRaggruppa(String(v.raggruppa))} campi={[{
                        nome: 'raggruppa', tipo: 'segmenti', etichetta: 'Raggruppa', opzioni: RAGGRUPPA.map((x) => ({ ...x, n: x.value === 'documento' ? dati.tabella.totale : undefined })),
                      }]} />
                      <DataTable naturale righe={dati.tabella.righe} chiave={(r) => r.chiave}
                        colonne={raggruppa === 'documento' ? colonneDocumenti : colonneGruppo(raggruppa)}
                        ordinamentoIniziale={raggruppa === 'documento' ? { key: 'data', dir: 'desc' } : raggruppa === 'mese' ? { key: 'chiave', dir: 'asc' } : { key: 'fatturato', dir: 'desc' }}
                        memoria="tabella" caricando={caricando}
                        filtro={JSON.stringify({ valori, periodo, raggruppa })}
                        rowClass={(r) => (dim && scelteDi(dim).includes(r.chiave) ? 'selezionata' : '')}
                        onRowClick={dim ? (r) => alterna(dim, r.chiave) : undefined}
                        piede={dim ? 'Clic su una riga per aggiungerla al filtro, di nuovo per toglierla.' : ''}
                        etichettaTotale="Totale" emptyText="Nessun dato" />
                    </div>
                  </div>
                  <Nota>Importi per data del documento (competenza): fatture e note di credito abbinate alle pratiche, comprese quelle non ancora riconosciute nei bollettini. Gli storni per mancato pagamento non cambiano questi numeri: spostano solo il momento in cui la provvigione è pagata (vedi Liquidazioni).</Nota>
                </>}
            </>}
      </div>

      {esporta && dati && <FinestraEsporta periodo={periodoTesto} filtri={dati.filtri_attivi} onChiudi={() => setEsporta(false)} onScarica={scarica} />}
    </Pagina>
  );
}

/** Scelta del formato (§7.22): Excel (con i fogli) o CSV dei documenti. Il PDF arriva con F4-A3. */
function FinestraEsporta({ periodo, filtri, onChiudi, onScarica }: {
  periodo: string; filtri: boolean; onChiudi: () => void; onScarica: (formato: string) => Promise<void>;
}) {
  const [formato, setFormato] = useState('xlsx');
  const [attesa, setAttesa] = useState(false);
  const scarica = async () => {
    setAttesa(true);
    try { await onScarica(formato); } finally { setAttesa(false); }
  };
  return (
    <Modale titolo="Esporta l’analisi" onChiudi={() => { if (!attesa) onChiudi(); }}
      testo={'Periodo ' + periodo + (filtri ? ', con i filtri attivi' : ', senza filtri') + '.'}
      piede={<>
        <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
        <button type="button" className="btn" onClick={scarica} disabled={attesa}>{attesa ? 'Attendi…' : 'Scarica'}</button>
      </>}>
      <div className="formato-esporta">
        <span>Formato</span>
        <div className="segmenti" role="radiogroup" aria-label="Formato del file">
          {[['xlsx', 'Excel'], ['csv', 'CSV']].map(([f, t]) => (
            <button key={f} type="button" role="radio" aria-checked={formato === f} aria-selected={formato === f} onClick={() => setFormato(f)}>{t}</button>
          ))}
        </div>
        <p className="testo-tenue" id="formato-nota">{NOTE[formato]}</p>
      </div>
    </Modale>
  );
}
