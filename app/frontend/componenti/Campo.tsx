'use client';
import { useState } from 'react';
import { Icona } from './Icona';

// Un campo di modulo come campoHtml del prototipo (componenti.js, CRM.Form): etichetta sopra, aiuto
// sotto; tipi testo · password (con mostra/nascondi) · casella · select · livello (scelta a segmenti
// con radio, D-45); `completa` è l'autocomplete del browser. Un campo disabilitato non si manda.
export interface CampoProps {
  nome: string;
  etichetta: string;
  tipo?: 'testo' | 'password' | 'casella' | 'select' | 'livello';
  completa?: string;
  valore?: string | boolean;
  opzioni?: { value: string; label: string; disabilitato?: boolean; titolo?: string }[]; // select, livello
  aiuto?: string;
  largo?: boolean; // occupa tutta la riga nei moduli a due colonne
  disabilitato?: boolean;
}

export function Campo({ nome, etichetta, tipo = 'testo', completa, valore, opzioni = [], aiuto, largo, disabilitato }: CampoProps) {
  const [vedi, setVedi] = useState(false);
  const id = 'c-' + nome;
  if (tipo === 'casella') {
    return (
      <div className={'campo campo-casella' + (largo ? ' largo' : '')}>
        <input id={id} name={nome} type="checkbox" defaultChecked={!!valore} disabled={disabilitato} />
        <label htmlFor={id}>{etichetta}</label>
      </div>
    );
  }
  const testo = typeof valore === 'string' ? valore : undefined;
  if (tipo === 'livello') {
    return (
      <fieldset className={'campo-livello' + (largo ? ' largo' : '')} disabled={disabilitato}>
        <legend>{etichetta}</legend>
        <div className="livello-scelta">
          {opzioni.map((o) => (
            <label key={o.value} title={o.titolo}>
              <input type="radio" name={nome} value={o.value} defaultChecked={o.value === testo} disabled={o.disabilitato} />{o.label}
            </label>
          ))}
        </div>
        {aiuto && <span className="aiuto">{aiuto}</span>}
      </fieldset>
    );
  }
  return (
    <div className={'campo' + (largo ? ' largo' : '')}>
      <label htmlFor={id}>{etichetta}</label>
      {tipo === 'password' ? (
        <div className="campo-password">
          <input id={id} name={nome} type={vedi ? 'text' : 'password'} autoComplete={completa ?? 'current-password'} spellCheck={false} disabled={disabilitato} />
          <button type="button" className="mostra" aria-label={vedi ? 'Nascondi la password' : 'Mostra la password'} aria-pressed={vedi} onClick={() => setVedi(!vedi)}>
            <Icona nome={vedi ? 'occhio-chiuso' : 'occhio'} />
          </button>
        </div>
      ) : tipo === 'select' ? (
        <select id={id} name={nome} defaultValue={testo} disabled={disabilitato}>
          {opzioni.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input id={id} name={nome} type="text" autoComplete={completa} defaultValue={testo} disabled={disabilitato} />
      )}
      {aiuto && <span className="aiuto">{aiuto}</span>}
    </div>
  );
}
