'use client';
import { useParams } from 'next/navigation';
import { VistaBollettino } from './VistaBollettino';

// Il dettaglio si disegna da sé: il layout dei bollettini monta l'elenco solo senza id.
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <VistaBollettino id={id} />;
}
