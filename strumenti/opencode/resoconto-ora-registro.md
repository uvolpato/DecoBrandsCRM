# Resoconto pacchetto `ora-registro` — ora del registro nel futuro (fuso sbagliato)

Data: 15/11/2026 · Esecutore: DeepSeek V4 · Gravità: P1 · Rilievo: ora dell'anomalia un'ora nel futuro

## Misure (ora del PC, di Node e del database)

| Fonte | Ora letta | Esito |
|---|---|---|
| PC (Windows, `date`) | 19:44 local (CET, UTC+1) | corretta |
| Node (`new Date().toISOString()`) | 18:44Z | corretta (coincide col PC) |
| Database (`select now()`) | 18:44Z | corretta (`current_setting('TimeZone')` = `Europe/Berlin`) |

PostgreSQL gira nativo su Windows (stessa macchina del backend): i tre orologi coincidono, al millisecondo.
**Nessun orologio sballato** (né PC, né Node, né db, né server di lettura): la differenza è un bug di
serializzazione/parsing dell'adattatore Prisma, non dell'orologio.

## Causa

L'adattatore `@prisma/adapter-pg@7.8.0` (PrismaPg) tratta le date supponendo una sessione UTC, ma la
sessione del server è `Europe/Berlin` (UTC+1):

- **scrittura** (`formatDateTime`, riga ~389): serializza `new Date()` con i componenti UTC **senza
  fuso** (es. `"2026-11-15 18:03:03"`). PostgreSQL interpreta la stringa senza fuso nell'ora della
  sessione (Berlino, UTC+1) → salva **un'ora indietro**.
- **lettura** (`normalize_timestamptz`, riga ~310): prende la stringa di `pg` (già espressa in ora di
  Berlino, `+01`) e la rietichetta `+00:00` → restituisce **un'ora avanti**.

Per i valori scritti da Node e riletti da Prisma (`servizi_esecuzioni.inizio`/`fine`,
`registro.ultimo`/`chiusa_il`/`visto_il`) i due errori si annullano (−1h in scrittura, +1h in lettura
= 0) e l'ora *sembra* giusta. Per `registro.ts` (scritto dal database con `DEFAULT CURRENT_TIMESTAMP`,
corretto) non c'è l'errore di scrittura ma resta quello di lettura (+1h): la pagina Registro mostra
«Quando» = `ts` **un'ora nel futuro**. È esattamente il caso visto da Ugo: anomalia «datata 20:03»
(vero 19:03), mentre le esecuzioni (`inizio`, scritte e rilette da Node) mostrano 19:22–19:28 giuste.

Misura diretta sul database vero (sola lettura): l'anomalia `lettura.non_raggiungibile` #315 ha
`ts` = 18:03Z; letta da `pg` puro è 18:03Z, letta da Prisma è **19:03Z** (+1h).

## Correzione (alla radice)

