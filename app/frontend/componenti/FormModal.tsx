'use client';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Campo, type CampoProps } from './Campo';
import { Modale } from './Modale';

// Finestra con un modulo, come CRM.FormModal del prototipo. onConferma riceve i valori e
// restituisce il messaggio d'errore (la finestra resta aperta) o niente (si chiude). I controlli
// veri li fa il server (V12): qui si mostra il suo messaggio.
export interface FormModalProps {
  titolo: string;
  testo?: ReactNode;
  campi: CampoProps[];
  colonne?: 1 | 2;
  conferma?: string;
  pericolo?: boolean;
  onConferma: (valori: Record<string, string>) => Promise<string | void>;
  onChiudi: () => void;
}

export function FormModal({ titolo, testo, campi, colonne = 1, conferma = 'Salva', pericolo, onConferma, onChiudi }: FormModalProps) {
  const id = useId();
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);

  async function invia(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const valori: Record<string, string> = {};
    for (const [k, v] of new FormData(ev.currentTarget)) valori[k] = String(v).trim();
    setErrore('');
    setAttesa(true);
    try {
      const e = await onConferma(valori);
      if (e) setErrore(e);
      else onChiudi();
    } finally {
      setAttesa(false);
    }
  }

  return (
    <Modale titolo={titolo} testo={testo} onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
      <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
      <button type="submit" form={id} className={'btn' + (pericolo ? ' pericolo' : '')} disabled={attesa}>{attesa ? 'Attendi…' : conferma}</button>
    </>}>
      <form id={id} className={'modulo modulo-' + colonne} onSubmit={invia} noValidate>
        {campi.map((c) => <Campo key={c.nome} {...c} />)}
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
    </Modale>
  );
}
