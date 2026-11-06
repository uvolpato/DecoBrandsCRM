# Prompt per OpenCode — F5-A2 Pagina del registro

Lavoro da Sonnet: una sola sessione, senza sottoagenti.

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`nextjs-app-router-patterns`, `ui-ux-pro-max`, `javascript-typescript-jest`, `webapp-testing` e
`playwright-best-practices`. Prima di cercare nei file usa `graphify query "<domanda>"`.

## Compito

La pagina **`/registro`**: eventi e anomalie in un solo elenco, in sola lettura, con filtri
standard e esportazione CSV (§7.11, §15.6, D-31).

Da leggere:
- `piano-lavoro-crm.md`, riga **F5-A2**;
- `specifica-crm-provvigioni.md`: §4.2.11, §7.10 (disegno della barra), §7.11, §8.1, §8.3,
  §15, §15.6, §15.7, §16.4, §16.4.1; nel §19: D-22, D-23, D-31, D-59;
- `app/backend/src/registro.ts` (ci sono già `logEvent`, `apriAnomalia`, `chiudiAnomalia`,
  `SCHEMI`);
- `app/backend/prisma/schema.prisma`, `model registro`.

## Server

Non c'è una migrazione: la tabella `registro` c'è già. Il server esistente è completo per la
scrittura; qui si legge soltanto.

### Permesso

`/registro` è **solo per amministratore e superutente** (§7.11). In `src/accesso.ts` aggiungi
a `PERMESSI`:

```ts
'sistema.registro': { area: 'sistema', testo: 'Registro di eventi e anomalie: consultare ed esportare', ruoli: ['superutente', 'amministratore'] },
```

### File nuovo `app/backend/src/registro-api.ts`

Le rotte, il CSV e il giro di pulizia. Il controller sta qui e non in `registro.ts` per non
creare un ciclo di import con `accesso.ts`. Registra `RegistroController` in `app.module.ts`.

1. **`GET /api/registro`**, `@Richiede('sistema.registro')`.
   Parametri (validati con class-validator come in `pratiche.ts`):
   - `vista=tutto|aperte|errori` (predefinito `tutto`): `aperte` = `genere='anomalia' AND stato='aperta'`,
     `errori` = `livello='errore'`;
   - `genere=evento|anomalia`, `livello=info|attenzione|errore`;
   - `servizio`, `codice`, `entita` (testo, confronto esatto);
   - `utenti=1,2` (selezione multipla, D-22);
   - `dal=AAAA-MM-GG`, `al=AAAA-MM-GG` (su `ts`);
   - `q`: su `messaggio`, `codice` e `dettaglio->>'etichetta'`, con `ILIKE` e `%`/`_` escapati
     (stesso `simile` di `pratiche.ts`);
   - `operazione` (UUID, filtro su `operazione_id`, per *Stessa operazione*);
   - `ordina=ts|livello|codice|servizio|entita|esito|messaggio|volte`, `dir=asc|desc`, `pagina` (0…).
   Risposta:

   ```ts
   {
     righe: [{
       id: string, ts: string, genere: string, livello: string, codice: string,
       servizio: string | null, entita: string | null, entita_id: string | null,
       esito: string | null, messaggio: string | null, utente: { id: string, nome: string } | null,
       operazione_id: string | null, volte: number, stato: string | null,
       riferimento: { testo: string, href: string | null } | null,
     }],
     conteggi: { tutto: number, aperte: number, errori: number },
     opzioni: {
       servizi: { valore: string, etichetta: string }[],
       codici: { valore: string, etichetta: string }[],
       entita: { valore: string, etichetta: string }[],
     },
     pagina: number, pagine: number, totale: number, per_pagina: number,
   }
   ```

   - **Conteggi D-23**: ognuno dei tre numeri conta con **tutti gli altri filtri** applicati,
     tranne la vista stessa; il numero dei segmenti si aggiorna subito.
   - **Ordinamento e pagine sul server**, 50 righe per pagina, `ts DESC` predefinito.
   - `riferimento.testo` = `dettaglio.etichetta`, altrimenti `messaggio`, altrimenti `codice`.
     `href` solo quando si sa dove andare: `pratica` → `/pratiche/<entita_id>`, `bollettino` →
     `/bollettini/<entita_id>`, `documento` → `/documenti/<entita_id>`, `fornitore` →
     `/fornitori/<entita_id>`, `cliente` → `/clienti/<entita_id>`, `subagente` →
     `/subagenti/<entita_id>`, `utente` → `/utenti/<entita_id>`, `liquidazione` (con
     `dettaglio.periodo.anno` e `trimestre`) → `/liquidazioni/<anno>/<trimestre>`; per gli altri
     `href: null`.
   - `opzioni.servizi`: i servizi noti (`casella`, `lettura`, `integra`, `posta`) più quelli
     presenti nel registro, con etichetta leggibile (es. `casella` → "Casella dei documenti",
     `lettura` → "Server di lettura", `integra` → "Sincronizzazione da Integra", `posta` →
     "Posta in uscita"); `codici` ed `entita` distinti dal registro, in ordine alfabetico.
   - Usa una query SQL come `pratiche.ts` (filtri in `Prisma.sql`, conteggi con
     `count(*) FILTER`, `LIMIT/OFFSET`); l'ordinamento si mappa su una lista chiusa, mai
     interpolato dal browser.
   - Le GET non scrivono eventi (§15.1): niente `logEvent`.

