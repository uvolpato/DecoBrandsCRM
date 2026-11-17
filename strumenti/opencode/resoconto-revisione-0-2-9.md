# Resoconto — `revisione-0-2-9` (sola lettura)

Revisione delle modifiche non committate dei pacchetti `raggruppamento-scaglioni` (+ correzioni-1)
e `scaglioni-esatti`. Codice sensibile: motore delle provvigioni, liquidazioni, bollettini,
migrazioni, endpoint con permessi. Skill caricate: `owasp-security`, `postgresql-code-review`,
`ponytail-review`, `caveman`.

## Da correggere prima del rilascio

### 1. GRAVE — `percentuali` null in modalità riga + scaglioni esatti: documenti validi esclusi da Riepilogo, liquidazione e Analisi

Il motore `percentuali()` (`motore.ts:217-234`) sceglie lo scaglione dallo **sconto medio** e torna
`null` quando non c'è una soglia. In modalità `riga` lo sconto medio non deve comandare, ma tre punti
usano ancora `percentuali()` come cancello:

- `pratiche.ts:403` `const bicchiere = percentuali(...)` e `pratiche.ts:425` `provvigione = bicchiere ? … : null` → con `bicchiere` null l'intero pannello Provvigione del Riepilogo sparisce;
- `motore.ts:705` `if (!percentuali(S, p, d.data)) continue;` → il documento è scartato da liquidazione e Analisi;
- `motore.ts:682` `const perc = percentuali(S, p, d.data)!;` → `subagente_id` letto da lì.

**Scenario concreto** (dati del test `scaglioni-esatti.spec.ts`, non coperto in liquidazione):
fornitore con `scaglioni_esatti=true` e `raggruppamento='riga'`, soglie 0/1/5/10, fattura con righe
0 % (600) + 10 % (900). Sconto medio 6,25 % → nessuna soglia esatta → `percentuali` null; ma i gruppi
0 % e 10 % hanno entrambi la soglia esatta, `anomaliaGruppo` è null (nessuna anomalia). Risultato: il
subagente non viene pagato in liquidazione, l'Analisi perde il documento e il Riepilogo non mostra la
provvigione, **senza alcuna anomalia a segnalarlo**. In modalità fascia il caso non si presenta (lo
sconto medio è sempre fra il minimo e il massimo dei gruppi, quindi dentro le soglie quando i gruppi lo
sono), ma in modo esatto sì.

**Correzione**: in modalità riga non passare da `percentuali`: `subagente_id` da `abbinamento`, il
cancello di liquidazione da `quotaSub`/`provvigioneDocumento` (che in riga delegano a `provvigioneRiga`),
e il Riepilogo non deve annullarsi quando `bicchiere` è null ma i gruppi sono validi.

**Prova**: estendere `scaglioni-esatti` con `righeLiquidazione` e `dettaglioPratica` sul dato
0 % (600) + 10 % (900) in esatti+riga: oggi restituiscono provvigione assente, deve dare 225 €
(600×15 % + 900×15 %).

### 2. GRAVE — D-197 ancora applicato in liquidazione in modalità riga

`motore.ts:687` `const diff = differenzaNotaCongelata(S, p, d); const prov = diff ? diff.subagente : q.provvigione;`.
La spec D-199 dice che in modalità riga il calcolo è lineare e la coppia fattura+nota di D-197 «non
serve»; `calcoloDocumento` (riga) e `riconcilia` (via `provvigioneDocumento`) rispettano la regola, ma
`righeLiquidazione` no.

**Scenario**: fornitore `riga`, nota di credito su fattura congelata, sconto medio dentro gli scaglioni
(`percentuali` non null) → `differenzaNotaCongelata` torna non null e il subagente viene pagato con la
differenza D-197 (base coppia × pct dello sconto medio − fissato) invece della somma lineare dei gruppi.
Incoerente con riconcilia e con il `calcolo` salvato.

**Correzione**: in modalità riga saltare `differenzaNotaCongelata` in `righeLiquidazione` (allinearsi a
`calcoloDocumento` e `riconcilia`).

**Prova**: nota su fattura congelata in modalità riga → `righeLiquidazione` deve dare il valore lineare
dei gruppi, uguale a quello di `quotaSub`/`calcoloDocumento`.

