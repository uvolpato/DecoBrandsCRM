// Prova del connettore di lettura (F6-A2, D-67): sequenza file → estrazione → campi, confidenza
// e citazioni; chiave mai nei messaggi; il file si cancella dal cloud; timeout e errori.
import { LetturaFallita, leggiDocumento, provaConnettore } from '../src/lettore';

type Risposta = { stato?: number; corpo?: unknown; testo?: string };
const risposta = (r: Risposta) => new Response(r.testo ?? JSON.stringify(r.corpo ?? {}), {
  status: r.stato ?? 200, headers: { 'content-type': 'application/json' },
});

const config = {
  connettore: 'llamacloud_eu' as const, indirizzo: 'https://api.cloud.eu.llamaindex.ai', chiave: 'llx-segreta',
  modo: 'agentic', progetto: '', attesa_s: 30, soglia_ok: 0.9, soglia_bassa: 0.7,
};

const ESITO = {
  status: 'COMPLETED',
  extract_result: {
    numero: 'F-2026-0891',
    importo_totale: 1234.56,
    righe: [{ codice: 'AB-1', prezzo: 12.5 }],
  },
  extract_metadata: {
    field_metadata: {
      document_metadata: {
        numero: { confidence: 0.971, citation: [{ page: 1, matching_text: 'F-2026-0891', bounding_boxes: [{ x: 100, y: 50, w: 200, h: 20 }], page_dimensions: { width: 1000, height: 2000 } }] },
        importo_totale: { confidence: 0.55 },
        righe: [{ codice: { confidence: 0.99 }, prezzo: { confidence: 0.62 } }],
      },
    },
  },
  usage: { credits_used: 25 },
};

function catena(esiti: Risposta[], chiamate: { metodo: string; url: string }[] = []) {
  let i = 0;
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    chiamate.push({ metodo: init?.method ?? 'GET', url: u });
    if (u.endsWith('/api/v1/beta/files') && init?.method === 'POST') return risposta(esiti[i++] ?? { corpo: { id: 'file-1' } });
    if (u.includes('/api/v1/projects')) return risposta(esiti[i++] ?? { corpo: [{ id: 'proj-1' }] });
    if (u.includes('/api/v2/extract?') && init?.method === 'POST') return risposta(esiti[i++] ?? { corpo: { id: 'job-1', status: 'PENDING' } });
    if (u.includes('/api/v2/extract/job-1')) return risposta(esiti[i++] ?? { corpo: ESITO });
    if (init?.method === 'DELETE') return risposta({ corpo: {} });
    throw new Error('chiamata non prevista: ' + u);
  }) as typeof fetch;
  return { f, chiamate };
}

