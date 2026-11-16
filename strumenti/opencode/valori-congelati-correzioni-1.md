# `valori-congelati` — correzioni 1 + revisione completa dell'onda

Leggi `strumenti/opencode/resoconto-valori-congelati.md`. **Nota**: la migrazione `20261115210000_valori_congelati` è
già applicata su `decobrands_db` (errore del pacchetto, additiva; la copia di sicurezza è stata fatta dopo da Claude
Code). Da ora ogni comando prisma/jest deve avere `DATABASE_URL` puntato **esplicitamente** al db di prova nella stessa
riga di comando: mai lanciare `prisma migrate` senza.

## 1. Ricalcolo degli aperti: tutti i punti, non solo il parametro spese (bug)
Il resoconto dice che `ricalcolaDocumentiAperti` è chiamata **solo** dal cambio di `spese_base_provvigione`. Poiché
ora tutte le letture usano il `calcolo` salvato, un documento aperto resta con valori **vecchi** quando cambiano:
- percentuali/scaglioni del fornitore (versioni datate), agenzia (`interscambio`: sconto di riserva, subagente),
- il documento stesso (correzione dei dati letti, righe, segno «spesa», importo, tipo),
- abbinamento/scollegamento del documento a una pratica, cambio di cliente/fornitore della pratica,
- registrazione a mano o dalla coda di fattura/nota di credito, annullamento.
Collega **ogni** operazione che cambia un ingresso del calcolo al ricalcolo dei documenti aperti coinvolti (solo
quelli, nella stessa transazione dell'operazione, V13). Meglio un punto unico «dopo una modifica, ricalcola gli
aperti di questa pratica/questo fornitore» chiamato dai servizi, che chiamate sparse. Un documento **senza**
`calcolo` (creato prima) non deve dare numeri diversi da quelli di prima: o si calcola al volo con la stessa funzione
o il comando di servizio lo riempie (scegli e scrivi).
Prove: per ogni ingresso sopra, cambio → documento aperto aggiornato, documento congelato invariato.

## 2. KO lasciati
- `registro.spec.ts` (Unique constraint in `registro.create`): trova la causa (pacchetto `ora-registro` ha toccato
  il registro e il suo test) e correggila;
- `versione.spec.ts`: allinea all'attuale `package.json` (la versione la alza Claude Code al commit; la prova deve
  leggere la versione dal `package.json` invece di averla scritta, se è così che deve funzionare: guarda la prova).
- `blocco.ts`: il commento dice «per database» ma il `pg_advisory_lock` è globale al server: correggi il commento o
  usa una chiave che includa il nome del database (scegli la più semplice e corretta).

## 3. Revisione completa dell'onda (codice sensibile)
I file non committati in `app/backend/src` (soldi, provvigioni, abbinamenti, SQL, migrazioni, permessi): carica
**davvero** `owasp-security`, `postgresql-code-review` (migrazioni `20261115100000_*`, `20261115200000_*`,
`20261115210000_*` e le query nuove), `ponytail-review`. Correggi i rilievi veri; elenca nel resoconto quelli scartati
con il perché. Controlla in particolare: V12 (nessun valore calcolato preso dal browser), V13 (operazioni multi-tabella
in una transazione con `tx`, `FOR UPDATE` su chiusure/abbinamenti), D-11 (liquidazioni chiuse mai toccate), permessi
sulle rotte nuove (`/liquidazioni/anni`, filtri elenco documenti, abbina da pratica, parametro fornitore), SQL
parametrizzato.

## 4. Suite completa
`npx jest` **completa** su `decobrands_test_congelati` ricreato e migrato (con `DATABASE_URL` esplicito): **0 KO**.
`npx tsc --noEmit` backend e frontend. Poi cancella il db di prova.

## File ammessi
Tutto `app/backend/src`, `app/backend/test`, `app/backend/prisma` (nessuna migrazione nuova senza scriverlo in testa al
resoconto; mai applicarla a `decobrands_db`), le viste frontend toccate dall'onda solo per correggere rilievi.
Regole: `strumenti/opencode/regole-onda-parallela.md`, `CLAUDE.md`; URL del db solo con grep; `.env` mai letto con
readFileSync o cat. Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill anche `caveman`.

Aggiorna il resoconto (sezioni «Correzioni 1» e «Revisione»). Riepilogo in 10 righe.
