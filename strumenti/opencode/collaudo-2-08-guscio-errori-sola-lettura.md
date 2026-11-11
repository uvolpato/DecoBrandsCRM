# Collaudo · Onda 2 · Pacchetto 2-08 — Guscio: pagina d'errore se il server non risponde; pulsanti spenti anche da tastiera

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A5-14, A7-07 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A5-14 — Pagina bianca se `/accesso/io` fallisce al primo caricamento
- Gravità: P2
- Dove: `app/frontend/app/(app)/layout.tsx:22-33`
- Problema: solo il 401 è gestito (in `api.ts`); con 500, 502 o rete caduta `io` resta `null` e il guscio restituisce `null` per sempre, senza messaggio né *Riprova*.
- Scenario: backend spento o database irraggiungibile → l'utente apre `/pratiche` → schermo bianco (nemmeno il titolo), nessun "Il server non risponde".
- Correzione puntuale: stato `errore` nel guscio: se `!r.ok && r.stato !== 401` mostra una pagina scura come l'accesso con `r.messaggio` e un pulsante *Riprova* che rilancia l'effetto.
- Prova che la verifica: `strumenti/prove/app_guscio.py`: `page.route('/api/accesso/io', 500)` → testo del messaggio e pulsante visibili.
- Esecutore: DeepSeek V4 Flash — un file.
- File toccati: `app/(app)/layout.tsx`, `strumenti/prove/app_guscio.py`
- Dipende da / correlato a: D-38, D-59

### A7-07 — Profilo in sola lettura: i pulsanti «spenti» si premono lo stesso con la tastiera
- Gravità: P2
- Dove: `app/frontend/app/stile/stile.css:626-630` (`body.sola-lettura … { opacity: .4; pointer-events: none }`), `app/(app)/layout.tsx:41`
- Problema: il pulsante è spento solo per il mouse. Riceve ancora il fuoco, Invio lo attiva, e il lettore di schermo lo annuncia come attivo (WCAG 4.1.2). La spec §8.3 vuole i pulsanti spenti.
- Scenario: utente con Provvigioni in lettura → Liquidazioni → Tab su «Chiudi la liquidazione» → Invio → si apre la Conferma → conferma → il server rifiuta (403, V12 regge) e compare l'avviso rosso. L'utente ha seguito un percorso che non doveva esistere.
- Correzione puntuale: in `layout.tsx`, quando `solaLettura`, un `useEffect` che registra su `document` un `addEventListener('click', blocca, true)` in cattura: se `e.target.closest(SELETTORE)` (stesso selettore del CSS) allora `preventDefault()` e `stopPropagation()`. Lo stesso effetto mette `aria-disabled="true"` sugli elementi che corrispondono, con un `MutationObserver` su `#principale`.
- Prova che la verifica: `app_utenti.py` o `app_liquidazioni.py` con un utente in lettura: fuoco sul pulsante, Invio → nessuna richiesta POST e `aria-disabled="true"`.
- Esecutore: DeepSeek V4. Tocca il comportamento dei permessi nel guscio.
- File toccati: `app/frontend/app/(app)/layout.tsx`
- Dipende da / correlato a: D-45, §8.3

## File ammessi (solo questi)

- `app/frontend/app/(app)/layout.tsx`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/opencode/resoconto-collaudo-2-08.md`

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
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/accesso/esci/page.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/Barra.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/PeriodoMesi.tsx`
- `app/frontend/componenti/Schede.tsx`
- `app/frontend/eslint.config.mjs`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/stati.ts`
- `app/frontend/package-lock.json`
- `app/frontend/package.json`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_accesso.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_sistema.py`

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
- prove nel browser interessate: `app_guscio.py`, `app_liquidazioni.py`, `app_utenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-08.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
