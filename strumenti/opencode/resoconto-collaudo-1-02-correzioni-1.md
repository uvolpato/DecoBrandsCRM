# Resoconto pacchetto 1-02 correzioni 1 — prova di `documenti.spec.ts` che creava l'agenzia nel periodo chiuso

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Gravità: P2 · Rilievi: C1

## Cosa ho fatto

### C1 — `valido_dal` nel periodo chiuso in una prova di `documenti.spec.ts`

`app/backend/test/documenti.spec.ts` (riga 463, prova «creata l'agenzia via API, la registrazione riesce e la pillola sparisce»):

- cambiato `valido_dal: '2026-01-01'` → `valido_dal: '2026-09-01'`.

Perché: la prova crea l'agenzia sul fornitore Gries, la cui ultima chiusura è 31/08/2026 (bollettino di agosto verificato; liquidazioni fino al 2° trimestre — `percentuali.spec.ts` riga 16). Con `valido_dal ≤ 31/08/2026` il blocco D-114 di `creaAgenzia` risponde 409 e la prova, che aspetta 201, falliva. `2026-09-01` è successivo alla chiusura e copre comunque la data del documento (2026-09-10) e la data della pratica (`data_ordine` 2026-09-01), quindi «Manca l'agenzia» sparisce. Codice di D-114 non toccato.

## Prove lanciate (database `decobrands_test_1_02c`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` sul database di prova | tutte le migrazioni applicate |
| `npx jest test/documenti.spec.ts test/clienti.spec.ts` | **2 suite, 78 prove, 0 KO** |
| `npx tsc --noEmit` (backend) | 0 errori nei file del pacchetto (`documenti.spec.ts`, `clienti.spec.ts`) |
| `git diff` / `git status --short` | toccato solo `app/backend/test/documenti.spec.ts` (gli altri file modificati sono dei pacchetti dell'onda in parallelo) |

`npx tsc --noEmit` sul backend intero segnala errori **solo** in `test/motore.spec.ts` (313, 314) e `test/profilo.spec.ts` (211): file di altri pacchetti dell'onda (motore e f7-profilo) in lavorazione in parallelo, non toccati né ammessi da questo pacchetto. Nessun errore in `documenti.spec.ts` né `clienti.spec.ts`.

Database `decobrands_test_1_02c` creato, migrato, usato e **cancellato** alla fine. Mai toccati `decobrands_db`, `decobrands_test` condiviso, né Integra (192.168.239.49). Nessun commit.

## Prove nel browser da lanciare a fine onda

Nessuna: la correzione è solo una prova del backend, nessun file del frontend `app/` né del prototipo toccato.

## Da documentare

Nessuna decisione nuova (D-nn): la correzione allinea una prova alla regola già esistente D-114 (§19), non la cambia. Non servono righe *Perché*, guida, piano o README.

**Piano (`piano-lavoro-crm.md`)**: il rilievo C1 è una correzione di prova introdotta dal pacchetto 1-02 (D-114); nessuna ora nuova.
