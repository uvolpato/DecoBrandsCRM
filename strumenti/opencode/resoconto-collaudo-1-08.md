# Resoconto collaudo · Onda 1 · Pacchetto 1-08 — Blocco Jest sullo stesso database (A6-05)

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Database di prova: `decobrands_test_1_08` (e `decobrands_test_1_08b` per la prova in parallelo), poi cancellati.

## Rilievi

### A6-05 — Due giri di jest sullo stesso database: il secondo si ferma subito — corretto

- `app/backend/test/blocco.ts` (nuovo): apre un `pg.Client` sull'URL di prova (`DATABASE_URL_TEST`, altrimenti `DATABASE_URL` con `decobrands_db` → `decobrands_test`, la stessa regola di `test/ambiente.ts`) e prende il blocco consultivo `pg_try_advisory_lock(424242)`. Se il blocco è già preso, chiude la connessione ed esce con `Un'altra prova sta usando decobrands_test: aspetta o usa DATABASE_URL_TEST`. Il blocco è per database: giri su database diversi restano paralleli.
- `app/backend/package.json` (righe 83-84): aggiunti `"globalSetup": "<rootDir>/test/blocco.ts"` e `"globalTeardown": "<rootDir>/test/blocco.ts"`.
- **Differenza dalla correzione puntuale**: Jest 30 pretende che il file di un hook esporti una funzione; un solo file non può esportare due hook. Dato che i file ammessi sono solo `package.json` e `blocco.ts`, il file esporta una sola funzione (`export default`) che fa da setup alla prima chiamata e da teardown alla seconda (stato su `globalThis`); il teardown sblocca e chiude il client. In ogni caso il blocco sarebbe rilasciato alla chiusura della connessione a fine processo.

## Prove lanciate

Ambiente: `DATABASE_URL_TEST=…/decobrands_test_1_08`, `TMP`/`TEMP=$TEMP/decobrands-1-08`, `DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy` OK.

- `npx jest test/seed.spec.ts` sul database `decobrands_test_1_08` → **8/8 passati, 0 KO**.
- Due `node node_modules/jest/bin/jest.js test/seed.spec.ts` insieme sullo stesso database: primo **8/8 passati, esito 0**; secondo **esito 1** e si ferma subito con `Jest: Got error running globalSetup … reason: Un'altra prova sta usando decobrands_test: aspetta o usa DATABASE_URL_TEST`.
- Due giri insieme su database diversi (`decobrands_test_1_08` e `decobrands_test_1_08b`, con `TMP` separati): **entrambi 8/8 passati, esito 0**.
- `npx tsc --noEmit` nel backend → **0 errori**.
- Database `decobrands_test_1_08` e `decobrands_test_1_08b` cancellati a fine prova. Nessun contatto con Integra, `decobrands_db` o `decobrands_test` condiviso.

## Prove nel browser da lanciare a fine onda

Nessuna: il pacchetto tocca solo l'infrastruttura delle prove del backend.

## Da documentare

### `app/README.md` (pacchetto documentazione)

Nella sezione delle prove, una riga:

> Per lanciare due giri di prove insieme (due agenti, o tu e un agente), dai a ciascuno un database suo con `DATABASE_URL_TEST` (es. `DATABASE_URL_TEST=…/decobrands_test_mio`): senza, il secondo giro si ferma subito perché il database di prova è già in uso.

### Registro §19, spec, guida, piano

- **Nessuna nuova decisione** (D-nn): è una correzione dell'infrastruttura delle prove, non cambia regole di business.
- **Spec** (`specifica-crm-provvigioni.md`): nessun cambio di sezione né riga *Perché*.
- **Guida** (`app/frontend/lib/guida.ts`): nessun testo, la guida è per gli utenti dell'app.
- **Piano** (`piano-lavoro-crm.md`): se si vogliono tracciare le ore, attività «prove: blocco sul database di prova condiviso (A6-05)», ore **da approvare**; per il resto nessun cambio.
