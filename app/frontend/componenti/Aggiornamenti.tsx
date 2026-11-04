'use client';

// Barra degli aggiornamenti (F4-A6, §16.4.2, D-23): le righe restano ferme finché non si clicca Aggiorna,
// così filtri, ordinamento, pagina, scheda e scorrimento non saltano.
export function Aggiornamenti({ onAggiorna }: { onAggiorna: () => void }) {
  return (
    <div className="aggiornamenti" role="status">
      <span>Ci sono aggiornamenti</span>
      <button type="button" className="btn sec piccolo" onClick={onAggiorna}>Aggiorna</button>
    </div>
  );
}
