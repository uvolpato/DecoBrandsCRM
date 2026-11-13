import {
  Controller, ForbiddenException, Get, HttpCode, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit,
  Param, ParseIntPipe, Post, Query, Req,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import type { Request } from 'express';
import { contesto, Richiede } from './accesso';
import { apriImap, CasellaService } from './casella';
import { creaPonte, pulisci } from './integra';
import { casellaConfig, integraConfig, letturaConfig, postaConfig, valoriSezione } from './impostazioni';
import { provaConnettore } from './lettore';
import { PrismaService } from './prisma.service';
import { creaTrasporto } from './posta';
import { apriAnomalia, chiudiAnomalia, logEvent } from './registro';

// Stato del sistema (F5-A5, §7.14, §4.2.15, D-31, D-74): i quattro servizi che lavorano da soli.
// Ogni 5 minuti un controllo di salute scrive una riga `controllo` in servizi_esecuzioni, anche
// quando il servizio non è configurato (così il riquadro non risulta fermo). Qui si aprono solo le
// anomalie che un controllo può davvero verificare; stato e nota dei riquadri si calcolano dal
// database (V12), il browser riceve i testi già pronti.

const CINQUE_MINUTI = 5 * 60_000;
const MINUTO = 60_000;
const GIORNO = 24 * 60 * MINUTO;
const ATTESA_SONDA = 20_000; // oltre, il controllo è fallito (il controllo manuale risponde entro 30 s)
const ATTESA_MANUALE = 30_000;
const ESECUZIONI_GIORNI = 90; // §4.2.15: conservazione dei giri

export const SERVIZI = [
  { id: 'casella', nome: 'Casella dei documenti' },
  { id: 'lettura', nome: 'Server di lettura' },
  { id: 'integra', nome: 'Sincronizzazione da Integra' },
  { id: 'posta', nome: 'Posta in uscita' },
] as const;
export type IdServizio = (typeof SERVIZI)[number]['id'];
export type Stato = 'ok' | 'attenzione' | 'errore';

/** Esito di una prova: `configurata: false` quando il servizio non ha i parametri (riquadro verde). */
export interface EsitoSonda {
  ok: boolean;
  testo: string;
  configurata?: boolean;
  cartella?: string; // casella: la cartella che manca
  vista?: string; // integra: la vista che manca
  misure?: Record<string, unknown>;
}
/** Una prova iniettabile: nelle prove non tocca la rete (§7.14). */
export type Sonda = (db: PrismaService) => Promise<EsitoSonda>;
export interface Sonde {
  casella?: Sonda;
  lettura?: Sonda;
  integra?: Sonda;
  posta?: Sonda;
}

// Testi fissi delle anomalie (§7.14.3): nessun messaggio tecnico grezzo; quello va in `misure`.
const TESTO = {
  casellaConnessione: 'La casella dei documenti non risponde da 3 controlli di fila: controllare server, utente e password in Impostazioni → Casella.',
  casellaCartella: (nome: string) => `La cartella ${nome} non esiste nella casella: crearla o correggere il nome in Impostazioni → Casella.`,
  lettura: 'Il server di lettura non risponde a 2 controlli di fila: verificare il servizio sulla macchina con la scheda video; i documenti restano in coda e si leggono alla ripresa.',
  posta: 'La posta in uscita non risponde: controllare server e password in Impostazioni → Posta.',
  integraConnessione: 'Integra non risponde da 3 controlli di fila: controllare server, utente e password in Impostazioni → Sincronizzazione e avvisare chi gestisce Integra.',
  integraVista: (vista: string) => `La vista ${vista} manca o ha colonne diverse: chiedere a chi gestisce Integra di ripristinarla.`,
};

/** Cosa fare, per il dettaglio dei problemi (§7.14.3): frasi fisse, una per codice. */
const COSA_FARE: Record<string, string> = {
  'casella.connessione': 'Controllare server, utente e password in Impostazioni → Casella; *Prova la connessione*.',
  'casella.cartella': 'Creare la cartella nella casella o correggere il nome in Impostazioni → Casella.',
  'casella.allegato': 'Aprire l’email e caricare il documento a mano da Documenti.',
  'casella.vuota': 'Verificare se il documento era nel corpo dell’email.',
  'lettura.non_raggiungibile': 'Verificare il servizio sulla macchina con la scheda video; i documenti restano in coda.',
  'lettura.lenta': 'Controllare il carico della scheda video.',
  'lettura.fallita': 'Aprirlo in Documenti e inserire i dati a mano, o scartarlo.',
  'integra.connessione': 'Verificare server, utente e password in Impostazioni → Sincronizzazione; avvisare chi gestisce Integra.',
  'integra.vista': 'Chiedere a chi gestisce Integra di ripristinare la vista (§4.5).',
  'integra.piva_mancante': 'Correggere la P.IVA in Integra: la riga entra al giro successivo.',
  'integra.piva_doppia': 'Unire o correggere il doppione in Integra.',
  'integra.lenta': 'Segnalare a chi gestisce Integra il carico del database.',
  'integra.riga': 'Correggere la riga in Integra: entra al giro successivo.',
  'posta.connessione': 'Controllare server, utente e password in Impostazioni → Posta.',
  'posta.respinta': 'Correggere l’email dell’utente o del destinatario.',
};

const log = new Logger('Sistema');

const secondiDa = (inizio: number) => Math.round((Date.now() - inizio) / 100) / 10;

/** Un controllo che non risponde entro il tempo massimo è un controllo fallito (non blocca il giro). */
async function entro<T>(p: Promise<T>, ms = ATTESA_SONDA): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, ko) => { t = setTimeout(() => ko(new Error(`nessuna risposta entro ${ms / 1000} secondi`)), ms); }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

