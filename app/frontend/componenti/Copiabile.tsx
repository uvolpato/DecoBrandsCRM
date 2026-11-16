'use client';
import { useRef, useState } from 'react';
import { Icona } from './Icona';

// Icona «Copia» accanto a un identificativo (D-173): copia negli appunti e mostra una spunta per un
// attimo. Stessa classe .btn-riga delle azioni di riga: fuoco a bordo interno (D-64), area 32 px, il
// valore non cambia posto quando l'icona diventa spunta.
export function Copiabile({ valore }: { valore: string }) {
  const [fatto, setFatto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function copia() {
    try {
      await navigator.clipboard.writeText(valore);
    } catch {
      // ponytail: fallback per i browser che negano navigator.clipboard
      const t = document.createElement('textarea');
      t.value = valore; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setFatto(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFatto(false), 1500);
  }

  const testo = 'Copia ' + valore;
  return (
    <button type="button" className="btn-riga" style={{ verticalAlign: 'middle' }}
      onClick={() => void copia()} aria-label={testo} title={testo}>
      <Icona nome={fatto ? 'spunta' : 'copia'} />
    </button>
  );
}
