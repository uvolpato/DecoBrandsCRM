# Collaudo · Onda in attesa · Pacchetto attesa-03 — Nota di credito sul maturato che segue la sua fattura

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A2-06, A6-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U5 — Nota di credito sul maturato: entra con la sua fattura riconosciuta o aspetta di comparire nel bollettino?** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a). Con (b) il subagente non riceve mai la riduzione (50 € invece di 40 € nell'esempio di A2-06). Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo 1-01, 2-08 in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

## Contesto e regole del progetto

- **Stack**: frontend Next.js 16 + React 19 + TypeScript (`app/frontend`), backend NestJS 11 + Prisma 7 +
  PostgreSQL (`app/backend`, database proprio `decobrands_db`), stile `app/frontend/app/stile/stile.css` copiato dal
  prototipo ufficiale `prototipo-alternativo/` (D-24), Public Sans, niente Bootstrap. Node 24.
- **Leggi prima `CLAUDE.md`** (radice) per intero, poi le righe di `specifica-crm-provvigioni.md` sulle decisioni
  citate nei rilievi (§19, registro D-nn).
- **Prima di leggere codice**: `graphify query "<domanda>"` (grafo in `graphify-out/`), poi solo le righe trovate.
  **Non** lanciare `graphify update .`: altri pacchetti lavorano in parallelo, il grafo lo aggiorna il controllo di fine onda.
- ⚠ **V12 — tutto sul backend**: ogni calcolo (provvigioni, totali, differenze, stati) e ogni operazione sensibile si
  fa sul server dal database; il browser manda solo scelte (id, valori digitati, motivo); il server ricarica,
  ricontrolla, ricalcola e non salva mai un valore calcolato arrivato dal browser.
- ⚠ **V13 — una operazione, una transazione**: se scrivi su più tabelle o più righe legate, una sola
  `prisma.$transaction(async (tx) => …)`, tutto da `tx` (registro compreso); chiusure, verifiche e abbinamenti
  bloccano la riga con `SELECT … FOR UPDATE`; email e lettura dei documenti dopo il commit, il file su disco prima.
- **Italiano** semplice in codice, commenti, messaggi e interfaccia (niente parole inglesi inutili). Nei punti non
  ovvi un commento breve che rimanda alla decisione: `// D-51 §19`, `// V13`.
- Le prove nel browser cercano le schede con `.schede-barra [role=tab]` (anche i segmenti hanno `role=tab`).
- Non c'è telefono (D-44): si prova a 1440 e 768 px.
- I numeri di riga dei report sono del 08/11 mattina: dopo il collaudo è stato committato altro lavoro (f7).
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.

## Rilievi da correggere (testo dei report del collaudo)

### A2-06 — Nota di credito sul maturato: segnata "in attesa di incasso" e mai sottratta al subagente
- Gravità: P2
- Dove: app/backend/src/motore/motore.ts:342-353 (`righeLiquidazione`, ramo maturato)
- Problema: sul maturato un documento entra solo se riconosciuto in un bollettino verificato; una nota di credito che
  il fornitore non elenca (spesso riduce la fattura direttamente) resta per sempre non liquidabile con motivo
  `attesa_incasso` (etichetta "In attesa di incasso: … quando il cliente paga", falsa per una NC). Incoerente con
  `riconcilia`, dove la stessa NC assente è "mancante" (solo le fatture diventano `attesa_incasso`, :252).
- Scenario: fornitore maturato, F 1.000 € (febbraio) e NC −200 € (febbraio) sulla stessa fattura; il bollettino di
  marzo riconosce F (a 1.000) → subagente 50 €; la NC non compare mai → il subagente non riceve mai −10 €. Totale pagato
  50 € invece di 40 €.
- Correzione puntuale: decisione di regola (vedi *Da decidere*); se la NC segue la sua fattura, in `righeLiquidazione`
  per `d.tipo === 'nota_credito'` sul maturato usare `riconosciutoIn` della fattura `d.fattura_id`; e motivo
  `attesa_incasso` solo per `d.tipo === 'fattura'`.
- Prova che la verifica: app/backend/test/motore.spec.ts nuovo caso "maturato: NC entra con la sua fattura riconosciuta".
- Esecutore: DeepSeek V4 — regola delle provvigioni
- File toccati: app/backend/src/motore/motore.ts, prototipo-alternativo/assets/motore.js, app/backend/test/motore.spec.ts
- Dipende da / correlato a: §5.14, D-11 — da decidere prima

### A6-13 — Prova da aggiungere: nota di credito sul maturato e storno senza documento
- Gravità: P2
- Dove: `app/backend/src/motore/motore.ts` (riconoscimento maturato, storni); prove `test/motore.spec.ts`, `test/liquidazioni.spec.ts`
- Problema: il maturato è provato solo per fatture (`motore.spec.ts:201`); la nota di credito di un fornitore sul maturato e lo storno su riga di bollettino senza `documento_id` non hanno prove.
- Scenario da provare: Gries (maturato), nota di credito −500 € su una fattura riconosciuta → la quota del subagente scende nel trimestre del bollettino che la riconosce (non resta «in attesa d'incasso»); riga di storno con solo il numero `F-2026-0858` mentre esiste lo stesso numero nel 2025 → lega il documento del 2026.
- Correzione puntuale: due `it` in `motore.spec.ts` sui dati del seed con un documento aggiunto nella prova.
- Prova che la verifica: `npx jest test/motore.spec.ts test/liquidazioni.spec.ts`.
- Esecutore: DeepSeek V4 Flash — prove (le correzioni sono di A2).
- File toccati: `app/backend/test/motore.spec.ts`
- Dipende da / correlato a: A2-05, A2-06, D-11, §5.14

> **Per questo pacchetto:** Solo la **prima** prova (nota di credito sul maturato).

## File ammessi (solo questi)

- `app/backend/src/motore/motore.ts`
- `prototipo-alternativo/assets/motore.js`
- `app/backend/test/motore.spec.ts`
- `strumenti/opencode/resoconto-collaudo-attesa-03.md`

## File vietati

Da completare da Claude Code al lancio (file degli altri pacchetti della stessa onda).

Documentazione (la scrive il **pacchetto documentazione** dell'onda, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

- `specifica-crm-provvigioni.md`
- `app/frontend/lib/guida.ts`
- `piano-lavoro-crm.md`
- `PRD-crm-provvigioni.md`
- `prototipo-alternativo/LEGGIMI.md`
- `prototipo-alternativo/assets/guida.js`
- `app/README.md`
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Lavora **solo** sul tuo database di prova `decobrands_test_attesa_03` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_attesa_03#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_attesa_03','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_attesa_03 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-attesa-03"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_attesa_03`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/motore.spec.ts test/liquidazioni.spec.ts test/bollettino.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-03.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
