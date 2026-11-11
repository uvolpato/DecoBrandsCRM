# Collaudo · Onda 8 · Pacchetto 8-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 8 hanno finito (e prima del controllo di fine onda).
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

- `strumenti/opencode/resoconto-collaudo-8-01.md` (Prove nel browser: modulo comune, build di esercizio, segmenti come pulsanti)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro, in ordine di numero)

Numeri già assegnati nel piano (D-114…D-132): usa **esattamente** questi, una volta sola. Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede l'utente, il testo in `guida.ts`.

| D-128 | 08/11/2026 | **I segmenti dei filtri sono un gruppo di pulsanti, non schede.** `.segmenti` ha `role="group"` con etichetta e ogni segmento `aria-pressed`; `role="tab"` resta solo alle schede vere (`Schede`). Le prove cercano i segmenti con `.segmenti [aria-pressed]`. | Il lettore di schermo annunciava «scheda 2 di 5» su filtri senza pannello e senza frecce (collaudo A7-10, WCAG 4.1.2). | Ugo (collaudo 08/11/2026, U18) | §16.4.1; `FilterBar.tsx`, `stile.css`, `strumenti/prove/` |
| D-132 | 08/11/2026 | **Le prove nel browser girano anche sulla build di esercizio.** `strumenti/prove/comune.py` apre le pagine con `bypass_csp=True`: le `app_*.py` valgono sia con `next dev` sia con `next build` + `next start`. | La CSP di esercizio senza `unsafe-eval` fermava ogni `wait_for_function`: si collaudava solo `next dev`, non ciò che va in esercizio (collaudo A6-06). | Ugo (collaudo 08/11/2026, U24) | §14; `strumenti/prove/comune.py`, `app/README.md` |

## Rilievi di documentazione assegnati a questa onda

### A9-14 — §16.4: componenti dell'app non censiti (fra cui `PdfEvidenziato`, il componente di D-06)
- Gravità: P3
- Dove: spec §16.4 (r. 3832-4005) contro `app/frontend/componenti/`: zero occorrenze in tutta la spec per `PdfEvidenziato`, `InCostruzione` (usato da `app/(app)/[...resto]/page.tsx`), `Aggiornamenti`, `Modale`; non in §16.4 anche `ConsultaDocumenti`, `Solleciti`, `Barra`, `Licenza`, `ScenaAccesso`, `Utente`, `Piccoli`, `Icona`, `ClasseBody`.
- Problema: CLAUDE.md §3: ogni componente nuovo va in §16.4 (e nel catalogo); il componente che decide quando disegnare il rettangolo (D-06) non è documentato.
- Scenario: chi rifà la finestra di correzione non sa che esiste `PdfEvidenziato` (PDF.js, margine 5 px, scorrimento al campo) e ne scrive un secondo.
- Correzione puntuale: in §16.4 una riga ciascuno almeno per `PdfEvidenziato` (props, regola: rettangolo solo con posizione `esatta`, D-06), `ConsultaDocumenti` (D-78/D-93), `Aggiornamenti` (D-23), `InCostruzione`, `Modale`.
- Prova che la verifica: grep dei nomi dei file di `componenti/` nel §16.4.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A9-01, A8 (eventuali componenti morti)

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-8-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-8-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
