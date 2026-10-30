'use client';
import { usePathname } from 'next/navigation';
import { titoloDi } from '@/componenti/Barra';
import { InCostruzione } from '@/componenti/InCostruzione';
import { Riservata } from '@/componenti/Pagina';

// Pagine della barra non ancora fatte: dentro il guscio, con lo stesso controllo dei permessi
// che avranno (Pagina riservata). Una pagina vera, quando arriva, prende il posto di questa.
const PERMESSO: Record<string, string> = { utenti: 'gestione', impostazioni: 'gestione', sistema: 'sistema', scartati: 'scartati' };

export default function Pagina() {
  const percorso = usePathname();
  const titolo = titoloDi(percorso);
  const permesso = PERMESSO[percorso.split('/')[1]];
  const pagina = <InCostruzione titolo={titolo} />;
  return permesso ? <Riservata permesso={permesso} titolo={titolo}>{pagina}</Riservata> : pagina;
}
