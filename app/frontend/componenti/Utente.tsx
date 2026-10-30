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

// Nomi per l'interfaccia (M.RUOLI, M.LIVELLI, M.AREE del prototipo, §8.3, D-45). Le regole stanno sul server.
export const RUOLI: Record<string, string> = { superutente: 'Superutente', amministratore: 'Amministratore', utente: 'Utente' };
export const LIVELLI: Record<string, string> = { lettura: 'Lettura', operatore: 'Operatore', responsabile: 'Responsabile' };
// ponytail: Vendite (§17) è spenta, si aggiunge qui quando si accende
export const AREE: Record<string, string> = { anagrafiche: 'Anagrafiche', provvigioni: 'Provvigioni' };
/** Ruolo in breve (barra): quello di Sistema o, per un utente, il livello in Provvigioni. */
export const ruoloBreve = (u: { ruolo: string; aree: Record<string, string> }) =>
  u.ruolo !== 'utente' ? RUOLI[u.ruolo] : u.aree.provvigioni ? LIVELLI[u.aree.provvigioni] : RUOLI.utente;
