'use client';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useMemoria } from '@/lib/memoria';

// Schede come CRM.Schede del prototipo (stesso markup .schede): barra con le etichette (e il
// numero, se c'è, neutro/giallo/rosso/verde), frecce ← → Home Fine da tastiera; si disegna solo la
// scheda attiva. `memoria` (nome): tornando alla pagina si riapre la stessa scheda (§7.12).
export interface Scheda {
  id: string;
  etichetta: string;
  conta?: number | string;
  contaVariante?: 'neutro' | 'attesa' | 'errore' | 'ok';
  contenuto: () => ReactNode;
}

export function Schede({ schede, attiva: iniziale, onCambia, riempi, memoria }: {
  schede: Scheda[]; attiva?: string; onCambia?: (id: string) => void; riempi?: boolean; memoria?: string;
}) {
  const uid = useId();
  const barra = useRef<HTMLDivElement>(null);
  const [salvata, setAttiva] = useMemoria(memoria && memoria + '|scheda', schede.some((s) => s.id === iniziale) ? iniziale! : schede[0].id);
  const attiva = schede.some((s) => s.id === salvata) ? salvata : schede[0].id;
  const vai = (id: string) => { setAttiva(id); onCambia?.(id); };

  function tasto(ev: KeyboardEvent) {
    const ids = schede.map((s) => s.id), i = ids.indexOf(attiva);
    const n = ({ ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 } as Record<string, number>)[ev.key];
    if (n == null) return;
    ev.preventDefault();
    const id = ids[(n + ids.length) % ids.length];
    vai(id);
    barra.current?.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus();
  }

  const scheda = schede.find((s) => s.id === attiva) ?? schede[0];
  return (
    <div className={'schede' + (riempi ? ' riempi' : '')}>
      <div ref={barra} className="schede-barra" role="tablist" onKeyDown={tasto}>
        {schede.map((s) => (
          <button key={s.id} type="button" role="tab" id={uid + s.id} data-id={s.id} aria-controls={uid + 'corpo'}
            aria-selected={s.id === scheda.id} tabIndex={s.id === scheda.id ? 0 : -1} onClick={() => vai(s.id)}>
            <span>{s.etichetta}</span>
            {s.conta != null && s.conta !== '' && <span className={`schede-conta c-${s.contaVariante ?? 'neutro'}`}>{s.conta}</span>}
          </button>
        ))}
      </div>
      <div className="schede-corpo" role="tabpanel" id={uid + 'corpo'} aria-labelledby={uid + scheda.id}>{scheda.contenuto()}</div>
    </div>
  );
}
