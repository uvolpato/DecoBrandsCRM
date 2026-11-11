# Collaudo · Onda 0 · Pacchetto 0-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 0 hanno finito (e prima del controllo di fine onda).
Raccoglie in un solo passaggio la documentazione di tutti, così spec, guida e piano non si pestano.

## Contesto e regole

- Leggi `CLAUDE.md` (radice) per intero: §4 regole 2 e 3 (il perché accompagna sempre il cosa; ogni modifica si
  documenta: spec, §16.4, §19, guida, LEGGIMI, piano, poi `python3 strumenti/genera-pagine-doc.py`).
- Italiano semplice e conciso; niente parole inglesi inutili.
- Registro §19: una riga per decisione nuova o cambiata, **6 colonne** (D-nn, data, decisione, perché, chi, dove),
  numeri D-114…D-132 già assegnati nel piano (sotto); altre D-nn nuove solo di seguito all'ultima presente. Chi: «Ugo (collaudo
  08/11/2026)» per le regole confermate da Ugo, altrimenti «collaudo A-n» con l'ID del rilievo.
- Versione della spec in testa: alzala di uno (es. 8.61 → 8.62) con il riassunto delle modifiche dell'onda.
- Funzioni incerte segnalate come tali (D-06).
- Non toccare codice (`app/backend/src`, `app/frontend/{app,componenti,lib}` salvo `lib/guida.ts`), né prove, né `CLAUDE.md`
  (solo Ugo).

## Da raccogliere: sezioni *Da documentare* dei resoconti dell'onda

- `strumenti/opencode/resoconto-collaudo-0-01.md` (Il file di un bollettino non si scarta e non si abbina a una pratica)
- `strumenti/opencode/resoconto-collaudo-0-02.md` (Annullare un documento non cancella le decisioni di un bollettino chiuso)
- `strumenti/opencode/resoconto-collaudo-0-03.md` (Numero della pratica UNIQUE e indici sulle chiavi esterne)
- `strumenti/opencode/resoconto-collaudo-0-04.md` (Indici trigram per la ricerca delle Pratiche)
- `strumenti/opencode/resoconto-collaudo-0-05.md` (`sconti` → `interscambio` con ON DELETE RESTRICT)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Rilievi di documentazione assegnati a questa onda

_Nessun rilievo A9 assegnato a questa onda._

## Righe del §19 da aggiungere

| D-139 | 11/11/2026 | **`sconti` → `interscambio` è `ON DELETE RESTRICT`**: un'agenzia con sconti storici non si elimina, si chiude (come le altre chiavi dell'anagrafica, A3-03). | Eliminare un'agenzia cancellava in silenzio gli sconti storici; le altre chiavi dell'anagrafica sono già RESTRICT (report R1, domanda 3; A3-03). | Ugo (collaudo 11/11/2026, R0 domanda 7) | §4.2.6; migrazione `20261113140000_sconti_restrict` |

Scrivila solo se il resoconto di 0-05 dice che la migrazione è applicata. D-133…D-138 le scrive 0b-doc; D-114…D-132 i pacchetti documentazione delle onde 1–8.

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-0-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-0-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
