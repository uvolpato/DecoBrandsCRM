'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaFornitori } from './VistaFornitori';

export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}<VistaFornitori idSel={id} /></>;
}