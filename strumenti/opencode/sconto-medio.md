# Pacchetto `sconto-medio`

## Decisione di Ugo (15/11/2026) — nuova regola delle provvigioni
Oggi lo scaglione della provvigione si sceglie con `interscambio.sconto` dell'agenzia (fisso, dal vecchio CRM
o a mano). Leggi prima `strumenti/opencode/resoconto-sconto-pratica-002.md` e
`resoconto-sconto-cliente-002.md`.

Nuova regola: **lo scaglione si sceglie dallo sconto medio letto sui documenti.**

1. **Sconto medio** di un documento = `1 − netto / lordo`, in %, arrotondato a 2 decimali, dove
   lordo = Σ quantità × prezzo e netto = Σ importo della riga (letto o calcolato con lo sconto di riga,
   `importoRigaLetta`/`fattoreSconto`). Righe senza prezzo o quantità: fuori dal calcolo (scrivilo).
   Documento senza righe utili → sconto medio sconosciuto → si usa lo sconto dell'agenzia come oggi (riserva).
2. **Scelta dello scaglione** fra quelli dell'agenzia (percentuali datate già esistenti, es. scaglioni 0 e 5):
   si prende il **primo scaglione ≥ sconto medio** (es. sconto medio 3,5 con scaglioni 0 e 5 → scaglione 5;
   esattamente 5 → 5; 0 → 0).
3. **Sconto medio oltre l'ultimo scaglione** (es. 6,2 con scaglioni 0 e 5) → **anomalia** nel registro unico
   (D-31, codice nuovo con schema del `dettaglio`: pratica, documento, sconto medio, ultimo scaglione) e la
   pratica **non si può chiudere** finché l'anomalia è aperta (blocco sul server nella chiusura/verifica,
   `SELECT … FOR UPDATE`, V13). Provvigione mostrata come «da decidere», non calcolata su uno scaglione
   inventato. Si risolve aggiungendo lo scaglione all'agenzia (poi ricalcolo) — nessuna forzatura nuova.
4. **Quale documento comanda**:
   - nella pratica si mostra lo sconto medio dell'**ultimo documento** arrivato (ordine → conferma/proforma →
     fattura), con lo scaglione che ne deriva;
   - sulla **fattura** il valore è **definitivo** e su quello si calcola la provvigione;
   - **nota di credito**: si ricalcola sulla differenza, cioè sconto medio di (fattura − nota di credito):
     lordo e netto della fattura meno quelli della nota; se cambia lo scaglione, la provvigione si ricalcola
     (rispetta D-11: lo storno va nella liquidazione successiva, liquidazioni chiuse mai toccate).
5. Tutto sul server (V12): il browser mostra e basta.

## Compito
1. Trova dove oggi si sceglie lo scaglione (`motore/*`, `proposta.ts`, `pratiche.ts`, percentuali datate) e
   sostituisci la fonte dello sconto con lo sconto medio come sopra, in **un solo punto** usato da tutti
   (pratica, bollettini, liquidazioni, Analisi, esportazioni).
2. Anomalia + blocco della chiusura (punto 3).
3. **Pratica** (`app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`): nel riepilogo della fase mostra
   «sconto medio 3,50% → scaglione 5%» (del documento che comanda) e, se oltre l'ultimo, l'avviso
   dell'anomalia con il collegamento all'agenzia. Classi esistenti (`grep` su `stile.css`).
4. **Comando di servizio** (forma dei comandi esistenti con `--prova`): ricalcola sconto medio e scaglione
   delle pratiche esistenti **non in liquidazioni chiuse**, stampa prima/dopo (pratica, sconto medio,
   scaglione, provvigione Decobrands e subagente). **Non lanciarlo su `decobrands_db`**: scrivi il comando
   nel resoconto, lo lancia Claude Code dopo la copia di sicurezza.
5. Testo per la guida (`app/frontend/lib/guida.ts`, pagina Pratica).

## Casi da coprire con le prove (jest, 0 KO)
- sconto medio 3,5, scaglioni 0/5 → 5; 5,00 → 5; 0 → 0; 6,2 → anomalia e chiusura rifiutata;
- sconto per riga diverso (10% e 0%) → media pesata sul lordo;
- ordine 0%, fattura 10% → la fattura comanda;
- fattura 10% + nota di credito su righe al 10% → invariato; nota che cambia la media → nuovo scaglione;
- documento senza righe → riserva sullo sconto dell'agenzia;
- valori di Bollettini, Liquidazioni, Analisi sul seed: cambiano solo dove lo sconto medio cambia scaglione
  (elenca quali nel resoconto).

## File ammessi
`app/backend/src/motore/*`, `proposta.ts`, `pratiche.ts`, `bollettini.ts`, `liquidazioni*`, il codice delle
anomalie/registro, nuovo file del comando, test in `app/backend/test/`, `VistaPratica.tsx`, `lib/guida.ts`,
`stile.css` (solo aggiunte in fondo). Migrazioni: solo se indispensabili, **scritte e non applicate**
(scrivilo nel resoconto). **Non toccare** `documenti.ts`, `lettore.ts`, `lettura.ts`, `oggi.ts` (altri
pacchetti). Aggiungi, non riscrivere: ci sono modifiche non committate da conservare.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, D-11, rimandi
`// D-nn §19` (numero nuovo da proporre nel resoconto). URL del db **solo con grep**, `.env` **mai letto con
readFileSync o cat**. Prove su `decobrands_test_sconto_medio` (creato e cancellato); su `decobrands_db` solo
letture. Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill da caricare davvero: `owasp-security`,
`ponytail-review`, `postgresql-code-review` (se SQL), `caveman`.

## Resoconto
`strumenti/opencode/resoconto-sconto-medio.md`: punto unico scelto, file toccati, prove, comando da lanciare
e numeri attesi (in particolare OF/2026/002), pratiche che cambiano, dubbi, «Da documentare» (spec §5.3,
§4.2.7.1, §19 con il perché).
