# Resoconto collaudo 1-15 — Messa in esercizio: Caddyfile, HSTS, script, README

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Pacchetto: `strumenti/opencode/collaudo-1-15-deploy.md` · Rilievi: A1-05, A8-05, A9-12, A9-13.

Nessun commit. File toccati solo fra gli ammessi. Le modifiche già presenti in `app/backend`,
`app/frontend` (viste, `lib/`, `stile.css`), `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`,
prototipo e prove sono di altri pacchetti in parallelo e **non** sono state toccate.

## Cosa ho fatto, per rilievo

### A1-05 — Caddyfile, IP vero (D-41) e HSTS

- `app/deploy/Caddyfile` (riscritto, 14 righe):
  - sito `crm.decobrands.it` (segnaposto: commento dice di sostituirlo col dominio vero; Caddy prende
    il certificato da solo);
  - `header Strict-Transport-Security "max-age=31536000; includeSubDomains"` (riga 7);
  - **nessun** `trusted_proxies`: così Caddy ignora `X-Forwarded-For` del client e lo sostituisce
    con l'IP vero (commento righe 3-4);
  - `reverse_proxy 127.0.0.1:8001` con `transport http { read_timeout 190s }` (righe 9-13), per il
    PDF di LibreOffice che può superare i 180 s.
- `app/frontend/next.config.ts:16-25`: le intestazioni delle pagine sono in un array; in
  `NODE_ENV === 'production'` si aggiunge `Strict-Transport-Security` con lo stesso valore. In
  sviluppo resta fuori (il browser non deve ricordare localhost). Helmet continua a metterlo su
  `/api`.
- `app/README.md` (sezione *Avvio in esercizio*, righe 100-105): Caddy **≥ 2.5**, HSTS, niente
  `trusted_proxies` (IP vero, D-41), attesa di 190 s per il PDF.
- `app/NOTA-RILASCIO.md`: Caddy `≥ 2.5` in tabella; passo 6 aggiornato (dominio da sostituire,
  HSTS, `trusted_proxies` assente, `deploy/pubblica.bat`); controlli dopo l'avvio con `curl -I`
  per HSTS e `curl -H 'X-Forwarded-For: …'` per l'IP vero.

### A8-05 — `app/deploy/` vuota ma il README la descrive

Aggiunti i file che mancavano, senza riscrivere il lavoro f7:

- `app/deploy/avvia-backend.bat`: `NODE_ENV=production`, `cd backend`, `npm run start:prod`.
- `app/deploy/avvia-frontend.bat`: `cd frontend`, `npm start` (ascolta solo su 127.0.0.1:8001).
- `app/deploy/pubblica.bat`: `git sparse-checkout set --no-cone "app/"` → `git pull` → `npm ci`,
  `npx prisma migrate deploy`, `npm run build` in `backend/` e `frontend/`; si ferma al primo
  errore e dice di riavviare con `avvia-esercizio.bat`.
- `app/avvia-esercizio.bat`: ora chiama i due script di avvio e poi Caddy; prima `deploy\pubblica.bat`.
- `app/README.md`: struttura aggiornata (deploy, `avvia.bat`, `avvia-esercizio.bat`,
  `NOTA-RILASCIO.md`); avvio in esercizio con i due script; aggiornamento con `deploy/pubblica.bat`;
  sezione *Pubblicazione* aggiornata.
- `app/NOTA-RILASCIO.md`: passo 6 rimanda a `deploy/pubblica.bat`; passo 1 cita lo sparse checkout
  `--no-cone`.

Non ho creato unità systemd: la spec §3.4 dice **server Windows**, quindi script `.bat`.

### A9-12 — README descrive `deploy/` vuota

Corretto: la struttura ora elenca `deploy/` con Caddyfile e script (che esistono davvero),
`avvia.bat`, `avvia-esercizio.bat` e `NOTA-RILASCIO.md`. Non ho scritto «vuota» perché f7 l'ha già
riempita e questo pacchetto aggiunge gli script.

### A9-13 — Sparse checkout in modo cone porta i file di radice

Provato con un clone di prova **fuori dal repository** (cartella in
`%TEMP%\opencode\sparse-prova`, poi cancellata):

- `git clone --filter=blob:none --sparse …` + `git sparse-checkout set app`: la radice conteneva
  **24 file/cartelle** (`specifica-crm-provvigioni.md`, `preventivo-crm-provvigioni.md`,
  `PRD-*.md`, `CLAUDE.md`, `AGENTS.md`, `opencode.json`, `index.html`, …) → confermato il rilievo.
- `git sparse-checkout set --no-cone 'app/'`: radice con **solo** `.git` e `app` → corretto.
- Trappola Windows: in Git Bash il pattern `/app/` viene convertito da MSYS in
  `C:/Program Files/Git/app/` e non seleziona nulla. Funziona `app/` (senza barra iniziale) oppure
  `MSYS_NO_PATHCONV=1 … '/app/'`.

`app/README.md` (sezione *Pubblicazione*, righe 122-142) ora usa `--no-cone "app/"`, spiega perché
e riporta la variante per Git Bash. In `pubblica.bat` lo stesso comando (in `cmd` non c'è
conversione di percorso).

## Prove lanciate

- `cd app/frontend && npx tsc --noEmit` → **0 errori** (uscita vuota, codice 0).
- Clone di prova per A9-13 → esito sopra; cartella temporanea cancellata.
- `git status --short` sui miei file: solo `app/deploy/Caddyfile`, `app/NOTA-RILASCIO.md`,
  `app/README.md`, `app/avvia-esercizio.bat`, `app/frontend/next.config.ts` modificati e i tre
  nuovi `.bat` in `app/deploy/`. Nessun file fuori dagli ammessi toccato da me.
