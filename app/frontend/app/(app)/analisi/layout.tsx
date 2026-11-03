'use client';
import type { ReactNode } from 'react';
import { VistaAnalisi } from './VistaAnalisi';

// L'Analisi non ha sotto-pagine: la vista sta qui, i filtri e il periodo si ritrovano tornando (§7.12).
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}<VistaAnalisi /></>;
}
