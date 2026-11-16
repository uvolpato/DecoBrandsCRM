# Resoconto — La ricerca delle pratiche è vincolata a cliente e fornitore del documento (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/cerca-pratica-vincoli.md`. Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), prove su `decobrands_test_cerca_vincoli` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit. Non toccati `motore/*`, seed, `bollettin*`, `liquidazioni*` (pacchetto `sconto-medio` in corso).

## Richiesta di Ugo (15/11/2026)

I documenti sono sempre vincolati a cliente e fornitore: la ricerca delle pratiche (campo «Oppure abbina a un'altra pratica» e finestra della lente) deve filtrare per cliente e fornitore del documento, non solo per fornitore. In più: un pagamento paga una fattura, quindi lo stato proposto (ricerca e tendina «Stato delle pratiche») è **Fatturata**; e il testo «Il codice — non corrisponde a nessun cliente …» non deve comparire quando il codice cliente è vuoto e il cliente è già scelto.

## Server

- **`app/backend/src/pratiche.ts`**:
  - `CercaPratiche` guadagna `cliente_id` `@IsOptional() @Type(() => Number) @IsInt() @Min(0)` (validato come `fornitore_id`).
  - `cerca` aggiunge `AND t.cliente_id = ${BigInt(q.cliente_id)}` quando `cliente_id` è presente; con entrambi filtra per tutti e due. Il browser manda solo gli id; il valore finisce in `Prisma.sql` come parametro legato.
- **`app/backend/src/proposta.ts`**:
  - Nuovo `filtroDalTipo(tipo)`: `nota_credito` e `pagamento` → `'fatturata'`, gli altri (e `null`) → `'aperte'`. Costante chiusa, mai testo del browser.
- **`app/backend/src/documenti.ts`**:
  - `dettaglio` seleziona anche `tipo` e passa `q.filtro ?? filtroDalTipo(d.tipo)`: il server sceglie il predefinito dal tipo quando il browser non manda nulla (V12).

## Interfaccia

- **`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`**:
  - `STATO_DAL_TIPO` guadagna `pagamento: 'fatturata'` (ricerca «Oppure abbina»).
  - Nuovo `FILTRO_DAL_TIPO` (nota di credito e pagamento → `fatturata`); il filtro delle suggerite parte `''` (lo sceglie il server), la tendina mostra `filtro || FILTRO_DAL_TIPO[tipo] || 'aperte'`.
  - `PRATICA.voci` manda `cliente_id` al server quando nel contesto.
  - La riga diventa «Oppure abbina a un'altra pratica di `<cliente>` con `<fornitore>`:»; il `contesto` passa `cliente_id: clienteAssociato?.id`.
  - La finestra della lente porta `vincoli` («Pratiche di … con …», oppure «Pratiche con … · cliente non ancora scelto»).
  - Nel riquadro `esito === 'nessuno'`: con codice cliente vuoto e cliente scelto nessun messaggio; con codice vuoto e cliente non scelto «Manca il codice cliente: scegli il cliente o la pratica a mano.».
- **`app/frontend/componenti/CampoRicerca.tsx`**: nuovo parametro opzionale `vincoli?: string` (in `Comuni`, `Multipla`, `Singola`, `RicercaEntita`), mostrato sotto il titolo della finestra (`<div className="testo-tenue">`, classe già esistente).
- **`app/frontend/lib/guida.ts`**: aggiornate la voce «Stato delle pratiche» (predefinito dal tipo, con nota di credito e pagamento → Fatturata) e la nota «Oppure abbina a un'altra pratica» (vincolo su cliente e fornitore, «cliente non ancora scelto»).

## Prove

Su `decobrands_test_cerca_vincoli` (creato, `prisma migrate deploy`, poi cancellato):
- `npx tsc --noEmit` backend e frontend: puliti.
- jest `pratiche.spec.ts` **22/22** (2 nuovi: cerca con cliente+fornitore esclude le pratiche di altri clienti; `cliente_id=abc` → 400).
- jest `proposta.spec.ts` **79/79** (2 nuovi: `filtroDalTipo` unit; nota di credito senza filtro → il server propone solo la pratica fatturata).
- jest `documenti.spec.ts` **68/68** (il cambio del default in `dettaglio` non rompe niente).

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. `cliente_id` passa dal DTO (`@IsInt @Min(0)`) e finisce in `BigInt(...)` dentro `Prisma.sql` (parametro legato); `filtroDalTipo` è un costrutto chiuso. La rotta `cerca` resta `@Richiede('provvigioni.consulta')`. Il testo `vincoli` è costruito da nomi del server e reso come testo React (escapato).
- `ponytail-review`: lean. `filtroDalTipo`/`FILTRO_DAL_TIPO` sono due costanti di una riga (duplicazione voluta: il server decide, il frontend mostra); `vincoli` è una stringa opzionale, nessuna astrazione nuova. `net: 0`.

## Da documentare

- **§7.9 / §6.5 (abbinamento)**: la ricerca «Oppure abbina a un'altra pratica» filtra per **cliente e fornitore** del documento (non più solo fornitore); senza cliente compare «cliente non ancora scelto» e si filtra solo per fornitore.
- **§6.5 punto 5 / §7.9**: il predefinito della tendina «Stato delle pratiche» e della ricerca dipende dal tipo: ordine/proforma/conferma/fattura → aperte; nota di credito e pagamento → fatturate. Lo sceglie il server (`filtroDalTipo`) quando il browser non manda `filtro`; il frontend mostra lo stesso predefinito.
- **§19 — D-nuovo (da assegnare)**: «I documenti sono sempre vincolati a cliente e fornitore: `GET /api/pratiche/cerca` accetta anche `cliente_id` (validato come `fornitore_id`) e con entrambi filtra per tutti e due. Il filtro per stato delle pratiche suggerite parte dal tipo del documento: nota di credito e pagamento cercano le pratiche fatturate, gli altri tipi le aperte; lo sceglie il server se il browser non manda nulla (V12). Con codice cliente vuoto e cliente scelto nessun avviso sul codice; con codice vuoto e cliente non scelto: «Manca il codice cliente».»

## Aperti / note

- **Giro nel browser non lanciato** (regola onda): nessun file `.py` toccato; il controllo visivo della nuova riga e dei vincoli nella finestra (1440 e 768 px) resta a Claude Code.
- **Flakiness del giro completo iniziale**: al primo tentativo il run congiunto di `pratiche.spec.ts`+`proposta.spec.ts` è fallito per processi `node` rimasti appesi da un run precedente interrotto (connessione «terminata dall'amministratore»); uccisi i due processi, i file singoli passano tutti. Non è un difetto del codice.
