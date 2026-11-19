# Deploy sul server `decobrands` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â documento e piano

Stato: **proposta**, da approvare (19/11/2026). Modello: come il Portale B2B Luis ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â **due file
`.cmd`** eseguiti **sul server Windows**: `setup.cmd` (una volta) e `deploy.cmd <tag>` (a ogni
rilascio). Niente Docker, niente script Linux. Sul server si scarica **solo `app/`**: specifica,
piano, preventivo, prototipo e strumenti restano nel repository di sviluppo.

## 1. Com'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ adesso

- `app/` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ l'unica cartella che va in produzione (`app/README.md`, spec ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§16.3).
- Ci sono giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â , pensati per Windows: `app/deploy/pubblica.bat` (git pull, `npm ci`, migrazioni,
  build), `app/avvia-esercizio.bat` (due processi + Caddy) e `app/deploy/Caddyfile`.
- Mancano: un `setup.cmd` per la prima installazione, un `deploy.cmd` per gli aggiornamenti (con
  backup, controllo di salute e rollback), i servizi Windows e il backup notturno.

## 2. I file (tutti `.cmd`, sul server Windows)

```
app/deploy/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ scarica.cmd               git pull / checkout di un tag: SOLO app/ (checkout sparso)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ setup.cmd                 una volta: prerequisiti, cartelle, .env, npm ci, build,
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡                              migrazioni, primo utente, servizi Windows, Caddy, prova
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ deploy.cmd <tag>           a ogni rilascio: backup, tag, npm ci, migrazioni, build,
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡                              riavvio, prova di salute, ritorno al tag prima se non risponde
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ backup.cmd                 pg_dump + copia documenti, rotazione 14 giorni (02:00 ogni notte)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ scrivi-env.ps1             scrive backend\.env con segreti nuovi (lo chiama setup.cmd)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ salute.ps1                 prova di salute 8002 + 8001 (usata da setup e deploy)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ avvia-servizi.cmd          avvia/riavvia i servizi (NSSM o attivitÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  pianificate)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ servizio-backend.bat       avvio senza finestra, usato dai servizi
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ servizio-frontend.bat      idem per Next
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Caddyfile                  (giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  c'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨)
```

Sul server, dopo il setup (percorsi proposti, da confermare con quelli di Luis):

```
C:\Decobrands\              checkout sparso (git vede solo app\)
C:\Decobrands\app\          backend\, frontend\, deploy\
C:\Decobrands\documenti\        DOCUMENTI_DIR: PDF arrivati, non tracciata da git
C:\Decobrands\config\           copia di sicurezza del .env (il file vivo resta in app\backend\.env)
C:\Decobrands\backup\           dump del database e copia dei documenti
```

## 3. Primo scaricamento (una volta, da `cmd.exe`)

Basta questo blocco, incollato nel Prompt: nel working tree entra **solo `app/`** (il primo checkout
avviene dopo aver impostato il checkout sparso; `--filter=blob:none` evita di scaricare i file delle
altre cartelle). Sul disco restano `app\` e la cartella `.git` dei metadati, circa 2 MB; nessuna
specifica, piano, prototipo o strumento.

```bat
git clone --filter=blob:none --no-checkout https://github.com/uvolpato/DecoBrandsCRM.git C:\Decobrands
cd /d C:\Decobrands
git sparse-checkout init --no-cone
git sparse-checkout set "app/"
git reset --hard HEAD
```

Poi, per installare: `cd C:\Decobrands\app\deploy` e `setup.cmd` (come amministratore).

Da lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬ in avanti gli aggiornamenti li fa `deploy.cmd <tag>`, che usa a sua volta `scarica.cmd`:

```bat
git fetch --depth 1 origin tag v0.2.13
git checkout -f -B live v0.2.13
```

`-B live` tiene il server su un ramo locale che segue il tag: `git describe --tags` dice cosa gira,
e il ritorno indietro ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ `git checkout -f -B live <tag precedente>`.

## 4. I due file `.cmd`, in dettaglio

### 4.1 `setup.cmd` (una volta sola, come amministratore)

1. **Prerequisiti**: controlla e, se mancano, dice dove prenderli (non li installa da solo, per non
   cambiare il server senza il tuo consenso): Node **24**, Git per Windows, PostgreSQL (servizio),
   LibreOffice (per i PDF delle liquidazioni), Caddy ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¥ 2.5, NSSM (o l'utilitÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  che usa Luis) per i
   servizi.
2. **Cartelle** di ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§2 e permessi dell'utente che esegue l'app.
3. **Database**: crea ruolo `decobrands` e database `decobrands_db` (estensioni comprese, le crea la
   migrazione `pg_trgm`), piÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¹ il ruolo in sola lettura per le viste di Integra.
4. **`.env`**: se `app\backend\.env` non c'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨, lo crea da `backend\.env.example` chiedendo solo i
   valori necessari (`DATABASE_URL`, password del database, `DOCUMENTI_DIR`, `APP_URL`) e generando
   `SESSION_SECRET` e `SEGRETI_CHIAVE` casuali (`openssl rand -base64 48` o equivalente PowerShell,
   almeno 32 caratteri: con `NODE_ENV=production` valori corti bloccano l'avvio, D-145). Lo copia in
   `C:\Decobrands\config\` come copia di sicurezza.
5. **Clone sparso** (ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§3), `npm ci` e `npm run build` in backend e frontend, `npx prisma migrate deploy`.
6. **Primo utente**: `npm run superutente -- <nome utente> <email> "<nome>"` (il primo ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ superutente).
7. **Servizi Windows**: registra `DecobrandsBackend` (node `dist/src/main.js`, cartella `app\backend`,
   avvio automatico, riavvio in caso di errore) e `DecobrandsFrontend` (`npm run start` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
   `next start -p 8001 -H 127.0.0.1`), piÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¹ `Caddy` con `deploy\Caddyfile`. Porte 8001 e 8002 **solo su
   127.0.0.1**; dal firewall entra solo la 8080 (la 80 la usa il gestionale).
8. **Prova di salute**: `http://127.0.0.1:8002/api/salute`, `http://127.0.0.1:8001/`, poi l'URL
   pubblico. Se una fallisce, mostra le ultime righe di log del backend e si ferma.

