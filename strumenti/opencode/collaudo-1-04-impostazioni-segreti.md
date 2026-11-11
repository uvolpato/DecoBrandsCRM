# Collaudo · Onda 1 · Pacchetto 1-04 — Impostazioni: il segreto vecchio non parte verso un server nuovo

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P1** · Rilievi: A1-01, A8-06 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: —.

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

> **Per questo pacchetto:** In questo pacchetto **solo la parte (a)** (400 «Hai cambiato il server: scrivi di nuovo la password»). La parte (b) (permesso `sistema.connessioni` solo al superutente) aspetta la decisione U2: non toccare `accesso.ts` né la tabella dei permessi. Prove da fare ora: la 1) e la 3) del rilievo; la 2) arriva con la parte (b).

### A8-06 — Esportazioni morte
- Gravità: P3
- Dove: `app/backend/src/impostazioni.ts:313` `elencoSezioni`; `app/backend/src/motore/motore.ts:31` `importoRighe`
- Problema: esportate, mai usate né nel file né altrove (né nelle prove).
- Scenario: chi legge il motore pensa che `importoRighe` sia il modo di sommare le righe e lo usa al posto di quello vero.
- Correzione puntuale: cancellare le due righe.
- Prova che la verifica: `npm run build` e `npm test`.
- Esecutore: DeepSeek V4 Flash — codice morto
- File toccati: `impostazioni.ts`, `motore/motore.ts`
- Dipende da / correlato a: —

> **Per questo pacchetto:** Solo `elencoSezioni` in `impostazioni.ts`.

**Nota del pacchetto.** Decisione U2 → D-115: la parte (b) è il pacchetto `connessioni-superutente`, in un'onda successiva; la riga D-115 la scrive la documentazione di quell'onda.

## File ammessi (solo questi)

- `app/backend/src/impostazioni.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/test/impostazioni.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-04.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/NOTA-RILASCIO.md`
- `app/README.md`
- `app/avvia-esercizio.bat`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/accesso.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/posta.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/src/utenti.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/coda.spec.ts`
- `app/backend/test/correzione.spec.ts`
- `app/backend/test/documenti-lettura.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/backend/test/permessi.spec.ts`
- `app/backend/test/profilo.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
- `app/backend/test/utenti.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CampoRicerca.tsx`
- `app/frontend/componenti/Piccoli.tsx`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/eventi.tsx`
- `app/frontend/next.config.ts`
- `body.json`
- `cookies.txt`
- `prototipo-alternativo/assets/motore.js`
- `prototipo-alternativo/assets/stile.css`
- `prototipo-alternativo/index.html`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_bollettini.py`
- `strumenti/prove/app_bollettino.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_flusso.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_oggi.py`
- `strumenti/prove/app_subagenti.py`

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

Lavora **solo** sul tuo database di prova `decobrands_test_1_04` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_04#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_04','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_04 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-04"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_04`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/impostazioni.spec.ts test/sistema.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-04.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
