# Resoconto — Giro di prove dopo `pratica-da-ricerca` e `righe-nota-credito` (16/11/2026)

Esecutore: OpenCode (DeepSeek) · Pacchetto: `strumenti/opencode/giro-0-2-8-prove.md`.
**Nessuna modifica al backend.** Database di prova: `decobrands_test_giro` (backend 8012, frontend 8071).
Skill caricate davvero: `playwright-best-practices`, `caveman` (e `ponytail` in modalità piena).

## Prove: prima e dopo

| Prova | Prima (da Claude) | Dopo |
|---|---|---|
| `app_documenti` | errore: timeout `.avviso:has-text("Agenzia creata")` (riga 203) | **174 controlli, 0 KO**, nessun errore JS |
| `app_pratica` | errore: timeout `go_back()` (riga 424) | **99 controlli, 0 KO**, nessun errore JS |
| `app_pratiche` | 24/0 | **24 controlli, 0 KO** |
| `app_oggi` | 43/0 | **43 controlli, 0 KO** |
| `app_liquidazioni` | 77/0 | **77 controlli, 0 KO** |
| `app_fornitori` | — | **42 controlli, 0 KO** |
| `app_soggetti` | — | **64 controlli, 0 KO** |
| `app_utenti` | — | **28 controlli, 0 KO** |
| `app_componenti` | — | **59 OK, 0 KO**, nessun errore JS |
| `app_registro` | — | **28 controlli, 0 KO** |

Giro: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_giro`, poi `giro.sh` sulle dieci prove.
`npx tsc --noEmit` nel frontend: **OK**. `python -m py_compile` sulle tre prove toccate: OK.

## Cause e correzioni

### 1. Difetto vero — `app_pratica` (e tutte le registrazioni a mano): la finestra tornava sulla coda
`VistaPratica.tsx`, `RegistraDocumento`: l'effetto che carica i documenti in coda finiva con
`setModo('coda' | 'mano')`. Se la risposta del server arrivava **dopo** che la persona aveva premuto
«Inserisci a mano», la scelta veniva sovrascritta e il modulo tornava sulla coda (senza `#c-numero`).
Da qui l'errore intermittente a riga 170/308/349 e, prima, il `go_back` a vuoto.
Correzione (app): una `useRef` `sceltaFatta` messa a `true` dai due segmenti; l'effetto non cambia più
il modo se la persona ha già scelto. È l'unica modifica al frontend oltre a quella del punto 2.

### 2. Difetto vero — `app_documenti` riga 171: `aria-label` del pulsante «apri in una nuova scheda»
Il testo usciva «Apri pratica in una nuova scheda» (senza articolo) invece di «Apri la pratica in una
nuova scheda» (il testo chiesto da Ugo, punto 3 del pacchetto, e dalla spec).
Correzione (app): nuovo campo facoltativo `apriEtichetta` in `Entita` (`lib/entita.ts`), usato da
`RicercaEntita` (`CampoRicerca.tsx`), impostato sull'entità `PRATICA` in `VistaDocumento.tsx`.
Le altre entità restano col testo generico di prima.

### 3. Prova da aggiornare — `app_documenti`: il finto server della pratica era incompleto
Dopo l'abbinamento l'app apre la pratica (`router.push('/pratiche/1')`): il mock di `/api/pratiche/1`
aveva solo i campi della finestra di conferma, quindi `VistaPratica` andava in errore
(`Cannot read properties of undefined (reading 'variazioni')`, poi `(reading 'v')` per lo stato
`confermato` invece di `confermata`). Aggiornata la prova: dettaglio completo (fasi, confronto,
azione, incassi) e `/documenti`, più il controllo «dopo l'abbinamento si apre la pratica».

### 4. Prova da aggiornare — `app_documenti`: la prova non era ripetibile
L'agenzia creata dal flusso D-106 resta nel database: al giro dopo il server la rifiuta e l'avviso non
compare più (il timeout di riga 203 visto da Claude). Aggiornata la prova: prima del flusso toglie via
API le agenzie con `valido_dal = 2026-09-15` del cliente del documento (stessa idea della pulizia dei
documenti di prova). Verificato: al secondo giro toglie 1 agenzia e passa.

### 5. Prova da aggiornare — `app_documenti`: titolo della pratica in vista sola
`inner_text()` di `.testa h1` contiene anche la pillola di stato: il confronto era `== 'OF/2026/001'`.
Ora è `'OF/2026/001' in …`.

### 6. Punto 3 del pacchetto — pulsante «Apri la pratica in una nuova scheda»
La prova ora **clicca** l'icona (`expect_popup`): si apre una scheda su `/pratiche/123?vista=sola`,
senza `.barra`, senza «Torna a…», con «Chiudi la scheda»; il pulsante «Seleziona» della ricerca resta
spento, quindi il clic non sceglie la riga. Mock delle API registrati sul *contesto*, così valgono
anche per la scheda nuova.

### 7. Robustezza delle prove (cambi voluti)
- `app_pratica`: `torna_indietro()` (Indietro con 3 tentativi) al posto del `go_back()` secco; `mano()`
  aspetta che la finestra sia pronta (la coda arriva dal server) e che il modulo a mano ci sia.
- `app_soggetti`: `vai()` riprova il clic sul menu.
Motivo: con `next dev` la prima visita di una rotta la compila e il clic può perdersi; l'errore si
vedeva solo a freddo (dopo `prepara.sh`), mai a caldo.

## Aperti / da segnalare

- Il giro resta sensibile alla compilazione di `next dev` alla prima visita: se una prova va in timeout
  al primo giro, scaldare la pagina con `curl` e rilanciare (come dice il pacchetto).
- `app_documenti` crea un'agenzia vera nel database di prova: la prova ora la toglie da sé, ma un crash
  a metà flusso può lasciarla (con un database rifatto da `prepara.sh` non è un problema).

## Da documentare (a cura di chi chiude l'onda)

- spec §7.2/§7.3 «Registra un documento»: la scelta coda/a mano **non** viene sovrascritta quando la
  coda arriva dal server (perché: si perdeva il modulo a mano mentre lo si compilava).
- spec §16.4: `Entita.apriEtichetta` (testo del pulsante «apri in una nuova scheda»; per la pratica
  «Apri la pratica in una nuova scheda»).
- `guida.js`/`guida.ts` e catalogo: nessun cambiamento di testo visibile (solo a11y e comportamento).
- Il fix della coda non cambia le ore del piano.
