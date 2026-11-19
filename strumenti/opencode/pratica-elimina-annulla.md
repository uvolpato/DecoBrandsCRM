# Pacchetto `pratica-elimina-annulla`

## Decisioni di Ugo (17/11/2026)
Due operazioni nuove sulla pratica (ordine a fornitore, `ordini_fornitore_testata`).

### A. Elimina (cancellazione definitiva)
- Per errori (doppione, abbinamento sbagliato, prova). **Solo amministratore** (permesso dei ruoli esistente più alto
  per le pratiche; se non esiste un permesso adatto usa quello di amministrazione e scrivilo nel resoconto).
- **Permessa solo se la pratica non è contabilizzata**: nessun documento congelato (D-183), in un bollettino verificato o
  contestato, in una liquidazione chiusa, abbinato a una riga di bollettino. Altrimenti 409 con il motivo esatto.
- Effetto, **in una transazione** (V13, `SELECT … FOR UPDATE` sulla pratica): righe, correzioni, documenti, pratica
  cancellati fisicamente. I documenti in arrivo collegati (PDF) passano negli **scartati** (stesso stato e stessa via del
  pulsante «Scarta il documento», con motivo «pratica N eliminata»), non si cancellano i file.
- Registro (D-31): evento con **fotografia** della pratica (numero, fornitore, cliente, subagente, documenti con tipo,
  numero, data, importo, provvigioni) + chi + motivo. Il registro non si tocca mai.
- Motivo **obbligatorio**; conferma scrivendo il numero della pratica (componente `ConfermaGrave` che c'è già).
- Vincoli del database: se una FK impedisce la cancellazione, trova l'ordine giusto; **mai** `ON DELETE CASCADE` nuovi
  verso tabelle contabili.

### B. Annulla (stato «annullata», reversibile)
- **Sempre permessa**, con **motivo obbligatorio** e **data di annullamento** (predefinito oggi); stessi permessi della
  correzione della provvigione.
- È l'**unica eccezione** a «lo stato si ricava dai documenti»: campi nuovi sulla testata `annullata_il DATE NULL`,
  `annullata_motivo TEXT NULL`, `annullata_da` (utente). Migrazione scritta, non applicata.
- Effetti (tutti sul server, V12):
  - stato pratica = **«annullata»** davanti a ogni stato ricavato;
  - esce dalle **attese**: niente solleciti di conferma/fattura, niente scadenze in Oggi;
  - provvigione **prevista 0** per i documenti **aperti** (ricalcolo come oggi); i documenti **già congelati / in
    bollettini o liquidazioni chiuse non cambiano** (D-183): l'eventuale storno arriva con nota di credito o bollettino
    e va nella liquidazione successiva (D-11). Se la pratica annullata ha documenti contabilizzati, la finestra lo dice
    chiaramente prima di confermare;
  - fuori da bollettini (riconciliazione: un documento di pratica annullata che compare nel bollettino è un'**anomalia**
    «pratica annullata»), liquidazioni e totali dell'Analisi; in Analisi un conteggio a parte «Ordini annullati»;
  - un documento nuovo che arriva su una pratica annullata **non si abbina da solo**: anomalia nella coda.
- **Ripristina**: toglie l'annullamento (motivo obbligatorio), ricalcolo degli aperti, evento.
- Elenco Pratiche: segmento **«Annullate»**, escluso da «Tutte» di default (conteggi D-23); pagina pratica: fascia in
  alto «Annullata il … da … — motivo» con «Ripristina»; azioni «Annulla la pratica» ed «Elimina la pratica» nel menu
  delle azioni della pratica (Elimina visibile solo all'amministratore e disattivata con spiegazione se contabilizzata).

## Prove (jest con `DATABASE_URL_TEST` su `decobrands_test_eliminaannulla`, crea e cancella; suite toccate 0 KO a gruppi;
`npx tsc --noEmit` backend e frontend)
- elimina pratica aperta → righe/documenti/pratica spariti, PDF negli scartati, evento con fotografia; non admin → 403;
  pratica con documento congelato / in bollettino verificato / in liquidazione chiusa → 409 con motivo; motivo vuoto → 400;
- annulla pratica aperta → stato annullata, provvigione aperti 0, fuori da Oggi, liquidazione, Analisi; ripristina → tutto
  come prima; annulla con fattura congelata → fattura invariata, avviso; documento nuovo su annullata → non abbinato,
  anomalia; riga di bollettino su annullata → anomalia «pratica annullata».
Prova nel browser: controlli in `strumenti/prove/app_pratica.py` e `app_pratiche.py` (solo `py_compile`).

## File ammessi
`app/backend/src/**`, `app/backend/prisma/schema.prisma` + nuova cartella di migrazione, `app/backend/test/**`,
`app/frontend/app/(app)/pratiche/**`, `app/frontend/app/(app)/oggi/**`, `app/frontend/app/(app)/analisi/**`,
`app/frontend/lib/guida.ts`, `app/frontend/lib/entita.ts` (se serve per il segmento), `strumenti/prove/app_pratica.py`,
`app_pratiche.py`, `specifica-crm-provvigioni.md` (§19 D-206 elimina, D-207 annulla, *Perché*, schema, versione +0.01),
`piano-lavoro-crm.md` (ore **da approvare**). **Non** toccare `stile.css`, `componenti/**`, `clienti/**`, `fornitori/**`,
`soggetti/**`, `subagenti/**`: un altro pacchetto ci lavora in parallelo.

## Regole
`strumenti/opencode/regole-onda-parallela.md` (**niente script fuori da jest che toccano il database**) e `CLAUDE.md`.
V12, V13, D-11, D-31, D-49, D-183. Migrazione scritta, non applicata a `decobrands_db`. Ogni comando prisma/jest con
`DATABASE_URL`/`DATABASE_URL_TEST` esplicito; `.env` mai letto. Niente commit, `cd`, `/tmp`, `&`, porte 8001/8002/8012/8071
(le prove nel browser le lancia Claude Code). Skill con lo strumento `skill`: `owasp-security`, `postgresql-code-review`,
`ponytail-review`, `caveman`. Resoconto `strumenti/opencode/resoconto-pratica-elimina-annulla.md`. Riepilogo in 10 righe.
