# Pacchetto `ordine-aggiornato` (ordine, conferma, proforma)

## Caso (Ugo, 17/11/2026, schermata)
Primo documento in coda: **Ordine AU278504** di ARTE (file `agg Auftrag_AU278504.pdf`, «agg» = ordine **aggiornato** dal
fornitore), codice cliente letto **44464**, importo 1.056,24 €. La pagina mostra:
1. «⚠ Il codice 44464 presso ARTE WOHNACCESSORIES GMBH & CO.KG è di Florovivaistica Manente Soc. Agr. Semplice» (grave),
   con **Cliente: non ancora associato**. Il codice è **giusto**: l'ordine è proprio di Manente.
2. «Questo ordine risulta già registrato: controlla il numero letto o scarta il documento.» L'ordine AU278504 c'è già in una
   pratica; questo PDF è la **versione aggiornata** e deve **sostituire** quello registrato.

## Rilievo 1 — falso avviso sul codice cliente (bug)
`app/backend/src/proposta.ts` ~riga 993–1007: quando `proposta.abbinamento == null` e nessun cliente è scelto a mano
(`scelto == null`), un codice che **esiste** fra le agenzie del fornitore finisce nel ramo `else` e diventa l'avviso grave
«è di …». Con `scelto == null` non c'è nessun conflitto: il codice **indica** il cliente. Correzione alla radice: in quel
caso niente avviso; il cliente dell'agenzia si propone come cliente del documento (come quando l'abbinamento riesce). Capisci
perché `abbinamento` è null qui (probabilmente l'esito `doppio` salta l'abbinamento) e sistema il punto giusto. L'avviso
«è di …» resta **solo** quando il cliente scelto è diverso da quello del codice.

## Rilievo 2 — ordine o proforma aggiornati che sostituiscono quello registrato (funzione nuova, piccola)
Ugo (17/11): anche la **proforma** arriva aggiornata con lo stesso numero (`agg Proforma_…`). Vale per **ordine, conferma
d'ordine e proforma** (tutte le fasi prima della fattura). Le conferme multiple restano: un numero **diverso** è una conferma
in più (come oggi); lo **stesso** numero dello stesso fornitore è la versione aggiornata di quel documento.
Quando un ordine/conferma/proforma letto ha lo stesso numero (e fornitore) di un documento della stessa fase già registrato
in una pratica (esito `doppio`):
- oltre a «Scarta il documento», un pulsante **«Sostituisci l'ordine registrato»** con una `Modale` che mostra prima → dopo
  (data, importo, numero righe, cliente) e chiede un **motivo** (precompilato «Ordine aggiornato dal fornitore»).
- Il server (V12/V13, una transazione, `SELECT … FOR UPDATE` sulla pratica): il documento (ordine/conferma/proforma) della pratica prende i dati
  e le righe nuove e il **file nuovo**; il file vecchio resta collegato nello storico (non si cancella); evento nel registro
  con prima/dopo e motivo; il documento in arrivo si chiude come registrato; ricalcolo dei documenti **aperti** della
  pratica (i congelati non si toccano, D-183).
- Si rifiuta (409 chiaro) se la pratica ha già una **fattura** congelata o è in una liquidazione chiusa: lì l'ordine non si
  cambia più. Stessi permessi della registrazione di un documento.
- Solo per **ordine, conferma, proforma**. Niente per fatture e note di credito (lì il doppione resta un doppione).
- Pulsante: «Sostituisci l'ordine registrato» / «Sostituisci la proforma registrata» / «… la conferma …» secondo il tipo.
- Il testo «Questo ordine/documento risulta già registrato…» diventa (per le tre fasi): «Questo <tipo> c'è già nella pratica N. Se è la versione
  aggiornata, sostituiscilo; altrimenti scarta il documento.» con il link alla pratica.

## Prove (jest con `DATABASE_URL_TEST` su `decobrands_test_ordineagg`, crea e cancella; 0 KO; `tsc` backend e frontend)
- codice cliente esistente, nessun cliente scelto → nessun avviso grave, cliente proposto;
- cliente scelto diverso dal codice → avviso «è di …» come oggi;
- ordine doppio → sostituzione: dati, righe, file nuovi; file vecchio nello storico; evento; ricalcolo; motivo obbligatorio;
- sostituzione rifiutata con fattura congelata;
- proforma doppia (stesso numero) → sostituzione come l'ordine; proforma con numero diverso → conferma in più come oggi;
- fattura o nota doppia → nessun pulsante «Sostituisci».
Prova nel browser: aggiungi i controlli a `strumenti/prove/app_documenti.py` (solo `py_compile`).

## File ammessi
`app/backend/src/**`, `app/backend/test/**`, `app/backend/prisma/schema.prisma` + migrazione **solo se** serve una colonna
per lo storico del file (prima cerca se esiste già una tabella o un campo per i file sostituiti), `app/frontend/app/(app)/documenti/**`,
`app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, `specifica-crm-provvigioni.md` (riga §19 col primo numero
libero dopo D-202, *Perché*, versione +0.01), `piano-lavoro-crm.md` (ore **da approvare**).

## Regole
`strumenti/opencode/regole-onda-parallela.md` (niente script fuori da jest che toccano il db) e `CLAUDE.md`. Il pacchetto
`documenti-lentezza` ha appena toccato gli stessi file: non togliere niente del suo lavoro. V12, V13, D-31, D-183. Niente
commit, `cd`, `/tmp`, `&`, `.env` letto, porte 8001/8002, Integra. Skill: `owasp-security`, `postgresql-code-review` (se
migrazione), `ponytail-review`, `caveman`. Resoconto `strumenti/opencode/resoconto-ordine-aggiornato.md`. Riepilogo in 10 righe.
