import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';
import { cifra, decifra } from './segreto';

// Impostazioni del portale (§4.2.14, §7.15, D-65): metadati dei campi, valori iniziali, validazione
// e lettura per i servizi. Le password si cifrano e non escono mai dal server: le API restituiscono
// solo `impostata`. Non importa accesso.ts (niente cicli): il controller sta in impostazioni-api.ts.

type Db = Prisma.TransactionClient | PrismaClient;

export interface Campo {
  nome: string;
  etichetta: string;
  tipo: 'testo' | 'numero' | 'email' | 'password' | 'select';
  aiuto?: string;
  largo?: boolean;
  min?: number;
  max?: number;
  step?: number;
  decimale?: boolean; // numero con decimali (soglie); gli altri sono interi
  opzioni?: { value: string; label: string }[]; // select
  gruppo?: string; // campo mostrato solo quando il modello scelto è questo
  obbligatorio?: boolean; // testo che non può restare vuoto
  opzionale?: boolean; // numero che si può lasciare vuoto (porta)
  segreto?: boolean;
}

export interface Sezione {
  chiave: string;
  titolo: string;
  sotto: string;
  campi: Campo[];
}

// Testi, ordine dei campi e aiuti dal prototipo (viste-gestione.js, §7.15). La sezione `accesso`
// resta ammessa dal vincolo del database ma non si usa più (D-39).
const SEZIONI: Sezione[] = [
  {
    chiave: 'azienda', titolo: 'Dati dell’azienda', sotto: 'intestazione dei prospetti esportati',
    campi: [
      { nome: 'ragione_sociale', etichetta: 'Ragione sociale', tipo: 'testo', largo: true, obbligatorio: true },
      { nome: 'piva', etichetta: 'Partita IVA', tipo: 'testo', obbligatorio: true },
      { nome: 'email', etichetta: 'Email', tipo: 'email', obbligatorio: true },
      { nome: 'indirizzo', etichetta: 'Indirizzo', tipo: 'testo', largo: true },
    ],
  },
  {
    chiave: 'casella', titolo: 'Casella dei documenti', sotto: 'da dove arrivano i documenti dei fornitori',
    campi: [
      { nome: 'server', etichetta: 'Server (IMAP)', tipo: 'testo' },
      { nome: 'porta', etichetta: 'Porta', tipo: 'numero', min: 1, max: 65535, opzionale: true },
      { nome: 'utente', etichetta: 'Utente', tipo: 'testo' },
      { nome: 'password', etichetta: 'Password', tipo: 'password', segreto: true },
      { nome: 'cartella', etichetta: 'Cartella da leggere', tipo: 'testo' },
      { nome: 'cartella_lette', etichetta: 'Sposta le email lette in', tipo: 'testo' },
      { nome: 'minuti', etichetta: 'Controlla ogni (minuti)', tipo: 'numero', min: 1, max: 60, aiuto: 'Da 1 a 60.' },
    ],
  },
  {
    chiave: 'lettura', titolo: 'Server di lettura', sotto: 'il modello che legge i documenti e le soglie di affidabilità',
    campi: [
      { nome: 'connettore', etichetta: 'Modello di lettura', tipo: 'select', obbligatorio: true,
        opzioni: [
          { value: 'llamacloud_eu', label: 'LlamaCloud (Unione Europea)' },
          { value: 'glm_ocr_locale', label: 'GLM-OCR locale (quando c’è la macchina)' },
        ] },
      { nome: 'llamacloud_chiave', etichetta: 'Chiave API LlamaCloud', tipo: 'password', segreto: true, gruppo: 'llamacloud_eu', aiuto: 'Non si rilegge: si sostituisce.' },
      { nome: 'llamacloud_modo', etichetta: 'Modo di lettura', tipo: 'select', obbligatorio: true, gruppo: 'llamacloud_eu',
        opzioni: [
          { value: 'cost_effective', label: 'Economico' },
          { value: 'agentic', label: 'Agentico (consigliato)' },
          { value: 'agentic_plus', label: 'Agentico Plus' },
        ] },
      { nome: 'llamacloud_progetto', etichetta: 'Progetto', tipo: 'testo', gruppo: 'llamacloud_eu', aiuto: 'Vuoto: il primo progetto dell’account.' },
      { nome: 'llamacloud_attesa_s', etichetta: 'Tempo massimo per documento (s)', tipo: 'numero', min: 10, max: 600, gruppo: 'llamacloud_eu', aiuto: 'Con confidenza e citazioni può richiedere qualche minuto.' },
      { nome: 'locale_indirizzo', etichetta: 'Indirizzo del server (vLLM)', tipo: 'testo', largo: true, gruppo: 'glm_ocr_locale', aiuto: 'Il server GPU quando arriva la macchina.' },
      { nome: 'locale_modello', etichetta: 'Modello', tipo: 'testo', gruppo: 'glm_ocr_locale' },
      { nome: 'locale_attesa_s', etichetta: 'Tempo massimo per documento (s)', tipo: 'numero', min: 10, max: 600, gruppo: 'glm_ocr_locale' },
      { nome: 'soglia_ok', etichetta: 'Affidabile da', tipo: 'numero', min: 0, max: 1, step: 0.01, decimale: true, aiuto: 'Campi sopra questa soglia: nessun controllo (spec §6.5).' },
      { nome: 'soglia_bassa', etichetta: 'Affidabilità bassa sotto', tipo: 'numero', min: 0, max: 1, step: 0.01, decimale: true, aiuto: 'Fra le due soglie: da controllare; sotto: bassa.' },
    ],
  },
  {
    chiave: 'posta', titolo: 'Posta in uscita', sotto: 'inviti e link di accesso agli utenti, avvisi',
    campi: [
      { nome: 'server', etichetta: 'Server (SMTP)', tipo: 'testo' },
      { nome: 'porta', etichetta: 'Porta', tipo: 'numero', min: 1, max: 65535, opzionale: true },
      { nome: 'utente', etichetta: 'Utente', tipo: 'testo' },
      { nome: 'password', etichetta: 'Password', tipo: 'password', segreto: true },
      { nome: 'mittente', etichetta: 'Mittente', tipo: 'testo', largo: true },
    ],
  },
  {
    chiave: 'integra', titolo: 'Sincronizzazione da Integra', sotto: 'viste nel database ponte collegato a Integra (D-32)',
    campi: [
      { nome: 'server', etichetta: 'Server del database ponte', tipo: 'testo' },
      { nome: 'database', etichetta: 'Database', tipo: 'testo' },
      { nome: 'utente', etichetta: 'Utente (sola lettura)', tipo: 'testo' },
      { nome: 'password', etichetta: 'Password', tipo: 'password', segreto: true },
      { nome: 'schema', etichetta: 'Schema delle viste', tipo: 'testo', aiuto: 'Clienti e fornitori.' },
      { nome: 'secondi', etichetta: 'Anagrafiche ogni (secondi)', tipo: 'numero', min: 10, max: 3600, aiuto: 'Da 10 a 3600.' },
    ],
  },
  {
    chiave: 'conservazione', titolo: 'Conservazione dei dati', sotto: 'per quanto restano registro e scartati',
    campi: [
      { nome: 'eventi_mesi', etichetta: 'Registro eventi (mesi)', tipo: 'numero', min: 12, max: 120, aiuto: 'Poi le righe più vecchie vengono eliminate in automatico.' },
      { nome: 'scartati_giorni', etichetta: 'Documenti scartati (giorni)', tipo: 'numero', min: 1, max: 3650 },
      { nome: 'righe_pagina', etichetta: 'Righe per pagina nelle tabelle', tipo: 'numero', min: 5, max: 200 },
    ],
  },
];