## Migliorie

### 3. Anomalia non aggiornata al cambio di raggruppamento / scaglioni_esatti

`derogaRaggruppamento` (`pratiche.ts`) e `modifica` del fornitore (`fornitori.ts`) ricalcolano gli
aperti ma non chiamano `aggiornaAnomalieProvvigione`: un cambio di raggruppamento o di `scaglioni_esatti`
che introduce/rimuove un'anomalia non si riflette nel registro anomalie finché non arriva un'altra
modifica. La chiusura resta correttamente bloccata (usa `anomaliaProvvigione` dal vivo), quindi non è un
rischio soldi, ma l'elenco anomalie è incoerente.

### 4. Logica della precedenza duplicata (complessità)

`provvigioneRiga` (`motore.ts:420-436`) ricopia la precedenza correzione → mensile → % agenzia di
`quotaSub` (`motore.ts:289-306`). Due copie possono divergere. Estrarre una funzione condivisa che
restituisca la regola piatta `{pct, provvigione}` e riusarla in entrambi.

### 5. Doppio calcolo di `provvigioneRiga`

`calcoloDocumento` (`motore.ts:469`) calcola `quotaSub(S, p, d, base)` che in modalità riga esegue
`provvigioneRiga` per intero (gruppi compresi) e scarta il risultato, poi lo ricalcola a `motore.ts:498`.

### 6. Messaggi di chiusura non aggiornati

`bollettino.ts:290` e `liquidazioni.ts:57` dicono ancora «sconto medio oltre l'ultimo scaglione» anche
quando l'anomalia è di gruppo o «senza scaglione esatto». Cosmetico, ma fuorviante per l'operatore.

### 7. Riepilogo: ancora `anomaliaScontoMedio` e percentuali singole

`pratiche.ts:410` usa `anomaliaScontoMedio` (non `anomaliaProvvigione`): in modalità riga segnala
l'anomalia dello sconto medio che non comanda. `pratiche.ts:444` `margine_pct` resta sulla pct dello
sconto medio (già segnalato come aperto nel resoconto di `scaglioni-esatti`). In più, in modalità riga
`quotaSub` torna `regola:'riga'`, quindi `righeLiquidazione` imposta `eccezione:false` anche quando un
gruppo usa un'eccezione personale.

### 8. Motivo della deroga letto dal registro

`pratiche.ts` (GET dettaglio) ricava `raggruppamento_motivo` dall'ultimo evento `crud.update` sulla
pratica. Funziona solo perché l'unico `crud.update` sull'entità `pratica` è la deroga; fragile se in
futuro altri endpoint useranno lo stesso codice. Valutare una colonna dedicata o un dettaglio esplicito.

## Verifiche positive

- Migrazioni additive, CHECK corretti, predefiniti invariati, nessun lock lungo (ADD COLUMN con default
  costante). Coerenti con `schema.prisma`.
- Endpoint deroga (`PUT /pratiche/:id/raggruppamento`): `@Richiede('provvigioni.modifica')` (stesso
  permesso della correzione `documenti.ts:1981`), validazione `@IsIn`, motivo obbligatorio e `trim`,
  V12 rispettata (solo `raggruppamento` + motivo dal browser), transazione unica con `FOR UPDATE`,
  evento nel registro, ricalcolo aperti, congelati non toccati (V13/D-183). Corretto.
- Fornitore: `raggruppamento`/`scaglioni_esatti` validati lato server, evento e ricalcolo aperti in
  transazione. Corretto.
- Modalità `documento`: numeri invariati al centesimo (suite esistenti senza ritocchi ai valori).
- Congelati: `provvigioneDocumento`/`quotaSub` leggono il `calcolo` salvato. Corretto.

## Correzioni 2

### 1. GRAVE — `percentuali` non fa più da cancello in modalità riga

