'use client';
import { useId, useState, type ReactNode } from 'react';
import { Modale } from './Modale';

// D-172 §19: conferma per le operazioni impattanti e senza ritorno. Come Conferma, ma con una
// casella da spuntare che abilita il pulsante rosso: finché non è spuntata Invio non conferma,
// Esc annulla. Il server non cambia (qui è solo l'interfaccia): i controlli restano sul server.
export function ConfermaGrave({ titolo, punti, etichettaCasella = 'Ho capito, procedi', etichetta, annulla, onRisposta }: {
  titolo: string; punti: ReactNode[]; etichettaCasella?: string; etichetta: string; annulla?: string; onRisposta: (si: boolean) => void;
}) {
  const id = useId();
  const [spuntata, setSpuntata] = useState(false);
  return (
    <Modale titolo={titolo} onChiudi={() => onRisposta(false)}
      piede={<>
        <button type="button" className="btn sec" onClick={() => onRisposta(false)}>{annulla ?? 'Annulla'}</button>
        <button type="button" className="btn pericolo" disabled={!spuntata} onClick={() => onRisposta(true)}>{etichetta}</button>
      </>}>
      <ul className="conferma-punti">{punti.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <label className="casella-grave">
        <input id={id} type="checkbox" checked={spuntata} onChange={(e) => setSpuntata(e.target.checked)} />
        <span>{etichettaCasella}</span>
      </label>
    </Modale>
  );
}