export const sezioneDi = (chiave: string): Sezione => {
  const s = SEZIONI.find((x) => x.chiave === chiave);
  if (!s) throw new NotFoundException('Sezione sconosciuta');
  return s;
};

// Valori iniziali (dati.js): per casella, posta e integra i campi di connessione partono vuoti,
// così un'installazione nuova non tenta indirizzi d'esempio; lettura.indirizzo vuoto.
const INIZIALI: Record<string, Record<string, unknown>> = {
  azienda: { ragione_sociale: 'Decobrands SRL', piva: 'IT03589740163', email: 'amministrazione@decobrands.it', indirizzo: 'Via dell’Industria 12, 24040 Bergamo' },
  casella: { server: '', porta: null, utente: '', password: null, cartella: 'Fornitori', cartella_lette: 'Fornitori/Letti', minuti: 2 },
  lettura: {
    connettore: 'llamacloud_eu',
    llamacloud_chiave: null, llamacloud_modo: 'agentic', llamacloud_progetto: '', llamacloud_attesa_s: 300,
    locale_indirizzo: '', locale_modello: 'zai-org/GLM-OCR', locale_attesa_s: 300,
    soglia_ok: 0.9, soglia_bassa: 0.7,
  },
  posta: { server: '', porta: null, utente: '', password: null, mittente: '' },
  integra: { server: '', database: '', utente: '', password: null, schema: 'crm_viste', secondi: 60 },
  conservazione: { eventi_mesi: 36, scartati_giorni: 90, righe_pagina: 25 },
};