/** Le configurazioni dei servizi dalle Impostazioni (§7.15): nessun segreto esce da qui. */
async function configurazioni(db: PrismaService) {
  const [casella, lettura, integra, posta] = await Promise.all([casellaConfig(db), letturaConfig(db), integraConfig(db), postaConfig(db)]);
  // Il riquadro della pagina mostra «Non configurata» dalle sole Impostazioni: il PONTE_URL di sviluppo
  // resta solo per la sincronizzazione vera (IntegraService.connessione, §4.5), non qui (D-74 §19).
  const ponte = integra
    ? { url: `postgresql://${encodeURIComponent(integra.utente)}:${encodeURIComponent(integra.password)}@${integra.server}:5432/${encodeURIComponent(integra.database)}`, schema: integra.schema, secondi: integra.secondi }
    : null;
  return { casella, lettura, integra: ponte, posta };
}

const erroreVista = (e: unknown) => ['42P01', '42703'].includes(String((e as { code?: string }).code));

/** Casella: accesso IMAP e presenza delle due cartelle (§7.14.1). */
export const sondaCasella: Sonda = async (db) => {
  const c = (await configurazioni(db)).casella;
  if (!c) return { ok: true, configurata: false, testo: 'non configurata' };
  const inizio = Date.now();
  try {
    const casella = await entro(apriImap(c));
    await casella.chiudi().catch(() => undefined);
    return { ok: true, testo: `Accesso riuscito a ${c.server}, cartelle ${c.cartella} e ${c.cartella_lette}`, misure: { secondi: secondiDa(inizio) } };
  } catch (e) {
    const cartella = (e as { cartella?: unknown }).cartella;
    if (typeof cartella === 'string' && cartella) {
      return { ok: false, cartella, testo: `Manca la cartella ${cartella}`, misure: { secondi: secondiDa(inizio), errore: pulisci(e) } };
    }
    return { ok: false, testo: `La casella ${c.server} non risponde`, misure: { secondi: secondiDa(inizio), errore: pulisci(e) } };
  }
};

/** Lettura: chiamata di prova al connettore (§7.14.1); il locale non ha ancora una prova. */
export const sondaLettura: Sonda = async (db) => {
  const c = (await configurazioni(db)).lettura;
  if (!c) return { ok: true, configurata: false, testo: 'non configurata' };
  const inizio = Date.now();
  if (c.connettore !== 'llamacloud_eu') {
    return { ok: true, testo: 'Connettore locale: prova non disponibile', misure: { secondi: secondiDa(inizio) } };
  }
  const r = await entro(provaConnettore(c));
  return { ok: r.ok, testo: r.testo, misure: { secondi: secondiDa(inizio), ...(r.ok ? {} : { errore: pulisci(r.testo) }) } };
};