### 4.2 `deploy.cmd <tag>` (a ogni rilascio)

1. Controlli: tag indicato, cartelle e servizi presenti, spazio su disco.
2. **Backup del database prima di tutto**: `pg_dump -Fc` in `C:\Decobrands\backup\`, copia dei
   documenti con `robocopy`.
3. `git fetch --depth 1 origin tag <tag>` + `git checkout -f -B live <tag>`.
4. `npm ci` nei due progetti **solo se** `package-lock.json` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ cambiato rispetto al tag precedente.
5. `npx prisma migrate deploy` (le migrazioni si applicano dopo il backup).
6. `npm run build` in backend e frontend; se la build fallisce si ferma **prima** di toccare i
   servizi: i vecchi processi continuano a girare sul build precedente.
7. Riavvio dei due servizi, attesa di salute (max 60 s, il backend carica tutto all'avvio).
8. Se la salute non passa: **rollback** a `<tag precedente>`, rebuild, riavvio; se nel frattempo ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨
   girata una migrazione lo dice e lascia il dump pronto (il ripristino non ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ automatico).
9. Riga nel registro `C:\Decobrands\backup\deploy.log`: tag, ora, utente.

### 4.3 Backup

`backup.cmd`, attivitÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  pianificata ogni notte: `pg_dump -Fc` + `robocopy` dei documenti, rotazione
14 giorni (`forfiles`). Il ripristino ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ scritto in cima allo script: fermare i servizi, `pg_restore`.

### 4.4 Caddy e certificato

Il `Caddyfile` ha due blocchi, uno attivo alla volta:

- intranet, attivo adesso: `:8080` in chiaro, si apre con l'indirizzo del server (es.
  `http://192.168.1.50:8080`) o con un nome che risolve sul server (es. `http://crm.decobrands.local:8080`).
  Niente HSTS in chiaro, e in `.env` `APP_URL` va con lo stesso indirizzo: il cookie di sessione
  resta non `secure` finche' l'app e' in HTTP (con `APP_URL` https torna `secure` da solo; prima era
  sempre `secure` in esercizio e in intranet la sessione non reggeva).
- pubblico, commentato: `crm.decobrands.it` con HSTS e certificato, da attivare al rilascio
  scegliendo `tls internal` (certificato interno da installare sui PC) oppure la sfida DNS (serve il
  modulo DNS del fornitore del dominio).
## 5. Piano di lavoro (ore da approvare)

| # | AttivitÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  | Ore | Dipende da |
|---|---|---|---|
| 1 | `setup.cmd`, `deploy.cmd`, `backup.cmd`, registrazione servizi, documento aggiornato | 4 | ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â |
| 2 | Prova a secco in locale: setup su database vuoto, `deploy.cmd` di due tag, rollback | 3 | 1 |
| 3 | Messa in esercizio sul server con te: prerequisiti, database, `.env`, ponte Integra, primo utente, Caddy/TLS | 3 | 2, e i dati di ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§6 |
| 4 | Primo aggiornamento vero (`deploy.cmd v0.2.13`) e ritorno al tag precedente | 1 | 3 |
| 5 | Backup e prova di ripristino su un database di prova | 2 | 3 |
| | **Totale** | **13 h** | |

## 6. Cosa mi serve da te

1. **Come si entra sul server**: nome o IP, utente, e se l'app deve girare come servizio Windows con
   **NSSM** (come Luis?) o con un'altra utilitÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ; se c'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  una cartella Luis, il percorso da imitare.
2. **Cosa c'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â **: Node 24, PostgreSQL, Caddy, LibreOffice; se PostgreSQL sta sullo stesso server.
3. **Database**: `decobrands_db` nuovo sul server o dump da qui; chi ha la password di `postgres`.
4. **Dominio e certificato**: `crm.decobrands.it` da fuori o solo intranet; `tls internal` o sfida DNS.
5. **Integra**: `PONTE_URL` a un database ponte o *Impostazioni ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Integra*; indirizzo 100.69.146.97.
6. **Primo superutente**: nome utente, email, nome.
7. **Percorsi**: va bene `C:\Decobrands` (checkout), `C:\Decobrands\documenti`,
   `C:\Decobrands\backup`, o preferisci la stessa struttura di Luis.

## 7. Rischi e decisioni aperte

- **Migrazioni non reversibili**: se un deploy le applica e poi fallisce serve il ripristino del
  dump; per questo il backup ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ il primo passo e il rollback automatico non ripristina da solo.
- **TLS**: senza la scelta (interna o DNS) non c'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ certificato pubblico e l'app resta in intranet.
- **Integra**: le viste ponte vanno create sul server (postgres_fdw + user mapping) o si usa il
  database ponte giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  esistente; finchÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© non risponde resta ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â«Integra non raggiungibileÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â».
- **LibreOffice**: senza, l'esportazione PDF delle liquidazioni non funziona (Excel e CSV sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬).
- **Documenti**: `DOCUMENTI_DIR` fuori dal repository, con spazio e backup propri.
