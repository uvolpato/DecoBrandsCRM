# Collaudo · Onda 2 · Pacchetto 2-04 — Aggiornamenti dal vivo: eventi persi, SSE dopo l'uscita, sollecito che non avvisa

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A3-06, A1-08, A6-03 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A3-06 — Aggiornamenti dal vivo persi: il canale legge il registro per id crescente
- Gravità: P2
- Dove: `app/backend/src/eventi.ts:48-58` (`nuoveAree`), `:111` (`maxId`)
- Problema: l'id (BIGSERIAL) si assegna all'INSERT, non al commit. Una transazione lunga prende l'id N, una corta prende N+1 e committa prima: il giro legge N+1, porta `ultimo` a N+1 e N, committato dopo, non si vedrà mai.
- Scenario: la chiusura del trimestre (fino a 30 s, scrive l'evento `liquidazione` presto) e intanto un documento caricato committa → le schede aperte non ricevono l'area `liquidazioni`: Liquidazioni mostra «Da liquidare» finché non si ricarica a mano (D-23 conteggi dal vivo).
- Correzione puntuale: rileggere una finestra e scartare i già visti. In `EventiService`: `private visti = new Set<bigint>()`; `nuoveAree(db, ultimo, visti)` interroga `id > ultimo - 500n` (`take: 1000`), tiene solo le righe non in `visti`, le aggiunge a `visti`, toglie da `visti` gli id `< nuovoUltimo - 500n`. `// ponytail: finestra di 500 id; LISTEN/NOTIFY se il registro cresce più di 500 righe in 4 s`.
- Prova che la verifica: `app/backend/test/eventi.spec.ts` — inserire id 10 e 12, chiamare `nuoveAree`, poi inserire 11 (id esplicito) e ri-chiamare → l'area di 11 arriva.
- Esecutore: DeepSeek V4 — cambio di logica.
- File toccati: `app/backend/src/eventi.ts`, `app/backend/test/eventi.spec.ts`.
- Dipende da / correlato a: D-23, D-31, §16.4.2.

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

### A6-03 — Oggi: dopo *Copia il testo* dei solleciti di pagamento non compare «Ci sono aggiornamenti»
- Gravità: P2
- Dove: `app/backend/src/incassi.ts:94-112` (evento `tipo: 'documento', azione: 'export'`), `app/backend/src/eventi.ts:11-39` (`areeDi`), `app/frontend/app/(app)/oggi/VistaOggi.tsx:49-50,136`; area modificata e non committata (`oggi.ts`, `solleciti.ts`, `Solleciti.tsx`, `app_oggi.py`)
- Problema: la prova D-23 di Oggi aspetta la barra degli aggiornamenti dopo la copia del sollecito, e la barra non arriva.
- Scenario: seed §12, `a6-ammi` su `/` → gruppo *Pagamenti da sollecitare* → *Prepara i solleciti* → *Copia il testo* → *Chiudi* → in 15 s `.aggiornamenti` non compare (3 giri su 3, `app_oggi.py:118`). `app_eventi.py` (fattura registrata da un'altra scheda) invece passa: il canale SSE funziona, il problema è l'evento del sollecito o il filtro di Oggi.
- Correzione puntuale: verificare il `codice` scritto da `logEvent` per il sollecito (atteso `documento.export`, area `documenti`) e che Oggi conti anche l'area `documenti` (e la nuova `solleciti` del working tree, se c'è) in `useEventi`; se il codice è un `export.*`, aggiungere in `PREFISSI` di `eventi.ts` `['export.', 'documenti']` o l'area giusta, con la riga nella prova `eventi.spec.ts`.
- Prova che la verifica: `strumenti/prove/app_oggi.py` (0 KO) e `npx jest test/eventi.spec.ts test/incassi.spec.ts`.
- Esecutore: DeepSeek V4 — backend + frontend, regola D-23.
- File toccati: `app/backend/src/eventi.ts`, `app/backend/src/incassi.ts` (se cambia il codice), `app/frontend/app/(app)/oggi/VistaOggi.tsx`, `app/backend/test/eventi.spec.ts`
- Dipende da / correlato a: A3-06, A5-13, D-23. **Rilanciare dopo il commit del lavoro in corso su Oggi.**

> **Per questo pacchetto:** Il lavoro f7 su Oggi e solleciti era in corso durante il collaudo: **prima** rilancia la prova (`app_oggi.py` a fine onda) o leggi il codice attuale; se il problema non c'è più, scrivilo e non cambiare nulla.

## File ammessi (solo questi)

- `app/backend/src/eventi.ts`
- `app/backend/test/eventi.spec.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/solleciti.ts`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `strumenti/opencode/resoconto-collaudo-2-04.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/package-lock.json`
- `app/backend/package.json`
- `app/backend/prisma/lettura-prova.ts`
- `app/backend/src/accesso.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/lettura-prova.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/proposta.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
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
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
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

Lavora **solo** sul tuo database di prova `decobrands_test_2_04` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_2_04#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_2_04','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_2_04 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-2-04"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_2_04`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/eventi.spec.ts test/incassi.spec.ts test/oggi.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_oggi.py`, `app_eventi.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-04.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