/** Integra: connessione al ponte e lettura di una riga per vista (§7.14.1, §4.5). */
export const sondaIntegra: Sonda = async (db) => {
  const c = (await configurazioni(db)).integra;
  if (!c) return { ok: true, configurata: false, testo: 'non configurata' };
  const inizio = Date.now();
  const ponte = creaPonte(c.url);
  try {
    for (const vista of ['integra_v_clienti', 'integra_v_fornitori']) {
      try {
        await ponte.query(`SELECT 1 FROM ${c.schema}.${vista} LIMIT 1`);
      } catch (e) {
        if (!erroreVista(e)) throw e;
        return { ok: false, vista, testo: `Manca la vista ${vista}`, misure: { secondi: secondiDa(inizio), errore: pulisci(e) } };
      }
    }
    return { ok: true, testo: `Database ponte raggiungibile, viste ${c.schema}.integra_v_clienti e ${c.schema}.integra_v_fornitori lette`, misure: { secondi: secondiDa(inizio) } };
  } catch (e) {
    return { ok: false, testo: 'Il database ponte non risponde', misure: { secondi: secondiDa(inizio), errore: pulisci(e) } };
  } finally {
    await ponte.end().catch(() => undefined);
  }
};

/** Posta: accesso SMTP senza inviare (§7.14.1). */
export const sondaPosta: Sonda = async (db) => {
  const c = (await configurazioni(db)).posta;
  if (!c) return { ok: true, configurata: false, testo: 'non configurata' };
  const inizio = Date.now();
  const trasporto = creaTrasporto(c);
  try {
    await entro(trasporto.verify!());
    return { ok: true, testo: `Server di posta ${c.server} raggiungibile`, misure: { secondi: secondiDa(inizio) } };
  } catch (e) {
    return { ok: false, testo: 'Il server di posta non risponde', misure: { secondi: secondiDa(inizio), errore: pulisci(e) } };
  } finally {
    trasporto.close?.();
  }
};

const SONDE: Record<IdServizio, Sonda> = { casella: sondaCasella, lettura: sondaLettura, integra: sondaIntegra, posta: sondaPosta };

/** Chiude tutte le anomalie aperte di un codice (la chiave non si conosce sempre: es. la cartella). */
const chiudiTutte = (db: PrismaService, servizio: string, codice: string, ora: Date) =>
  db.registro.updateMany({
    where: { genere: 'anomalia', servizio, codice, stato: 'aperta' },
    data: { stato: 'chiusa', chiusa_il: ora, ultimo: ora },
  });

/** Gli ultimi N controlli di connessione sono tutti falliti? (§7.14.3: 3 di fila, 2 per la lettura) */
async function sbagliatiDiFila(db: PrismaService, servizio: string, n: number) {
  const ultime = await db.servizi_esecuzioni.findMany({
    where: { servizio, tipo: 'controllo', esito: { not: null }, misure: { path: ['connessione'], equals: true } },
    orderBy: [{ id: 'desc' }], take: n, select: { esito: true },
  });
  return ultime.length === n && ultime.every((r) => r.esito === 'errore');
}

const CONNESSIONE: Record<IdServizio, string[]> = {
  casella: ['casella.connessione', 'casella.cartella'],
  lettura: ['lettura.non_raggiungibile'],
  integra: ['integra.connessione', 'integra.vista'],
  posta: ['posta.connessione'],
};

/** Apre e chiude le anomalie che un controllo può verificare (§7.14.3, §7.14.4). */
async function anomalie(db: PrismaService, servizio: IdServizio, e: EsitoSonda, ora: Date) {
  if (e.configurata === false) {
    // servizio spento dalle Impostazioni: i suoi problemi di connessione non esistono più
    for (const codice of CONNESSIONE[servizio]) await chiudiTutte(db, servizio, codice, ora);
    return;
  }
  if (e.ok) {
    for (const codice of CONNESSIONE[servizio]) await chiudiTutte(db, servizio, codice, ora);
    return;
  }
  if (servizio === 'casella' && e.cartella) {
    await apriAnomalia(db, {
      servizio, codice: 'casella.cartella', chiave: e.cartella,
      messaggio: TESTO.casellaCartella(e.cartella), dettaglio: { cartella: e.cartella, errore: String(e.misure?.errore ?? '') },
    }, ora);
    return;
  }
  if (servizio === 'integra' && e.vista) {
    await apriAnomalia(db, {
      servizio, codice: 'integra.vista', chiave: e.vista,
      messaggio: TESTO.integraVista(e.vista), dettaglio: { vista: e.vista, errore: String(e.misure?.errore ?? '') },
    }, ora);
    return;
  }
  const soglia = servizio === 'lettura' ? 2 : servizio === 'posta' ? 1 : 3;
  if (!(await sbagliatiDiFila(db, servizio, soglia))) return;
  const aperta = servizio === 'casella' ? { codice: 'casella.connessione', messaggio: TESTO.casellaConnessione }
    : servizio === 'lettura' ? { codice: 'lettura.non_raggiungibile', messaggio: TESTO.lettura }
      : servizio === 'posta' ? { codice: 'posta.connessione', messaggio: TESTO.posta }
        : { codice: 'integra.connessione', messaggio: TESTO.integraConnessione };
  await apriAnomalia(db, {
    servizio, codice: aperta.codice, messaggio: aperta.messaggio,
    dettaglio: { errore: String(e.misure?.errore ?? '') },
  }, ora);
}

