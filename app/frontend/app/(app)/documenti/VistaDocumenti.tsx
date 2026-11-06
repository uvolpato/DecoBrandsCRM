'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { Caricamento, Elenco } from '@/componenti/Flussi';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, quando, Stato, type Variante } from '@/componenti/Piccoli';
import { useSagome } from '@/componenti/Sagoma';
import { usePuo } from '@/componenti/Utente';
import { api, caricaPdf } from '@/lib/api';
import { euro } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Pagina Documenti (F6-A4b, §7.9): caricamento, elenco con i segmenti dei quattro stati (D-23),
// ricerca e filtri sul server, dettaglio a sé. Qui si compone soltanto (V12, D-28).

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};
const STATI = [
  { value: 'da_controllare', label: 'Da controllare' },
  { value: 'in_coda', label: 'In coda' },
  { value: 'in_lettura', label: 'In lettura' },
  { value: 'errore', label: 'Errore' },
];
const VUOTO: Record<string, string> = {
  da_controllare: 'Nessun documento da controllare',
  in_coda: 'Nessun documento in coda',
  in_lettura: 'Nessun documento in lettura',
  errore: 'Nessun documento in errore',
};
const LIVELLO: Record<string, { testo: string; v: Variante }> = {
  affidabile: { testo: 'Affidabile', v: 'ok' },
  da_controllare: { testo: 'Da controllare', v: 'attesa' },
  bassa: { testo: 'Affidabilità bassa', v: 'errore' },
};

interface Documento {
  id: string; file_nome: string; file_tipo: string; tipo: string | null; numero: string | null;
  data: string | null; fornitore_id: string | null; fornitore: string | null; codice_cliente: string | null;
  cliente: string | null; importo: number | null; livello: string | null; ricevuto_il: string;
  letto_il: string | null; controlli_n: number;
}
interface Risposta {
  documenti: Documento[];
  conteggi: Record<string, number>;
  totale: number; pagina: number; per_pagina: number;
}

