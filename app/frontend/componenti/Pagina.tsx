'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useScorrimento } from '@/lib/memoria';
import { voceDi } from './Barra';
import { Icona } from './Icona';
import { AREE, usePuo, useUtente } from './Utente';

// Pagina e Intestazione come CRM.Pagina / CRM.Intestazione del prototipo: testata con titolo,
// sottotitolo e azioni, poi il corpo. La barra la mette il guscio (app/(app)/layout.tsx).
// "Torna a…" con la memoria della schermata (§7.12); il link Guida c'è in ogni testata (F5-A8).
const GUIDA_ROTTE: [string, string][] = [
  ['/documenti', 'documenti'], ['/pratiche', 'pratiche'], ['/bollettini', 'bollettini'], ['/liquidazioni', 'liquidazioni'],
  ['/analisi', 'analisi'], ['/soggetti', 'soggetti'], ['/fornitori', 'fornitori'], ['/subagenti', 'subagenti'], ['/clienti', 'clienti'],
  ['/registro', 'registro'], ['/sistema', 'sistema'], ['/scartati', 'scartati'], ['/impostazioni', 'impostazioni'], ['/utenti', 'utenti'],
];
/** L'argomento della Guida per la pagina corrente: la rotta più lunga che la contiene. */
function argomentoGuida(percorso: string): string | null {
  if (percorso.startsWith('/guida')) return null;
  if (percorso === '/') return 'oggi';
  return GUIDA_ROTTE.find(([rotta]) => percorso === rotta || percorso.startsWith(rotta + '/'))?.[1] ?? 'panoramica';
}
/** "Torna a …" con l'articolo giusto per la voce (D-47, §7.12). */
const ARTICOLO: Record<string, string> = {
  Oggi: 'a Oggi', Documenti: 'ai Documenti', Pratiche: 'alle Pratiche', 'Documenti scartati': 'ai Documenti scartati',
  Bollettini: 'ai Bollettini', Liquidazioni: 'alle Liquidazioni', Analisi: "all'Analisi", Soggetti: 'ai Soggetti', Fornitori: 'ai Fornitori',
  Subagenti: 'ai Subagenti', Clienti: 'ai Clienti', 'Utenti e ruoli': 'a Utenti e ruoli',
  'Stato del sistema': 'allo Stato del sistema', Registro: 'al Registro', Impostazioni: 'alle Impostazioni',
  Componenti: 'ai Componenti', Guida: 'alla Guida',
};
// l'ultimo percorso aperto: il link "Torna a …" riporta lì con la memoria della schermata (§7.12)
let ultima: { percorso: string; titolo: string } | null = null;
export interface Azione {
  etichetta: string;
  icona?: string;
  variante?: 'primario' | 'sec' | 'pericolo' | 'testo';
  onClick?: () => void;
  href?: string;
  disabilitato?: boolean;
  titolo?: string;
  consentito?: boolean; // resta attivo in sola lettura (esporta, guida)
  conta?: number; // contatore colorato sul pulsante (punti da controllare)
  contaVariante?: 'attesa' | 'errore';
}

export function Pulsante({ a, piccolo }: { a: Azione; piccolo?: boolean }) {
  const classe = 'btn' + (piccolo ? ' piccolo' : '') + (a.variante && a.variante !== 'primario' ? ' ' + a.variante : '') + (a.consentito ? ' consentito' : '');
  const dentro = <>{a.icona && <Icona nome={a.icona} />}{a.etichetta}{!!a.conta && <span className={'btn-conta' + (a.contaVariante ? ' c-' + a.contaVariante : '')}>{a.conta}</span>}</>;
  return a.href
    ? <Link className={classe} href={a.href} title={a.titolo}>{dentro}</Link>
    : <button type="button" className={classe} onClick={a.onClick} disabled={a.disabilitato} title={a.titolo}>{dentro}</button>;
}

export interface PaginaProps {
  titolo: string;
  sottotitolo?: ReactNode;
  briciole?: { etichetta: string; href?: string }[];
  badge?: ReactNode;
  azioni?: Azione[];
  pieno?: boolean; // il corpo riempie lo spazio (pagine a due colonne con tabelle)
  children?: ReactNode;
}

export function Pagina({ titolo, sottotitolo, briciole, badge, azioni = [], pieno, children }: PaginaProps) {
  // anche a ogni cambio d'indirizzo: navigando, Next rimette il titolo del layout ("Decobrands")
  const percorso = usePathname();
  const router = useRouter();
  const corpo = useScorrimento<HTMLElement>('corpo'); // posizione di scorrimento ritrovata tornando (§7.12)
  useEffect(() => { document.title = titolo + ' · Decobrands'; }, [titolo, percorso]);
  // "Torna a …" (§7.12): la schermata lasciata, con filtri e posizione; niente su un accesso diretto
  const [torna, setTorna] = useState<{ percorso: string; titolo: string } | null>(null);
  useEffect(() => {
    if (ultima && ultima.percorso !== percorso) setTorna(ultima);
    ultima = { percorso, titolo: voceDi(percorso)?.t ?? 'la pagina precedente' };
  }, [percorso]);
  const indietro = torna ? [{
    etichetta: 'Torna ' + (ARTICOLO[torna.titolo] ?? 'a ' + torna.titolo),
    icona: 'indietro', variante: 'sec' as const, onClick: () => router.back(), consentito: true,
    titolo: 'Torna alla schermata precedente, con filtri e posizione',
  }] : [];
  const guida = argomentoGuida(percorso);
  const tutte = [
    ...indietro,
    ...azioni,
    ...(guida ? [{ etichetta: 'Guida', href: '/guida/' + guida, variante: 'sec' as const, consentito: true }] : []),
  ];
  return (
    <>
      <header className="testa">
        <div>
          {briciole && <nav className="percorso" aria-label="Percorso">{briciole.map((b, i) => <span key={i}>{i > 0 && ' › '}{b.href ? <Link href={b.href}>{b.etichetta}</Link> : b.etichetta}</span>)}</nav>}
          <h1>{titolo}{badge && <span className="testa-badge">{badge}</span>}</h1>
          {sottotitolo && <div className="sotto">{sottotitolo}</div>}
        </div>
        <div className="testa-azioni">{tutte.map((a) => <Pulsante key={a.etichetta} a={a} />)}</div>
      </header>
      <section ref={corpo} className={'corpo' + (pieno ? ' pieno' : '')}>{children}</section>
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
