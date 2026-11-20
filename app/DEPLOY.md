# Deploy sul server `decobrands` — documento e piano

Stato: **proposta**, da approvare (19/11/2026). Modello: come il Portale B2B Luis — **due file
`.cmd`** eseguiti **sul server Windows**: `setup.cmd` (una volta) e `deploy.cmd` (a ogni
rilascio: con un tag scarica quel rilascio, con il doppio click — nessun argomento — l'ultima
versione di `main`). Niente Docker, niente script Linux. Sul server si scarica **solo `app/`**:
specifica, piano, preventivo, prototipo e strumenti restano nel repository di sviluppo.

## 1. Com'è adesso

- `app/` è l'unica cartella che va in produzione (`app/README.md`, spec §16.3).
- Ci sono già, pensati per Windows: `pubblica.bat`, `avvia-esercizio.bat` e `Caddyfile`.
- `setup.cmd` fa la prima installazione; `deploy.cmd <tag>` gli aggiornamenti (backup, migrazioni,
  build, riavvio, prova di salute, ritorno al rilascio precedente).

## 2. I file (tutti `.cmd`, sul server Windows)

```
app/deploy/
├── scarica.cmd               git pull / checkout di un tag: SOLO app/ (checkout sparso)
├── setup.cmd                 una volta: prerequisiti, cartelle, .env, npm ci, build,
│                              migrazioni, primo utente, servizi Windows, Caddy, prova
├── deploy.cmd [tag]           a ogni rilascio: backup, tag (o main), npm ci (se serve), migrazioni,
│                              build, riavvio, prova di salute, ritorno indietro se non risponde
├── backup.cmd                 pg_dump + copia documenti, rotazione 14 giorni (02:00 ogni notte)
├── node24.bat                 mette davanti al PATH la Node 24 LTS (il server ha anche la 26)
├── scrivi-env.ps1             scrive backend\.env con segreti nuovi (lo chiama setup.cmd)
├── salute.ps1                 prova di salute 8002 + 8001 (usata da setup e deploy)
├── avvia-servizi.cmd          avvia/riavvia i servizi (NSSM o attività pianificate)
├── ferma-servizi.cmd          li ferma prima di npm ci e della build (EPERM sui file aperti)
├── servizio-backend.bat       avvio senza finestra, usato dai servizi
├── servizio-frontend.bat      idem per Next
├── manutenzione\              pagina di attesa durante i deploy: index.html + logo + servi.js (D-210, D-212)
└── Caddyfile                  due blocchi: intranet :8082 attivo, pubblico commentato
```

Percorsi (costanti in testa ai `.cmd`):

```
C:\Decobrands\              checkout sparso (git vede solo app\)
C:\Decobrands\app\          backend\, frontend\, deploy\
C:\Decobrands\documenti\        DOCUMENTI_DIR: PDF arrivati, non tracciata da git
C:\Decobrands\config\           copia di sicurezza del .env (il file vivo resta in app\backend\.env)
C:\Decobrands\backup\           dump del database, copia dei documenti, deploy.log
C:\Decobrands\log\              log dei servizi (solo con NSSM)
```

## 3. Primo scaricamento (una volta, da `cmd.exe`)

Nel working tree entra **solo `app/`** (il primo checkout avviene dopo aver impostato il checkout
sparso; `--filter=blob:none` evita di scaricare i file delle altre cartelle). Sul disco restano
`app\` e la cartella `.git` dei metadati, circa 2 MB.

```bat
git clone --filter=blob:none --no-checkout https://github.com/uvolpato/DecoBrandsCRM.git C:\Decobrands
cd /d C:\Decobrands
git sparse-checkout init --no-cone
git sparse-checkout set "app/"
git reset --hard HEAD
```

Poi, per installare: `cd C:\Decobrands\app\deploy` e `setup.cmd` (come amministratore).

Aggiornamenti: `deploy.cmd v0.2.14`, oppure **doppio click su `deploy.cmd`** per l'ultima versione
di `main` (la finestra resta aperta con l'esito). A mano, l'equivalente è `git pull` (o
`scarica.cmd`) dentro
`C:\Decobrands`: il checkout sparso limita tutto a `app/`.

## 4. Prerequisiti (a mano, una volta)

`setup.cmd` **non** installa niente da solo: controlla e dice cosa manca.

- **Node 24 LTS** (24.15 o successivo). La 26 non è supportata da Prisma 7. `node24.bat` fa usare
  la 24 anche se un'altra versione è prima nel PATH.
- **Git per Windows**.
- **PostgreSQL** (qui: istanza 18 sulla porta **5433**; la 17 sulla 5432 non si tocca).
  Database `decobrands_db` e utente `decobrands` già creati.
- **Caddy** ≥ 2.5: un solo file, va bene `C:\caddy\caddy.exe` (setup lo cerca lì e in Program Files).
- **LibreOffice**: serve **solo** per l'export PDF delle liquidazioni (Excel e CSV funzionano senza).
  Non si installa a pezzi: o intero (~700 MB) o niente.
- **NSSM** (facoltativo): se c'è, i processi diventano servizi Windows; altrimenti `setup.cmd` crea
  attività pianificate all'avvio, equivalenti per l'esercizio.

## 5. `.env` (creato da `setup.cmd`)

`setup.cmd` chiede solo due cose e genera il resto:

- `DATABASE_URL` (con la porta giusta: **5433**), esempio
  `postgresql://decobrands:lapassword@localhost:5433/decobrands_db?schema=public`
