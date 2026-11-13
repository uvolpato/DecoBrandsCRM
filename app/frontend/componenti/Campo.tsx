'use client';
import { useState } from 'react';
import type { Contesto, Entita } from '@/lib/entita';
import { euro, num } from '@/lib/formati';
import { CampoRicerca } from './CampoRicerca';
import { Icona } from './Icona';

// Un campo di modulo come campoHtml del prototipo (componenti.js, CRM.Form): etichetta sopra, aiuto
// sotto; tipi testo · password (con mostra/nascondi) · casella · select · livello (scelta a segmenti
// con radio, D-45); `completa` è l'autocomplete del browser. Un campo disabilitato non si manda.
export interface CampoProps {
  nome: string;
  etichetta: string;
  tipo?: 'testo' | 'numero' | 'email' | 'password' | 'casella' | 'select' | 'livello' | 'ricerca' | 'data';
  completa?: string;
  valore?: string | string[] | boolean | number;
  opzioni?: { value: string; label: string; disabilitato?: boolean; titolo?: string }[]; // select, livello
  aiuto?: string;
  largo?: boolean; // occupa tutta la riga nei moduli a due colonne
  segnaposto?: string;
  min?: number; // numero: limiti e passo
  max?: number;
  step?: number;
  disabilitato?: boolean;
  entita?: Entita; // ricerca: campo di ricerca su un'entità (D-22); con multipla il valore inviato è l'elenco JSON delle chiavi
  multipla?: boolean;
  contesto?: Contesto;
  // ricerca: nome letto dal documento, per offrire «Cerca questo» quando il campo è vuoto
  testoIniziale?: { q: string; mostra: string };
  onCambia?: (valore: string) => void; // per chi deve ricaricare altri campi della finestra (es. gli sconti del fornitore)
}

// Virgola o punto → stringa numerica col punto (quella che il server si aspetta, V12).
const aNumero = (testo: string) => {
  const t = testo.replace(/[^\d,.-]/g, '');
  return t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
};

export interface CampoEuroProps {
  valore: string;
  onChange: (valore: string) => void;
  dataCampo?: string;
  onFocus?: () => void;
  valuta?: boolean; // false per le quantità: virgola, senza €
  ariaLabel?: string;
}

/** Campo numerico delle finestre: fuori dal fuoco l'importo si legge all'italiana (12,50 €), col fuoco
 *  si modifica con virgola o punto. Al genitore arriva la stringa col punto, come prima. */
export function CampoEuro({ valore, onChange, dataCampo, onFocus, valuta = true, ariaLabel }: CampoEuroProps) {
  const [fuoco, setFuoco] = useState(false);
  const mostrato = fuoco ? valore.replace('.', ',') : valore.trim() === '' ? '' : valuta ? euro(valore) : num(valore);
  return (
    <input className="campo-euro" type="text" inputMode="decimal" data-campo={dataCampo} aria-label={ariaLabel} value={mostrato}
      onFocus={() => { setFuoco(true); onFocus?.(); }}
      onBlur={() => {
        setFuoco(false);
        const n = Number(valore);
        const t = valore.trim() === '' || !isFinite(n) ? '' : String(n);
        if (t !== valore) onChange(t);
      }}
      onChange={(e) => onChange(aNumero(e.target.value))} />
  );
}

export function Campo({ nome, etichetta, tipo = 'testo', completa, valore, opzioni = [], aiuto, largo, segnaposto, min, max, step, disabilitato, entita, multipla, contesto, onCambia, testoIniziale }: CampoProps) {
  const [vedi, setVedi] = useState(false);
  const id = 'c-' + nome;
  const [ricerca, setRicerca] = useState<string | string[]>(multipla ? (Array.isArray(valore) ? valore : []) : typeof valore === 'string' ? valore : '');
  if (tipo === 'ricerca' && entita) {
    return (
      <div className={'campo' + (largo ? ' largo' : '')}>
        <label htmlFor={id}>{etichetta}</label>
        <input type="hidden" name={nome} value={multipla ? JSON.stringify(ricerca) : (ricerca as string)} />
        {multipla
          ? <CampoRicerca entita={entita} contesto={contesto} id={id} multipla valori={ricerca as string[]} onChange={setRicerca} />
          : <CampoRicerca entita={entita} contesto={contesto} id={id} valore={ricerca as string} onChange={(v) => { setRicerca(v); onCambia?.(v); }} testoIniziale={testoIniziale} />}
        {aiuto && <span className="aiuto">{aiuto}</span>}
      </div>
    );
  }
  if (tipo === 'casella') {
    return (
      <div className={'campo campo-casella' + (largo ? ' largo' : '')}>
        <input id={id} name={nome} type="checkbox" defaultChecked={!!valore} disabled={disabilitato} />
        <label htmlFor={id}>{etichetta}</label>
      </div>
    );
  }
  const testo = typeof valore === 'string' ? valore : undefined;
  const numero = typeof valore === 'number' ? valore : undefined;
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
          <input id={id} name={nome} type={vedi ? 'text' : 'password'} autoComplete={completa ?? 'current-password'} placeholder={segnaposto} spellCheck={false} disabled={disabilitato} />
          <button type="button" className="mostra" aria-label={vedi ? 'Nascondi la password' : 'Mostra la password'} aria-pressed={vedi} onClick={() => setVedi(!vedi)}>
            <Icona nome={vedi ? 'occhio-chiuso' : 'occhio'} />
          </button>
        </div>
      ) : tipo === 'select' ? (
        <select id={id} name={nome} defaultValue={testo} disabled={disabilitato} onChange={(e) => onCambia?.(e.target.value)}>
          {opzioni.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : tipo === 'numero' ? (
        <input id={id} name={nome} type="number" inputMode="decimal" min={min} max={max} step={step} placeholder={segnaposto} defaultValue={numero} disabled={disabilitato} />
      ) : (
        <input id={id} name={nome} type={tipo === 'data' ? 'date' : tipo === 'email' ? 'email' : 'text'} autoComplete={completa} placeholder={segnaposto} defaultValue={testo} disabled={disabilitato} />
      )}
      {aiuto && <span className="aiuto">{aiuto}</span>}
    </div>
  );
}
