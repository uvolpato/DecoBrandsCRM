# Collaudo · Onda 2 · Pacchetto 2-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 2 hanno finito (e prima del controllo di fine onda).
Raccoglie in un solo passaggio la documentazione di tutti, così spec, guida e piano non si pestano.

## Contesto e regole

- Leggi `CLAUDE.md` (radice) per intero: §4 regole 2 e 3 (il perché accompagna sempre il cosa; ogni modifica si
  documenta: spec, §16.4, §19, guida, LEGGIMI, piano, poi `python3 strumenti/genera-pagine-doc.py`).
- Italiano semplice e conciso; niente parole inglesi inutili.
- Registro §19: una riga per decisione nuova o cambiata, **6 colonne** (D-nn, data, decisione, perché, chi, dove),
  numeri D-114…D-132 già assegnati nel piano (sotto); altre D-nn nuove solo di seguito all'ultima presente. Chi: «Ugo (collaudo
  08/11/2026)» per le regole confermate da Ugo, altrimenti «collaudo A-n» con l'ID del rilievo.
- Versione della spec in testa: alzala di uno (es. 8.61 → 8.62) con il riassunto delle modifiche dell'onda.
- Funzioni incerte segnalate come tali (D-06).
- Non toccare codice (`app/backend/src`, `app/frontend/{app,componenti,lib}` salvo `lib/guida.ts`), né prove, né `CLAUDE.md`
  (solo Ugo).

## Da raccogliere: sezioni *Da documentare* dei resoconti dell'onda

