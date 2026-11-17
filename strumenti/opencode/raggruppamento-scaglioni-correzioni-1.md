# Pacchetto `raggruppamento-scaglioni-correzioni-1`

Leggi prima `strumenti/opencode/raggruppamento-scaglioni.md` e il resoconto `resoconto-raggruppamento-scaglioni.md`
(sezioni «Dove una pct unica non regge» e «Dubbi»). Il lavoro fatto è buono e resta: qui si chiudono i buchi.

## Rilievi
1. **Provvigione per documento con due verità** (grave, soldi). In modalità `riga` `calcoloDocumento` usa i gruppi, ma
   `quotaSub` / `provvigioneDoc` / `riconcilia` (riga.noi) / `righeLiquidazione` / `fattiAnalisi` / `analisiTrimestre`
   ricalcolano con lo scaglione unico dello sconto medio. Scenario: fornitore `riga`, fattura 600 al 5% + 400 al 20%
   → documento 130 €, liquidazione e Analisi 100 €.
   **Correzione alla radice, un punto solo**: le funzioni di provvigione per documento usate da quei punti devono
   passare dallo stesso calcolo per gruppi quando `raggruppamentoDi(S, p)` è `riga` (es. `quotaSub` e la provvigione
   Decobrands del documento delegano a `provvigioneRiga`, oppure tutti leggono da `calcoloDocumento`). Niente doppioni
   della logica. Per i documenti **congelati** vale il `calcolo` salvato, come oggi (D-183): verifica che sia così
   anche in liquidazione e Analisi. In modalità `documento` i numeri restano identici al centesimo (suite esistenti
   senza ritocchi ai valori attesi).
2. **Anomalia del gruppo**: un gruppo senza scaglione (oltre l'ultimo) deve dare un'anomalia propria
   («gruppo con sconto X% oltre l'ultimo scaglione») nello stesso elenco di `anomaliaScontoMedio`, e la pratica non si
   chiude, come per lo sconto medio. In modalità `riga` l'anomalia dello sconto medio del documento **non** si alza
   (comandano i gruppi).
3. **Gruppi nel dettaglio del documento** (non fatto perché fuori dai file): nella pagina del documento
   (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`) e, se c'è, nel dettaglio documento della pratica, in
   modalità riga una piccola tabella in tenue sotto la provvigione: sconto, base, scaglione, % Decobrands, % subagente,
   provvigioni. Il frontend mostra solo `calcolo.gruppi` (V12, nessun conto nel browser).
4. **Base in modalità riga = somma delle righe**: se la somma delle righe merce (+ spese incluse) non coincide con
   netto − spese escluse (sconto in calce, arrotondamenti oltre 0,05 €), il documento torna allo sconto medio con
   `regola` «righe che non tornano col netto: sconto medio». Prova dedicata.

## Prove (jest con `DATABASE_URL` esplicito su `decobrands_test_raggruppamento2`, crealo e cancellalo; 0 KO)
- fornitore `riga`, fattura 600@5% + 400@20%: documento, liquidazione del subagente, Analisi, riconciliazione prima
  della verifica → stessi numeri (130 € / 68 €);
- stesso dato in `documento`: numeri di oggi;
- congelato: liquidazione e Analisi usano il valore fissato;
- gruppo oltre l'ultimo scaglione → anomalia del gruppo, nessuna anomalia dello sconto medio;
- righe che non tornano col netto → ripiego con regola scritta.
Giro: suite toccate + `percentuali`, `liquidazioni*`, `analisi*`, `bollettini*`, `valori-congelati*`,
`righe-nota-credito`, `sconto-medio`, `raggruppamento-scaglioni*`; `npx tsc --noEmit` backend e frontend.

## File ammessi
`app/backend/src/**`, `app/backend/test/**`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`,
`app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`, `app/frontend/lib/guida.ts`, `specifica-crm-provvigioni.md`
(solo la riga D-199 e il suo *Perché*), `strumenti/opencode/resoconto-raggruppamento-scaglioni.md` (aggiungi in fondo
«Correzioni 1»). Niente migrazioni nuove.

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, D-27, D-51, D-183, D-197, D-199. Codice
minimo, nessuna logica duplicata. **Ogni comando prisma/jest con `DATABASE_URL` esplicito nella stessa riga**; mai
`decobrands_db`; `.env` mai letto (URL con grep). Niente commit, porte 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill con
lo strumento `skill`: `owasp-security`, `ponytail-review`, `caveman`.

## Resoconto
In fondo a `resoconto-raggruppamento-scaglioni.md`, sezione «Correzioni 1»: rilievo → cosa è cambiato → prova. Riepilogo
in massimo 10 righe.
