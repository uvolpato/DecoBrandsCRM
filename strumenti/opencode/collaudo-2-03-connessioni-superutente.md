# Collaudo · Onda 2 · Pacchetto 2-03 — Posta, casella e Integra modificabili solo dal superutente

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P1** · Rilievi: A1-01 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 1-04 (`collaudo-1-04-impostazioni-segreti.md`), 1-05 (`collaudo-1-05-sessione-inattivita.md`).

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

## Decisioni di Ugo per questo pacchetto (08/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda.

- **U2 → D-115**: **Connessioni solo al superutente.** Le sezioni Posta, Casella e Integra delle Impostazioni si modificano con il permesso nuovo `sistema.connessioni` (solo superutente); le altre sezioni restano a `sistema.impostazioni`. Se cambia server, porta o utente di una connessione la password va riscritta (400): il segreto salvato non parte mai verso un indirizzo nuovo.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A1-01 — Un amministratore dirotta la posta e prende il posto del superutente
- Gravità: P1
- Dove: `app/backend/src/impostazioni.ts:234-256` (`applica`, ramo `c.segreto`), `app/backend/src/accesso.ts:48-52` (`sistema.impostazioni` anche agli amministratori), `app/backend/src/impostazioni-api.ts:59-80`
- Problema: chi ha `sistema.impostazioni` (anche un amministratore) cambia il server di Posta, Casella o Integra lasciando vuota la password. Il segreto salvato resta e parte verso il server nuovo.
- Scenario: 1) l'amministratore A salva `posta.server = smtp.attaccante.example`, porta 587, password vuota: la password SMTP vera resta e alla prima email (o a *Prova la connessione*) arriva al server di A, in chiaro dopo STARTTLS. Lo stesso vale per `casella.server` (password della casella, letta ogni 2 minuti da `CasellaService`) e per `integra.server` (credenziali del ponte). 2) Con il suo SMTP, A chiama `POST /api/accesso/dimenticata {email del superutente}` (rotta pubblica): l'email con il link passa dal suo server, A apre `/accesso/password/<codice>` e sceglie la password del superutente. A diventa superutente e può gestire gli amministratori, cosa che D-39 e D-45 vietano. Lo stesso funziona con un altro amministratore.
- Correzione puntuale: (a) in `applica`, per le sezioni `casella`, `posta` e `integra`: se cambia `server`, `porta`, `utente` (per `lettura`: `locale_indirizzo`) e il segreto della sezione non arriva nello stesso salvataggio, si risponde 400 «Hai cambiato il server: scrivi di nuovo la password». Il segreto vecchio non si riusa mai con un indirizzo nuovo. (b) La sezione `posta` (e, se Ugo è d'accordo, le connessioni `casella` e `integra`) si modifica solo con un permesso nuovo `sistema.connessioni`, `ruoli: ['superutente']`, controllato in `Impostazioni.salva` per quelle chiavi. Le altre sezioni restano a `sistema.impostazioni`. Solo (a) non basta: l'amministratore può mettere un SMTP suo con una password sua e leggere i link di reset.
- Prova che la verifica: in `app/backend/test/impostazioni.spec.ts` aggiungere: 1) cambio di `posta.server` senza password → 400 e segreto invariato; 2) un amministratore che fa `PUT /api/impostazioni/posta` → 403, il superutente → 200; 3) i dati e la riga di registro di `PUT /api/impostazioni/azienda` da amministratore non cambiano.
- Esecutore: DeepSeek V4: permessi e segreti, backend e frontend (la pagina Impostazioni deve nascondere o bloccare la sezione e dire perché).
- File toccati: `app/backend/src/impostazioni.ts`, `app/backend/src/impostazioni-api.ts`, `app/backend/src/accesso.ts` (PERMESSI), `app/frontend/app/(app)/impostazioni/*`, `app/frontend/lib/guida.ts`, `app/backend/test/impostazioni.spec.ts`, spec §7.15, §8.3, §19
- Dipende da / correlato a: D-39, D-45, D-65; la parte (b) sta anche in *Da decidere (Ugo)*

> **Per questo pacchetto:** In questo pacchetto **solo la parte (b)** (permesso `sistema.connessioni`) e la prova 2). La parte (a) l'ha già fatta il pacchetto `impostazioni-segreti`.

## File ammessi (solo questi)

- `app/backend/src/impostazioni.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/accesso.ts`
- `app/frontend/app/(app)/impostazioni/*`
- `app/backend/test/impostazioni.spec.ts`
- `strumenti/opencode/resoconto-collaudo-2-03.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/package-lock.json`
- `app/backend/package.json`
- `app/backend/prisma/lettura-prova.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/eventi.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettura-prova.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/eventi.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore-volumi.spec.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/layout.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/accesso/esci/page.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/Barra.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/PeriodoMesi.tsx`
- `app/frontend/componenti/Schede.tsx`
- `app/frontend/eslint.config.mjs`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/stati.ts`
- `app/frontend/package-lock.json`
- `app/frontend/package.json`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_accesso.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_sistema.py`

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

Lavora **solo** sul tuo database di prova `decobrands_test_2_03` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_2_03#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_2_03','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_2_03 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-2-03"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_2_03`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/impostazioni.spec.ts test/accesso.spec.ts test/utenti.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_impostazioni.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-03.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
