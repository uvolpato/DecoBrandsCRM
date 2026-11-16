# Pacchetto `valori-congelati` (spese, base della provvigione, valori fissati sul documento)

## Decisioni di Ugo (15/11/2026)
1. Le **spese** in fattura (trasporto, imballo, «Fracht», «Verpackung und Versand», porto) di norma **non** entrano
   nella base della provvigione, ma dipende dall'accordo **col fornitore**: parametro sull'anagrafica del fornitore
   «Spese nella base della provvigione: sì/no», **predefinito no**, **non datato** (evento di modifica nel registro).
2. **Ogni documento fiscale** (fattura, nota di credito) ha i suoi **valori calcolati salvati**: base della
   provvigione, spese escluse, sconto medio, scaglione, percentuali Decobrands e subagente, provvigione Decobrands e
   subagente, **versione della regola** usata. Li calcola e li salva **solo il server** (V12).
3. **Documento aperto** (non in un bollettino chiuso/verificato, non in una liquidazione chiusa, pratica non chiusa):
   i valori si ricalcolano quando cambia qualcosa (documento corretto, righe, parametri del fornitore/agenzia,
   scaglioni, percentuali).
4. **Congelamento**: quando il documento entra in un bollettino chiuso/verificato o in una liquidazione chiusa, o la
   pratica si chiude, i valori si **fissano** nella stessa transazione della chiusura (V13, `SELECT … FOR UPDATE`) e
   **non cambiano più**, anche se cambiano i parametri. Correzioni solo con documenti di rettifica (nota di credito,
   storno nella liquidazione successiva, D-11), mai modificando i valori.
5. **La pratica non salva valori suoi**: i suoi numeri sono la somma dei documenti (congelati o no).
6. **Nessun controllo notturno.** Il «da dove viene» del numero sta salvato sul documento (punto 2).
7. Chi cambierà il calcolo in futuro: prova a vuoto sui soli documenti aperti; i congelati non si toccano.

Leggi prima: `resoconto-sconto-medio.md` (sconto medio, scaglione, punto unico `percentuali()` in `motore.ts`,
anomalia oltre l'ultimo scaglione, comando `sconto-medio-ricalcola.ts`), `resoconto-riga-codice-testo.md` (righe con
`spesa: true`), `fotografiaLiquidazione` (fotografia delle liquidazioni chiuse: riusa lo schema se adatto, **non** un
secondo meccanismo uguale).

## Compito
1. **Schema** (`prisma/schema.prisma` + migrazione **scritta, non applicata**): parametro del fornitore (dove stanno i
   parametri CRM del fornitore, non le viste di Integra); valori calcolati sul documento fiscale (colonne o un JSON con
   schema chiaro, decidi e motiva; con `congelato_il`).
2. **Punto unico di calcolo** del documento (riusa `percentuali()`): base = netto − righe di spesa se il fornitore è
   «no»; sconto medio **solo sulle righe di merce** (righe di spesa fuori da lordo e netto); scaglione; provvigioni.
   Tutte le letture (pratica, Oggi, bollettini, riconciliazione, liquidazioni, Analisi, esportazioni) usano i **valori
   salvati** del documento; il ricalcolo avviene solo sugli aperti, nel punto unico, alle modifiche.
3. **Congelamento** nelle operazioni di chiusura esistenti (bollettino verificato/chiuso, liquidazione chiusa,
   pratica chiusa); un tentativo di ricalcolo o modifica su un documento congelato → rifiutato dal server.
4. **Righe di spesa** segnabili a mano nella correzione del documento (casella compatta «Spesa» nella tabella Righe
   di `VistaDocumento.tsx`), con il segno tenue «spesa» sulle righe; salvataggio come gli altri campi corretti.
5. **Parametro del fornitore** in `VistaFornitori.tsx` (casella con spiegazione breve), permessi esistenti (V12), evento
   nel registro (D-31).
