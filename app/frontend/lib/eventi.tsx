'use client';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

// Aggiornamenti dal server (F4-A6, §16.4.2, D-23): un solo EventSource per scheda. Il server manda
// {aree: [...]} quando il registro dice che qualcosa è cambiato; qui diventa un numero che cresce, così
// le pagine sanno quando rileggere senza ascoltare ognuna il proprio canale. Il battito si ignora.
// EventSource si riconnette da solo dopo una caduta di rete; se la risposta è un errore HTTP (502 al
// riavvio del backend, 401) la fonte passa a CLOSED e non riprova: la si riapre da soli dopo 15 s (A5-12).
// Alla chiusura della scheda (uscita compresa) il canale si chiude e il timer si annulla.
const Eventi = createContext<Record<string, number>>({});

/** Versione delle aree: cresce quando il server dice che quell'area è cambiata. */
export const useEventi = () => use(Eventi);

export function EventiProvider({ children }: { children: ReactNode }) {
  const [versione, setVersione] = useState<Record<string, number>>({});
  useEffect(() => {
    let fonte: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attivo = true;
    const apri = () => {
      if (!attivo) return;
      const f = new EventSource('/api/eventi/flusso');
      fonte = f;
      f.onmessage = (e) => {
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
      // La riconnessione nativa copre le cadute di rete; un errore HTTP chiude la fonte: si riapre qui
      // (A5-12); il 401 porta comunque all'accesso con la prima api() della pagina.
      f.onerror = () => {
        if (f.readyState !== EventSource.CLOSED || !attivo) return;
        clearTimeout(timer);
        timer = setTimeout(apri, 15_000);
      };
    };
    apri();
    return () => {
      attivo = false;
      clearTimeout(timer);
      fonte?.close();
    };
  }, []);
  return <Eventi.Provider value={versione}>{children}</Eventi.Provider>;
}