- `strumenti/opencode/resoconto-collaudo-2-01.md` (Confronto delle righe dei documenti calcolato dal server (V12, D-60))
- `strumenti/opencode/resoconto-collaudo-2-02.md` (Schede controllate, dettaglio del documento che si azzera, testi «non riconosciuto»)
- `strumenti/opencode/resoconto-collaudo-2-03.md` (Posta, casella e Integra modificabili solo dal superutente)
- `strumenti/opencode/resoconto-collaudo-2-04.md` (Aggiornamenti dal vivo: eventi persi, SSE dopo l'uscita, sollecito che non avvisa)
- `strumenti/opencode/resoconto-collaudo-2-05.md` (Chiusura del bollettino, somme in Decimal, prove di concorrenza (V13))
- `strumenti/opencode/resoconto-collaudo-2-06.md` (Esci sicuro, ritorno dopo l'accesso, contatori della barra dal vivo, Stato del sistema)
- `strumenti/opencode/resoconto-collaudo-2-07.md` (DataTable: paginazione sempre, intestazioni e righe da tastiera)
- `strumenti/opencode/resoconto-collaudo-2-08.md` (Guscio: pagina d'errore se il server non risponde; pulsanti spenti anche da tastiera)
- `strumenti/opencode/resoconto-collaudo-2-09.md` (Motore: indici costruiti una volta, niente scansioni quadratiche)
- `strumenti/opencode/resoconto-collaudo-2-10.md` (Più clienti con la stessa P.IVA: decide la ragione sociale)
- `strumenti/opencode/resoconto-collaudo-2-11.md` (Tipo di provvigione del fornitore fisso dopo la prima chiusura)
- `strumenti/opencode/resoconto-collaudo-2-12.md` (Cliente › Pratiche: importo in euro e stato con etichetta)
- `strumenti/opencode/resoconto-collaudo-2-13.md` (mpiu/mk esportati da PeriodoMesi)
- `strumenti/opencode/resoconto-collaudo-2-14.md` (Dipendenze: inutile tolta, versioni bloccate, strumento di prova fuori da src, ESLint)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro, in ordine di numero)

Numeri già assegnati nel piano (D-114…D-132): usa **esattamente** questi, una volta sola. Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede l'utente, il testo in `guida.ts`.

| D-115 | 08/11/2026 | **Connessioni solo al superutente.** Le sezioni Posta, Casella e Integra delle Impostazioni si modificano con il permesso nuovo `sistema.connessioni` (solo superutente); le altre sezioni restano a `sistema.impostazioni`. Se cambia server, porta o utente di una connessione la password va riscritta (400): il segreto salvato non parte mai verso un indirizzo nuovo. | Dalla Posta passa il link di reset della password del superutente: un amministratore con un SMTP suo poteva leggerlo e diventare superutente, contro D-39 e D-45 (collaudo A1-01). | Ugo (collaudo 08/11/2026, U2) | §7.15, §8.3; `impostazioni.ts`, `impostazioni-api.ts`, `accesso.ts` |
| D-124 | 08/11/2026 | **Cliente riconosciuto per P.IVA anche quando è condivisa.** La P.IVA letta si confronta senza prefisso del paese; un solo cliente con quella P.IVA → quello; più clienti → decide la ragione sociale normalizzata se il candidato è uno solo, altrimenti «non riconosciuto». Precisa D-92. | In Integra le sedi di una catena hanno la stessa P.IVA: si prendeva sempre il primo cliente (collaudo A4-07). | Ugo (collaudo 08/11/2026, U12) | §6.5; `proposta.ts` |
| D-121 | 08/11/2026 | **Il tipo di provvigione del fornitore non cambia dopo la prima chiusura.** `fornitori.tipo_provvigione` (fatturato / maturato) → 409 se il fornitore ha già una chiusura (bollettino verificato o trimestre liquidato, `ultimaChiusura`); `giorno_bollettino` e `giorni_incasso` restano liberi. | Il tipo decide come si ricalcolano dal vivo i mesi chiusi (Analisi, Report): cambiarlo riscriveva il passato; gli altri due campi toccano solo solleciti e scadenze (collaudo A3). | Ugo (collaudo 08/11/2026, U8) | §5.5, §7.4; `fornitori.ts` |

## Righe *Perché* senza numero nuovo (confermano una regola esistente)

- §16.4.2 — *Perché (U20, D-75 confermata):* i contatori della barra si rileggono a ogni cambio pagina **e** a ogni evento SSE; la richiesta è leggera (conteggi in SQL).

## Rilievi di documentazione assegnati a questa onda

### A9-07 — 23 decisioni senza riga *Perché* nella sezione che descrivono (D-94 punta a §7.9 e §16.4.2 che non la citano)
- Gravità: P3
- Dove: spec, fuori dal §19 non compaiono mai: D-02, D-03, D-04, D-06, D-07, D-09, D-10, D-13, D-40, D-63, D-64, D-65, D-75, D-76, D-77, D-78, D-79, D-81, D-84, D-86, **D-92, D-93, D-94**. Casi recenti: D-94 «Dove: §7.9, §16.4.2» ma §7.9 (r. 2279 ss.) e §16.4.2 (r. 3920 ss.) non parlano di layout né di SSE per l'elenco; D-93 non è in §7.3/§7.9; D-92 (regola «P.IVA poi ragione sociale con un solo candidato», codice `app/backend/src/proposta.ts:198-240`) non è descritta in §6.5 (r. ~1450 cita solo `piva_cliente`, D-91). Altre ~40 (es. D-12, D-15…D-24, D-73, D-74, D-80, D-90, D-91) sono citate nel testo ma non in una riga *Perché*.
- Problema: CLAUDE.md §4 regola 2 (una riga *Perché* nella sezione della spec) non rispettata; chi sviluppa leggendo §7.9 non sa che l'elenco deve stare nel layout.
- Scenario: sviluppatore rifà `/documenti` con due `page.tsx` «per semplicità» → torna il ricaricamento a ogni clic (il motivo di D-94 sta solo nel §19).
- Correzione puntuale: aggiungere *Perché (D-nn):* almeno per D-92 in §6.5, D-93 in §7.3 e §7.9, D-94 in §7.9 e §16.4.2, D-63 in §11, D-64 in §16.4.1, D-65 in §7.15, D-81/D-84/D-86 in §3.3; le altre storiche si possono lasciare con una nota in testa al §19 «le decisioni ≤ D-13 hanno il perché solo qui».
- Prova che la verifica: lo script di questo report (cerca `Perch…D-nn` fuori dal §19).
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A9-08, D-92, D-93, D-94

### A9-10 — Guida e spec §7.3: pulsante *Carica un documento* nella pratica, che l'app non ha
- Gravità: P3
- Dove: `app/frontend/lib/guida.ts:193` (Pratiche, «Carica un documento — Nella scheda: carica un documento già destinato a questa pratica») e spec §7.3 r. 1842 e 1869 («*Carica un documento* … arrivano con F6») contro `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (testo assente; c'è solo *Prepara il sollecito*, r. 462). Il prototipo lo ha (`viste-giorno.js:683`).
- Problema: F6 è chiusa ma il pulsante non c'è; la guida lo promette.
- Scenario: l'operatore cerca *Carica un documento* nella testata della pratica e non lo trova.
- Correzione puntuale: o togliere la riga da guida.ts e scrivere in §7.3 r. 1869 «nell'app si carica da *Carica documenti* della barra e si abbina in Documenti», o aggiungere l'azione (frontend, A5).
- Prova che la verifica: `strumenti/prove/app_pratica.py`.
- Esecutore: DeepSeek V4 Flash (testi) — V4 se si aggiunge il pulsante.
- File toccati: `app/frontend/lib/guida.ts`, `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A5

### A9-11 — §8 API: rotte vecchie che non esistono e rotte vere non documentate (agenzie dei clienti)
- Gravità: P3
- Dove: spec §8.1 r. 3011-3013 (`/api/interscambio`, `/api/interscambio/:id`), r. 3017-3022 (`/api/ordini-fornitore/*` crea/aggiorna/elimina/righe/upload), `/api/fornitori-lista`, `/api/integra/stato`, r. 3010 `/clienti/:piva` — nessuna esiste in `app/backend/src`. Rotte vere senza riga in §8: `GET /api/clienti`, `GET /api/clienti/:id`, `GET /api/clienti/:id/pratiche`, `GET|POST /api/clienti/:id/agenzie`, `PUT|DELETE /api/clienti/:id/agenzie/:aid` (`clienti.ts:81-328`), `GET /api/agenti`, `GET /api/agenti/:id` (`subagenti.ts:68-82`), `POST /api/integra/prova`, `POST /api/integra/sincronizza` (`integra.ts:474-481`).
- Problema: le agenzie (sconto → percentuale della provvigione) si modificano da rotte non documentate, mentre la spec documenta quelle vecchie.
- Scenario: chi scrive un client o una prova segue §8 → `POST /api/interscambio` risponde 404.
- Correzione puntuale: sostituire le righe `interscambio` con le 4 di `/api/clienti/:id/agenzie` (permesso `dati.modifica`, corpo e 409 come nel codice); togliere `ordini-fornitore/*`, `fornitori-lista`, `integra/stato` o marcarle «non fatte»; aggiungere `clienti`, `agenti`, `integra/prova|sincronizza`; `/clienti/:piva` → `/clienti/:id`.
- Prova che la verifica: lo script di confronto rotte di questo report (estrae `@Controller/@Get…` e cerca in §8).
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`
- Dipende da / correlato a: D-35, D-60

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-2-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-2-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
