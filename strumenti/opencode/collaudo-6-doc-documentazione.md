# Collaudo · Onda 6 · Pacchetto 6-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 6 hanno finito (e prima del controllo di fine onda).
Raccoglie in un solo passaggio la documentazione di tutti, così spec, guida e piano non si pestano.

## Contesto e regole

- Leggi `CLAUDE.md` (radice) per intero: §4 regole 2 e 3 (il perché accompagna sempre il cosa; ogni modifica si
  documenta: spec, §16.4, §19, guida, LEGGIMI, piano, poi `python3 strumenti/genera-pagine-doc.py`).
- Italiano semplice e conciso; niente parole inglesi inutili.
- Registro §19: una riga per decisione nuova o cambiata, **6 colonne** (D-nn, data, decisione, perché, chi, dove),
  numerazione di seguito all'ultima D-nn presente (controlla l'ultima prima di scrivere). Chi: «Ugo (collaudo
  08/11/2026)» per le regole confermate da Ugo, altrimenti «collaudo A-n» con l'ID del rilievo.
- Versione della spec in testa: alzala di uno (es. 8.61 → 8.62) con il riassunto delle modifiche dell'onda.
- Funzioni incerte segnalate come tali (D-06).
- Non toccare codice (`app/backend/src`, `app/frontend/{app,componenti,lib}` salvo `lib/guida.ts`), né prove, né `CLAUDE.md`
  (solo Ugo).

## Da raccogliere: sezioni *Da documentare* dei resoconti dell'onda

- `strumenti/opencode/resoconto-collaudo-6-01.md` (Prove nel browser: indirizzo unico, esito subito, uscita 1 con KO)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

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
- `strumenti/opencode/resoconto-collaudo-6-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-6-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
