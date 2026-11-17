import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Icona } from './Icona';
import { Modale } from './Modale';

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

let contenitore: HTMLDivElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
// A7-11: una sola regione «live», vuota finché non c'è un messaggio. Si riusa solo se è ancora
// nel documento: creata all'import (prima che React agganci <body>), React la stacca e i messaggi
// finivano in un nodo invisibile.
function regione() {
  if (contenitore?.isConnected) return contenitore;
  contenitore = document.querySelector<HTMLDivElement>('.avviso');
  if (!contenitore) {
    contenitore = document.createElement('div');
    contenitore.className = 'avviso';
    contenitore.hidden = true;
    contenitore.setAttribute('role', 'status');
    document.body.appendChild(contenitore);
  }
  return contenitore;
}

/** A7-11: monta la regione «live» vuota prima del primo messaggio (si mette nel guscio). */
export function RegioneAvvisi() {
  useEffect(() => { regione(); }, []);
  return null;
}

/** Messaggio temporaneo, uno alla volta (4 secondi; 8 se errore). Fuori da React: si chiama da qualunque azione.
 *  errore: rosso, per i rifiuti del server (verde li faceva sembrare riusciti): è un `alert`, non uno `status`. */
export function avviso(testo: string, errore = false) {
  const a = regione();
  a.hidden = true;
  a.textContent = '';
  a.setAttribute('role', errore ? 'alert' : 'status');
  a.classList.toggle('errore', errore);
  a.textContent = testo;
  a.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { a.textContent = ''; a.hidden = true; }, errore ? 8000 : 4200);
}

/** Data e ora come nel prototipo (gg/mm/aaaa hh:mm), all'ora italiana. */
export const quando = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';

/** Pulsante a icona «informazioni» che apre una finestra con la spiegazione: le note lunghe sotto una
 *  tabella vanno qui, non in pagina (regole-interfaccia.md, tabelle). */
export function Informazioni({ titolo, children }: { titolo: string; children: ReactNode }) {
  const [aperta, setAperta] = useState(false);
  return <>
    <button type="button" className="btn sec piccolo" aria-label={titolo} title={titolo} onClick={() => setAperta(true)}>
      <Icona nome="info" />
    </button>
    {aperta && <Modale titolo={titolo} onChiudi={() => setAperta(false)}>{children}</Modale>}
  </>;
}