describe('F6-A2 lettore LlamaCloud EU', () => {
  it('file → progetto → estrazione → campi con confidenza e posizione normalizzata; file cancellato', async () => {
    const { f, chiamate } = catena([]);
    const r = await leggiDocumento(config, 'fattura.pdf', Buffer.from('%PDF-1.4'), { type: 'object' }, 'estrai', f, 1);
    expect(r.risultato).toMatchObject({ numero: 'F-2026-0891' });
    expect(r.modello).toBe('llamacloud:extract:2.5:agentic');
    expect(r.crediti).toBe(25);
    const numero = r.campi.find((c) => c.campo === 'numero')!;
    expect(numero).toMatchObject({ valore: 'F-2026-0891', affidabilita: 0.971, precisione: 'esatta' });
    expect(numero.posizione).toMatchObject({ tipo: 'pdf', pagina: 1, x0: 0.1, y0: 0.025, x1: 0.3, y1: 0.035 });
    const prezzo = r.campi.find((c) => c.campo === 'righe[0].prezzo')!;
    expect(prezzo).toMatchObject({ valore: '12.5', affidabilita: 0.62, posizione: null, precisione: 'assente' });
    expect(chiamate.some((c) => c.metodo === 'DELETE' && c.url.endsWith('/api/v1/beta/files/file-1'))).toBe(true);
    // la chiave non compare mai nei dati restituiti
    expect(JSON.stringify(r)).not.toContain('llx-segreta');
  });

  it('progetto indicato: non chiede l’elenco dei progetti; senza metadati la precisione è assente', async () => {
    const { f, chiamate } = catena([
      { corpo: { id: 'file-1' } },
      { corpo: { id: 'job-1', status: 'PENDING' } },
      { corpo: { status: 'COMPLETED', extract_result: { numero: 'X' } } },
      { corpo: {} },
    ]);
    const r = await leggiDocumento({ ...config, progetto: 'p0' }, 'fat.jpg', Buffer.from([0xff, 0xd8, 0xff]), { type: 'object' }, undefined, f, 1);
    expect(chiamate.some((c) => c.url.includes('/api/v1/projects'))).toBe(false);
    expect(r.campi[0]).toMatchObject({ campo: 'numero', valore: 'X', affidabilita: null, posizione: null, precisione: 'assente' });
  });

  it('errore HTTP: messaggio pulito, niente chiave, file comunque cancellato', async () => {
    const { f, chiamate } = catena([
      { corpo: { id: 'file-1' } },
      { corpo: [{ id: 'p' }] },
      { stato: 401, corpo: { detail: 'invalid api key' } },
      { corpo: {} },
    ]);
    await expect(leggiDocumento(config, 'f.pdf', Buffer.from('%PDF-'), {}, undefined, f, 1)).rejects.toThrow(/401.*invalid api key/);
    expect(chiamate.some((c) => c.metodo === 'DELETE')).toBe(true);
    expect(chiamate.some((c) => c.metodo === 'DELETE' && c.url.includes('llx-segreta'))).toBe(false);
  });

  it('estrazione fallita e timeout', async () => {
    const fallita = catena([
      { corpo: { id: 'file-1' } }, { corpo: [{ id: 'p' }] }, { corpo: { id: 'job-1', status: 'PENDING' } },
      { corpo: { status: 'FAILED', error_message: 'documento illeggibile' } }, { corpo: {} },
    ]);
    await expect(leggiDocumento(config, 'f.pdf', Buffer.from('%PDF-'), {}, undefined, fallita.f, 1))
      .rejects.toThrow(/FAILED.*documento illeggibile/);

    const lenta = catena([
      { corpo: { id: 'file-1' } }, { corpo: [{ id: 'p' }] }, { corpo: { id: 'job-1', status: 'PENDING' } },
      ...Array.from({ length: 1000 }, () => ({ corpo: { status: 'RUNNING' } })),
    ]);
    await expect(leggiDocumento({ ...config, attesa_s: 1 }, 'f.pdf', Buffer.from('%PDF-'), {}, undefined, lenta.f, 2))
      .rejects.toThrow(/non ha finito entro 1 s/);
  });

  it('prova del connettore: progetti raggiungibili, chiave non valida', async () => {
    const ok = catena([{ corpo: [{ id: 'a' }, { id: 'b' }] }]);
    expect(await provaConnettore(config, ok.f)).toEqual({ ok: true, testo: 'LlamaCloud EU raggiungibile · 2 progetti' });
    const no = catena([{ stato: 401, corpo: { detail: 'invalid api key' } }]);
    expect(await provaConnettore(config, no.f)).toEqual({ ok: false, testo: 'LlamaCloud EU non raggiungibile: chiave API non valida' });
  });

  it('errore di rete: LetturaFallita, non un errore grezzo', async () => {
    const f = (async () => { throw new Error('ENOTFOUND'); }) as typeof fetch;
    await expect(leggiDocumento(config, 'f.pdf', Buffer.from('%PDF-'), {}, undefined, f, 1)).rejects.toBeInstanceOf(LetturaFallita);
  });
});
