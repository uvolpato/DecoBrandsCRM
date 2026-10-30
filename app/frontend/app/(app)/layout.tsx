'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Barra } from '@/componenti/Barra';
import { ClasseBody } from '@/componenti/ClasseBody';
import { UtenteCtx } from '@/componenti/Utente';
import { api, type Io } from '@/lib/api';

// Guscio dell'app (passo 1.11): chiede al server chi è l'utente (D-38) a ogni cambio pagina;
// senza sessione porta all'accesso e poi torna qui; con la password provvisoria solo il cambio.
// Barra, fascia "Profilo in sola lettura" e pulsanti spenti seguono i permessi del server.
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
      else if (r.ok) setIo(r.dati);
    });
    return () => { vivo = false; };
  }, [router, percorso]);

  if (!io) return null;
  return (
    <UtenteCtx.Provider value={io}>
      {/* stile.css: body.sola-lettura mostra la fascia e spegne i pulsanti che modificano (§8.3) */}
      {!io.permessi.includes('modifica') && <ClasseBody classe="sola-lettura" />}
      <Barra />
      <main className="principale" id="principale">{children}</main>
    </UtenteCtx.Provider>
  );
}
