'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { AzioniRiga, type AzioneRiga } from '@/componenti/AzioniRiga';
import { ConfermaGrave } from '@/componenti/ConfermaGrave';
import { Pagina } from '@/componenti/Pagina';
import { avviso, quando } from '@/componenti/Piccoli';
import { usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { data } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Documenti scartati (F5-A7, §7.16): restano per i giorni fissati nelle Impostazioni, con motivo e
// autore. Recupera li rimette fra quelli da controllare; Elimina è dell'amministratore, con conferma.
// Filtri, conteggi dei segmenti (D-23) e pagine li calcola il server (V12).

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};

interface Scartato {
  id: string; scartato_il: string; da: string | null; tipo: string | null; numero: string | null;
  cliente: string | null; fornitore: string | null; fornitore_id: string | null; file_nome: string;
  motivo: string | null; nota: string | null; elimina_il: string | null;
}
interface Risposta {
  scartati: Scartato[];
  conteggi: { tutti: number; per_motivo: { motivo: string; n: number }[] };
  giorni: number; totale: number; pagina: number; pagine: number; per_pagina: number;
}

const FILTRI: Valori = { motivo: '', q: '' };

// D-171: azioni di riga a icone in colonne fisse
const AZIONI_SCARTATI: AzioneRiga[] = [
  { nome: 'recupera', icona: 'indietro', etichetta: 'Recupera' },
  { nome: 'elimina', icona: 'cestino', etichetta: 'Elimina', variante: 'pericolo' },
];

export function VistaScartati() {
  const router = useRouter();
  const puo = usePuo();
  const io = useUtente();
  const elimina = puo('provvigioni.elimina') && (io.ruolo === 'amministratore' || io.ruolo === 'superutente');
  const [valori, setValori] = useMemoria<Valori>('filtri', FILTRI);
  const [ordine, setOrdine] = useMemoria<{ key: string; dir: 'asc' | 'desc' }>('ordine', { key: 'scartato_il', dir: 'desc' });
  const [pagina, setPagina] = useMemoria<number>('pagina', 1);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [conferma, setConferma] = useState<Scartato | null>(null);

  const ricarica = () => setVersione((v) => v + 1);
  const [versione, setVersione] = useState(0);

  useEffect(() => {
    let vivo = true;
    const p = new URLSearchParams({ ordina: ordine.key, dir: ordine.dir, pagina: String(pagina) });
    for (const k of ['motivo', 'q']) {
      const v = String(valori[k] ?? '');
      if (v) p.set(k, v);
    }
    setCaricando(true);
    void api<Risposta>('scartati?' + p.toString()).then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri sono valori (filtri, ordine, pagina)
  }, [valori, ordine, pagina, versione]);

  const cambia = (v: Valori) => { setValori(v); setPagina(1); };

  const recupera = async (x: Scartato) => {
    const r = await api('scartati/' + x.id + '/recupera', {});
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso(`${TIPO[x.tipo ?? 'altro'] ?? 'Documento'} ${x.numero ?? ''} recuperato: è fra i documenti da controllare`);
    router.push('/documenti/' + x.id);
  };

  const eliminaDavvero = async () => {
    const x = conferma;
    setConferma(null);
    if (!x) return;
    const r = await api('scartati/' + x.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Documento eliminato');
    ricarica();
  };

  const colonne: Colonna<Scartato>[] = [
    {
      key: 'scartato_il', header: 'Scartato il', cell: (x) => <>
        {quando(x.scartato_il)}{x.da && <span className="sec-riga">da {x.da}</span>}
      </>,
    },
    {
      key: 'documento', header: 'Documento', grow: true, cell: (x) => <>
        <b>{TIPO[x.tipo ?? 'altro'] ?? 'Documento'} {x.numero ?? ''}</b>
        <span className="sec-riga">
          {x.fornitore_id ? <Link href={'/fornitori/' + x.fornitore_id}>{x.fornitore}</Link> : x.fornitore}
          {x.cliente ? ' · ' + x.cliente : ''}{x.file_nome ? ' · ' + x.file_nome : ''}
        </span>
      </>,
    },
    {
      key: 'motivo', header: 'Motivo', cell: (x) => <>
        {x.motivo ?? '—'}{x.nota && <span className="sec-riga">{x.nota}</span>}
      </>,
    },
    { key: 'elimina_il', header: 'Eliminato il', sortable: false, cell: (x) => data(x.elimina_il) },
    {
      key: 'az', header: '', align: 'center', sortable: false, cell: (x) => (
        <AzioniRiga azioni={AZIONI_SCARTATI} oggetto={'il documento ' + (x.numero ?? x.file_nome)}
          riga={[
            { nome: 'recupera', onClick: () => void recupera(x) },
            ...(elimina ? [{ nome: 'elimina', onClick: () => setConferma(x) }] : []),
          ]} />
      ),
    },
  ];

  const motivi = dati?.conteggi.per_motivo ?? [];
  const filtri = (
    <FilterBar valori={valori} onChange={cambia} riepilogo
      campi={[
        {
          nome: 'motivo', tipo: 'segmenti', etichetta: 'Motivo', opzioni: [
            { value: '', label: 'Tutti', n: dati?.conteggi.tutti },
            ...motivi.map((m) => ({ value: m.motivo, label: m.motivo, n: m.n })),
          ],
        },
        { nome: 'q', tipo: 'cerca', etichetta: 'Ricerca', placeholder: 'Numero, fornitore o file' },
      ]} />
  );

  return (
    <Pagina titolo="Documenti scartati" pieno
      sottotitolo={dati
        ? `Restano qui ${dati.giorni} giorni (Impostazioni › Conservazione), poi vengono eliminati. Recupera un documento scartato per errore: torna fra quelli da controllare.`
        : 'Restano qui per i giorni fissati nelle Impostazioni, poi vengono eliminati.'}>
      <div className="pila riempi">
        {filtri}
        <div className="riempi">
          {errore && !dati
            ? <div className="vuoto"><b>Documenti scartati non caricati</b>{errore}</div>
            : <DataTable righe={dati?.scartati ?? []} colonne={colonne} chiave={(x) => x.id}
                caricando={dati ? caricando : true}
                perPagina={dati?.per_pagina ?? 25}
                ordine={ordine} onOrdine={(o) => { setOrdine(o); setPagina(1); }}
                paginaServer={dati ? { pagina: (dati.pagina ?? 1) - 1, pagine: dati.pagine, totale: dati.totale } : { pagina: 0, pagine: 1, totale: 0 }}
                onPagina={(p) => setPagina(p + 1)}
                filtro={JSON.stringify({ valori })}
                memoria="scartati"
                emptyText="Nessun documento scartato"
                emptyHint='I documenti scartati da "Documenti" compaiono qui.' />}
        </div>
      </div>
      {conferma && (
        <ConfermaGrave titolo={`Eliminare definitivamente ${(TIPO[conferma.tipo ?? 'altro'] ?? 'documento').toLowerCase()} ${conferma.numero ?? ''}?`}
          punti={[
            'Il file e i dati letti vengono cancellati e non si possono più recuperare.',
            <>Fornitore: {conferma.fornitore ?? '—'} · File: {conferma.file_nome} · Scartato il {quando(conferma.scartato_il)}</>,
          ]}
          etichettaCasella="Ho capito: non si può più recuperare"
          etichetta="Elimina"
          onRisposta={(si) => (si ? void eliminaDavvero() : setConferma(null))} />
      )}
    </Pagina>
  );
}
