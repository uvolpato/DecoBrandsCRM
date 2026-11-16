# Resoconto — Registra un documento dalla coda (Prendi dalla coda) (15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/registra-da-coda.md`. Regole comuni rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto (solo `grep ^DATABASE_URL=`), prove su `decobrands_test_reg_coda` (creato e cancellato), niente 8001/8002, niente Integra, niente commit. Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Cosa è stato fatto

### 1. Server (`app/backend/src/documenti.ts`)
- **`ElencoDocumenti`**: filtri nuovi `fornitore_id` e `cliente_id` (facoltativi, `@IsInt @Min(1)`), usati come parametri (mai stringhe) nella query.
- **`elenco`** (`GET /documenti`): il CTE `campi` seleziona anche `cliente_id` (il cliente riconosciuto, campo `cliente_id` di `documenti_campi`); `cliente_id` nella risposta; i due filtri entrano in `altro` con `Prisma.empty` quando assenti (evitato `IS NULL` su bigint, che Postgres non tipizzava → 500).
- **`AbbinaDocumento`**: `tipo` diventa facoltativo (`@IsOptional() declare tipo: TipoDocumento`; il `@IsIn` della base resta, così gli altri usi lo esigono).
- **`abbina`** (`POST /documenti/:id/abbina`): se il corpo manda **solo `pratica_id`** (Prendi dalla coda), il server **blocca la riga** (`SELECT … FOR UPDATE`, V13), ricava `tipo`/`numero`/`data`/`importo` da `lettoDaCampi` e **ricontrolla** che `fornitore_id` (e `cliente_id`, se riconosciuto) coincidano con la pratica, altrimenti `400` con messaggio chiaro («Il documento è di un altro fornitore» / «…altro cliente» / «…non è stato letto…»). Nessun doppione, nessun documento nuovo: riusa `registra`, il file esce dalla coda.

### 2. Frontend (`app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`)
- `FinestraDocumento` accetta `coda?: { fornitore; cliente; tipo? }`: passato da `registraAltro` (senza `tipo`) e, dopo le **correzioni 1**, anche da `registra` per **fattura** e **nota di credito** (con `tipo`). Un solo blocco, parametrico sul tipo.
- In cima alla finestra i **segmenti** «Prendi dalla coda» / «Inserisci a mano» (`.segmenti`). Predefinito sulla coda solo se c'è un documento del tipo giusto, altrimenti «a mano».
- «Prendi dalla coda»: `GET documenti?stato=aperte&fornitore_id=…&per_pagina=200`; esclusi `in_lettura` e i documenti con cliente riconosciuto diverso dalla pratica. Con `tipo` l'elenco si filtra per tipo (fattura → solo fatture; nota → solo note); il tipo incerto (`tipo` null) va in fondo nella sezione «Tipo da verificare». Sopra i documenti del cliente della pratica, sotto «Cliente non riconosciuto». Scegliendone uno si vedono i dati in sola lettura (`Dettagli`) e il pulsante diventa «Abbina alla pratica».
- **Nota di credito**: con un documento scelto appare anche «Fattura stornata» (le fatture della pratica con residuo); «Abbina alla pratica» manda `fattura_id` come nel flusso a mano.
- «Inserisci a mano» resta il modulo di oggi (nessuna modifica).

### 3. Guida (`app/frontend/lib/guida.ts`)
- Voci «Registra un documento», «Registra la fattura» e «Registra la nota di credito»: aggiunti «Prendi dalla coda · Inserisci a mano», «Documenti in coda» e l'azione «Abbina alla pratica».

## Prove (0 KO)

- `npx tsc --noEmit` backend e frontend: **puliti**.
- `npx jest documenti-pratica.spec.ts`: **32/32 OK** (5 nuovi):
  1. elenco filtrato per fornitore+cliente, `cliente_id` nella risposta;
  2. abbina dalla pratica (solo `pratica_id`) → documento fuori coda e nella pratica, dati letti dal server;
  3. fornitore diverso 400, cliente riconosciuto diverso 400, documento non letto 400, già abbinato 409;
  4. nota di credito dalla coda abbinata con la fattura scelta e storno applicato;
  5. elenco per tipo: la fattura in coda non compare fra le note di credito.
- `npx jest documenti.spec.ts documenti-lettura.spec.ts coda.spec.ts`: **102/102 OK** (nessuna regressione sul canale comune).

## Controlli

- `owasp-security`: input validati (`@IsInt @Min(1)`), query parametrizzate (Prisma.sql con `BigInt`/`String`, mai concatenazione), nessun dato del browser salvato (V12); il ricontrollo fornitore/cliente è lato server con riga bloccata (V13).
- `ponytail-review`: nessuna astrazione nuova; si riusano `registra`, `lettoDaCampi`, `.segmenti`, `Elenco`, `Dettagli`; niente nuovo stato di elenco (si filtra con `stato=aperte`). `net: 0`.

## Aperti / note

- Un documento in coda **non ancora letto** (nessun `tipo`) appare nella sezione «Tipo da verificare» (o con nome file, senza tipo) e, scegliendolo, il server risponde «Il documento non è stato letto…»: l'utente lo apre in Documenti. Accettato come previsto.
- Il tipo «da verificare» (letto come incerto) si mostra solo quando la finestra filtra per tipo (fattura/nota); per «Registra un documento» (senza tipo) non c'è distinzione.
- Il numero di decisione nel codice è segnato `D-… §19`: da assegnare.

## Da documentare (spec)

- **§7.3 (pratica)**: nelle finestre «Registra un documento», «Registra la fattura» e «Registra la nota di credito» la scelta «Prendi dalla coda / Inserisci a mano»; elenco dei documenti in coda dello stesso fornitore (e cliente riconosciuto) della pratica, filtrato per tipo quando la finestra è di un tipo solo, sezioni «Cliente non riconosciuto» e «Tipo da verificare» sotto; dati in sola lettura e pulsante «Abbina alla pratica» (per la nota di credito anche «Fattura stornata»).
- **§7.9 (documenti, elenco)**: l'elenco accetta i filtri `fornitore_id`/`cliente_id` e restituisce `cliente_id`.
- **§8.1 (registrazione)**: `POST /documenti/:id/abbina` con solo `pratica_id` ricava i dati dal file letto e ricontrolla fornitore/cliente (V12/V13); per la nota di credito arriva anche `fattura_id`.
- **§19 — D-…** (da proporre): dalla pratica si può prendere un documento già in coda (per qualsiasi tipo) abbinandolo alla pratica (stessa operazione `abbina`, il server deriva i dati e ricontrolla i soggetti; il browser manda solo documento, pratica ed eventuale fattura stornata).
