'use client';
import { useEffect, useState } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { KpiRow, type Kpi } from '@/componenti/Kpi';
import { Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, quando, Stato, type Variante } from '@/componenti/Piccoli';
import { SagomaRiquadri, useSagome } from '@/componenti/Sagoma';
import { api } from '@/lib/api';
import { useMemoria } from '@/lib/memoria';

// Stato del sistema (F5-A5, §7.14): riquadri dei servizi che fanno da filtro, problemi da vedere,
// ultime esecuzioni. Stato, note, raggruppamenti e «cosa fare» arrivano già calcolati dal server
// (V12); la pagina si aggiorna da sola ogni 30 secondi (§7.14).

interface Servizio {
  id: string; nome: string; stato: 'ok' | 'attenzione' | 'errore'; nota: string;
  indirizzo: string | null; ultima: string | null; ritmo: string; problemi: number;
}
interface Problema {
  id: string; quando: string; livello: string; servizio: string; codice: string; testo: string;
  cosa_fare: string | null; chiave: string | null; volte: number; visto: boolean; stato: string; risolta_il: string | null;
}
interface Esecuzione {
  quando: string; servizio: string; esito: string | null; testo: string | null; misure: unknown; raggruppate?: number;
}
interface Risposta {
  servizi: Servizio[]; problemi: Problema[]; esecuzioni: Esecuzione[];
  conteggi: { da_vedere: number; tutti: number };
}

const STATO: Record<string, { testo: string; v: Variante }> = {
  ok: { testo: 'Funziona', v: 'ok' },
  attenzione: { testo: 'Da tenere d’occhio', v: 'attesa' },
  errore: { testo: 'Problema', v: 'errore' },
};
const ESITO: Record<string, { testo: string; v: Variante }> = {
  ok: { testo: 'Riuscita', v: 'ok' },
  attenzione: { testo: 'Attenzione', v: 'attesa' },
  errore: { testo: 'Errore', v: 'errore' },
};
const FILTRI: Valori = { vista: 'da_vedere' };

const statoDi = (s: string) => STATO[s] ?? { testo: s, v: 'neutro' as Variante };
const esitoDi = (e: string | null) => (e ? ESITO[e] ?? { testo: e, v: 'neutro' as Variante } : { testo: '—', v: 'neutro' as Variante });

/** Sotto i 1100 px le due colonne si impilano: la seconda tabella ha bisogno di un'altezza sua. */
function useStretto() {
  const [stretto, setStretto] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 1100px)');
    const cambia = () => setStretto(m.matches);
    cambia();
    m.addEventListener('change', cambia);
    return () => m.removeEventListener('change', cambia);
  }, []);
  return stretto;
}

