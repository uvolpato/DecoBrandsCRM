'use client';
// Documenti affiancati: il file originale a sinistra, i dati a destra (§7.3), come la finestra del
// prototipo. Le schede in alto passano da un documento all'altro senza chiudere.
import { useState } from 'react';
import { euro } from '@/lib/formati';
import { data as dataIt } from '@/lib/formati';
import { Modale } from './Modale';
import { Nota } from './Pagina';
import { Dettagli } from './Piccoli';

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};

export interface DocFile {
  id: string; arrivo_id: string | null; file_nome: string | null; tipo: string;
  numero: string | null; data: string; importo?: number | null; residuo?: number | null; note?: string | null;
}

export function Visualizzatore({ docs, iniziale, onChiudi, titolo = 'Documenti della pratica', testo = 'A sinistra il documento originale, a destra i suoi dati.' }: {
  docs: DocFile[]; iniziale: DocFile; onChiudi: () => void; titolo?: string; testo?: string;
}) {
  const [cur, setCur] = useState(iniziale);
  const src = '/api/documenti/' + cur.arrivo_id + '/file';
  // D-60: i pagamenti arrivano spesso come foto JPEG o PNG
  const foto = /\.(jpe?g|png)$/i.test(cur.file_nome ?? '');
  const nome = cur.numero || dataIt(cur.data);
  return (
    <Modale larga titolo={titolo} onChiudi={onChiudi} testo={testo}>
      {docs.length > 1 && (
        <div className="aff-schede" role="tablist" aria-label="Documenti con file">
          {docs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === cur.id} onClick={() => setCur(x)}>
              {TIPO[x.tipo] ?? x.tipo}<span>{x.numero || dataIt(x.data)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="colonne pari" style={{ alignItems: 'start' }}>
        {foto
          ? <img src={src} alt={'Foto del documento ' + nome}
            style={{ width: '100%', border: 0, borderRadius: 8, background: '#f1f3f5' }} />
          : <object data={src} type="application/pdf" aria-label={'PDF di ' + nome}
            style={{ width: '100%', height: '430px', border: 0, borderRadius: 8, background: '#f1f3f5' }}>
            <p>Il browser non mostra il PDF qui. <a href={src} target="_blank" rel="noreferrer">Apri il PDF in una scheda</a>.</p>
          </object>}
        <div className="pila">
          <Dettagli inColonne voci={[
            { etichetta: 'Tipo', valore: TIPO[cur.tipo] ?? cur.tipo },
            { etichetta: 'Numero', valore: cur.numero || <span className="testo-tenue">—</span> },
            { etichetta: 'Data', valore: dataIt(cur.data) },
            ...(cur.importo == null ? [] : [{ etichetta: 'Importo', valore: euro(cur.importo) }]),
            ...(cur.tipo === 'fattura' ? [{ etichetta: 'Residuo', valore: euro(cur.residuo ?? 0) }] : []),
          ]} />
          {cur.note && <Nota>{cur.note}</Nota>}
          <p><a href={src} target="_blank" rel="noreferrer">{foto ? 'Apri la foto in una scheda' : 'Apri il PDF in una scheda'}</a></p>
        </div>
      </div>
    </Modale>
  );
}
