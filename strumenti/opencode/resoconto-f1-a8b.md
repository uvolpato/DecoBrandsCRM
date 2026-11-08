# Resoconto F1-A8b — Le pagine dell'anagrafica unica a soggetti

Data: 08/11/2026. Slice F1, seconda metà di F1-A8 (D-102): la pagina `/soggetti` e il codice del
soggetto nelle tre anagrafiche. Il server (schema, API, seed) è quello consegnato in F1-A8a e **non è
stato toccato**.

## File creati

- `app/frontend/app/(app)/soggetti/layout.tsx` — monta la vista con `useParams` (come `clienti/`).
- `app/frontend/app/(app)/soggetti/page.tsx` — vuoto (`/soggetti`).
- `app/frontend/app/(app)/soggetti/[id]/page.tsx` — vuoto (`/soggetti/:id`); senza questo file la
  rotta cadeva nel segnaposto «In costruzione».
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx` — la pagina: elenco, filtri, scheda, finestre.
- `strumenti/prove/app_soggetti.py` — prova Playwright dello scenario del brief.
- `strumenti/opencode/resoconto-f1-a8b.md` — questo resoconto.

## File toccati

- `app/frontend/componenti/Barra.tsx` — voce **Soggetti** in Dati → Anagrafiche, prima di Fornitori,
  area `dati`, icona `subagenti` (nessuna icona nuova).
- `app/frontend/componenti/Pagina.tsx` — `/soggetti` nella tabella delle Guide e «ai Soggetti» per il
  «Torna a …»: senza, la testata non avrebbe il link alla Guida.
- `app/frontend/componenti/FormModal.tsx` — proprietà facoltativa `azioniExtra` (come il prototipo):
  serve a mettere «Disattiva» dentro la finestra del recapito senza una colonna in più nella tabella.
- `app/frontend/app/(app)/componenti/page.tsx` — la firma di `FormModal` nel catalogo, come chiede
  CLAUDE.md §4.3 quando cambia un componente.
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`, `.../fornitori/VistaFornitori.tsx`,
  `.../subagenti/VistaSubagenti.tsx` — `C000123 · …` nella seconda riga sotto il nome e riga *Codice
  soggetto* nel pannello, come nel prototipo.
- `app/frontend/lib/guida.ts` — argomento **Soggetti** (sintesi, 7 pulsanti, 5 finestre, da sapere) e
  una riga sul codice soggetto in Fornitori, Subagenti e Clienti.
- `app/frontend/app/stile/stile.css` — le tre righe `.soggetti-filtri` del prototipo (ricerca larga e
  segmenti a destra); nessuna classe nuova inventata.
- `strumenti/prove/app_guida.py` — i conteggi degli argomenti passano da 18 a 19 (e da 12 a 13 per la
  lettura): il nuovo argomento Soggetti li cambia davvero.
- `specifica-anagrafica-soggetti.md` — versione 3.1; in §10 la riga della pagina `/soggetti`, cosa
  viene dal server, gli scostamenti dal prototipo; F1-A8b tolta dalle attività successive.

Non toccati: `app/backend/**`, `.env`, `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`,
`avanzamento-app.md`.

## Come si comporta la pagina

Elenco a sinistra e scheda a destra (colonne pari, come `vistaSoggetti` del prototipo).

- **Ricerca e segmenti** — `Tutti · Clienti · Fornitori · Subagenti · Non attivi`: ricerca, segmento,
  ordinamento (`codice`/`nome`), pagina e righe per pagina vanno a `GET /api/soggetti`; tornano
  `righe`, `totale` e `conteggi`. Il browser non filtra e non conta niente (D-23, V12). Il numero di
  ogni segmento conta con la ricerca (il server lo calcola senza il segmento).
- **Tabella** — `DataTable` con ordinamento e pagine del server (`ordine`/`onOrdine`,
  `paginaServer`/`onPagina`), sagome al primo caricamento e tabella più tenue mentre si aggiorna
  (D-59), memoria di ordinamento, pagina e scorrimento (§7.12). Le pagine si ricavano da `totale` e
  righe per pagina: l'API non manda `pagine` (non è un calcolo di dati, ma va segnalato).
- **Scheda** — identità (codice, natura, P.IVA con la normalizzata, CF, paese, sorgente, stato),
  quattro schede con i contatori: Ruoli (dal ruolo attivo, con i due codici di MCL), Sedi (solo quelle
  non chiuse), Recapiti (solo quelli in uso), Fatturazione (1 se configurata).
