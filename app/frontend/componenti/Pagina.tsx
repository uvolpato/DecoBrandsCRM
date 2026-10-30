'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Icona } from './Icona';
import { AREE, usePuo, useUtente } from './Utente';

// Pagina e Intestazione come CRM.Pagina / CRM.Intestazione del prototipo: testata con titolo,
// sottotitolo e azioni, poi il corpo. La barra la mette il guscio (app/(app)/layout.tsx).
// ponytail: "Torna a…" con la memoria della schermata (§7.12) e il link Guida arrivano con le
// pagine che li usano.
export interface Azione {
  etichetta: string;
  icona?: string;
  variante?: 'primario' | 'sec' | 'pericolo' | 'testo';
  onClick?: () => void;
  href?: string;
  disabilitato?: boolean;
  titolo?: string;
  consentito?: boolean; // resta attivo in sola lettura (esporta, guida)
}

export function Pulsante({ a, piccolo }: { a: Azione; piccolo?: boolean }) {
  const classe = 'btn' + (piccolo ? ' piccolo' : '') + (a.variante && a.variante !== 'primario' ? ' ' + a.variante : '') + (a.consentito ? ' consentito' : '');
  const dentro = <>{a.icona && <Icona nome={a.icona} />}{a.etichetta}</>;
  return a.href
    ? <Link className={classe} href={a.href} title={a.titolo}>{dentro}</Link>
    : <button type="button" className={classe} onClick={a.onClick} disabled={a.disabilitato} title={a.titolo}>{dentro}</button>;
}

export interface PaginaProps {
  titolo: string;
  sottotitolo?: ReactNode;
  azioni?: Azione[];
  pieno?: boolean; // il corpo riempie lo spazio (pagine a due colonne con tabelle)
  children?: ReactNode;
}

export function Pagina({ titolo, sottotitolo, azioni = [], pieno, children }: PaginaProps) {
  // anche a ogni cambio d'indirizzo: navigando, Next rimette il titolo del layout ("Decobrands")
  const percorso = usePathname();
  useEffect(() => { document.title = titolo + ' · Decobrands'; }, [titolo, percorso]);
  return (
    <>
      <header className="testa">
        <div>
          <h1>{titolo}</h1>
          {sottotitolo && <div className="sotto">{sottotitolo}</div>}
        </div>
        <div className="testa-azioni">{azioni.map((a) => <Pulsante key={a.etichetta} a={a} />)}</div>
      </header>
      <section className={'corpo' + (pieno ? ' pieno' : '')}>{children}</section>
    </>
  );
}

export interface PannelloProps {
  titolo?: string;
  nota?: ReactNode;
  azioni?: Azione[];
  riempi?: boolean;
  senzaMargine?: boolean;
  children?: ReactNode;
}

/** Pannello come CRM.Pannello: contenitore bianco con titolo, nota e azioni piccole (secondarie). */
export function Pannello({ titolo, nota, azioni = [], riempi, senzaMargine, children }: PannelloProps) {
  return (
    <section className={'pannello' + (riempi ? ' riempi' : '')}>
      {titolo && (
        <div className="pannello-testa">
          <h2>{titolo}</h2>
          <div className="pannello-destra">
            <span className="pannello-nota">{nota}</span>
            {azioni.map((a) => <Pulsante key={a.etichetta} a={{ variante: 'sec', ...a }} piccolo />)}
          </div>
        </div>
      )}
      <div className={'pannello-corpo' + (senzaMargine ? ' senza-margine' : '')}>{children}</div>
    </section>
  );
}

export const Nota = ({ children }: { children: ReactNode }) => <p className="nota">{children}</p>;

/** Pagina non permessa al ruolo (CRM.permesso): spiega perché, senza mostrare i dati. */
export function Riservata({ permesso, titolo, children }: { permesso: string; titolo: string; children: ReactNode }) {
  const io = useUtente();
  const puo = usePuo();
  if (puo(permesso)) return <>{children}</>;
  // perché è chiusa (D-45): area mancante o livello troppo basso; Sistema per gli amministratori
  const [area] = permesso.split('.');
  const motivo = permesso === 'sistema.stato' ? 'Questa pagina è per gli amministratori e per chi è operatore in un’area.'
    : area === 'sistema' ? 'Questa pagina è per gli amministratori.'
      : io.aree[area] ? `Serve un livello più alto nell’area ${AREE[area] ?? area}.` : `Non hai accesso all’area ${AREE[area] ?? area}.`;
  return (
    <Pagina titolo={titolo}>
      <Pannello>
        <div className="vuoto"><b>Pagina riservata</b>{motivo} Chiedi a un amministratore.</div>
      </Pannello>
    </Pagina>
  );
}
