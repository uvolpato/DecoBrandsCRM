import { Controller, Get } from '@nestjs/common';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Richiede } from './accesso';

// Versione visibile nell'app (13/11/2026): quando Ugo segnala un problema si deve sapere su quale
// versione era. Il numero viene dal `version` di app/backend/package.json, unico posto da alzare;
// il commit da Git, se risponde (in esercizio Git può mancare: resta null). Si calcola una volta
// all'avvio e non espone percorsi del disco.

export interface Versione {
  numero: string;
  commit: string | null;
}

/** La cartella del backend: `src` nelle prove, `dist/src` in esercizio, quindi si risale. */
function cartellaBackend() {
  let d = __dirname;
  while (!existsSync(join(d, 'package.json')) && dirname(d) !== d) d = dirname(d);
  return d;
}

export function puntoVersione(): Versione {
  const cartella = cartellaBackend();
  const numero = JSON.parse(readFileSync(join(cartella, 'package.json'), 'utf8')).version as string;
  let commit: string | null = null;
  try {
    commit = execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
      cwd: join(cartella, '..', '..'), // la radice del repository
      timeout: 2000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    // senza Git (o fuori dal repository) la versione resta il solo numero
  }
  return { numero, commit };
}

const VERSIONE = puntoVersione();

@Controller('versione')
export class VersioneController {
  /** La versione per la barra e per Stato del sistema: serve solo essere collegati. */
  @Get()
  @Richiede('collegato')
  versione(): Versione {
    return VERSIONE;
  }
}
