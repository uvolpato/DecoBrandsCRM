import type { ReactNode } from 'react';
import { VistaGuida } from './VistaGuida';

// Gli argomenti della Guida (§7.17) stanno nel layout: cambiando /guida/<argomento> la vista resta
// montata e si ridisegna solo il pannello di destra (useParams dà l'argomento). Le pagine figlie
// danno solo l'indirizzo — stesso schema di Impostazioni (D-65, rilievo 20/11/2026).
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}<VistaGuida /></>;
}
