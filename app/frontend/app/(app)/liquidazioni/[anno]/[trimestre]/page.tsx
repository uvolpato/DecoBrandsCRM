'use client';
import { useParams } from 'next/navigation';
import { VistaLiquidazioni } from '../../VistaLiquidazioni';

// Un trimestre preciso: la pagina resta montata cambiando trimestre, i dati si rileggono (F4-A1, §7.8).
export default function Pagina() {
  const { anno, trimestre } = useParams<{ anno: string; trimestre: string }>();
  return <VistaLiquidazioni anno={Number(anno)} trimestre={Number(trimestre)} />;
}