- **Finestre** — Nuovo soggetto / Modifica identità, Aggiungi ruolo (cliente e fornitore), Nuova sede,
  Nuovo recapito (allegabile a soggetto, sede o persona), Fatturazione, Disattiva/Riattiva. I controlli
  sono tutti del server: P.IVA doppia (con codice e nome dell'esistente), P.IVA corta, nessun dato
  fiscale, ruolo già presente, email sbagliata o duplicata, recapito legato a una sede di un altro
  soggetto, SDI non di 7, `attiva` senza codice/PEC/estero, disattivazione con ruoli attivi. La finestra
  mostra il messaggio così com'è; nessuna regola è copiata nel browser.
- **Permessi** — lettura con `dati.consulta` (controllo del guscio, come le altre pagine), scrittura
  con `dati.modifica`: senza, i comandi non compaiono e il server rifiuta lo stesso (D-05).
- **Codice soggetto** — `soggetto_codice` sotto il nome in Clienti, Fornitori e Subagenti e riga
  *Codice soggetto* nei pannelli.

## Prova nel browser

`strumenti/prove/app_soggetti.py p1 <cartella>`: backend e frontend su porte libere (8012 e 8011),
database `decobrands_test_f1a8` con `npm run db:seed` e gli utenti `p1-*`. Scenario del brief:
elenco e conteggi (28 · 13 · 12 · 4 · 0), ricerca per nome/P.IVA, segmenti con i numeri, ordinamento e
pagina 2 dal server, memoria della schermata, scheda MCL (ruoli 2, sedi 4, recapiti 3, fatturazione 1),
nuovo soggetto con i tre rifiuti e la creazione (`C000029`), ruoli cliente e fornitore con due codici,
apertura del ruolo, sedi con una sola predefinita, recapiti (errore, duplicato, allegato a sede,
disattivazione), fatturazione (rifiuti e rilettura dopo il ricaricamento), disattiva rifiutata,
lettura senza comandi, codice soggetto nelle tre pagine, 768 px.

Esito: **57 controlli, 0 KO**, nessun errore JavaScript. La prova crea un soggetto che resta nel
database: va rilanciata su un database riportato al seed.

## Altre prove rilanciate

- `app_clienti.py`: 33 controlli, 0 KO.
- `app_fornitori.py`: 25 controlli, 0 KO.
- `app_subagenti.py`: 30 controlli, 0 KO.
- `app_guida.py` (con i conteggi aggiornati a 19 e 13): 26 controlli, 0 KO.
- `npx tsc --noEmit` in `app/frontend` e in `app/backend`: nessun errore. `npm run build` del
  frontend: riuscito (la rotta `/soggetti` c'è). `npm run lint` non esiste in `app/frontend`.
- In `app/backend`: `npx tsc --noEmit` pulito; `npx jest --runInBand` **suite per suite**: 37 file di
  prova, **528 prove, 0 KO**. Il processo node si era fermato a metà del primo giro (25 file fatti),
  quindi gli ultimi 12 file sono stati rilanciati in due blocchi da 6 (`npx jest --runInBand <file…>`).
  Nel conteggio delle esecuzioni `lettura.spec.ts` aveva fatto girare anche `documenti-lettura.spec.ts`
  (19 prove contate due volte): da lì il totale vero di 528.
- `app_componenti.py` non è stato rilanciato: la pagina Componenti è del superutente e gli utenti
  `p1-*` non lo sono. Nel catalogo è cambiata solo la firma di `FormModal` (una parola in più).

Una nota di onestà: un primo giro di `app_clienti.py` è caduto con «Periodo sovrapposto» perché il
primo clic dell'elenco è arrivato prima che il segmento «Senza agenzie» fosse applicato (corsa nella
prova, non nella pagina); rilanciata da sola, è passata 0 KO.

## Schermate (in `%TEMP%\f1-a8`)

Prese sul database riportato al seed, quindi con i numeri del prototipo (28 soggetti, `C000001…`):

- `soggetti-elenco-1440.png`: intestazione con titolo e sottotitolo, ricerca larga e cinque segmenti
  con i numeri (28 · 13 · 12 · 4 · 0), tabella con codice, nome, P.IVA normalizzata, badge dei ruoli
  e stato; piede «1–25 di 28» con le pagine; scheda a destra con le quattro schede.
- `soggetti-mcl-1440.png`: MCL SRL con due ruoli e i due codici (C02477, F90012), sedi e recapiti
  contati; il nome del ruolo è un link (tastiera).
- `soggetti-sedi-1440.png`, `soggetti-recapiti-1440.png`, `soggetti-fatturazione-1440.png`: le tabelle
  entrano nella colonna (dopo aver tolto le colonne che la sfondavano e accorciato le etichette della
  fatturazione), nessuno scorrimento orizzontale.
- `soggetti-fatturazione-768.png` e `app-soggetti-768.png`: a 768 px elenco e scheda si impilano, i
  filtri si usano, nessuno scorrimento orizzontale.
- `app-soggetti-1440.png` e `app-soggetti-rifiuto-1440.png` sono gli scatti della prova stessa: la
  scheda del soggetto creato e la finestra che spiega perché non si disattiva.

Cosa ho corretto dopo averle guardate: le colonne «clic per aprire» (Ruoli) e «Disattiva» (Recapiti)
sfondavano la colonna destra e tagliavano il testo; le etichette lunghe della Fatturazione
(`Codice destinatario (SDI)`) si sovrapponevano.

## Controlli caricati

**`ponytail-review`** (letto il diff e i chiamanti):
- *Must fix*: nel modulo «Modifica identità» il campo Note partiva vuoto → salvando si sarebbe
  cancellata la nota esistente. Corretto (`valore: s?.note`).
- *Should fix*: doppia lettura della scheda dopo il salvataggio dell'identità (`ricarica()` e
  `caricaDettaglio()`): tolta, basta `ricarica()`.
