# Prompt per OpenCode: ritocchi al dettaglio del bollettino (dubbi di F3-A2)

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. Lavoro da Sonnet: usa il modello
caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md` e `strumenti/opencode/resoconto-f3-a2-pagine.md` (in fondo ci sono i dubbi). Carica
le skill `ponytail`, `nestjs-best-practices`, `nextjs-app-router-patterns`, `ui-ux-pro-max`,
`javascript-typescript-jest`, `webapp-testing` e `playwright-best-practices`. Prima di cercare nei
file usa `graphify query "<domanda>"`.

Ugo ha chiesto soluzioni **flessibili** per i dubbi. Si fanno quattro ritocchi.

## 1. Chiusura con righe aperte: dire cosa manca e portarci

Il pulsante *Verifica*/*Contesta* resta spento finché ci sono righe aperte, come oggi. Il server
risponde 409 lo stesso, come difesa in più. Accanto al pulsante aggiungi due cose:
- il testo "Mancano N righe da decidere";
- il link **Vai alla prima**, che scorre fino alla prima riga del gruppo *Da decidere* e la evidenzia
  per un attimo.

Non servono altre rotte.

## 2. Abbinamento a qualsiasi documento del fornitore

Oggi si sceglie solo fra i documenti del mese che compaiono nel dettaglio.

- **Server**: rotta nuova `GET /api/documenti/cerca?fornitore_id=<id>&q=<testo>&limite=20`, permesso
  `provvigioni.consulta`, in `app/backend/src/documenti.ts`.
  - Cerca fra fatture e note di credito di quel fornitore, **di ogni periodo**, per numero o per
    cliente.
  - Scrive la query SQL con i parametri; per la ricerca usa `ILIKE` e neutralizza `%`, `_` e `\` come
    in `src/pratiche.ts`.
  - Mette prima i documenti del mese del bollettino (parametro facoltativo `mese=AAAA-MM`), poi gli
    altri dal più recente.
  - Restituisce
    `[{id, numero, data, tipo, cliente, pratica_id, pratica, importo, su_riga: {bollettino_id, mese, anno} | null}]`.
    `su_riga` dice se il documento è già su una riga di un bollettino.
  - Prove in `test/documenti.spec.ts`:
    - filtro per fornitore (gli altri fornitori non compaiono);
    - ricerca per numero e per cliente;
    - ordine con il mese prima;
    - `su_riga` valorizzato;
    - una ricerca con `%` e `_` trattati come lettere, non come jolly;
    - 403.
- **Pagina**: entità nuova `documentoFornitore` in `lib/entita.ts`, che legge questa rotta.
  - La finestra *Abbina il documento* usa il campo di ricerca su questa entità.
  - Un documento già su un'altra riga compare con l'avviso "già sul bollettino 7/2026" ma si può
    scegliere lo stesso. Il 409 del server lo spiega nella finestra.
  - Togli `documentoMese` se non serve più.

## 3. Cerniera sul tablet: righe impilate

Sotto i 860 px la cerniera non deve più scorrere di lato. Ogni riga si impila così:
1. documento e cliente;
2. "*Fornitore* riconosce" con importo e percentuale;
3. la differenza (la cucitura) in evidenza;
4. "Noi calcoliamo";
5. i pulsanti della riga, sotto, a tutta larghezza.

Le intestazioni delle colonne spariscono: ogni valore porta la sua etichetta piccola.

Lo fai **solo con CSS** (`@media (max-width: 860px)`), senza un secondo markup.
- I due `stile.css` (app e prototipo) restano identici.
- Prima di creare una classe, controlla con `grep` che non esista già.
- Il prototipo, che usa le stesse classi, deve impilarsi allo stesso modo: controllalo.

## 4. Prepara la contestazione

- **Server**: `GET /api/bollettini/:id/contestazione` (`provvigioni.consulta`) in
  `app/backend/src/bollettino.ts`. Restituisce `{oggetto, testo}`, calcolato dal server con le righe
  e i mancanti **contestati**.
  - Per ogni riga contestata: numero del documento, cliente, data, "voi riconoscete" e "noi
    calcoliamo" (importo e %), differenza, motivo.
  - In fondo il totale della differenza contestata.
  - Testo in italiano semplice, con un'apertura e una chiusura cortesi.
  - L'intestazione è il nome del fornitore e il mese.
  - Se non c'è nessuna riga contestata, risponde 409 "Nessuna riga contestata".
  - Prova in `test/bollettino.spec.ts`:
    - il testo contiene i numeri e i motivi delle righe contestate;
    - non contiene le righe accettate;
    - il caso 409;
    - 403.
- **Pagina**: pulsante **Prepara la contestazione**, attivo quando c'è almeno una riga contestata,
  anche prima della chiusura.
  - Apre una finestra con oggetto e testo **modificabili** (textarea).
  - Pulsanti **Copia** (appunti) e **Scarica .txt**.
  - **Non si manda nessuna email**: l'invio dal CRM arriverà con F5/F6. Nella finestra scrivi
    "Copia il testo nella tua email al fornitore".
  - Il testo modificato non si salva.

## Documenti

- Spec `specifica-crm-provvigioni.md`:
  - §7.7: i quattro ritocchi, con una riga *Perché* per ciascuno;
  - §8.1: le due rotte nuove;
  - §16.4, se cambia la cerniera;
  - versione in testa.
- Guida `prototipo-alternativo/assets/guida.js`, pagina Bollettino: *Vai alla prima*, l'abbinamento
  a qualsiasi documento del fornitore, *Prepara la contestazione*.
- Poi `python strumenti/genera-pagine-doc.py`.

## Regole

- Tutto sul backend (V12): il testo della contestazione e i risultati della ricerca li calcola il
  server.
- Italiano semplice. Codice minimo (ponytail).
- **Prove del server su `decobrands_test_f3a1`**, con `DATABASE_URL_TEST`.
  - Non usare `decobrands_test`: un agente sta lavorando a F4-A1 e lo usa.
  - Non toccare `src/liquidazioni*.ts`, `test/liquidazion*.spec.ts`, `app/frontend/app/(app)/liquidazioni/`.
  - In `app.module.ts` non c'è niente da aggiungere.
- **Non chiudere processi node che non hai avviato tu.** Usa porte libere (non 8001/8002).
- Niente commit, push, `.env`.

## Prove

1. `npx tsc --noEmit` in `app/backend` e in `app/frontend`.
2. `npx jest --runInBand test/documenti.spec.ts test/bollettino.spec.ts`, poi **tutte** le prove,
   tutte con `DATABASE_URL_TEST` su `decobrands_test_f3a1`. 0 KO.
3. Browser, sul database `decobrands_test_f3a1`, con gli utenti `f3-*`. Aggiorna `strumenti/prove/app_bollettino.py`:
   - *Vai alla prima* porta alla riga;
   - l'abbinamento a un documento di un altro mese funziona;
   - un documento già usato mostra l'avviso e poi il 409;
   - a 768 px la cerniera è impilata, la pagina non scorre di lato e i pulsanti sono visibili senza
     scorrere la cerniera;
   - *Prepara la contestazione* mostra il testo con le righe contestate;
   - *Copia* e *Scarica* funzionano;
   - nessun errore JavaScript.

   Rilancia anche `app_bollettini.py` e `app_componenti.py`. 0 KO.
4. Schermate a 1440 e 768 px in `%TEMP%\f3-a2b`: **guardale**.
5. Chiudi solo i tuoi processi.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f3-a2-ritocchi.md`:
- i file toccati;
- la forma delle due rotte;
- le prove, con i numeri;
- le schermate;
- i dubbi.
