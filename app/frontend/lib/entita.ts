import type { CampoFiltro } from '@/componenti/FilterBar';
import type { Colonna } from '@/componenti/DataTable';

// Entità per i campi di ricerca (CRM.Entita di entita.js): fornitore, cliente, subagente, pratica, …
// Ognuna si definisce una volta sola e si passa al campo (`entita`). A differenza del prototipo le
// voci non sono nei dati del browser: `voci` le chiede al server (/api/lookup/*, fase F1) e può
// restituire l'elenco o una promessa. Niente dati finti qui dentro (V12).
export interface Contesto {
  limita?: string[] | null; // restringe alle voci con queste chiavi (es. solo quelle con dati nel periodo)
  tutti?: boolean; // anche le voci non attive (es. subagenti cessati, nelle analisi)
  [altro: string]: unknown; // es. fornitore_id: va a `voci`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Entita<R> si passa ai campi senza R
export interface Entita<R = any> {
  titolo: string;
  voci: (ctx: Contesto) => R[] | Promise<R[]>; // tutte le voci: attive e non (ctx.tutti è sempre vero qui)
  chiave: (r: R) => string;
  testo: (r: R) => string;
  dettaglio?: (r: R) => string; // seconda riga nel menu
  cerca?: (r: R) => string; // testo in più su cui cercare
  attiva?: (r: R) => boolean; // false: la voce sta nel menu solo con contesto.tutti
  colonne: Colonna<R>[]; // della maschera di ricerca
  filtri?: (ctx: Contesto) => CampoFiltro[]; // filtri in più nella maschera (oltre alla ricerca)
  filtra?: (r: R, valori: Record<string, string | string[]>) => boolean;
}

// Le voci si chiedono una volta per contesto: più campi con la stessa entità (barra, riepilogo,
// maschera) non fanno più richieste. La copia vale 5 secondi, poi si richiede al server.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CACHE = new WeakMap<Entita, Map<string, { t: number; p: Promise<any[]> }>>();

export function caricaVoci<R>(ent: Entita<R>, ctx: Contesto = {}): Promise<R[]> {
  const mappa = CACHE.get(ent) ?? new Map();
  CACHE.set(ent, mappa);
  const k = JSON.stringify({ ...ctx, limita: undefined, tutti: undefined }), c = mappa.get(k);
  if (c && Date.now() - c.t < 5000) return c.p;
  const p = Promise.resolve(ent.voci({ ...ctx, limita: null, tutti: true }));
  mappa.set(k, { t: Date.now(), p });
  p.catch(() => mappa.delete(k));
  return p;
}

/** Le voci del menu: attive (tutte con ctx.tutti) e, se c'è, ristrette a ctx.limita. */
export function vociMenu<R>(ent: Entita<R>, ctx: Contesto, tutte: R[]) {
  const k = ctx.limita ? new Set(ctx.limita.map(String)) : null;
  return tutte.filter((r) => (ctx.tutti || !ent.attiva || ent.attiva(r)) && (!k || k.has(String(ent.chiave(r)))));
}

import { api } from '@/lib/api';

export const fornitore: Entita<any> = {
  titolo: 'Fornitore',
  voci: async () => {
    const r = await api<any[]>('fornitori');
    if (!r.ok) return [];
    return r.dati.map((f: any) => ({ id: f.id, nome: f.ragione_sociale ?? f.id, piva: f.piva }));
  },
  chiave: (r: any) => r.id,
  testo: (r: any) => r.nome ?? '',
  dettaglio: (r: any) => (r.piva ? 'P.IVA ' + r.piva : ''),
  cerca: (r: any) => (r.nome ?? '') + ' ' + (r.piva ?? ''),
  colonne: [
    { key: 'nome', header: 'Fornitore', grow: true },
    { key: 'piva', header: 'P.IVA' },
  ] as any,
};

export const cliente: Entita<any> = {
  titolo: 'Cliente',
  voci: async () => {
    const r = await api<any[]>('clienti');
    if (!r.ok) return [];
    return r.dati.map((c: any) => ({ id: c.id, nome: c.ragione_sociale ?? c.id, piva: c.piva }));
  },
  chiave: (r: any) => r.id,
  testo: (r: any) => r.nome ?? '',
  dettaglio: (r: any) => (r.piva ? 'P.IVA ' + r.piva : ''),
  cerca: (r: any) => (r.nome ?? '') + ' ' + (r.piva ?? ''),
  colonne: [
    { key: 'nome', header: 'Cliente', grow: true },
    { key: 'piva', header: 'P.IVA' },
  ] as any,
};

export const subagente: Entita<any> = {
  titolo: 'Subagente',
  voci: async () => {
    const r = await api<any[]>('subagenti');
    if (!r.ok) return [];
    return r.dati.map((s: any) => ({ id: s.id, nome: (s.cognome + ' ' + s.nome).trim(), email: s.email, attivo: s.attivo }));
  },
  chiave: (r: any) => r.id,
  testo: (r: any) => r.nome ?? '',
  dettaglio: (r: any) => r.email ?? '',
  attiva: (r: any) => r.attivo !== false,
  colonne: [
    { key: 'nome', header: 'Subagente', grow: true },
    { key: 'email', header: 'Email' },
  ] as any,
};

export const agente: Entita<any> = {
  titolo: 'Agente',
  voci: async () => {
    const r = await api<any[]>('agenti');
    if (!r.ok) return [];
    return r.dati.map((a: any) => ({ id: a.id, nome: (a.cognome + ' ' + a.nome).trim(), codice: a.codice }));
  },
  chiave: (r: any) => r.id,
  testo: (r: any) => r.nome ?? '',
  dettaglio: (r: any) => r.codice ?? '',
  colonne: [
    { key: 'nome', header: 'Agente', grow: true },
    { key: 'codice', header: 'Codice' },
  ] as any,
};