2. **`GET /api/registro/export`**, `@Richiede('sistema.registro')`, **dichiarata prima di
   `:id`**. Stessi filtri (senza ordinamento e pagine). CSV come §11:
   - colonne fisse: `ts;genere;livello;codice;utente;servizio;entita;entita_id;esito;messaggio;dettaglio`;
   - `;`, virgola decimale non serve, date `gg/mm/aaaa hh:mm:ss`, `dettaglio` come JSON,
     UTF-8 **con BOM**, righe `\r\n`;
   - `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment;
     filename="Registro_AAAA-MM-GG.csv"`, `X-Content-Type-Options: nosniff`;
   - nessun evento (è una GET di sola lettura).

3. **`GET /api/registro/:id`**, `@Richiede('sistema.registro')`: la riga completa
   (`id`, `ts`, `genere`, `livello`, `codice`, `tipo`, `azione`, `servizio`, `entita`,
   `entita_id`, `esito`, `messaggio`, `dettaglio`, `utente: {id, nome, email} | null`,
   `operazione_id`, `sessione_id`, `ip`, `volte`, `stato`, `visto_il`, `chiusa_il`,
   `riferimento`). 404 se non c'è. Nessun evento.

4. **Pulizia notturna** (§15.7), in `registro.ts` (non nel controller):
   ```ts
   export async function pulisciRegistro(db, ora = new Date())
   ```
   - in **una transazione** (V13): `SET LOCAL decobrands.pulizia_registro = 'si'` (il trigger
     rende immutabili gli eventi, §15.1) e due cancellazioni:
     - `genere='evento' AND livello='info'` più vecchie di **12 mesi**;
     - tutto il resto più vecchio di **36 mesi**, **tranne** le anomalie con `stato='aperta'`
       (non si cancellano mai);
   - costanti con un commento: `eventi_mesi` (36) arriverà dalle Impostazioni con F5-A6;
   - un `@Cron('30 3 * * *')` in un provider (`PuliziaRegistro`) in `registro-api.ts`, con
     `ScheduleModule.forRoot()` in `app.module.ts`. Niente evento per la pulizia.
   - La pulizia non deve mai lanciare in esercizio: logga l'errore e basta.

## Pagina

Crea `app/frontend/app/(app)/registro/page.tsx` e
`app/frontend/app/(app)/registro/VistaRegistro.tsx`. Niente layout: è una pagina sola.