- Caddy **non è installato** su questa macchina: non ho potuto eseguire `caddy validate`; la
  sintassi è quella standard (`header`, `reverse_proxy`, `transport http`, `read_timeout`).
- Backend/frontend non avviati (vietato usare 8001/8002).

## Prove nel browser / a fine onda

Nessuna prova nel browser: il pacchetto non cambia schermate. Da fare **dopo la messa in
esercizio** (manuale, non Playwright):

- `curl -I https://<server>/` → `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- `curl -H 'X-Forwarded-For: 1.2.3.4' -X POST https://<server>/api/accesso/entra …` → nel registro
  l'IP è quello vero, non `1.2.3.4`.
- `caddy validate --config app/deploy/Caddyfile` sul server (Caddy ≥ 2.5).
- Aprire l'app da 1440 e 768 px dopo l'avvio in esercizio (nessuna modifica visiva attesa).

## Da documentare

### Registro §19 — nuova riga (il numero lo assegna il pacchetto documentazione)

> | D-nn | 12/11/2026 | **Messa in esercizio dietro Caddy ≥ 2.5, con HSTS e IP vero.** `app/deploy/Caddyfile` dichiara il dominio (certificato automatico), manda `Strict-Transport-Security` (1 anno, `includeSubDomains`) e **non** dichiara `trusted_proxies`: Caddy sostituisce `X-Forwarded-For` con l'IP del client, quindi il limite per IP e il registro non si fidano di un'intestazione del browser (D-41). Il proxy aspetta 190 s per il PDF di LibreOffice. Le pagine mettono HSTS anche da `next.config.ts`, solo con `NODE_ENV=production`. Pubblicazione solo di `app/` con `git sparse-checkout set --no-cone "app/"` (in modo cone git porta sempre i file di radice), `npm ci`, `prisma migrate deploy`, build: `deploy/pubblica.bat`; avvio dei due processi con `deploy/avvia-backend.bat` e `deploy/avvia-frontend.bat`, orchestrati da `avvia-esercizio.bat`. | Senza `trusted_proxies` Caddy è l'unico che può dire l'IP: con una configurazione larga chi prova password poteva ruotare `X-Forwarded-For` e sfuggire al tetto per IP (D-41), e il registro salvava IP falsi. Senza HSTS il primo accesso da una rete ostile poteva essere declassato a http. Lo sparse checkout in modo cone portava sul server specifica, preventivo e istruzioni per agenti, contro il vincolo «solo `app/`». Caddy < 2.5 non è supportato per queste regole. | Ugo | `app/deploy/Caddyfile`, `app/deploy/avvia-backend.bat`, `app/deploy/avvia-frontend.bat`, `app/deploy/pubblica.bat`, `app/avvia-esercizio.bat`, `app/frontend/next.config.ts`, `app/README.md`, `app/NOTA-RILASCIO.md`, §3.2, §3.4 |

### Spec §3.4 — riga *Perché*

> **Perché.** L'IP vero e HSTS dipendono dall'unico ingresso esterno: Caddy deve sostituire
> `X-Forwarded-For` (niente `trusted_proxies`) e mandare `Strict-Transport-Security`; il limite per
> IP e il registro non devono fidarsi del browser (D-41). Il PDF di LibreOffice può impiegare ~1
> minuto, quindi il proxy aspetta 190 s. Il deploy è solo di `app/`: lo sparse checkout usa
> `--no-cone`, perché il modo cone porta sempre i file di radice (specifica, preventivo, istruzioni
> per agenti). Vedi D-nn.

### Guida in linea (`app/frontend/lib/guida.ts`)

Nessuna modifica: non cambia nulla per chi usa l'app (solo configurazione del server).

### Piano `piano-lavoro-crm.md` — F7-A2

> **Output (aggiornato dal collaudo 1-15):** pubblicazione senza Docker con `deploy/Caddyfile`
> (Caddy ≥ 2.5, HSTS, niente `trusted_proxies`, timeout 190 s per il PDF),
> `deploy/avvia-backend.bat`, `deploy/avvia-frontend.bat` e `deploy/pubblica.bat` (sparse checkout
> `--no-cone` di `app/`, `npm ci`, `prisma migrate deploy`, build), `avvia-esercizio.bat`,
> `NOTA-RILASCIO.md`.
> **Ore:** 0,5 h **da approvare** (collaudo 1-15: Caddyfile/HSTS, tre script, README e nota).

### README / nota di rilascio

Già aggiornati in questo pacchetto (`app/README.md`, `app/NOTA-RILASCIO.md`); il pacchetto
documentazione non deve riscriverli, solo eventualmente citarli nella spec.

## Controlli fatti

- `owasp-security` caricata davvero e riletta sul diff: A02 (misconfiguration) e A04 (TLS)
  coperte da HSTS + Caddy senza `trusted_proxies`; A07 (limite tentativi) non regredisce, perché
  l'IP usato da `TentativiGuard` resta quello vero. Nessun rilievo.
- `npx tsc --noEmit` (frontend) 0 errori; rilettura manuale di script e diff.
- Nessun SQL, migrazione o `schema.prisma` toccato.

## Cose aperte

- `caddy validate` non eseguito (Caddy assente qui): farlo sul server prima dell'avvio.
- Il dominio nel Caddyfile è un segnaposto (`crm.decobrands.it`): va sostituito in esercizio.
- La prova con `curl` su HSTS e IP vero si fa dopo la messa in esercizio.
