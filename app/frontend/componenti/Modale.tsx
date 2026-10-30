'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';

// Finestra sopra la pagina, come CRM.Modale del prototipo: stesso markup e stile (.velo, .modale);
// si chiude con Chiudi, con Esc o con un clic sul velo; alla chiusura il focus torna da dove era.
// ponytail: solo il pulsante Chiudi; azioni come nel prototipo quando servono (FormModal, Conferma).
export interface ModaleProps {
  titolo: string;
  onChiudi: () => void;
  children?: ReactNode;
}

export function Modale({ titolo, onChiudi, children }: ModaleProps) {
  const id = useId();
  const chiudi = useRef<HTMLButtonElement>(null);
  const suChiudi = useRef(onChiudi);
  suChiudi.current = onChiudi;
  useEffect(() => {
    const prima = document.activeElement as HTMLElement | null;
    chiudi.current?.focus();
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') suChiudi.current(); };
    document.addEventListener('keydown', tasto);
    return () => { document.removeEventListener('keydown', tasto); prima?.focus(); };
  }, []);

  return (
    <div className="velo" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="modale" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="modale-testa"><h2 id={id}>{titolo}</h2></div>
        {children && <div className="modale-corpo">{children}</div>}
        <div className="modale-piede">
          <button ref={chiudi} type="button" className="btn sec" onClick={onChiudi}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}
