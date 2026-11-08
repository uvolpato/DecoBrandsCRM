import { Controller, Get, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { permessiDi, Richiede } from './accesso';
import { erroriOggi } from './registro-api';
import { liquidazione } from './liquidazioni';
import { type Dati, caricaDati, giornoRoma } from './motore/dati';
import { abbinamento, analisiTrimestre, giorni, importoPratica, pagamentiDaSollecitare, piuGiorni, riconcilia, statoPratica, trimestre } from './motore/motore';
import { PrismaService } from './prisma.service';

// Pagina Oggi (F5-A1, §7.1): tutto quello che chiede un'azione, calcolato dal server (V12, D-28).
// I gruppi sono quelli del prototipo (M.daFare), nell'ordine di urgenza; il gruppo Documenti resta
// vuoto finché l'ingresso dei documenti arriva con F6 (`disponibile: false`, nessun numero finto).
// I testi dei solleciti e delle righe sono composti qui: il browser mostra e basta.

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const euro = (n: Prisma.Decimal | number) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const dataIt = (s: string) => s.split('-').reverse().join('/');
const dataLunga = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });

/** Una conferma in ritardo, con quello che serve al gruppo di Oggi e al testo del sollecito. */
export interface Scaduta {
  id: string; numero: string; cliente_id: string; cliente: string; fornitore_id: string; fornitore: string;
  data: string; scadenza: string; giorni: number; importo: Prisma.Decimal; codice: string;
}

/** Conferme in ritardo dal motore (`statoPratica`): una sola regola, quella del prototipo (§5.12). */
export function confermeInRitardo(S: Dati): Scaduta[] {
  const out: Scaduta[] = [];
  for (const p of S.pratiche) {
    const s = statoPratica(S, p);
    if (s.chiave !== 'scaduta' || !s.scadenza || s.giorni == null) continue;
    const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
    out.push({
      id: p.id, numero: p.numero, cliente_id: p.cliente_id, cliente: S.clienti.get(p.cliente_id)?.nome ?? '',
      fornitore_id: p.fornitore_id, fornitore: S.fornitori.get(p.fornitore_id)?.nome ?? '', data: p.data,
      scadenza: s.scadenza, giorni: -s.giorni, importo: importoPratica(p), codice: ab?.codice ?? '—',
    });
  }
  return out.sort((a, b) => b.giorni - a.giorni || a.numero.localeCompare(b.numero));
}

type MeseBollettino = {
  fornitore_id: bigint; fornitore: string; mese: number; bollettino_id: bigint | null; stato: string | null;
  righe: number; documenti: number; entro: string; fine: string;
};

/** Mesi dell'anno in corso con il bollettino (o no) di ogni fornitore attivo: la stessa regola della
 *  matrice (§5.6, D-03), in SQL perché l'anno intero è troppo per il motore. */
async function mesiBollettini(db: PrismaService, oggi: string): Promise<MeseBollettino[]> {
  const anno = Number(oggi.slice(0, 4));
  return db.$queryRaw<MeseBollettino[]>`
    WITH periodi AS (
      SELECT m AS mese, make_date(${anno}, m, 1) AS inizio,
             (make_date(${anno}, m, 1) + interval '1 month - 1 day')::date AS fine
      FROM generate_series(1, 12) m
    )
    SELECT f.id AS fornitore_id, coalesce(fv.ragione_sociale, '') AS fornitore, p.mese,
           b.id AS bollettino_id, b.stato,
           coalesce((SELECT count(*) FROM bollettini_righe r WHERE r.testata_id = b.id), 0)::int AS righe,
           (SELECT count(*) FROM ordini_fornitore_documenti d
              JOIN ordini_fornitore_testata t ON t.id = d.testata_id
             WHERE t.fornitore_id = f.id AND d.tipo IN ('fattura', 'nota_credito')
               AND d.data BETWEEN p.inizio AND p.fine)::int AS documenti,
           to_char(p.inizio + interval '1 month'
                   + (least(28, greatest(1, f.giorno_bollettino)) - 1) * interval '1 day', 'YYYY-MM-DD') AS entro,
           to_char(p.fine, 'YYYY-MM-DD') AS fine
    FROM fornitori f
    JOIN fornitori_versioni fv ON fv.id = f.versione_corrente_id
    CROSS JOIN periodi p
    LEFT JOIN bollettini_testata b ON b.fornitore_id = f.id AND b.anno = ${anno} AND b.mese = p.mese
    WHERE f.attivo
    ORDER BY fv.ragione_sociale, p.mese`;
}

