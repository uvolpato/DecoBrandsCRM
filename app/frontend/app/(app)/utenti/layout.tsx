'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaUtenti } from './VistaUtenti';

// Utenti e ruoli (§7.13): la pagina sta nel layout, così passando da /utenti a /utenti/:id (clic
// su una riga) non si ricostruisce: ordinamento, pagina, scorrimento e filtri restano (§7.12).
// Le pagine figlie danno solo l'indirizzo.
export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}<VistaUtenti idSel={id} /></>;
}
