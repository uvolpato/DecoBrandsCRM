# Collaudo · Onda in attesa · Pacchetto attesa-05 — Stessa fattura su due pratiche solo con conferma «multi-ordine»

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A4-08 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U11 — Stessa fattura su due pratiche (D-54 multi-ordine): serve la conferma esplicita `multi_ordine`?** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a): oggi lo stesso documento in due file diversi raddoppia fatturato e provvigioni. Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo 1-02, 3-01 in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

### A4-08 — La stessa fattura da due file diversi si abbina a due pratiche: fatturato doppio
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:771-779` (`controllaNumero`), `documenti.ts:1048` (`registra`)
- Problema: il doppione per impronta non copre lo stesso documento in due file diversi (PDF dall'email + scansione caricata); il server accetta la stessa fattura su un'altra pratica dello stesso fornitore con la stessa data (regola multi-ordine), e la proposta `doppio` è solo un avviso.
- Scenario: fattura 2026/481 di Gries da 5.000 € arriva per email (PDF) e un collega carica la scansione → due documenti in coda; il primo si abbina a OF/2026/012, il secondo (proposta «doppio» ignorata o non vista) a OF/2026/015 → nessun 409 (stessa data, altra pratica = multi-ordine) → accettata → 10.000 € di fatturato e provvigioni doppie.
- Correzione puntuale: in `registra`, se `fiscale(b.tipo)` e c'è già lo stesso `tipo+numero` del fornitore su un'**altra** pratica, rifiutare con 409 «Fattura già registrata in OF/…: se è una fattura su più ordini conferma» a meno che il corpo porti `multi_ordine: true` (nuovo campo booleano in `NuovoDocumento`, è una scelta della persona, non un valore calcolato: V12 rispettata); la finestra mostra la conferma.
- Prova che la verifica: `test/documenti-pratica.spec.ts` — seconda registrazione senza `multi_ordine` → 409, con → 201.
- Esecutore: DeepSeek V4 — soldi, backend + frontend.
- File toccati: `app/backend/src/documenti.ts`, finestra di abbinamento/registrazione nel frontend (`componenti/Flussi.tsx` o `VistaPratica.tsx`), test sopra, spec §4.2.7.1/§19.
- Dipende da / correlato a: D-54 (multi-ordine) → anche in *Da decidere*.

## File ammessi (solo questi)

- `app/backend/src/documenti.ts`
- `app/frontend/componenti/Flussi.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/backend/test/documenti-pratica.spec.ts`
- `strumenti/opencode/resoconto-collaudo-attesa-05.md`

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

Lavora **solo** sul tuo database di prova `decobrands_test_attesa_05` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_attesa_05#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_attesa_05','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_attesa_05 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-attesa-05"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_attesa_05`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/documenti-pratica.spec.ts test/documenti.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_documenti.py`, `app_pratica.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-05.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
