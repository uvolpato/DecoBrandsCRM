# Pacchetto `registra-da-coda`

## Contesto
Pagina della pratica (`app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`), finestra **«Registra un
documento»**: tipo, numero, data, importo, note, «PDF o foto (facoltativo)». Oggi si registra solo a mano.

Ugo (15/11/2026): poter **scegliere un documento già arrivato nella coda** (stato da controllare / in coda di
abbinamento), **filtrato per il cliente e il fornitore della pratica**.

## Compito
1. In cima alla finestra una scelta: «Prendi dalla coda» / «Inserisci a mano» (segmenti esistenti o due
   pulsanti; predefinito «Prendi dalla coda» se ci sono documenti compatibili, altrimenti «a mano»).
2. «Prendi dalla coda»: elenco (o `CampoRicerca`/`RicercaEntita` esistente) dei documenti in coda **dello
   stesso fornitore e cliente della pratica** (riconosciuti o letti; quelli con cliente non riconosciuto in
   una sezione «cliente non riconosciuto» sotto, stesso fornitore). Ogni voce: tipo, numero (o
   «Pagamento del <data> · <importo>» / nome file), data, importo, nome file. Scegliendolo si vedono i suoi
   dati in sola lettura e il pulsante diventa «Abbina alla pratica».
3. **Server (V12, V13)**: l'abbinamento usa **la stessa operazione** già esistente con cui la scheda del
   documento abbina un documento della coda a una pratica (cerca in `documenti.ts`, es. `abbina`): nessun
   doppione, nessun documento nuovo, il documento esce dalla coda. Il browser manda solo id del documento e
   della pratica; il server ricontrolla che fornitore (e cliente, se riconosciuto) coincidano con la pratica,
   altrimenti 400 con messaggio chiaro. Se serve un elenco filtrato dei documenti in coda, aggiungi un filtro
   `fornitore_id`/`cliente_id` (validati) alla rotta dell'elenco esistente.
4. «Inserisci a mano» resta com'è oggi.
5. Nota in `app/frontend/lib/guida.ts` (pagina Pratica, finestra Registra un documento).

## File ammessi
`VistaPratica.tsx`, `documenti.ts` (+ suoi test `documenti-*.spec.ts`), `lib/guida.ts`, `stile.css` (solo
aggiunte in fondo). **Non toccare** `pratiche.ts`, `proposta.ts`, `VistaDocumento.tsx`, `CampoRicerca.tsx`
(pacchetto `cerca-pratica-vincoli` in corso), `motore/*`, seed (pacchetto `sconto-medio` in corso): se servono,
scrivi la modifica nel resoconto e fermati. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13 (`SELECT … FOR UPDATE` sul
documento). URL del db **solo con grep**, `.env` mai letto con readFileSync o cat. Prove su
`decobrands_test_reg_coda` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra.
Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest: elenco coda filtrato per fornitore+cliente; abbina da pratica →
documento fuori coda e nella pratica; fornitore diverso → 400; documento già abbinato → 409/400.

## Resoconto
`strumenti/opencode/resoconto-registra-da-coda.md`: file, prove, «Da documentare».
