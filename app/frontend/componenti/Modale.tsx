'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';

// Finestre sopra la pagina, come CRM.Modale / CRM.Conferma del prototipo: stesso markup e stile
// (.velo, .modale). Si chiudono con Esc o con un clic sul velo; il focus va al primo campo o, senza
// campi, al primo pulsante (Annulla: due Invio non eliminano niente); alla chiusura torna da dove era.
export interface ModaleProps {
  titolo: string;
  testo?: ReactNode;
  onChiudi: () => void;
  piede?: ReactNode; // i pulsanti; senza: solo Chiudi
  larga?: boolean; // finestra grande (maschera di ricerca)
  corpoClasse?: string;
  children?: ReactNode;
}

export function Modale({ titolo, testo, onChiudi, piede, larga, corpoClasse, children }: ModaleProps) {
  const id = useId();
  const finestra = useRef<HTMLDivElement>(null);
  const suChiudi = useRef(onChiudi);
  suChiudi.current = onChiudi;
  useEffect(() => {
    const prima = document.activeElement as HTMLElement | null;
    const f = finestra.current;
    (f?.querySelector<HTMLElement>('.modale-corpo input:not([disabled]), .modale-corpo select:not([disabled])') ?? f?.querySelector<HTMLElement>('.modale-piede .btn'))?.focus();
    const tasto = (e: KeyboardEvent) => {
      const veli = document.querySelectorAll('.velo'); // Esc chiude solo la finestra in primo piano
      if (e.key === 'Escape' && veli[veli.length - 1] === f?.parentElement) suChiudi.current();
    };
    document.addEventListener('keydown', tasto);
    return () => { document.removeEventListener('keydown', tasto); prima?.focus(); };
  }, []);

  return (
    <div className="velo" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div ref={finestra} className={'modale' + (larga ? ' larga' : '')} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="modale-testa"><h2 id={id}>{titolo}</h2>{testo && <p>{testo}</p>}</div>
        {children && <div className={'modale-corpo' + (corpoClasse ? ' ' + corpoClasse : '')}>{children}</div>}
        <div className="modale-piede">
          {piede ?? <button type="button" className="btn sec" onClick={onChiudi}>Chiudi</button>}
        </div>
      </div>
    </div>
  );
}

/** Conferma come CRM.Conferma: Annulla o il pulsante d'azione (rosso se pericolo). */
export function Conferma({ titolo, testo, etichetta, pericolo, onRisposta }: {
  titolo: string; testo?: ReactNode; etichetta: string; pericolo?: boolean; onRisposta: (si: boolean) => void;
}) {
  return (
    <Modale titolo={titolo} testo={testo} onChiudi={() => onRisposta(false)} piede={<>
      <button type="button" className="btn sec" onClick={() => onRisposta(false)}>Annulla</button>
      <button type="button" className={'btn' + (pericolo ? ' pericolo' : '')} onClick={() => onRisposta(true)}>{etichetta}</button>
    </>} />
  );
}
