import type { Variante } from '@/componenti/Piccoli';

// Stati della pratica con etichetta e badge, uguali in Pratiche e nella scheda Pratiche del cliente (D-24).
export type StatoPratica = 'scaduta' | 'attesa' | 'confermata' | 'fatturata' | 'annullata';

export const ETICHETTA_PRATICA: Record<StatoPratica, { testo: string; v: Variante }> = {
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
  annullata: { testo: 'Annullata', v: 'neutro' },
};
