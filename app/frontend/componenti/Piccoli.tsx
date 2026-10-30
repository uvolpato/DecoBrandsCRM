import { Fragment, type ReactNode } from 'react';

// Pezzi piccoli del prototipo: CRM.stato (etichetta colorata), CRM.Dettagli (coppie etichetta /
// valore), CRM.Avviso (messaggio temporaneo in basso a destra), date come quando() del prototipo.

export type Variante = 'ok' | 'attesa' | 'errore' | 'info' | 'neutro' | 'primario';
export const Stato = ({ v, children }: { v: Variante; children: ReactNode }) => <span className={'stato s-' + v}>{children}</span>;

/** inColonne: le coppie si affiancano (etichetta sopra, valore sotto) e vanno a capo da sole. */
export function Dettagli({ voci, inColonne }: { voci: { etichetta: string; valore: ReactNode }[]; inColonne?: boolean }) {
  return (
    <dl className={'dettagli' + (inColonne ? ' in-colonne' : '')}>
      {voci.map((v) => inColonne
        ? <div key={v.etichetta}><dt>{v.etichetta}</dt><dd>{v.valore}</dd></div>
        : <Fragment key={v.etichetta}><dt>{v.etichetta}</dt><dd>{v.valore}</dd></Fragment>)}
    </dl>
  );
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Messaggio temporaneo, uno alla volta (4 secondi). Fuori da React: si chiama da qualunque azione.
 *  errore: rosso, per i rifiuti del server (verde li faceva sembrare riusciti). */
export function avviso(testo: string, errore = false) {
  let a = document.querySelector<HTMLDivElement>('.avviso');
  if (!a) {
    a = document.createElement('div');
    a.className = 'avviso';
    a.setAttribute('role', 'status');
    document.body.appendChild(a);
  }
  a.textContent = testo;
  a.classList.toggle('errore', errore);
  clearTimeout(timer);
  timer = setTimeout(() => a.remove(), 4200);
}

/** Data e ora come nel prototipo (gg/mm/aaaa hh:mm), all'ora italiana. */
export const quando = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';
