# Resoconto · Onda 0 bis · Pacchetto 0b-05 — Cerca in Integra: scheda dopo Importa, pulsanti con il nome della riga; Clienti con i filtri su una riga

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: R2-09, R2-10, R2-11 · Decisione applicata: D-135.

## Cosa ho fatto

### R2-09 — dopo *Importa* si apre la scheda (D-135)
- `app/frontend/componenti/CercaInIntegra.tsx`: `CercaInIntegraProps.onImportato` passa da `() => void | Promise<void>` a `(id: string) => void | Promise<void>` (riga 22). La risposta di `integra/importa` è tipata con `id: string` (riga 57) e `importa()` chiude e chiama `await onImportato(r.dati.id)` (riga 62). Il backend (`anagrafica-integra.ts`, non mio) restituisce sempre `id` anche nel caso `gia_presente`, quindi D-135 vale pure per «Era già in anagrafica».
- `app/frontend/app/(app)/clienti/VistaClienti.tsx` (riga 194): `onImportato={async (id) => { await carica(); router.push('/clienti/' + id); }}`.
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx` (riga 338): `onImportato={async (id) => { await carica(); router.push('/fornitori/' + id); }}`.
- Ordine voluto: prima si ricarica l'elenco (la riga nuova diventa cliccabile), poi si naviga. Il `router.replace('/clienti/<primo>')` dell'effetto, se scatta durante il ricaricamento, viene sovrascritto dal `push` finale; l'URL che resta è quello del soggetto importato.
- La guida (`lib/guida.ts`, righe 516 e 598) diceva già «apre il nuovo fornitore/cliente»: ora è vero e **non va tolta**.

### R2-11 — un nome accessibile per ogni *Importa*
- `app/frontend/componenti/CercaInIntegra.tsx` (riga 90): `aria-label={'Importa ' + (x.ragione_sociale || x.codice)}`. L'etichetta visibile resta «Importa» / «Importo…».

### R2-10 — Clienti: ricerca e segmenti su una riga
- `app/frontend/app/stile/stile.css` (dopo `.soggetti-filtri`, righe 188-193): copiate **identiche** le 6 righe `.clienti-filtri …` dal prototipo (`prototipo-alternativo/assets/stile.css` righe 183-188), con il commento del prototipo.
- `app/frontend/app/(app)/clienti/VistaClienti.tsx` (riga 192): `className="pila riempi clienti-filtri"` sulla colonna sinistra. Prima ho controllato con `grep` che `clienti-filtri` non esistesse nello stile dell'app (non c'era).

## Prove lanciate

- `cd app/frontend && npx tsc --noEmit` → 0 errori.
- `cd app/backend && npx tsc --noEmit` → 0 errori (pacchetto solo frontend, backend non toccato).
- `python -m py_compile strumenti/prove/app_clienti.py strumenti/prove/app_fornitori.py` → 0 errori.
- Nessuna prova nel browser (porte e `.next` condivisi con gli altri pacchetti dell'onda), nessun database di prova creato: il pacchetto non ha prove jest.
- `git status --short`: modificati solo i file ammessi. `app/frontend/app/(app)/documenti/VistaDocumenti.tsx` è modificato dal pacchetto 0b-06, non da me.

## Prove nel browser da lanciare a fine onda

- `python strumenti/prove/app_clienti.py <s> <cartella>`: nuove verifiche — ricerca e segmenti sulla stessa riga a 1440 px (`abs(y(.clienti-filtri .filtri .cerca) - y(.clienti-filtri .filtri .segmenti)) < 6`), pulsante `Importa Cliente Prova Integra` trovato con `get_by_role`, dopo il clic l'URL è `/clienti/<id>` e la scheda a destra è «Cliente Prova Integra».
- `python strumenti/prove/app_fornitori.py <s> <cartella>`: pulsante `Importa Fornitore Prova Integra` con `get_by_role`, dopo il clic l'URL è `/fornitori/<id>` e la scheda mostra «Fornitore Prova Integra».
- Controllo visivo a 1440 e 768 px su `/clienti` (barra filtri su una riga) e sulla finestra «Cerca in Integra».

## Cose aperte

- R2-09 ha una seconda parte che **non è di questo pacchetto** (file vietati): in `lib/guida.ts` mancano le voci Documenti («Importa da Integra» fornitore e cliente, «Importa dal vecchio CRM» spento, caso «Non rappresentato», badge «In Integra», «Non rappresentato», «Manca l'agenzia») e in Fornitori il pulsante «Configura gli scaglioni». Va fatta dal pacchetto 0b-doc / 0b-06.
- L'`aria-label` sostituisce il nome accessibile anche mentre il pulsante mostra «Importo…»: il lettore di schermo annuncia sempre «Importa <ragione sociale>». Accettato: dice l'azione e la riga, che è lo scopo del rilievo.
- **Catalogo dei componenti** `app/frontend/app/(app)/componenti/page.tsx` righe 229-230 (file non ammesso): descrive ancora «Dopo l'import la finestra si chiude e l'elenco si ricarica» e la firma `onImportato={() => ricarica l'elenco}`. Va aggiornato a «…e si apre la scheda del nuovo soggetto (D-135); ogni riga ha *Importa* con il nome», firma `onImportato={(id) => ricarica l'elenco e apre la scheda}`. Lo deve fare il pacchetto che ha quel file.

## Da documentare

### §19 — registro delle decisioni (la scrive 0b-doc)
- **D-135** · 11/11/2026 · Dopo *Importa* in «Cerca in Integra» si apre la scheda del cliente o fornitore appena importato (prima si ricarica l'elenco, poi si naviga su `/clienti/<id>` o `/fornitori/<id>`); la risposta di `integra/importa` porta sempre l'`id`, anche quando era già in anagrafica · Perché: la guida prometteva «apre il nuovo» e chi importa vuole subito aggiungere agenzie o scaglioni, non cercare la riga nell'elenco · Ugo (deciso, pacchetto 0b-05) · Dove: `CercaInIntegra.tsx`, `VistaClienti.tsx`, `VistaFornitori.tsx`, spec §4.7.1 e §7.6, `lib/guida.ts`.

### Riga *Perché* nella spec
- §4.7.1 (import su richiesta da Integra): «*Importa* chiude la finestra, ricarica l'elenco e apre la scheda del nuovo soggetto (D-135): l'`id` arriva nella risposta di `integra/importa`, anche quando il soggetto era già presente. Il pulsante di ogni riga si chiama «Importa <ragione sociale| codice>» per il lettore di schermo (D-135, R2-11).»
- §7.6 (Clienti): «La colonna sinistra usa `clienti-filtri` come il prototipo: ricerca e segmenti restano su una riga anche nella colonna stretta (D-24, R2-10).»

### Guida (`app/frontend/lib/guida.ts`) — testi pronti
- Clienti, finestra «Cerca in Integra», voce *Importa* (riga 598): il testo attuale va bene («Chiude la finestra, ricarica l'elenco e apre il nuovo cliente; le agenzie si aggiungono dalla sua scheda»): ora corrisponde al comportamento. Solo rifinitura facoltativa: «…e apre la scheda del nuovo cliente».
- Fornitori (riga 516): idem, «…apre il nuovo fornitore; nasce senza scaglioni (D-113)»: nessuna modifica necessaria.
- Descrizione della finestra (righe 502 e 585): facoltativo precisare «ogni riga ha il pulsante *Importa* con il nome del soggetto».

### Piano e README
- `piano-lavoro-crm.md`: nessuna attività nuova; il lavoro sta dentro F1-A11b «Clienti e Fornitori con Cerca in Integra». Se si annota la correzione: 0,5 h **da approvare** per R2-09/R2-11 (navigazione e nomi dei pulsanti) e 0,5 h **da approvare** per R2-10 (stile e classe dei filtri).
- `app/README.md`: nulla da cambiare.
