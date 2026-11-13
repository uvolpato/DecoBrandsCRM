# Resoconto collaudo · Onda 1 · Pacchetto 1-06 — Oggi: bollettini dell'anno prima e «Documenti da decidere»

Esecutore: DeepSeek V4 Flash · Data: 12/11/2026 · Database di prova: `decobrands_test_1_06` (creato, usato, cancellato).

## Esito

- A4-02: **corretto**.
- A4-11: **già corretto** dal lavoro f7 (D-75, spec 8.62): nessuna modifica.
- Prove del pacchetto: **0 KO** (jest `test/oggi.spec.ts` 10/10, `npx tsc --noEmit` 0 errori).

## A4-02 — Bollettini dell'anno prima

File: `app/backend/src/oggi.ts`.

- `MeseBollettino` ha ora `anno` accanto a `mese` (riga 44-47).
- `mesiBollettini` (righe 49-76): periodi su **gli ultimi 12 mesi più quello in corso** con
  `generate_series(date_trunc('month', oggi) - interval '12 months', date_trunc('month', oggi), interval '1 month')`,
  `extract(month/year FROM g)` e join `b.anno = p.anno AND b.mese = p.mese`. Il bollettino di dicembre
  dell'anno prima non sparisce più il 1° gennaio.
- Titoli con l'anno («dicembre 2026»): bollettini aperti (riga 255) e non arrivati (riga 260), scadenze (riga 158).
- Scadenze: il «mese scorso» si calcola ora con anno e mese veri (righe 149-155), quindi a gennaio è dicembre
  dell'anno prima; tolto il vecchio `shortcut` e il suo commento.
- Commento di testa aggiornato: il gruppo Documenti è acceso da F6/D-75 (non più «disponibile: false»).

Prova: `test/oggi.spec.ts` — nuovo `describe('A4-02: bollettini dell'anno prima')` con oggi `2027-01-20`,
un fornitore (giorno 15) con una fattura del 10/12/2026 e nessun bollettino → la voce
«Sollecita il bollettino di dicembre 2026 di Fornitore Dicembre» è presente con azione `Vedi` e il
contatore della barra è > 0. Le prove esistenti sono state allineate alla finestra nuova + al seed (vedi sotto).

### Effetto sul seed (da sapere)

Il seed ha documenti fiscali dal 2025-09 (e 2025-01…08) ma bollettini solo dal 2026-05. Con la finestra
di 12 mesi + mese in corso, al 04/09/2026 i bollettini non arrivati passano da 1 a 9 (8 mesi del 2025:
ottobre/novembre/dicembre per vari fornitori, settembre per Ferro & Fiori; più giugno 2026). Totale gruppo:
3 aperti + 9 non arrivati = **12** (era 4). Non è un errore del calcolo: è la regola D-03 applicata anche
ai mesi precedenti. Il seed (`app/backend/prisma/seed/dati-prova.json`) è in elenco vietato: se si vuole
una dimostrazione senza i 9 solleciti storici, va aggiunto lì un bollettino per i mesi 2025 (pacchetto/onda
del seed, non questo).

## A4-11 — «Documenti da decidere»

`app/backend/src/oggi.ts:111-120` e `:243-248`: il gruppo è già acceso (f7, D-75). La condizione è la
stessa di `conteggiBarra` (`stato notIn ['scartato','abbinato']`, `abbinato_pratica_id: null`), le voci
hanno `href: '/documenti/' + id`, il tipo segue il livello (`bassa` → `errore`), `disponibile: true`.
Nessun «sommario provvisorio» residuo. `test/oggi.spec.ts:88-92` lo verifica già (15 documenti del seed).
Nessuna modifica.

## Prove lanciate

- `cd app/backend && npx jest test/oggi.spec.ts` (con `DATABASE_URL_TEST=…/decobrands_test_1_06` e
  `TMP/TEMP` separati): **10/10 passati, 0 KO**.