Sessione PostgreSQL in UTC: `new PrismaPg({ connectionString, options: '-c TimeZone=UTC' })`. Con la
sessione UTC la scrittura senza fuso e la lettura senza fuso tornano entrambe corrette (nessun
annullamento: ogni ora scritta o letta è l'ora vera). Le date di lavoro restano in ora italiana: il
codice le calcola già con `Europe/Rome` (`giornoRoma`, `AT TIME ZONE 'Europe/Rome'`, `quando()`).

File toccati:

- `app/backend/src/prisma.service.ts` — `options: '-c TimeZone=UTC'` (il servizio dell'app) + commento D-181;
- `app/backend/src/superutente.ts`, `app/backend/src/lettura-prova.ts` — stesso `options` (script a mano);
- `app/backend/test/registro.spec.ts` — stesso `options` + nuova prova «l'ora letta dal database coincide con l'ora vera»;
- `app/backend/test/superutente.spec.ts` — stesso `options`.

## Prove lanciate (database `decobrands_test_ora`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (backend) | 0 errori |
| `npx prisma migrate deploy` su `decobrands_test_ora` | tutte le migrazioni |
| `npx jest test/registro.spec.ts` | 7 prove, 0 KO (la nuova prova passa) |
| `npx jest test/registro-api.spec.ts test/sistema.spec.ts test/superutente.spec.ts` | 3 suite, 0 KO |
| `npx jest test/lettura.spec.ts test/anagrafica-integra.spec.ts test/proposta.spec.ts` (da soli) | 13 + 25 + 77, 0 KO |

Nota sul giro completo (`npx jest`): fallisce `versione.spec.ts` (atteso `0.2.0`, trovato `0.2.6`:
preesistente, versione cambiata senza aggiornare la prova) e dà deadlock transitori in `svuota`
(contesa con l'altro pacchetto dell'onda su `decobrands_test_importo_zero`); quelle stesse suite
passano da sole, quindi non dipendono dalla correzione.

## Prove nel browser da lanciare a fine onda

Nessuna: la correzione è solo backend e a comportamento equivalente (le ore ora sono giuste). La
pagina Stato del sistema / Registro va ricontrollata a vista da Claude Code a fine onda.

## Da documentare (per il pacchetto documentazione)

**D-181** (§19): la sessione del database va tenuta in **UTC**. L'adattatore `@prisma/adapter-pg`
scrive le `Date` senza fuso e rilegge i `timestamptz` senza fuso: entrambe le operazioni sono corrette
solo se la sessione è UTC. Con la sessione del server (`Europe/Berlin`) ogni ora scritta da Node
perdeva un'ora e ogni ora letta ne guadagnava una (`ts` del database risultava nel futuro). La
correzione è `options: '-c TimeZone=UTC'` nella connessione Prisma; le date di lavoro restano in
`Europe/Rome`.

**Riga *Perché*** nella spec (sezione dell'ora/delle date): «l'ora di ogni evento e campo letto dal
database coincide con l'ora vera: la sessione Prisma è in UTC (D-181); le date di lavoro e la
visualizzazione restano in ora italiana (`Europe/Rome`).»

**Chiude il rilievo del resoconto 1-13** («Cose aperte» punto 2: data JS salvata indietro con
l'adapter `@prisma/adapter-pg`): risolto con D-181.

## Ora unica (correzioni 1 — allargamento a tutta l'applicazione)

Regola: l'ora la decide il backend col suo orologio (Node, `new Date()` sul server); il browser non
manda mai un'ora che venga salvata (V12), usa l'ora solo per mostrare; ore da macchine esterne solo
come dato informativo; orologio di prova solo nei test. Censimento e correzioni:

### Censimento delle fonti dell'ora

| Fonte | Dove | Cosa | Esito |
|---|---|---|---|
| `new Date()` / `Date.now()` (Node) | `app/backend/src/*` (106 punti: `sistema.ts` 16, `integra.ts` 10, `documenti.ts` 9, `accesso.ts` 7, `lettura.ts` 6, `fornitori.ts`/`casella.ts`/`anagrafica-integra.ts` 5, `solleciti.ts` 4, `registro.ts`/`proposta.ts`/`oggi.ts`/`motore/dati.ts`/`liquidazioni.ts`/`esporta-liquidazione.ts` 3, `soggetti.ts`/`registro-api.ts`/`lettore.ts`/`incassi.ts`/`impostazioni-api.ts`/`clienti.ts`/`bollettino.ts`/`bollettini.ts` 2, `utenti.ts`/`storico.ts`/`pratiche.ts`/`posta.ts`/`eventi.ts` 1) | ora corrente del server | **corretta** (unica fonte, Node) |
| `@default(now())` / `@updatedAt` | `prisma/schema.prisma` (29 colonne `creato_il`, `modificato_il`, `valido_dal`, `ts`, `inizio`, `chiusa_il`, `ricevuto_il`, …) | `CURRENT_TIMESTAMP` del db | **accettata**: il db gira sulla **stessa macchina** del backend, `select now()` == `new Date()` (misurato, stesso millisecondo) |
| `now()` in SQL | `sistema.ts:291,298` | confronto «oggi» con `AT TIME ZONE 'Europe/Rome'` esplicito | corretta (non salva ore) |
| browser `new Date()` | frontend: `FormAgenzia.tsx`, `FormPercentuali.tsx`, `VistaPratica.tsx`, `VistaSubagenti.tsx`, `VistaSoggetti.tsx`, `VistaBollettini.tsx`, `VistaRegistro.tsx`, `liquidazioni/page.tsx`, `Piccoli.tsx` | «oggi»/«domani» per default di data e filtri | **corretta**: unificate a `Europe/Rome` (sotto) |
| ore da macchine esterne (GPU, posta, Integra) | `lettore.ts` (timeout con `Date.now()`), `posta.ts:78` (`ultimo_invio = new Date()`), `integra.ts` (rate con `Date.now()`) | sempre l'orologio Node, mai l'ora della macchina esterna; le date dei documenti lette dall'OCR sono dato informativo del documento, non ora dell'evento | corretta |
| orologio di prova | `motore/dati.ts` `caricaDati(db, oggi = giornoRoma(new Date()))` | `oggi` iniettabile, sovrascritto **solo** nei test; il seed usa date simulate ma solo per il db di prova | corretta (mai attivo in esercizio) |

### Correzioni (frontend: un solo «oggi» in ora italiana)

Aggiunti in `app/frontend/lib/formati.ts`: `giornoRoma(d)` (aaaa-mm-gg in `Europe/Rome`), `oggi()`
e `domani()`. Sostituiti gli 8 punti che calcolavano «oggi»/«domani» ciascuno a modo suo (UTC in
`FormAgenzia`, ora locale in `FormPercentuali`/`VistaPratica`/`VistaSubagenti`/`VistaSoggetti`,
Roma in `VistaRegistro`/`liquidazioni`):

- `FormAgenzia.tsx` — default `valido_dal` (era UTC, ora Roma);
- `FormPercentuali.tsx`, `VistaPratica.tsx`, `VistaSubagenti.tsx` — default data e confronti «finita» (erano ora locale, ora Roma);
- `VistaSoggetti.tsx` — `domani()` per chiudere un recapito (era ora locale, ora Roma);
- `VistaRegistro.tsx`, `liquidazioni/page.tsx` — già Roma, ora riusano l'helper unico;
- `VistaBollettini.tsx` — `new Date()` per l'intervallo anni del selettore (aritmetica di data, non «oggi»: lasciato).

`Piccoli.tsx` `quando()` resta il formattatore unico per la visualizzazione (ora italiana).

### Prove (database `decobrands_test_ora`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` backend | 0 errori |
| `npx tsc --noEmit` frontend | 0 errori |
| `npx jest test/registro.spec.ts test/registro-api.spec.ts` | 2 suite, 21 prove, 0 KO |

## Cose aperte

1. `prisma/*.ts` (`import-storico.ts`, `import-vecchio-crm.ts`, `sistema-dati.ts`) costruiscono ancora
   `new PrismaPg({ connectionString })` senza `options`: file fuori da quelli ammessi; se rilanciati,
   scrivono con lo stesso scarto. Vanno allineati.
2. `versione.spec.ts` fallisce (atteso `0.2.0`, trovato `0.2.6`): preesistente, va allineato alla
   versione del `package.json`.
3. I default «oggi»/«domani» nei campi data (`valido_dal`, `valido_al`, `data` documento) restano
   calcolati dal browser (ora in `Europe/Rome`): sono precompilazioni modificabili e validate dal
   server, non valori calcolati. Se si vuole che anche «oggi» arrivi dal server, serve un pacchetto a
   parte (fuori dal minimo qui richiesto).
