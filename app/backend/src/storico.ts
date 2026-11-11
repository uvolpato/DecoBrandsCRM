import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, type PrismaClient, type interscambio_storico } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Richiede } from './accesso';
import { PrismaService } from './prisma.service';
import { normalizzaNome } from './proposta';

// Storico dei legami del vecchio CRM (F1-A12, D-112, §4.7.2-4.7.4).
// Due tabelle di sola lettura per l'app: propongono subagente e sconto, non creano niente.
// L'unica scrittura è `segnaUsata`, chiamata da chi crea l'agenzia (non da una rotta).

type Db = Prisma.TransactionClient | PrismaClient;

// P.IVA e CF normalizzati come nel master `soggetti` (§1.6, D-112): IT + 11 cifre → 11 cifre,
// maiuscolo senza spazi né punti. Copia di soggetti.ts/integra.ts (non esportate da lì).
export const normalizzaPiva = (v: string) => {
  const s = (v || '').replace(/[\s.]/g, '').toUpperCase();
  return /^IT\d{11}$/.test(s) ? s.slice(2) : s;
};
export const normalizzaCF = (v: string) => (v || '').replace(/\s/g, '').toUpperCase();

export interface CercaLegame {
  fornitoreId?: bigint | null;
  fornitorePiva?: string | null;
  fornitoreNome?: string | null;
  codice?: string | null;
  clienteId?: bigint | null;
}

/** Cerca i legami nello storico per proporre subagente e sconto (D-112). Precedenza: codice cliente
 *  del fornitore (esatto) → P.IVA cliente → ragione sociale normalizzata (solo proposta, mai fusione).
 *  Al massimo 5 righe. */
export async function cercaLegame(db: Db, c: CercaLegame): Promise<interscambio_storico[]> {
  // Un codice cliente da solo non è univoco: è il codice di *quel* fornitore. Senza fornitore
  // non si propone niente (D-112: proporre l'agenzia sbagliata è peggio che non proporla).
  if (c.fornitoreId == null && !c.fornitorePiva && !c.fornitoreNome) return [];
  const base: Prisma.interscambio_storicoWhereInput = {};
  if (c.fornitoreId != null) base.fornitore_id = c.fornitoreId;
  else if (c.fornitorePiva) base.fornitore_piva = normalizzaPiva(c.fornitorePiva);
  const nomeFornitore = c.fornitoreNome ? normalizzaNome(c.fornitoreNome) : null;

  const prendi = async (w: Prisma.interscambio_storicoWhereInput, n = 5) => {
    const righe = await db.interscambio_storico.findMany({ where: { ...base, ...w }, orderBy: { id: 'asc' } });
    // il fornitore per nome si confronta qui: nessuna colonna normalizzata in tabella
    const scelte = nomeFornitore
      ? righe.filter((r) => r.fornitore_ragione_sociale && normalizzaNome(r.fornitore_ragione_sociale) === nomeFornitore)
      : righe;
    return scelte.slice(0, n);
  };

  if (c.codice) {
    const r = await prendi({ cliente_codice_fornitore: { equals: c.codice, mode: 'insensitive' } });
    if (r.length) return r;
  }
  const cli = c.clienteId != null
    ? await db.clienti.findUnique({ where: { id: c.clienteId }, include: { corrente: { select: { piva: true, ragione_sociale: true } } } })
    : null;
  if (cli?.corrente?.piva) {
    const r = await prendi({ cliente_piva_norm: normalizzaPiva(cli.corrente.piva) });
    if (r.length) return r;
  }
  if (cli?.corrente?.ragione_sociale) {
    const nn = normalizzaNome(cli.corrente.ragione_sociale);
    const tutte = await prendi({}, 5000); // proposta: tutto l'ambito del fornitore
    return tutte.filter((r) => r.cliente_ragione_sociale && normalizzaNome(r.cliente_ragione_sociale) === nn).slice(0, 5);
  }
  return [];
}

/** Segna una riga dello storico come usata, dentro la transazione di chi crea l'agenzia (D-112). */
export async function segnaUsata(tx: Db, id: bigint, interscambioId: bigint, nota: string) {
  return tx.interscambio_storico.update({
    where: { id },
    data: { stato: 'usata', interscambio_id: interscambioId, nota, usato_il: new Date() },
  });
}

class FiltroStorico {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) fornitore_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cliente_id?: number;
  @IsOptional() @IsString() @MaxLength(50) codice?: string;
}

@Controller('interscambio')
export class StoricoController {
  constructor(private readonly db: PrismaService) {}

  /** Righe dello storico per proporre subagente e sconto (D-112). `rappresentato` falso = subagente vuoto. */
  @Get('storico')
  @Richiede('dati.consulta')
  async storico(@Query() q: FiltroStorico) {
    const righe = await cercaLegame(this.db, {
      fornitoreId: q.fornitore_id != null ? BigInt(q.fornitore_id) : null,
      clienteId: q.cliente_id != null ? BigInt(q.cliente_id) : null,
      codice: q.codice ?? null,
    });
    return righe.map((r) => ({
      id: String(r.id),
      cliente_legacy_id: String(r.cliente_legacy_id),
      fornitore_legacy_id: String(r.fornitore_legacy_id),
      cliente_codice_fornitore: r.cliente_codice_fornitore,
      cliente_ragione_sociale: r.cliente_ragione_sociale,
      cliente_piva: r.cliente_piva,
      fornitore_ragione_sociale: r.fornitore_ragione_sociale,
      fornitore_piva: r.fornitore_piva,
      agente_nome: r.agente_nome,
      subagente_nome: r.subagente_nome,
      sconto_1: Number(r.sconto_1),
      sconto_2: Number(r.sconto_2),
      stato: r.stato,
      cliente_id: r.cliente_id ? String(r.cliente_id) : null,
      fornitore_id: r.fornitore_id ? String(r.fornitore_id) : null,
      subagente_id: r.subagente_id ? String(r.subagente_id) : null,
      rappresentato: !!r.subagente_nome, // D-112: falso = fornitore senza rappresentanza
    }));
  }
}
