# A1 — Sicurezza (collaudo finale, 08/11/2026)

**Skill caricate (strumento Skill):** `owasp-security`, `vibesec`, `auth-implementation-patterns`,
`api-security-testing` (solo come checklist OWASP API Top 10 2023: Strix non installato, non installato),
`nestjs-best-practices`.

**Prove lanciate:** nessuna (regola del collaudo: `npm test` e Playwright li lancia solo A6). Analisi statica,
con `graphify query` per orientarsi.

**Controllato:** `accesso.ts` (guardia, sessione, CSRF, entra/esci/password/dimenticata/reimposta/profilo,
`TentativiGuard`), `password.ts`, `superutente.ts`, `utenti.ts`, `segreto.ts`, `main.ts`, `errori.filter.ts`,
`app.module.ts` (throttler), `posta.ts`, `impostazioni.ts` / `impostazioni-api.ts`, `eventi.ts`; elenco completo
delle rotte di tutti i controller con il permesso dichiarato; `next.config.ts` (intestazioni, rewrite),
`lib/api.ts` (`dopo`), polling e SSE del frontend; `.env.example`; `app/deploy/`.

**Esito generale buono:** guardia globale *nega per difetto* (rotta senza `@Richiede` → 403); tutte le
rotte che scrivono hanno un permesso da operatore o più (nessuna POST/PUT/DELETE con `*.consulta`, salvo le
rotte personali `accesso/*`); ruolo e `attivo` riletti a ogni richiesta; sessione rigenerata all'accesso,
distrutta all'uscita; sessioni chiuse su cambio/reimpostazione password e disattivazione; scrypt con
parametri OWASP e calcolo finto per utenti inesistenti; link di reset monouso con impronta SHA-256 e
transazione; CSRF a token di sessione + solo JSON senza sessione; niente CORS; `ValidationPipe` con
`whitelist` + `forbidNonWhitelisted`; 5xx generici con codice; segreti AES-256-GCM mai riletti; schema di
Integra validato come identificativo; D-45 (nessuno dà più di quello che ha) applicato anche in modifica.

