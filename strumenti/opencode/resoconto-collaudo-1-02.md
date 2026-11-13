# Resoconto pacchetto 1-02 — Agenzie bloccate nel periodo chiuso (D-51 esteso)

Data: 08/11/2026 · Esecutore: DeepSeek V4 · Gravità: P0 · Rilievi: A2-01 (solo punto 1), A3-01, A6-12 · Decisione U1 → D-114 (non aperta)

## Cosa ho fatto

I tre rilievi sono lo stesso difetto (A6-12 ne è la prova): le tre rotte delle agenzie (`interscambio`) non controllano `ultimaChiusura` e non bloccano la riga del fornitore, mentre percentuali ed eccezioni lo fanno (D-51). Una sola correzione, come chiede il pacchetto.

### A2-01 (punto 1) + A3-01 — blocco delle tre rotte delle agenzie

`app/backend/src/fornitori.ts`:

- `dopoChiusura` (riga 126) diventa `export`: la si importa in `clienti.ts`. Non si sposta in `motore/dati.ts` (lo modifica in parallelo il pacchetto del motore), come da nota del pacchetto.

`app/backend/src/clienti.ts`:

- Aggiunto l'import `dopoChiusura` da `./fornitori` e `Prisma` da `@prisma/client`.
- Aggiunta la costante `agenziaChiusa` («chiudi l'agenzia e aprine una nuova da una data successiva»), `agenziaFinisce` («l'agenzia può smettere di valere solo dopo il …», per il solo `valido_al`, come `fornitori.ts` termina) e l'helper `bloccaFornitori` (blocca i fornitori `FOR UPDATE` in ordine stabile di id, per evitare deadlock fra modifiche incrociate).
- **`creaAgenzia`**: prima istruzione della transazione blocca il fornitore, lo legge, poi `dopoChiusura(tx, fornitore.id, valido_dal)` → 409 se `valido_dal ≤ chiusura`.
- **`modificaAgenzia`**: dopo il calcolo del diff, blocca il fornitore (vecchio e nuovo, se cambia `fornitore_id`). Se cambia un campo che sposta i soldi (`subagente_id`, `fornitore_id`, `sconto`, `pct_subagente`, `regola_mensile`, `valido_dal`) → `valido_dal` attuale e (se cambia) quello nuovo devono essere dopo la chiusura, altrimenti 409. Se cambia solo `valido_al` → né la vecchia né la nuova fine possono cadere entro la chiusura (come `termina`). Il codice cliente del fornitore resta libero (solo abbinamento).
- **`eliminaAgenzia`**: blocca il fornitore e `dopoChiusura(valido_dal)` → 409 se nel periodo chiuso; il controllo D-139 sugli sconti storici resta dopo.

### A6-12 — prova

`app/backend/test/clienti.spec.ts`: nuovo `describe('agenzia nel periodo chiuso (D-114)')` con quattro casi:

- modifica `sconto` nel periodo chiuso → 409;
- eliminazione nel periodo chiuso → 409;
- `valido_al` dentro la chiusura → 409, `valido_al` dopo la chiusura → 200;
- nuova agenzia con `valido_dal` nel periodo chiuso → 409, `valido_dal` dopo la chiusura → 201.

L'agenzia "chiusa" si scrive direttamente in banca dati (via API la creazione con `valido_dal` nel passato ora è 409 per definizione), su un cliente nuovo per non toccare i periodi degli altri test.

## Prove lanciate (database `decobrands_test_1_02`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (backend) | 0 errori |
| `npx prisma migrate deploy` sul database di prova | tutte le migrazioni applicate |
| `npx jest test/clienti.spec.ts test/fornitori.spec.ts test/percentuali.spec.ts test/liquidazioni.spec.ts` | **4 suite, 90 prove, 0 KO** |
| `git diff` / `git status --short` | toccati solo `app/backend/src/clienti.ts`, `app/backend/src/fornitori.ts`, `app/backend/test/clienti.spec.ts` (i file degli altri pacchetti dell'onda restano loro) |

Database `decobrands_test_1_02` creato, migrato, usato e **cancellato** alla fine. Mai toccati `decobrands_db`, `decobrands_test` condiviso, né Integra (192.168.239.49).

## Prove nel browser da lanciare a fine onda

`app_clienti.py` (esercita la scheda *Agenzie* di Clienti): va lanciata dal controllo di fine onda per verificare che il 409 del periodo chiuso si veda nel form. Non l'ho lanciata (porte e `.next` condivise) né modificata (non è fra i file ammessi e nessun rilievo la richiede).

## Da documentare (per il pacchetto documentazione)

**§19 — riga D-114**: la scrive il pacchetto documentazione dell'onda; il testo pronto è già in `collaudo-1-doc-documentazione.md` (riga 55). Per coerenza, la decisione U1 resta: «Agenzie bloccate nel periodo chiuso (D-51 esteso a `interscambio`): creazione, eliminazione e modifica di subagente, fornitore, sconto, % dell'agenzia, regola mensile o `valido_dal` di un'agenzia con `valido_dal` ≤ ultima chiusura del fornitore → 409; `valido_al` si sposta solo dopo la chiusura; la riga del fornitore si blocca `FOR UPDATE` nella stessa transazione.»

**Riga *Perché* in §4.2.6** (`interscambio`): «Un'agenzia con `valido_dal` nel periodo chiuso non si cambia nei campi che spostano i soldi (subagente, fornitore, sconto, %, regola, `valido_dal`) e non si elimina: l'agenzia decide subagente e sconto di ogni documento alla sua data (D-35), quindi cambiarla sul posto sposterebbe le provvigioni di trimestri liquidati e manderebbe gli storni al subagente sbagliato (A2-01, A3-01). La fine (`valido_al`) si sposta solo dopo la chiusura. Il blocco del fornitore serializza il cambio con la chiusura in corso (D-51, V13).»

**Guida (`app/frontend/lib/guida.ts`)** — Clienti › agenzie, *Da sapere*: «Un'agenzia che copre un periodo chiuso (bollettino verificato o trimestre liquidato) non si modifica nei campi che toccano i soldi e non si elimina: chiudi l'agenzia e aprine una nuova da una data successiva. La data di fine si sposta solo dopo la chiusura.»

**Piano (`piano-lavoro-crm.md`)**: il rilievo è già nel `piano-correzioni` (A2-01, A3-01, A6-12); nessuna ora nuova oltre a quelle stimate.

**README**: nulla (cambiamento solo backend, nessuna nuova configurazione).
