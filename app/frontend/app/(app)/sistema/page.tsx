'use client';
import { VistaSistema } from './VistaSistema';

// Stato del sistema (F5-A5, §7.14): i servizi che lavorano da soli, i problemi da vedere e i giri.
// Il permesso (sistema.stato) lo controlla il guscio dalla voce della barra.
export default function Pagina() {
  return <VistaSistema />;
}
