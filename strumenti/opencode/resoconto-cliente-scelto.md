# Resoconto — Correggi i dati letti: il cliente scelto si salva (14/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/cliente-scelto.md` · Gravità P1.

## Cosa chiede Ugo

In *Correggi i dati letti* la ricerca «Cliente» aveva `valore=""` fisso e `onChange={() => {}}`:
la scelta non si teneva e il pallino non diventava verde. In più `onScelto` **sovrascriveva «Cliente letto»**
con nome e P.IVA del CRM, perdendo il dato letto. Si porta il cliente allo stesso livello del fornitore
(`fornitore_id`), senza schema né migrazioni: il cliente si salva come campo letto `cliente_id`.

## Cosa ho fatto

- **Frontend** (`VistaDocumento.tsx`): la ricerca «Cliente» è controllata come quella del fornitore
  (`valore={b.testata.cliente_id}`, `onChange={(v) => t('cliente_id', v)}`, `cerca` invariato); il pallino
  diventa verde alla scelta. `onScelto` non tocca più «Cliente letto» e riempie la P.IVA solo se è vuota.
  Il pulsante › si disattiva se `cliente_id` è già scelto (come per il fornitore). `cliente_id` entra nel
  `Bozza`/`Testata`, nel `salva()` (PUT) e nel campo cliente di *Apri la pratica* (`t.cliente_id` prima di
  abbinamento e riconoscimento).
- **Server** (`documenti.ts`): `cliente_id` in `TESTATA_CAMPI` (campo letto, testo) e validazione
  d'esistenza nel PUT come per `fornitore_id` (intero positivo + `versione_corrente_id`, altrimenti 400);
  torna nel dettaglio (`testata.cliente_id`).
- **Riconoscimento** (`proposta.ts`): `cliente_id` in `Letto`/`componiLetto`; in `propostaDocumento` un
  `cliente_id` scelto a mano è il cliente certo e **vince** su codice/P.IVA/nome (come il fornitore scelto).
  Guardia `/^\d+$/` prima del `BigInt` (mai eccezione su un campo malformato).
- **Guida** (`guida.ts`): il «da sapere» dei Documenti dice che la scelta si salva, il pallino diventa
  verde, «Cliente letto» non si tocca e la P.IVA si riempie solo se vuota.

## Prove

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest `test/proposta.spec.ts` su `decobrands_test_cliente`: **60/60** (2 nuove: cliente scelto certo che
  vince sulla P.IVA; id inesistente → si ignora e si riconosce per P.IVA).
- jest `test/documenti.spec.ts` su `decobrands_test_cliente`: **63/63** (1 nuova: salvataggio campo
  `cliente_id`, id inesistente → 400, valore vuoto toglie il campo).
- `python -m py_compile strumenti/prove/app_documenti.py`: **OK** (prova browser non lanciata, come da
  regole).
- DB `decobrands_test_cliente` creato, migrato e cancellato a fine prova.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: `cliente_id` validato sul server (intero positivo + esistenza) e riletto dal database,
  mai fidandosi del frontend (V12); query parametrizzate via Prisma; `BigInt` protetto da guardia su input
  non numerico. Niente rilievi.
- `ponytail-review`: niente astrazioni nuove; `onScelto` resta (riempie solo la P.IVA vuota); una sola
  guardia difensiva. Niente da tagliare.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9 (Correggi i dati letti): la ricerca «Cliente» è controllata e si salva come campo letto
  `cliente_id` (pallino verde alla scelta), senza toccare «Cliente letto»; la P.IVA si riempie dal cliente
  scelto solo se è vuota; il pulsante › si disattiva a `cliente_id` scelto.
- spec §19: decisione nuova (D-nn) «il cliente scelto nella correzione si salva come `cliente_id` e vale
  come cliente certo nella proposta» + il perché (il documento non ha una colonna cliente: si salva fra i
  campi letti, e la scelta a mano deve vincere sul riconoscimento per codice/P.IVA/nome, come già fa il
  fornitore scelto).
- `proposta.ts` §6.5: `Letto.cliente_id` e la precedenza del cliente scelto su codice/P.IVA/nome.

## Aperti / da segnalare

- La prova browser (app_documenti) va lanciata da Claude Code a fine onda: è l'unico punto non verificato
  qui (blocco «cliente scelto → pallino verde, «Cliente letto» invariato» + schermata
  `app-documenti-cliente-scelto-1440.png`).
- `collegaClienteDocumento` (rotta `scegli`, D-152) continua a scrivere `cliente` e `piva_cliente` (nome +
  P.IVA), non `cliente_id`: è il flusso «candidati da scegliere», parallelo alla correzione. Non l'ho
  toccato (fuori dai file ammessi) e non confligge.
- Il controllo server `codice_cliente` (grave) resta attivo anche con `cliente_id` scelto a mano se il
  codice letto non corrisponde: è un avviso reale, non l'ho tolto.
