# Decobrands — applicazione

Unica cartella che va in produzione. Analisi, specifica, preventivo e prototipo restano
nella radice del repository e **non** vengono scaricati sul server.

## Struttura (modello Portale B2B Luis — spec §16.3)

```
app/
├── frontend/   Next.js 16 + React 19 + TypeScript   (localhost:8001)
├── backend/    NestJS 11 + Prisma 7                 (localhost:8002)
├── deploy/     Caddyfile, script di avvio e pubblicazione
└── README.md
```

## Avvio in sviluppo

1. `backend/.env` da `backend/.env.example` (password del database), poi in `backend/`:
   `npm install`, `npx prisma migrate deploy`.
   Le prove (`npm test`) girano su un database a parte, `decobrands_test`, da creare una volta:
   `CREATE DATABASE decobrands_test OWNER decobrands;` e poi, in Git Bash,
   `DATABASE_URL=$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test#') npx prisma migrate deploy`
   (da rifare a ogni migrazione nuova).
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

Senza `PONTE_URL` la sincronizzazione non parte. Il ponte vero (F0-A8) si prepara con
`strumenti/integra/viste-crm.sql`; il CRM legge solo le viste, mai Integra.

`stile.css` e `public-sans.css` in `frontend/app/stile/` sono **copie** del prototipo
(D-24): si cambiano nel prototipo e si ricopiano, mai qui.

## Avvio in esercizio (senza Docker, F7-A2)

Serve PostgreSQL, Node 24, LibreOffice (PDF delle liquidazioni) e Caddy davanti all'app; backend e
frontend ascoltano **solo su 127.0.0.1** (8002 e 8001) e dall'esterno si passa da Caddy.

1. In `backend/.env`: `NODE_ENV=production`, `DATABASE_URL` del database di esercizio, `DOCUMENTI_DIR`
   su una cartella che sta fuori dal repository, `SOFFICE`, `SEGRETI_CHIAVE` (le chiavi si leggono solo
   da lì) e `SESSION_SECRET`. La prima volta: `npx prisma migrate deploy` e `npm run superutente -- …`.
2. `npm ci` (o `npm install`), `npm run build` in `backend/` e in `frontend/`.
3. `avvia-esercizio.bat` apre backend (`npm run start:prod`), frontend (`npm start`) e Caddy
   (`deploy/Caddyfile`). Aprire l'indirizzo del server: la porta 80 la prende Caddy.
4. Aggiornamento: `git pull`, `npm ci`, `npm run build` nei due progetti, `npx prisma migrate deploy`
   in `backend/`, poi riavvio dei tre processi.

`NODE_ENV=production` toglie `'unsafe-eval'` dalla CSP (D-86): le prove Playwright che usano
`wait_for_function` girano solo in sviluppo, non contro l'istanza di esercizio.

## Pubblicazione: solo la cartella `app/`

Primo scaricamento sul server (scarica solo i file di `app/`):

```bash
git clone --filter=blob:none --sparse https://github.com/uvolpato/DecoBrandsCRM.git decobrands-crm
cd decobrands-crm
git sparse-checkout set app
```

Aggiornamenti:

```bash
git pull
```

Sul server la radice contiene solo `app/` (più i file di configurazione git).
