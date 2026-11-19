# Resoconto — revisione `pratica-elimina-annulla` (D-206, D-207)

Revisione in sola lettura del lavoro del pacchetto `pratica-elimina-annulla`. Caricate davvero le skill
`owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Nessun file toccato tranne questo.

## Da correggere prima del rilascio

1. **Concorrenza: `elimina` non blocca il fornitore** — `app/backend/src/pratiche.ts:445-481`.
   La transazione fa solo `FOR UPDATE` sulla testata (riga 446), non sul fornitore come ogni altra
   scrittura sui documenti (`bloccaFornitore`, documenti.ts:1380). `motivoNonEliminabile` (riga 449)
   conta `bollettini_righe`/`bollettini_attese`, ma una verifica di bollettino concorrente (che blocca il
   fornitore) può aggiungere una riga/attesa e congelare un documento *dopo* il controllo e *prima* dei
   `deleteMany`. Esito: `bollettini_righe.documento_id` è `ON DELETE SET NULL` (schema.prisma:419) → riga
   sopravvive orfana su un documento cancellato; `bollettini_attese.documento_id` è `ON DELETE RESTRICT`
   (schema.prisma:442) → violazione FK e 500. Scenario: admin elimina mentre un utente verifica un
   bollettino dello stesso fornitore. **Correzione**: chiamare `bloccaFornitore(tx, id)` dentro la
   transazione, prima di `motivoNonEliminabile`. **Prova**: jest che simuli la riga aggiunta fra controllo
   e delete (o almeno una prova di regressione che verifichi il lock del fornitore).

2. **`cerca` non marca «annullata» e `sposta` non la rifiuta** — `app/backend/src/pratiche.ts:326` e
   `app/backend/src/documenti.ts:1611-1613`. La ricerca usata dallo *Sposta* fa
   `CASE t.stato WHEN 'fatturato' … ELSE 'attesa'` senza il ramo annullata: una pratica annullata appare
   col suo stato grezzo, contro D-207 «davanti a ogni stato ricavato». `sposta` controlla solo il fornitore
   di destinazione, non `annullata_il`: si può spostare un documento (soldi) su una pratica annullata, che
   poi non liquida né entra in Analisi. **Correzione**: in `cerca` aggiungere il ramo `annullata` (o
   escluderla) e in `sposta` rifiutare con 409 se `nuova.annullata_il` non è nullo. **Prova**: jest su
   `cerca` con pratica annullata + `sposta` verso pratica annullata → 409.

## Migliorie

3. **`annulla` non ricalcola il `calcolo` degli aperti** — `app/backend/src/pratiche.ts:388-407`.
   `annulla` scrive solo `annullata_*` e non chiama `salvaCalcolo`/`aggiornaPratica` (a differenza di
   `ripristina`, riga 424). La colonna `calcolo` dei documenti aperti conserva le provvigioni non azzerate.
   I soldi sono giusti: `provvigioneDocumento` (motore.ts:555) e `quotaSub` (motore.ts:303) azzerano al
   volo su `p.annullata && !congelato_il`. Ma la visualizzazione dei valori calcolati (documenti.ts:1522) e
   la fotografia dell'eliminazione (pratiche.ts:462-463) mostrano i valori vecchi. **Correzione**:
   `await salvaCalcolo(tx, BigInt(id))` dentro `annulla`, come in `ripristina`.

4. **Anomalie orfane dopo l'eliminazione** — `app/backend/src/pratiche.ts:445-481`. `elimina` non chiude
   le anomalie legate alla pratica (`anomaliaProvvigione`/`anomaliaGruppo`/`anomaliaScontoMedio` con
   `entita='pratica'`) né `lettura.fallita` sui PDF passati negli scartati (il pulsante Scarta lo fa,
   documenti.ts:1278). Restano anomalie aperte su entità eliminate. Il registro è append-only, ma le
   anomalie sono chiudibili: chiuderle evita voci fantasma in Stato del sistema. Minor.

5. **Elimina non disattivata a schermo se contabilizzata** — `app/frontend/.../VistaPratica.tsx:659-660`.
   Il menu mostra «Elimina» solo all'amministratore ma non la disattiva con spiegazione quando la pratica è
   contabilizzata (il 409 del server arriva solo dopo il click). Scostamento già segnalato nel resoconto
   del pacchetto; coerente con V12 (il server decide), ma diverge dal testo della decisione.

## Controlli superati (nessun rilievo)

- **Elimina**: 409 per congelato (`congelato_il`), liquidazione chiusa (`liquidazione_id`), riga di
  bollettino e decisione/attesa (`bollettini_righe`/`bollettini_attese`), tutto in una transazione con
  `FOR UPDATE` sulla testata; ordine di cancellazione corretto per le FK (correzioni → righe → note → altri
  documenti → testata); nessun `ON DELETE CASCADE` nuovo verso tabelle contabili. PDF in scartati con la
  stessa via dello Scarta, con `abbinato_pratica_id` azzerato. Fotografia completa nel registro. Permesso
  `provvigioni.elimina` + ruolo amministratore/superutente controllati sul server (accesso.ts:210 e
  pratiche.ts:442), nessun IDOR.
- **Nota di credito su fattura di altra pratica**: impossibile per costruzione — `importoValido` impone
  `f.testata_id === testata_id` (documenti.ts:1419). Il caso chiesto dal prompt non è raggiungibile.
- **Annulla/Ripristina**: motivo obbligatorio lato server; già annullata → 409; ripristino ricalcola con
  `aggiornaPratica`; congelati mai toccati (guardie su `congelato_il`, D-183); esclusioni coerenti in
  Oggi (`pagamentiDaSollecitare`), liquidazioni (`righeLiquidazione`), Analisi (`fattiAnalisi`) e
  auto-abbinamento (`praticaPerOrdine`); anomalia «pratica annullata» su bollettino e coda.
- **Migrazione** `20261117140000_pratica_annulla`: additiva, FK `annullata_da` → `utenti` `ON DELETE
  RESTRICT`, coerente con schema.prisma:266.

## Riepilogo

1. Elimina: blocchi e transazione corretti, permesso e 409 giusti, niente IDOR né cascate contabili.
2. Un rilievo di concorrenza: `elimina` non blocca il fornitore → corsa con la verifica del bollettino.
3. `cerca` non marca «annullata» e `sposta` non rifiuta la pratica annullata: incoerenza con D-207.
4. `annulla` non ricalcola il `calcolo` degli aperti (i soldi restano giusti, display e fotografia no).
5. Anomalie orfane dopo l'eliminazione (registro append-only, ma le anomalie sono chiudibili).
6. Migrazione e FK `annullata_da` corrette; nota su fattura di altra pratica impossibile (D-54).
7. Prove jest 9/9 e suite a 0 KO: coprono annulla/ripristina, 400/403/409, elimina, anomalie.
8. Da correggere: punti 1 e 2. Migliorie: punti 3, 4, 5.
