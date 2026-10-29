'use client';
import { useState } from 'react';
import { Accesso } from '@/componenti/Accesso';
import { Campo } from '@/componenti/Campo';
import { api } from '@/lib/api';

// Password dimenticata (§7.0): dopo l'invio sempre "Controlla la posta", anche se l'email non è
// registrata (§3.3).
export default function Pagina() {
  const [email, setEmail] = useState('');
  if (email) {
    return (
      <Accesso
        titolo="Controlla la posta"
        testo={<>Se <b>{email}</b> è l’email di un utente, tra poco arriva un link per scegliere una nuova password. Vale un’ora e una volta sola.</>}
        conferma="Torna all’accesso"
        onConferma={async () => { window.location.assign('/accesso'); }}
      />
    );
  }
  return (
    <Accesso
      titolo="Password dimenticata"
      testo="Scrivi l’email del tuo utente: ti mandiamo un link per sceglierne una nuova, valido un’ora."
      conferma="Manda il link"
      link={[{ testo: 'Torna all’accesso', href: '/accesso' }]}
      onConferma={async (v) => {
        const r = await api('accesso/dimenticata', { email: v.email });
        if (r.stato === 400) return 'Scrivi un’email valida.';
        if (!r.ok) return r.messaggio;
        setEmail(String(v.email));
      }}
    >
      <Campo nome="email" etichetta="Email" completa="email" />
    </Accesso>
  );
}