/** Un controllo: una riga `controllo` in servizi_esecuzioni e, se serve, l'anomalia (§7.14.1-4). */
export async function controllaServizio(db: PrismaService, servizio: IdServizio, sonda: Sonda, ora = new Date(), avviatoDa?: bigint): Promise<EsitoSonda> {
  const esecuzione = await db.servizi_esecuzioni.create({ data: { servizio, tipo: 'controllo', inizio: ora, avviato_da: avviatoDa ?? null } });
  let esito: EsitoSonda;
  try {
    esito = await sonda(db);
  } catch (e) {
    esito = { ok: false, testo: 'Il controllo non ha risposto', misure: { errore: pulisci(e) } };
  }
  // `connessione` distingue un accesso fallito da una cartella o una vista mancante (§7.14.3)
  const connessione = esito.ok || (!esito.cartella && !esito.vista);
  const misure = { configurata: esito.configurata !== false, connessione, ...(esito.misure ?? {}) };
  await db.servizi_esecuzioni.update({
    where: { id: esecuzione.id },
    data: { fine: new Date(), esito: esito.ok ? 'ok' : 'errore', testo: esito.testo.slice(0, 300), misure: misure as Prisma.InputJsonValue },
  });
  await anomalie(db, servizio, esito, ora);
  return esito;
}

/** I quattro controlli (in parallelo: il più lento non allunga gli altri). */
export async function eseguiControlli(db: PrismaService, sonde: Sonde = {}, ora = new Date(), avviatoDa?: bigint) {
  await Promise.allSettled(SERVIZI.map((s) => controllaServizio(db, s.id, sonde[s.id] ?? SONDE[s.id], ora, avviatoDa)));
}

/** Come si chiama il giro: `tipo = lavoro`, esito, misure. */
async function ultimaEsecuzione(db: PrismaService, servizio: string, tipo?: string) {
  return db.servizi_esecuzioni.findFirst({
    where: { servizio, ...(tipo ? { tipo } : {}) },
    orderBy: [{ inizio: 'desc' }, { id: 'desc' }],
    select: { inizio: true, fine: true, tipo: true, esito: true, testo: true, misure: true },
  });
}