const aperto = (m: MeseBollettino) => m.bollettino_id != null && m.stato !== 'verificato' && m.stato !== 'contestato';
const mancante = (m: MeseBollettino, oggi: string) => m.bollettino_id == null && m.fine < oggi && m.documenti > 0 && oggi > m.entro;

/** I numeri accanto alle voci del menu (§7.1, come CRM.Barra del prototipo): Oggi è quello che
 *  chiede un'azione, Documenti i file da controllare, Pratiche le conferme scadute, Bollettini
 *  gli aperti e i mancanti. Calcolati qui dal database (V12): il browser mostra e basta. */
export async function conteggiBarra(db: PrismaService, S: Dati) {
  const conferme = confermeInRitardo(S).length;
  const pagamenti = pagamentiDaSollecitare(S).length;
  const pratiche = S.pratiche.filter((p) => statoPratica(S, p).chiave === 'scaduta').length;
  const mesi = await mesiBollettini(db, S.oggi);
  const bollettini = mesi.filter(aperto).length + mesi.filter((m) => mancante(m, S.oggi)).length;
  const documenti = await db.documenti_in_arrivo.count({
    where: { stato: { not: 'scartato' }, abbinato_pratica_id: null, abbinato_bollettino_id: null },
  });
  return { oggi: documenti + conferme + bollettini + pagamenti, documenti, pratiche, bollettini };
}

/** Quello che la pagina Oggi mostra, calcolato una volta sola; esportata per le prove con il giorno del prototipo.
 *  `conErrori`: il contatore *Errori di oggi* (§15.6) solo per chi ha `sistema.registro`. */
