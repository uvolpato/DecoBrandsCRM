# Prompt per OpenCode — F1-A8b Pagine Anagrafica unica a soggetti

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`, **dopo** che
`f1-a8-schema-api.md` è stato fatto e controllato. È un lavoro da **Sonnet**: usa
**DeepSeek V4.1 Flash** (`deepseek/deepseek-flash`), una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md` e `AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nextjs-app-router-patterns`, `vercel-react-best-practices`,
`ui-ux-pro-max`, `accessibility`, `playwright-best-practices`, `webapp-testing`.
A fine lavoro, per i controlli (CLAUDE.md §4.6), **carica davvero** `ponytail-review` e
`accessibility`; correggi i rilievi veri e riportali nel resoconto.

## Compito

F1-A8, seconda metà: **le pagine** dell'anagrafica unica a soggetti (D-102), come nel prototipo
`prototipo-alternativo/assets/viste-soggetti.js` (riga `vistaSoggetti` e funzioni
`disegnaRuoli`, `disegnaSedi`, `disegnaRecapiti`, `disegnaFatturazione`, `modificaSoggetto`,
`modificaRuolo`, `modificaSede`, `modificaRecapito`, `modificaFatturazione`, `disattivaSoggetto`).
Il prototipo è la **fonte di verità** di struttura, testi, numeri e comportamento (§16.1); il
server fatto in `f1-a8-schema-api.md` dà i dati.

Contenuto:
- **`/soggetti`**: elenco a sinistra e scheda del soggetto a destra (layout a colonne come il
  prototipo: `colonne pari riempi`); `/soggetti/:id` apre direttamente quel soggetto;
- **ricerca e segmenti** (`Tutti · Clienti · Fornitori · Subagenti · Non attivi`) con i numeri dal
  server, calcolati con gli altri filtri (D-23);
- scheda con le quattro schede **Ruoli · Sedi · Recapiti · Fatturazione** con i contatori;
- **Nuovo soggetto**, **Modifica identità**, **Disattiva** (solo senza ruoli attivi);
- **Aggiungi ruolo** (cliente o fornitore), **Nuova sede**, **Nuovo recapito**, **Fatturazione**;
- il **codice del soggetto** (`C000123`) visibile in Clienti, Fornitori e Subagenti, sotto il nome
  come nel prototipo (il server ora restituisce `soggetto_codice`).

Da leggere, solo le parti che servono:
- `piano-lavoro-crm.md`, riga **F1-A8**, e la **DoD comune** della fase 1;
- `specifica-anagrafica-soggetti.md`: §4.1–4.5 (cosa mostrano e validano le schede), §4.7,
  §5, §7.4 (P.IVA corta → scarto), §7.5 (doppioni);
- `specifica-crm-provvigioni.md`: §7.12 (si torna alla pagina nello stesso punto), §8.1,
  §16.1 (la checklist di replica), §16.4 e §16.4.1 (componenti, filtri standard, bordo interno del
  fuoco); nel §19 D-22, D-23, D-44 (niente telefono), D-59 (sagome), D-64 (fuoco), D-101, D-102;
- l'API fatta in F1-A8a: `GET/POST/PUT /api/soggetti`, `/api/soggetti/:id`, `/attivo`,
  `/sedi`, `/recapiti`, `/persone`, `/fatturazione`, `/ruoli`; `soggetto_codice` nelle risposte di
  clienti, fornitori e subagenti.

## File

Crea:
- `app/frontend/app/(app)/soggetti/layout.tsx`, `page.tsx`, `VistaSoggetti.tsx` (stesso schema di
  `(app)/clienti/` e `(app)/fornitori/`: `page.tsx` vuoto, `layout.tsx` che monta la vista con
  `useParams`);
- `strumenti/prove/app_soggetti.py`.

Modifica:
- `app/frontend/componenti/Barra.tsx`: voce **Soggetti** in `Dati` → gruppo `Anagrafiche`, prima di
  Fornitori, `area: 'dati'`, icona esistente (usa quella di `subagenti` se non ce n'è una nuova:
  non aggiungere icone se non serve);