- *Should fix*: `FormModal` cresce di una proprietà; serve e viene dal prototipo (`azioniExtra`), non
  è un'astrazione preventiva. Aggiornato il catalogo.
- *Nice*: nessuna funzione inutile; il calcolo delle pagine da `totale` è l'unico numero fatto nel
  browser (l'API non lo manda) — segnalato, non nascosto.

**`accessibility`** (WCAG 2.2, controlli sul DOM vero e a tastiera):
- Etichette collegate a ogni campo (`Campo`), errori con `role="alert"`, finestre con Esc, focus al
  primo campo e ritorno a chi l'ha aperta, schede con le frecce, `aria-sort` sulle intestazioni,
  `aria-busy` durante il caricamento, sagome `aria-hidden`.
- Rilievo vero: le righe cliccabili delle tabelle non sono raggiungibili da tastiera (componente
  `DataTable` condiviso: vale per tutte le pagine, non solo questa). Ho reso il **nome del ruolo** un
  link vero (`<a href>`), così la pagina del ruolo si apre da tastiera; per Sedi e Recapiti resta il
  clic sulla riga. Non ho toccato `DataTable`: è un lavoro trasversale da fare una volta per tutte.
- Nessun altro rilievo: contrasto dei testi e dei badge come il resto dell'app, nessuna informazione
  affidata al solo colore.

## Dubbi e cose rimaste aperte

1. **`app/backend` non si tocca** (come da brief): l'API non manda `pagine` né `per_pagina`, quindi le
   pagine si ricavano da `totale / righe`; e i contatori delle quattro schede sono la lunghezza degli
   elenchi ricevuti (il server manda le righe, non i conteggi). Se si vuole tutto dal server anche qui,
   servono due campi nell'API.
2. **Stato «attivo» dei recapiti e delle sedi**: nel database la chiusura è `valido_al` (§4.3), non
   `attivo`; le schede mostrano solo le righe non chiuse e «Disattiva» scrive `valido_al = domani`
   (il server vuole una fine dopo l'inizio). Il prototipo usa `attivo`.
3. **Disattiva nel recapito** sta nella finestra, non in una colonna: la colonna tagliava il pulsante
   nella colonna destra dell'app. È uno scostamento dal prototipo, scritto in §10 della specifica.
4. **`FormModal`** ha una proprietà in più (`azioniExtra`): tocca un componente condiviso; la usano
   solo i recapiti. Se non la si vuole, l'alternativa è una finestra dedicata (più codice).
5. **Righe cliccabili da tastiera**: `DataTable` non le rende raggiungibili; andrebbe sistemato nel
   componente per tutte le anagrafiche, non solo qui.
6. **Sequenza dei codici**: `TRUNCATE` manuale non riavvia `soggetti_codice_seq` (non è posseduta
   dalla tabella); con il seed su un database nuovo i codici sono `C000001…C000028`, sui database di
   prova riusati continuano da dove erano. La prova non dipende dal numero.

## Righe per la documentazione (non applicate)

**`specifica-crm-provvigioni.md` §19** — se si vuole registrare la posizione del codice soggetto:

> **D-104 — 08/11/2026 — Il codice del soggetto si vede in tutte le anagrafiche.** Nelle pagine
> Clienti, Fornitori e Subagenti il codice `C000123` del soggetto sta sotto il nome (seconda riga) e
> nel pannello come *Codice soggetto*, accanto al codice Integra del ruolo. Perché: è il codice con
> cui si cita il soggetto al telefono, e il codice di Integra è del singolo ruolo (D-101), quindi i
> due non vanno confusi. Dove: `app/frontend/app/(app)/{clienti,fornitori,subagenti}/Vista*.tsx`,
> `specifica-anagrafica-soggetti.md` §10. Chi: F1 (DeepSeek V4.1 Flash), da approvare.

**`avanzamento-app.md`** — riga per il diario:

> 08/11/2026 — F1-A8b: pagina `/soggetti` (anagrafica unica, D-102) con elenco dal server, schede
> Ruoli/Sedi/Recapiti/Fatturazione, finestre con le validazioni del server; codice soggetto in
> Clienti, Fornitori e Subagenti; guida e catalogo aggiornati; prova `app_soggetti.py` (57 controlli).
> Restano aperti: pagine/conteggi delle schede dall'API, righe delle tabelle da tastiera.
