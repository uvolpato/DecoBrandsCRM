# Collaudo · Onda 1 · Pacchetto 1-05 — Sessione: timeout di inattività vero, durata massima, area sconosciuta

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P1** · Rilievi: A1-02, A1-03, A1-07 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0b-06 (`collaudo-0b-06-lista-documenti-cliente.md`: rileggi il codice di `VistaDocumenti.tsx`, cambiato dall'onda 0 bis).

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

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A1-02 — Il timeout di inattività (D-89) non scatta mai sulle pagine che si aggiornano da sole
- Gravità: P1
- Dove: `app/backend/src/accesso.ts:191` (rinnovo di `ultimo`); `app/frontend/app/(app)/sistema/VistaSistema.tsx:88-91` (ogni 30 s); `app/frontend/app/(app)/oggi/VistaOggi.tsx:63-80`, `documenti/VistaDocumenti.tsx:80-87`, `pratiche/VistaPratiche.tsx:106-117`, `bollettini/VistaBollettini.tsx:54…` (rilettura a ogni evento SSE)
- Problema: solo la SSE è esclusa dal rinnovo. Le richieste che il browser fa da solo (polling di Sistema, rilettura su evento SSE) contano come attività della persona.
- Scenario: Matteo lascia aperta la pagina *Oggi* e va via. Ogni volta che un collega entra (`auth.login` → area `utenti`) o arriva un'email (`documento.*`), la SSE manda le aree, *Oggi* (che somma **tutte** le aree) chiama `GET /api/oggi` e il guard porta `ultimo` ad adesso. In un ufficio attivo la sessione non scade mai. Lo stesso vale per *Stato del sistema*, che si rilegge ogni 30 s da sola, anche senza altri utenti. Il computer resta aperto sul CRM tutto il giorno: è proprio il caso che D-89 vuole evitare.
- Correzione puntuale: in `lib/api.ts` aggiungere un'opzione `automatico?: true` che manda l'intestazione `x-automatico: 1`. La passano: il polling di `VistaSistema`, le riletture su evento SSE di Oggi, Documenti, Pratiche e Bollettini, e `sistema/contatore` / `oggi/conteggi` se letti su evento. In `accesso.ts:191`: `if (req.get('x-automatico') !== '1' && !(req.method === 'GET' && req.path === '/api/eventi/flusso')) req.session.ultimo = ora;`. Un'intestazione inventata dal client può solo **accorciare** la propria sessione: nessun rischio.
- Prova che la verifica: `app/backend/test/profilo.spec.ts` (dove sta già D-89): con `SESSION_TIMEOUT_MINUTI` basso, richieste `GET /api/oggi` con `x-automatico: 1` oltre il timeout → 401; senza intestazione → 200.
- Esecutore: DeepSeek V4: backend e frontend su più pagine.
- File toccati: `app/backend/src/accesso.ts`, `app/frontend/lib/api.ts`, `app/frontend/app/(app)/sistema/VistaSistema.tsx`, `oggi/VistaOggi.tsx`, `documenti/VistaDocumenti.tsx`, `pratiche/VistaPratiche.tsx`, `bollettini/VistaBollettini.tsx`, `app/backend/test/profilo.spec.ts`, spec D-89 (*Perché*)
- Dipende da / correlato a: D-89, D-23, D-94; A1-03

> **Per questo pacchetto:** Collegato ad A5-12 (riconnessione della SSE, altro pacchetto): verifica che la rotta `GET /api/eventi/flusso` resti esclusa dal rinnovo anche dopo la tua modifica.

### A1-03 — *Resta collegato* non ha una durata massima: con `rolling: true` i 30 giorni ripartono a ogni richiesta
- Gravità: P2
- Dove: `app/backend/src/main.ts:31` (`rolling: true`), `app/backend/src/accesso.ts:150-163` (`apriSessione`), guard `accesso.ts:165-200`
- Problema: D-89 dice «30 giorni di durata **massima**». Con `rolling: true` il cookie e la riga `sessioni` si allungano di 30 giorni a ogni risposta, e nessun controllo misura il tempo dall'accesso.
- Scenario: un utente con *Resta collegato* lavora ogni giorno (o lascia una pagina aperta, A1-02). La sessione aperta il 1/11 vale ancora a marzo senza che abbia mai rimesso la password. Un cookie rubato non scade mai finché viene usato.
- Correzione puntuale: in `apriSessione` salvare `req.session.creata = Date.now()` (aggiungere `creata?: number` a `SessionData`). Nel guard, dopo il controllo di inattività: `if (req.session.creata && ora - req.session.creata > TRENTA_GIORNI) { destroy; throw new UnauthorizedException('Sessione scaduta: entra di nuovo') }`. Le sessioni senza `creata` (aperte prima della correzione) si chiudono una volta: va bene.
- Prova che la verifica: `app/backend/test/profilo.spec.ts`: sessione con `creata` di 31 giorni fa (si scrive nella riga `sessioni`) → 401.
- Esecutore: DeepSeek V4 Flash: un file più la prova, logica locale.
- File toccati: `app/backend/src/accesso.ts`, `app/backend/test/profilo.spec.ts`
- Dipende da / correlato a: D-89, D-38; A1-02

### A1-07 — `PUT /api/accesso/profilo` con l'area `constructor` o `__proto__` dà un 500
- Gravità: P3
- Dove: `app/backend/src/accesso.ts:280` (`const pagine = PAGINE[area]`)
- Problema: `PAGINE[area]` trova anche le proprietà ereditate da `Object.prototype`.
- Scenario: `PUT /api/accesso/profilo {"ingressi":{"constructor":"/"}}` → `PAGINE.constructor` è `Object`, quindi `pagine.find` non è una funzione → TypeError → 500 e una riga `errore.error` nel registro (anomalia finta in *Stato del sistema*). Basta un qualsiasi utente collegato. Nessun dato esposto.
- Correzione puntuale: `const pagine = Object.hasOwn(PAGINE, area) ? PAGINE[area] : undefined;`
- Prova che la verifica: `app/backend/test/profilo.spec.ts`: quella richiesta → 400 «Area sconosciuta».
- Esecutore: DeepSeek V4 Flash: una riga.
- File toccati: `app/backend/src/accesso.ts`, `app/backend/test/profilo.spec.ts`
- Dipende da / correlato a: D-88

**Nota del pacchetto.** Nelle pagine tocca **solo** le chiamate automatiche (polling e riletture su evento): non cambiare cosa si ricarica né quando (D-23/D-94 sono in discussione, decisione U21).

## File ammessi (solo questi)

- `app/backend/src/accesso.ts`
- `app/backend/test/profilo.spec.ts`
- `app/frontend/lib/api.ts`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `strumenti/opencode/resoconto-collaudo-1-05.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/NOTA-RILASCIO.md`
- `app/README.md`
- `app/avvia-esercizio.bat`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/casella.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
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
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/backend/test/permessi.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
- `app/backend/test/utenti.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CampoRicerca.tsx`
- `app/frontend/componenti/Piccoli.tsx`
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

Lavora **solo** sul tuo database di prova `decobrands_test_1_05` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_05#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_05','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_05 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-05"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_05`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/profilo.spec.ts test/accesso.spec.ts test/eventi.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_profilo.py`, `app_oggi.py`, `app_eventi.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-05.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
