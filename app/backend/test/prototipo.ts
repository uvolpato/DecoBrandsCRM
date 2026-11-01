// Il prototipo vero come fonte dei numeri attesi (F0-A5): esegue dati.js + motore.js in Node, con
// in più le due pratiche di §12 che il seed aggiunge (OF/2026/S12-…, dal file dati-prova.json).
// Si rilegge a ogni prova: se cambia il prototipo, cambiano anche gli attesi.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';

/* eslint-disable @typescript-eslint/no-explicit-any */
const ASSETS = join(__dirname, '../../../prototipo-alternativo/assets');

export function prototipo(): any {
  const window: any = {};
  const ctx = createContext({ window, console });
  runInContext(readFileSync(join(ASSETS, 'dati.js'), 'utf8'), ctx);
  const D = JSON.parse(readFileSync(join(__dirname, '../prisma/seed/dati-prova.json'), 'utf8'));
  const riga = (r: any[]) => ({ codice: r[0], descrizione: r[1], qta: r[2], prezzo: r[3] });
  for (const p of D.pratiche.filter((x: any) => x.extra)) {
    window.DATI_DEMO.pratiche.push({ ...p, documenti: p.documenti.map((d: any) => ({ ...d, righe: d.righe.map(riga) })) });
  }
  runInContext(readFileSync(join(ASSETS, 'motore.js'), 'utf8'), ctx); // senza localStorage: parte da DATI_DEMO
  return window.M;
}
