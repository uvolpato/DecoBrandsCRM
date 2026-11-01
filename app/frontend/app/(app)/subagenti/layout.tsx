'use client';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { VistaSubagenti } from './VistaSubagenti';

export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id?: string }>();
  return <>{children}<VistaSubagenti idSel={id} /></>;
}