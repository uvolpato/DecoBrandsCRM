'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Rotta corta come il prototipo: apre il trimestre di oggi (§7.8). Il trimestre lo decide il server, qui
// si sceglie solo l'indirizzo su cui leggere.
export default function Pagina() {
  const router = useRouter();
  useEffect(() => {
    const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
    router.replace(`/liquidazioni/${oggi.slice(0, 4)}/${Math.floor((Number(oggi.slice(5, 7)) - 1) / 3) + 1}`);
  }, [router]);
  return null;
}
