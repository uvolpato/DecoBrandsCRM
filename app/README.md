# Decobrands — applicazione

Unica cartella che va in produzione. Analisi, specifica, preventivo e prototipo restano
nella radice del repository e **non** vengono scaricati sul server.

## Struttura (modello Portale B2B Luis — spec §16.3)

```
app/
├── frontend/   Next.js 16 + React 19 + TypeScript   (localhost:8001)
├── backend/    NestJS 11 + Prisma 7                 (localhost:8002)
├── deploy/     Caddyfile e script (avvio dei due processi, pubblicazione)
├── avvia.bat   avvio in sviluppo (8001 e 8002)
├── avvia-esercizio.bat   avvio in esercizio (Caddy compreso)
├── NOTA-RILASCIO.md
└── README.md
```

## Avvio in sviluppo

1. `backend/.env` da `backend/.env.example` (password del database), poi in `backend/`:
   `npm install`, `npx prisma migrate deploy`.
   Le prove (`npm test`) girano su un database a parte, `decobrands_test`, da creare una volta:
   `CREATE DATABASE decobrands_test OWNER decobrands;` e poi, in Git Bash,
   `DATABASE_URL=$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test#') npx prisma migrate deploy`
   (da rifare a ogni migrazione nuova).
   Per lanciare due giri di prove insieme (due agenti, o tu e un agente), dai a ciascuno un
   database suo con `DATABASE_URL_TEST` (es. `DATABASE_URL_TEST=…/decobrands_test_mio`): senza,
   il secondo giro si ferma subito perché il database di prova è già in uso (1-08).
   La migrazione `ricerca_trgm` crea l'estensione `pg_trgm` (trusted in PostgreSQL 13+: la crea
   l'utente proprietario del database, non serve un amministratore).
   Nel `.env` metti anche `DOCUMENTI_DIR` su una cartella locale (es.
   `C:/Progetti/Decobrands_CRM/app/documenti`, che non va nel repository): senza, ogni
   caricamento di documento risponde 500. Per il PDF di liquidazioni e Analisi serve
   LibreOffice: `SOFFICE` (es. `C:\Program Files\LibreOffice\program\soffice.com`); senza,
   basta `soffice.com` nel PATH su Windows o `soffice` su Linux.
2. In `frontend/`: `npm install`.
3. Il primo utente: `npm run build && npm run superutente -- <nome utente> <email> "<nome>"`.
4. `avvia.bat` apre backend (8002) e frontend (8001): http://localhost:8001
   Un solo processo per porta: se `start:dev` dice `EADDRINUSE`, c'è un backend vecchio acceso.

Il backend parte solo con `NODE_ENV` esplicito (`development`, `test` o `production`): senza, si ferma
all'avvio. `avvia.bat` lo imposta già a `development`; in `.env` c'è `NODE_ENV=development` (per
l'esercizio: `production`).

**Prove nel browser** (Playwright, fuori da `app/`, in `strumenti/prove/`), con i due processi
accesi, da `backend/` dopo `npm run build`:

```bash
node ../../strumenti/prove/utenti_prova.js crea p1    # p1-ammi, p1-oper, p1-lett, p1-nuovo (password-di-prova)
python ../../strumenti/prove/app_accesso.py password-di-prova <registro del backend> <cartella schermate> p1-nuovo
python ../../strumenti/prove/app_guscio.py p1 <cartella schermate>
python ../../strumenti/prove/app_utenti.py p1 <cartella schermate>
python ../../strumenti/prove/app_scena.py <cartella schermate>
node ../../strumenti/prove/utenti_prova.js togli      # toglie utenti, eventi e sessioni di prova
```
Il registro del backend serve ad `app_accesso.py` per leggere il link di *password dimenticata*
(in sviluppo la posta va nel registro).

`app_clienti.py` e `app_fornitori.py` provano anche *Cerca in Integra* (D-111): servono `DATABASE_URL`
e `PONTE_URL` nel processo che lancia Python, e la riga di prova si mette e si toglie dal ponte finto
con `node ../../strumenti/prove/integra_prova.js ponte-aggiungi|ponte-togli|pulisci cliente|fornitore <codice> [nome] [piva]`.

`app_documenti.py` simula la scheda di un documento con fornitore solo in Integra (`page.route`): la
prova guarda che il browser non mandi più il `PUT` che cancellava le righe e che aspetti l'import
(D-133). Non serve il ponte vero.

**Demo con i PDF veri** (`strumenti/prove/pdf_veri.js`): da `backend/`, dopo `npm run build` e con
`demo-ammi` creato con `utenti_prova.js`, ricostruisce il flusso ordine → proforma → fattura di
Agri Aggio/Gries dai file di `Documenti Veri/` (ordine `AU276839`, proforma `PR102813`, fattura
`RE193071`) e stampa l'indirizzo della pratica. È idempotente: se ci sono già non duplica. Serve al
database di **sviluppo** (crea il cliente Agri Aggio come farebbe Integra).

**Ponte finto per la sincronizzazione da Integra** (F1-A4, spec §4.5): in `backend/`,
`npm run ponte:prova` crea il database `decobrands_ponte_prova` con lo schema `public` e le
tabelle `integra_v_clienti` e `integra_v_fornitori` riempite con i dati di prova. Poi in `backend/.env`:

```
PONTE_URL=postgresql://crm_lettura:PASSWORD@localhost:5432/decobrands_ponte_prova
```

**Prova del lettore LlamaCloud** (F6-A2, D-67): in `backend/.env` serve `SEGRETI_CHIAVE` (una
stringa lunga e casuale); in *Impostazioni → Server di lettura* si salva la chiave API. Poi, da
`backend/` dopo `npm run build`:

```bash
npm run lettura:prova -- "C:\...\fattura.pdf" [schema.json]
```

Stampa i campi con affidabilità e pagina/riquadro, i crediti usati e cancella il file dal cloud.
Senza `schema.json` usa lo schema vero dei documenti (`SCHEMA_DOCUMENTO` e `PROMPT_DOCUMENTO`).
I parametri del `.env` (come `SEGRETI_CHIAVE`) si leggono in sola lettura in fondo alla sezione delle
Impostazioni; dopo averli cambiati nel file si riavvia il backend (D-70).

**Posta in uscita dal `.env`** (D-209): se ci sono `SMTP_HOST`, `SMTP_USER` e `SMTP_PASS` (e
facoltativi `SMTP_PORT`, 587 se manca o 465 per TLS diretto, e `SMTP_FROM`), il CRM manda le email con
quelli e **ignora** i campi di *Impostazioni → Posta*, che restano per l'altra via (valori salvati nel
database, password cifrata). Per Gmail serve una «password per le app»; se `SMTP_FROM` è un indirizzo
del dominio (es. `ordini@decobrands.it`) deve essere un alias «Invia come» verificato su quell'account,
altrimenti Gmail riscrive il mittente.