- **Barra** (`componenti/Barra.tsx`): in *Gestione · Portale*, dopo *Stato del sistema*, la voce
  *Registro* (`href: '/registro'`, `permesso: 'sistema.registro'`, icona `file`).
- **Pagina** con `Pagina` (titolo “Registro”, sottotitolo breve), `FilterBar` con `riepilogo`,
  `DataTable`, `Sagoma`, `Modale`. Nel catalogo `app/(app)/componenti/page.tsx` la FilterBar
  guadagna il tipo `data`; aggiorna anche la firma.
- **Filtri standard** (§16.4.1):
  - segmenti *Tutto · Anomalie aperte · Errori* con i conteggi dal server;
  - `genere`, `livello` (select a valori fissi), `servizio`, `codice`, `entità` (select con le
    `opzioni` del server);
  - **utente**: campo di ricerca a selezione multipla, **non** una tendina (D-22). Aggiungi
    l'entità `utente` in `lib/entita.ts` (voci da `api('utenti')`, testo = nome, dettaglio =
    username);
  - periodo **Dal / Al** con `tipo: 'data'`: aggiungi il tipo `data` a `FilterBar`
    (`input type="date"`, classe `filtro-select`, etichetta sopra, gestito anche nel riepilogo e
    in `predef`);
  - ricerca `q` su messaggio, codice e riferimento; riepilogo con la x per ogni filtro.
