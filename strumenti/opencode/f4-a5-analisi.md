# Prompt per OpenCode — F4-A5 Pagina Analisi (BI)

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da Sonnet: usa il
modello caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`supabase-postgres-best-practices`, `nextjs-app-router-patterns`, `ui-ux-pro-max`, `dataviz`,
`javascript-typescript-jest`, `webapp-testing` e `playwright-best-practices`. Prima di cercare nei
file usa `graphify query "<domanda>"`.

## Compito

F4-A5 è la pagina **Analisi**, come nel prototipo (`prototipo-alternativo/assets/viste-analisi.js`).
Contiene:
- il periodo di 3, 6 o 12 mesi con `PeriodoMesi`;
- i filtri fornitori, subagenti e clienti, ognuno con un campo di ricerca a selezione multipla
  (D-20, D-22);
- il **filtro incrociato**: un clic su una barra o su una riga filtra tutta la pagina;
- 4 numeri, ognuno confrontato con il periodo precedente;
- 4 grafici;
- una tabella raggruppabile;
- l'esportazione.

Da leggere:
- `piano-lavoro-crm.md`, riga **F4-A5**;
- la spec `specifica-crm-provvigioni.md`: §7.22, §11, §16.4, §16.4.1;
- nel §19: D-18 (la BI completa sta qui), D-19 (importi per data del documento), D-20, D-22, D-23,
  D-52 (calcoli in SQL dove si può), D-59 (caricamento con le sagome), D-60 (sulle provvigioni
  contano solo fattura e nota di credito).

## Server

Crea il file nuovo `app/backend/src/analisi.ts` e registralo in `app.module.ts`.

1. **I numeri vengono dal motore.** `fattiAnalisi` di `src/motore/motore.ts` dà i fatti già
   calcolati, uguali al prototipo: si usano quelli e non si riscrivono le regole delle provvigioni
   in SQL.
   - Se `caricaDati` completo è lento sui volumi grandi, misuralo con `test/carico-pratiche.ts`
     (10.000 pratiche). Sopra 1 secondo, proponi nel resoconto la vista `v_analisi_documenti`
     indicata dal piano, ma **non** farla in questo lavoro: tocca il calcolo dei soldi e la decide
     Claude Code.
2. **`GET /api/analisi`**, permesso `analisi.consulta` (se in `src/accesso.ts` non esiste, usa
   `provvigioni.consulta` e scrivilo nei dubbi).
   - Parametri: `dal=AAAA-MM`, `al=AAAA-MM`, `fornitori`, `subagenti`, `clienti`, `raggruppa`.
   - Risposta:
     - 4 numeri, ognuno con il valore del periodo precedente della stessa durata;
     - i dati dei 4 grafici;
     - la tabella raggruppata;
     - i **conteggi delle voci dei filtri**, calcolati con gli altri filtri attivi (D-23).
   - Le aggregazioni le fa il server. Il browser non somma niente (V12).
3. **`GET /api/analisi/esporta?formato=xlsx|csv&...`**, con gli stessi filtri.
   - **Excel**: usa `exceljs`, che c'è già nel progetto, con fogli di dati e formule semplici. I
     grafici come immagine falli solo se costano poco; altrimenti scrivilo nei dubbi.
   - **CSV**: solo i dati, in UTF-8 con BOM, perché Excel lo apra bene.
   - **PDF**: non in questo lavoro. Va con F4-A3, che lo converte con LibreOffice. Scrivilo nella
     spec.
4. **Prove** in `test/analisi.spec.ts`:
   - i numeri sul seed sono uguali al prototipo (vedi `test/prototipo.ts` e `fattiAnalisi`);
   - il confronto con il periodo precedente;
   - i filtri multipli e i conteggi D-23;
   - il filtro incrociato, cioè un filtro sul raggruppamento;
   - un pagamento o una proforma non cambia i numeri (D-60);
   - 403;
   - l'esportazione: tipo del file, intestazioni, somma uguale alla risposta della pagina.

## Pagina

Crea la pagina in `app/frontend/app/(app)/analisi/`, con `page.tsx`, `layout.tsx` e
`VistaAnalisi.tsx`. La voce di menu è già nella barra.

- Usa solo i componenti che ci sono già: `Pagina`, `FilterBar` (con `riepilogo`), `PeriodoMesi`,
  `Kpi`, `Grafico` (Chart.js), `DataTable`, `Sagoma`.
- Il filtro incrociato aggiunge un filtro, che si vede nel riepilogo e si toglie con la x.
- **Caricamento**: usa le sagome (D-59). Al cambio di un filtro la pagina resta, solo più tenue.
- Quando si torna alla pagina, ritrova filtri, periodo e raggruppamento come li avevi lasciati
  (§7.12).
- Esportazione con il pulsante *Esporta*, che offre Excel e CSV.

## Documenti

- **Spec**: §7.22 e §8.1 (le rotte), §11 (l'esportazione dell'Analisi, con il PDF che arriva con
  F4-A3), versione in testa.
  - Scrivila con lo strumento di modifica, in UTF-8 **senza BOM**, righe LF. Mai `Set-Content` o
    `Out-File`.
- **Guida** `prototipo-alternativo/assets/guida.js`: pagina Analisi.
- Poi lancia `python strumenti/genera-pagine-doc.py`.

## Regole

- Tutto sul backend (V12). Italiano semplice. Codice minimo (ponytail). Niente librerie nuove.
- Usa il database di prova `decobrands_test_f3a1`: imposta `DATABASE_URL_TEST` e applica prima le
  migrazioni nuove con `prisma migrate deploy`. **Non** usare `decobrands_test` né `decobrands_db`.
- **Non chiudere processi node che non hai avviato tu.** Chiudi solo per PID o per porta, mai
  «tutti i node». Ugo ha i server di sviluppo sulle porte 8001 e 8002.
- Niente commit, push, `.env`.

## Prove

1. In `app/backend`:
   - lancia `npx tsc --noEmit`;
   - lancia `npx jest --runInBand` **suite per suite**, perché node a volte va in crash se le
     lanci tutte insieme. Risultato atteso: 0 KO.
2. Nel browser:
   - avvia il backend e il frontend su porte libere;
   - usa gli utenti `f3-*`;
   - scrivi `strumenti/prove/app_analisi.py`. Deve controllare:
     - i 4 numeri e i grafici;
     - il periodo e lo spostamento con le frecce;
     - i filtri multipli e il riepilogo;
     - i numeri delle voci;
     - il filtro incrociato da una barra e da una riga;
     - il raggruppamento;
     - l'esportazione Excel e CSV (file scaricato);
     - le sagome durante il caricamento;
     - il ritorno alla pagina nello stesso punto;
     - nessun errore JavaScript.

   Rilancia anche `app_componenti.py`. Risultato atteso: 0 KO.
3. Fai le schermate a 1440 e a 768 px in `%TEMP%\f4-a5` e **guardale**.
4. Chiudi solo i tuoi processi.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f4-a5.md` con:
- i file toccati;
- la forma di `GET /api/analisi`;
- i tempi su 10.000 pratiche;
- le prove con i numeri;
- le schermate;
- i dubbi.