- `app/frontend/lib/guida.ts`: argomento **Soggetti** nel gruppo Anagrafiche, in italiano, con
  sintesi, pulsanti, finestre, "da sapere" (soggetto master, ruoli, sedi, recapiti, fatturazione,
  niente cancellazioni, P.IVA doppia rifiutata, D-101, D-102);
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`, `.../fornitori/VistaFornitori.tsx`,
  `.../subagenti/VistaSubagenti.tsx`: `C000123 · …` nella seconda riga sotto il nome e riga
  *Codice soggetto* nel pannello, come nel prototipo;
- `app/README.md` solo se aggiungi un comando (probabilmente no).

## Come farla

- Usa **solo** i componenti che ci sono: `Pagina`, `Pannello`, `Dettagli`, `Nota`, `Schede`,
  `FilterBar`, `DataTable`, `FormModal`, `Modale`/`Conferma`, `Sagoma`, `Piccoli`, `usePuo`,
  `useUtente`, `useMemoria`, `api`. Niente CSS nuovo se non per la barra dei filtri di questa
  pagina: se serve, classi nuove con prefisso (`soggetti-filtri`), controllate con `grep` su
  `stile.css` per non duplicare; il fuoco dei campi resta un bordo interno (D-64).
- **Tutto dal server** (V12): la pagina invia ricerca, segmento, ordinamento e pagina, e mostra
  quello che torna; non calcola totali, conteggi o provvigioni.
- **Filtri standard** (D-22): ricerca testuale + segmenti con `n` dal server; il riepilogo dei
  filtri dove serve; i numeri si aggiornano subito e contano con gli altri filtri (D-23).
- **DataTable** con `ordine`/`onOrdine`, `paginaServer`/`onPagina`, `caricando` e `memoria`
  (ordinamento, pagina, scorrimento §7.12). Riempie lo spazio, intestazione fissa.
- **Sagome** al primo caricamento (D-59): il titolo si vede subito, niente zeri o "Nessun
  elemento" finti; al cambio di filtro la tabella resta e diventa più tenue.
- Sotto i 744 px niente telefono (D-44): a 768 la pagina si usa, a 1440 è il riferimento.
- Form e validazioni **dal server**: la finestra mostra il messaggio d'errore che torna dall'API
  (P.IVA doppia, P.IVA corta, SDI di 7, `attiva` senza recapiti, sede di un altro soggetto…).
  Nel browser non si duplicano le regole.
- **Accessibilità**: etichette dei campi collegate, fuoco visibile, tab e schede navigabili da
  tastiera, testo alternativo dove serve (`accessibility`).

## Cosa deve saper fare (scenario della prova browser)

1. Aprire `/soggetti` da menu e vedere l'elenco; cercare per nome, P.IVA e codice; cambiare
   segmento e vedere i numeri che si aggiornano; ordinare e cambiare pagina; tornare alla pagina
   e ritrovare tutto (memoria §7.12).
2. Aprire un soggetto (una riga o `/soggetti/:id`), vedere le quattro schede con i contatori.
3. **Nuovo soggetto**: P.IVA doppia rifiutata con il nome dell'esistente; P.IVA corta rifiutata;
   senza P.IVA e senza CF rifiutato; con dati validi creato e codice `C000nnn`.
4. **Aggiungi ruolo** cliente e fornitore allo stesso soggetto (MCL): due ruoli con due codici;
   il clic sulla riga del ruolo apre la pagina del ruolo.
5. **Sede**: creata; una sola predefinita per tipo (spostandola, l'altra si spegne).
6. **Recapito**: email con formato sbagliato rifiutata, duplicato rifiutato, allegabile a soggetto
   o a una sede; "Disattiva" lo chiude con `valido_al`.
7. **Fatturazione**: `attiva` senza codice/PEC/estero rifiutata; codice SDI non di 7 rifiutato;
   con codice valido si salva e si rilegge.
8. **Disattiva** rifiutata con ruoli attivi, permessa quando non ce ne sono.
9. **Permessi**: un `operatore` senza `dati.modifica` non vede i comandi di scrittura; un `lettore`
   vede solo. Profilo in sola lettura: niente comandi.
10. **Codice soggetto** visibile in Clienti, Fornitori, Subagenti sotto il nome.
11. 768 px: nessuno scorrimento orizzontale, la pagina si usa.

## Prove

1. In `app/backend`: `npx tsc --noEmit` e `npx jest --runInBand` **suite per suite**, 0 KO
   (conferma che il server non è stato rotto).
2. In `app/frontend`: `npx tsc --noEmit` e `npm run lint` se c'è, 0 errori.
3. Browser: backend e frontend su **porte libere** (non 8001/8002 se sono occupate), utenti
   `p1-*` creati con `node strumenti/prove/utenti_prova.js crea p1`; scrivi
   `strumenti/prove/app_soggetti.py` con lo scenario qui sopra e chiudilo con **0 KO**; nessun
   errore JavaScript in pagina.
   - Database dei processi avviati per la prova: `decobrands_test` (già migrato) o
     `decobrands_test_f1a8`, con i dati di prova caricati da `npm run db:seed` dal `backend/`.
     Non puntare mai i server di prova a `decobrands_db`.
4. Rilancia anche `app_clienti.py`, `app_fornitori.py` e `app_subagenti.py`: le tre pagine
   cambiate devono restare 0 KO (aggiorna le prove solo se il testo aggiunto le rompe davvero).
5. Schermate a 1440 e 768 in `%TEMP%\f1-a8` e **guardale** prima di consegnare.
6. Chiudi solo i processi che hai avviato tu.

## Regole

- Italiano semplice in interfaccia, testi e commenti; commenti brevi con il rimando alla decisione.
- Codice minimo (ponytail): niente componenti nuovi se basta comporne uno esistente; se proprio
  serve un componente nuovo, aggiungilo al catalogo `/componenti` e scrivilo nel resoconto.
- Niente commit, niente push, niente `.env`, niente file di altri lavori.
- Non toccare `app/backend/` (se manca un campo nell'API, fermati e scrivilo nel resoconto invece
  di allargare il lavoro).
- Aggiorna la guida dell'app e la spec solo come detto sotto.

## Documentazione

- `app/frontend/lib/guida.ts`: argomento Soggetti (e una riga sul codice soggetto nelle pagine
  esistenti se non c'è).
- `specifica-anagrafica-soggetti.md`: aggiungi la riga della pagina nell'elenco dei file del
  prototipo e la rotta `/soggetti` nella sezione dell'implementazione.
- Nel resoconto scrivi le righe per `specifica-crm-provvigioni.md` §19 (se serve una decisione
  nuova, es. la posizione del codice soggetto) e per `avanzamento-app.md`: **non le applicare tu**.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a8b.md` con:
- file creati e toccati;
- come si comporta la pagina (elenco, schede, finestre) e cosa viene dal server;
- lo scenario della prova browser e il numero di OK/KO;
- le altre prove rilanciate e l'esito;
- le schermate 1440/768 e cosa hai visto;
- i controlli `ponytail-review` e `accessibility` e cosa hanno trovato;
- i dubbi e le cose rimaste aperte.
