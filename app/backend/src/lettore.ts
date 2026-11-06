import { Logger } from '@nestjs/common';
import type { letturaConfig } from './impostazioni';

// Lettura dei documenti con un connettore esterno (F6-A2, §6.5, D-67). Per ora c'è un solo
// connettore, LlamaCloud nella regione UE: carica il file, chiede l'estrazione con lo schema del
// tipo di documento, aspetta la fine e restituisce i campi con confidenza e posizione nel PDF.
// Il connettore locale (GLM-OCR su vLLM) si aggiunge qui quando arriva la macchina: il resto del
// CRM non cambia. Il browser non c'entra (V12): la chiave e i documenti restano sul server.

const log = new Logger('Lettore');
const ATTESA_POLL_MS = 2000;

type Config = NonNullable<Awaited<ReturnType<typeof letturaConfig>>>;

export class LetturaNonConfigurata extends Error {}
export class LetturaFallita extends Error {}

export interface PosizionePdf {
  tipo: 'pdf';
  pagina: number;
  x0: number; y0: number; x1: number; y1: number; // normalizzati 0–1 (§6.6)
}
export interface CampoLetto {
  campo: string; // percorso nello schema, es. `numero`, `righe[3].prezzo`
  valore: string | null;
  affidabilita: number | null; // 0–1, dal connettore; null se non c'è
  posizione: PosizionePdf | null;
  precisione: 'esatta' | 'approssimata' | 'assente';
}
export interface Lettura {
  campi: CampoLetto[];
  risultato: Record<string, unknown>;
  modello: string;
  crediti: number | null;
}

interface Citazione {
  page?: number;
  matching_text?: string;
  bounding_boxes?: { x: number; y: number; w: number; h: number }[];
  page_dimensions?: { width: number; height: number };
}
interface MetaCampo {
  confidence?: number;
  citation?: Citazione[];
}

const base = (c: Config) => c.indirizzo.replace(/\/$/, '');
const intestazioni = (c: Config) => ({ Authorization: `Bearer ${c.chiave}` });
const pulisci = (s: unknown) => String(s instanceof Error ? s.message : s).replace(/\s+/g, ' ').slice(0, 300);

async function leggiErrore(r: Response): Promise<string> {
  const testo = await r.text().catch(() => '');
  try {
    const j = JSON.parse(testo) as { detail?: unknown; message?: unknown };
    return pulisci(j.detail ?? j.message ?? testo);
  } catch {
    return pulisci(testo || `HTTP ${r.status}`);
  }
}