**Non controllato:** comportamento a runtime (nessuna prova lanciata); upload, percorsi dei file, SSRF della
lettura (A4); SQL e transazioni nel dettaglio (A3); XSS nel frontend solo con grep (`dangerouslySetInnerHTML`
solo su testi statici di `guida.ts` e icone); throttler in memoria (va bene con un solo processo backend:
da rivedere se i processi diventano più d'uno); configurazione reale di Caddy (non esiste nel repository, A1-05).

---

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

### A1-04 — Reindirizzamento aperto dopo l'accesso con un TAB nel parametro `dopo`
- Gravità: P2
- Dove: `app/frontend/lib/api.ts:84-86` (`dopo`), usato da `app/frontend/app/accesso/page.tsx:14-34` e `accesso/cambia/page.tsx:12`
- Problema: la regex `^\/(?![/\\])` controlla solo il secondo carattere. Il parser degli URL del browser toglie TAB e a capo, quindi `/\t/sito` diventa `//sito`, cioè un altro dominio.
- Scenario: un'email di phishing porta a `https://crm.decobrands.it/accesso?dopo=%2F%09%2Fcrm-decobrands.example%2Faccesso`. La pagina di accesso è quella vera; dopo la password giusta `router.replace('/\t/crm-decobrands.example/accesso')` porta a `https://crm-decobrands.example/accesso`, una copia che dice «sessione scaduta, rientra» e raccoglie la password. **Da confermare con la prova:** il comportamento di `router.replace` di Next 16 con un URL che risolve fuori dall'origine (passa a `location.replace`).
- Correzione puntuale: `export function dopo(v) { if (!v) return '/'; try { const u = new URL(v, location.origin); if (u.origin !== location.origin || u.pathname.startsWith('/accesso')) return '/'; return u.pathname + u.search + u.hash; } catch { return '/'; } }`. In alternativa, rifiutare ogni carattere `< 0x20` e `\`.
- Prova che la verifica: `strumenti/prove/app_accesso.py`: aprire `/accesso?dopo=%2F%09%2Fexample.com`, entrare e controllare che l'URL finale abbia l'origine dell'app. Provare anche `%0A`, `/%5C`, `//`.
- Esecutore: DeepSeek V4 Flash: un file, modifica locale.
- File toccati: `app/frontend/lib/api.ts`, `strumenti/prove/app_accesso.py`
- Dipende da / correlato a: D-38

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

### A1-06 — I segreti d'esempio `CAMBIARE` del `.env.example` passano anche in esercizio
- Gravità: P2
- Dove: `app/backend/src/main.ts:18` (controlla solo che `SESSION_SECRET` ci sia), `app/backend/src/segreto.ts:9-13` (idem per `SEGRETI_CHIAVE`), `app/backend/.env.example` (`SESSION_SECRET=CAMBIARE`, `SEGRETI_CHIAVE=CAMBIARE`)
- Problema: se in esercizio si copia `.env.example` senza cambiare i valori, l'app parte lo stesso.
- Scenario: `SEGRETI_CHIAVE=CAMBIARE` in esercizio. Chiunque abbia un backup del database (o la tabella `impostazioni`) decifra password della casella, SMTP, Integra e chiave LlamaCloud, perché la chiave è scritta nel repository pubblico. Con `SESSION_SECRET` noto si possono firmare cookie (si deve comunque conoscere un `sid`: impatto minore).
- Correzione puntuale: in `controllaAmbiente` (main.ts), se `v === 'production'`, per `SESSION_SECRET` e `SEGRETI_CHIAVE`: errore se il valore manca, è lungo meno di 32 caratteri o vale `CAMBIARE`. Il messaggio rimanda a `openssl rand -base64 48`.
- Prova che la verifica: `app/backend/test/avvio.spec.ts`: `controllaAmbiente({ NODE_ENV: 'production', SESSION_SECRET: 'CAMBIARE', SEGRETI_CHIAVE: 'x'.repeat(48) })` lancia; con valori lunghi non lancia.
- Esecutore: DeepSeek V4 Flash: un file più la prova.
- File toccati: `app/backend/src/main.ts`, `app/backend/test/avvio.spec.ts`
- Dipende da / correlato a: D-65

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

### A1-08 — La SSE `/api/eventi/flusso` resta aperta dopo uscita, disattivazione o scadenza della sessione
- Gravità: P3
- Dove: `app/backend/src/eventi.ts:137-146` (il guard si controlla solo all'apertura)
- Problema: la sessione si controlla una volta sola. Il flusso continua anche se la riga `sessioni` non esiste più.
- Scenario: un utente disattivato dall'amministratore (sessioni cancellate) con la scheda aperta continua a ricevere `{aree:[…]}` per ore: sa quando arrivano documenti o entrano utenti. Non vede dati, ma D-38 dice «disattivare deve valere subito».
- Correzione puntuale: `flusso(@Req() req)`: unire al flusso un `interval(60_000)` che legge `sessioni` per `req.sessionID` e chiude (`takeUntil`) quando la riga non c'è più o è scaduta.
- Prova che la verifica: `app/backend/test/eventi.spec.ts`: aprire il flusso, cancellare la riga di sessione, avanzare il timer → il flusso si chiude.
- Esecutore: DeepSeek V4 Flash: un file, logica locale.
- File toccati: `app/backend/src/eventi.ts`, `app/backend/test/eventi.spec.ts`
- Dipende da / correlato a: D-38, D-89

### A1-09 — Manca una prova "matrice dei permessi" su tutte le rotte (BFLA)
- Gravità: P3
- Dove: `app/backend/test/` (nessuna prova elenca le rotte)
- Problema: il guard nega una rotta senza permesso, ma una rotta nuova che scrive con un permesso sbagliato (es. `@Post` con `provvigioni.consulta`) passa tutte le prove. Oggi tutte le rotte sono giuste: la prova serve a tenerle così.
- Scenario: domani `POST /api/liquidazioni/:a/:t/riapri` con `@Richiede('provvigioni.consulta')` → un utente in sola lettura riapre un trimestre, e nessuna prova se ne accorge.
- Correzione puntuale: nuova prova che con `DiscoveryService` + `Reflector` (o con `app.getHttpAdapter().getInstance()._router`) elenca i metodi dei controller. Per ogni rotta non GET controlla che il permesso non sia `*.consulta`, `*.esporta` o `collegato`, salvo un elenco chiuso (`accesso/esci`, `accesso/password`, `accesso/profilo`), e che le rotte `pubblica` siano solo `salute`, `accesso/entra`, `dimenticata`, `reimposta`.
- Prova che la verifica: è la prova stessa (`app/backend/test/permessi.spec.ts`).
- Esecutore: DeepSeek V4 Flash: prova su logica già giusta.
- File toccati: `app/backend/test/permessi.spec.ts` (nuovo)
- Dipende da / correlato a: D-38, D-45

### A1-10 — Credenziali di sviluppo in `body.json` e `cookies.txt` nella radice, fuori da `.gitignore`
- Gravità: P3
- Dove: `body.json` (`{"utente":"ugo","password":"Prova-Decobrands-2026"}`), `cookies.txt` (file di cookie di curl), radice del repository, non tracciati e non ignorati
- Problema: un `git add .` li mette nel repository, che è pubblico (GitHub Pages).
- Scenario: un commit "tutto" pubblica nome utente e password di Ugo. Se la stessa password è usata sul server vero, chiunque entra come superutente o amministratore.
- Correzione puntuale: cancellare i due file e aggiungere a `.gitignore` le righe `body.json` e `cookies.txt` (o `*.cookies.txt`). Se quella password è usata fuori dallo sviluppo, cambiarla.
- Prova che la verifica: `git status --porcelain` non li elenca più; `git check-ignore body.json` → corrisponde.
- Esecutore: DeepSeek V4 Flash: pulizia.
- File toccati: `.gitignore`, `body.json`, `cookies.txt`
- Dipende da / correlato a: —

---

## Da decidere (Ugo)

1. **D-81: blocco dell'accesso di chiunque, da chiunque.** Il contatore `persona` conta solo il nome utente,
   senza l'IP (così chiede D-81, mentre D-41 diceva «IP + nome utente»), e conta anche gli errori. Da
   Internet, 10 tentativi sbagliati in 15 minuti su `ugo` (o sull'email del superutente) bloccano l'accesso
   del vero Ugo anche dall'ufficio. Con una richiesta ogni 90 secondi il blocco dura all'infinito, e il tetto
   per IP (100) non scatta. Possibilità: (a) contare solo i tentativi falliti e azzerare il contatore dopo un
   accesso riuscito; (b) contatore per IP + persona (come D-41) più un tetto per persona molto largo
   (es. 50); (c) lasciare così, accettando il rischio (CRM raggiungibile da Internet?).
2. **Chi modifica le connessioni (A1-01, parte b).** Oggi `sistema.impostazioni` ce l'hanno superutente e
   amministratori, ma dalla Posta passa il reset della password del superutente. Proposta: `posta` (e le
   connessioni `casella` e `integra`) solo al superutente, con un permesso nuovo `sistema.connessioni`. Cambia
   la tabella §8.3 (D-45, D-65).
3. **L'amministratore può impersonare un utente.** Con `PUT /api/utenti/:id` cambia l'email di un operatore e
   con *Reimposta la password* riceve la provvisoria: può entrare come quell'operatore (es. chiudere un
   trimestre a suo nome). Resta nel registro e rientra in D-39 (gli amministratori gestiscono gli utenti).
   Per limitarlo: un'email di avviso al **vecchio** indirizzo quando l'email cambia. Si fa o si accetta?
