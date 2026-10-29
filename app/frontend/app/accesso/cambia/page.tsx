'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Accesso } from '@/componenti/Accesso';
import { Campo } from '@/componenti/Campo';
import { api, dopo, type Io } from '@/lib/api';

// Cambio della password (§7.0): obbligatorio con la password provvisoria, altrimenti a richiesta.
// I controlli veri (password attuale, lunghezza) li fa il server; qui solo "le due coincidono".
function Cambia() {
  const router = useRouter();
  const ritorno = dopo(useSearchParams().get('dopo'));
  const [io, setIo] = useState<Io | null>(null);

  useEffect(() => {
    void api<Io>('accesso/io').then((r) => (r.ok ? setIo(r.dati) : router.replace('/accesso')));
  }, [router]);
  if (!io) return null;

  const obbligo = io.cambia_password;
  return (
    <Accesso
      titolo={obbligo ? 'Scegli la tua password' : 'Cambia la password'}
      testo={obbligo ? 'Stai usando la password provvisoria arrivata per email: scegline una tua prima di continuare.' : `Ciao ${io.nome}, scegli la nuova password.`}
      conferma={obbligo ? 'Salva e continua' : 'Salva la password'}
      link={obbligo ? [{ testo: 'Esci', href: '/accesso/esci' }] : [{ testo: 'Annulla', href: ritorno }]}
      onConferma={async (v) => {
        if (v.nuova !== v.ripeti) return 'Le due password non coincidono.';
        const r = await api('accesso/password', { attuale: v.attuale, nuova: v.nuova });
        if (!r.ok) return r.messaggio;
        router.replace(ritorno);
      }}
    >
      <Campo nome="attuale" etichetta={obbligo ? 'Password provvisoria' : 'Password attuale'} tipo="password" />
      <Campo nome="nuova" etichetta="Nuova password" tipo="password" completa="new-password" />
      <Campo nome="ripeti" etichetta="Ripeti la nuova password" tipo="password" completa="new-password" />
    </Accesso>
  );
}

export default function Pagina() {
  return <Suspense><Cambia /></Suspense>;
}
