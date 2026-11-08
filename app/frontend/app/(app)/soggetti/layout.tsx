'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaSoggetti } from './VistaSoggetti';

export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}<VistaSoggetti idSel={id} /></>;
}
