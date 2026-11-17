# Pacchetto `revisione-0-2-9` (sola lettura)

Revisione completa delle modifiche non ancora committate (`git diff` + file nuovi in `git status`) dei pacchetti
`raggruppamento-scaglioni` (+ correzioni-1) e `scaglioni-esatti`: codice sensibile (calcolo provvigioni, liquidazioni,
bollettini, migrazioni, endpoint con permessi). Leggi i due prompt e i resoconti in `strumenti/opencode/`.

## Cosa fare
Carica **davvero** con lo strumento `skill`: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
Controlla:
1. **Correttezza dei soldi**: modalità `documento` identica al centesimo a prima (confronta con `git diff`, nessun
   cambiamento di comportamento); modalità `riga` coerente in documento, Riepilogo pratica, liquidazione, Analisi,
   bollettini; congelati mai ricalcolati; note di credito; correzione/regola mensile/% agenzia con la precedenza di prima;
   tolleranza ±0,05 degli scaglioni esatti; arrotondamenti al centesimo (per gruppo, poi somma).
2. **Sicurezza**: endpoint deroga pratica e impostazioni fornitore: permessi uguali a quelli vicini, validazione dei valori
   lato server, motivo obbligatorio, nessun dato calcolato preso dal browser (V12).
3. **Transazioni**: V13 (una transazione, `FOR UPDATE`, registro dentro la transazione).
4. **Migrazioni**: additive, CHECK giusti, nessun lock lungo; coerenti con `schema.prisma`.
5. **Complessità**: logica duplicata (es. precedenza correzione copiata in `provvigioneRiga` invece di riusare `quotaSub`),
   codice morto, astrazioni inutili.

**Non modificare nessun file** tranne il resoconto. Non lanciare jest su `decobrands_db`. Niente `cd`, `/tmp`, `&`, `.env`,
porte 8001/8002, commit.

## Resoconto
`strumenti/opencode/resoconto-revisione-0-2-9.md`: rilievi ordinati per gravità, ognuno con file:riga, scenario concreto
(dati → numero sbagliato o falla), correzione proposta, prova che lo dimostrerebbe. Distingui «da correggere prima del
rilascio» da «miglioria». Riepilogo in massimo 10 righe.