/** Il riepilogo del giorno quando non c'è una causa da mostrare (§7.14.2), giorno di Roma. */
async function sommario(db: PrismaService, servizio: IdServizio): Promise<string> {
  if (servizio === 'casella') {
    const [r] = await db.$queryRaw<{ n: number }[]>`
      SELECT coalesce(sum((misure->>'allegati')::int), 0)::int AS n FROM servizi_esecuzioni
      WHERE servizio = 'casella' AND tipo = 'lavoro'
        AND (inizio AT TIME ZONE 'Europe/Rome')::date = (now() AT TIME ZONE 'Europe/Rome')::date`;
    return r.n === 1 ? '1 allegato letto oggi' : r.n ? `${r.n} allegati letti oggi` : 'nessun allegato oggi';
  }
  if (servizio === 'lettura') {
    const [r] = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM servizi_esecuzioni
      WHERE servizio = 'lettura' AND tipo = 'lavoro' AND esito = 'ok'
        AND (inizio AT TIME ZONE 'Europe/Rome')::date = (now() AT TIME ZONE 'Europe/Rome')::date`;
    return r.n === 1 ? '1 documento letto oggi' : r.n ? `${r.n} documenti letti oggi` : 'nessun documento letto oggi';
  }
  if (servizio === 'integra') {
    const ultima = await ultimaEsecuzione(db, 'integra', 'lavoro');
    const m = (ultima?.misure ?? {}) as { clienti?: { letti?: number }; fornitori?: { letti?: number } };
    const n = (m.clienti?.letti ?? 0) + (m.fornitori?.letti ?? 0);
    return n ? `ultimo giro: ${n} righe lette` : 'nessuna riga da copiare nell’ultimo giro';
  }
  const righe = await db.$queryRaw<{ ultimo_invio: { quando?: string; errore?: string | null } | null }[]>`
    SELECT ultimo_invio FROM utenti WHERE ultimo_invio IS NOT NULL`;
  const invii = righe.map((x) => x.ultimo_invio).filter((x): x is { quando?: string; errore?: string | null } => !!x);
  const ultimo = invii.sort((a, b) => String(b.quando ?? '').localeCompare(String(a.quando ?? '')))[0];
  if (!ultimo) return 'nessun invio recente';
  return ultimo.errore ? 'l’ultimo invio non è partito' : 'ultimo invio riuscito';
}

/** Un riquadro della pagina (§7.14): stato e nota calcolati dal database. */
export interface Riquadro {
  id: IdServizio; nome: string; stato: Stato; nota: string;
  indirizzo: string | null; ultima: string | null; ritmo: string; problemi: number;
}

/** Stato del riquadro e nota (§7.14.2), calcolati dal database: il browser non calcola (V12). */
export async function stato(db: PrismaService, ora = new Date()): Promise<Riquadro[]> {
  const conf = await configurazioni(db);
  const servizi: Riquadro[] = [];
  for (const s of SERVIZI) {
    const configurata = s.id === 'casella' ? !!conf.casella
      : s.id === 'lettura' ? !!conf.lettura
        : s.id === 'integra' ? !!conf.integra : !!conf.posta;
    const [ultima, ultimi3, aperte, daVedere] = await Promise.all([
      ultimaEsecuzione(db, s.id),
      db.servizi_esecuzioni.findMany({ where: { servizio: s.id, esito: { not: null } }, orderBy: [{ id: 'desc' }], take: 3, select: { esito: true } }),
      db.registro.findMany({
        where: { genere: 'anomalia', servizio: s.id, stato: 'aperta' },
        orderBy: [{ ultimo: 'desc' }], select: { livello: true, messaggio: true },
      }),
      db.registro.count({ where: { genere: 'anomalia', servizio: s.id, stato: 'aperta', visto_il: null } }),
    ]);
    // cicli: casella 3 × minuti, integra 3 minuti, lettura e posta 15 minuti (§7.14.2)
    const cicli = s.id === 'casella' ? 3 * (conf.casella?.minuti ?? 2) * MINUTO : s.id === 'integra' ? 3 * MINUTO : 15 * MINUTO;
    const fermoDa = ultima ? ora.getTime() - ultima.inizio.getTime() : null;
    const errore = aperte.find((a) => a.livello === 'errore');
    const attenzione = aperte.find((a) => a.livello === 'attenzione');

    let valore: Stato = 'ok';
    let nota: string;
    if (!configurata) {
      nota = 'Non configurata: si imposta nelle Impostazioni';
    } else if (errore) {
      valore = 'errore';
      nota = errore.messaggio ?? 'Problema aperto';
    } else if (fermoDa != null && fermoDa > cicli) {
      valore = 'errore';
      nota = `Fermo da ${Math.max(1, Math.round(fermoDa / MINUTO))} minuti`;
    } else if (ultimi3.length === 3 && ultimi3.every((r) => r.esito === 'errore')) {
      valore = 'errore';
      nota = 'Gli ultimi 3 giri non sono riusciti';
    } else if (attenzione) {
      valore = 'attenzione';
      nota = attenzione.messaggio ?? 'Da tenere d’occhio';
    } else if (s.id === 'integra' && ultima?.esito === 'attenzione') {
      valore = 'attenzione'; // sincronizzazione più lunga del suo intervallo (§7.14.2)
      nota = ultima.testo ?? 'Sincronizzazione lenta';
    } else {
      nota = await sommario(db, s.id);
    }

    servizi.push({
      id: s.id, nome: s.nome, stato: valore, nota,
      indirizzo: s.id === 'casella' ? (conf.casella ? `${conf.casella.server}:${conf.casella.porta}` : null)
        : s.id === 'lettura' ? (conf.lettura ? (conf.lettura.connettore === 'llamacloud_eu' ? 'LlamaCloud · Unione Europea' : conf.lettura.indirizzo || 'GLM-OCR locale') : null)
          : s.id === 'integra' ? (conf.integra ? `${conf.integra.schema} sul database ponte` : null)
            : (conf.posta ? `${conf.posta.server}:${conf.posta.porta}` : null),
      ultima: ultima?.inizio.toISOString() ?? null,
      ritmo: s.id === 'casella' ? `ogni ${conf.casella?.minuti ?? 2} minuti`
        : s.id === 'lettura' ? 'a ogni documento'
          : s.id === 'integra' ? `ogni ${conf.integra?.secondi ?? 60} secondi`
            : 'a ogni invio',
      problemi: daVedere,
    });
  }
  return servizi;
}

/** I problemi da vedere e se ce n'è uno in errore (per il contatore della barra, §7.14). */
export async function contatore(db: PrismaService) {
  const [r] = await db.$queryRaw<{ problemi: number; errore: number }[]>`
    SELECT count(*) FILTER (WHERE visto_il IS NULL)::int AS problemi,
           count(*) FILTER (WHERE visto_il IS NULL AND livello = 'errore')::int AS errore
    FROM registro WHERE genere = 'anomalia' AND servizio IS NOT NULL AND stato = 'aperta'`;
  return { problemi: r.problemi, errore: r.errore > 0 };
}

/** Il controllo completo di *Controlla adesso*: giro della casella e quattro controlli, entro il tempo (§7.14.5). */
export async function controllaTutto(db: PrismaService, casella: CasellaService, opzioni: { sonde?: Sonde; attesaMs?: number; avviatoDa?: bigint } = {}) {
  const lavoro = (async () => {
    await Promise.allSettled([
      casella.esegui(),
      ...SERVIZI.map((s) => controllaServizio(db, s.id, opzioni.sonde?.[s.id] ?? SONDE[s.id], new Date(), opzioni.avviatoDa)),
    ]);
    return 'fatto' as const;
  })();
  let t: NodeJS.Timeout | undefined;
  const scaduto = new Promise<'tempo'>((ok) => { t = setTimeout(() => ok('tempo'), opzioni.attesaMs ?? ATTESA_MANUALE); });
  try {
    const r = await Promise.race([lavoro, scaduto]);
    return { fatto: r === 'fatto', attesa_ms: opzioni.attesaMs ?? ATTESA_MANUALE };
  } finally {
    if (t) clearTimeout(t);
  }
}

/* ---------- Pulizie pianificate (§4.2.15, §7.16, D-74) ---------- */

/** Elimina i documenti scartati più vecchi di `scartati_giorni`: righe (campi in cascata) e file dopo il commit. */
export async function pulisciScartati(db: PrismaService, ora = new Date()) {
  const v = await valoriSezione(db, 'conservazione');
  const giorni = Number(v.scartati_giorni);
  if (!Number.isInteger(giorni) || giorni < 1) return 0;
  const limite = new Date(ora.getTime() - giorni * GIORNO);
  const tolti = await db.$transaction(async (tx) => {
    // Una sola istruzione: lo stato si ricontrolla dentro il WHERE al momento di cancellare, così
    // un documento recuperato o rianimato nel frattempo non sparisce con il suo file (A3-04, A4-09).
    const righe = await tx.$queryRaw<{ id: bigint; file_percorso: string }[]>`
      DELETE FROM documenti_in_arrivo
      WHERE stato = 'scartato' AND scartato_il < ${limite}
      RETURNING id, file_percorso`;
    // un documento eliminato non deve lasciare aperta l'anomalia della lettura (§7.14.3)
    for (const r of righe) await chiudiAnomalia(tx, 'lettura', 'lettura.fallita', String(r.id));
    return righe;
  });
  const radice = resolve(process.env.DOCUMENTI_DIR ?? '');
  for (const r of tolti) {
    const percorso = resolve(radice, r.file_percorso);
    if (!percorso.startsWith(radice + sep)) continue;
    await rm(percorso, { force: true }).catch((e: unknown) => log.warn(`file di uno scartato non rimosso: ${pulisci(e)}`));
  }
  return tolti.length;
}

/** Conservazione dei giri dei servizi: 90 giorni (§4.2.15). */
export async function pulisciEsecuzioni(db: PrismaService, ora = new Date()) {
  const { count } = await db.servizi_esecuzioni.deleteMany({ where: { inizio: { lt: new Date(ora.getTime() - ESECUZIONI_GIORNI * GIORNO) } } });
  return count;
}

/* ---------- Servizio pianificato ---------- */

/** Controllo di salute ogni 5 minuti; pulizie notturne. Niente timer nelle prove (§7.14). */
@Injectable()
export class SistemaService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private ultimo = 0; // in memoria: al riavvio un controllo subito
  private inCorso = false;

  constructor(private readonly db: PrismaService, private readonly casella: CasellaService) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test' || this.timer) return;
    void this.giro();
    this.timer = setInterval(() => void this.giro(), MINUTO);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** I quattro controlli, ogni cinque minuti. */
  async giro(): Promise<void> {
    if (this.inCorso || Date.now() - this.ultimo < CINQUE_MINUTI) return;
    this.ultimo = Date.now();
    this.inCorso = true;
    try {
      await eseguiControlli(this.db);
    } catch (e) {
      log.warn(`controlli non eseguiti: ${pulisci(e)}`);
    } finally {
      this.inCorso = false;
    }
  }

  /** Scartati oltre `scartati_giorni` (F5-A7); nessun evento: è manutenzione (D-74). */
  @Cron('0 3 * * *')
  async scartati() {
    try {
      const n = await pulisciScartati(this.db);
      if (n) log.log(`eliminati ${n} documenti scartati oltre la conservazione`);
    } catch (e) {
      log.error('pulizia degli scartati non riuscita', e instanceof Error ? e.stack : String(e));
    }
  }

  @Cron('10 3 * * *')
  async esecuzioni() {
    try {
      await pulisciEsecuzioni(this.db);
    } catch (e) {
      log.error('pulizia delle esecuzioni non riuscita', e instanceof Error ? e.stack : String(e));
    }
  }
}

/* ---------- Rotte (§7.14.5) ---------- */

const VISTE = ['da_vedere', 'tutti'] as const;

class FiltriSistema {
  @IsOptional() @IsIn(VISTE) vista?: (typeof VISTE)[number];
  @IsOptional() @IsIn(SERVIZI.map((s) => s.id)) servizio?: IdServizio;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limite?: number;
}

/** Un'ora come hh:mm all'ora italiana (per "12 controlli riusciti dalle 09:00"). */
const oraBreve = (d: Date) =>
  d.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });

interface Esecuzione {
  quando: string;
  servizio: string;
  esito: string | null;
  testo: string | null;
  misure: unknown;
  raggruppate?: number;
}

/** I `controllo` riusciti senza novità si raggruppano: "12 controlli riusciti dalle 09:00" (§7.14). */
function raggruppa(righe: { inizio: Date; servizio: string; esito: string | null; testo: string | null; tipo: string; misure: unknown }[]): Esecuzione[] {
  const fuori: Esecuzione[] = [];
  for (const r of righe) {
    const ultimo = fuori[fuori.length - 1];
    if (r.tipo !== 'controllo' || r.esito !== 'ok') {
      fuori.push({ quando: r.inizio.toISOString(), servizio: r.servizio, esito: r.esito, testo: r.testo, misure: r.misure });
      continue;
    }
    const n = (ultimo?.raggruppate ?? 0) + 1;
    const testo = `${n} ${n === 1 ? 'controllo riuscito' : 'controlli riusciti'} dalle ${oraBreve(r.inizio)}`;
    if (ultimo?.raggruppate && ultimo.servizio === r.servizio) {
      ultimo.quando = r.inizio.toISOString(); // il più vecchio del gruppo: "dalle …"
      ultimo.raggruppate = n;
      ultimo.testo = testo;
    } else {
      fuori.push({ quando: r.inizio.toISOString(), servizio: r.servizio, esito: r.esito, testo, misure: r.misure, raggruppate: 1 });
    }
  }
  return fuori;
}

@Controller('sistema')
export class SistemaController {
  constructor(private readonly db: PrismaService, private readonly casella: CasellaService) {}

  /** Riquadri, problemi ed esecuzioni (§7.14.5): tutto calcolato dal database (V12). */
  @Get()
  @Richiede('sistema.stato')
  async riepilogo(@Query() q: FiltriSistema) {
    const vista = q.vista ?? 'da_vedere';
    const esecuzioni = q.limite ?? 50;
    const dalServizio = q.servizio ? { servizio: q.servizio } : {};
    const [servizi, problemi, giri, cDaVedere, cTutti] = await Promise.all([
      stato(this.db),
      this.db.registro.findMany({
        where: {
          genere: 'anomalia', servizio: q.servizio ?? { not: null },
          ...(vista === 'da_vedere' ? { stato: 'aperta', visto_il: null } : {}),
        },
        orderBy: [{ stato: 'asc' }, { ultimo: 'desc' }, { id: 'desc' }],
        take: 200,
        select: { id: true, ts: true, ultimo: true, livello: true, servizio: true, codice: true, messaggio: true, chiave: true, volte: true, stato: true, visto_il: true, chiusa_il: true },
      }),
      this.db.servizi_esecuzioni.findMany({
        where: { ...dalServizio },
        orderBy: [{ inizio: 'desc' }, { id: 'desc' }], take: esecuzioni,
        select: { inizio: true, servizio: true, tipo: true, esito: true, testo: true, misure: true },
      }),
      // i conteggi dei segmenti non seguono il segmento scelto (D-23)
      this.db.registro.count({ where: { genere: 'anomalia', servizio: { not: null }, stato: 'aperta', visto_il: null } }),
      this.db.registro.count({ where: { genere: 'anomalia', servizio: { not: null } } }),
    ]);
    return {
      servizi,
      conteggi: { da_vedere: cDaVedere, tutti: cTutti },
      problemi: problemi.map((p) => ({
        id: String(p.id),
        quando: (p.ultimo ?? p.ts).toISOString(),
        livello: p.livello,
        servizio: p.servizio,
        codice: p.codice,
        testo: p.messaggio ?? p.codice,
        cosa_fare: COSA_FARE[p.codice] ?? null,
        chiave: p.chiave || null,
        volte: p.volte,
        visto: p.visto_il != null,
        stato: p.stato,
        risolta_il: p.stato === 'chiusa' && p.chiusa_il ? p.chiusa_il.toISOString() : null,
      })),
      esecuzioni: raggruppa(giri),
    };
  }

  /** Il numero dei problemi da vedere per la barra (§7.14, D-23): solo un numero letto dal server. */
  @Get('contatore')
  @Richiede('sistema.stato')
  contatore() {
    return contatore(this.db);
  }

  /** *Segna come visto* su un problema (§7.14.4): non lo chiude, scrive un evento. */
  @Post('problemi/:id/visto')
  @HttpCode(204)
  @Richiede('sistema.stato')
  async visto(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const riga = await this.db.registro.findUnique({ where: { id: BigInt(id) }, select: { genere: true, servizio: true } });
    if (!riga || riga.genere !== 'anomalia' || !riga.servizio) throw new NotFoundException('Problema non trovato');
    await this.db.$transaction(async (tx) => {
      const { count } = await tx.registro.updateMany({
        where: { id: BigInt(id), visto_il: null },
        data: { visto_il: new Date(), visto_da: contesto(req).utente_id ?? null },
      });
      if (!count) return; // già visto: nessun evento (§15.2.8)
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'sistema', entita_id: BigInt(id), esito: 'successo',
        dettaglio: { etichetta: `Problema ${id}`, problemi: [String(id)], prima: { visto: false }, dopo: { visto: true } },
      }, contesto(req));
    });
  }

  /** *Segna tutti come visti*: tutti i problemi aperti e non visti (§7.14.4). */
  @Post('problemi/visti')
  @HttpCode(204)
  @Richiede('sistema.stato')
  async visti(@Req() req: Request) {
    const ctx = contesto(req);
    await this.db.$transaction(async (tx) => {
      const aperti = await tx.registro.findMany({
        where: { genere: 'anomalia', servizio: { not: null }, stato: 'aperta', visto_il: null }, select: { id: true },
      });
      if (!aperti.length) return;
      const ids = aperti.map((a) => a.id);
      await tx.registro.updateMany({ where: { id: { in: ids } }, data: { visto_il: new Date(), visto_da: ctx.utente_id ?? null } });
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'sistema', esito: 'successo',
        dettaglio: { etichetta: `${ids.length} problemi`, problemi: ids.map(String), prima: { visto: false }, dopo: { visto: true } },
      }, ctx);
    });
  }

  /** *Controlla adesso*: giro della casella e quattro controlli, risponde entro 30 secondi (§7.14.5). */
  @Post('controlla')
  @HttpCode(200)
  @Richiede('sistema.stato')
  controlla(@Req() req: Request) {
    return controllaTutto(this.db, this.casella, { avviatoDa: contesto(req).utente_id ?? undefined });
  }
}
