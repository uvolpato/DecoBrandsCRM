'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Pannello } from './Pagina';

// Sagome di caricamento (D-59): blocchi grigio chiaro con la forma del contenuto vero, al posto di
// zeri, «Nessun elemento» e testi vuoti finché i dati non arrivano. Le sagome hanno le stesse
// altezze del contenuto, così quando i dati arrivano il layout non salta. Sotto i ~150 ms non
// compaiono, per non far lampeggiare la pagina.

/** Vero solo se il caricamento dura più di ~150 ms (D-59): sotto, le sagome non compaiono. */
export function useSagome(caricando: boolean, ms = 150) {
  const [visibili, setVisibili] = useState(false);
  useEffect(() => {
    if (!caricando) { setVisibili(false); return; }
    const t = setTimeout(() => setVisibili(true), ms);
    return () => clearTimeout(t);
  }, [caricando, ms]);
  return caricando && visibili;
}

/** Un blocco grigio con la luce che scorre (la luce si ferma con prefers-reduced-motion). */
export function Sagoma({ larghezza = '100%', altezza = 12, arrotondato }: { larghezza?: number | string; altezza?: number | string; arrotondato?: number | string }) {
  return <span className="sagoma" aria-hidden="true" style={{ width: larghezza, height: altezza, borderRadius: arrotondato } as CSSProperties} />;
}

/** Tabella al posto della DataTable: `colonne` è il numero di colonne o le intestazioni vere. */
export function SagomaTabella({ righe = 8, colonne = 4, naturale }: { righe?: number; colonne?: string[] | number; naturale?: boolean }) {
  const intestazioni = typeof colonne === 'number' ? Array.from({ length: colonne }, () => '') : colonne;
  return (
    <div className={'dt' + (naturale ? ' naturale' : '')} aria-hidden="true" data-sagoma="1">
      <div className="dt-scorri">
        <table>
          <thead><tr>{intestazioni.map((h, i) => <th key={i}>{h || <Sagoma larghezza={60} altezza={10} />}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: righe }, (_, r) => (
              <tr key={r}>{intestazioni.map((_, c) => <td key={c}><Sagoma larghezza={c === 0 ? 90 : 45 + ((r + c) % 3) * 18} altezza={12} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dt-piede"><span><Sagoma larghezza={80} altezza={10} /></span></div>
    </div>
  );
}

/** Segmenti con i numeri non ancora arrivati. */
export function SagomaSegmenti({ n = 3 }: { n?: number }) {
  return (
    <div className="segmenti" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="sagoma" style={{ width: 54 + (i % 3) * 14, height: 20, margin: '5px 11px' }} />)}
    </div>
  );
}

/** Riquadri numerici (KpiRow) non ancora arrivati. */
export function SagomaRiquadri({ n = 3 }: { n?: number }) {
  return (
    <div className="kpi-riga" style={{ '--n': n } as CSSProperties} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <div key={i} className="kpi">
        <Sagoma larghezza="60%" altezza={12} />
        <Sagoma larghezza="45%" altezza={22} />
        <Sagoma larghezza="80%" altezza={10} />
      </div>)}
    </div>
  );
}

/** Matrice (fornitore × mesi) non ancora arrivata. */
export function SagomaMatrice({ righe = 6, colonne = 6 }: { righe?: number; colonne?: number }) {
  return (
    <div className="matrice" style={{ gridTemplateColumns: `minmax(170px, 1.2fr) repeat(${colonne}, minmax(120px, 1fr))` }} aria-hidden="true" data-sagoma="1">
      {Array.from({ length: (righe + 1) * (colonne + 1) }, (_, i) => {
        const prima = i % (colonne + 1) === 0, testa = i <= colonne;
        if (testa) return <div key={i} className="m-intest"><Sagoma larghezza={prima ? 80 : 60} altezza={10} /></div>;
        if (prima) return <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}><Sagoma larghezza={100} altezza={12} /><Sagoma larghezza={70} altezza={10} /></div>;
        return <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 64 }}><Sagoma larghezza={70} altezza={12} /><Sagoma larghezza={50} altezza={10} /></div>;
      })}
    </div>
  );
}

/** Righe di una scheda di dettaglio non ancora arrivata. */
export function SagomaCorpo() {
  return (
    <div className="pila">
      <Sagoma larghezza={160} altezza={16} />
      <Sagoma larghezza="100%" altezza={13} />
      <Sagoma larghezza="90%" altezza={13} />
      <Sagoma larghezza="95%" altezza={13} />
      <Sagoma larghezza="70%" altezza={13} />
    </div>
  );
}

/** Scheda di destra (dettaglio di un'anagrafica) non ancora arrivata. */
export function SagomaScheda() {
  return <Pannello riempi><SagomaCorpo /></Pannello>;
}

/** Elenco a due colonne (anagrafiche): i filtri veri, la tabella in sagoma e la scheda a destra. */
export function SagomaElenco({ filtri, colonne = 3, larghezze = 'minmax(0,1.15fr) minmax(0,1fr)' }: { filtri: ReactNode; colonne?: number; larghezze?: string }) {
  return (
    <div className="colonne riempi" style={{ '--colonne': larghezze } as CSSProperties} aria-busy="true">
      <div className="pila riempi">
        {filtri}
        <div className="riempi"><SagomaTabella righe={9} colonne={colonne} /></div>
      </div>
      <SagomaScheda />
    </div>
  );
}
