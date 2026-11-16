# Resoconto — Importo calcolato o letto nelle righe dei documenti (15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/importo-calcolato.md`.
Problema: in *Correggi i dati letti* l'importo di riga è sempre una cella modificabile, anche quando
non è stato letto; non si distingue il valore letto (da correggere) da quello calcolato
(quantità × prezzo × (1 − sconto/100)), e per una riga letta con importo discorde non c'è il
pulsante per usare il calcolato.

## Cosa ho fatto

1. **Importo calcolato o letto** (`VistaDocumento.tsx`, solo tabella non bollettino):
   - *Calcolato* (importo vuoto): cella grigia «calcolato · 26,82 €», non modificabile, si aggiorna
     da sola al cambio di quantità/prezzo/sconto (riusa `importoCalcolato`, nuova, e la classe
     `td.calcolato` già presente in `stile.css`).
   - *Letto* (importo presente): cella normale modificabile. Se discorde dal calcolato (≥ 0,01 €),
     cella in arancio (`.importo-discorde`) con l'avviso già esistente come tooltip
     («quantità × prezzo … diverso dall'importo») e il pulsantino «Usa 26,82 €» che svuota l'importo
     (la riga torna calcolata). Svuotando l'importo a mano la riga torna calcolata.
2. **Server (V12)**: già corretto, nessuna modifica. Il browser manda l'importo solo se letto/digitato
   (vuoto se calcolato): `valoreCampo('')` → `null` → il campo non si salva; al ricalcolo
   `importoRigaLetta`/`fattoreSconto` (`proposta.ts`) usano quantità × prezzo × (1 − sconto/100).
   Nessun importo calcolato dal browser viene salvato.
3. **Rilettura dei documenti 5–9** (stato `da_controllare`): il pulsante **«Rileggi il documento»**
   è già visibile per `da_controllare` ed `errore` (`VistaDocumento.tsx` azioni, `POST /api/documenti/:id/rileggi`).
   Ugo la fa dall'interfaccia: apre il documento e usa il pulsante in alto a destra (prima la conferma
   con casella «Ho capito: i dati letti verranno riscritti»). Nulla da aggiungere.
4. **Guida** (`guida.ts`): due righe nuove nella finestra *Correggi i dati letti* — «Importo calcolato
   o letto» e «Importo diverso dal calcolato».

## File toccati

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (`importoCalcolato` + cella `cellaImporto`).
- `app/frontend/app/stile/stile.css` (`.importo-discorde`, `.usa-calcolato`; `td.calcolato` già c'era).
- `app/frontend/lib/guida.ts` (due righe).
- `app/backend/test/documenti-lettura.spec.ts` (due prove nuove).
- `app/backend/test/proposta.spec.ts` (una prova nuova in `controlliFissi`).

## Prove (0 KO)

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest su `decobrands_test_importo_calc` (creato, migrato, cancellato alla fine):
  - `proposta.spec.ts` + `documenti-lettura.spec.ts`: **98/98** (3 nuove):
    - importo riga vuoto con sconto 10 → il server calcola 2 × 14,90 × 0,9 = 26,82, nessun rilievo `riga`;
    - importo riga letto discorde (30 vs 26,82) → resta scritto e resta il rilievo `riga`;
    - via PUT: importo vuoto → `righe[0].importo` null, `proposta.importo` 26,82, nessun campo `importo` salvato.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: nessun input nuovo oltre ai campi riga già validati da `valoreCampo` (parsa a numero,
  mai in SQL); il calcolo resta sul server (V12). Nessun rilievo.
- `ponytail-review`: `importoCalcolato` riusata da `importoRiga` e dalla cella; nessuna astrazione nuova.
  Niente da tagliare.

## Da documentare (testo pronto, a cura di chi chiude l'onda)

- **spec §7.9** (pagina documento / correzione): l'importo di riga è *calcolato* (cella grigia
  «calcolato», non modificabile, si aggiorna da solo) se non è stato letto; *letto* (modificabile) se
  il lettore o l'operatore l'ha scritto. Se il letto differisce dal calcolato (≥ 0,01 €) la cella è in
  arancio con l'avviso e il pulsante «Usa … €» che sostituisce il letto col calcolato (importo vuoto).
- **spec §19**: decisione nuova **D-179** «importo di riga calcolato o letto» + il perché (distinguere
  il valore letto, da controllare, da quello calcolato e non modificabile; un clic usa il calcolato
  quando il letto è discorde). Riafferma V12: l'importo calcolato non viaggia mai dal browser, il server
  ricalcola il vuoto.
- **piano**: attività F6 (ingresso documenti) — importo di riga calcolato/letto in *Correggi i dati letti*.

## Aperti / da segnalare

- Nessuno. Il server (V12) era già corretto: non ho toccato `documenti.ts` né `proposta.ts` (solo prove).
- Non ho lanciato prove nel browser (regole dell'onda): le lancia Claude Code a fine onda. Non ci sono
  prove `app_*.py` da aggiornare (nessun selettore cambiato).