export function VistaDocumenti() {
  const router = useRouter();
  const puo = usePuo();
  const puoModifica = puo('provvigioni.modifica');
  const [valori, setValori] = useMemoria<Valori>('filtri', { stato: 'da_controllare', q: '', tipo: '', livello: '' });
  const [pagina, setPagina] = useMemoria<number>('pagina', 0);
  const [versione, setVersione] = useState(0);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const sagome = useSagome(caricando);
  const primaVolta = useRef(true);

  const parametri = () => {
    const p = new URLSearchParams();
    p.set('stato', String(valori.stato ?? 'da_controllare'));
    if (valori.q) p.set('q', String(valori.q));
    if (valori.tipo) p.set('tipo', String(valori.tipo));
    if (valori.livello) p.set('livello', String(valori.livello));
    p.set('pagina', String(pagina + 1));
    return p;
  };

  useEffect(() => {
    let vivo = true;
    setCaricando(true);
    const t = setTimeout(() => {
      void api<Risposta>('documenti?' + parametri().toString()).then((r) => {
        if (!vivo) return;
        setCaricando(false);
        if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
      });
    }, primaVolta.current ? 0 : 250);
    primaVolta.current = false;
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri sono valori (valori, pagina, versione)
  }, [valori, pagina, versione]);

  async function carica(files: File[]) {
    let letti = 0;
    for (const f of files) {
      const r = await caricaPdf(f);
      if (r.ok) letti++;
      else avviso(r.messaggio, true);
    }
    if (letti) {
      avviso(letti === 1 ? 'Documento caricato: la lettura parte da sola' : 'Documenti caricati: la lettura parte da sola');
      setVersione((v) => v + 1);
    }
  }

  const stato = String(valori.stato ?? 'da_controllare');
  const pagine = dati ? Math.max(1, Math.ceil(dati.totale / dati.per_pagina)) : 1;
  const colonne: Colonna<Documento>[] = [
    {
      key: 'documento', header: 'Documento', grow: true,
      cell: (d) => <><b>{d.tipo ? TIPO[d.tipo] ?? d.tipo : 'Documento'}{d.numero ? ' ' + d.numero : ''}</b><span className="sec-riga">{d.file_nome}</span></>,
    },
    { key: 'fornitore', header: 'Fornitore', cell: (d) => d.fornitore ?? <span className="testo-tenue">non riconosciuto</span> },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'importo', header: 'Importo', tipo: 'euro', cell: (d) => d.importo == null ? <span className="testo-tenue">—</span> : euro(d.importo) },
    {
      key: 'livello', header: 'Livello', cell: (d) => {
        const l = d.livello ? LIVELLO[d.livello] : null;
        if (l) return <Stato v={l.v}>{l.testo}</Stato>;
        return stato === 'errore' ? <Stato v="errore">Errore</Stato>
          : stato === 'in_lettura' ? <Stato v="info">In lettura</Stato>
            : stato === 'in_coda' ? <Stato v="neutro">In coda</Stato> : <span className="testo-tenue">—</span>;
      },
    },
    { key: 'controlli', header: 'Controlli', cell: (d) => d.controlli_n ? <Stato v="errore">{d.controlli_n}</Stato> : <span className="testo-tenue">—</span> },
    { key: 'ricevuto', header: 'Ricevuto', cell: (d) => quando(d.ricevuto_il) },
  ];

  return (
    <Pagina titolo="Documenti" pieno
      sottotitolo="Qui entrano tutti i documenti dei fornitori: ordini, conferme, fatture, note di credito e bollettini. Caricali, controlla i dati letti e abbinali: la pratica avanza da sola.">
      <div className="pila riempi">
        {puoModifica && (
          <Pannello senzaMargine>
            <Caricamento titolo="Trascina qui i documenti"
              testo="PDF di ordini, conferme, fatture e note di credito; bollettini in PDF. Gli Excel non si prendono."
              accetta="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" onFile={(f) => void carica(f)} />
          </Pannello>
        )}
        <FilterBar valori={valori} onChange={(v) => { setValori(v); setPagina(0); }} riepilogo caricando={sagome && !dati} campi={[
          { nome: 'stato', tipo: 'segmenti', etichetta: 'Stato', opzioni: STATI.map((s) => ({ ...s, n: dati?.conteggi[s.value] })) },
          { nome: 'q', tipo: 'cerca', etichetta: 'Ricerca', placeholder: 'Cerca numero, file, fornitore o cliente' },
          { nome: 'tipo', tipo: 'select', etichetta: 'Tipo', opzioni: [{ value: '', label: 'Tutti i tipi' }, ...Object.entries(TIPO).map(([value, label]) => ({ value, label }))] },
          { nome: 'livello', tipo: 'select', etichetta: 'Livello', opzioni: [{ value: '', label: 'Tutti i livelli' }, ...Object.entries(LIVELLO).map(([value, x]) => ({ value, label: x.testo }))] },
        ]} />
        <div className="riempi">
          {errore && !dati
            ? <Pannello><div className="vuoto"><b>Documenti non caricati</b>{errore}</div></Pannello>
            : <DataTable righe={dati?.documenti ?? []} colonne={colonne} chiave={(d) => d.id} caricando={sagome}
                perPagina={dati?.per_pagina ?? 25}
                paginaServer={dati ? { pagina: dati.pagina - 1, pagine, totale: dati.totale } : { pagina: 0, pagine: 1, totale: 0 }}
                onPagina={setPagina}
                filtro={JSON.stringify(valori)}
                onRowClick={(d) => router.push('/documenti/' + d.id)}
                emptyText={VUOTO[stato] ?? 'Nessun documento'}
                emptyHint={valori.q || valori.tipo || valori.livello ? 'Prova a togliere un filtro o a cambiare la ricerca.' : 'I documenti nuovi compaiono qui appena letti.'} />}
        </div>
        {dati && !dati.documenti.length && (
          <Pannello titolo="Come entrano i documenti">
            <Elenco voci={[
              { testo: <><b>Carica</b> il file qui sopra o con <b>Carica documenti</b> nella barra a sinistra, da qualsiasi pagina.</> },
              { testo: <><b>Lettura automatica</b>: il sistema riconosce fornitore, tipo, numero, data, codice cliente e righe.</> },
              { testo: <><b>Controlla</b> i dati letti e correggili se serve.</> },
              { testo: <><b>Abbina</b>: un ordine apre una nuova pratica; conferme, fatture e note di credito si agganciano alla pratica proposta; un bollettino si registra e si verifica riga per riga.</> },
            ]} />
            <Nota>Le foto dei documenti arrivano come JPEG o PNG; gli Excel e i messaggi di Outlook si rifiutano.</Nota>
          </Pannello>
        )}
      </div>
    </Pagina>
  );
}
