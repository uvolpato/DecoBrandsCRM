'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Caricamento, Elenco, ElencoSelezionabile } from '@/componenti/Flussi';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, quando, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { usePuo } from '@/componenti/Utente';
import { api, caricaPdf } from '@/lib/api';
import { euro } from '@/lib/formati';
import { VistaDocumento } from './[id]/VistaDocumento';

// Pagina Documenti come il prototipo (F6-A4b, §7.9, D-73): una sola pagina, a sinistra
// «Da controllare» con il caricamento e l'elenco selezionabile, a destra il documento scelto
// (dati, azione proposta, righe lette). Il file originale sta nella finestra di correzione.

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
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
  const { id } = useParams<{ id?: string }>();
  const puo = usePuo();
  const puoModifica = puo('provvigioni.modifica');
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [versione, setVersione] = useState(0);
  const sagome = useSagome(caricando);
  const attesaLettura = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    setCaricando(true);
    void api<Risposta>('documenti?stato=da_controllare&pagina=1&per_pagina=200').then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
  }, [versione]);

  useEffect(() => () => { if (attesaLettura.current) clearTimeout(attesaLettura.current); }, []);

  async function carica(files: File[]) {
    let letti = 0;
    for (const f of files) {
      const r = await caricaPdf(f);
      if (r.ok) letti++;
      else avviso(r.messaggio, true);
    }
    if (!letti) return;
    avviso(letti === 1 ? 'Documento caricato: la lettura parte da sola' : 'Documenti caricati: la lettura parte da sola');
    ricarica();
    // il lettore prende un documento ogni 15 s: si ricontrolla da soli appena finito
    if (attesaLettura.current) clearTimeout(attesaLettura.current);
    attesaLettura.current = setTimeout(ricarica, 16_000);
  }

  const documenti = dati?.documenti ?? [];
  const selezionato = id ?? documenti[0]?.id ?? null;
  const c = dati?.conteggi;
  const inAttesa = c ? (c.in_coda ?? 0) + (c.in_lettura ?? 0) : 0;

  return (
    <Pagina titolo="Documenti" pieno
      sottotitolo="Qui entrano tutti i documenti dei fornitori: ordini, conferme, fatture, note di credito e bollettini. Caricali, controlla i dati letti e abbinali: la pratica avanza da sola.">
      <div className="colonne riempi" style={{ '--colonne': 'minmax(300px,0.85fr) minmax(0,2fr)' } as React.CSSProperties}>
        <Pannello titolo="Da controllare" nota={dati ? `${dati.totale} ${dati.totale === 1 ? 'documento' : 'documenti'}` : ' '} riempi>
          {puoModifica && (
            <>
              <Caricamento titolo="Trascina qui i documenti"
                testo="PDF di ordini, conferme, fatture e note di credito; bollettini in PDF. Gli Excel non si prendono."
                accetta="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" onFile={(f) => void carica(f)} />
              <div style={{ height: 12 }} />
            </>
          )}
          {inAttesa > 0 && (
            <Nota>
              {c?.in_coda ? `${c.in_coda} in coda` : ''}
              {c?.in_coda && c?.in_lettura ? ' · ' : ''}
              {c?.in_lettura ? `${c.in_lettura} in lettura` : ''}
              {': compaiono qui appena letti.'}
            </Nota>
          )}
          {(c?.errore ?? 0) > 0 && (
            <Nota>{c!.errore} {c!.errore === 1 ? 'documento non letto' : 'documenti non letti'} dopo 3 tentativi: aprili per inserire i dati a mano o scartali.</Nota>
          )}
          {errore && !dati ? (
            <div className="vuoto"><b>Documenti non caricati</b>{errore}
              <button type="button" className="btn sec piccolo" onClick={ricarica}>Riprova</button></div>
          ) : sagome && !dati ? (
            <div className="pila" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => <Sagoma key={i} larghezza="100%" altezza={54} />)}
            </div>
          ) : documenti.length ? (
            <ElencoSelezionabile selezionata={selezionato ?? undefined}
              voci={documenti.map((d) => {
                const l = d.livello ? LIVELLO[d.livello] : null;
                return {
                  id: d.id,
                  href: '/documenti/' + d.id,
                  titolo: (d.tipo ? TIPO[d.tipo] ?? d.tipo : 'Documento') + (d.numero ? ' ' + d.numero : ''),
                  valore: d.importo == null ? '' : euro(d.importo),
                  sotto: (d.fornitore ?? 'fornitore non riconosciuto') + ' · caricato il ' + quando(d.ricevuto_il),
                  stato: l ? <Stato v={l.v}>{l.testo}</Stato> : undefined,
                };
              })} />
          ) : (
            <Nota>Nessun documento da controllare.</Nota>
          )}
          {dati && dati.totale > documenti.length && (
            <Nota>Mostrati i primi {documenti.length} documenti: gli altri compaiono man mano che li controlli.</Nota>
          )}
        </Pannello>

        {selezionato ? (
          <VistaDocumento id={selezionato} onFatto={ricarica} />
        ) : (
          <Pannello titolo="Come entrano i documenti" riempi>
            <Elenco voci={[
              { testo: <><b>Carica</b> il file qui a sinistra o con <b>Carica documenti</b> nella barra laterale, da qualsiasi pagina.</> },
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
