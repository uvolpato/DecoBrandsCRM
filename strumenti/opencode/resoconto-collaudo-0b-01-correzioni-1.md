# Resoconto · Onda 0 bis · 0b-01 correzioni 1

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Pacchetto: `strumenti/opencode/collaudo-0b-01-correzioni-1.md`

## Cosa ho fatto, per rilievo

### C1 — con zero righe il documento si collegava a qualsiasi fornitore

- `app/backend/src/anagrafica-integra.ts:62-88` — la SQL della ricerca sta in `sqlRicerca` (una copia sola);
  `righeVista` la esegue **senza** escludere i codici di `codici_esterni`.
- `cerca` filtra ancora i codici già importati (`:102-107`), come prima.
- `importa` (`:144-167`): il nome letto si legge dal documento e si cerca con `righeVista`. Deve dare
  **esattamente una** riga, con `id_integra === idIntegra` e la P.IVA normalizzata uguale a quella della
  riga importata; zero o più righe → 409 «Il fornitore del documento non è questo: controlla il nome letto».
- Tolto il commento «Zero righe = … si collega lo stesso».

### C2 — il limite di 5 s fermava anche la sincronizzazione completa

- `app/backend/src/integra.ts:351-361` — `creaPonte` non ha più `query_timeout` né `statement_timeout`:
  resta `connectionTimeoutMillis: 3000` e `-c default_transaction_read_only=on`. Il giro torna senza
  limite stretto.
- `anagrafica-integra.ts:87` e `:132` — ogni query di `cerca` (via `righeVista`) e di `importa` passa
  `{ text, values, query_timeout: 5000 }`, oltre a `conTempo` (3 s). `@types/pg` non dichiara
  `query_timeout` nella `QueryConfig`: cast con il commento del perché (`:86`).

### C3 — chiamata al ponte dentro la transazione con lock

- `anagrafica-integra.ts:144-167` — lettura del nome letto e ricerca sul ponte **prima** di
  `db.$transaction`.
- Dentro la transazione (`:175-194`) si ricontrolla solo il documento: `FOR UPDATE`, `stato`,
  `fornitore_id` nullo, e il nome letto confrontato con quello letto prima → 409 «Il documento è
  cambiato: riprova».
- Con un ponte lento la risposta è 502 **prima** di aprire lock e transazione (prova dedicata).

### C4 — `cerca` apriva l'anomalia al primo errore, anche da una GET

- `anagrafica-integra.ts:96-101` — `cerca` non chiama più `apriAnomalia`: ponte giù →
  `{ errore: 'ponte non raggiungibile' }`; `pulisci` e `apriAnomalia` tolti dagli import. `db` resta
  perché serve ai codici già importati.
- La regola dei tre giri di fila resta solo nella sincronizzazione (`integra.ts`): `documenti.ts` (che usa
  `cerca` in pagina) già ignorava `errore` senza aprire nulla.

### C5 — un ruolo poteva prendere due codici di Integra

- `anagrafica-integra.ts:217-234` — `registraCodice` controlla prima di scrivere se il ruolo ha già un
  codice `integra` dello stesso tipo e diverso: se sì, 409 «Il {cliente|fornitore} è già legato al codice
  Integra {X}: in Integra c'è un doppione con la stessa P.IVA (da correggere in Integra)». Nessuna
  scrittura.

### C6 — `collegato` voleva dire due cose

- `anagrafica-integra.ts:243`, `:266`, `:280` — tolto `collegato`, aggiunti `codice_registrato` (il codice
  è stato aggiunto ora) e `documento_collegato` (ora il documento ha quel fornitore); `collegaDocumento`
  ora restituisce `true/false` (`:197-213`).
- `VistaDocumento.tsx` non è stato toccato: legge solo `{ id }` dalla risposta, il campo non lo usava.

## Prove

Database `decobrands_test_0b_01c` (creato e poi cancellato), ponte finto nelle tabelle
`public.integra_v_*` dello stesso database (il ponte vero non si è toccato).

- `npx jest test/anagrafica-integra.spec.ts test/integra.spec.ts test/documenti.spec.ts` → **3 suite, 93
  prove, 0 KO**. Nuove: C1 (3 prove), C2 (2, di cui una con `pg_sleep` sul ponte di prova), C3 (ponte
  lento col documento → 502 e documento libero), C4 (GET `integra/cerca` con ponte giù → 502, nessuna
  anomalia), C5 (due codici con la stessa P.IVA → 409, un solo codice).
- Prove ritoccate per le nuove regole: «stessa P.IVA» era `gia_presente`, ora 409 (C5); la variante
  R1-03 della P.IVA estera senza prefisso ora usa un secondo soggetto (con lo stesso soggetto il secondo
  codice è un doppione, C5); `collegato: true` → `codice_registrato: true` (C6).
- `cd app/backend && npx tsc --noEmit` → **0 errori**; `cd app/frontend && npx tsc --noEmit` → **0 errori**
  (frontend non toccato).
