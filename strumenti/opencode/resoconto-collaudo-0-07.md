# Resoconto pacchetto 0-07 — Il PDF di un bollettino è «abbinato» (D-140)

Data: 12/11/2026 · Rilievo: O0-08 (P3) · Decisione: D-140 (Ugo, 12/11/2026) · Esecutore: DeepSeek V4
Correlati: D-54, D-56, D-74, A3-02 (0-01)

## Caso trovato nel punto 1 (lettore e lettura del PDF di un bollettino)

**Il lettore legge davvero i PDF dei bollettini, ma nessuno usa quella lettura: caso 1.**

- Il prelievo della coda (`documenti.ts:130`) prende `WHERE stato = 'in_coda'` senza guardare
  `abbinato_bollettino_id`: un PDF caricato e poi legato a un bollettino resta in coda e viene letto
  (campi, tipo, fornitore, livello, `da_controllare`).
- Quella lettura non serve a niente: il dettaglio del bollettino (`bollettino.ts:141`) prende dagli arrivati
  solo `id` e `file_nome`, e il PDF si apre da `/api/documenti/:id/file` (che guarda solo lo stato `scartato`);
  la pagina del bollettino non mostra campi letti. Nessun'altra parte del backend o del frontend legge
  `documenti_campi`, `livello` o `tipo` di un documento legato a un bollettino: le righe del bollettino si
  decidono a mano o dai documenti fiscali delle pratiche.
- Quindi: **all'atto del legame** il file passa ad `abbinato` e non viene più letto. `lettore.ts` e `lettura.ts`
  non sono stati toccati. Il 409 per un file `in_lettura` non è stato aggiunto: non serve al caso 1 (vedi *Cose
  aperte*).

## Cosa ho fatto

1. `app/backend/src/bollettini.ts` (`carica`, lo stesso `update` della stessa transazione che lega il file):
   `stato: 'abbinato', controllato_il: new Date()` accanto a `abbinato_bollettino_id`, con commento `// D-140`.
2. `app/backend/prisma/migrations/20261113160000_bollettino_abbinato/migration.sql`: `UPDATE documenti_in_arrivo
   SET stato = 'abbinato' WHERE abbinato_bollettino_id IS NOT NULL AND stato IN ('in_coda','da_controllare','errore')`
   con il commento della decisione. Nessun CHECK nuovo (gli stati ammessi non cambiano).
3. `app/backend/src/oggi.ts` (i due filtri, `conteggiBarra` e `calcolaOggi`): la regola è lo stato,
   `stato: { notIn: ['scartato', 'abbinato'] }`; tolto `abbinato_bollettino_id: null`, che ora è superfluo
   (un file legato a un bollettino è `abbinato` per costruzione). `abbinato_pratica_id: null` è rimasto com'era:
   non era nel rilievo.
4. `app/backend/test/bollettini.spec.ts`: dopo `POST /bollettini` con `arrivo_id` il file ha `stato = 'abbinato'`
   e `controllato_il` valorizzato; `/oggi/conteggi` resta a **15** documenti (il PDF legato non entra più);
   il rifiuto dell'abbinamento alla pratica ora arriva dal controllo di stato (vedi *Da documentare*).
   `test/oggi.spec.ts` non è stato toccato: i numeri del seed sono gli stessi.

## Prove lanciate (database `decobrands_test_0_07`, proprio, cancellato alla fine)