- **Tabella**: quando (`quando()` di `Piccoli`), livello (`Stato`: info → info, attenzione →
  attesa, errore → errore), messaggio, utente o servizio, riferimento (link se c'è `href`),
  volte. Ordinamento e pagine sul server, memoria della schermata (§7.12) con `useMemoria` per
  filtri, ordinamento, pagina e `memoria` nella DataTable per lo scorrimento.
- **Dettaglio in finestra**: si apre cliccando la riga, legge `GET /api/registro/:id`; mostra i
  campi comuni e il `dettaglio` come elenco di campi leggibili; per `prima`/`dopo` un confronto
  affiancato. Nel piede, se c'è `operazione_id`, il pulsante *Stessa operazione*: chiude la
  finestra e filtra per quell'operazione (il filtro compare nel riepilogo e si toglie con la x).
- **Esporta** CSV: pulsante in testata, scarica `/api/registro/export` con i filtri attuali;
  spento se non ci sono righe.
- **Caricamento con sagome** (D-59): titolo subito, tabella con sagome al primo caricamento;
  al cambio filtro la tabella resta più tenue. Errori con `avviso`.
- **Sola lettura**: nessun pulsante che modifica. *Segna come visto* **non** si fa qui: arriva
  con lo Stato del sistema (F5-A5), che è una vista di questo registro. Scrivilo nella spec.
- Niente pulsante *Guida* in testata: è un lavoro comune alle pagine, ancora aperto (F5-A8).

## Documenti

- **Spec** `specifica-crm-provvigioni.md`:
  - versione in testa **8.39** con il riassunto;
  - §7.10: *Registro* nel disegno della barra sotto Gestione;
  - §7.11: filtri come sopra, *Segna come visto* con F5-A5;
  - §8.1: le tre rotte con `sistema.registro`;
  - §8.3: riga `sistema.registro`;
  - §15.1 e §15.6: allinea (utente a ricerca multipla, periodo da/a, colonne, rotta
    `/api/registro/export`, 50 righe, sola lettura, *Segna come visto* in F5-A5); correggi il
    vecchio `/api/eventi/export`;
  - §16.4: FilterBar con il tipo `data`;
  - §19: nuova riga **D-64** (data 06/11/2026) con decisione, perché, Ugo, sezioni.
  - Scrivi in UTF-8 **senza BOM**, righe LF: usa lo strumento di modifica, mai `Set-Content` o
    `Out-File`.
- **Guida** `app/frontend/lib/guida.ts`: argomento *Registro* (gruppo *Gestione*, `vai:
  '/registro'`): sintesi, pulsanti (*Esporta*, *Stessa operazione*), finestra del dettaglio,
  “da sapere” (sola lettura, conservazione 12/36 mesi). In
  `app/(app)/guida/VistaGuida.tsx` aggiungi `registro: 'sistema.registro'` a `PERMESSO`.
  **Non** toccare `prototipo-alternativo/`: la pagina non esiste nel prototipo.
- **Piano** `piano-lavoro-crm.md`: nessuna ora nuova, nessun cambio.
- Poi lancia `python strumenti/genera-pagine-doc.py`.
- **Non** toccare `avanzamento-app.md` (lo chiude la sessione principale).

## Regole

- Tutto sul backend, mai dai dati del frontend (V12). Una operazione, una transazione (V13).
- Italiano semplice in codice, commenti e interfaccia; commenti brevi con il rimando
  (`// D-31 §19`).
- Codice minimo (ponytail): riusa componenti e pattern esistenti; niente astrazioni, opzioni o
  dipendenze nuove.
- Database di prova `decobrands_test` per Jest (non `decobrands_db`). Per il browser si usa il
  database di sviluppo con gli utenti `f5-*` di `utenti_prova.js`, poi si tolgono.
- **Non chiudere processi node che non hai avviato tu.** Se 8001/8002 sono già accesi e non
  hanno il codice nuovo, avvia i tuoi su porte libere (es. backend 8003 con `npm run build &&
  npm run start:prod`, frontend 8012 con `BACKEND_URL=http://127.0.0.1:8003 npx next dev -p
  8012`); chiudi solo i tuoi per PID o porta.
- Niente commit, push, modifiche a `.env`.

## Prove

1. **Backend** (`app/backend`):
   - `npx tsc --noEmit`.
   - `npx jest --runInBand` suite per suite (node a volte cade con tutte insieme). 0 KO.
   - Nuovo `test/registro-api.spec.ts` (app Nest + supertest come `oggi.spec.ts`):
     - 403 per operatore e sola lettura, 200 per amministratore;
     - segmenti e conteggi D-23 con un altro filtro attivo;
     - filtri genere/livello/servizio/codice/utente/entità/periodo/`q`/`operazione`;
     - ordinamento e pagine (50 righe);
     - dettaglio e 404;
     - CSV: tipo, BOM, intestazione, numero righe filtrate;
     - le GET non scrivono eventi (conta le righe prima e dopo);
     - `pulisciRegistro`: evento `info` di 13 mesi cancellato, evento `errore` di 13 mesi resta,
       anomalia chiusa di 37 mesi cancellata, anomalia **aperta** di 37 mesi resta;
     - `riferimento.href` per pratica e bollettino.
2. **Browser**: avvia backend e frontend; `node ../../strumenti/prove/utenti_prova.js crea f5`;
   scrivi `strumenti/prove/app_registro.py`:
   - utente `f5-ammi`: titolo, tabella, segmenti con conteggi, filtri (anche utente multiplo,
     date, ricerca), dettaglio in finestra, *Stessa operazione*, esporta CSV, sagome, ritorno
     alla pagina nello stesso punto, 1440 e 768 px, nessun errore JavaScript;
   - utente `f5-lett`: *Pagina riservata* e nessuna voce *Registro* nella barra.
   Poi `node ../../strumenti/prove/utenti_prova.js togli`.
3. Schermate a 1440 e 768 px in `%TEMP%\f5-a2` e **guardale**.
4. Chiudi solo i processi che hai avviato tu.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f5-a2.md` con: file toccati, forma delle API, scelte fatte
(permesso, CSV, pulizia, `Segna come visto` rinviato a F5-A5), prove con i numeri, percorsi
delle schermate, dubbi e cose rimaste aperte.
