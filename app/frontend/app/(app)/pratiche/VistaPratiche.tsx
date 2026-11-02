'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, Stato, type Variante } from '@/componenti/Piccoli';
import { api } from '@/lib/api';
import { cliente, fornitore, subagente } from '@/lib/entita';
import { euro, euroSegno } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Elenco pratiche (F2-A1, §7.2): filtri, conteggi dei segmenti, ordinamento e pagine arrivano dal
// server (D-23, V12). Qui si compone soltanto: nessun calcolo nel browser.
interface Pratica {
  id: string;
  numero: string;
  cliente_id: string;
  cliente: string;
  fornitore_id: string;
  fornitore: string;
  subagente_id: string | null;
  subagente: string | null;
  data: string;
  importo: number;
  stato: 'scaduta' | 'attesa' | 'confermata' | 'fatturata';
  nota: string | null;
  variazioni: boolean;
  variazione: number;
}
interface Risposta {
  righe: Pratica[];
  totale: number;
  conteggi: Record<string, number>;
  totali: { importo: number };
  pagina: number;
  pagine: number;
  per_pagina: number;
}

const STATI: { value: string; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'scaduta', label: 'Conferma in ritardo' },
  { value: 'attesa', label: 'Attesa conferma' },
  { value: 'confermata', label: 'Attesa fattura' },
  { value: 'fatturata', label: 'Fatturate' },
  { value: 'variazioni', label: 'Con variazioni' },
];
const ETICHETTA: Record<Pratica['stato'], { testo: string; v: Variante }> = {
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
};

export function VistaPratiche() {
  const router = useRouter();
  const [valori, setValori] = useMemoria<Valori>('filtri', { stato: 'tutte', q: '', fornitori: [], clienti: [], subagenti: [] });
  const [ordine, setOrdine] = useMemoria<{ key: string; dir: 'asc' | 'desc' }>('ordine', { key: 'stato', dir: 'asc' });
  const [pagina, setPagina] = useMemoria<number>('pagina', 0);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('stato', String(valori.stato ?? 'tutte'));
      if (valori.q) p.set('q', String(valori.q));
      for (const nome of ['fornitori', 'clienti', 'subagenti']) {
        const scelte = (valori[nome] as string[] | undefined) ?? [];
        if (scelte.length) p.set(nome, scelte.join(','));
      }
      p.set('ordina', ordine.key);
      p.set('dir', ordine.dir);
      p.set('pagina', String(pagina));
      void api<Risposta>('pratiche?' + p.toString()).then((r) => {
        if (!vivo) return;
        if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
      });
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [valori, ordine, pagina]);

  const colonne: Colonna<Pratica>[] = [
    { key: 'numero', header: 'Pratica', cell: (p) => <b>{p.numero}</b> },
    { key: 'cliente', header: 'Cliente', grow: true, cell: (p) => p.cliente || '—' },
    { key: 'fornitore', header: 'Fornitore', cell: (p) => p.fornitore || '—' },
    { key: 'data', header: 'Data ordine', tipo: 'data' },
    { key: 'importo', header: 'Importo', tipo: 'euro' },
    {
      key: 'stato', header: 'Stato', cell: (p) => {
        const s = ETICHETTA[p.stato];
        return <><Stato v={s.v}>{s.testo}</Stato>
          {p.nota && <span className="sec-riga">{p.nota}</span>}
          {p.variazioni && <span className="sec-riga">variazioni fra le fasi
            {Math.abs(p.variazione) >= 0.005 && <> · <span className={p.variazione < 0 ? 'negativo' : 'positivo'}>{euroSegno(p.variazione)}</span></>}
          </span>}
        </>;
      },
    },
    { key: 'subagente', header: 'Subagente', cell: (p) => p.subagente ?? <span className="testo-tenue">—</span> },
  ];

  return (
    <Pagina titolo="Pratiche" pieno sottotitolo="Ogni ordine a fornitore con i suoi documenti. Lo stato avanza quando arrivano conferma e fattura.">
      <div className="pila riempi">
        <FilterBar valori={valori} onChange={(v) => { setValori(v); setPagina(0); }} riepilogo campi={[
          { nome: 'stato', tipo: 'segmenti', etichetta: 'Stato', opzioni: STATI.map((s) => ({ ...s, n: dati?.conteggi[s.value] ?? 0 })) },
          { nome: 'q', tipo: 'cerca', etichetta: 'Ricerca', placeholder: 'Cerca pratica, cliente, documento' },
          { nome: 'fornitori', tipo: 'ricerca', entita: fornitore, multipla: true, etichetta: 'Fornitore', placeholder: 'Tutti i fornitori' },
          { nome: 'clienti', tipo: 'ricerca', entita: cliente, multipla: true, etichetta: 'Cliente', placeholder: 'Tutti i clienti' },
          { nome: 'subagenti', tipo: 'ricerca', entita: subagente, multipla: true, etichetta: 'Subagente', placeholder: 'Tutti i subagenti' },
        ]} />
        <div className="riempi">
          {errore && !dati
            ? <Pannello><div className="vuoto"><b>Pratiche non caricate</b>{errore}</div></Pannello>
            : <DataTable righe={dati?.righe ?? []} colonne={colonne} chiave={(p) => p.id}
                perPagina={dati?.per_pagina ?? 25}
                ordine={ordine} onOrdine={(o) => { setOrdine(o); setPagina(0); }}
                paginaServer={dati ? { pagina: dati.pagina, pagine: dati.pagine, totale: dati.totale } : { pagina: 0, pagine: 1, totale: 0 }}
                onPagina={setPagina}
                filtro={JSON.stringify({ valori, ordine })}
                piede={dati ? 'Totale importo ' + euro(dati.totali.importo) : ''}
                onRowClick={(p) => router.push('/pratiche/' + p.id)}
                emptyText="Nessuna pratica" emptyHint="Prova a togliere il filtro o a cambiare la ricerca." />}
        </div>
      </div>
    </Pagina>
  );
}