6. **Visualizzazione sobria del netto base**:
   - pratica: riga «Base provvigione 876,28 €» accanto alla provvigione; solo se diversa dal netto, sotto in tenue
     «netto 963,78 € − spese 87,50 € (escluse per accordo col fornitore)»; vicino «sconto medio → scaglione»;
     sui documenti congelati un piccolo segno «fissato il <data>» (tenue, con `title` che spiega);
   - Liquidazioni/Bollettini/Analisi/esportazioni: la colonna dell'importo su cui si calcola si chiama
     «Base provvigione» (rinomina quella esistente se è quella; niente colonne in più).
7. **Comando di servizio** (estendi `sconto-medio-ricalcola.ts` o uno nuovo nella stessa forma), con `--prova`:
   - documenti già in bollettini chiusi / liquidazioni chiuse / pratiche chiuse: valori salvati e **congelati** con
     le regole **con cui sono stati chiusi** (cioè il calcolo di prima di sconto-medio e spese: `interscambio.sconto`,
     spese comprese) — verifica che coincidano con la fotografia della liquidazione dove c'è;
   - documenti aperti: valori calcolati con le regole nuove;
   - stampa prima/dopo per pratica e documento (base, sconto medio, scaglione, provvigioni). **Non lanciarlo su
     `decobrands_db`**: scrivi il comando nel resoconto.
8. **Guida** (`app/frontend/lib/guida.ts`): nella sezione «Come si sceglie la percentuale» aggiungi «Su quale importo
   si calcola» (netto, spese escluse salvo accordo col fornitore, esempio PR102829: 963,78 − 87,50 = 876,28) e
   «Quando i numeri si fissano» (aperto → si ricalcola; chiuso → fissato, si corregge solo con rettifiche). Pagina
   Fornitori: il parametro. Italiano semplice, niente nomi di campi.

## Prove (jest, suite completa 0 KO)
- fornitore «no»: fattura con riga Fracht 87,50 → base = netto − 87,50; sconto medio senza la riga di spesa;
- fornitore «sì»: base = netto;
- riga segnata spesa a mano → valori aggiornati (documento aperto);
- documento congelato + cambio parametro/scaglione/percentuale → valori invariati; aperto → ricalcolati;
- modifica di un documento congelato dal server → rifiutata;
- pratica = somma dei documenti;
- seed: nessuna riga di spesa → numeri del prototipo invariati;
- comando `--prova` non scrive; senza `--prova` scrive una volta (rilanciato non cambia nulla);
- solo chi ha il permesso cambia il parametro (403 altrimenti).

## File ammessi
backend: `motore/*`, `pratiche.ts`, `fornitori.ts`, `documenti.ts`, `proposta.ts`, `bollettin*`, `liquidazioni*`,
`analisi*`, `oggi.ts`, esportazioni, comando di servizio, `prisma/schema.prisma` + nuova migrazione, seed, test;
frontend: `VistaPratica.tsx`, `VistaDocumento.tsx`, `VistaFornitori.tsx`, viste di Liquidazioni/Bollettini/Analisi
(solo il nome della colonna), `lib/guida.ts`, `stile.css` (aggiunte in fondo). **Non toccare** `lettura.ts`,
`lettore.ts`, `lettura-prova.ts` (pacchetto `riga-codice-testo-prova-vera`), `FilterBar.tsx`. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, D-11, D-31, rimandi `// D-nn §19`.
URL del db **solo con grep**, `.env` mai letto con readFileSync o cat. Prove su `decobrands_test_congelati` (creato e
cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill da caricare davvero: `owasp-security`,
`ponytail-review`, `postgresql-code-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-valori-congelati.md`: schema scelto e perché, migrazione, punto unico, dove si congela,
visualizzazione, prove, **comando da lanciare** con numeri attesi (OF/2026/002, PR102829/AU276950), documenti che
cambiano, dubbi, «Da documentare» (spec §5.3, §4.2.7.1, §19 con il perché: integrità dei numeri chiusi; accordo per
fornitore).
