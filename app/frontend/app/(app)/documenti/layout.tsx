'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaDocumenti } from './VistaDocumenti';

// L'elenco resta montato solo su /documenti: il dettaglio (/documenti/<id>) è una pagina sua.
export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}{!id && <VistaDocumenti />}</>;
}
