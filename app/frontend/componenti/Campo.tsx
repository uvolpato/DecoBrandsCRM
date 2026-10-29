'use client';
import { useState } from 'react';
import { Icona } from './Icona';

// Un campo di modulo come campoHtml del prototipo (componenti.js, CRM.Form): etichetta sopra,
// tipi testo · password (con mostra/nascondi) · casella; `completa` è l'autocomplete del browser.
export interface CampoProps {
  nome: string;
  etichetta: string;
  tipo?: 'testo' | 'password' | 'casella';
  completa?: string;
  valore?: string | boolean;
}

export function Campo({ nome, etichetta, tipo = 'testo', completa, valore }: CampoProps) {
  const [vedi, setVedi] = useState(false);
  const id = 'c-' + nome;
  if (tipo === 'casella') {
    return (
      <div className="campo campo-casella">
        <input id={id} name={nome} type="checkbox" defaultChecked={!!valore} />
        <label htmlFor={id}>{etichetta}</label>
      </div>
    );
  }
  return (
    <div className="campo">
      <label htmlFor={id}>{etichetta}</label>
      {tipo === 'password' ? (
        <div className="campo-password">
          <input id={id} name={nome} type={vedi ? 'text' : 'password'} autoComplete={completa ?? 'current-password'} spellCheck={false} />
          <button type="button" className="mostra" aria-label={vedi ? 'Nascondi la password' : 'Mostra la password'} aria-pressed={vedi} onClick={() => setVedi(!vedi)}>
            <Icona nome={vedi ? 'occhio-chiuso' : 'occhio'} />
          </button>
        </div>
      ) : (
        <input id={id} name={nome} type="text" autoComplete={completa} defaultValue={typeof valore === 'string' ? valore : undefined} />
      )}
    </div>
  );
}
