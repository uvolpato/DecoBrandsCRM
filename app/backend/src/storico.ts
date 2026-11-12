import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, type PrismaClient, type interscambio_storico } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Richiede } from './accesso';
import { PrismaService } from './prisma.service';
import { normalizzaNome } from './proposta';
import { normalizzaPiva } from './soggetti';

// Storico dei legami del vecchio CRM (F1-A12, D-112, §4.7.2-4.7.4).
// Due tabelle di sola lettura per l'app: propongono subagente e sconto, non creano niente.
// L'unica scrittura è `segnaUsata`, chiamata da chi crea l'agenzia (non da una rotta).

type Db = Prisma.TransactionClient | PrismaClient;

// La normalizzazione della P.IVA è una sola, quella del master `soggetti` (§1.6, D-112): IT + 11
// cifre → 11 cifre. Resta esportata da qui per chi già la importava da storico.ts.
export { normalizzaPiva };
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
 *  Al massimo 5 righe.
 *
 *  Il fornitore si riconosce da P.IVA e ragione sociale, **non** da `fornitore_id`: nello storico
 *  quegli id sono NULL finché un soggetto non viene collegato (l'import non li conosce), quindi
 *  filtrare sull'id rendeva la proposta muta sui dati veri. Con `fornitoreId` si leggono P.IVA e nome
 *  dal fornitore in anagrafica e si confrontano normalizzati (una sola query in più). */
export async function cercaLegame(db: Db, c: CercaLegame): Promise<interscambio_storico[]> {
  let piva = c.fornitorePiva ? normalizzaPiva(c.fornitorePiva) : null;
  let nome = c.fornitoreNome ? normalizzaNome(c.fornitoreNome) : null;
  if (c.fornitoreId != null && !piva && !nome) {
    const f = await db.fornitori.findUnique({
      where: { id: c.fornitoreId },
      include: { corrente: { select: { piva: true, ragione_sociale: true } } },
    });
    piva = f?.corrente?.piva ? normalizzaPiva(f.corrente.piva) : null;
    nome = f?.corrente?.ragione_sociale ? normalizzaNome(f.corrente.ragione_sociale) : null;
  }
  // Un codice cliente da solo non è univoco: è il codice di *quel* fornitore. Senza fornitore
  // non si propone niente (D-112: proporre l'agenzia sbagliata è peggio che non proporla).
  if (!piva && !nome) return [];

  const prendi = async (w: Prisma.interscambio_storicoWhereInput, n = 5) => {
    const righe = await db.interscambio_storico.findMany({ where: w, orderBy: { id: 'asc' } });
    return righe
      .filter((r) => (piva && normalizzaPiva(r.fornitore_piva ?? '') === piva)
        || (nome && r.fornitore_ragione_sociale && normalizzaNome(r.fornitore_ragione_sociale) === nome))
      .slice(0, n);
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
    // D-134: il subagente lo risolve il server dal nome del vecchio CRM («nome cognome» o «cognome
    // nome»), solo se la corrispondenza è una sola. Il browser non abbina nomi (V12).
    const subs = righe.some((r) => !r.subagente_id && r.subagente_nome)
      ? await this.db.subagenti.findMany({ select: { id: true, nome: true, cognome: true } })
      : [];
    const perNome = (nome: string | null) => {
      const n = normalizzaNome(nome ?? '');
      if (!n) return null;
      const uguali = subs.filter((s) => normalizzaNome(`${s.nome} ${s.cognome}`) === n || normalizzaNome(`${s.cognome} ${s.nome}`) === n);
      return uguali.length === 1 ? uguali[0].id : null; // omonimi o assente: resta da scegliere
    };
    return righe.map((r) => {
      const subagenteId = r.subagente_id ?? perNome(r.subagente_nome);
      return {
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
        subagente_id: subagenteId === null ? null : String(subagenteId),
        rappresentato: !!r.subagente_nome, // D-112: falso = fornitore senza rappresentanza
      };
    });
  }
}