/** Valori iniziali più la riga del database, se c'è. Le password cifrate restano cifrate. */
export async function valoriSezione(db: Db, chiave: string): Promise<Record<string, unknown>> {
  const riga = await db.impostazioni.findUnique({ where: { chiave } });
  return { ...INIZIALI[chiave], ...(riga ? (riga.valore as Record<string, unknown>) : {}) };
}

/** Un segreto decifrato, o null se il campo non ha un valore decifrabile (vuoto o seed `true`). */
async function segretoDi(v: unknown): Promise<string | null> {
  if (typeof v !== 'string' || !v.startsWith('v1:')) return null;
  try {
    return decifra(v);
  } catch {
    return null; // chiave cambiata o formato non riconosciuto: la connessione non si può aprire
  }
}

/** I valori per i servizi, con le password decifrate solo dove servono; null se i campi mancano. */
export async function casellaConfig(db: Db) {
  const v = await valoriSezione(db, 'casella');
  // servono anche le due cartelle: senza, il giro non saprebbe dove leggere né dove spostare (F6-A1)
  if (!v.server || !v.utente || !v.cartella || !v.cartella_lette) return null;
  const password = await segretoDi(v.password);
  if (password === null) return null;
  return {
    server: String(v.server), porta: Number(v.porta) || 993, utente: String(v.utente), password,
    cartella: String(v.cartella), cartella_lette: String(v.cartella_lette), minuti: Number(v.minuti) || 2,
  };
}

export async function postaConfig(db: Db) {
  const v = await valoriSezione(db, 'posta');
  if (!v.server || !v.utente) return null;
  const password = await segretoDi(v.password);
  if (password === null) return null;
  return { server: String(v.server), porta: Number(v.porta) || 587, utente: String(v.utente), password, mittente: String(v.mittente || '') };
}

export async function integraConfig(db: Db) {
  const v = await valoriSezione(db, 'integra');
  if (!v.server || !v.database || !v.utente) return null;
  const password = await segretoDi(v.password);
  if (password === null) return null;
  // lo schema è un identificativo: mai testo libero nella query (§4.5)
  const schema = /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(v.schema)) ? String(v.schema) : 'crm_viste';
  return { server: String(v.server), database: String(v.database), utente: String(v.utente), password, schema, secondi: Number(v.secondi) || 60 };
}

export async function letturaConfig(db: Db) {
  const v = await valoriSezione(db, 'lettura');
  if (v.connettore === 'llamacloud_eu') {
    const chiave = await segretoDi(v.llamacloud_chiave);
    if (chiave === null) return null;
    const modo = ['cost_effective', 'agentic', 'agentic_plus'].includes(String(v.llamacloud_modo)) ? String(v.llamacloud_modo) : 'agentic';
    return {
      connettore: 'llamacloud_eu' as const,
      // l'indirizzo di LlamaCloud è fisso: la chiave non va mai a un indirizzo scelto dall'utente
      indirizzo: 'https://api.cloud.eu.llamaindex.ai',
      chiave,
      modo,
      progetto: String(v.llamacloud_progetto || ''),
      attesa_s: Number(v.llamacloud_attesa_s) || 300,
      soglia_ok: Number(v.soglia_ok),
      soglia_bassa: Number(v.soglia_bassa),
    };
  }
  if (v.connettore === 'glm_ocr_locale') {
    return {
      connettore: 'glm_ocr_locale' as const,
      indirizzo: String(v.locale_indirizzo || ''),
      modello: String(v.locale_modello || ''),
      attesa_s: Number(v.locale_attesa_s) || 300,
      soglia_ok: Number(v.soglia_ok),
      soglia_bassa: Number(v.soglia_bassa),
    };
  }
  return null;
}

/** Righe per pagina dalle impostazioni, 25 se la riga non c'è. */
export async function righePagina(db: Db): Promise<number> {
  const v = await valoriSezione(db, 'conservazione');
  const n = Number(v.righe_pagina);
  return Number.isInteger(n) && n >= 5 && n <= 200 ? n : 25;
}

/** Intestazione dei prospetti esportati (§11): ragione sociale, P.IVA, indirizzo ed email. */
export async function ragioneSociale(db: Db) {
  const v = await valoriSezione(db, 'azienda');
  return { ragione_sociale: String(v.ragione_sociale ?? ''), piva: String(v.piva ?? ''), indirizzo: String(v.indirizzo ?? ''), email: String(v.email ?? '') };
}

const uguali = (a: unknown, b: unknown) => a === b;

/**
 * Valida i valori della sezione e li fonde con quelli attuali. Restituisce il nuovo valore completo,
 * il diff `prima`/`dopo` coi soli campi cambiati e le password come `impostata`/`sostituita` (mai il
 * valore, §15.4, §15.8). Un errore dice quale campo e il limite, mai il valore digitato (V12).
 */
