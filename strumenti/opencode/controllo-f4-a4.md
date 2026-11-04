# Controllo F4-A4 — Report subagenti nelle Liquidazioni

Data: 04/11/2026. Cambio: `GET /api/liquidazione/report` e la seconda scheda del pannello
della Liquidazione. Lavoro dell'agente OpenCode, controllato nella sessione principale.

## Cosa fa la modifica

Senza `subagente` l'API restituisce l'elenco dei subagenti con quota e variazione sul trimestre
prima; con `subagente` i tre numeri con il confronto, i trimestri dell'anno già iniziati e i primi
5 clienti. La scheda mostra gli stessi numeri con un grafico, una tabella (o tre riquadri), e un
link all'Analisi con periodo e subagente. Tutto viene da `analisiTrimestre`: il browser formatta e
basta (V12).

## Esito dei controlli

| Controllo | Esito |
|---|---|
| `owasp-security` | nessun rilievo |
| `ponytail-review` (correttezza + complessità) | due rilievi, nessun difetto |
| `postgresql-code-review` | non applicabile: nessuna query o migrazione nuova |

### Sicurezza

- Rotta con `provvigioni.consulta`; la prova con l'utente dell'area Dati risponde 403 e quella in
  sola lettura 200.
- Parametri validati: `anno` 2000–2100, `trimestre` 1–4, `subagente` intero positivo; 400 fuori
  range, 404 per un subagente che non esiste, senza dire altro.
- Nessuna scrittura, nessun SQL nuovo, nessun calcolo dei soldi nel browser. I nomi li rende React
  (escape); note e testi vengono dal server come stringhe.
- Nessun dato personale nuovo: gli stessi nomi e importi già presenti nelle altre pagine.

### Correttezza e complessità

- I numeri sono quelli del prototipo: le 4 prove Jest confrontano elenco, quota, delta, numeri del
  subagente, trimestri e primi clienti con `M.analisiTrimestre` / `M.righeLiquidazione`, su tutti e
  4 i subagenti del seed.
- Il trimestre prima del 1° è il 4° dell'anno avanti; i trimestri futuri non compaiono; un
  subagente senza documenti dà zeri, non un errore (come il prototipo).
- La scheda non mostra mai il report di un altro trimestre o di un altro subagente: il confronto
  fra i due (`anno`/`trimestre`/`subagente`) è nella condizione di disegno, non solo nel caricamento.
- Nessuna dipendenza nuova: `Grafico`, `DataTable`, `KpiRow`, `Elenco`, `Schede`, `Sagoma` c'erano.

## Rilievi

**Da correggere: nessuno.**

1. *(should fix, prestazioni)* Il report fa fino a **7 passate** su tutte le pratiche (trimestre,
   precedente, i trimestri dell'anno, i clienti) con un solo `caricaDati`. Sul seed è istantaneo; a
   10.000 pratiche possono essere secondi, come l'Analisi (D-61). Lasciato un `ponytail:` nel codice
   con la via d'uscita: `analisiTrimestre` prende le righe già calcolate. Da misurare quando i dati
   crescono, con lo stesso metodo di `test/carico-analisi.ts`.
2. *(should fix, richieste)* La scheda si carica anche se non è aperta: una richiesta in più a ogni
   apertura della pagina, in cambio di un cambio scheda senza attesa. Scelta accettata.
3. *(copertura)* La prova browser (54 controlli, 0 KO) è quella dell'agente: non l'ho rilanciata
   perché richiede un seed pulito e chiude il 3° trimestre, e il mio unico tocco è un commento.
   La suite Jest l'ho rilanciata io (15/15, poi 314 in totale).

## Prove

- `npx tsc --noEmit` backend e frontend: puliti (rilanciati da me).
- `test/liquidazioni.spec.ts`: 15/15; suite del backend una spec per processo: **314 prove, 0 KO**
  (bollettino 19 e le altre passate; le due suite che Jest interrompe su Windows sono state
  rilanciate da sole).
- `npm run build` del frontend: ok (agente); schermate 1440 e 768 guardate da me
  (`schermate-f4a4/`): card 2+1, grafici impilati, nessuno scorrimento di lato.
- API: 400 fuori range, 404 subagente inesistente, 403 senza area, 200 in sola lettura.

## Verdetto

**Ship.** Resta aperto il rilievo 1 (prestazioni a 10.000 pratiche), misurato con la stessa soglia
dell'Analisi, e il rilievo 3 (prova browser da rilanciare da seed pulito al prossimo giro).

Non controllato: la resa con più di 10 subagenti (il seed ne ha 4) e il comportamento con un
trimestre futuro aperto a mano nell'indirizzo.
