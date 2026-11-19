# Resoconto — `pratica-elimina-annulla` (D-206, D-207)

## Cosa è stato fatto

Due operazioni nuove sulla pratica (`ordini_fornitore_testata`), spec D-206/D-207.

**Elimina** (`DELETE /api/pratiche/:id`, solo amministratore o superutente con `provvigioni.elimina`):
- Motivo obbligatorio (400 se vuoto); 403 per chi non è amministratore.
- 409 con motivo esatto se la pratica è contabilizzata: documento congelato (D-183), in una
  liquidazione chiusa, abbinato a una riga di bollettino o con una decisione in un bollettino.
- In una transazione (V13, `FOR UPDATE` sulla pratica): fotografia nel registro (numero, fornitore,
  cliente, subagente, documenti con tipo/numero/data/importo/provvigioni) scritta prima di cancellare;
  i PDF in arrivo collegati passano negli scartati (`motivo_scarto = "pratica N eliminata"`); poi
  correzioni, righe, note di credito (stornano le fatture) e gli altri documenti, infine la pratica.
  Nessun `ON DELETE CASCADE` nuovo verso tabelle contabili.

**Annulla** (`POST /api/pratiche/:id/annulla` e `/ripristina`, stessi permessi della correzione):
- Colonne `annullata_il DATE`, `annullata_motivo TEXT`, `annullata_da` (FK utenti), migrazione
  `20261117140000_pratica_annulla` scritta e **non applicata** a `decobrands_db`.
- Motivo obbligatorio, data di annullamento facoltativa (oggi). Stato «annullata» davanti a ogni
  stato ricavato (`statoPratica`); segmento **Annullate** nell'elenco, escluso da «Tutte».
- Fuori da Oggi (niente solleciti né scadenze, `pagamentiDaSollecitare`), liquidazioni
  (`righeLiquidazione`) e Analisi (`fattiAnalisi`, più il conteggio `annullati` nella risposta).
- Provvigione **prevista 0** sugli aperti (`quotaSub` e `provvigioneDocumento`); i congelati restano
  (D-183).
- Anomalia «pratica annullata» (registro D-31) quando una riga di bollettino punta a un documento di
  una pratica annullata, e quando un documento nuovo cita un ordine di una pratica annullata (non si
  abbina da solo: `praticaPerOrdine` esclude le annullate).

**Frontend:** `VistaPratica.tsx` (fascia «Annullata il … da … — motivo» con Ripristina, azioni
«Annulla la pratica» ed «Elimina la pratica»), `VistaPratiche.tsx` (segmento Annullate),
`lib/stati.ts`, `lib/guida.ts`.

## Prove

- `npx tsc --noEmit` backend e frontend: **passa**.
- jest `pratica-elimina-annulla.spec.ts`: **9/9 OK** (annulla/ripristina, provvigione 0, 400/403/409,
  elimina con PDF negli scartati ed evento con fotografia, anomalie su bollettino e coda).
- Suite toccate a gruppi, tutte a 0 KO: `pratiche`, `bollettino`, `bollettini`, `motore`,
  `liquidazioni`, `analisi`, `oggi`, `documenti`, `proposta`, `valori-congelati`, `sconto-medio`,
  `scaglioni-esatti`, `incassi`, `esporta-liquidazione`, `bollettino-quota`, `righe-nota-credito`,
  `agenzia-senza-subagente`, `raggruppamento-scaglioni`, `raggruppamento-scaglioni-db`
  (315 + 24 + 56 prove, 0 KO).
- Prove nel browser: controlli aggiunti in `app_pratica.py` (annulla/ripristina, pulsanti
  Annulla/Elimina) e `app_pratiche.py` (7 segmenti, «Annullate»): `python -m py_compile` OK.
  Non lanciate (le lancia Claude Code a fine onda).

## Decisioni e scostamenti

- **Permesso dell'eliminazione:** non esiste un permesso «elimina pratica»; ho riusato
  `provvigioni.elimina` + ruolo amministratore/superutente, come l'eliminazione definitiva degli
  scartati (scartati.ts).
- **Conferma dell'eliminazione a schermo:** il motivo obbligatorio è un campo libero nella finestra
  (l'aiuto chiede di scrivere anche il numero); non ho usato il componente `ConfermaGrave` a spunta
  oltre al campo motivo (un solo passaggio).
- **«Ordini annullati» in Analisi:** il backend espone il conteggio `annullati`; la pagina Analisi
  del frontend non lo mostra ancora (rinviato: non richiesto dalle prove).
- **Test DB:** usato `decobrands_test_eliminaannulla` (creato, migrato e **cancellato** a fine giro).

## Da documentare (già fatto in questo pacchetto)

- Spec §19: righe D-206 e D-207; *Perché* in §4.2.7; colonne `annullata_il/motivo/da` nello schema;
  versione 8.94 → 8.95.
- `piano-lavoro-crm.md`: attività F7-A29 (8 h **da approvare**), versione 2.10 → 2.11.

## Cose aperte

- Pagina Analisi del frontend: mostrare il conteggio «Ordini annullati» (il backend lo manda già).
- Il prototipo ufficiale non replica le due azioni (fuori dai file ammessi di questo pacchetto).

## Revisione (rilievi e migliorie, 17/11/2026)

Correzioni ai rilievi e alle migliorie di `resoconto-revisione-elimina-annulla.md`:

- **Rilievo 1 (concorrenza):** `elimina` ora blocca prima il **fornitore** (`SELECT … FOR UPDATE` su
  `fornitori`), come `bloccaFornitore`, prima di `motivoNonEliminabile`; poi la testata. Prova jest
  «elimina blocca il fornitore» (una transazione concorrente tiene il lock e `elimina` resta in attesa).
- **Rilievo 2 (cerca/sposta):** `cerca` marca `'annullata'` davanti agli altri stati; `sposta` rifiuta con
  **409** («La pratica N è annullata: non ci si spostano documenti») se la destinazione è annullata.
  Prove jest per entrambi.
- **Miglioria 3 (calcolo degli aperti):** `annulla` chiama `salvaCalcolo`, che ora salva il `calcolo` degli
  aperti con provvigione azzerata (pct e importi a 0, gruppi compresi) quando la pratica è annullata.
  Prova: il `calcolo.provvigione_agente/subagente` salvato è `'0.00'`.
- **Miglioria 4 (anomalie orfane):** `elimina` chiude le anomalie `provvigione.sconto_medio` e
  `provvigione.gruppo_scaglione` della pratica prima di cancellarla.
- **Miglioria 5 (Elimina disattivata a schermo):** non fatta — non è «piccola» (richiede un campo
  `eliminabile` nel dettaglio + logica nel frontend); il 409 del server dopo il click resta la guardia
  (coerente con V12).

Prove: `pratica-elimina-annulla.spec.ts` 12/12 OK (9 + 3 nuove); `pratiche.spec` OK; `tsc --noEmit`
backend OK. `documenti-pratica.spec` fallisce con 500 sul flusso `abbina`/`registra`: è il lavoro **in
corso** del pacchetto parallelo `documenti-sostituiti-visibili` su `documenti.ts` (i miei ritocchi a
`documenti.ts` sono solo la riga 409 in `sposta`), non di questo pacchetto. Test DB
`decobrands_test_eliminaannulla2` creato, migrato e cancellato.