Senza `PONTE_URL` la sincronizzazione non parte. Il ponte vero (F0-A8) si prepara con
`strumenti/integra/viste-crm.sql`; il CRM legge solo le viste, mai Integra.

`stile.css` e `public-sans.css` in `frontend/app/stile/` sono **copie** del prototipo
(D-24): si cambiano nel prototipo e si ricopiano, mai qui.

## Avvio in esercizio (senza Docker, F7-A2)

Serve PostgreSQL, Node 24, LibreOffice (PDF delle liquidazioni) e Caddy **≥ 2.5** davanti all'app;
backend e frontend ascoltano **solo su 127.0.0.1** (8002 e 8001) e dall'esterno si passa da Caddy.
Il `deploy/Caddyfile` mette `Strict-Transport-Security` e non dichiara `trusted_proxies`: Caddy
sostituisce `X-Forwarded-For` con l'IP del client, così il limite ai tentativi e il registro vedono
l'IP vero (D-41). Il proxy aspetta 190 s per il PDF (LibreOffice, spec §11).

`crm.decobrands.it` è il dominio vero (D-148). All'inizio l'app gira solo in **intranet** e Caddy
non può prendere il certificato pubblico con la sfida HTTP; al rilascio, con il tecnico della rete,
si sceglie fra `tls internal` (certificato interno da installare sui PC) e la **sfida DNS** (serve
il modulo DNS del fornitore del dominio). Le due strade sono scritte anche nel `Caddyfile`.

1. In `backend/.env`: `NODE_ENV=production`, `DATABASE_URL` del database di esercizio, `DOCUMENTI_DIR`
   su una cartella che sta fuori dal repository, `SOFFICE`, `SEGRETI_CHIAVE` (le chiavi si leggono solo
   da lì) e `SESSION_SECRET`; per la posta in uscita i cinque `SMTP_*` (D-209, vedi sopra).
   `SESSION_SECRET` e `SEGRETI_CHIAVE` devono essere stringhe nuove di
   almeno 32 caratteri (`openssl rand -base64 48`): con i valori d'esempio del `.env.example`
   (`CAMBIARE`) o più corti, con `NODE_ENV=production` il backend non parte (D-145). La prima volta:
   `npx prisma migrate deploy` e `npm run superutente -- …`.
2. `npm ci` (o `npm install`), `npm run build` in `backend/` e in `frontend/`.
3. `avvia-esercizio.bat` apre i due processi con `deploy/avvia-backend.bat` e
   `deploy/avvia-frontend.bat`, poi Caddy (`deploy/Caddyfile`). Aprire l'indirizzo del server sulla
   porta 8082: la 80 la usa il gestionale, la 8082 la prende Caddy.
4. Aggiornamento: `deploy/deploy.cmd` — **doppio click** per l'ultima versione di `main`, oppure
   `deploy.cmd <tag>` per un rilascio preciso; fa anche backup e ritorno indietro (`DEPLOY.md`).
   In alternativa `deploy/pubblica.bat` (git pull, `npm ci`, migrazioni e build, senza backup) e poi
   `avvia-esercizio.bat`. Gli stessi passi a mano sono nella sezione *Pubblicazione*.

`NODE_ENV=production` toglie `'unsafe-eval'` dalla CSP (D-86): le prove Playwright che usano
`wait_for_function` girano solo in sviluppo, non contro l'istanza di esercizio.

## Pubblicazione: solo la cartella `app/`

Primo scaricamento sul server (scarica solo i file di `app/`):

```bash
git clone --filter=blob:none --no-checkout https://github.com/uvolpato/DecoBrandsCRM.git decobrands-crm
cd decobrands-crm
git sparse-checkout init --no-cone
git sparse-checkout set "app/"
git reset --hard HEAD
```

Il primo checkout avviene **dopo** aver impostato il checkout sparso: così i file della radice
(specifica, preventivo, istruzioni per agenti) non arrivano nemmeno sul disco. In modo *cone* git
scarica sempre anche i file di primo livello della radice; `--no-cone` lo evita. Su Windows, in Git
Bash, la barra iniziale `/app/` verrebbe convertita in un percorso di Windows: si usa `app/`, oppure
`MSYS_NO_PATHCONV=1 … "/app/"`.

Aggiornamenti:

```bash
git pull
```

oppure `deploy/deploy.cmd` (doppio click: ultima versione di `main`, con backup, migrazioni e build),
o `deploy/pubblica.bat`, che fa `git pull`, `npm ci`, le migrazioni e la build senza backup. Sul
server la radice contiene solo `app/` (più i file di configurazione git).
