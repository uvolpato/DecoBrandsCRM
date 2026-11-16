# Pacchetto `sconto-cliente-002`

## Contesto
Leggi `strumenti/opencode/resoconto-sconto-pratica-002.md`: nella pratica **OF/2026/002** (AGRI AGGIO × ARTE)
tutte le righe dei documenti hanno sconto 10%, ma l'agenzia AGRI AGGIO × ARTE ha `interscambio.sconto = 0`,
quindi la provvigione usa lo scaglione 0 (20% / 8%).

Ugo (15/11/2026): nello **sconto cliente** della OF/2026/002 si aspetta **10** e la provvigione calcolata di
conseguenza (scaglione dello sconto 10). Domanda: è a 0 perché la pratica è stata elaborata **prima** che il
CRM ricavasse lo sconto dai documenti? Se sì, **allinearla**.

## Compito
1. **Diagnosi** (sola lettura su `decobrands_db`, URL con grep, `.env` mai letto per intero):
   - dove nasce lo sconto cliente oggi: lo ricava «Apri la pratica» / l'abbinamento dalle righe del
     documento (cerca in `proposta.ts`, `pratiche.ts`, `motore/*`, pacchetti `sconto-riga`,
     `sconto-da-grezza`, `percentuali-riprogetto`)? Si salva sulla pratica, sui documenti o sull'agenzia
     (`interscambio`)? Con quali date/versioni (percentuali datate)?
   - la 002 è stata creata prima di quel codice (date di creazione nel registro vs. commit/data del pacchetto)?
   - se lo sconto non si ricava mai dai documenti: dillo chiaro nel resoconto e proponi la regola (non
     inventarla nel codice).
2. **Se è un dato vecchio**: scrivi un **comando di servizio** riutilizzabile (stessa forma dei comandi già in
   `app/backend/` — cerca `--prova`) che ricalcola lo sconto cliente di una pratica dai suoi documenti, con
   la stessa funzione usata dal flusso normale (nessun calcolo nuovo), e aggiorna quello che il flusso
   normale avrebbe scritto, in **una transazione** (V13) con evento nel registro (D-31). Con `--prova`
   stampa prima/dopo (sconto, scaglione, provvigione Decobrands e subagente) senza scrivere. Liquidazioni
   già **chiuse** non si toccano mai: se la 002 vi entra, fermati e scrivilo.
   **Non lanciarlo su `decobrands_db`**: scrivi nel resoconto il comando esatto; lo lancia Claude Code dopo
   la copia di sicurezza.
3. Se la causa è un errore del flusso normale (anche le pratiche nuove avrebbero 0), correggi alla radice.

## File ammessi
`proposta.ts`, `pratiche.ts`, `motore/*`, nuovo file del comando in `app/backend/src/` (o dove stanno gli
altri comandi), test in `app/backend/test/`. **Non toccare** `lettore.ts`, `lettura.ts`, `documenti.ts`
(pacchetto in corso), pagina Oggi, registro/`VistaSistema.tsx`, frontend. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, rimandi `// D-nn §19`.
Prove su `decobrands_test_sconto_cli` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`,
Integra. Skill da caricare davvero: `owasp-security`, `ponytail-review`, `postgresql-code-review` (se SQL),
`caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend; jest: pratica con righe al 10% → sconto 10 e scaglione corrispondente; comando
con `--prova` non scrive; senza `--prova` scrive una volta (rilanciato non cambia nulla).

## Resoconto
`strumenti/opencode/resoconto-sconto-cliente-002.md`: dove nasce lo sconto, causa per la 002, file, prove,
**comando da lanciare** (prova e vero), numeri attesi prima/dopo, «Da documentare».
