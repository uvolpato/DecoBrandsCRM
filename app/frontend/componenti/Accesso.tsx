'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

// Pagine fuori dall'app (D-39, spec §7.0), come CRM.Accesso del prototipo: pannello al centro;
// la barra scura con il marchio la mette app/accesso/layout.tsx. I campi arrivano come figli.
// onConferma riceve i valori del modulo e restituisce il messaggio d'errore, se c'è.
export interface AccessoProps {
  titolo: string;
  testo?: ReactNode;
  avviso?: ReactNode;
  conferma: string;
  link?: { testo: string; href: string }[];
  onConferma: (valori: Record<string, string | boolean>) => Promise<string | void>;
  children?: ReactNode;
}

export function Accesso({ titolo, testo, avviso, conferma, link = [], onConferma, children }: AccessoProps) {
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const modulo = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = titolo + ' · Decobrands';
    modulo.current?.querySelector<HTMLInputElement>('input:not([type=checkbox])')?.focus();
  }, [titolo]);

  async function invia(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const valori: Record<string, string | boolean> = {};
    for (const i of ev.currentTarget.querySelectorAll('input')) {
      valori[i.name] = i.type === 'checkbox' ? i.checked : i.autocomplete.endsWith('password') ? i.value : i.value.trim(); // la password non si ripulisce
    }
    setErrore('');
    setAttesa(true);
    try {
      const e = await onConferma(valori);
      if (e) {
        setErrore(e);
        modulo.current?.querySelector('input')?.focus();
      }
    } finally {
      setAttesa(false);
    }
  }

  return (
    <div className="accesso">
      <section className="pannello">
        <div className="pannello-corpo">
          <h1>{titolo}</h1>
          {testo && <p className="nota">{testo}</p>}
          {avviso && <p className="nota nota-attesa" role="status">{avviso}</p>}
          <form ref={modulo} className="modulo modulo-1" onSubmit={invia} noValidate>
            {children}
            <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
            <button type="submit" className="btn largo" disabled={attesa}>{attesa ? 'Attendi…' : conferma}</button>
          </form>
          {link.length > 0 && (
            <div className="accesso-link">
              {link.map((l) => <Link key={l.href} href={l.href}>{l.testo}</Link>)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
