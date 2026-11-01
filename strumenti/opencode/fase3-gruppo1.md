# Prompt per OpenCode — blocco 3 (F1 area Dati), gruppo 1

Da incollare in OpenCode aperto nella cartella `C:\Progetti\Decobrands_CRM`. Le attività sono
quelle segnate **Sonnet**: F1-A1, F1-A2, F1-A3. Le altre del blocco 3 restano fuori:
- F1-A4 + F1-A7 (sincronizzazione da Integra) aspetta il database ponte (F0-A8);
- F1-A5 è segnata **Opus** e la decide Ugo.

---

Sei la **sessione principale** di OpenCode sul progetto Decobrands CRM. Fai il **gruppo 1 del
blocco 3** di `avanzamento-app.md` (area Dati): **F1-A1 Fornitori e scaglioni**, **F1-A2 Agenti e
subagenti**, **F1-A3 Clienti e agenzie**. Lavori con **tre sottoagenti in parallelo** (strumento
`task`, agente `general`), uno per attività. Tu prepari i brief, poi controlli, colleghi i file
comuni e lanci le prove. **Non fai commit né push**: alla fine scrivi un resoconto che Claude Code
controllerà.

## 0. Prima di cominciare

1. Leggi `CLAUDE.md` per intero (regole del progetto) e `avanzamento-app.md` (tabella *Attività
   F1–F7*).
2. Carica le skill con lo strumento `skill`, prima di scrivere codice:
   - `fase`: il modo di lavorare per fasi. Sei in OpenCode: usa il modello caricato e niente
     worktree;
   - `ponytail` (livello full): codice minimo, riusa quello che c'è;
   - `nestjs-best-practices`, `prisma-client-api`, `prisma-cli`: backend;
   - `nextjs-app-router-patterns`, `vercel-react-best-practices`, `vercel-composition-patterns`:
     frontend;
   - `javascript-typescript-jest`: prove del backend;
   - `webapp-testing`, `playwright-best-practices`: prove nel browser;
   - `owasp-security`: le rotte nuove leggono e scrivono dati con i permessi;
   - `ui-ux-pro-max`: solo se devi decidere qualcosa dell'aspetto che il prototipo non dice.

   Se una skill non si trova, scrivilo nel resoconto e vai avanti.
3. Leggi `piano-lavoro-crm.md` §5 (righe F1-A1, F1-A2, F1-A3: riferimenti e sorgente del
   prototipo) e, nella spec `specifica-crm-provvigioni.md`, le sezioni citate lì: §4.2.1–§4.2.6,
   §4.4, §4.6, §7.4, §7.5, §7.6, §8.1, §15.2.2, §15.2.3, §16.4.

## 1. Cosa c'è già (riusalo, non riscriverlo)

- **Backend** (`app/backend`, NestJS 11 + Prisma 7):
  - `schema.prisma` completo, con le anagrafiche divise in identità e versioni (§4.6, D-46/D-48)
    e `codici_esterni`;
  - seed con i dati del prototipo (`npm run db:seed`);
  - motore delle provvigioni in `src/motore/` (`caricaDati`, `percentuali`, `scaglione`, …);
  - registro: `src/registro.ts`, `logEvent(tx, …)` nella stessa transazione;
  - permessi in `src/accesso.ts` (`dati.consulta`, `dati.modifica`, `dati.condizioni`, guard e
    decoratori);
  - modello da imitare per un modulo con rotte, controlli e prove: `src/utenti.ts` +
    `test/utenti.spec.ts`.
- **Frontend** (`app/frontend`, Next.js 16 + React 19):
  - componenti in `componenti/`: `Pagina`, `Pannello`, `Schede`, `DataTable`, `FilterBar` con
    ricerca multipla e riepilogo, `RiepilogoFiltri`, `CampoRicerca`/`RicercaEntita`, `KpiRow`,
    `FormModal`, `Modale`, `Campo`, `Flussi`, …; il catalogo è in `/componenti`;
  - entità in `lib/entita.ts`, memoria della schermata in `lib/memoria.ts`, formati in
    `lib/formati.ts`, chiamate al server in `lib/api.ts`;
  - modello di pagina: `app/(app)/utenti/` (elenco con filtri e scheda);
  - le voci Fornitori, Subagenti e Clienti sono già nella barra (area *Dati*, `Barra.tsx`); oggi
    aprono la pagina "In costruzione" (`app/(app)/[...resto]`).
