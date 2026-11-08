# Collaudo · Onda 1 · Pacchetto 1-14 — Messa in esercizio: Caddyfile, HSTS, script, README

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A1-05, A8-05, A9-12, A9-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

## Rilievi da correggere (testo dei report del collaudo)

### A1-05 — Nel repository manca il Caddyfile: IP vero (D-41) e HSTS non sono garantiti
- Gravità: P2
- Dove: `app/deploy/` (c'è solo `.gitkeep`); `app/backend/src/main.ts:16` (`trust proxy 'loopback'`); `app/frontend/next.config.ts:13-28` (intestazioni senza HSTS)
- Problema: il backend prende l'IP dal primo indirizzo non locale di `X-Forwarded-For`; il rewrite di Next aggiunge e non sostituisce. Tutto dipende da Caddy, che deve **sostituire** l'intestazione del client, ma la sua configurazione non c'è. Per le pagine HSTS non lo mette nessuno: Helmet lo mette solo su `/api`, Next no.
- Scenario: con un Caddy configurato con `trusted_proxies` largo (o una versione vecchia che passa l'intestazione del client), chi prova password manda `X-Forwarded-For: <IP casuale>` a ogni richiesta. Il throttler `ip` (100 in 15 minuti) non lo ferma più e il registro salva IP falsi. Senza HSTS, il primo accesso da una rete ostile può essere declassato a http.
- Correzione puntuale: aggiungere `app/deploy/Caddyfile`: `crm.<dominio> { encode zstd gzip; header Strict-Transport-Security "max-age=31536000; includeSubDomains"; reverse_proxy 127.0.0.1:8001 }`, **senza** `trusted_proxies`, così Caddy sostituisce `X-Forwarded-For` con l'IP del client. Nel README di deploy, la versione minima di Caddy (≥ 2.5). Aggiungere anche `Strict-Transport-Security` in `next.config.ts`, solo con `NODE_ENV === 'production'`.
- Prova che la verifica: dopo la messa in esercizio, `curl -H 'X-Forwarded-For: 1.2.3.4' -X POST https://…/api/accesso/entra …` e controllare nel registro che l'IP sia quello vero; `curl -I https://…/` mostra `Strict-Transport-Security`.
- Esecutore: DeepSeek V4 Flash: configurazione, due file.
- File toccati: `app/deploy/Caddyfile` (nuovo), `app/frontend/next.config.ts`, `app/README.md`
- Dipende da / correlato a: D-41, D-81, spec §3.4

### A8-05 — `app/deploy/` è vuota ma il README la descrive
- Gravità: P2
- Dove: `app/deploy/` (solo `.gitkeep`); `app/README.md:12` («Caddyfile, script di avvio e pubblicazione»)
- Problema: mancano Caddyfile, avvio dei due processi (8001/8002) e pubblicazione: al collaudo finale non c'è
  un modo scritto di mettere in esercizio l'app.
- Scenario: chi installa sul server segue il README, apre `deploy/` e non trova nulla; la configurazione si fa
  a mano e non è ripetibile (stessa CSP? stessi timeout del proxy da 180 s di `next.config.ts`?).
- Correzione puntuale: aggiungere `deploy/Caddyfile` (reverse proxy verso 8001, timeout ≥ 180 s per il PDF),
  due unità systemd (o script) per `npm run start:prod` e `npm run start`, uno script di pubblicazione
  (sparse checkout `app/`, `npm ci`, `prisma migrate deploy`, `build`); oppure correggere il README se il
  deploy si tiene altrove.
- Prova che la verifica: lettura del README su una macchina pulita (manuale).
- Esecutore: DeepSeek V4 Flash — file di configurazione nuovi, nessuna logica
- File toccati: `app/deploy/*`, `app/README.md`
- Dipende da / correlato a: §3.2 spec, A1 (intestazioni di sicurezza su Caddy)

### A9-12 — app/README: `deploy/` descritto con Caddyfile e script, ma è vuoto
- Gravità: P3
- Dove: `app/README.md:12` («deploy/ Caddyfile, script di avvio e pubblicazione») contro `git ls-files app/deploy` = solo `.gitkeep`; `avvia.bat` sta in `app/`, non in `deploy/`.
- Problema: la struttura annunciata non c'è (F7-A2 non ancora fatto).
- Scenario: chi prepara il server cerca il Caddyfile in `app/deploy/` e non lo trova.
- Correzione puntuale: r. 12 → «deploy/ (vuota: Caddyfile e script arrivano con F7-A2)»; aggiungere `avvia.bat` all'albero.
- Prova che la verifica: rilettura.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `app/README.md`
- Dipende da / correlato a: piano F7-A2

### A9-13 — app/README: lo sparse checkout in modo *cone* porta sul server anche i file della radice
- Gravità: P3
- Dove: `app/README.md` sezione *Pubblicazione* (`git clone --filter=blob:none --sparse …` + `git sparse-checkout set app`, poi «Sul server la radice contiene solo `app/`»); piano F7-A2 r. ~289 («la radice con specifica, prototipo e strumenti non va sul server»).
- Problema: in modo *cone* (predefinito con `--sparse`) git include **sempre** i file al primo livello della radice. Sono tracciati 22 file di radice: `specifica-crm-provvigioni.md`, `preventivo-crm-provvigioni.md`, `PRD-*.md`, `riuso-moduli-luis.xlsx`, `CLAUDE.md`, `AGENTS.md`, `opencode.json`, `index.html`, …
- Scenario: deploy secondo il README → specifica, preventivo con i prezzi e istruzioni per agenti finiscono sul server, contro quanto dichiarato.
- Correzione puntuale: sostituire con `git sparse-checkout set --no-cone '/app/'` (oppure dire esplicitamente che i file di radice restano e sono innocui perché Caddy serve solo le porte 8001/8002). Da verificare con una prova su una cartella vuota prima di cambiare il testo.
- Prova che la verifica: clone di prova in una cartella temporanea + `ls` della radice.
- Esecutore: DeepSeek V4 Flash — documentazione (un comando).
- File toccati: `app/README.md`, `piano-lavoro-crm.md` (F7-A2)
- Dipende da / correlato a: A9-12

> **Per questo pacchetto:** Verifica il comando con un clone di prova in una cartella temporanea **fuori** dal repository prima di scriverlo nel README.

**Nota del pacchetto.** Il lavoro f7 (F7-A2) ha già aggiunto `app/deploy/Caddyfile` (senza HSTS), `app/NOTA-RILASCIO.md` e `app/avvia-esercizio.bat`: **completa**, non riscrivere da capo. Il Caddyfile non deve avere `trusted_proxies`. L'attività F7-A2 del piano la aggiorna il pacchetto documentazione.

## File ammessi (solo questi)

- `app/deploy/Caddyfile`
- `app/deploy/*`
- `app/frontend/next.config.ts`
- `app/README.md`
- `app/NOTA-RILASCIO.md`
- `app/avvia-esercizio.bat`
- `strumenti/opencode/resoconto-collaudo-1-14.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/accesso.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
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
- `app/backend/test/profilo.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
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
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Prove da far passare:

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-14.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
