'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaBollettini } from './VistaBollettini';

// L'elenco resta montato solo su /bollettini: il dettaglio (/bollettini/<id>, F3-A2) è una pagina sua.
export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}{!id && <VistaBollettini />}</>;
}