| Prova | Esito |
|---|---|
| database nuovo → `npx prisma migrate deploy` | 26 migrazioni applicate (c'è anche `20261113160000_bollettino_abbinato`) |
| seed + un documento del seed legato a un bollettino con `stato = 'da_controllare'` → il file `migration.sql` | 1 riga aggiornata: `stato = 'abbinato'`; `14 da_controllare`, `2 scartato` intatti |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | vuoto |
| `npx tsc --noEmit` | 0 errori |
| `npx jest test/bollettini.spec.ts test/bollettino.spec.ts test/oggi.spec.ts test/documenti.spec.ts test/vincoli.spec.ts` | **5 suite, 116 prove, 0 KO** (61 s) |

Nota: la prima esecuzione ha trovato una mia svista nella prova (`/api/oggi/conteggi` invece di `/oggi/conteggi`
con l'agente della suite), poi un 409 con il testo generico invece di «Il file è il PDF di un bollettino»:
con il file ormai `abbinato`, `documenti.ts` rifiuta prima sullo stato. Ho allineato la prova al testo nuovo,
che resta vero («è già abbinato»).

## Review chiesta dal pacchetto (skill caricate davvero)

**`postgresql-code-review`** (sulla migrazione):
- `UPDATE` con `WHERE abbinato_bollettino_id IS NOT NULL AND stato IN (...)` sull'indice `documenti_in_arrivo_stato_idx`
  (o scansione sequenziale: la tabella è piccola) — una volta sola, alla migrazione, nessun rischio di blocco.
- Nessun CHECK nuovo: gli stati ammessi sono già quelli, `abbinato` compreso. Nessun indice nuovo necessario.
- Idempotente: rilanciata, non trova più righe da cambiare.

**`prisma-cli`**: `migrate deploy` sul database di prova, `migrate diff` vuoto, nessuna operazione distruttiva.

**`ponytail-review`** (correttezza, rischio, snellezza):
- Tre righe di codice più la migrazione: nessun percorso nuovo, nessuna astrazione; `oggi.ts` perde un
  condizioni e guadagna una regola sola.
- V12/V13 rispettati: lo stato lo scrive il server nella transazione che blocca fornitore e documento
  (`FOR UPDATE`, D-51/D-54); il browser non manda stati.
- Rischio residuo: la corsa del file in lettura (sotto), che il pacchetto ha chiesto di non chiudere.
- Verdetto: **spedire**, con la corsa come attività aperta.

## Da documentare (per il pacchetto documentazione)

**Riga §19 — D-140 (Ugo, 12/11/2026):**

| D-140 | 12/11/2026 | **Il PDF di un bollettino, legato al bollettino del suo fornitore e mese (D-56), ha stato `abbinato`**, come un documento abbinato a una pratica. | I documenti «da controllare» si contano con una regola sola, lo stato, senza filtri a parte: prima il file restava `in_coda`/`da_controllare` e le altre liste lo vedevano come da lavorare. | Ugo | §7.7, §7.1, `src/bollettini.ts`, `src/oggi.ts`, migrazione `20261113160000_bollettino_abbinato` |

**Riga *Perché* nella sezione dei bollettini della spec (§7.7, dove si carica il bollettino):**
«Il PDF legato al bollettino è `abbinato` e `controllato_il` è valorizzato: non è più un documento da
controllare, non viene letto dal lettore e non compare in Oggi né in Documenti (D-140). I documenti da lavorare
si contano dallo stato: `scartato` e `abbinato` sono chiusi.»

**Guida (`app/frontend/lib/guida.ts`)**: nessun testo da cambiare — la guida del bollettino parla del PDF
allegato, non dello stato del documento. Se si vuole una riga in *Da sapere* dei Bollettini: «Il PDF che alleghi
al bollettino resta agganciato a quel bollettino e non compare fra i documenti da controllare.»

**Piano (`piano-lavoro-crm.md`)**: attività «PDF del bollettino in stato `abbinato` (O0-08, D-140)», fase F3,
0,5 h **da approvare**.

**README**: nulla.

## Cose aperte

- **Corsa**: se il file è già `in_lettura` quando lo si lega al bollettino, `bollettini.ts` lo accetta (rifiuta
  solo lo `scartato`) e alla fine della lettura `salva()` riporta lo stato a `da_controllare`: il file resterebbe
  `da_controllare` pur essendo legato al bollettino, contro D-140. Il pacchetto dice di aggiungere il 409 per
  `in_lettura` solo nel caso 2, e il caso è l'1, quindi non l'ho fatto. Correzione da un pacchetto successivo, una
  riga in `bollettini.ts` (409 «Il documento è in lettura: riprova fra poco») oppure in `lettura.ts` (a fine
  lettura, se ha `abbinato_bollettino_id`, stato `abbinato`).
- **Testo del rifiuto**: un PDF di bollettino che si prova ad abbinare a una pratica ora riceve «Il file non è
  più in coda: è già abbinato, scartato o in lettura» invece di «Il file è il PDF di un bollettino». È vero, ma
  meno preciso. Per riavere il testo specifico basta invertire i due controlli in `documenti.ts:1200-1202`
  (file non ammesso da questo pacchetto).