- Prove nel browser non lanciate (regole dell'onda): `app_documenti.py` simulava già la risposta con solo
  `{"creato":true,"id":"1"}`, quindi non serve aggiornarlo per C6.

## Controlli fatti (skill caricate davvero)

- **`owasp-security`** — A01/V12: dal browser arrivano solo `tipo`, `id_integra` e `documento_id`; nome
  letto, P.IVA e stato del documento si rileggono dal database, e il collegamento resta dietro
  `dati.importa` + `provvigioni.modifica`. A10: tutto fallisce chiuso (409/502, nessuna scrittura
  parziale); C4 toglie scritture nel registro provocate da una GET. A05: SQL parametrico, nessun valore
  del browser entra in una query.
- **`postgresql-code-review`** — `pg_advisory_xact_lock` e `FOR UPDATE` restano dentro la transazione e si
  liberano da soli; il `query_timeout` per query è supportato da `pg` (letto in `client.js`), non serve un
  `statement_timeout` di sessione che colpirebbe anche il giro; il controllo C5 usa un indice esistente su
  `codici_esterni` (`sistema, tipo, codice` / `entita_id`).
- **`caveman`** — risposte brevi; qui prosa normale perché serve testo per la spec.

## Cose aperte / da sapere

- C1 continua a confrontare la **P.IVA normalizzata grezza** della riga trovata con quella della riga
  importata (come la correzione precedente): se Integra ha una P.IVA estera senza prefisso la riga è la
  stessa, quindi il confronto regge; la normalizzazione col paese (`paesePiva`) resta solo per il soggetto.
- Il test C2 con `pg_sleep` crea e cancella lo schema `lento_prova` sul database di prova: dura ~4 s.
- `doppioni-anagrafica-integra.md` resta la fonte per correggere i doppioni veri in Integra: il CRM ora si
  ferma con 409 invece di alternare il ruolo.

## Da documentare (per il pacchetto 0b-doc)

### §4.7.1 — regola 2 (ricerca) e regola 3 (import): testo aggiornato

> 2. **La ricerca sulle viste è mirata** … (invariato). Il limite di tempo **5 s** vale solo per questa
>    ricerca e per l'import su richiesta: la sincronizzazione completa non ha limiti stretti (C2).
> 3. **L'import è una transazione** … Idempotente per codice: se il codice è già in `codici_esterni`
>    risponde `{gia_presente: true, codice_registrato: false, documento_collegato, id}` e non scrive
>    niente. Un soggetto che è già cliente e arriva come fornitore aggiunge il **ruolo**, non un secondo
>    soggetto. Se il ruolo ha già un **altro** codice di Integra dello stesso tipo (stessa P.IVA su due
>    master), l'import si ferma con 409 e dice quale codice è già legato: il doppione va corretto in
>    Integra (C5). La risposta distingue `codice_registrato` (il codice è stato aggiunto ora) da
>    `documento_collegato` (ora il documento ha quel fornitore) (C6).

E riga *Perché* da aggiungere in §4.7.1:

> *Perché:* il nome letto dal documento deve portare a **una sola** riga di Integra, la stessa che si sta
> importando, **anche se il fornitore è già in anagrafica**: con zero righe (nome non trovato) il documento
> non si collega, altrimenti basterebbe un `id_integra` qualsiasi per attaccarlo al fornitore sbagliato
> (C1). La ricerca sul ponte e la lettura del nome letto si fanno prima della transazione: un ponte lento
> non tiene aperti advisory lock e `FOR UPDATE`, e la transazione di Prisma non scade a 5 s (C3). La
> ricerca non apre anomalie: la regola dei tre giri di fila è della sincronizzazione, non di una pagina
> aperta (C4). Il doppione di P.IVA in Integra non deve far prendere due codici allo stesso ruolo, che poi
> si alternerebbero a ogni giro (C5).

### §7.14.3 — riga `integra.connessione`: testo aggiornato

> | integra | `integra.connessione` | errore | database non raggiungibile per **3 giri di
> sincronizzazione** di fila (una ricerca o un import su richiesta non la aprono: rispondono «Integra non
> raggiungibile, riprova più tardi») | verificare server, utente e password in Impostazioni →
> Sincronizzazione; avvisare chi gestisce Integra | al primo giro riuscito |

E riga *Perché* in §7.14.3 (sotto la tabella):

> *Perché:* l'anomalia nasce solo da un giro della sincronizzazione fallito tre volte di fila, non da una
> pagina che ha chiesto una ricerca: la VPN che cade un attimo non deve riempire *Stato del sistema* con
> una riga per ogni pagina aperta (C4).

### §7.9 (Documento, azione proposta) — riga *Perché* da completare

> *Perché:* … Il nome letto deve dare una sola riga di Integra, quella che si importa, anche quando il
> fornitore è già in anagrafica; il controllo si fa prima della transazione, così un ponte lento dà 502
> senza lasciare il documento bloccato (C1, C3). La risposta dell'import dice `codice_registrato` e
> `documento_collegato`, non più `collegato` (C6).

### Piano (`piano-lavoro-crm.md`, onda 0 bis, 0b-01)

> Correzione dei rilievi della review: il documento si collega solo al fornitore trovato dal nome letto
> (anche già importato), il limite di 5 s vale solo per ricerca e import, i controlli sul ponte stanno
> fuori dalla transazione, la ricerca non apre anomalie, un ruolo non prende due codici di Integra,
> risposta con `codice_registrato`/`documento_collegato`. Prove: 93 in 3 suite. **Ore: da approvare.**