export async function calcolaOggi(db: PrismaService, S: Dati, conErrori = false) {
  const oggi = S.oggi;
  const conferme = confermeInRitardo(S);
  const pagamenti = pagamentiDaSollecitare(S);
  const mesi = await mesiBollettini(db, oggi);
  const aperti = mesi.filter(aperto);
  const mancanti = mesi.filter((m) => mancante(m, oggi));
  // aperti: la riconciliazione dice se c'è qualcosa da decidere o solo da chiudere (come il prototipo)
  const vociBollettini = aperti.map((m) => {
    const b = S.bollettini.find((x) => x.id === String(m.bollettino_id));
    const r = b ? riconcilia(S, b) : null;
    return { mese: m.mese, fornitore: m.fornitore, id: String(m.bollettino_id), aperte: r?.aperte ?? null };
  });
  const daDecidere = await db.documenti_in_arrivo.findMany({
    where: { stato: { not: 'scartato' }, abbinato_pratica_id: null, abbinato_bollettino_id: null },
    orderBy: { ricevuto_il: 'asc' },
    select: {
      id: true, tipo: true, livello: true,
      fornitore: { select: { ragione_sociale: true } },
      campi: { where: { campo: { in: ['numero', 'mese', 'anno'] } }, select: { campo: true, valore_finale: true, valore_letto: true } },
    },
  });
  const documenti = daDecidere.length;

  const fornitoriConferme = new Set(conferme.map((c) => c.fornitore_id)).size;
  const clientiPagamenti = new Set(pagamenti.map((p) => p.cliente_id)).size;
  const piuVecchia = (xs: { giorni: number }[]) => Math.max(0, ...xs.map((x) => x.giorni));
  const a = Number(oggi.slice(0, 4)), t = trimestre(oggi);
  // shortcut: `liquidazione` ricarica i dati per non duplicare lo stato del trimestre; con molti dati
  // si potrà passargli la stessa `S`
  const liquid = await liquidazione(db, a, t, oggi);
  const atteso = analisiTrimestre(S, a, t).totale.prese;
  const riconosciuto = S.bollettini
    .filter((b) => b.anno === a && Math.floor((b.mese - 1) / 3) + 1 === t)
    .flatMap((b) => b.righe)
    .reduce((s, r) => s.plus(r.importo), new Prisma.Decimal(0));

  const fare = conferme.length + documenti + aperti.length + mancanti.length + pagamenti.length;
  const fino = piuGiorni(oggi, 15);
  const scadenze: { data: string; testo: string; dettaglio: string; href: string; giorni: number }[] = [];
  for (const p of S.pratiche) {
    const s = statoPratica(S, p);
    if (s.chiave === 'attesa' && s.scadenza && s.scadenza <= fino) {
      scadenze.push({
        data: s.scadenza, testo: `Conferma attesa di ${p.numero}`,
        dettaglio: `${S.fornitori.get(p.fornitore_id)?.nome ?? ''} · ${S.clienti.get(p.cliente_id)?.nome ?? ''}`,
        href: '/pratiche/' + p.id, giorni: giorni(oggi, s.scadenza),
      });
    }
  }
  const meseScorso = Number(oggi.slice(5, 7)) === 1 ? 12 : Number(oggi.slice(5, 7)) - 1;
  for (const m of mesi) {
    // shortcut: a gennaio il bollettino di dicembre dell'anno prima non entra (i mesi sono quelli dell'anno in corso);
    // si aggiunge quando il CRM avrà più di un anno di storico
    if (m.mese !== meseScorso) continue;
    if (m.bollettino_id == null && m.fine < oggi && m.documenti > 0 && oggi <= m.entro && m.entro <= fino) {
      scadenze.push({
        data: m.entro, testo: `Bollettino di ${MESI[m.mese - 1]} di ${m.fornitore}`,
        dettaglio: `${m.documenti} ${m.documenti === 1 ? 'documento atteso' : 'documenti attesi'}`, href: '/bollettini',
        giorni: giorni(oggi, m.entro),
      });
    }
  }
  const lim = { a: liquid.trimestri[t - 1].a };
  if (lim.a <= piuGiorni(oggi, 31)) {
    scadenze.push({
      data: lim.a, testo: `Fine del ${t}° trimestre`, dettaglio: 'poi si chiude la liquidazione ai subagenti',
      href: `/liquidazioni/${a}/${t}`, giorni: giorni(oggi, lim.a),
    });
  }
  scadenze.sort((x, y) => x.data.localeCompare(y.data));

  const operazioni = await db.registro.findMany({
    where: { genere: 'evento' },
    orderBy: { id: 'desc' }, take: 6,
    select: { codice: true, dettaglio: true, ts: true, utente: { select: { nome: true } } },
  });
  // §15.6: il contatore degli errori di oggi solo per chi apre il registro (sistema.registro)
  const errori = conErrori ? await erroriOggi(db, oggi) : null;

  const riquadri = [
    {
      id: 'conferme', etichetta: 'Conferme in ritardo', valore: String(conferme.length),
      variante: conferme.length ? 'errore' : 'ok',
      dettagli: conferme.length
        ? [{ testo: `la più vecchia da ${piuVecchia(conferme)} giorni` }, { testo: `${fornitoriConferme} ${fornitoriConferme === 1 ? 'fornitore da sollecitare' : 'fornitori da sollecitare'}` }]
        : [{ testo: 'nessuna' }],
    },
    {
      id: 'documenti', etichetta: 'Documenti in coda', valore: String(documenti), variante: documenti ? 'primario' : 'ok',
      dettagli: [{ testo: documenti ? 'da controllare e abbinare' : 'nessun documento in coda' }],
      disponibile: true,
    },
    {
      id: 'bollettini', etichetta: 'Bollettini', valore: String(aperti.length + mancanti.length),
      variante: aperti.length + mancanti.length ? 'attesa' : 'ok',
      dettagli: [{ testo: `${aperti.length} da verificare o chiudere` }, { testo: `${mancanti.length} da sollecitare` }],
    },
    {
      id: 'pagamenti', etichetta: 'Pagamenti dei clienti', valore: String(pagamenti.length),
      variante: pagamenti.length ? 'errore' : 'ok',
      dettagli: pagamenti.length
        ? [{ testo: `${clientiPagamenti} ${clientiPagamenti === 1 ? 'cliente da sollecitare' : 'clienti da sollecitare'}` }, { testo: `il più vecchio da ${piuVecchia(pagamenti.map((p) => ({ giorni: p.stato.giorni })))} giorni` }]
        : [{ testo: 'nessuna fattura non pagata' }],
    },
  ];

  const TIPO_DOC: Record<string, string> = {
    ordine: 'ordine', conferma: 'conferma', proforma: 'proforma', fattura: 'fattura',
    nota_credito: 'nota di credito', pagamento: 'pagamento', bollettino: 'bollettino', altro: 'documento',
  };
  const valore = (d: (typeof daDecidere)[number], campo: string) => {
    const c = d.campi.find((x) => x.campo === campo);
    return c?.valore_finale ?? c?.valore_letto ?? null;
  };
  const vociDocumenti = daDecidere.map((d) => {
    const numero = valore(d, 'numero');
    const mese = Number(valore(d, 'mese'));
    const nomeMese = Number.isInteger(mese) && mese >= 1 && mese <= 12 ? MESI[mese - 1] : '';
    const fornitore = d.fornitore?.ragione_sociale ?? 'fornitore non riconosciuto';
    const titolo = d.tipo === 'bollettino'
      ? `Registra il bollettino di ${nomeMese} di ${fornitore}`.replace('  ', ' ')
      : d.tipo === 'ordine'
        ? `Apri la pratica dell’ordine ${numero ?? ''}`.trim()
        : `Abbina ${TIPO_DOC[d.tipo ?? 'altro'] ?? 'documento'} ${numero ?? ''}`.trim();
    return {
      tipo: (d.livello === 'bassa' ? 'errore' : 'primario') as 'errore' | 'primario',
      titolo,
      dettaglio: `${fornitore} · ${d.livello === 'bassa' ? 'affidabilità bassa' : 'da controllare'}`,
      href: '/documenti/' + d.id,
      azione: d.tipo === 'ordine' || d.tipo === 'bollettino' ? 'Apri' : 'Abbina',
    };
  });

  const gruppi = [
    {
      id: 'conferme', titolo: 'Conferme in ritardo', variante: 'errore', tipo: 'errore', disponibile: true, conta: conferme.length,
      vuoto: 'Nessuna conferma in ritardo.',
      voci: conferme.map((c) => ({
        tipo: 'errore', titolo: `Sollecita la conferma di ${c.numero}`,
        dettaglio: `${c.fornitore} · ${c.cliente} · in ritardo da ${c.giorni} giorni`,
        href: '/pratiche/' + c.id, azione: 'Apri', extra: `${c.giorni} gg`,
      })),
    },
    {
      id: 'documenti', titolo: 'Documenti da decidere', variante: 'primario', tipo: 'primario', disponibile: true, conta: vociDocumenti.length,
      voci: vociDocumenti, vuoto: 'Nessun documento richiede una decisione.',
    },
    {
      id: 'bollettini', titolo: 'Bollettini', variante: 'attesa', tipo: 'attesa', disponibile: true, conta: aperti.length + mancanti.length,
      vuoto: 'Nessun bollettino da verificare.',
      voci: [
        ...vociBollettini.map((v) => ({
          tipo: 'attesa',
          titolo: v.aperte ? `Verifica il bollettino di ${MESI[v.mese - 1]} di ${v.fornitore}` : `Chiudi il bollettino di ${MESI[v.mese - 1]} di ${v.fornitore}`,
          dettaglio: v.aperte == null ? 'da verificare' : v.aperte === 1 ? '1 riga non quadra' : v.aperte > 0 ? `${v.aperte} righe non quadrano` : 'tutte le righe quadrano',
          href: '/bollettini/' + v.id, azione: v.aperte ? 'Verifica' : 'Chiudi',
        })),
        ...mancanti.map((m) => ({
          tipo: 'errore', titolo: `Sollecita il bollettino di ${MESI[m.mese - 1]} di ${m.fornitore}`,
          dettaglio: `${m.documenti} ${m.documenti === 1 ? 'documento atteso' : 'documenti attesi'}`, href: '/bollettini', azione: 'Vedi',
        })),
      ],
    },
    {
      id: 'pagamenti', titolo: 'Pagamenti da sollecitare', variante: 'errore', tipo: 'errore', disponibile: true, conta: pagamenti.length,
      vuoto: 'Nessuna fattura non pagata.',
      voci: pagamenti.map((p) => ({
        tipo: 'errore',
        titolo: (p.stato.stato === 'insoluta' ? 'Sollecita il pagamento della fattura ' : 'Verifica l’incasso della fattura ') + p.numero,
        dettaglio: `${p.cliente} · ${p.fornitore} · ${euro(p.importo)} · ${p.stato.giorni} giorni` +
          (p.stato.solleciti ? ` · sollecitata ${p.stato.solleciti} ${p.stato.solleciti === 1 ? 'volta' : 'volte'}` : ''),
        href: '/pratiche/' + p.pratica_id, azione: 'Apri', extra: `${p.stato.giorni} gg`,
      })),
    },
  ];

  return {
    oggi, aggiornato_il: new Date().toISOString(),
    sottotitolo: dataLunga(oggi) + ' · ' + (fare ? `${fare} ${fare === 1 ? 'cosa da fare' : 'cose da fare'}` : 'niente in sospeso'),
    riquadri, gruppi, scadenze,
    operazioni: operazioni.map((r) => ({
      testo: (r.dettaglio as { etichetta?: string } | null)?.etichetta ?? r.codice,
      quando: r.ts.toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
      chi: r.utente?.nome ?? 'Sistema',
    })),
    registro_href: '/registro',
    ...(errori == null ? {} : { errori_oggi: { conteggio: errori, href: '/registro?da=oggi' } }),
    trimestre: {
      anno: a, trimestre: t, nome: liquid.trimestri[t - 1].nome, etichetta: liquid.stato.etichetta,
      avanzamento: liquid.stato.avanzamento, giorni: giorni(oggi, lim.a),
      atteso: Number(atteso), riconosciuto: Number(riconosciuto),
      da_liquidare: liquid.riepilogo?.provvigione ?? 0, bloccato: liquid.riepilogo?.in_attesa ?? 0,
      href: `/liquidazioni/${a}/${t}`,
    },
  };
}

@Controller('oggi')
export class OggiController {
  constructor(private readonly db: PrismaService) {}

  /** I numeri del menu (barra laterale): Oggi, Documenti, Pratiche, Bollettini. */
  @Get('conteggi')
  @Richiede('provvigioni.consulta')
  async conteggi() {
    const S = await caricaDati(this.db, giornoRoma(new Date()));
    return conteggiBarra(this.db, S);
  }

  /** La pagina Oggi (§7.1): riquadri, gruppi, scadenze, ultime operazioni e trimestre in corso. */
  @Get()
  @Richiede('provvigioni.consulta')
  async pagina(@Req() req: Request) {
    const oggi = giornoRoma(new Date());
    const S = await caricaDati(this.db, oggi);
    const conErrori = permessiDi(req.utente!.ruolo, req.livelli ?? {}).includes('sistema.registro');
    return calcolaOggi(this.db, S, conErrori);
  }
}
