'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaPratiche } from './VistaPratiche';

// L'elenco resta montato solo su /pratiche: il dettaglio (/pratiche/<id>, F2-A2) è una pagina sua.
export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}{!id && <VistaPratiche />}</>;
}
