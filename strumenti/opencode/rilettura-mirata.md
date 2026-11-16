# Pacchetto `rilettura-mirata`

Ugo (15/11/2026): dopo le correzioni della lettura (riga «Fracht» con codice testo, `spesa`; importi a zero) rileggere
i documenti già letti **solo se necessario**.

## Compito
1. **Elenco** (sola lettura su `decobrands_db`, URL solo con grep, `.env` mai letto con cat/readFileSync): tutti i
   documenti letti. Per ognuno: stato, tipo, numero, se è già **congelato** (`congelato_il`) o in bollettino/liquidazione
   chiusi, se ha **correzioni a mano** (campi con valore corretto diverso dal letto), somma righe vs importo, righe
   di spesa presenti. Da rileggere **solo** se:
   - somma delle righe lette ≠ importo del documento (riga mancante), oppure
   - è uno dei tre documenti dell'ordine AU276950 (`Auftrag_AU276950.pdf`, `Proforma_PR102829.pdf`, `Rechnung_RE193612.pdf`),
   **e** non è congelato **e** non ha correzioni a mano che la rilettura cancellerebbe (questi vanno in una lista
   «da decidere con Ugo», non si rileggono).
   Gli importi letti a zero non servono rilettura (si calcolano da soli).
2. **Comando di servizio** `npm run rileggi:mirata -- [--prova] [--id N…]`: usa **la stessa funzione** della rotta
   `POST /api/documenti/:id/rileggi` (nessuna logica nuova), un documento alla volta, con evento nel registro come la
   rotta (utente «servizio» o quello già usato dai comandi). Con `--prova` stampa solo l'elenco e il motivo. Per i
   documenti già abbinati a una pratica, verifica cosa fa la rilettura (se è ammessa dalla rotta; se la rotta la vieta,
   non aggirare: mettili nella lista «da decidere con Ugo»). Dopo la rilettura la pratica coinvolta si ricalcola già
   (`aggiornaPratica` → `salvaCalcolo`): verificalo.
3. **Non lanciarlo su `decobrands_db`** senza `--prova`: scrivi nel resoconto il comando esatto e l'elenco atteso. Lo
   lancia Claude Code.

File ammessi: nuovo comando in `app/backend/src/`, `package.json` (solo lo script), un test in `app/backend/test/`.
Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13. Prove su
`decobrands_test_rilettura` con `DATABASE_URL` **esplicito nella stessa riga** di ogni comando prisma/jest (mai migrate
su `decobrands_db`). LlamaIndex: solo per il test del comando, se serve, su un PDF. Niente commit, 8001/8002, `cd`,
`/tmp`, `&`, Integra. Skill: `owasp-security`, `ponytail-review`, `caveman`.
Resoconto: `strumenti/opencode/resoconto-rilettura-mirata.md` (elenco, motivi, lista «da decidere con Ugo», comando).
Riepilogo in 8 righe.
