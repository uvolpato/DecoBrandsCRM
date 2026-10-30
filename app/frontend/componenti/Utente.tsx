'use client';
import { createContext, use } from 'react';
import type { Io } from '@/lib/api';

// L'utente corrente, letto dal server dal guscio (GET /api/accesso/io, D-38): ruolo e permessi
// vengono dal server; qui si usano solo per mostrare o nascondere (il server ricontrolla, V12).
export const UtenteCtx = createContext<Io | null>(null);
export const useUtente = () => use(UtenteCtx)!; // React 19: use() al posto di useContext()
export const usePuo = () => {
  const io = useUtente();
  return (permesso: string) => io.permessi.includes(permesso);
};

// Nomi dei ruoli per l'interfaccia (M.RUOLI del prototipo, §8.3).
export const RUOLI: Record<string, string> = {
  superutente: 'Superutente',
  amministratore: 'Amministratore',
  operatore: 'Operatore',
  lettura: 'Sola lettura',
};
