'use client';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

// Memoria della schermata (CRM.registra del prototipo, spec §7.12): filtri, scheda, ordinamento, pagina
// e scorrimento si ritrovano tornando alla pagina. Sta in memoria del browser, per pagina e per chiave:
// passando fra le pagine (Indietro compreso) i valori restano; ricaricando la pagina si riparte da zero.
// ponytail: si ritrovano anche riaprendo la pagina dal menu (il prototipo riparte da zero), come già
// faceva Utenti; per distinguere serve history.state.
const MEM = new Map<string, unknown>();

/** Come useState, ma il valore si ricorda per questa pagina con questa chiave. Senza chiave: useState. */
export function useMemoria<T>(chiave: string | undefined, iniziale: T) {
  const k = usePathname().split('/').slice(0, 2).join('/') + '|' + chiave; // /utenti/3 e /utenti: stessa memoria
  const [v, setV] = useState<T>(() => (chiave && MEM.has(k) ? (MEM.get(k) as T) : iniziale));
  const metti = useCallback((x: T | ((p: T) => T)) => setV((p) => {
    const n = typeof x === 'function' ? (x as (p: T) => T)(p) : x;
    if (chiave) MEM.set(k, n);
    return n;
  }), [k, chiave]);
  return [v, metti] as const;
}

/** Ref per un'area che scorre: ricorda la posizione e la ripristina quando i dati sono arrivati (`pronto`). */
export function useScorrimento<E extends HTMLElement>(chiave: string | undefined, pronto = true) {
  const k = usePathname().split('/').slice(0, 2).join('/') + '|scorri|' + chiave;
  const ref = useRef<E>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !chiave) return;
    const y = MEM.get(k) as number | undefined;
    if (pronto && y) el.scrollTop = y;
    const salva = () => MEM.set(k, el.scrollTop);
    el.addEventListener('scroll', salva, { passive: true });
    return () => el.removeEventListener('scroll', salva);
  }, [k, chiave, pronto]);
  return ref;
}
