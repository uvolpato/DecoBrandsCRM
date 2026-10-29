'use client';
import { useParams, useRouter } from 'next/navigation';
import { Accesso } from '@/componenti/Accesso';
import { Campo } from '@/componenti/Campo';
import { api } from '@/lib/api';

// Nuova password dal link dell'email (§7.0): il link vale una volta, per un'ora; salvata la
// password, tutte le sessioni dell'utente si chiudono e si rientra con quella nuova.
export default function Pagina() {
  const router = useRouter();
  const { codice } = useParams<{ codice: string }>();
  return (
    <Accesso
      titolo="Nuova password"
      testo="Scegli la nuova password: almeno 8 caratteri. Dopo, entra con quella."
      conferma="Salva la password"
      link={[{ testo: 'Torna all’accesso', href: '/accesso' }]}
      onConferma={async (v) => {
        if (v.nuova !== v.ripeti) return 'Le due password non coincidono.';
        const r = await api('accesso/reimposta', { codice, nuova: v.nuova });
        if (!r.ok) return r.messaggio;
        router.replace('/accesso?fatto=password');
      }}
    >
      <Campo nome="nuova" etichetta="Nuova password" tipo="password" completa="new-password" />
      <Campo nome="ripeti" etichetta="Ripeti la nuova password" tipo="password" completa="new-password" />
    </Accesso>
  );
}
