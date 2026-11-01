'use client';
import type { ReactNode } from 'react';
import { classeSegno, euro } from '@/lib/formati';

// KpiRow e Cifre come CRM.KpiRow / CRM.Cifre del prototipo, stesso markup.
// I numeri sono già calcolati dal server (V12): qui si mostrano soltanto.

export interface Kpi {
  id: string;
  etichetta: string;
  valore: number | string; // numero = importo in euro, negativo in rosso
  variante?: 'primario' | 'ok' | 'attesa' | 'errore' | 'info';
  dettagli?: { testo: string; variante?: 'attesa' | 'errore' | 'ok' }[];
}

/** Riquadri numerici con bordo colorato; con onSeleziona fanno da filtro (clic di nuovo per togliere). */
export function KpiRow({ voci, selezionata, onSeleziona }: { voci: Kpi[]; selezionata?: string | null; onSeleziona?: (id: string | null) => void }) {
  return (
    <div className="kpi-riga" style={{ '--n': voci.length } as React.CSSProperties}>
      {voci.map((v) => {
        const dentro = <>
          <span className="kpi-etichetta">{v.etichetta}</span>
          <span className={'kpi-valore ' + (typeof v.valore === 'number' ? classeSegno(Math.min(0, v.valore)) : '')}>{typeof v.valore === 'number' ? euro(v.valore) : v.valore}</span>
          {(v.dettagli ?? []).map((d) => <span key={d.testo} className={'kpi-dettaglio' + (d.variante ? ' d-' + d.variante : '')}>{d.testo}</span>)}
        </>;
        const classe = 'kpi k-' + (v.variante ?? 'primario');
        return onSeleziona
          ? <button key={v.id} type="button" className={classe} aria-pressed={selezionata === v.id} onClick={() => onSeleziona(selezionata === v.id ? null : v.id)}>{dentro}</button>
          : <div key={v.id} className={classe}>{dentro}</div>;
      })}
    </div>
  );
}

/** Elenco etichetta → importo, per riepiloghi brevi. valore numerico = euro. */
export function Cifre({ voci }: { voci: { etichetta: string; valore: number | ReactNode; nota?: ReactNode; variante?: 'attesa' | 'errore'; forte?: boolean }[] }) {
  return (
    <dl className="cifre">
      {voci.map((v) => (
        <div key={v.etichetta} className={v.forte ? 'forte' : undefined}>
          <dt>{v.etichetta}{v.nota && <span className="sec-riga">{v.nota}</span>}</dt>
          <dd className={v.variante ? 'c-' + v.variante : typeof v.valore === 'number' ? classeSegno(Math.min(0, v.valore)) : ''}>{typeof v.valore === 'number' ? euro(v.valore) : v.valore}</dd>
        </div>
      ))}
    </dl>
  );
}
