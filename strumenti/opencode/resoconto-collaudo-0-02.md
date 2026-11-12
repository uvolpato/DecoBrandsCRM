# Resoconto pacchetto 0-02 — Annullare un documento non cancella le decisioni di un bollettino chiuso

Data: 12/11/2026 · Rilievo: A3-03 (P2) · Esecutore: DeepSeek V4

## Cosa ho fatto

Il rilievo era aperto: `togliibile` non guardava `bollettini_attese`, e la FK
`bollettini_attese_documento_id_fkey` era `ON DELETE CASCADE`.

1. `app/backend/src/documenti.ts:936` (`documentoDi`): `_count.select` ora conta anche `attese_bollettino`.
2. `app/backend/src/documenti.ts:949-950` (`togliibile`): dopo il controllo delle righe del bollettino,
   `if (d._count.attese_bollettino) throw new ConflictException(\`${quale} ha una decisione in un bollettino: ${cosa}\`)`.
   Vale per l'annullamento (`DELETE /pratiche/:id/documenti/:did`) e per lo spostamento (`…/sposta`, che chiama
   lo stesso `togliibile`). Commento `// D-56, A3-03`.
3. `app/backend/prisma/schema.prisma` (modello `bollettini_attese`): relazione `documento`
   `onDelete: Cascade` → `onDelete: Restrict`.
4. `app/backend/prisma/migrations/20261113100000_attese_restrict/migration.sql`: toglie e ricrea
   `bollettini_attese_documento_id_fkey` con `ON DELETE RESTRICT ON UPDATE CASCADE`.
   Nessuna migrazione di dati: le attese esistenti non violano nulla (il vincolo stringe solo le cancellazioni).
5. Prova in `app/backend/test/documenti-pratica.spec.ts`, nuovo test «una decisione in un bollettino ferma
   annullamento e spostamento (A3-03)»: crea una conferma in una pratica del seed, le mette un'attesa
   (`bollettini_attese`, decisione `attendere`) e verifica `DELETE` → 409 e `sposta` → 409 con il testo
   «ha una decisione in un bollettino», documento ancora presente. Il test usa `base` (pratica del seed) e non
   `pid`, così gira anche da solo (`-t`). Aggiunto il metodo `elimina` all'agente di prova (DELETE con CSRF):
   il file delle prove non lo aveva.

Nessuna decisione del §19 è stata toccata: la correzione è la rete di sicurezza di D-56/D-54, non una regola nuova.

## Prove lanciate (database `decobrands_test_0_02`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` sul database di prova | 21 migrazioni applicate, nessuna pendente |
| `npx jest test/documenti-pratica.spec.ts test/bollettino.spec.ts test/vincoli.spec.ts` | **3 suite, 71 prove, 0 KO** |
| il solo test nuovo (`-t "decisione in un bollettino"`) | 1 passata (gira anche fuori ordine) |
| `npx tsc --noEmit` | 0 errori |
| `npx prisma validate` / `npx prisma generate` | schema valido, client generato |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | nessuna differenza sulla mia FK; restano le **differenze pre-esistenti** già segnalate nel resoconto 0-01 (`soggetti_cf_norm_idx`, `soggetti_piva_norm_idx`, default di `soggetti.codice`, tre `RENAME INDEX` su `interscambio_storico_*`) |
| `git status --short` | solo i file ammessi (più `doppioni-anagrafica-integra.xlsx` e `prototipo-alternativo/.tmp-soggetti.png`, non miei, già presenti) |

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_pratiche.py` (dettaglio pratica): su un documento con una decisione in un bollettino,
  «Annulla» e «Sposta» devono mostrare «… ha una decisione in un bollettino: non si annulla / non si sposta»,
  senza finestra tecnica; il documento resta nella pratica e nel bollettino.
- `strumenti/prove/app_bollettini.py`: aprire il bollettino con l'attesa, dopo il tentativo di annullamento la
  decisione è ancora lì con il suo motivo.

## Da documentare (per il pacchetto documentazione)

**Riga §19 (proposta, numero da assegnare dal pacchetto documentazione: in �19 l'ultimo usato � D-113 e D-139 � gi� deciso per un'altro pacchetto):**

| D-nn | 12/11/2026 | **Una decisione su un documento mancante vale anche contro l'annullamento.** Se un documento ha una riga in `bollettini_attese` (D-56), `DELETE /api/pratiche/:id/documenti/:did` e lo spostamento rispondono 409 «… ha una decisione in un bollettino: non si annulla / non si sposta». La FK `bollettini_attese.documento_id` passa a `ON DELETE RESTRICT`. | Il testo della contestazione di un bollettino chiuso è l'unica traccia del perché una fattura manca: la cascata lo cancellava in silenzio e il bollettino non si ricostruiva più. Il blocco nella rotta dà il messaggio, il vincolo nel database copre ogni altra via. | Ugo (collaudo A3-03) | §7.7, §7.3, §4.2.7.1, `src/documenti.ts`, `prisma/schema.prisma`, migrazione `attese_restrict` |

**Riga *Perché* nella sezione della spec** (§7.3 *Pratiche*, dove si annulla un documento):
«Un documento con una decisione in un bollettino non si annulla e non si sposta (D-nn): la decisione è il
testo della contestazione di un bollettino chiuso e la cancellazione a cascata la faceva sparire; il database
la protegge con `ON DELETE RESTRICT`.»

**Guida (`app/frontend/lib/guida.ts`)** — *Da sapere* delle Pratiche:
«Se un documento ha una decisione in un bollettino non si annulla e non si sposta: togli prima la decisione
dal bollettino, altrimenti il bollettino perderebbe il motivo della contestazione.»

**Piano (`piano-lavoro-crm.md`)**: attività «Decisione del bollettino protetta dall'annullamento (A3-03)»,
fase F3, 0,5 h **da approvare** (una FK, un controllo, una prova).

**README**: nulla.