export async function applica(db: Db, chiave: string, valori: Record<string, unknown>) {
  const sezione = sezioneDi(chiave); // 404 per chiave sconosciuta
  const attuale = await valoriSezione(db, chiave);
  const nomi = new Set(sezione.campi.map((c) => c.nome));
  for (const k of Object.keys(valori)) if (!nomi.has(k)) throw new BadRequestException(`Campo sconosciuto: ${k}`);

  const nuovo: Record<string, unknown> = { ...attuale };
  const prima: Record<string, unknown> = {};
  const dopo: Record<string, unknown> = {};

  for (const c of sezione.campi) {
    const v = valori[c.nome];
    if (c.segreto) {
      if (v === undefined || v === '') continue; // campo assente o vuoto: resta quella di prima
      try {
        nuovo[c.nome] = cifra(String(v));
      } catch {
        throw new BadRequestException('Il server non ha la chiave dei segreti (SEGRETI_CHIAVE): va scritta nel file .env del server (app/backend/.env) e poi bisogna riavviare il backend. I parametri del server sono elencati sotto la sezione.');
      }
      prima[c.nome] = attuale[c.nome] ? 'impostata' : 'non impostata';
      dopo[c.nome] = 'sostituita';
      continue;
    }
    if (c.tipo === 'numero') {
      if (v === undefined) continue;
      if (v === '' || v === null) {
        if (c.opzionale) {
          if (attuale[c.nome] !== null) { prima[c.nome] = attuale[c.nome] ?? null; dopo[c.nome] = null; nuovo[c.nome] = null; }
          continue;
        }
        throw new BadRequestException(`${c.etichetta}: inserisci un numero.`);
      }
      const n = Number(v);
      const decimale = c.decimale ? Math.abs(n * 100 - Math.round(n * 100)) < 1e-9 : false;
      if (!Number.isFinite(n) || (c.decimale ? !decimale : !Number.isInteger(n))) {
        throw new BadRequestException(`${c.etichetta}: inserisci un ${c.decimale ? 'numero con al massimo due decimali' : 'numero intero'}.`);
      }
      if (c.min != null && n < c.min) throw new BadRequestException(`${c.etichetta}: da ${c.min} a ${c.max}.`);
      if (c.max != null && n > c.max) throw new BadRequestException(`${c.etichetta}: da ${c.min} a ${c.max}.`);
      nuovo[c.nome] = n;
    } else {
      if (v === undefined) continue;
      const s = String(v).trim();
      if (c.obbligatorio && !s) throw new BadRequestException(`${c.etichetta} è obbligatorio.`);
      if (c.tipo === 'email' && !s.includes('@')) throw new BadRequestException('Email non valida.');
      if (c.tipo === 'select' && !c.opzioni?.some((o) => o.value === s)) throw new BadRequestException(`${c.etichetta}: valore non ammesso.`);
      nuovo[c.nome] = s;
    }
    if (!uguali(attuale[c.nome], nuovo[c.nome])) {
      prima[c.nome] = attuale[c.nome] ?? null;
      dopo[c.nome] = nuovo[c.nome];
    }
  }

  // §6.5, §7.15: le soglie si controllano sul valore finale (nuovo o quello rimasto)
  if (chiave === 'lettura') {
    const ok = Number(nuovo.soglia_ok), bassa = Number(nuovo.soglia_bassa);
    if (!(bassa > 0 && bassa < ok && ok <= 1)) {
      throw new BadRequestException('Le soglie devono essere fra 0 e 1, con "bassa" minore di "affidabile".');
    }
  }
  return { nuovo, prima, dopo };
}

/** La sezione pubblica: i segreti come `{valore: null, impostata}`, mai il valore cifrato. */
export async function sezionePubblica(db: Db, chiave: string) {
  const sezione = sezioneDi(chiave);
  const v = await valoriSezione(db, chiave);
  return {
    chiave: sezione.chiave, titolo: sezione.titolo, sotto: sezione.sotto,
    campi: sezione.campi.map((c) => {
      const base = { nome: c.nome, etichetta: c.etichetta, tipo: c.tipo, aiuto: c.aiuto, largo: c.largo, min: c.min, max: c.max, step: c.step, opzioni: c.opzioni, gruppo: c.gruppo };
      return c.segreto
        ? { ...base, valore: null, impostata: !!v[c.nome] }
        : { ...base, valore: v[c.nome] ?? null };
    }),
  };
}

export const elencoSezioni = () => SEZIONI.map((s) => ({ chiave: s.chiave, titolo: s.titolo, sotto: s.sotto }));
