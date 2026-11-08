# A2 — Calcoli e soldi (collaudo finale)

- **Skill caricate**: `javascript-typescript-jest`, `nestjs-best-practices` (strumento Skill); metodo di code review per
  correttezza (casi limite, arrotondamenti, date, trimestri, segni, Decimal).
- **Prove lanciate**: nessuna (regola: `npm test` e Playwright solo A6). Analisi statica di `motore/motore.ts`,
  `motore/dati.ts`, `liquidazioni.ts`, `bollettini.ts`, `bollettino.ts`, `incassi.ts`, `analisi.ts`,
  `esporta-liquidazione.ts`, `csv.ts`, `oggi.ts`, `pratiche.ts`, `pratiche-ricalcola.ts`, confrontati con
  `prototipo-alternativo/assets/motore.js` e la spec (V12, V13, D-11, D-19, D-27, D-35, D-51, D-57, D-87).
- **Esito sintetico**: le formule del motore ricalcano il prototipo (scaglione per soglia e data, eccezione datata,
  quotaSub D-27, riconciliazione, statoIncasso, righeLiquidazione, analisiTrimestre, fattiAnalisi); importi in
  `Prisma.Decimal`, `r2` = ROUND_HALF_UP (D-49); totali e ordinamenti su tutto l'elenco (SQL in Pratiche, elenco
  completo in Analisi/Liquidazioni). **V12 rispettato**: nessun DTO accetta importi/percentuali/totali calcolati
  (solo valori digitati: importo del documento, valore della correzione, % e sconto dell'agenzia).
  I problemi veri stanno dove i dati di base cambiano **dopo** che un periodo è chiuso.
- **Non controllato**: numeri sul seed §12 contro il prototipo (lo fanno `motore.spec.ts`/`seed.spec.ts`, A6);
  creazione delle righe del bollettino (nel codice non c'è ancora: arrivano solo dal seed, area A4);
  prestazioni (A7); lock e transazioni oltre a quanto serve ai soldi (A3).

---

### A2-01 — Agenzia modificabile o eliminabile nel periodo chiuso: storni sbagliati o persi
- Gravità: P0
- Dove: app/backend/src/clienti.ts:179-356 (`creaAgenzia`, `modificaAgenzia`, `eliminaAgenzia`); effetto in
  app/backend/src/motore/motore.ts:359-369 (storni in `righeLiquidazione`) e :113 (`percentuali`)
- Problema: scaglioni ed eccezioni hanno il blocco D-51 (`dopoChiusura`/`ultimaChiusura`), l'agenzia (`interscambio`:
  subagente, sconto, % dell'agenzia, regola mensile, date) no; il motore ricalcola tutto con l'agenzia attuale, quindi
  un cambio "in place" sposta le provvigioni passate, contro D-35 ("un cambio di subagente non deve spostare le
  provvigioni passate").
- Scenario: agenzia C×Gries, Rossi, sconto 5, dal 01/01/2026. Fattura F 10.000 € del 15/02/2026, quota 3 % → Rossi
  300 € liquidati nel 1° trim. (chiuso). Ad agosto un utente con `dati.modifica` corregge l'agenzia mettendo Bianchi
  (PUT, stesso periodo). Il bollettino di luglio (chiuso il 10/08) storna F → nel 3° trim. la voce è **−300 € a
  Bianchi** e Rossi tiene 300 €. Se invece l'agenzia viene **eliminata**, `percentuali` dà null e la voce di storno
  viene saltata (`continue` a :367): **nessuno storno**, Rossi tiene 300 € di una fattura non pagata. Cambia anche
  l'Analisi di febbraio (contro D-19, numeri stabili) e i documenti sul maturato non ancora riconosciuti.
- Correzione puntuale:
  1. clienti.ts, nelle tre rotte: dentro la transazione bloccare il fornitore (`SELECT id FROM fornitori WHERE id = … FOR UPDATE`,
     ordine D-51), leggere `c = ultimaChiusura(tx, fornitore_id)`; con `c` valorizzato rifiutare con 409 se
     (create) `valido_dal <= c`; (update) l'agenzia ha `valido_dal <= c` e cambia uno fra `subagente_id`,
     `fornitore_id`, `sconto`, `pct_subagente`, `regola_mensile`, `valido_dal`, oppure il nuovo `valido_al <= c`;
     (delete) `valido_dal <= c`. Messaggio come fornitori.ts:131 ("chiudi l'agenzia e creane una nuova da una data
     successiva"). Per update che cambia `fornitore_id` controllare la chiusura di entrambi i fornitori.
  2. motore.ts storni (:366-368): se il documento ha `liquidazione_id`, usare per la voce **subagente e provvigione
     della fotografia** di quella liquidazione (`liquidazioni.totali.documenti`, già salvati) col segno della voce,
     non `quotaSub` ricalcolato; serve caricare in dati.ts (`componi`) una mappa `documento_id → {subagente_id,
     provvigione, pct, importo}` dalle fotografie. Copre anche A2-02.
- Prova che la verifica: app/backend/test/clienti.spec.ts nuovo caso "agenzia nel periodo chiuso: modifica, fine e
  eliminazione 409, nuova da dopo la chiusura 201"; app/backend/test/liquidazioni.spec.ts nuovo caso "storno di una
  fattura liquidata: voce = −provvigione della fotografia, allo stesso subagente, anche se l'agenzia è cambiata".
- Esecutore: DeepSeek V4 — soldi, più file, lock
- File toccati: app/backend/src/clienti.ts, app/backend/src/motore/motore.ts, app/backend/src/motore/dati.ts,
  app/backend/test/clienti.spec.ts, app/backend/test/liquidazioni.spec.ts, specifica-crm-provvigioni.md (§19 nuova D-nn, §4.2.6 *Perché*), app/frontend/lib/guida.ts (Clienti › agenzie)
- Dipende da / correlato a: A2-02; D-35, D-51, D-11, D-57; eventuale rilievo A3 sul lock

### A2-02 — "Una fattura al mese": fattura arrivata tardi in un mese già liquidato fa pagare due volte
- Gravità: P0
- Dove: app/backend/src/motore/motore.ts:149-156 (`fatturaDelMese`) e :170-175 (`quotaSub`)
- Problema: la scelta della fattura del mese si ricalcola su tutte le fatture presenti; se dopo la chiusura arriva una
  fattura dello stesso mese che vince la regola, il motore paga anche quella (D-57 la porta nel trimestre aperto),
  mentre quella già pagata resta pagata. In più, uno storno successivo della prima fattura vale 0 (ora è "mensile").
- Scenario: agenzia con `regola_mensile = 'piu_alta'`, quota 5 %. F1 1.000 € del 10/03/2026 → 50 € liquidati nel
  1° trim. (chiuso). A maggio si registra G 2.000 € del 20/03/2026 (fattura arrivata tardi). G non è legata → va nel
  2° trim. con quota 100 € (è la più alta di marzo). Totale pagato per marzo **150 €** invece di 100 €. Se poi il
  bollettino storna F1, la voce vale **0 €** (quotaSub(F1) = 'mensile' 0) invece di −50 €. Con `'prima'` uguale
  quando la fattura tardiva ha data precedente a F1.
- Correzione puntuale: in `fatturaDelMese`, se fra le fatture del mese ce n'è una con `liquidazione_id` (già pagata),
  scegliere quella (la più vecchia per `liquidazione_id`) prima di applicare `prima`/`piu_alta`: il mese è già
  "consumato". Lo storno usa la fotografia (punto 2 di A2-01).
- Prova che la verifica: app/backend/test/motore.spec.ts nuovo caso "una fattura al mese: fattura tardiva nel mese già
  liquidato → quota 0, la liquidata resta la scelta; storno della liquidata = −50".
- Esecutore: DeepSeek V4 — regola delle provvigioni
- File toccati: app/backend/src/motore/motore.ts, app/backend/test/motore.spec.ts, specifica-crm-provvigioni.md (§5.2 *Perché*, §19)
- Dipende da / correlato a: A2-01; D-27, D-57

### A2-03 — Correzione a importo fisso su una nota di credito: la provvigione diventa positiva
- Gravità: P1
- Dove: app/backend/src/motore/motore.ts:167 (`quotaSub`, ramo `cor.tipo === 'importo'`); app/backend/src/documenti.ts:1192 (accetta solo importi > 0)
- Problema: il valore della correzione è sempre positivo e il motore lo usa così com'è, anche quando il documento è
  una nota di credito (importo negativo).
- Scenario: NC −200 € (quota standard 3 % = −6 €). L'utente mette "importo fisso 10 €" per ridurre di 10 € al
  subagente → la liquidazione gli **dà +10 €** (pct mostrata −5 %). Atteso −10 €.
- Correzione puntuale: in `quotaSub` per `tipo === 'importo'`: `const v = imp.isNegative() ? cor.valore.neg() : cor.valore;`
  e usare `v` per `provvigione` e per `pct`. Allineare il prototipo (`M.quotaSub`).
- Prova che la verifica: app/backend/test/correzione.spec.ts nuovo caso "importo fisso su nota di credito → provvigione negativa".
- Esecutore: DeepSeek V4 Flash — una riga, logica già chiara
- File toccati: app/backend/src/motore/motore.ts, prototipo-alternativo/assets/motore.js, app/backend/test/correzione.spec.ts
- Dipende da / correlato a: D-27

### A2-04 — Fattura con data fuori dall'agenzia: provvigione a 0 in silenzio (D-87 solo sull'ordine)
- Gravità: P1
- Dove: app/backend/src/documenti.ts:1088-1098 (`nuovaPratica`: controllo agenzia/scaglione alla data dell'**ordine**);
  nessun controllo alla registrazione di fattura/nota (`importoValido` :782); effetto motore.ts:340, :367 (`if (!percentuali) continue`)
- Problema: il motore calcola alla data del documento fiscale (D-35); se a quella data non c'è agenzia o scaglione,
  la fattura sparisce da liquidazione e Analisi e nel bollettino risulta "noi 0 %". D-87 vieta proprio lo 0 % in silenzio.
- Scenario: ordine del 20/06/2026, agenzia valida fino al 01/07/2026 (esclusa), nessuna agenzia dopo. Fattura 5.000 €
  del 10/07/2026: nessuna riga in liquidazione, nessun fatto in Analisi, nel bollettino di luglio "noi 0,00 €" →
  differenza da accettare a mano.
- Correzione puntuale: nella registrazione (e modifica di data) di `fattura`/`nota_credito` in documenti.ts, stessi due
  controlli di :1088-1098 alla data del documento (agenzia valida e scaglione con `sconto_min <= sconto` e
  `valido_dal <= data`); 409 con il testo D-87 ("aggiungi l'agenzia in Clienti / configura lo scaglione").
- Prova che la verifica: app/backend/test/documenti-pratica.spec.ts nuovo caso "fattura dopo la fine dell'agenzia → 409".
- Esecutore: DeepSeek V4 — regola D-87 su più rotte
- File toccati: app/backend/src/documenti.ts, app/backend/test/documenti-pratica.spec.ts
- Dipende da / correlato a: D-87, D-35; eventuale rilievo A4 su D-87

### A2-05 — Storno su riga senza `documento_id`: per numero prende il documento di un altro anno
- Gravità: P2
- Dove: app/backend/src/motore/motore.ts:139-146 (`trovaDocumento`), :196, :212; app/backend/src/motore/dati.ts:141
- Problema: per le righe non abbinate il documento si cerca per numero nel fornitore e vince la pratica con id più
  basso; D-34 dice che il fornitore può riusare il numero in un altro anno. La riga ha `data` (`fattura_data`) ma non si usa.
  Alla chiusura del bollettino (bollettino.ts:283) l'abbinamento sbagliato viene **congelato** per id.
- Scenario: Gries riusa "F12": F12 del 05/03/2026 (cliente A, Rossi) e F12 del 04/03/2027 (cliente B, Bianchi).
  Bollettino di luglio 2027 con storno "F12" senza `documento_id` → abbinato alla F12/2026 → −quota a Rossi su un
  cliente che ha pagato; Bianchi non viene stornato.
- Correzione puntuale: `trovaDocumento(S, numero, fornitore_id, data?)`: fra i documenti con quel numero preferire
  quello con `d.data === data`; senza data, il più recente con data ≤ fine del mese del bollettino. Passare `r.data`
  da `documentoDiRiga` e `riconcilia`.
- Prova che la verifica: app/backend/test/motore.spec.ts nuovo caso "numero riusato in due anni: lo storno va sul documento con la stessa data".
- Esecutore: DeepSeek V4 Flash — una funzione
- File toccati: app/backend/src/motore/motore.ts, app/backend/test/motore.spec.ts
- Dipende da / correlato a: D-34; A4 (creazione righe del bollettino)

### A2-06 — Nota di credito sul maturato: segnata "in attesa di incasso" e mai sottratta al subagente
- Gravità: P2
- Dove: app/backend/src/motore/motore.ts:342-353 (`righeLiquidazione`, ramo maturato)
- Problema: sul maturato un documento entra solo se riconosciuto in un bollettino verificato; una nota di credito che
  il fornitore non elenca (spesso riduce la fattura direttamente) resta per sempre non liquidabile con motivo
  `attesa_incasso` (etichetta "In attesa di incasso: … quando il cliente paga", falsa per una NC). Incoerente con
  `riconcilia`, dove la stessa NC assente è "mancante" (solo le fatture diventano `attesa_incasso`, :252).
- Scenario: fornitore maturato, F 1.000 € (febbraio) e NC −200 € (febbraio) sulla stessa fattura; il bollettino di
  marzo riconosce F (a 1.000) → subagente 50 €; la NC non compare mai → il subagente non riceve mai −10 €. Totale pagato
  50 € invece di 40 €.
- Correzione puntuale: decisione di regola (vedi *Da decidere*); se la NC segue la sua fattura, in `righeLiquidazione`
  per `d.tipo === 'nota_credito'` sul maturato usare `riconosciutoIn` della fattura `d.fattura_id`; e motivo
  `attesa_incasso` solo per `d.tipo === 'fattura'`.
- Prova che la verifica: app/backend/test/motore.spec.ts nuovo caso "maturato: NC entra con la sua fattura riconosciuta".
- Esecutore: DeepSeek V4 — regola delle provvigioni
- File toccati: app/backend/src/motore/motore.ts, prototipo-alternativo/assets/motore.js, app/backend/test/motore.spec.ts
- Dipende da / correlato a: §5.14, D-11 — da decidere prima

### A2-07 — Report subagenti di un trimestre chiuso ricalcolato, non dalla fotografia
- Gravità: P2
- Dove: app/backend/src/liquidazioni.ts:190-250 (`reportSubagenti` → `analisiTrimestre`)
- Problema: la pagina Liquidazioni di un trimestre chiuso legge la fotografia (D-33), il Report subagenti dello stesso
  trimestre ricalcola dal motore: appena i dati di base cambiano (vedi A2-01, A2-02) i due numeri divergono, e la
  rotta dichiara "stessi numeri della liquidazione".
- Scenario: 1° trim. chiuso con Rossi 300 €; dopo la modifica dell'agenzia di A2-01 il Report del 1° trim. mostra 0 € a
  Rossi e 300 € a Bianchi, la Liquidazione chiusa 300 € a Rossi.
- Correzione puntuale: per un trimestre con riga in `liquidazioni`, costruire le righe da `totali.documenti` della
  fotografia (stessa forma di `righeLiquidazione`, importi da testo a Decimal) e passarle ad `analisiTrimestre`
  (farle accettare righe già pronte come parametro facoltativo).
- Prova che la verifica: app/backend/test/liquidazioni.spec.ts nuovo caso "report di un trimestre chiuso = fotografia anche dopo un cambio dei dati".
- Esecutore: DeepSeek V4 — soldi, due funzioni
- File toccati: app/backend/src/liquidazioni.ts, app/backend/src/motore/motore.ts, app/backend/test/liquidazioni.spec.ts
- Dipende da / correlato a: A2-01, A2-02; D-33, D-18

### A2-08 — Importo riga calcolato con ROUND_HALF_CEIL invece del contabile (D-49)
- Gravità: P3
- Dove: app/backend/src/motore/dati.ts:27
- Problema: riga senza `importo`: `qta × prezzo` arrotondato HALF_CEIL; sui negativi (resi) −0,005 → 0,00, contro D-49
  (−0,01). Tocca solo il confronto delle righe e la variazione della pratica, non le provvigioni.
- Scenario: riga di reso qta −1, prezzo 0,005 → importo 0,00 invece di −0,01; variazione della pratica sbagliata di 1 cent.
- Correzione puntuale: sostituire con `r2(qta.times(prezzo))` (importare `r2` da motore.ts) o `Dec.ROUND_HALF_UP`.
- Prova che la verifica: app/backend/test/motore.spec.ts caso piccolo su `praticaDaDb` con riga negativa.
- Esecutore: DeepSeek V4 Flash — una riga
- File toccati: app/backend/src/motore/dati.ts, app/backend/test/motore.spec.ts
- Dipende da / correlato a: D-49

### A2-09 — Totali dell'esportazione sommati in virgola mobile
- Gravità: P3
- Dove: app/backend/src/esporta-liquidazione.ts:53 (`somma`), :160-163, :389; app/backend/src/bollettino.ts:164 (totale della contestazione)
- Problema: somme di `Number` poi `r2`; i valori sono già al centesimo e l'errore resta sotto il centesimo, ma la regola
  del motore è Decimal ovunque e i totali chiusi esistono già in `foto.totale`.
- Scenario: nessun errore visibile con i volumi attesi; con decine di migliaia di righe l'errore si accumula (1e-9 per somma).
- Correzione puntuale: `somma` con `Prisma.Decimal` (`rr.reduce((s,x)=>s.plus(x[k]), new Dec(0))`), stesso per la contestazione.
- Prova che la verifica: liquidazioni.spec.ts esistente "Excel completo: … totali uguali alla pagina".
- Esecutore: DeepSeek V4 Flash — locale
- File toccati: app/backend/src/esporta-liquidazione.ts, app/backend/src/bollettino.ts
- Dipende da / correlato a: V12

---

## Da decidere (Ugo)

1. **Nota di credito sul maturato (A2-06)**: segue la fattura (entra quando la fattura è riconosciuta) o aspetta di
   comparire nel bollettino? Il prototipo ha lo stesso comportamento dell'app (resta "in attesa di incasso" per sempre).
   §5.14 non lo dice.
2. **Bollettino contestato senza bollettino rettificato** (D-56 "nessuna riapertura" + UNIQUE fornitore×mese in
   `bollettini_testata`): l'azione dice "in attesa del bollettino rettificato", ma un secondo bollettino dello stesso mese
   non si può caricare (bollettini.ts:155-158, 409). Le correzioni del fornitore su quel mese non hanno dove entrare
   (né nel mese dopo come righe di rettifica, regola non scritta). Serve una regola: rettifica nel mese successivo o
   sostituzione del contestato.
3. **Agenzie e periodo chiuso (A2-01)**: estendere D-51 alle agenzie è la correzione proposta; va registrata come nuova
   D-nn (riguarda anche D-35).
4. **Report subagenti vs liquidazione** (A2-07): `pagate` del report comprende anche i documenti in attesa dei
   bollettini (come il prototipo, `analisiTrimestre`), la liquidazione no: confermare che il report debba mostrare
   la provvigione "generata" e non quella "da liquidare", e scriverlo nella guida.
