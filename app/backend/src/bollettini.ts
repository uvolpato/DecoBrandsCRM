import { Body, ConflictException, Controller, Get, NotFoundException, Post, Query, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { importaRigheDalPdf } from './bollettino';
import { giornoRoma } from './motore/dati';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Matrice dei bollettini (F3-A1, §7.7, §8.1): fornitori × 6 mesi. Stato, totale riconosciuto e id del
// bollettino vengono dal database in SQL (D-52): niente caricaDati, niente calcoli nel browser (V12).
// Un bollettino senza righe arriva "da verificare": qui conta come arrivato, le righe sono F3-A2/F6.

const MESE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ELENCO_ID = /^\d{1,18}(,\d{1,18})*$/;
const VISTE = ['tutti', 'dafare'] as const;
const MESI = 6;

/** 'aaaa-mm' spostato di n mesi. */
function mese(chiave: string, n: number) {
  const t = Number(chiave.slice(0, 4)) * 12 + Number(chiave.slice(5, 7)) - 1 + n;
  return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0');
}

class FiltroBollettini {
  @IsOptional() @Matches(MESE) al?: string; // ultimo mese del periodo, compreso
  @IsOptional() @Matches(ELENCO_ID) fornitori?: string; // selezione multipla (D-22)
  @IsOptional() @IsIn(VISTE) vista?: (typeof VISTE)[number];
}

class CaricaBollettino {
  @IsInt() @Min(1) fornitore_id!: number;
  @IsInt() @Min(2000) @Max(2100) anno!: number;
  @IsInt() @Min(1) @Max(12) mese!: number;
  @IsOptional() @IsInt() @Min(1) arrivo_id?: number; // PDF già passato da POST /api/documenti/carica
}

type CellaDb = {
  fornitore_id: bigint; fornitore: string; tipo_provvigione: string;
  chiave: string; anno: number; mese: number; fine: string;
  bollettino_id: bigint | null; stato: string | null;
  importo: Prisma.Decimal | null; documenti: boolean; entro: string;
};

const DA_FARE = ['arrivato', 'ritardo', 'contestato'];

@Controller('bollettini')
export class BollettiniController {
  constructor(private readonly db: PrismaService) {}

  /** Matrice (§7.7): una riga per fornitore e i 6 mesi che finiscono in `al` (iniziale: mese in corso).
   *  I conteggi dei segmenti si fanno sui fornitori filtrati, senza il segmento stesso (D-23). */
  @Get()
  @Richiede('provvigioni.consulta')
  async matrice(@Query() q: FiltroBollettini) {
    const oggi = giornoRoma(new Date());
    const ultimo = oggi.slice(0, 7);
    // Si torna indietro fino al primo bollettino o al primo documento: un mese con fatture e senza
    // bollettino va raggiunto, è proprio quello da caricare.
    const [{ primo, ultimo: fine }] = await this.db.$queryRaw<{ primo: string; ultimo: string }[]>`
      SELECT coalesce(to_char(min(m), 'YYYY-MM'), ${ultimo}::text) AS primo,
             ${ultimo}::text AS ultimo
      FROM (SELECT make_date(anno, mese, 1) AS m FROM bollettini_testata
            UNION ALL SELECT min(data) FROM ordini_fornitore_documenti) t`;
    const al = q.al ?? fine;
    const da = mese(al, -(MESI - 1));
    const fornitori = q.fornitori ? q.fornitori.split(',').map((x) => BigInt(x)) : [];
    const filtro = fornitori.length ? Prisma.sql`AND f.id IN (${Prisma.join(fornitori)})` : Prisma.empty;

    const righe = await this.db.$queryRaw<CellaDb[]>`
      WITH periodi AS (
        SELECT to_char(g, 'YYYY-MM') AS chiave, g::date AS inizio,
               (g + interval '1 month' - interval '1 day')::date AS fine,
               extract(year FROM g)::int AS anno, extract(month FROM g)::int AS mese
        FROM generate_series(${da + '-01'}::date, ${al + '-01'}::date, interval '1 month') g
      )
      SELECT f.id AS fornitore_id, coalesce(fv.ragione_sociale, '') AS fornitore, f.tipo_provvigione,
             p.chiave, p.anno, p.mese, to_char(p.fine, 'YYYY-MM-DD') AS fine,
             b.id AS bollettino_id, b.stato,
             (SELECT coalesce(sum(r.importo_riconosciuto), 0) FROM bollettini_righe r WHERE r.testata_id = b.id) AS importo,
             EXISTS (SELECT 1 FROM ordini_fornitore_documenti d
                     JOIN ordini_fornitore_testata t ON t.id = d.testata_id
                     WHERE t.fornitore_id = f.id AND d.tipo IN ('fattura', 'nota_credito')
                       AND d.data BETWEEN p.inizio AND p.fine) AS documenti,
             to_char(p.inizio + interval '1 month'
                     + (least(28, greatest(1, f.giorno_bollettino)) - 1) * interval '1 day', 'YYYY-MM-DD') AS entro
      FROM fornitori f
      JOIN fornitori_versioni fv ON fv.id = f.versione_corrente_id
      CROSS JOIN periodi p
      LEFT JOIN bollettini_testata b ON b.fornitore_id = f.id AND b.anno = p.anno AND b.mese = p.mese
      WHERE f.attivo ${filtro}
      ORDER BY fv.ragione_sociale, p.chiave`;

    // stato della cella (§5.6, D-03): bollettino arrivato, mese in corso, nessun documento, atteso o in ritardo
    const stato = (r: CellaDb) => r.bollettino_id
      ? r.stato === 'verificato' ? 'verificato' : r.stato === 'contestato' ? 'contestato' : 'arrivato'
      : r.fine >= oggi ? 'in_corso' : !r.documenti ? 'nessuno' : oggi <= r.entro ? 'atteso' : 'ritardo';

    const perFornitore = new Map<string, { id: string; fornitore: string; maturazione: string; celle: unknown[]; dafare: boolean }>();
    for (const r of righe) {
      const id = String(r.fornitore_id);
      let f = perFornitore.get(id);
      if (!f) {
        f = { id, fornitore: r.fornitore, maturazione: r.tipo_provvigione, celle: [], dafare: false };
        perFornitore.set(id, f);
      }
      const s = stato(r);
      if (DA_FARE.includes(s)) f.dafare = true;
      f.celle.push({
        mese: r.chiave, stato: s,
        bollettino_id: r.bollettino_id == null ? null : String(r.bollettino_id),
        importo: r.bollettino_id == null ? null : Number(r.importo ?? 0),
        entro: s === 'atteso' ? r.entro : null,
      });
    }

    // D-23: i numeri dei segmenti contano tutti i fornitori filtrati; il segmento sceglie solo le righe
    const tutti = [...perFornitore.values()];
    const conteggi = { tutti: tutti.length, dafare: tutti.filter((f) => f.dafare).length };
    const scelti = q.vista === 'dafare' ? tutti.filter((f) => f.dafare) : tutti;
    return {
      da, al, primo, ultimo: fine,
      colonne: Array.from({ length: MESI }, (_, i) => mese(da, i)),
      fornitori: scelti.map((f) => ({ id: f.id, fornitore: f.fornitore, maturazione: f.maturazione, celle: f.celle })),
      conteggi,
    };
  }

  /** Caricamento di un bollettino (§7.7, §15.2.5): un solo bollettino per fornitore e mese. Il PDF è già
   *  nel canale comune (`arrivo_id`); qui si blocca il fornitore, si crea la testata e si lega il file. */
  @Post()
  @Richiede('provvigioni.modifica')
  async carica(@Req() req: Request, @Body() b: CaricaBollettino) {
    const ctx = contesto(req);
    const fornitore_id = BigInt(b.fornitore_id);
    const arrivo_id = b.arrivo_id == null ? null : BigInt(b.arrivo_id);
    let id: bigint;
    try {
      id = await this.db.$transaction(async (tx) => {
        // blocchi in ordine fisso (D-51, D-54): prima il fornitore, poi il documento in arrivo
        const [f] = await tx.$queryRaw<{ id: bigint; fornitore_versione_id: bigint; fornitore: string }[]>`
          SELECT f.id, f.versione_corrente_id AS fornitore_versione_id, coalesce(fv.ragione_sociale, '') AS fornitore
          FROM fornitori f JOIN fornitori_versioni fv ON fv.id = f.versione_corrente_id
          WHERE f.id = ${fornitore_id}
          FOR UPDATE OF f`;
        if (!f) throw new NotFoundException('Fornitore non trovato');

        let file_nome: string | null = null;
        if (arrivo_id) {
          await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${arrivo_id} FOR UPDATE`;
          const d = await tx.documenti_in_arrivo.findUnique({ where: { id: arrivo_id }, select: { file_nome: true, stato: true, abbinato_bollettino_id: true } });
          if (!d) throw new NotFoundException('Documento non trovato');
          if (d.stato === 'scartato') throw new ConflictException('Il documento è stato scartato: ricaricalo');
          if (d.abbinato_bollettino_id) throw new ConflictException('Il documento è già legato a un altro bollettino');
          file_nome = d.file_nome;
        }

        const gia = await tx.bollettini_testata.findUnique({
          where: { fornitore_id_mese_anno: { fornitore_id, mese: b.mese, anno: b.anno } }, select: { id: true },
        });
        if (gia) throw new ConflictException(`Il bollettino di ${b.mese}/${b.anno} di ${f.fornitore} c'è già: aprilo per verificarlo`);

        const t = await tx.bollettini_testata.create({
          data: { fornitore_id, fornitore_versione_id: f.fornitore_versione_id, mese: b.mese, anno: b.anno },
        });
        // D-140: il PDF legato al bollettino del suo fornitore e mese è «abbinato», come quello di una pratica:
        // «da controllare» si conta con lo stato, senza filtri a parte
        if (arrivo_id) await tx.documenti_in_arrivo.update({ where: { id: arrivo_id }, data: { abbinato_bollettino_id: t.id, stato: 'abbinato', controllato_il: new Date() } });
        // F7-A7: se il PDF è già stato letto, le sue righe entrano nel bollettino nella stessa transazione
        if (arrivo_id) await importaRigheDalPdf(tx, t.id, arrivo_id);
        await logEvent(tx, {
          tipo: 'crud', azione: 'create', entita: 'bollettino', entita_id: t.id, esito: 'successo',
          dettaglio: { etichetta: `${b.mese}/${b.anno} · ${f.fornitore}`, fornitore_id: String(fornitore_id), mese: b.mese, anno: b.anno, file_nome },
        }, ctx);
        return t.id;
      });
    } catch (e) {
      // due invii insieme: il vincolo unico decide, la risposta è la stessa del controllo sopra
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException(`Il bollettino di ${b.mese}/${b.anno} c'è già`);
      throw e;
    }
    return { id: String(id) };
  }
}