- **Prototipo** da replicare (aspetto, testi, numeri):
  - `prototipo-alternativo/assets/viste-anagrafiche.js`: Fornitori, Subagenti, Clienti;
  - `entita.js`: entità dei campi di ricerca;
  - `guida.js`: testi della guida;
  - `stile.css`, già nell'app: non creare classi nuove senza aver cercato in `stile.css`.

## 2. I tre sottoagenti

Lanciali **nello stesso messaggio**, con `task` (agente `general`), un brief ciascuno. Ogni brief
contiene il **compito**, i **file suoi**, i **file vietati**, le **regole** (sezione 3) e la
**verifica** (sezione 4).

| Attività | Rotte del server | Pagine | File suoi | Database di prova |
|---|---|---|---|---|
| **F1-A1** Fornitori e scaglioni | `/api/fornitori` (elenco, dettaglio, modifica delle regole del CRM), `/api/fornitori/:id/scaglioni` (crea, modifica, elimina) | `/fornitori`, `/fornitori/[id]` (schede *Percentuali · Clienti seguiti*) | `app/backend/src/fornitori.ts`, `test/fornitori.spec.ts`, `app/frontend/app/(app)/fornitori/**`, `strumenti/prove/app_fornitori.py` | `decobrands_test_f1a1` |
| **F1-A2** Agenti e subagenti | `/api/subagenti` (CRUD), `/api/agenti` (lettura) | `/subagenti`, `/subagenti/[id]` | `app/backend/src/subagenti.ts`, `test/subagenti.spec.ts`, `app/frontend/app/(app)/subagenti/**`, `strumenti/prove/app_subagenti.py` | `decobrands_test_f1a2` |
| **F1-A3** Clienti e agenzie | `/api/clienti` (sola lettura), `/api/clienti/:id/agenzie` (interscambio: crea, modifica, chiudi; blocco doppioni per fornitore e periodo) | `/clienti`, `/clienti/[id]` (schede *Agenzie · Pratiche*, finestra dell'agenzia con campi di ricerca) | `app/backend/src/clienti.ts`, `test/clienti.spec.ts`, `app/frontend/app/(app)/clienti/**`, `strumenti/prove/app_clienti.py` | `decobrands_test_f1a3` |

Cose da dire nei brief:
- **F1-A1**:
  - ragione sociale, P.IVA e paese vengono da Integra (la versione corrente): si leggono soltanto;
  - si modificano solo le regole del CRM sull'identità (giorni di attesa della conferma, giorno
    del bollettino, tipo di provvigione, giorni d'incasso, note), con `dati.condizioni` o
    `dati.modifica` secondo §8.1;
  - per gli scaglioni basta il CRUD sulle righe in vigore, con `valido_dal` = oggi alla
    creazione: le versioni datate e le eccezioni personali sono F1-A5 (Opus), **non farle**.
- **F1-A2**: i subagenti si gestiscono per intero nel CRM (D-07); disattivare, non cancellare, se
  hanno pratiche o abbinamenti.
- **F1-A3**:
  - i clienti sono di Integra e in sola lettura (D-01): dati dalla versione corrente, codice
    Integra da `codici_esterni`;
  - l'agenzia (`interscambio`) lega cliente, fornitore, subagente, sconto, codice del cliente
    presso il fornitore e periodo `valido_dal`/`valido_al`. Il database ha già un EXCLUDE sui
    periodi sovrapposti: trasforma l'errore del database in un messaggio chiaro, non rifare il
    controllo a mano;
  - la scheda *Pratiche* può mostrare solo l'elenco, senza aprire la pratica (F2).

**File comuni, che non tocca nessun sottoagente:**
- `app/backend/src/app.module.ts`;
- `app/frontend/lib/entita.ts` e `lib/api.ts`;
- `app/frontend/componenti/**`;
- `prototipo-alternativo/assets/guida.js`;
- spec, piano, `avanzamento-app.md`, `CLAUDE.md`, `schema.prisma`, le migrazioni.

Il sottoagente scrive nel resoconto cosa ci va (es. «registrare `FornitoriModule` in app.module»,
«entità `fornitore` con `voci` = GET `/api/fornitori?q=`»), e lo aggiungi tu dopo.
- Serve una colonna nuova? Il sottoagente si ferma e lo scrive: niente migrazioni nei
  sottoagenti.
- Serve un componente nuovo o un parametro nuovo? Lo scrive nel resoconto: niente componenti
  scritti dentro le pagine.

## 3. Regole (riportale in ogni brief)

- ⚠ **Tutto sul backend** (V12, D-28):
  - il server ricarica dal database, ricontrolla e ricalcola;
  - il browser manda solo id, valori digitati e motivo;
  - filtri, ordinamento, totali e paginazione delle tabelle valgono su tutto l'elenco.
- ⚠ **Una operazione, una transazione** (V13, D-36):
  - `prisma.$transaction(async (tx) => …)` con tutto da `tx`, `logEvent` compreso;
  - le modifiche bloccano la riga con `SELECT … FOR UPDATE`.
- **Permessi** su ogni rotta (`dati.consulta` per leggere, `dati.modifica`/`dati.condizioni` per
  scrivere, §8.1). Le pagine con livello "lettura" mostrano i pulsanti spenti, come Utenti.
- **Eventi** con i codici del catalogo §15.2.2/§15.2.3. Se un codice manca negli schemi di
  `src/registro.ts`, il sottoagente lo scrive nel resoconto e non lo aggiunge (file comune).
- **Filtri standard** (D-22, D-23):
  - le entità si filtrano con `FilterBar { tipo: 'ricerca', entita, multipla: true }`, mai con
    una tendina;
  - riepilogo con `riepilogo: true`;
  - i numeri dei segmenti contano con gli altri filtri.
- **Memoria della schermata** (§7.12): `useMemoria`, `DataTable memoria`, `Schede memoria`.
- **Italiano semplice** nel codice, nei commenti e nell'interfaccia; commenti brevi con il rimando
  alla decisione (`// D-35 §19`).
- **Codice minimo**: niente astrazioni non richieste, niente librerie nuove.
- **Database**:
  - ogni sottoagente usa **solo il suo** `decobrands_test_f1aN`, già creato con le migrazioni;
  - mai `decobrands_test` né `decobrands_db`;
  - nessun reset.
- **Niente** commit, push, modifiche a `.env`, `npm install` di pacchetti nuovi.
- Schermi da 744 px in su (D-44), niente telefono.

## 4. Verifica

**Ogni sottoagente**, in `app/backend`:
- `DATABASE_URL_TEST` = la `DATABASE_URL` del `.env` con `decobrands_db` → il suo
  `decobrands_test_f1aN` (`test/ambiente.ts` la usa);
- poi `npx tsc --noEmit` e `npx jest --runInBand test/<suo>.spec.ts`, con 0 KO;
- **non** lancia `next build` e **non** avvia server: la cartella è una sola e le build insieme
  si rovinano;
- scrive la prova nel browser `strumenti/prove/app_<suo>.py` (stile `app_utenti.py` e
  `app_componenti.py`, base dagli argomenti), senza lanciarla.

**Tu**, dopo i tre sottoagenti e i file comuni, **una cosa alla volta**:
1. `app/backend`: `npx tsc --noEmit` e `npx jest --runInBand` (tutte le prove, su
   `decobrands_test`), con **0 KO**.
2. `app/frontend`: `npx tsc --noEmit` e `npm run build`.
3. Prove nel browser:
   - backend sulla porta **8012**, con `DATABASE_URL` → `decobrands_test_f1a1` e il seed caricato
     (`npm run db:seed` con quella `DATABASE_URL`);
   - frontend sulla porta **8011**, con `BACKEND_URL=http://127.0.0.1:8012`. **Rifai la build con
     questa variabile**: l'indirizzo si fissa alla build;
   - utenti di prova con `node ../../strumenti/prove/utenti_prova.js crea f1` (da `app/backend`,
     stessa `DATABASE_URL`);
   - poi lancia `app_fornitori.py`, `app_subagenti.py` e `app_clienti.py`, con 0 KO;
   - **non usare** le porte 8001/8002 né `decobrands_db`.
4. Schermate a 1440 e 768 px di elenco e scheda di ogni pagina, in
   `%TEMP%\fase3`: **guardale** prima di consegnare.
5. Chiudi i processi che hai avviato.
6. Controllo rapido: rileggi il diff (`git diff`, `git status`). Cerca rotte senza permesso,
   calcoli fatti nel browser, scritture fuori transazione, componenti duplicati.

## 5. Resoconto per Claude Code

Scrivi `strumenti/opencode/resoconto-fase3.md` con:
- **per ogni attività**: cosa è stato fatto, rotte, pagine, file;
- **file comuni** toccati da te e perché;
- **prove**: comandi ed esito (numero di OK/KO), percorso delle schermate;
- **cose che mancano** nei file comuni che non hai potuto fare (codici evento, parametri di
  componenti, testi della guida, sezioni della spec da aggiornare);
- **dubbi e differenze dal prototipo**, con la sezione della spec.

Non segnare niente in `avanzamento-app.md` e non toccare la spec: lo fa Claude Code dopo il
controllo.