`righeLiquidazione` non passa più da `percentuali`: `subagente_id`/`codice_cliente` vengono
dall'`abbinamento`, il cancello da `quotaSub`. Il Riepilogo (`dettaglioPratica`) non si annulla più
quando `percentuali` è null ma i gruppi sono validi: in riga le percentuali «singole» (agente, sub,
margine) sono quelle effettive (somma dei gruppi ÷ base). Il frontend mostra «per sconto di riga»
invece di «sconto medio → scaglione», e l'avviso d'anomalia distingue gruppo e sconto medio (con e
senza scaglione esatto). `fattiAnalisi`/`analisiTrimestre` erano già a posto (passano da
`provvigioneDoc`/`righeLiquidazione`).

Prova: `scaglioni-esatti.spec.ts` «esatti + riga: 0 % (600) + 10 % (900) → 225 € in documento,
Riepilogo, liquidazione e Analisi, nessuna anomalia».

### 2. GRAVE — niente `differenzaNotaCongelata` in modalità riga

In `righeLiquidazione` la differenza della coppia D-197 vale solo in modalità documento; in riga il
valore è lineare, come `calcoloDocumento` e `riconcilia`.

Prova: `raggruppamento-scaglioni.spec.ts` «rilievo 2: nota su fattura congelata in modalità riga →
lineare (niente differenza D-197)» (liquidazione = quotaSub = calcolo = −24).

### 3. Anomalie aggiornate al cambio di raggruppamento / scaglioni_esatti

`derogaRaggruppamento` chiama `aggiornaAnomalieProvvigione` e `modifica` del fornitore chiama
`aggiornaAnomalieFornitore`, nella stessa transazione (V13).

Prova: `raggruppamento-scaglioni-db.spec.ts` «rilievo 3» (una deroga che crea un'anomalia di gruppo
apre subito `provvigione.gruppo_scaglione` e la chiude tornando come il fornitore) e «un'anomalia di
sconto medio (servizio provvigioni) si apre nel registro senza errori».

### 4 + 5. Precedenza in un punto solo, niente doppio calcolo

Estratta `regolaPiatta` (correzione → mensile → % agenzia) riusata da `quotaSub` e `provvigioneRiga`;
`calcoloDocumento` calcola `provvigioneRiga` una sola volta.

Prova: suite esistenti (motore, percentuali, righe-nota-credito, raggruppamento-scaglioni) a 0 KO
senza ritocchi ai valori.

### 6. Messaggi di chiusura dal tipo di anomalia vero

`descrizioneAnomalia` (sconto medio / gruppo oltre l'ultimo / senza scaglione esatto) usata in
`bollettino.ts` e `liquidazioni.ts`.

Prova: `sconto-medio.spec.ts` (regex `/sconto medio oltre/`) passa invariata.

### 7. Riepilogo: `anomaliaProvvigione`, `margine_pct` effettivo, `eccezione` di gruppo

`dettaglioPratica` usa `anomaliaProvvigione`; `margine_pct` dalla provvigione effettiva. `quotaSub` e
`provvigioneRiga` portano `eccezione` (vero anche quando un gruppo usa un'eccezione personale), usato
da `righeLiquidazione`.

Prova: `raggruppamento-scaglioni.spec.ts` «rilievo 7: un gruppo con eccezione personale → il segno
eccezione in liquidazione è vero».

### 8. Motivo della deroga dal campo esplicito

L'evento deroga scrive `campo: 'raggruppamento'` nel dettaglio; la lettura filtra
`dettaglio.path = ['campo']`, non l'ultimo `crud.update`.

Prova: `raggruppamento-scaglioni-db.spec.ts` «rilievo 8» (un `crud.update` più recente senza `campo`
non confonde la lettura).

## Da documentare

- **CHECK `registro_servizio_check` — migrazione `20261117090000_registro_servizio_provvigioni`**:
  il vincolo non ammetteva `provvigioni`, quindi `apriAnomalia` con `servizio: 'provvigioni'`
  (`provvigione.sconto_medio` e `provvigione.gruppo_scaglione`, D-182/D-199/D-200) falliva con
  P2010/23514: nessuna anomalia di provvigione poteva essere aperta. Bug presente già dalla 0.2.7
  (anche `provvigione.sconto_medio` usa `servizio: 'provvigioni'`). La migrazione fa DROP + ADD
  CONSTRAINT con i valori di oggi + `provvigioni`. Niente cambi in `schema.prisma` (il CHECK sta solo
  nella migrazione; la colonna `servizio` non ha enum né commento da allineare).
