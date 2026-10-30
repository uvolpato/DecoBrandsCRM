'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Accesso } from '@/componenti/Accesso';
import { Campo } from '@/componenti/Campo';
import { api, dopo, type Io } from '@/lib/api';

// Accedi (§7.0, D-39): nome utente (o email) e password; un solo messaggio per ogni errore.
function Accedi() {
  const router = useRouter();
  const q = useSearchParams();
  const ritorno = dopo(q.get('dopo'));
  useEffect(() => { // già dentro: niente pagina di accesso
    void api('accesso/io').then((r) => r.ok && router.replace(ritorno));
  }, [router, ritorno]);
  return (
    <Accesso
      titolo="Accedi"
      marchio
      testo="Usa il nome utente (o l’email) e la password che ti ha mandato l’amministratore."
      avviso={q.get('fatto') === 'password' ? 'Password salvata: entra con la nuova password.' : undefined}
      conferma="Entra"
      link={[{ testo: 'Password dimenticata?', href: '/accesso/dimenticata' }]}
      onConferma={async (v) => {
        if (!v.utente || !v.password) return 'Scrivi nome utente (o email) e password.';
        const r = await api<Io>('accesso/entra', { utente: v.utente, password: v.password, resta: v.resta });
        if (r.stato === 401) return 'Credenziali non valide.';
        if (!r.ok) return r.messaggio;
        // replace: la pagina di accesso non resta nella cronologia
        router.replace(r.dati.cambia_password ? '/accesso/cambia?dopo=' + encodeURIComponent(ritorno) : ritorno);
      }}
    >
      <Campo nome="utente" etichetta="Nome utente o email" completa="username" />
      <Campo nome="password" etichetta="Password" tipo="password" />
      <Campo nome="resta" etichetta="Resta collegato su questo computer" tipo="casella" valore />
    </Accesso>
  );
}

export default function Pagina() {
  return <Suspense><Accedi /></Suspense>; // useSearchParams vuole un confine Suspense
}
