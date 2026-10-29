'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';

// Esci: chiude la sessione sul server (anche la riga in sessioni) e torna all'accesso.
export default function Pagina() {
  const router = useRouter();
  useEffect(() => {
    void (async () => {
      await api('accesso/esci', {}); // senza sessione risponde 401: si va comunque all'accesso
      router.replace('/accesso');
    })();
  }, [router]);
  return null;
}
