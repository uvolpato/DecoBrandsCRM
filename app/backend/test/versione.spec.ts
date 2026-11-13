// Versione visibile nell'app (13/11/2026): il numero mostrato è quello del package.json del
// backend, unico posto da alzare a ogni rilascio.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { puntoVersione } from '../src/versione';

it('la versione è quella del package.json del backend', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  const v = puntoVersione();
  expect(v.numero).toBe(pkg.version);
  expect(v.numero).toBe('0.2.0');
  // il commit c'è quando Git risponde, altrimenti manca (in esercizio può non esserci)
  expect(v.commit === null || v.commit.length > 0).toBe(true);
});
