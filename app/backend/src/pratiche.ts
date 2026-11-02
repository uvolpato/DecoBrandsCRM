import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Richiede } from './accesso';
import { caricaDati, type Dati } from './motore/dati';
import { abbinamento, confronto, haVariazioni, importoPratica, r2, statoPratica } from './motore/motore';
import { PrismaService } from './prisma.service';

// Elenco delle pratiche (F2-A1, §7.2, §8.1): filtri, conteggi dei segmenti (D-23), ordinamento e
// paginazione sul server. Lo stato, gli importi e le variazioni si ricavano dal database con il
// motore (§5, §5.8): niente calcoli nel browser (V12, D-28).

const STATI = ['tutte', 'scaduta', 'attesa', 'confermata', 'fatturata', 'variazioni'] as const;
type Stato = (typeof STATI)[number];
const ORDINI = ['numero', 'cliente', 'fornitore', 'data', 'importo', 'stato', 'subagente'] as const;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const ELENCO_ID = /^\d+(,\d+)*$/;

class FiltroPratiche {
  @IsOptional() @IsIn(STATI) stato?: Stato;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  // filtri sulle entità: id separati da virgola (selezione multipla, D-22)
  @IsOptional() @Matches(ELENCO_ID) fornitori?: string;
  @IsOptional() @Matches(ELENCO_ID) clienti?: string;
  @IsOptional() @Matches(ELENCO_ID) subagenti?: string;
  @IsOptional() @Matches(DATA) dal?: string;
  @IsOptional() @Matches(DATA) al?: string;
  @IsOptional() @IsIn(ORDINI) ordina?: (typeof ORDINI)[number];
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) perPagina?: number;
}

const idElenco = (s: string | undefined) => (s ? s.split(',').map((x) => x.trim()) : []);

/** Le variazioni fra le fasi (§5.8): le righe che cambiano e il loro scostamento totale. */
function variazione(p: Dati['pratiche'][number]) {
  return r2(confronto(p).filter((r) => r.varia).reduce((s, r) => s.plus(r.delta), new Prisma.Decimal(0)));
}

const STATO_ORDINE: Record<string, number> = { scaduta: 0, attesa: 1, confermata: 2, fatturata: 3 };
const sommaImporti = (ps: Dati['pratiche']) => ps.reduce((s, p) => s.plus(importoPratica(p)), new Prisma.Decimal(0));

@Controller('pratiche')
export class PraticheController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('provvigioni.consulta')
  async elenco(@Query() q: FiltroPratiche) {
    const S = await caricaDati(this.db);
    const stati = (p: Dati['pratiche'][number]) => statoPratica(S, p);
    const subDi = (p: Dati['pratiche'][number]) => abbinamento(S, p.cliente_id, p.fornitore_id, p.data)?.subagente_id ?? null;
    const fornitore = (p: Dati['pratiche'][number]) => S.fornitori.get(p.fornitore_id)?.nome ?? '';
    const cliente = (p: Dati['pratiche'][number]) => S.clienti.get(p.cliente_id)?.nome ?? '';

    const fornitori = idElenco(q.fornitori), clienti = idElenco(q.clienti), subagenti = idElenco(q.subagenti);
    const testo = (q.q ?? '').trim().toLowerCase();
    const in_ = (elenco: string[], v: string | null) => !elenco.length || (!!v && elenco.includes(v));

    // tutti i filtri tranne lo stato: base dei conteggi dei segmenti (D-23)
    const base = S.pratiche
      .filter((p) => in_(fornitori, p.fornitore_id) && in_(clienti, p.cliente_id) && in_(subagenti, subDi(p)))
      .filter((p) => (!q.dal || p.data >= q.dal) && (!q.al || p.data <= q.al))
      .filter((p) => !testo || [p.numero, cliente(p), fornitore(p), ...p.documenti.map((d) => d.numero)].some((x) => x.toLowerCase().includes(testo)));

    const REGOLE: Record<Stato, (p: Dati['pratiche'][number]) => boolean> = {
      tutte: () => true,
      scaduta: (p) => stati(p).chiave === 'scaduta',
      attesa: (p) => stati(p).chiave === 'attesa',
      confermata: (p) => stati(p).chiave === 'confermata',
      fatturata: (p) => stati(p).chiave === 'fatturata',
      variazioni: (p) => haVariazioni(p),
    };
    const conteggi = Object.fromEntries(STATI.map((s) => [s, base.filter(REGOLE[s]).length])) as Record<Stato, number>;

    const filtrate = base.filter(REGOLE[q.stato ?? 'tutte']);
    const ordina = q.ordina ?? 'stato', dir = q.dir ?? 'asc';
    const valore = (p: Dati['pratiche'][number]): string | number => {
      switch (ordina) {
        case 'numero': return p.numero;
        case 'cliente': return cliente(p);
        case 'fornitore': return fornitore(p);
        case 'data': return p.data;
        case 'importo': return Number(importoPratica(p));
        case 'subagente': return subDi(p) ? (S.subagenti.get(subDi(p)!)?.nome ?? '') : '';
        default: return STATO_ORDINE[stati(p).chiave] ?? 9;
      }
    };
    const ordinate = [...filtrate].sort((a, b) => {
      const x = valore(a), y = valore(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'it');
      return (c || a.numero.localeCompare(b.numero, 'it')) * (dir === 'desc' ? -1 : 1);
    });

    const perPagina = q.perPagina ?? 25;
    const pagine = Math.max(1, Math.ceil(ordinate.length / perPagina));
    const pagina = Math.min(Math.max(q.pagina ?? 0, 0), pagine - 1);
    const righe = ordinate.slice(pagina * perPagina, (pagina + 1) * perPagina).map((p) => {
      const s = stati(p);
      const sub = subDi(p);
      return {
        id: p.id,
        numero: p.numero,
        cliente_id: p.cliente_id,
        cliente: cliente(p),
        fornitore_id: p.fornitore_id,
        fornitore: fornitore(p),
        subagente_id: sub,
        subagente: sub ? (S.subagenti.get(sub)?.nome ?? null) : null,
        data: p.data,
        importo: Number(importoPratica(p)),
        stato: s.chiave,
        nota: s.chiave === 'confermata' ? 'in attesa di fattura'
          : s.chiave === 'scaduta' ? `da ${-s.giorni} ${-s.giorni === 1 ? 'giorno' : 'giorni'}`
            : s.chiave === 'attesa' ? (s.giorni === 0 ? 'scade oggi' : `entro ${s.giorni} ${s.giorni === 1 ? 'giorno' : 'giorni'}`) : null,
        variazioni: haVariazioni(p),
        variazione: Number(variazione(p)),
      };
    });

    return {
      righe,
      totale: ordinate.length,
      conteggi,
      totali: { importo: Number(r2(sommaImporti(ordinate))) },
      pagina,
      pagine,
      per_pagina: perPagina,
    };
  }
}
