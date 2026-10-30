'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Barra, primaPagina, voceDi } from '@/componenti/Barra';
import { ClasseBody } from '@/componenti/ClasseBody';
import { Riservata } from '@/componenti/Pagina';
import { UtenteCtx } from '@/componenti/Utente';
import { api, type Io } from '@/lib/api';

// Guscio dell'app (passo 1.11): chiede al server chi è l'utente (D-38) a ogni cambio pagina;
// senza sessione porta all'accesso e poi torna qui; con la password provvisoria solo il cambio.
// Barra, "Pagina riservata", fascia "Profilo in sola lettura" e pulsanti spenti seguono i permessi del
// server e l'area della pagina (D-45): il controllo è qui, una volta per tutte le pagine.
export default function Guscio({ children }: { children: ReactNode }) {
  const router = useRouter();
  const percorso = usePathname();
  const [io, setIo] = useState<Io | null>(null);

  useEffect(() => {
    let vivo = true;
    void api<Io>('accesso/io').then((r) => {
      if (!vivo) return;
      if (r.stato === 401) router.replace('/accesso?dopo=' + encodeURIComponent(percorso));
      else if (r.ok && r.dati.cambia_password) router.replace('/accesso/cambia?dopo=' + encodeURIComponent(percorso));
      // Oggi (pagina d'arrivo) è di Provvigioni: chi non ha l'area va alla prima pagina che può aprire
      else if (r.ok && percorso === '/' && !r.dati.permessi.includes('provvigioni.consulta')) router.replace(primaPagina((p) => r.dati.permessi.includes(p)));
      else if (r.ok) setIo(r.dati);
    });
    return () => { vivo = false; };
  }, [router, percorso]);

  if (!io) return null;
  // D-45: la voce della pagina decide il permesso (le pagine di un'area con *.consulta) e la sola lettura
  const voce = voceDi(percorso);
  const solaLettura = !!voce?.area && io.aree[voce.area] === 'lettura';
  return (
    <UtenteCtx.Provider value={io}>
      {/* stile.css: body.sola-lettura mostra la fascia e spegne i pulsanti che modificano (§8.3) */}
      {solaLettura && <ClasseBody classe="sola-lettura" />}
      <Barra />
      <main className="principale" id="principale">
        {voce?.permesso ? <Riservata permesso={voce.permesso} titolo={voce.t}>{children}</Riservata> : children}
      </main>
    </UtenteCtx.Provider>
  );
}
