'use client';
import { usePathname } from 'next/navigation';
import { titoloDi } from '@/componenti/Barra';
import { InCostruzione } from '@/componenti/InCostruzione';

// Pagine della barra non ancora fatte: dentro il guscio, che controlla già i permessi della voce
// (Pagina riservata, D-45). Una pagina vera, quando arriva, prende il posto di questa.
export default function Pagina() {
  return <InCostruzione titolo={titoloDi(usePathname())} />;
}
