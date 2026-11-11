# Collaudo · Onda 5 · Pacchetto 5-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 5 hanno finito (e prima del controllo di fine onda).
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

- `strumenti/opencode/resoconto-collaudo-5-01.md` (Stessa fattura su due pratiche solo con conferma «multi-ordine»)
- `strumenti/opencode/resoconto-collaudo-5-02.md` (Memoria della schermata per passo di cronologia e dopo il ricaricamento)
- `strumenti/opencode/resoconto-collaudo-5-03.md` (Pratiche: righe ferme fino ad Aggiorna (o eccezione D-94 scritta))
- `strumenti/opencode/resoconto-collaudo-5-04.md` (Totali dal server: Liquidazioni e Analisi (V12))
- `strumenti/opencode/resoconto-collaudo-5-05.md` (Correzioni di un bollettino contestato nel mese dopo)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro, in ordine di numero)

Numeri già assegnati nel piano (D-114…D-132): usa **esattamente** questi, una volta sola. Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede l'utente, il testo in `guida.ts`.

| D-123 | 08/11/2026 | **La stessa fattura su un'altra pratica solo con la conferma «multi-ordine».** Registrando una fattura o una nota di credito con tipo e numero già presenti per lo stesso fornitore su un'altra pratica, il server risponde 409 «Fattura già registrata in OF/…» a meno che la persona confermi (`multi_ordine: true`). Precisa D-54. | Lo stesso documento arrivato in due file diversi (email e scansione) si abbinava a due pratiche: fatturato e provvigioni doppi (collaudo A4-08). | Ugo (collaudo 08/11/2026, U11) | §4.2.7.1, §7.3; `documenti.ts` (`registra`) |
| D-130 | 08/11/2026 | **Solo l'elenco Documenti aggiorna le righe da solo.** Eccezione a D-23: l'elenco *Da controllare* di Documenti aggiorna le righe via SSE (D-94); tutte le altre tabelle, Pratiche compresa, aggiornano subito i conteggi e le righe solo con *Aggiorna*. Il pattern di D-94 per ora non si estende a Pratica, Bollettino e anagrafiche. | Le righe che si spostano mentre si lavora sono il motivo di D-23; l'elenco di Documenti è una coda di lavoro che va tenuta fresca (collaudo A6-04, A9-08). | Ugo (collaudo 08/11/2026, U21) | §7.9, §16.4.2; `VistaPratiche.tsx`, `VistaDocumenti.tsx` |
| D-126 | 08/11/2026 | **Totali e differenze degli importi dal server.** I totali in fondo alle tabelle di Liquidazioni, Analisi e righe del documento e la differenza riga per riga del Bollettino arrivano nella risposta del server (`totali`, `differenza`); la DataTable li mostra senza sommare. La somma nel browser resta solo per colonne che non sono importi. | V12 e CLAUDE.md regola 0 mettono i totali fra i calcoli solo lato server; le somme in virgola mobile davano due totali diversi sulla stessa pagina (collaudo A5-08). | Ugo (collaudo 08/11/2026, U14) | §16.4 (DataTable), §16.5; `liquidazioni.ts`, `analisi.ts`, `bollettino.ts`, `documenti.ts` |
| D-119 | 08/11/2026 | **Le correzioni di un bollettino contestato arrivano nel bollettino del mese dopo.** Il bollettino contestato non si riapre e non si sostituisce (D-56, uno per fornitore e mese): le correzioni del fornitore sono righe del bollettino del mese successivo riferite ai documenti del mese contestato, e si riconciliano contro quei documenti. | Un secondo bollettino dello stesso mese non si può caricare (vincolo fornitore × mese): senza questa regola le correzioni non avevano dove entrare (collaudo A2). | Ugo (collaudo 08/11/2026, U6) | §5.6, §7.7; `bollettino.ts`, `motore.ts` (`riconcilia`) |

## Righe *Perché* senza numero nuovo (confermano una regola esistente)

- §7.12 — *Perché (U15, collaudo A5-09):* la memoria della schermata sopravvive al ricaricamento e vale per passo di cronologia (`sessionStorage` + `history.state`); la semplificazione `ponytail:` di `lib/memoria.ts` è chiusa.

## Rilievi di documentazione assegnati a questa onda

### A9-08 — Documenti: le righe si aggiornano da sole (D-94), ma guida e §16.4.2/D-23 dicono «le tabelle no»
- Gravità: P3
- Dove: `app/frontend/app/(app)/documenti/VistaDocumenti.tsx:78-87` (su ogni evento SSE ricarica `documenti?stato=da_controllare` e fa `setDati`) contro `app/frontend/lib/guida.ts:67` («i contatori si aggiornano da soli; le tabelle no: compare “Ci sono aggiornamenti · Aggiorna”») e spec §16.4.2 r. ~3943 / D-23. Inoltre D-94 dice che il pattern «si estende ai dettagli (Pratica, Bollettino) e alle anagrafiche», ma `useEventi` è usato solo in `VistaOggi`, `VistaDocumenti`, `VistaPratiche`, `VistaBollettini`.
- Problema: due regole opposte per gli elenchi; D-94 annuncia un'estensione non fatta e non pianificata.
- Scenario: un documento arriva via email mentre l'operatore guarda l'elenco → la riga compare da sola senza *Aggiorna*, contro quanto dice la Guida.
- Correzione puntuale: in guida.ts:67 aggiungere «Eccezione: l'elenco *Da controllare* di Documenti si aggiorna da solo (D-94).»; in §16.4.2 la stessa eccezione con *Perché (D-94)*; nella riga D-94 cambiare «si estende» in «si estenderà (non ancora fatto)» oppure aggiungere l'attività nel piano (A9-05).
- Prova che la verifica: `strumenti/prove/app_documenti.py` (arrivo nuovo documento) + rilettura.
- Esecutore: DeepSeek V4 Flash — testo.
- File toccati: `app/frontend/lib/guida.ts`, `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A9-07, D-23, D-94 (vedi *Da decidere*)

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-5-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-5-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
