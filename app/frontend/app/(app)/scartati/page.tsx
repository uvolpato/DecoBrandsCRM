'use client';
import { VistaScartati } from './VistaScartati';

// Documenti scartati (F5-A7, §7.16): recupero ed eliminazione definitiva. Il permesso
// (provvigioni.scartati) lo controlla il guscio dalla voce della barra.
export default function Pagina() {
  return <VistaScartati />;
}
