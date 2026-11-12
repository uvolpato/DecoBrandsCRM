# Resoconto pacchetto 0-05 — `sconti` → `interscambio` con ON DELETE RESTRICT

Data: 12/11/2026 · Rilievo: R0-D7 (P3) · Decisione: D-139 (di Ugo, 11/11/2026) · Esecutore: DeepSeek V4

## Cosa ho fatto

1. `app/backend/prisma/migrations/20261113140000_sconti_restrict/migration.sql`: toglie e rifà
   `sconti_interscambio_id_fkey` con `ON DELETE RESTRICT ON UPDATE CASCADE` (la migrazione vecchia non è toccata).
   Prisma esegue il file in una transazione: non esiste un momento in cui la FK manca.
2. `app/backend/prisma/schema.prisma`, modello `sconti`: `onDelete: Cascade` → `onDelete: Restrict`, con commento `// D-139`.
3. `app/backend/test/vincoli.spec.ts`, describe «interscambio datato (D-35)»: agenzia + sconto `commerciale`
   → `DELETE` dell'agenzia rifiutato con `sconti_interscambio_id_fkey` (SQLSTATE 23503); tolti gli sconti,
   l'agenzia si elimina. Il test gira anche da solo (`-t "sconti storici"`).

## Review chiesta dal pacchetto (skill caricate davvero)

**`postgresql-code-review`** (sulla migrazione):
- `DROP CONSTRAINT` + `ADD CONSTRAINT` nello stesso file: Prisma li esegue nella stessa transazione, quindi il
  vincolo non resta mai assente. Nessuna finestra.
- `ADD CONSTRAINT` valida le righe esistenti con un `ACCESS EXCLUSIVE` su `sconti`: la tabella oggi non si usa
  (§R0-D7: «oggi la tabella non si usa»), quindi il blocco è irrilevante. Se un domani fosse grande, servirà
  `NOT VALID` + `VALIDATE CONSTRAINT`. **Non è un rilievo adesso**: nota per il futuro.
- `ON UPDATE CASCADE` conservato: è il valore che Prisma si aspetta, quindi `migrate diff` resta pulito.
- Nessuna chiave esterna persa, nessun indice nuovo necessario (`sconti_interscambio_id_ordine_valido_dal_key`
  copre già `interscambio_id` in testa).

**`ponytail-review`** (correttezza, rischio, prova, snellezza):
- Il vincolo è la sola modifica di comportamento; la prova c'è ed è piccola. Nessun codice nuovo: la migrazione
  sono 5 righe utili.
- **Rilievo vero (fuori dai file ammessi):** `app/backend/src/clienti.ts:376` (`eliminaAgenzia`) fa
  `tx.interscambio.delete` senza passare da `unico()`. Con RESTRICT, se l'agenzia ha sconti, Prisma lancia
  `P2003` e il filtro degli errori (`errori.filter.ts`) risponde **500 «Errore interno»** invece di un 409 chiaro.
  Oggi non si può arrivare a quel caso (nessuna rotta scrive `sconti`), quindi non l'ho toccato: `clienti.ts` non
  è fra i file ammessi. Correzione da fare in un pacchetto successivo, una riga:
  `await unico(() => tx.interscambio.delete({ where: { id: a.id } }), 'L'agenzia ha sconti storici: chiudila invece di eliminarla')`
  — `unico` mappa già `P2003` in 409 (`clienti.ts:402`).
- Nient'altro: nessun percorso di dati perso, nessuna corsa, nessuna duplicazione.
- Verdetto: **spedire**, con il 409 dell'agenzia come attività aperta qui sotto.

## Prove lanciate (database `decobrands_test_0_05`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` sul database di prova | 25 migrazioni applicate, nessuna pendente |
| `npx jest test/vincoli.spec.ts test/clienti.spec.ts test/seed.spec.ts` | **3 suite, 67 prove, 0 KO** |
| il solo test nuovo (`-t "sconti storici"`) | 1 passata |
| `npx tsc --noEmit` | 0 errori |
| `npx prisma validate` / `npx prisma generate` | schema valido, client generato |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | nessuna differenza sulla mia FK; restano le **differenze pre-esistenti** già segnalate nei resoconti 0-01…0-04 (`soggetti_cf_norm_idx`, `soggetti_piva_norm_idx`, default di `soggetti.codice`, tre `RENAME INDEX` su `interscambio_storico_*`) |
| `git status --short` | solo i file ammessi dei cinque pacchetti (più `doppioni-anagrafica-integra.xlsx` e `prototipo-alternativo/.tmp-soggetti.png`, non miei, già presenti) |

Nota: correndo l'intera suite `vincoli.spec.ts` compare un `DeprecationWarning` di `pg` («client.query() when the
client is already executing»). C'è anche correndo i soli test vecchi: non viene dal test nuovo (che da solo non lo
produce). Non l'ho toccato: il file è ammesso, ma il difetto è nel modo in cui una prova esistente concatena le
chiamate; va guardato quando si tocca di nuovo quel file.

### Prova d'insieme dei cinque pacchetti (fatta alla fine dell'onda)

Database nuovo `decobrands_test_0_wave`, 25 migrazioni, poi
`npx jest test/vincoli.spec.ts test/bollettini.spec.ts test/documenti.spec.ts test/documenti-pratica.spec.ts
test/bollettino.spec.ts test/pratiche.spec.ts test/seed.spec.ts test/utenti.spec.ts test/clienti.spec.ts`
→ **9 suite, 189 prove, 0 KO** (103 s). Database cancellato.

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_clienti.py` (scheda *Agenzie*): eliminare un'agenzia senza sconti funziona come prima.
  Con gli sconti storici oggi non esiste una via dell'interfaccia che li crei: la prova resta sulla rotta.
- `strumenti/prove/app_fornitori.py`: nessun cambiamento visibile.

## Da documentare (per il pacchetto documentazione)

**Riga §19 — D-139 (già decisa da Ugo l'11/11/2026, testo pronto):**

| D-139 | 11/11/2026 | **`sconti` → `interscambio` è `ON DELETE RESTRICT`:** un'agenzia con sconti storici non si elimina, si chiude (come le altre chiavi dell'anagrafica). | Gli sconti collegati si cancellavano in silenzio con l'agenzia: i calcoli del passato non si sarebbero più potuti rifare. | Ugo | §4.7, §4.2.20, `prisma/schema.prisma`, migrazione `sconti_restrict` |

**Riga *Perché* nella sezione della spec** (§4.7 *Anagrafica a soggetti*, o §4.2.20 dove si parla di agenzie):
«Un'agenzia con sconti storici non si elimina: `sconti.interscambio_id` è `ON DELETE RESTRICT` (D-139). Si chiude
con `valido_al`, come le altre chiavi dell'anagrafica.»

**Guida (`app/frontend/lib/guida.ts`)** — *Da sapere* delle Agenzie: «Un'agenzia che ha sconti storici non si
elimina: chiudila con la data di fine, così i calcoli del passato restano rifacibili.»

**Piano (`piano-lavoro-crm.md`)**: attività «FK `sconti` → `interscambio` a RESTRICT (R0-D7)», fase F1, 0,5 h
**da approvare**; più l'attività aperta «409 chiaro eliminando un'agenzia con sconti» (una riga in `clienti.ts`,
0,25 h **da approvare**).

**README**: nulla.
