import type { ReactNode } from 'react';
import { ClasseBody } from '@/componenti/ClasseBody';
import { ScenaAccesso } from '@/componenti/ScenaAccesso';

// Pagine di accesso (§7.0, D-42): pagina scura con il logo, come nel prototipo (CRM.Accesso).
// La scena arriva già nell'HTML del server e stile.css la riconosce con body:has(.accesso-scena):
// la pagina nasce scura, senza lampo al ricaricamento; la classe in-accesso resta per i browser senza :has.
export default function LayoutAccesso({ children }: { children: ReactNode }) {
  return (
    <main className="principale">
      <ClasseBody classe="in-accesso" />
      <ScenaAccesso>{children}</ScenaAccesso>
    </main>
  );
}
