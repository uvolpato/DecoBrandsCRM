# Collaudo · Onda 2 · Pacchetto 2-06 — Esci sicuro, ritorno dopo l'accesso, contatori della barra dal vivo, Stato del sistema

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A6-02, A1-04, A5-13, A6-17 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

- **U20**: (a) a ogni pagina e all'evento (nessun cambio).

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A6-02 — *Esci*: la pagina d'accesso compare prima che la sessione sia chiusa
- Gravità: P2
- Dove: `app/frontend/app/accesso/esci/page.tsx:9-14`, `app/frontend/lib/api.ts:33-36` (`allAccesso`), `app/frontend/componenti/Barra.tsx:183`
- Problema: dopo il clic su *Esci* il browser arriva su `/accesso?dopo=%2F` (non su `/accesso`), segno che un'altra richiesta della pagina vecchia ha fatto partire `allAccesso()` con un ricaricamento completo, in corsa con `POST /api/accesso/esci`; se si naviga subito, la richiesta di uscita non è ancora arrivata.
- Scenario: utente `a6-oper` entra → *Esci* dal menu → appena il percorso è `/accesso` si apre `/` → resta nell'app e `GET /api/accesso/io` risponde **200** (riprodotto con uno script; aggiungendo una sola richiesta prima del `goto` la sessione risulta chiusa, 401). Su un computer condiviso: *Esci* e chiusura immediata della scheda possono lasciare la sessione aperta (30 giorni con *Resta collegato*). `app_accesso.py` si ferma su questo punto in 1 giro su 3.
- Correzione puntuale: *Esci* nella barra come pulsante (non `Link`) che fa `await api('accesso/esci', {})` e solo dopo `window.location.replace('/accesso')`; in `lib/api.ts` una variabile di modulo `uscendo = true` impostata prima della chiamata, e `allAccesso()` non fa niente se `uscendo`. La pagina `/accesso/esci` resta per il link della password provvisoria.
- Prova che la verifica: `strumenti/prove/app_accesso.py` (riga 58) lanciata 5 volte di fila senza fermarsi; aggiungere subito dopo `esci(pg)` il controllo `fetch('/api/accesso/io')` = 401 **senza attese**.
- Esecutore: DeepSeek V4 — sessione e navigazione, più file del frontend.
- File toccati: `app/frontend/componenti/Barra.tsx`, `app/frontend/lib/api.ts`, `app/frontend/app/accesso/esci/page.tsx`, `strumenti/prove/app_accesso.py`
- Dipende da / correlato a: A1-08 (SSE aperta dopo l'uscita), D-39, D-89

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

### A5-13 — Contatori della barra laterale fermi fino al cambio pagina (D-23)
- Gravità: P2
- Dove: `app/frontend/componenti/Barra.tsx:77-92`
- Problema: i contatori si rileggono solo con `[percorso]`; la barra non usa `useEventi`. Spec §16.4.2: "contatori (barra laterale, …) si aggiornano da soli".
- Scenario: utente fermo su Pratiche, arriva una fattura nella casella → il registro emette `documento.*` → la tabella mostra la barra *Ci sono aggiornamenti*, ma il numero giallo di **Documenti** nella barra resta quello vecchio.
- Correzione puntuale: in `Barra` leggere `const ev = useEventi()` e aggiungere alle dipendenze dell'effetto una somma delle aree `documenti`, `pratiche`, `bollettini`, `sistema` (stesso schema di `VistaOggi.tsx:50`).
- Prova che la verifica: `strumenti/prove/app_eventi.py`: carica un documento da un'altra scheda → il contatore *Documenti* cresce senza navigare.
- Esecutore: DeepSeek V4 Flash — un file.
- File toccati: `componenti/Barra.tsx`, `strumenti/prove/app_eventi.py`
- Dipende da / correlato a: D-23, A5-12

> **Per questo pacchetto:** Aggiungi gli eventi alle dipendenze dell'effetto e **lascia** anche `percorso`: Ugo ha deciso (U20) che la barra si rilegge a ogni pagina e a ogni evento (A7-20 parte 1 non si fa).

### A6-17 — Stato del sistema: «Funziona» su servizi non configurati, testata e barra
- Gravità: P3
- Dove: `app/frontend/app/(app)/sistema/VistaSistema.tsx` (riquadri e testata), `app/frontend/componenti/Barra.tsx` (etichetta del gruppo)
- Problema: i quattro riquadri dicono «Funziona» in verde e sotto «Non configurata: si imposta nelle Impostazioni» e «2 problemi da vedere»; a 1440 px *Guida* va su una seconda riga sotto *Controlla adesso* / *Segna tutti come visti*; nella barra laterale il gruppo si legge «Portale4» (contatore attaccato all'etichetta).
- Scenario: seed §12, `/sistema` a 1440 (`sistema-1440.png` prima build) e 768 (`sistema-768.png`).
- Correzione puntuale: stato «Da configurare» (grigio) quando la connessione non è impostata, «Attenzione» se ci sono problemi da vedere; `flex-wrap: nowrap` sulle azioni della testata; spazio (`margin-left: .4rem`) fra etichetta del gruppo e contatore.
- Prova che la verifica: `app_sistema.py` con il testo del riquadro «Da configurare» a servizi spenti.
- Esecutore: DeepSeek V4 Flash — testi e stile (lo stato viene già dal server: se lo calcola il server, V4).
- File toccati: `app/frontend/app/(app)/sistema/VistaSistema.tsx`, `app/frontend/componenti/Barra.tsx`, `strumenti/prove/app_sistema.py`
- Dipende da / correlato a: §7.14

> **Per questo pacchetto:** Se lo stato «Funziona/Da configurare» lo calcola il server, **non** cambiarlo nel frontend: scrivilo nel resoconto (pacchetto V4 a parte). Qui solo testi e stile se lo stato arriva già giusto.

## File ammessi (solo questi)

- `app/frontend/componenti/Barra.tsx`
- `app/frontend/lib/api.ts`
- `app/frontend/app/accesso/esci/page.tsx`
- `strumenti/prove/app_accesso.py`
- `strumenti/prove/app_eventi.py`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `strumenti/prove/app_sistema.py`
- `strumenti/opencode/resoconto-collaudo-2-06.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/package-lock.json`
- `app/backend/package.json`
- `app/backend/prisma/lettura-prova.ts`
- `app/backend/src/accesso.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/eventi.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
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
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore-volumi.spec.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/layout.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/PeriodoMesi.tsx`
- `app/frontend/componenti/Schede.tsx`
- `app/frontend/eslint.config.mjs`
- `app/frontend/lib/stati.ts`
- `app/frontend/package-lock.json`
- `app/frontend/package.json`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`

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

Prove da far passare:

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_accesso.py`, `app_eventi.py`, `app_sistema.py`, `app_guscio.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-06.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
