# Collaudo · Onda 4 · Pacchetto 4-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 4 hanno finito (e prima del controllo di fine onda).
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

- `strumenti/opencode/resoconto-collaudo-4-01.md` (Sagome D-59 — parte 2: Sistema, Scartati, Analisi, Clienti, Utenti; Scartati a 768 px)
- `strumenti/opencode/resoconto-collaudo-4-02.md` (Tabelle che ricordano ordinamento e scorrimento: Pratiche e Liquidazioni)
- `strumenti/opencode/resoconto-collaudo-4-03.md` (Scorrimento ripristinato all'arrivo dei dati; «Torna a…» che non punta a sé)
- `strumenti/opencode/resoconto-collaudo-4-04.md` (Importi in euro scritti in un solo modo nel backend)
- `strumenti/opencode/resoconto-collaudo-4-05.md` (Report subagenti di un trimestre chiuso dalla fotografia)
- `strumenti/opencode/resoconto-collaudo-4-06.md` (Contrasti WCAG e carattere fuori dal CSS bloccante)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro, in ordine di numero)

Numeri già assegnati nel piano (D-114…D-132): usa **esattamente** questi, una volta sola. Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede l'utente, il testo in `guida.ts`.

| D-120 | 08/11/2026 | **Report subagenti di un trimestre chiuso = fotografia.** Per un trimestre con liquidazione chiusa il Report subagenti si costruisce dalla fotografia (`liquidazioni.totali.documenti`), come la pagina Liquidazioni; per il trimestre aperto resta il calcolo dal vivo (provvigione generata, compresi i documenti in attesa dei bollettini). | Ricalcolato dal motore, il report di un trimestre chiuso cambiava appena cambiavano i dati di base e non coincideva più con la liquidazione (collaudo A2-07, D-33). | Ugo (collaudo 08/11/2026, U7) | §7.8; `liquidazioni.ts` |

## Righe *Perché* senza numero nuovo (confermano una regola esistente)

- §16.1 — *Perché (U16, D-24 confermata):* i token dei colori (contrasti WCAG) e il carattere si cambiano nel `stile.css` del prototipo e si ricopiano nell'app; i due file restano uguali.

## Rilievi di documentazione assegnati a questa onda

_Nessun rilievo A9 assegnato a questa onda._

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-4-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-4-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
