'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, type Io } from '@/lib/api';

// ponytail: pagina provvisoria; la sostituisce il guscio con la barra (passo 1.11), che farà
// lo stesso controllo della sessione per tutte le pagine.
export default function Inizio() {
  const router = useRouter();
  const [io, setIo] = useState<Io | null>(null);

  useEffect(() => {
    void api<Io>('accesso/io').then((r) => {
      if (r.stato === 401) router.replace('/accesso?dopo=/');
      else if (r.ok && r.dati.cambia_password) router.replace('/accesso/cambia');
      else if (r.ok) setIo(r.dati);
    });
  }, [router]);
  if (!io) return null;

  return (
    <div className="vuoto">
      <b>Ciao {io.nome}</b>
      Sei entrato come {io.ruolo}. Le pagine dell’app arrivano con i prossimi passi.
      <p><Link href="/accesso/cambia">Cambia la password</Link> · <Link href="/accesso/esci">Esci</Link></p>
    </div>
  );
}
