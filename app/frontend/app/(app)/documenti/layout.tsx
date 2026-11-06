'use client';
import type { ReactNode } from 'react';

// Elenco e dettaglio stanno nella stessa pagina (VistaDocumenti): qui si passa solo il contenuto.
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
