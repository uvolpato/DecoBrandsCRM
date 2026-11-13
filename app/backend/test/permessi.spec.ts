// A1-09: matrice dei permessi su tutte le rotte (BFLA). Il guard nega una rotta senza permesso,
// ma una rotta nuova che scrive con un permesso di sola lettura passerebbe tutte le altre prove.
// Qui si elencano i controller (DiscoveryService) e si controlla cosa dichiara ogni handler.
import 'dotenv/config';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

const METODO: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.ALL]: 'ALL',
  [RequestMethod.OPTIONS]: 'OPTIONS',
  [RequestMethod.HEAD]: 'HEAD',
  [RequestMethod.SEARCH]: 'SEARCH',
};

// Permessi che possono solo leggere: mai su una rotta che scrive.
const SOLA_LETTURA = ['consulta', 'esporta'];
// Uniche rotte che scrivono e vanno bene con il solo 'collegato' (io, esci, cambio password).
const COLLEGATO_AMMESSO = new Set(['accesso/esci', 'accesso/password', 'accesso/profilo']);
// Uniche rotte pubbliche ammesse: salute e le tre dell'accesso.
const PUBBLICHE_AMMESSE = ['salute', 'accesso/entra', 'accesso/dimenticata', 'accesso/reimposta'];

type Rotta = { metodo: string; percorso: string; permesso?: string };

let rotte: Rotta[] = [];
let mod: TestingModule;

/** I pezzi di percorso di un decoratore, senza barre ai lati (Nest: assente = '/'). */
const pezzi = (p: unknown) =>
  (Array.isArray(p) ? p : [p ?? '']).map((x) => String(x).replace(/^\/+|\/+$/g, '')).filter(Boolean);
const percorso = (parti: string[]) => parti.join('/') || '/';

beforeAll(async () => {
  mod = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] }).compile();
  await mod.init();
  const discovery = mod.get(DiscoveryService);
  const scanner = new MetadataScanner();
  const reflector = new Reflector();
  for (const wrapper of discovery.getControllers()) {
    const { instance, metatype } = wrapper;
    if (!instance || !metatype) continue;
    const base = pezzi(Reflect.getMetadata(PATH_METADATA, metatype));
    for (const nome of scanner.getAllMethodNames(Object.getPrototypeOf(instance))) {
      const handler = instance[nome] as unknown;
      if (typeof handler !== 'function') continue;
      const via = Reflect.getMetadata(PATH_METADATA, handler);
      if (via === undefined) continue; // non è un handler HTTP
      const metodo = METODO[Reflect.getMetadata(METHOD_METADATA, handler) as number] ?? '?';
      const permesso = reflector.getAllAndOverride<string>('permesso', [handler, metatype]);
      rotte.push({ metodo, percorso: percorso([...base, ...pezzi(via)]), permesso });
    }
  }
});

afterAll(() => mod.close());

it('ogni rotta dichiara un permesso (o è pubblica)', () => {
  expect(rotte.length).toBeGreaterThan(0);
  expect(rotte.filter((r) => !r.permesso).map((r) => `${r.metodo} ${r.percorso}`)).toEqual([]);
});

it('una rotta che scrive non usa un permesso di sola lettura (*.consulta, *.esporta)', () => {
  const scritture = rotte.filter((r) => r.metodo !== 'GET');
  expect(scritture.length).toBeGreaterThan(0);
  const sbagliate = scritture
    .filter((r) => SOLA_LETTURA.includes((r.permesso ?? '').split('.').pop() ?? ''))
    .map((r) => `${r.metodo} ${r.percorso} → ${r.permesso}`);
  expect(sbagliate).toEqual([]);
});

it("una rotta che scrive con 'collegato' sta nell'elenco chiuso", () => {
  const fuori = rotte
    .filter((r) => r.metodo !== 'GET' && r.permesso === 'collegato' && !COLLEGATO_AMMESSO.has(r.percorso))
    .map((r) => `${r.metodo} ${r.percorso}`);
  expect(fuori).toEqual([]);
});

it('le rotte pubbliche sono solo quelle previste', () => {
  const pubbliche = rotte.filter((r) => r.permesso === 'pubblica').map((r) => r.percorso).sort();
  expect(pubbliche).toEqual([...PUBBLICHE_AMMESSE].sort());
});
