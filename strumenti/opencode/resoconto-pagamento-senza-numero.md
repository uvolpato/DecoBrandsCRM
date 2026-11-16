# Resoconto `pagamento-senza-numero`

Un pagamento (distinta di bonifico, foto dello schermo della banca) non ha un numero di documento.
Il salvataggio era bloccato solo dal frontend: il server già permetteva un pagamento senza numero.

## File toccati

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
  - `salva`: il numero resta obbligatorio per tutti i tipi tranne `pagamento` (e `bollettino`, che non
    ha il campo).
  - Etichetta del campo: «Riferimento (facoltativo)» per il pagamento, «Numero» per gli altri.
  - Titolo del pannello e della finestra *Correggi i dati letti*: per un pagamento senza numero compare
    «Pagamento del <data> · <importo>» (o il nome del file se non ci sono data e importo), con la nuova
    `titoloDoc`.
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`: stesso titolo nell'elenco della coda (colonna
  sinistra).
- `app/frontend/lib/guida.ts`: nel campo della finestra *Correggi i dati letti* la voce
  «Riferimento (facoltativo)» spiega che un pagamento può restare senza numero.
- `app/backend/test/documenti-lettura.spec.ts`: prova nuova «un pagamento senza numero si salva» sul PUT
  `/documenti/:id` (la correzione a mano).
- `strumenti/prove/app_documenti.py:649-654`: aggiornati i controlli della «Somma righe» alla nuova resa
  (`.sopra-riga.diversa`, testo «Somma righe …», nessun «diversa di»).

## Punti dove il numero mancava e ora regge

- **Salvataggio (Correggi i dati letti)**: era l'unico blocco vero; rimosso per il pagamento.
- **Etichetta del campo**: ora «Riferimento (facoltativo)» per il pagamento.
- **Titolo** della scheda, dell'elenco coda e della finestra: `titoloDoc` mostra data + importo o file.
- **Oggi** (`oggi.ts`): già a posto, senza numero mostra il nome del file (prova `oggi.spec.ts` già
  verde). Non toccato.
- **Doppioni**: `controllaNumero` esce subito per i pagamenti (non sono né fiscali né ordini, D-60);
  il doppione resta solo per impronta del file. Non serve il controllo fornitore+data+importo, non
  bloccava comunque.
- **Righe**: un pagamento senza righe non blocca nulla, né sul server né sul frontend.

## Prove (0 KO)

- `npx tsc --noEmit` backend e frontend: puliti.
- `npx jest test/documenti-lettura.spec.ts test/documenti-pratica.spec.ts`: 55 passati, 0 KO.
  - `documenti-lettura`: il PUT di un pagamento con numero vuoto salva (200) e toglie il campo numero.
  - `documenti-pratica`: il pagamento senza numero già si abbinava (201), la fattura senza numero resta
    400 (`registra`, non toccato).
- `python -m py_compile strumenti/prove/app_documenti.py`: ok.

## Da documentare

- D-… §19: «un pagamento non ha un numero di documento» → campo «Riferimento (facoltativo)» per il
  pagamento, titolo «Pagamento del <data> · <importo>» o file. (Decisione di Ugo 15/11/2026, da
  numerare.)
- §16.4 / guida della pagina Documenti: aggiunta la voce «Riferimento (facoltativo)».