- `cd app/backend && npx tsc --noEmit`: **0 errori**.
- `python -m py_compile strumenti/prove/app_oggi.py`: **OK** (file non modificato: nessuna attesa da cambiare).
- Database `decobrands_test_1_06` cancellato (`DROP DATABASE`). Nessun contatto con Integra, `decobrands_db`
  o il database condiviso `decobrands_test`.
- `git status --short`: toccati solo `app/backend/src/oggi.ts` e `app/backend/test/oggi.spec.ts` (le altre
  modifiche in working tree sono di pacchetti paralleli della stessa onda).

Controlli caricati davvero e fatti sul diff: `postgresql-code-review` (SQL parametrizzato, `generate_series`
su timestamp senza fuso, join su `anno`/`mese`, nessuna nuova scansione pesante) e `ponytail-review`
(nessun rilievo: la modifica è la query chiesta dal pacchetto, il resto sono 5 righe per il mese scorso).

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_oggi.py` (non modificata). Nessun'altra prova del browser è interessata.

## Da documentare

### Spec §7.1 (pagina Oggi)

Dopo la descrizione dei gruppi aggiungere:

> I bollettini da verificare o sollecitare sono quelli degli **ultimi 12 mesi e del mese in corso**, non
> solo dell'anno di oggi: il bollettino di dicembre si sollecita a gennaio (A4-02, D-03).

*Perché*: all'inizio di gennaio la query guardava solo il nuovo anno e il bollettino di dicembre (atteso
per regola nel mese successivo, §5.6) non compariva più fra le cose da fare, né come «Sollecita» né come
voce aperta da chiudere.

### Spec §8.1, tabella `GET /api/oggi` (riga dell'endpoint)

Sostituire «bollettini del mese in SQL» con «bollettini degli ultimi 12 mesi e del mese in corso in SQL
(A4-02, D-03)» e la frase sul gruppo Documenti («è vuoto con `disponibile: false` finché arriva F6») con
«il gruppo *Documenti da decidere* è acceso dall'ingresso documenti (F6, D-75): voci con il documento, il
fornitore e il livello, collegate a `/documenti/:id`».

### Registro §19

Nessuna regola nuova: vale D-03 (§5.6) già registrata. Se il pacchetto documentazione vuole comunque la
riga di correzione del collaudo:

| D-144 | 12/11/2026 | **Oggi guarda i bollettini degli ultimi 12 mesi e del mese in corso, non solo dell'anno.** `mesiBollettini` in `src/oggi.ts` genera i periodi da `date_trunc('month', oggi) - interval '12 months'` a `date_trunc('month', oggi)`, con `anno` accanto a `mese` nei titoli («dicembre 2026»). | A gennaio il bollettino di dicembre dell'anno prima non entrava più in Oggi: né fra i non arrivati da sollecitare né fra gli aperti da chiudere. Vale la regola di §5.6/D-03 (bollettino atteso il mese dopo), che non si ferma al cambio d'anno. | collaudo A4-02 | §5.6, §7.1, §8.1, `src/oggi.ts` |

### Guida in linea (`app/frontend/lib/guida.ts`)

Nessuna modifica necessaria: l'argomento Oggi non parla di «anno in corso» né di gruppo Documenti spento.
Se si vuole una nota, nel gruppo *Bollettini* di Oggi: «Anche dicembre dell'anno prima, finché non arriva
il bollettino.».

### Piano, README, prototipo

- `piano-lavoro-crm.md`: nessuna attività nuova (correzione di collaudo, 0 ore).
- `app/README.md`, `prototipo-alternativo/LEGGIMI.md`, `guida.js`, `PRD`: nulla.
- Prototipo: `M.daFare` resta con `anni = [2026]`; è una dimostrazione e la finestra di 12 mesi è una
  regola del server. Se si vuole allineare, è una modifica al prototipo (non in questo pacchetto).
