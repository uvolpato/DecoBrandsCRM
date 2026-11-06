import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Richiede } from './accesso';
import { type Dati, caricaDati, giornoRoma } from './motore/dati';
import { confermeInRitardo } from './oggi';
import { PrismaService } from './prisma.service';

// Solleciti di conferma (§7.1, §5.12): il testo lo compone il server, un fornitore per scheda, con le
// sue pratiche in ritardo. La copia non scrive un evento: §15.2.3 non ha un codice per i solleciti di
// conferma (non se ne inventa uno).

const euro = (n: Prisma.Decimal) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const dataIt = (s: string) => s.split('-').reverse().join('/');

function testoFornitore(fornitore: string, voci: ReturnType<typeof confermeInRitardo>) {
  const elenco = voci.map((v) =>
    `- ${v.numero} del ${dataIt(v.data)} · ${v.cliente} (vostro codice ${v.codice}) · ${euro(v.importo)} · attesa entro il ${dataIt(v.scadenza)}`).join('\n');
  return `Gentili colleghi di ${fornitore},\n\nnon abbiamo ancora ricevuto la conferma ${voci.length === 1 ? 'del seguente ordine' : 'dei seguenti ordini'}:\n\n${elenco}` +
    '\n\nVi chiediamo di inviarcele appena possibile, indicando eventuali articoli non disponibili.\n\nGrazie,\nDecobrands SRL';
}

@Controller('solleciti')
export class SollecitiController {
  constructor(private readonly db: PrismaService) {}

  /** Testi pronti per fornitore (§7.1): numero, data, cliente, codice del fornitore, importo e data attesa. */
  @Get('conferme')
  @Richiede('provvigioni.consulta')
  async conferme() {
    return sollecitiConferme(await caricaDati(this.db, giornoRoma(new Date())));
  }
}

/** I solleciti di conferma per fornitore; esportata per le prove con il giorno del prototipo. */
export function sollecitiConferme(S: Dati) {
  const voci = confermeInRitardo(S);
  const per = new Map<string, typeof voci>();
  for (const v of voci) {
    const lista = per.get(v.fornitore_id) ?? [];
    lista.push(v);
    per.set(v.fornitore_id, lista);
  }
  return {
    totale: voci.length,
    per_fornitore: [...per.entries()].map(([fornitore_id, vv]) => ({
      fornitore_id, fornitore: vv[0].fornitore, pratiche: vv.length, testo: testoFornitore(vv[0].fornitore, vv),
      voci: vv.map((v) => ({
        id: v.id, numero: v.numero, data: v.data, cliente: v.cliente, codice: v.codice,
        importo: Number(v.importo), attesa: v.scadenza, giorni: v.giorni,
      })),
    })),
  };
}
