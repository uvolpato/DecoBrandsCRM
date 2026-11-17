# Resoconto — `prove-browser-0-2-10`

Esecutore: DeepSeek Flash · Pacchetto: `strumenti/opencode/prove-browser-0-2-10.md`.
Skill caricate davvero: `playwright-best-practices`, `caveman`. File toccati: solo
`strumenti/prove/app_bollettino.py` e `strumenti/prove/app_bollettini.py` (nessun file dell'app).

## Esito

| Prova | Prima | Dopo (seed pulito, due giri) |
|---|---|---|
| `app_bollettino` | si fermava alla riga 152 (timeout sul 409), poi 2 KO trovati sotto | **48 controlli, 0 KO** (due volte) |
| `app_bollettini` | 23 controlli, 1 KO «doppione» | **23 controlli, 0 KO** (due volte) |

Nessun bug dell'app trovato: i tre rilievi sono tutti prove superate dal comportamento voluto
(D-201 e la regola «una riga mancante non si abbina»). Nessun errore JavaScript, nessun errore
nel modulo.

## Prova → causa → cosa è cambiato

### 1. `app_bollettino` riga 152: il 409 aspettato non arrivava — prova superata da D-201

Il controllo abbinava `F-2026-0891`, che sta su **Gries 7/2026, lo stesso bollettino**: con D-201
§19 più righe dello stesso bollettino sulla stessa fattura sono ammesse (formano un gruppo), quindi
`bollettino.ts:266` non solleva più il 409 (`testata_id: { not: riga.testata_id }`).

Cambiato: il documento del 409 è ora `F-2026-0840` (Gries **6/2026**, chiuso), con l'attesa
`già sul bollettino 6/2026` nell'elenco e `già sulla riga` nel messaggio del server.

### 2. `app_bollettino`: mancava il controllo del gruppo — aggiunto (D-201)

Dopo la decisione su Gries luglio (in fondo a quella sezione, perché l'abbinamento non si annulla
dalla pagina) la prova annulla la decisione, abbina `F-2026-0912` allo stesso documento di
`F-2026-0891` e controlla che: nessun `.modulo-errore`, niente più in «Quadrano», una sola riga
in «Da decidere», e la riga del gruppo porta il dettaglio delle due righe
(`774,00 € al 5%` e `1.144,50 € al 17,5%`). Il controllo precedente non è stato tolto, è stato
sostituito da questo più il 409 di cui al punto 1.

Nota tecnica: `euro()` mette uno spazio unificatore prima di `€`, quindi il confronto si fa con
`locator(has_text=…)` (che normalizza gli spazi), non con `in` su `inner_text()`.

### 3. `app_bollettino` riga 246: «Abbina il documento» su una riga mancante — prova vecchia

Dopo l'abbinamento di `F-2026-0921` a `NC-2026-007`, il documento `F-2026-0921` torna *mancante*:
in `VistaBollettino.tsx:222` una riga mancante (`x.id === null`) **non ha** il pulsante di
abbinamento — è giusto così, una riga mancante non è una riga del bollettino. Il ritorno indietro si
fa abbinando la riga che ora punta a `NC-2026-007` alla sua fattura. Sezione riscritta così,
intento invariato («tornando al documento giusto la riga quadra di nuovo», poi i controlli
successivi sulla stessa riga restano).

### 4. `app_bollettini` riga 131 «doppione» — corsa della prova

Il server risponde correttamente (`Il bollettino di 9/2026 di Ing's … c'è già: aprilo per
verificarlo`): il testo del controllo è giusto e ora lo stampa nel messaggio del KO. La causa è
nella prova: la seconda finestra si apriva e premeva `Invio` sul fornitore dopo 700 ms fissi;
se l'elenco delle voci non era ancora arrivato, il campo restava vuoto e l'errore del modulo era
«Scegli il fornitore.». `carica()` ora aspetta `li[role=option]` e **clicca** «Ing's» come fa
`apri_abbina`/`scegli` di `app_bollettino`. Due giri su seed pulito: 0 KO.

### 5. (accessorio) `app_bollettino`: risultati anche se la prova si ferma

Un timeout su un'attesa lasciava l'uscita senza gli `OK`/`KO` già raccolti (`giro.sh` conta le
righe `^OK`/`^KO`). Aggiunto `atexit.register(riepilogo)`: il riepilogo esce anche dopo un
traceback. Nessun controllo tolto.

## Prove

Le prove del browser sono state lanciate: il pacchetto lo chiede esplicitamente («Come lanciare
(solo così)», obiettivo 0 KO) e non ce n'erano altre in parallelo sulla 8071.

- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` + `giro.sh decobrands_test_e2e app_bollettino`:
  **48 OK / 0 KO**, due volte (dopo due `prepara.sh`).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` + `giro.sh decobrands_test_e2e app_bollettini`:
  **23 OK / 0 KO**, due volte (dopo due `prepara.sh`).
- `python -m py_compile` su entrambi i file: OK. `npx tsc --noEmit` non serve: nessun file
  TypeScript toccato.

## Da documentare

- In `app_bollettino.py` era già presente nella copia di lavoro, prima di questo pacchetto, un
  controllo non committato (`nessuna quota pagata mostrata…`, D-201): è rimasto ed è fra i 48 OK.
  Non è una mia aggiunta ma va nel commit dell'onda insieme al resto.

- Nulla per la spec: D-201 §19 descrive già quota, gruppo e «il doppione resta solo fra bollettini
  diversi»; queste prove ora lo verificano anche nel browser (`app_bollettino`) e continuano a
  verificare il doppione vero (`app_bollettini`).
- Per Claude Code: il gruppo in Gries luglio resta nei dati del database di prova a fine prova
  (`decobrands_test_e2e` viene comunque rifatto da `prepara.sh`); nessun altro file toccato.
- Nessuna riga del §19 da aggiungere. Nessuna ora di piano cambiata.
