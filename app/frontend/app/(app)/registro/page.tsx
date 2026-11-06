'use client';
import { VistaRegistro } from './VistaRegistro';

// Registro (F5-A2, §7.11): eventi e anomalie, in sola lettura. Il permesso (sistema.registro) lo
// controlla il guscio: l'area Gestione e la voce della barra decidono qui.
export default function Pagina() {
  return <VistaRegistro />;
}
