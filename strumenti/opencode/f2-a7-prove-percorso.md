# F2-A7 — Prove del percorso completo e documentazione (D-111, D-112, D-113)

Lavoro da **DeepSeek Flash** (`deepseek/deepseek-flash`), una sessione sola. Leggi `CLAUDE.md` e
`AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `playwright-best-practices`, `webapp-testing`, `javascript-typescript-jest`,
`accessibility`. A fine lavoro carica davvero `ponytail-review`; applica i rilievi veri.

È l'ultima attività del blocco 10: F1-A11, F1-A11b, F1-A12, F1-A13 e F2-A6 sono unificate.

## Cosa si fa

### 1. Prova nuova `strumenti/prove/app_import_anagrafica.py`

Percorso intero, con il ponte finto (`decobrands_ponte_prova`, righe di `ponte-prova.sql`):

1. un documento di un fornitore **non in anagrafica** arriva in coda (PDF caricato via API, come in
   `app_documenti.py`);
2. la card dice *C'è in Integra: importa* con nome e P.IVA → importa;
3. compare *Mancano gli scaglioni* → *Configura gli scaglioni* (una versione) → si torna al documento;
4. il cliente non è in anagrafica ma la coppia è nello storico **con subagente** → *Importa* +
   *Configura l'agenzia* già precompilata (subagente e sconto) → salva;
5. *Registra e verifica* → la pratica si apre e i numeri della provvigione sono quelli attesi;
6. controprova: una coppia dello storico **senza subagente** → *Non rappresentato*, la registrazione
   resta rifiutata.

Ogni passo con controllo sul testo e sullo stato, non solo sul clic; 1440 e 768 px.

### 2. Prove esistenti da rilanciare

`app_documenti.py`, `app_clienti.py`, `app_fornitori.py`, `app_pratiche.py`, `app_oggi.py`: devono
restare 0 KO. Se una prova cade per un testo cambiato, si aggiorna la prova (non il testo) solo se
il testo nuovo è quello giusto.

### 3. Documentazione

- `specifica-crm-provvigioni.md`: numeri delle prove e ogni scostamento trovato (§4.7, §7.9, §8.1).
- `prototipo-alternativo/assets/guida.js` non serve (il prototipo non ha queste pagine); la guida
  vera è `app/frontend/lib/guida.ts`.
- `prototipo-alternativo/LEGGIMI.md` solo se cambia qualcosa del prototipo (non dovrebbe).
- `piano-lavoro-crm.md` e `avanzamento-app.md`: spunte e ore reali.
- `app/README.md`: comando `npm run import:storico` fra i comandi una volta.

### 4. Numeri da portare al collaudo

Conteggi dello storico (4022/3403/1625), soggetti in anagrafica prima e dopo il percorso, prove per
suite, tempi della ricerca sul ponte, schermate.

## Regole

- Non si aggiusta il codice per far passare una prova sbagliata: se il comportamento è giusto e la
  prova no, si aggiorna la prova e lo si scrive nel resoconto.
- Nessun dato di prova lasciato in giro: usa `utenti_prova.js togli` come gli altri script.
- Niente commit, push, `.env`; niente server sulle porte 8001/8002 se non avviati dalle prove.
- Italiano semplice; commenti con `// F2-A7`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f2-a7.md`: prova nuova con i controlli, prove rilanciate con i
numeri, difetti trovati e a chi tornano, schermate, quello che resta aperto. Non applicare le righe
di spec/piano: quelle le unisce chi chiude il blocco.
