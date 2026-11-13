import type { ReactNode } from 'react';
import { VistaImpostazioni } from './VistaImpostazioni';

// Le sezioni di Impostazioni (§7.15, D-65) stanno nel layout: cambiando /impostazioni/<sezione> la vista
// resta montata e si ricarica solo il pannello di destra (useParams dà la sezione). Le pagine figlie
// danno solo l'indirizzo. Così niente sagome e niente GET /api/impostazioni a ogni clic.
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}<VistaImpostazioni /></>;
}
