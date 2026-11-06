'use client';
import { useParams } from 'next/navigation';
import { VistaDocumento } from './VistaDocumento';

// Il dettaglio si disegna da sé: il layout dei documenti monta l'elenco solo senza id.
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <VistaDocumento id={id} />;
}
