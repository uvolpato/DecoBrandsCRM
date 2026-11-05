'use client';
import { useParams } from 'next/navigation';
import { VistaGuida } from '../VistaGuida';

// Guida in linea (§7.17): /guida apre il primo argomento visibile, /guida/:argomento quello
// scelto; un argomento inesistente (o non permesso) riporta al primo.
export default function Pagina() {
  const { argomento } = useParams<{ argomento?: string[] }>();
  return <VistaGuida idSel={argomento?.[0]} />;
}