- indirizzo con cui si apre l'app: `http://<IP-del-server>:8082`

Poi scrive `NODE_ENV=production`, `SESSION_SECRET` e `SEGRETI_CHIAVE` casuali (≥ 32 caratteri),
`DOCUMENTI_DIR=C:\Decobrands\documenti`, `APP_URL`, `SOFFICE` se trova LibreOffice.

**Posta in uscita (D-209).** `setup.cmd` non la chiede: si aggiungono a mano in
`app\backend\.env` le righe `SMTP_HOST`, `SMTP_PORT` (587, oppure 465 per TLS diretto), `SMTP_USER`,
`SMTP_PASS` (per Gmail una «password per le app») e `SMTP_FROM` (es. `"Decobrands S.r.l. <ordini@decobrands.it>"`,
che deve essere un alias «Invia come» verificato su quell'account). Se ci sono, **vincono** sui campi
di *Impostazioni → Posta*; poi si riavvia il backend. Anche questa password non va nel repository: il
`.env` è fuori dal controllo di versione.

Due dettagli che hanno già fatto perdere tempo:

- il file che conta è **`app\backend\.env`** (la copia in `config\` è solo una riserva);
- se esiste una variabile d'ambiente `DATABASE_URL` di sistema, **vince sul `.env`** (dotenv non la
  sovrascrive): `setup.cmd`, `deploy.cmd` e il servizio la rileggono dal `.env` prima di partire, ma
  meglio toglierla dalla macchina.

## 6. `setup.cmd` (una volta, come amministratore)

1. Cerca `pg_dump`, `caddy`, `soffice` nelle cartelle di installazione e li aggiunge al PATH della
   sessione; `node24.bat` mette davanti la Node 24.
2. Crea `config`, `backup`, `documenti`, `log`; scrive il `.env` se manca.
3. Backend: `npm ci --no-audit --no-fund`, **`npx prisma generate`**, `npm run build`,
   `npx prisma migrate deploy`.
4. Primo utente: `npm run superutente -- <utente> <email> "<nome>"`. **La password provvisoria
   compare a video** (la posta non è ancora configurata) e va cambiata al primo accesso.
5. Frontend: `npm ci --no-audit --no-fund`, `npm run build`.
6. Servizi: `DecobrandsBackend`, `DecobrandsFrontend` (NSSM o attività pianificate), `DecobrandsCaddy`
   solo se il server non ha già un servizio `Caddy` (quello di Luis non si tocca: stampa il blocco da
   aggiungere), e `DecobrandsBackup` alle 02:00.
7. Avvio e prova di salute su `127.0.0.1:8002/api/salute` e `127.0.0.1:8001`.

## 7. `deploy.cmd [tag]` (a ogni rilascio)

Senza argomento (doppio click) prende l'ultima versione di `main` e lascia la finestra aperta con
l'esito; con un tag, quel rilascio. Il resto è identico.

Va lanciato **come amministratore**: i servizi sono attività pianificate (`schtasks`), e senza
privilegi anche solo chiedere se un'attività esiste dà «Accesso negato». Se non lo è, `deploy.cmd`
se lo richiede da solo (UAC) e riparte elevato, una volta sola (variabile `DECOBRANDS_AMMIN`); con
`nssm` l'amministratore serve per il servizio.

1. Copia il `.env` in `config\`, imposta `DATABASE_URL` da lì.
2. **Backup**: `pg_dump` in `backup\db-AAAAMMGG-HHMM.dump` e `robocopy` dei documenti. Se il backup
   fallisce, si ferma.
3. `scarica.cmd <tag>`: fetch del tag e checkout, sempre dentro `app/` (senza tag: `origin/main`).
4. `npm ci --no-audit --no-fund` **solo se** i `package-lock.json` sono cambiati (o se manca
   `node_modules`); poi `prisma generate`, `npm run build`, `prisma migrate deploy`.
5. Riavvio dei servizi, prova di salute (90 s). Se non risponde: torna al tag precedente, rebuild,
   riavvio; se nel frattempo sono girate migrazioni lo dice e lascia il dump per il ripristino.
   **Pagina di attesa** (dal deploy del portale Luis, D-210/D-212/D-213): è la **prima cosa** che fa
   `deploy.cmd`, appena risolto il tag: copia `deploy\manutenzione\` (la pagina con il logo) in
   `C:\Decobrands\config\manutenzione`, crea `C:\Decobrands\config\manutenzione.txt`, **ferma subito i
   servizi** e accende la pagina. Da lì in poi il portale è fermo (backup, scarico, build, migrazioni
   compresi): chi apre l'indirizzo vede «Aggiornamento in corso», non l'app vecchia né un errore.
   **Con** Caddy la serve Caddy (finché esiste il file); **senza** Caddy (portale esposto da Next sulla
   8082) la serve `manutenzione\servi.js`, un mini-server statico sulla stessa porta del frontend
   (letta da `C:\Decobrands\frontend.env`, 8001 se manca) con il PID in `config\manutenzione.pid`.
   Prima del riavvio il mini-server si ferma (la porta deve essere libera), la prova di salute decide,
   e solo allora si toglie il file-cartello. L'indirizzo chiesto resta nella barra e la pagina si
   ricarica da sola appena il portale risponde. Se il deploy si ferma prima della build (backup
   fallito, `DATABASE_URL` mancante) i servizi si riavviano da soli e il cartello sparisce; se muore
   dopo, il cartello resta e lo script dice come toglierlo (`del C:\Decobrands\config\manutenzione.txt`);
   `avvia-servizi.cmd` toglie da sé un mini-server rimasto acceso da un giro interrotto.
6. Riga in `backup\deploy.log` (tag, ora, utente).

## 8. Rete e certificato

`Caddyfile` con due blocchi, uno attivo alla volta:

- **intranet, attivo**: `:8082` in chiaro, si apre con `http://<IP-del-server>:8082` (o un nome che
  risolve sul server). Niente HSTS in chiaro. In `.env` `APP_URL` con lo stesso indirizzo: il cookie
  di sessione è `secure` **solo** se `APP_URL` è `https://`, altrimenti in HTTP la sessione non regge.
- **pubblico, commentato**: `crm.decobrands.it` con HSTS e certificato, da attivare al rilascio
  scegliendo `tls internal` (certificato interno da installare sui PC) o la sfida DNS (serve il
  modulo DNS del fornitore del dominio).

Backend e frontend ascoltano **solo su 127.0.0.1** (8002 e 8001); dal firewall entra solo la 8082.

La pagina di attesa sta nel `Caddyfile`: `@manutenzione file C:/Decobrands/config/manutenzione.txt`,
poi `handle @manutenzione` (radice `C:/Decobrands/config/manutenzione`, `try_files {path} /index.html`,
`file_server`) e infine un `handle` senza matcher con il `reverse_proxy`. Le due `handle` sono
mutuamente esclusive (vince la prima che combacia), quindi non conta l'ordine delle direttive;
`header @manutenzione Cache-Control "no-store"` evita che la pagina resti in cache dopo il deploy.
Se il portale gira **senza** Caddy (frontend direttamente sulla 8082) quella `handle` non entra in
gioco: la pagina la serve il mini-server di `deploy.cmd` (D-212).
`handle_errors` non servirebbe: un `reverse_proxy` che trova il servizio spento scrive
il 502 da sé e non passa dagli error handler. Dopo aver modificato il `Caddyfile` si controlla prima di
riavviare: `caddy validate --config C:\Decobrands\app\deploy\Caddyfile` (`C:\caddy\caddy.exe`, non è
nel PATH). Caddy **legge la configurazione all'avvio**: con le attività pianificate si riavvia con
`schtasks /end /tn DecobrandsCaddy` e poi `schtasks /run /tn DecobrandsCaddy` (amministratore);
`avvia-servizi.cmd` lo fa già a ogni deploy — con il solo `/run` la seconda istanza non troverebbe la
8082 libera e resterebbe in piedi quella vecchia.

## 9. Backup e ripristino

`backup.cmd` ogni notte: `pg_dump -Fc` + `robocopy` dei documenti, rotazione 14 giorni. Il ripristino
è scritto in cima allo script: fermare il servizio, `pg_restore --clean --if-exists`, riavviare.

La `DATABASE_URL` della `.env` finisce con `?schema=public`, che è un parametro di Prisma: `pg_dump` lo
rifiuta (`invalid URI query parameter: "schema"`). `backup.cmd` e `deploy.cmd` tagliano via la query
string prima di passare l'indirizzo al dump. Se un giorno servono altri parametri (`sslmode=require`)
il taglio va rivisto, perché li perde anche quelli.

## 10. Piano di lavoro (ore da approvare)

| # | Attività | Ore |
|---|---|---|
| 1 | Script, unità, Caddyfile, backup, questo documento | 4 |
| 2 | Prova a secco in locale (setup su database vuoto, deploy di due tag, ritorno indietro) | 3 |
| 3 | Messa in esercizio sul server con te | 3 |
| 4 | Primo aggiornamento vero e ritorno al tag precedente | 1 |
| 5 | Backup e prova di ripristino | 2 |
| | **Totale** | **13 h** |

## 11. Rischi e decisioni aperte

- **Migrazioni non reversibili**: un deploy che le applica e poi fallisce richiede il dump; per questo
  il backup è il primo passo e il ritorno indietro automatico non ripristina da solo.
- **TLS**: senza la scelta (interna o DNS) non c'è certificato pubblico e l'app resta in intranet.
- **Integra**: le viste ponte vanno create sul server (postgres_fdw + user mapping) o si usa il
  database ponte esistente; finché non risponde resta «Integra non raggiungibile».
- **LibreOffice**: senza, l'export PDF delle liquidazioni non funziona.
- **Porta 8080 e 8081** risultano occupate sul server: l'app usa **8082**.
