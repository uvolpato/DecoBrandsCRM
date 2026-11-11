# Collaudo · Onda 1 · Pacchetto 1-10 — Casella: STARTTLS obbligatorio, email malformata, limite per allegato

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A4-04, A4-05, A4-12 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A4-04 — Casella IMAP: la password può viaggiare in chiaro sulle porte diverse da 993
- Gravità: P2
- Dove: `app/backend/src/casella.ts:103-106` (`apriImap`)
- Problema: con porta 143 imapflow fa STARTTLS solo se il server lo offre; un intermediario che toglie `STARTTLS` dalle capacità ottiene `LOGIN` in chiaro. La posta in uscita invece lo impone (`requireTLS`, `posta.ts:328`).
- Scenario: Impostazioni → Casella con porta 143 su rete con un apparato malevolo/vecchio → utente e password della casella dei fornitori in chiaro.
- Correzione puntuale: in `new ImapFlow({...})` aggiungere `doSTARTTLS: config.porta === 993 ? undefined : true` (imapflow: `true` = STARTTLS obbligatorio, fallisce se manca).
- Prova che la verifica: controllo a mano nel test di `casella.spec.ts` sulle opzioni passate (estrarre le opzioni in una funzione `opzioniImap(config)` ed esportarla).
- Esecutore: DeepSeek V4 Flash — una riga in un file.
- File toccati: `app/backend/src/casella.ts`, `app/backend/test/casella.spec.ts`.
- Dipende da / correlato a: A1 (sicurezza), D-66.

### A4-05 — Un'email che dà un errore inatteso blocca tutte le email dopo di lei, a ogni giro
- Gravità: P2
- Dove: `app/backend/src/casella.ts:82` (`simpleParser` nel generatore), `casella.ts:199-201` (`throw e`)
- Problema: qualsiasi errore non classificato (parse MIME, errore del database su quell'allegato, `fetchOne` fallito) interrompe il `for await`: l'email non si sposta e il giro dopo riparte da lei, con lo stesso esito.
- Scenario: un'email malformata con UID 120 in cima alla cartella → ogni 2 minuti il giro finisce in `errore` a UID 120; le email 121…n (fatture vere) non entrano mai. L'unico segnale è l'esito del servizio in Stato del sistema, senza dire quale email.
- Correzione puntuale: nel generatore, `try { parsed = await simpleParser(...) } catch (e) { yield { uid, da: '', oggetto: '', allegati: [], errore: pulisci(e) }; continue; }`; in `giroCasella` gestire `msg.errore` e gli errori non classificati per messaggio: `esito = 'attenzione'`, anomalia `casella.allegato` con `chiave: String(uid)` e il testo fisso, **niente spostamento**, `continue` con la successiva (contare `ignorati`). Gli errori di connessione (`client` chiuso) restano fatali.
- Prova che la verifica: `test/casella.spec.ts` — casella finta con 3 email, la seconda lancia: la prima e la terza entrano, la seconda resta e apre l'anomalia.
- Esecutore: DeepSeek V4 — cambia il flusso del giro e le anomalie.
- File toccati: `app/backend/src/casella.ts`, `app/backend/test/casella.spec.ts`.
- Dipende da / correlato a: D-66, §7.14.3.

### A4-12 — Il limite della casella vale sull'email intera, non sull'allegato
- Gravità: P3
- Dove: `app/backend/src/casella.ts:76`
- Problema: `RFC822.SIZE` comprende la codifica base64 (+37 %) e tutti gli allegati: un PDF di 16 MB (sotto i 20 MB) arriva in un'email di ~22 MB e non si scarica; tre PDF da 7 MB nella stessa email idem.
- Scenario: fornitore manda 3 fatture da 7 MB insieme → nessuna entra, solo l'anomalia «supera il limite».
- Correzione puntuale: soglia dell'email `Math.ceil(MAX_BYTE * 1.4) * 3` (o `bodyStructure` per scaricare gli allegati uno a uno, come già annotato nel `shortcut`); il limite del singolo file resta in `riceviDocumento`.
- Prova che la verifica: `test/casella.spec.ts` (email di 25 MB con allegati da 7 MB → presi).
- Esecutore: DeepSeek V4 Flash.
- File toccati: `app/backend/src/casella.ts`, `app/backend/test/casella.spec.ts`.
- Dipende da / correlato a: D-66.

## File ammessi (solo questi)

- `app/backend/src/casella.ts`
- `app/backend/test/casella.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-10.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/NOTA-RILASCIO.md`
- `app/README.md`
- `app/avvia-esercizio.bat`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/accesso.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/posta.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/src/utenti.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/clienti.spec.ts`
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
- `app/backend/test/utenti.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
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
- `app/frontend/next.config.ts`
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
- `app/README.md`
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Lavora **solo** sul tuo database di prova `decobrands_test_1_10` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_10#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_10','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_10 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-10"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_10`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/casella.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-10.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
