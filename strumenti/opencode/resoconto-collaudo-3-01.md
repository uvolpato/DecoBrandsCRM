# Resoconto pacchetto 3-01 — Arrivo dello stesso file, scartati che tornano solo a mano, annullo di un documento letto

Data: 13/11/2026 · Esecutore: DeepSeek V4 · Gravità: P2 · Rilievi: A3-05, A4-03, A4-14, A4-06, U10.

Esito: **5 rilievi corretti**. `npx tsc --noEmit` (backend) 0 errori. `npx jest test/documenti.spec.ts test/documenti-pratica.spec.ts test/scartati.spec.ts test/coda.spec.ts test/casella.spec.ts` → **102 prove, 0 KO**. Nessuna prova nel browser: nessun file del frontend toccato. Nessun file vietato modificato.

## Rilievi

I quattro rilievi A3-05, A4-03, A4-14 e U10 stanno tutti in `riceviDocumento` (`app/backend/src/documenti.ts:98`), riscritto come una sola funzione; A4-06 è in `elimina` (`app/backend/src/documenti.ts:1310`).

### A4-03 — File scritto a metà resta per sempre come «stesso contenuto»

- `app/backend/src/documenti.ts:77` nuova `scriviFile(radice, file_percorso, dati, hash)`: scrive su `<percorso>.<randomUUID()>.tmp`, poi `link(tmp, percorso)` (fallisce con `EEXIST` se il percorso c'è già) e `rm(tmp)`. Su `EEXIST` rilegge il file esistente e ne confronta l'impronta SHA-256: diversa → `rename(tmp, percorso)` (sostituisce il file parziale o diverso); uguale → si butta il temporaneo. Import aggiunti `randomUUID`, `link`, `rename`.
- Il vecchio `writeFile(..., { flag: 'wx' })` che accettava `EEXIST` senza controllare il contenuto è sparito: nessun file troncato resta a bloccare il vero contenuto.

### A3-05 — Eliminazione di uno scartato e nuovo arrivo dello stesso file: riga in coda senza file

- `app/backend/src/documenti.ts:144`: dopo il `$transaction` riuscito si richiama `scriviFile`, che rimette il file se un'eliminazione dello stesso file (scartati.elimina o pulisciScartati, che cancellano dopo il commit) l'ha tolto nel frattempo. Stesso meccanismo di A4-03, niente due scritture diverse (come chiede la nota del pacchetto). Finestra residua (cancellazione più lenta dell'intera transazione d'arrivo) accettata.

### A4-14 — Ricaricare uno scartato mentre lo si elimina dà 500

- `app/backend/src/documenti.ts:110-146`: la lettura della riga con la stessa impronta e la transazione stanno in un ciclo di al più 2 tentativi. Dentro la transazione, dopo il `FOR UPDATE`, si usa `findUnique` (non `findUniqueOrThrow`): se la riga non c'è più (`null`) si esce dalla transazione e si rifà `riceviDocumento` da capo (`continue`), con una riga e un percorso nuovi. Se sparisce due volte di seguito, errore interno (non dovrebbe accadere).

### A4-06 — Annullare un documento abbinato lo rimanda alla lettura: correzioni perse e crediti spesi

- `app/backend/src/documenti.ts:1316-1321`: in `elimina`, quando il file torna indietro, si legge `letto_il` dalla riga bloccata e si scrive `stato: a.letto_il ? 'da_controllare' : 'in_coda'`. Un documento già letto torna quindi `da_controllare` con i campi corretti intatti (niente nuova lettura pagata, niente `deleteMany` dei campi); uno mai letto torna `in_coda` come prima.

### U10 (D-122) — Lo scartato torna in coda solo se ricaricato a mano

- `app/backend/src/documenti.ts:114`: se la riga con la stessa impronta è `scartato` e `origine !== 'caricamento'`, `riceviDocumento` non la rianima e restituisce `{ esito: 'ignorato', motivo: 'scartato' }` (nuovo tipo `EsitoArrivo` a riga 69). Con `origine = 'caricamento'` resta il comportamento di oggi (D-54: torna in coda sulla stessa riga).
- `app/backend/src/casella.ts:224-226`: `giroCasella` distingue l'esito: `ignorato` → `ignorati++` (l'email si sposta come le altre, nessuna anomalia), altrimenti `presi++`.

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` in `app/backend` | 0 errori |
| `npx jest test/documenti.spec.ts test/documenti-pratica.spec.ts test/scartati.spec.ts test/coda.spec.ts test/casella.spec.ts` (su `decobrands_test_3_01`) | 102 prove, 0 KO |
| `git status --short` | solo i 4 file ammessi toccati da me (il resto è lavoro parallelo degli altri pacchetti) |

Prove nuove in `test/documenti.spec.ts` (describe `arrivo dello stesso file… (onda 3)`): file parziale sostituito (A4-03), file rimesso dopo il commit con `rm` simulato via spy su `$transaction` (A3-05), riga sparita fra lettura e transazione con spy su `findUnique` (A4-14), scartato rimandato per email resta scartato / ricaricato a mano torna in coda (U10); più il caso A4-06 nel describe `documenti fiscali della pratica`. In `test/casella.spec.ts`: scartato rimandato per email → `ignorati` + 1.

Database di prova `decobrands_test_3_01` creato, usato e **cancellato**.

## Da documentare

**Registro §19 — decisione già decisa da Ugo (U10 → D-122):** la riga la scrive il pacchetto documentazione; il testo è già pronto in `strumenti/opencode/collaudo-3-doc-documentazione.md`. Gli altri quattro rilievi non sono decisioni nuove: sono correzioni dentro D-54/D-60/V13, nessuna riga D-nn nuova.

**Spec §6.5 / §7.9 — riga *Perché* pronta (U10/D-122):**
> *Perché (D-122):* lo stesso file di un documento scartato torna in coda solo se lo si ricarica a mano (`origine = caricamento`); se arriva di nuovo dalla casella il giro lo conta fra gli ignorati e lo scarto resta: un promemoria del fornitore con lo stesso PDF non deve riaprire uno scarto voluto.

**Spec §7.9 (annullo di un documento) — nota pronta (A4-06):**
> *Perché (A4-06):* annullare un documento abbinato rimanda il suo file `da_controllare` se era già stato letto (le correzioni a mano restano e non si paga una nuova lettura), `in_coda` se non era mai stato letto.

**Guida (`lib/guida.ts`) — frase nuova pronta (A4-06):** dove oggi dice «il file torna in coda», sostituire con: «il file torna in coda se non era mai stato letto; se era già stato letto torna da controllare, con le correzioni conservate».

**Piano (`piano-lavoro-crm.md`):** nessuna attività nuova, 0 ore da approvare (correzioni dentro le attività F2/F6 già previste).

**README:** niente da cambiare.
