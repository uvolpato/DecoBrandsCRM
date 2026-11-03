'use client';
import { useParams } from 'next/navigation';
import { VistaPratica } from './VistaPratica';

// Il dettaglio si disegna da sé: il layout delle pratiche monta l'elenco solo senza id.
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <VistaPratica id={id} />;
}