export function VistaSistema() {
  const [valori, setValori] = useMemoria<Valori>('filtri', FILTRI);
  const [servizio, setServizio] = useMemoria<string | null>('servizio', null);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [controllando, setControllando] = useState(false);
  const [versione, setVersione] = useState(0);
  const sagome = useSagome(caricando && !dati);
  const stretto = useStretto();

  const ricarica = () => setVersione((v) => v + 1);

  useEffect(() => {
    let vivo = true;
    const p = new URLSearchParams({ vista: String(valori.vista ?? 'da_vedere') });
    if (servizio) p.set('servizio', servizio);
    setCaricando(true);
    void api<Risposta>('sistema?' + p.toString()).then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parametri: vista e servizio
  }, [valori.vista, servizio, versione]);

  // §7.14: la pagina si aggiorna da sola ogni 30 secondi mentre è aperta
  useEffect(() => {
    const t = setInterval(() => setVersione((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const nome = (id: string) => dati?.servizi.find((s) => s.id === id)?.nome ?? id;
  const daVedere = dati?.conteggi.da_vedere ?? 0;

  const visto = async (id: string) => {
    const r = await api('sistema/problemi/' + id + '/visto', {});
    if (!r.ok) { avviso(r.messaggio, true); return; }
    ricarica();
  };
  const visti = async () => {
    const r = await api('sistema/problemi/visti', {});
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Problemi segnati come visti');
    ricarica();
  };
  const controlla = async () => {
    setControllando(true);
    const r = await api<{ fatto: boolean }>('sistema/controlla', {});
    setControllando(false);
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso(r.dati.fatto ? 'Servizi controllati' : 'Controllo avviato: è ancora in corso, la pagina si aggiorna da sola');
    ricarica();
  };

  const azioni: Azione[] = [
    { etichetta: controllando ? 'Controllo in corso…' : 'Controlla adesso', icona: 'sistema', variante: 'sec', onClick: () => void controlla(), disabilitato: controllando },
    ...(daVedere ? [{ etichetta: 'Segna tutti come visti', icona: 'spunta', onClick: () => void visti(), conta: daVedere, contaVariante: 'errore' as const }] : []),
  ];

  const kpi: Kpi[] = (dati?.servizi ?? []).map((s) => {
    const st = statoDi(s.stato);
    return {
      id: s.id, etichetta: s.nome, valore: st.testo, variante: (s.stato === 'ok' ? 'ok' : s.stato === 'attenzione' ? 'attesa' : 'errore'),
      dettagli: [
        { testo: s.nota, variante: s.stato === 'ok' ? undefined : s.stato === 'attenzione' ? 'attesa' as const : 'errore' as const },
        { testo: (s.indirizzo ? s.indirizzo + ' · ' : '') + (s.ultima ? 'ultimo: ' + quando(s.ultima) : 'mai eseguito') + ' · ' + s.ritmo },
        ...(s.problemi ? [{ testo: s.problemi + (s.problemi === 1 ? ' problema da vedere' : ' problemi da vedere'), variante: 'errore' as const }] : []),
      ],
    };
  });

  const colonneProblemi: Colonna<Problema>[] = [
    {
      key: 'quando', header: 'Quando', cell: (p) => {
        const l = p.livello === 'errore' ? { testo: 'Errore', v: 'errore' as Variante } : { testo: 'Attenzione', v: 'attesa' as Variante };
        return <>{quando(p.quando)}<span className="sec-riga"><Stato v={l.v}>{l.testo}</Stato></span></>;
      },
    },
    {
      key: 'testo', header: 'Problema', grow: true, cell: (p) => <>
        <b>{p.testo}</b> <span className="testo-tenue">· {nome(p.servizio)}</span>
        {p.cosa_fare && <span className="sec-riga">Cosa fare: {p.cosa_fare}</span>}
        {p.volte > 1 && <span className="sec-riga">si è ripetuto {p.volte} volte</span>}
        {p.risolta_il && <span className="sec-riga">Risolto il {quando(p.risolta_il)}</span>}
      </>,
    },
    {
      key: 'visto', header: '', sortable: false, cell: (p) => (p.stato === 'chiusa' ? <span className="testo-tenue">chiuso</span>
        : p.visto ? <span className="testo-tenue">visto</span>
          : <button type="button" className="btn sec piccolo" onClick={() => void visto(p.id)}>Segna come visto</button>),
    },
  ];

  const colonneEsecuzioni: Colonna<Esecuzione>[] = [
    { key: 'quando', header: 'Quando', cell: (e) => quando(e.quando) },
    {
      key: 'testo', header: 'Cosa', grow: true, cell: (e) => {
        const es = esitoDi(e.esito);
        return <>
          <Stato v={es.v}>{es.testo}</Stato> <b>{nome(e.servizio)}</b>
          {e.testo && <span className="sec-riga">{e.testo}</span>}
        </>;
      },
    },
  ];

  const notaProblemi = dati ? (daVedere ? `${daVedere} da vedere` : 'nessuno da vedere') : ' ';

  return (
    <Pagina titolo="Stato del sistema" pieno azioni={azioni}
      sottotitolo="I servizi che lavorano da soli: lettura della casella, lettura dei documenti, sincronizzazione da Integra, invio email.">
      <div className="pila riempi">
        {sagome && !dati ? <SagomaRiquadri n={4} /> : <KpiRow voci={kpi} selezionata={servizio} onSeleziona={setServizio} />}
        <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.5fr) minmax(0,1fr)' } as React.CSSProperties}>
          <div className="riempi" style={{ display: 'flex', minHeight: 0 }}>
            <Pannello titolo="Problemi" nota={notaProblemi} riempi senzaMargine>
              <FilterBar valori={valori} onChange={setValori} caricando={sagome}
                campi={[{
                  nome: 'vista', tipo: 'segmenti', etichetta: 'Vista', opzioni: [
                    { value: 'da_vedere', label: 'Da vedere', n: dati?.conteggi.da_vedere },
                    { value: 'tutti', label: 'Tutti', n: dati?.conteggi.tutti },
                  ],
                }]} />
              {errore && !dati
                ? <div className="vuoto"><b>Stato del sistema non caricato</b>{errore}</div>
                : <DataTable righe={dati?.problemi ?? []} colonne={colonneProblemi} chiave={(p) => p.id} compatta
                    caricando={dati ? caricando : sagome} filtro={JSON.stringify(valori) + String(servizio)}
                    rowClass={(p) => (p.visto || p.stato === 'chiusa' ? 'decisa' : '')}
                    emptyText="Nessun problema" emptyHint={servizio ? 'Per questo servizio va tutto bene.' : 'Va tutto bene.'} />}
            </Pannello>
          </div>
          <div className="riempi" style={{ display: 'flex', minHeight: 0, ...(stretto ? { height: '24rem', flex: 'none' } : {}) }}>
            <Pannello titolo="Ultime esecuzioni" riempi senzaMargine>
              <DataTable righe={dati?.esecuzioni ?? []} colonne={colonneEsecuzioni} chiave={(e) => e.quando + e.servizio + (e.raggruppate ?? '')} compatta
                caricando={dati ? caricando : sagome} filtro={`esecuzioni|${valori.vista}|${servizio}`}
                emptyText="Nessuna esecuzione" emptyHint="I giri dei servizi compaiono qui." />
            </Pannello>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
