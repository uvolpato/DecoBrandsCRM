'use client';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

// Aggiornamenti dal server (F4-A6, §16.4.2, D-23): un solo EventSource per scheda. Il server manda
// {aree: [...]} quando il registro dice che qualcosa è cambiato; qui diventa un numero che cresce, così
// le pagine sanno quando rileggere senza ascoltare ognuna il proprio canale. Il battito si ignora.
// EventSource si riconnette da solo; alla chiusura della scheda (uscita compresa) il canale si chiude.
const Eventi = createContext<Record<string, number>>({});

/** Versione delle aree: cresce quando il server dice che quell'area è cambiata. */
export const useEventi = () => use(Eventi);

export function EventiProvider({ children }: { children: ReactNode }) {
  const [versione, setVersione] = useState<Record<string, number>>({});
  useEffect(() => {
    const fonte = new EventSource('/api/eventi/flusso');
    fonte.onmessage = (e) => {
      let d: { aree?: string[] };
      try {
        d = JSON.parse(e.data) as { aree?: string[] };
      } catch {
        return; // messaggio non nostro
      }
      if (!d.aree?.length) return; // battito
      setVersione((v) => {
        const n = { ...v };
        for (const a of d.aree!) n[a] = (n[a] ?? 0) + 1;
        return n;
      });
    };
    return () => fonte.close();
  }, []);
  return <Eventi.Provider value={versione}>{children}</Eventi.Provider>;
}
