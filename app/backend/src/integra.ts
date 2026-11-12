import { BadGatewayException, ConflictException, Controller, HttpCode, Injectable, Logger, OnModuleDestroy, OnModuleInit, Post, Req } from '@nestjs/common';
import { type Prisma, type PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { Pool } from 'pg';
import { Richiede, contesto } from './accesso';
import { integraConfig } from './impostazioni';
import { PrismaService } from './prisma.service';
import { apriAnomalia, chiudiAnomalia } from './registro';

// Sincronizzazione delle anagrafiche dal database ponte di Integra (F1-A4, §4.5, D-32, D-46).
// Il CRM non si collega mai a Integra: legge solo le viste dello schema `public`, in sola lettura,
// con SELECT parametriche. Tutto si calcola e si scrive qui, mai dai dati del frontend (V12, D-28).

type Db = Prisma.TransactionClient | PrismaClient;
type Tipo = 'cliente' | 'fornitore';
type Vista = 'clienti' | 'fornitori';

export const OGNI_MS = 60_000; // un giro ogni minuto (§4.5)
const SCHEMA = 'public'; // schema di riserva: con le Impostazioni arriva da integraConfig (D-65)
const GIORNO_MS = 24 * 60 * 60 * 1000; // margine: Integra non ha i secondi (§4.5)
const SECONDI_LENTI = 30; // oltre il giro è "lento" (§7.14.3)

export interface ConteggioVista { letti: number; nuovi: number; versioni: number; disattivati: number; scartati: number }
export interface Conteggi { clienti: ConteggioVista; fornitori: ConteggioVista }

export interface Riga {
  id_integra: number;
  codice: string | null;
  ragione_sociale: string | null;
  piva: string | null;
  codice_fiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  paese: string | null;
  email: string | null;
  pec: string | null;
  codice_agente: string | null;
  attivo: boolean | null;
  modificato_il: Date | null;
}

// Colonne in un punto solo: col ponte vero si cambia solo qui.
// ponytail: colonne da confermare col ponte vero, F0-A8
export const VISTE: Record<Vista, { vista: string; colonne: string[] }> = {
  clienti: {
    vista: 'integra_v_clienti',
    colonne: ['id_integra', 'codice', 'ragione_sociale', 'piva', 'codice_fiscale', 'indirizzo', 'cap', 'citta',
      'provincia', 'paese', 'email', 'pec', 'codice_agente', 'attivo', 'modificato_il'],
  },
  fornitori: {
    vista: 'integra_v_fornitori',
    colonne: ['id_integra', 'codice', 'ragione_sociale', 'piva', 'codice_fiscale', 'indirizzo', 'cap', 'citta',
      'provincia', 'paese', 'email', 'pec', 'attivo', 'modificato_il'],
  },
};

const log = new Logger('Integra');

// ---------- Testi fissi delle anomalie (§7.14.3): nessun messaggio tecnico grezzo ----------

const TESTO = {
  connessione: 'Integra non risponde da 3 giri di fila: controllare server, utente e password in Impostazioni → Sincronizzazione e avvisare chi gestisce Integra.',
  vista: (vista: string) => `La vista ${vista} manca o ha colonne diverse: chiedere a chi gestisce Integra di ripristinarla.`,
  pivaMancante: (tipo: Tipo, codice: string) => `Il ${tipo} ${codice} non ha una P.IVA valida: correggerla in Integra, entra da sola al giro successivo.`,
  pivaDoppia: (tipo: Tipo, piva: string) => `La P.IVA ${piva} è su più di un ${tipo}: unire o correggere in Integra.`,
  lenta: (secondi: number) => `La sincronizzazione è durata ${secondi} secondi: segnalare a chi gestisce Integra il carico del database.`,
  riga: (tipo: Tipo, codice: string, errore: string) => `Il ${tipo} ${codice} non è stato copiato: ${errore}`,
};

// ---------- Valori normalizzati (§4.5) ----------

const testo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');
const mail = (v: unknown) => testo(v).toLowerCase();

/** P.IVA in maiuscolo, senza spazi né punti; `IT` tolto solo se restano 11 cifre. */
function piva(v: unknown): string {
  const s = testo(v).replace(/[\s.]/g, '').toUpperCase();
  return /^IT\d{11}$/.test(s) ? s.slice(2) : s;
}

/**
 * 11 cifre (P.IVA italiana) oppure 2 lettere + almeno 2 caratteri (estero).
 * shortcut: la cifra di controllo italiana non si verifica ancora: le P.IVA dei dati di prova sono
 * inventate e verrebbero scartate tutte; si accende col ponte vero (F0-A8).
 */
function pivaValida(s: string): boolean {
  return /^\d{11}$/.test(s) || /^[A-Z]{2}.{2,}$/.test(s);
}

function norm(campo: string, valore: unknown): string {
  if (campo === 'piva') return piva(valore);
  if (campo === 'email') return mail(valore);
  return testo(valore);
}

function cambia(nuovi: Record<string, string | null>, vecchia: Record<string, unknown>): boolean {
  return Object.entries(nuovi).some(([campo, v]) => norm(campo, v) !== norm(campo, vecchia[campo]));
}

/** Alcune colonne restano fuori dalle versioni (codice_fiscale, pec, codice_agente, indirizzo/email del fornitore). */
export function datiCliente(r: Riga) {
  return {
    piva: piva(r.piva) || null,
    ragione_sociale: testo(r.ragione_sociale),
    indirizzo: testo(r.indirizzo) || null,
    cap: testo(r.cap) || null,
    citta: testo(r.citta) || null,
    provincia: testo(r.provincia) || null,
    email: mail(r.email) || null,
  };
}

export function datiFornitore(r: Riga) {
  return {
    piva: piva(r.piva) || null,
    ragione_sociale: testo(r.ragione_sociale),
    paese: testo(r.paese) || null,
  };
}

export const codiceDi = (r: Riga) => testo(r.codice) || String(r.id_integra);

/** Mai indirizzo o password nei testi, nei log, nelle risposte, nel registro. */
export function pulisci(errore: unknown): string {
  const messaggio = errore instanceof Error ? errore.message : String(errore);
  return messaggio
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[indirizzo rimosso]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g, '[indirizzo rimosso]')
    .replace(/\b(ENOTFOUND|EAI_AGAIN)\s+\S+/gi, '$1 [indirizzo rimosso]')
    .replace(/password\s*=\s*\S+/gi, 'password=[rimossa]')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

const vuoto = (): ConteggioVista => ({ letti: 0, nuovi: 0, versioni: 0, disattivati: 0, scartati: 0 });

// ---------- Un giro ----------

/**
 * Dal = inizio dell'ultimo giro riuscito − 1 giorno; se ci sono righe in errore, si torna alla più
 * vecchia anomalia aperta, così la riga si rilegge finché non passa. Al primo giro si legge tutto.
 */
async function daQuando(db: Db): Promise<Date> {
  const ultimo = await db.servizi_esecuzioni.findFirst({
    where: { servizio: 'integra', tipo: 'lavoro', esito: { in: ['ok', 'attenzione'] } },
    orderBy: [{ inizio: 'desc' }, { id: 'desc' }],
  });
  const base = ultimo ? new Date(ultimo.inizio.getTime() - GIORNO_MS) : new Date(0);
  const righe = await db.registro.findFirst({
    where: { genere: 'anomalia', codice: 'integra.riga', stato: 'aperta' },
    orderBy: { ts: 'asc' }, select: { ts: true },
  });
  return righe ? new Date(Math.min(base.getTime(), righe.ts.getTime() - GIORNO_MS)) : base;
}

async function leggi(ponte: Pool, vista: Vista, dal: Date, schema = SCHEMA): Promise<Riga[]> {
  const v = VISTE[vista];
  const sql = `SELECT ${v.colonne.join(', ')} FROM ${schema}.${v.vista} WHERE modificato_il > $1 ORDER BY modificato_il`;
  return (await ponte.query<Riga>(sql, [dal])).rows;
}

const erroreVista = (e: unknown) => ['42P01', '42703'].includes(String((e as { code?: string }).code));

/** Identità in codici_esterni: solo il codice di Integra salvato alla creazione (§4.5). */
async function identita(db: Db, tipo: Tipo, r: Riga) {
  return db.codici_esterni.findFirst({ where: { sistema: 'integra', tipo, codice: codiceDi(r) } });
}

/** Una riga della vista aggiorna il cliente se già in anagrafica; altrimenti si ignora (D-111, §4.7.1). */
async function applicaCliente(db: PrismaService, r: Riga, ora: Date, c: ConteggioVista) {
  const codice = codiceDi(r);
  const trovato = await identita(db, 'cliente', r);
  if (!trovato) return; // D-111: chi non è in anagrafica lo importa chi ha il documento
  const valida = piva(r.piva);
  if (!pivaValida(valida)) {
    c.scartati++;
    await apriAnomalia(db, {
      servizio: 'integra', codice: 'integra.piva_mancante', chiave: codice,
      messaggio: TESTO.pivaMancante('cliente', codice), dettaglio: { codice, piva: testo(r.piva) || '' },
    }, ora);
    return;
  }
  const dati = datiCliente(r);
  const tecnici = { attivo: r.attivo ?? true, modificato_il: r.modificato_il ?? ora, sincronizzato_il: ora };
  await db.$transaction(async (tx) => {
    const attuale = await tx.clienti.findUnique({ where: { id: trovato.entita_id }, include: { corrente: true } });
    if (!attuale) throw new Error(`codice ${codice} punta a un cliente che non c'è`);
    const versione = !attuale.corrente || cambia(dati, attuale.corrente)
      ? await tx.clienti_versioni.create({ data: { cliente_id: attuale.id, fonte: 'integra', valido_dal: ora, ...dati } })
      : null;
    await tx.clienti.update({
      where: { id: attuale.id },
      data: { ...tecnici, ...(versione ? { versione_corrente_id: versione.id } : {}) }, // mai i campi del CRM
    });
    if (versione) c.versioni++;
  });
  await chiudiAnomalia(db, 'integra', 'integra.piva_mancante', codice, ora);
  if (r.attivo === false) c.disattivati++;
}

async function applicaFornitore(db: PrismaService, r: Riga, ora: Date, c: ConteggioVista) {
  const codice = codiceDi(r);
  const trovato = await identita(db, 'fornitore', r);
  if (!trovato) return; // D-111: chi non è in anagrafica lo importa chi ha il documento
  const valida = piva(r.piva);
  if (!pivaValida(valida)) {
    c.scartati++;
    await apriAnomalia(db, {
      servizio: 'integra', codice: 'integra.piva_mancante', chiave: codice,
      messaggio: TESTO.pivaMancante('fornitore', codice), dettaglio: { codice, piva: testo(r.piva) || '' },
    }, ora);
    return;
  }
  const dati = datiFornitore(r);
  const tecnici = { attivo: r.attivo ?? true, modificato_il: r.modificato_il ?? ora, sincronizzato_il: ora };
  await db.$transaction(async (tx) => {
    const attuale = await tx.fornitori.findUnique({ where: { id: trovato.entita_id }, include: { corrente: true } });
    if (!attuale) throw new Error(`codice ${codice} punta a un fornitore che non c'è`);
    const versione = !attuale.corrente || cambia(dati, attuale.corrente)
      ? await tx.fornitori_versioni.create({ data: { fornitore_id: attuale.id, fonte: 'integra', valido_dal: ora, ...dati } })
      : null;
    await tx.fornitori.update({
      where: { id: attuale.id },
      data: { ...tecnici, ...(versione ? { versione_corrente_id: versione.id } : {}) },
    });
    if (versione) c.versioni++;
  });
  await chiudiAnomalia(db, 'integra', 'integra.piva_mancante', codice, ora);
  if (r.attivo === false) c.disattivati++;
}

/** P.IVA doppia fra identità correnti (§4.2.20, D-35): si copia e si segnala. */
async function pivaDoppie(db: PrismaService, tipo: Tipo, ora: Date) {
  const righe = tipo === 'cliente'
    ? await db.$queryRaw<{ piva: string }[]>`SELECT v.piva FROM clienti c JOIN clienti_versioni v ON v.cliente_id = c.id AND v.id = c.versione_corrente_id WHERE v.piva IS NOT NULL GROUP BY v.piva HAVING count(*) > 1`
    : await db.$queryRaw<{ piva: string }[]>`SELECT v.piva FROM fornitori f JOIN fornitori_versioni v ON v.fornitore_id = f.id AND v.id = f.versione_corrente_id WHERE v.piva IS NOT NULL GROUP BY v.piva HAVING count(*) > 1`;
  const doppie = new Set(righe.map((r) => r.piva));
  for (const p of doppie) {
    await apriAnomalia(db, {
      servizio: 'integra', codice: 'integra.piva_doppia', chiave: `${tipo}:${p}`,
      messaggio: TESTO.pivaDoppia(tipo, p), dettaglio: { piva: p },
    }, ora);
  }
  const aperte = await db.registro.findMany({
    where: { genere: 'anomalia', servizio: 'integra', codice: 'integra.piva_doppia', stato: 'aperta', chiave: { startsWith: `${tipo}:` } },
    select: { chiave: true },
  });
  for (const a of aperte) {
    if (!doppie.has((a.chiave ?? '').slice(tipo.length + 1))) await chiudiAnomalia(db, 'integra', 'integra.piva_doppia', a.chiave ?? '', ora);
  }
}

/** `integra.connessione` solo al terzo giro fallito di fila, si chiude al primo riuscito (§4.5). */
async function controllaConnessione(db: Db, ora: Date) {
  const ultime = await db.servizi_esecuzioni.findMany({
    where: { servizio: 'integra', tipo: 'lavoro', esito: { not: null }, misure: { path: ['ponte'], equals: false } },
    orderBy: [{ inizio: 'desc' }, { id: 'desc' }],
    take: 3,
    select: { esito: true },
  });
  if (ultime.length === 3) {
    await apriAnomalia(db, {
      servizio: 'integra', codice: 'integra.connessione', messaggio: TESTO.connessione, dettaglio: { errore: 'ponte non raggiungibile' },
    }, ora);
  }
}

/** Un giro: legge le due viste, scrive in una transazione per riga, registra l'esecuzione. */
export async function sincronizzaGiro(db: PrismaService, ponte: Pool, ora = new Date(), avviatoDa?: bigint, schema = SCHEMA): Promise<Conteggi> {
  const conteggi: Conteggi = { clienti: vuoto(), fornitori: vuoto() };
  const inizioMs = Date.now();
  const esecuzione = await db.servizi_esecuzioni.create({
    data: { servizio: 'integra', tipo: 'lavoro', inizio: ora, avviato_da: avviatoDa ?? null },
  });
  let esito: 'ok' | 'attenzione' | 'errore' = 'ok';
  let nota = '';
  let ponteKo = false;
  try {
    const dal = await daQuando(db);
    for (const vista of ['clienti', 'fornitori'] as const) {
      let righe: Riga[];
      try {
        righe = await leggi(ponte, vista, dal, schema);
      } catch (e) {
        if (!erroreVista(e)) {
          ponteKo = true;
          throw e;
        }
        esito = 'errore';
        await apriAnomalia(db, {
          servizio: 'integra', codice: 'integra.vista', chiave: VISTE[vista].vista,
          messaggio: TESTO.vista(VISTE[vista].vista), dettaglio: { vista: VISTE[vista].vista, errore: pulisci(e) },
        }, ora);
        continue;
      }
      await chiudiAnomalia(db, 'integra', 'integra.vista', VISTE[vista].vista, ora);
      conteggi[vista].letti = righe.length;
      for (const r of righe) {
        const chiave = `${vista}:${r.id_integra}`;
        try {
          if (vista === 'clienti') await applicaCliente(db, r, ora, conteggi.clienti);
          else await applicaFornitore(db, r, ora, conteggi.fornitori);
          await chiudiAnomalia(db, 'integra', 'integra.riga', chiave, ora);
        } catch (e) {
          conteggi[vista].scartati++; // una riga sbagliata non ferma le altre
          const errore = pulisci(e);
          await apriAnomalia(db, {
            servizio: 'integra', codice: 'integra.riga', chiave,
            messaggio: TESTO.riga(vista === 'clienti' ? 'cliente' : 'fornitore', codiceDi(r), errore),
            dettaglio: { vista, id_integra: r.id_integra, errore },
          }, ora);
          log.warn(`riga ${r.id_integra} di ${vista} non copiata: ${errore}`);
        }
      }
      await pivaDoppie(db, vista === 'clienti' ? 'cliente' : 'fornitore', ora);
    }
  } catch (e) {
    esito = 'errore';
    nota = pulisci(e);
    if (!ponteKo) log.error(`giro non concluso: ${nota}`); // errore nostro: il ponte non c'entra
  }
  const secondi = Math.round((Date.now() - inizioMs) / 100) / 10;
  if (!ponteKo && esito !== 'errore') await chiudiAnomalia(db, 'integra', 'integra.connessione', '', ora);
  if (secondi > SECONDI_LENTI) {
    if (esito !== 'errore') esito = 'attenzione';
    await apriAnomalia(db, {
      servizio: 'integra', codice: 'integra.lenta', livello: 'attenzione',
      messaggio: TESTO.lenta(secondi), dettaglio: { secondi },
    }, ora);
  } else if (!ponteKo) {
    await chiudiAnomalia(db, 'integra', 'integra.lenta', '', ora);
  }
  const c = conteggi;
  const misure = { clienti: c.clienti, fornitori: c.fornitori, secondi, ponte: !ponteKo };
  const testoGiro = `Clienti: ${c.clienti.letti} letti, ${c.clienti.versioni} versioni; fornitori: ${c.fornitori.letti} letti, ${c.fornitori.versioni} versioni`
    + (nota ? `; errore: ${nota}` : '') + (esito === 'attenzione' ? `; lento: ${secondi} s` : '');
  await db.servizi_esecuzioni.update({
    where: { id: esecuzione.id },
    data: { fine: new Date(), esito, testo: testoGiro.slice(0, 300), misure: misure as unknown as Prisma.InputJsonValue },
  });
  // dopo l'aggiornamento: il conteggio dei 3 giri falliti comprende quello appena chiuso
  if (ponteKo) {
    await controllaConnessione(db, ora);
    throw new Error(nota || 'ponte non raggiungibile');
  }
  return conteggi;
}

/** Pool del ponte in sola lettura: anche per errore il CRM non scrive su Integra. I tempi massimi
 *  fermano la connessione: un ponte appeso non tiene occupate le due connessioni. Nessun limite alle
 *  query del giro (C2): la sincronizzazione completa può durare più di 5 s. Il limite di 5 s vale solo
 *  per `cerca` e `importa` su richiesta, che passano `query_timeout` a ogni query. */
export function creaPonte(url: string): Pool {
  return new Pool({
    connectionString: url,
    max: 2,
    connectionTimeoutMillis: 3000, // la connessione che non arriva non resta appesa
    options: '-c default_transaction_read_only=on', // sola lettura
  });
}

/** Un pool solo, ricreato quando la configurazione cambia: le prove importano il file senza `PONTE_URL`. */
@Injectable()
export class IntegraService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool | null = null;
  private url: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private inCorso = false;
  private ultimoGiro = 0;

  constructor(private readonly db: PrismaService) {}

  /** Pool e schema dalla configurazione delle Impostazioni (D-65), o dal PONTE_URL (sviluppo/prove). */
  private async connessione(): Promise<{ pool: Pool; schema: string; secondi: number } | null> {
    const cfg = await integraConfig(this.db);
    let url: string | null = null;
    let schema = SCHEMA;
    if (cfg) {
      url = `postgresql://${encodeURIComponent(cfg.utente)}:${encodeURIComponent(cfg.password)}@${cfg.server}:5432/${encodeURIComponent(cfg.database)}`;
      schema = cfg.schema;
    } else if (process.env.PONTE_URL) {
      url = process.env.PONTE_URL;
    }
    if (!url) {
      await this.chiudiPool();
      return null;
    }
    if (url !== this.url) {
      await this.chiudiPool();
      this.pool = creaPonte(url);
      this.url = url;
    }
    return { pool: this.pool!, schema, secondi: cfg?.secondi ?? 60 };
  }

  private async chiudiPool() {
    if (this.pool) { await this.pool.end(); this.pool = null; this.url = null; }
  }

  /** Pool e schema del ponte per la ricerca e l'import su richiesta (D-111); null se non configurato. */
  async ponte(): Promise<{ pool: Pool; schema: string } | null> {
    const c = await this.connessione();
    return c ? { pool: c.pool, schema: c.schema } : null;
  }

  /** Prova la connessione: { ok, ms, clienti, fornitori } oppure { ok:false, ms, messaggio }. */
  async prova(): Promise<{ ok: boolean; ms: number; clienti?: number; fornitori?: number; messaggio?: string }> {
    const inizio = Date.now();
    const c = await this.connessione();
    if (!c) return { ok: false, ms: 0, messaggio: 'Sincronizzazione non configurata' };
    try {
      const [clienti, fornitori] = await Promise.all([
        c.pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${c.schema}.integra_v_clienti`),
        c.pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${c.schema}.integra_v_fornitori`),
      ]);
      return { ok: true, ms: Date.now() - inizio, clienti: clienti.rows[0].n, fornitori: fornitori.rows[0].n };
    } catch (e) {
      return { ok: false, ms: Date.now() - inizio, messaggio: pulisci(e) };
    }
  }

  /** Giro a mano (rotta): se il ponte non risponde, messaggio pulito per il chiamante. */
  async sincronizza(avviatoDa?: bigint): Promise<Conteggi> {
    if (this.inCorso) throw new ConflictException('Sincronizzazione già in corso');
    this.inCorso = true; // prima di ogni await: due chiamate insieme non passano entrambe
    try {
      const c = await this.connessione();
      if (!c) throw new BadGatewayException('Sincronizzazione non configurata');
      return await sincronizzaGiro(this.db, c.pool, new Date(), avviatoDa, c.schema);
    } catch (e) {
      if (e instanceof BadGatewayException) throw e;
      throw new BadGatewayException(pulisci(e));
    } finally {
      this.inCorso = false;
    }
  }

  /** Tick di 60 s: esegue il giro solo quando sono passati `secondi` (in memoria; al riavvio un giro subito). */
  avvia(): void {
    if (process.env.NODE_ENV === 'test' || this.timer) return;
    void this.giro();
    this.timer = setInterval(() => void this.giro(), OGNI_MS);
  }

  private async giro() {
    const cfg = await integraConfig(this.db);
    const secondi = cfg?.secondi ?? 60;
    if (Date.now() - this.ultimoGiro < secondi * 1000) return;
    this.ultimoGiro = Date.now();
    try {
      await this.sincronizza();
    } catch (e) {
      if (!(e instanceof ConflictException) && !(e instanceof BadGatewayException)) log.warn(`giro non riuscito: ${pulisci(e)}`);
    }
  }

  onModuleInit(): void {
    this.avvia();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.chiudiPool();
  }
}

@Controller('integra')
export class IntegraController {
  constructor(private readonly integra: IntegraService) {}

  @Post('prova')
  @HttpCode(200)
  @Richiede('sistema.impostazioni')
  prova() {
    return this.integra.prova();
  }

  @Post('sincronizza')
  @HttpCode(200)
  @Richiede('sistema.impostazioni')
  sincronizza(@Req() req: Request) {
    return this.integra.sincronizza(contesto(req).utente_id ?? undefined);
  }
}