/** Elenco dei progetti: il primo se le Impostazioni non ne indicano uno. */
async function progetto(c: Config, f: typeof fetch): Promise<string> {
  if (c.progetto) return c.progetto;
  const r = await f(`${base(c)}/api/v1/projects`, { headers: intestazioni(c), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new LetturaFallita(`LlamaCloud non ha restituito i progetti (${r.status}): ${await leggiErrore(r)}`);
  const j = (await r.json()) as { id: string }[] | { items?: { id: string }[] };
  const primo = Array.isArray(j) ? j[0] : j.items?.[0];
  if (!primo) throw new LetturaFallita('LlamaCloud: nessun progetto nell’account');
  return primo.id;
}

function mime(nome: string): string {
  if (/\.pdf$/i.test(nome)) return 'application/pdf';
  if (/\.png$/i.test(nome)) return 'image/png';
  if (/\.jpe?g$/i.test(nome)) return 'image/jpeg';
  return 'application/octet-stream';
}

function posizioneDi(cit: Citazione | undefined): PosizionePdf | null {
  const b = cit?.bounding_boxes?.[0];
  const d = cit?.page_dimensions;
  if (!b || !d?.width || !d?.height || !cit?.page) return null;
  const dentro = (v: number) => Math.min(1, Math.max(0, v));
  return {
    tipo: 'pdf', pagina: cit.page,
    x0: dentro(b.x / d.width), y0: dentro(b.y / d.height),
    x1: dentro((b.x + b.w) / d.width), y1: dentro((b.y + b.h) / d.height),
  };
}

/** Le foglie del risultato, con lo stesso percorso nel risultato e nei metadati. */
function foglie(valore: unknown, percorso: string, meta: unknown, out: CampoLetto[]) {
  if (Array.isArray(valore)) {
    valore.forEach((v, i) => foglie(v, `${percorso}[${i}]`, Array.isArray(meta) ? meta[i] : undefined, out));
    return;
  }
  if (valore && typeof valore === 'object') {
    for (const [k, v] of Object.entries(valore as Record<string, unknown>)) {
      const m = meta && typeof meta === 'object' ? (meta as Record<string, unknown>)[k] : undefined;
      foglie(v, percorso ? `${percorso}.${k}` : k, m, out);
    }
    return;
  }
  const m = (meta && typeof meta === 'object' ? meta : {}) as MetaCampo;
  const posizione = posizioneDi(m.citation?.[0]);
  out.push({
    campo: percorso,
    valore: valore == null ? null : String(valore),
    affidabilita: typeof m.confidence === 'number' ? Math.round(m.confidence * 1000) / 1000 : null,
    posizione,
    precisione: posizione ? 'esatta' : 'assente', // senza riquadro non c'è niente da evidenziare
  });
}

/** Un documento letto da LlamaCloud EU (D-67): file → estrazione con schema → campi con confidenza e citazione. */
async function leggiConLlamaCloud(c: Config, nome: string, dati: Buffer, schema: object, prompt: string | undefined, f: typeof fetch, pollMs: number): Promise<Lettura> {
  const inizio = Date.now();
  let fileId: string | null = null;
  try {
    const modulo = new FormData();
    modulo.append('file', new Blob([new Uint8Array(dati)], { type: mime(nome) }), nome);
    modulo.append('purpose', 'extract');
    const caricato = await f(`${base(c)}/api/v1/beta/files`, {
      method: 'POST', headers: intestazioni(c), body: modulo, signal: AbortSignal.timeout(60_000),
    });
    if (!caricato.ok) throw new LetturaFallita(`LlamaCloud non ha accettato il file (${caricato.status}): ${await leggiErrore(caricato)}`);
    fileId = ((await caricato.json()) as { id: string }).id;

    const pid = await progetto(c, f);
    const creato = await f(`${base(c)}/api/v2/extract?project_id=${encodeURIComponent(pid)}`, {
      method: 'POST',
      headers: { ...intestazioni(c), 'content-type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        file_input: fileId,
        configuration: {
          data_schema: schema,
          tier: c.modo,
          version: '2.5',
          extraction_target: 'per_doc',
          cite_sources: true,
          confidence_scores: true,
          ...(prompt ? { system_prompt: prompt } : {}),
        },
      }),
    });
    if (!creato.ok) throw new LetturaFallita(`LlamaCloud non ha avviato la lettura (${creato.status}): ${await leggiErrore(creato)}`);
    const job = (await creato.json()) as { id: string; status: string };

    let ultimo = job;
    const scadenza = inizio + c.attesa_s * 1000;
    for (;;) {
      const r = await f(`${base(c)}/api/v2/extract/${encodeURIComponent(job.id)}?project_id=${encodeURIComponent(pid)}&expand=extract_metadata&expand=usage`, {
        headers: intestazioni(c), signal: AbortSignal.timeout(30_000),
      });
      if (!r.ok) throw new LetturaFallita(`LlamaCloud non ha restituito l’esito (${r.status}): ${await leggiErrore(r)}`);
      ultimo = (await r.json()) as typeof job & { extract_result?: unknown; extract_metadata?: unknown; usage?: { credits_used?: number } };
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(ultimo.status)) break;
      if (Date.now() + pollMs > scadenza) {
        throw new LetturaFallita(`LlamaCloud non ha finito entro ${c.attesa_s} s`);
      }
      await new Promise((ok) => setTimeout(ok, pollMs));
    }
    if (ultimo.status !== 'COMPLETED') {
      const errore = (ultimo as { error_message?: unknown }).error_message;
      throw new LetturaFallita(`LlamaCloud non ha letto il documento (${ultimo.status})${errore ? ': ' + pulisci(errore) : ''}`);
    }

    const risultato = (ultimo as { extract_result?: Record<string, unknown> }).extract_result ?? {};
    const meta = (ultimo as { extract_metadata?: { field_metadata?: { document_metadata?: unknown } } }).extract_metadata?.field_metadata?.document_metadata;
    const campi: CampoLetto[] = [];
    foglie(risultato, '', meta, campi);
    const uso = (ultimo as { usage?: { credits_used?: unknown; credits?: unknown } }).usage;
    const crediti = Number(uso?.credits_used ?? uso?.credits);
    return { campi, risultato, modello: `llamacloud:extract:2.5:${c.modo}`, crediti: Number.isFinite(crediti) ? crediti : null };
  } catch (e) {
    if (e instanceof LetturaFallita) throw e;
    throw new LetturaFallita(`Lettura non riuscita: ${pulisci(e)}`);
  } finally {
    // il documento non resta nel cloud più del necessario (D-67): la pulizia non deve far fallire la lettura
    if (fileId) {
      await f(`${base(c)}/api/v1/beta/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: intestazioni(c), signal: AbortSignal.timeout(15_000) })
        .catch(() => undefined);
    }
  }
}

/** Legge un documento col connettore scelto. `f` e `pollMs` sono per le prove. */
export async function leggiDocumento(c: Config, nome: string, dati: Buffer, schema: object, prompt?: string, f: typeof fetch = fetch, pollMs = ATTESA_POLL_MS): Promise<Lettura> {
  if (c.connettore === 'llamacloud_eu') return leggiConLlamaCloud(c, nome, dati, schema, prompt, f, pollMs);
  throw new LetturaNonConfigurata('Connettore di lettura non riconosciuto');
}

/** Prova la chiave e l’indirizzo senza caricare documenti. */
export async function provaConnettore(c: Config, f: typeof fetch = fetch): Promise<{ ok: boolean; testo: string }> {
  try {
    const r = await f(`${base(c)}/api/v1/projects`, { headers: intestazioni(c), signal: AbortSignal.timeout(15_000) });
    if (!r.ok) {
      const motivo = r.status === 401 || r.status === 403 ? 'chiave API non valida' : await leggiErrore(r);
      return { ok: false, testo: `LlamaCloud EU non raggiungibile: ${motivo}` };
    }
    const j = (await r.json()) as { id: string }[] | { items?: unknown[] };
    const n = Array.isArray(j) ? j.length : Array.isArray(j.items) ? j.items.length : 0;
    log.log(`prova LlamaCloud UE: ${n} progetti`);
    return { ok: true, testo: `LlamaCloud EU raggiungibile · ${n} progett${n === 1 ? 'o' : 'i'}` };
  } catch (e) {
    return { ok: false, testo: `LlamaCloud EU non raggiungibile: ${pulisci(e)}` };
  }
}
