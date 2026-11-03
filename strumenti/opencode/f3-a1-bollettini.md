# Prompt per OpenCode — F3-A1 Matrice dei bollettini e caricamento

Questo prompt va incollato in OpenCode, nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da
Sonnet: usa il modello caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`nextjs-app-router-patterns`, `ui-ux-pro-max`, `javascript-typescript-jest`, `webapp-testing` e
`playwright-best-practices`. Prima di cercare nei file usa `graphify query "<domanda>"`.

## Compito

F3-A1 è la pagina *Bollettini*, come nel prototipo (`prototipo-alternativo/assets/viste-periodo.js`).
Contiene:
- la matrice fornitore × 6 mesi (D-16), con il selettore a mesi `PeriodoMesi`;
- i filtri standard (D-22, D-23);
- il **caricamento** di un bollettino (mese e anno, controllo dei doppioni).

Da leggere:
- `piano-lavoro-crm.md`, riga **F3-A1**;
- spec `specifica-crm-provvigioni.md`: §4.2.9, §5.6, §7.7, §15.2.5, §16.4.1, e in §19 D-03 (bollettino
  atteso entro un giorno fisso per fornitore, sollecito solo dopo), D-16, D-22, D-23, D-52 (elenchi in
  SQL), D-54/D-55 (canale dei file).

### Server: file nuovo `app/backend/src/bollettini.ts`

Registralo in `app.module.ts`.

1. **`GET /api/bollettini`** (`provvigioni.consulta`) restituisce la matrice: una riga per fornitore e
   6 mesi da un mese scelto (`al=AAAA-MM`). Per ogni cella:
   - lo stato: atteso, in ritardo (passato il giorno del fornitore, D-03), arrivato, verificato,
     contestato;
   - il totale riconosciuto e l'id del bollettino.

   Filtri: fornitori (selezione multipla) e stato. I conteggi dei segmenti si calcolano con gli altri
   filtri (D-23). Tutto in SQL (D-52): niente `caricaDati`.
2. **Caricamento**: `POST /api/bollettini` con `{ fornitore_id, anno, mese, arrivo_id? }`. Il PDF passa
   prima dal canale comune `POST /api/documenti/carica` (src/documenti.ts, `riceviDocumento`), poi si
   indica l'`arrivo_id`.
   - **Controllo dei doppioni**: un solo bollettino per fornitore × mese, altrimenti 409 con un testo
     chiaro.
   - Blocca prima la riga del fornitore (`FOR UPDATE`, ordine D-51/D-54), poi crea il bollettino in
     stato da verificare.
   - Evento §15.2.5 nella stessa transazione.
   - Le righe del bollettino non le inserisci a mano: arriveranno dalla lettura (F6). Se la spec
     prevede un inserimento manuale delle righe, scrivilo nei dubbi e non farlo.
3. **Prove** in `test/bollettini.spec.ts`:
   - la matrice sul seed è uguale al prototipo (vedi `test/prototipo.ts`);
   - stato in ritardo con data fissa;
   - filtri multipli e conteggi D-23;
   - caricamento, doppione 409, rollback, 403, eventi.

**Un agente sta facendo F3-A2 in parallelo.** Lavora sul dettaglio del bollettino
(`src/bollettino.ts`, `GET /api/bollettini/:id`, decisioni, chiusura, `test/bollettino.spec.ts`).
**Non toccare quei file** e non creare la rotta `GET /api/bollettini/:id`. In `app.module.ts` aggiungi
solo la tua riga.

### Pagina `app/frontend/app/(app)/bollettini/`

`page.tsx`, `layout.tsx`, `VistaBollettini.tsx`. Usa solo componenti già esistenti: `FilterBar`
(ricerca multipla e riepilogo), segmenti, `PeriodoMesi`, `DataTable` o la matrice del prototipo
(se manca, fai un componente parametrico e mettilo nel catalogo `/componenti` e nella spec §16.4).

Il clic su una cella con il bollettino porta a `/bollettini/<id>`: per ora una pagina segnaposto con
il titolo, perché il dettaglio vero sono le pagine di F3-A2. Il pulsante *Carica bollettino* apre una
finestra con fornitore (campo di ricerca), mese e anno, e PDF. Ritorno nello stesso punto (§7.12).

### Documenti

- Spec §7.7 e §8.1, se l'app è diversa dal prototipo; versione in testa.
- Guida `prototipo-alternativo/assets/guida.js`, pagina Bollettini.
- Poi `python3 strumenti/genera-pagine-doc.py`.

## Regole

- Tutto sul backend (V12), una operazione = una transazione (V13).
- Italiano semplice, commenti con il rimando alla decisione. Codice minimo (ponytail).
- **Database di prova: `decobrands_test_f3a1`** (già creato e migrato). L'altro agente usa
  `decobrands_test`: **non usarlo**. Lancia le prove del server con
  `DATABASE_URL_TEST=<url del .env con decobrands_db → decobrands_test_f3a1>`. Per caricare i dati di
  prova nel browser, lancia lì `npm run db:seed` con `DATABASE_URL` puntato a quel database.
- **Non chiudere processi node che non hai avviato tu.** Ugo ha i server di sviluppo su 8001/8002.
  Le tue porte sono 8011/8012; se sono occupate, usane altre e scrivilo.
- Niente commit, niente push, niente `.env`. `DOCUMENTI_DIR` per le prove nel browser va impostata
  su una cartella temporanea, nell'ambiente del processo.

## Prove

1. In `app/backend`:
   - `npx tsc --noEmit`;
   - `npx jest --runInBand` (da solo) con `DATABASE_URL_TEST` su `decobrands_test_f3a1`, 0 KO.
2. Nel browser:
   - backend su 8012 su `decobrands_test_f3a1`, con `TENTATIVI=1000` e `TENTATIVI_IP=1000`;
   - frontend su 8011 con `BACKEND_URL`;
   - utenti di prova con `node strumenti/prove/utenti_prova.js crea f3` (con `DATABASE_URL` su quel
     database): `f3-ammi`, `f3-oper`, `f3-lett`, password `password-di-prova`.

   Scrivi `strumenti/prove/app_bollettini.py`. Deve controllare:
   - la matrice e i 6 mesi;
   - il cambio di periodo;
   - filtro multiplo e riepilogo;
   - i numeri dei segmenti;
   - il caricamento con PDF;
   - il doppione visibile come errore;
   - la cella che porta al dettaglio;
   - la sola lettura senza pulsanti;
   - il ritorno nello stesso punto;
   - nessun errore JavaScript.

   Rilancia anche `app_pratiche.py` e `app_componenti.py`. 0 KO.
3. Schermate a 1440 e 768 px in `%TEMP%\f3-a1`: **guardale**.
4. Chiudi solo i **tuoi** processi.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f3-a1.md` con:
- i file toccati;
- la forma di `GET /api/bollettini` e di `POST /api/bollettini`;
- le prove, con i numeri e i KO;
- le schermate;
- i dubbi.
