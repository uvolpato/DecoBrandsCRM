# F1-A13 — Scaglioni obbligatori e agenzia precompilata dallo storico (D-113, D-112)

Lavoro da **DeepSeek Flash** (`deepseek/deepseek-flash`), una sessione sola. Leggi `CLAUDE.md` e
`AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nextjs-app-router-patterns`, `vercel-react-best-practices`,
`ui-ux-pro-max`, `accessibility`, `javascript-typescript-jest`. A fine lavoro carica davvero
`owasp-security` e `ponytail-review`; applica i rilievi veri.

Dipende da F1-A11 (permesso `dati.importa`, import) e F1-A12 (tabella e servizio dello storico).

## Cosa si fa

Due regole diventano visibili e percorribili senza girare su altre pagine.

### 1. Fornitore senza scaglioni

- Il dettaglio fornitore (`GET /api/fornitori/:id`) porta `mancano_scaglioni: boolean` (nessuna
  versione in vigore oggi, calcolato dal server). `GET /api/fornitori/:id/percentuali` continua a
  dare `in_vigore` e `modificabile`.
- Nella pagina del fornitore, scheda *Percentuali*: se mancano, in alto un **avviso** chiaro —
  «Senza scaglioni le pratiche di questo fornitore non si aprono (D-87)» — con il pulsante
  *Configura gli scaglioni* che apre il form che c'è già (una versione, `dati.condizioni`).
- Chi non ha `dati.condizioni`: pulsante spento con il motivo («serve il livello responsabile in
  Dati»), nessun clic che finisce in 403.

### 2. Agenzia precompilata dallo storico

- `POST /api/clienti/:id/agenzie` accetta un campo facoltativo `storico_id`. Se c'è: si valida che
  la riga riguardi **lo stesso cliente e lo stesso fornitore** (altrimenti 400), si crea l'agenzia
  come oggi e, nella stessa transazione, `segnaUsata(tx, storico_id, interscambio.id, nota)`
  (servizio di F1-A12).
- `componenti/FormAgenzia.tsx`: quando si apre da un documento con il codice cliente letto, chiama
  `GET /api/interscambio/storico` e, se trova una riga **con subagente**, mostra in cima
  «Dal vecchio CRM: subagente X, sconto Y%» e precompila subagente, codice cliente e sconto (restano
  modificabili). Se la riga è **senza subagente**, niente precompilazione e il testo: «Questo
  fornitore non era rappresentato per questo cliente».
- Le chiamate allo storico sono **una sola** per apertura del form, non per tasto.

## Prove

- Server: `test/clienti.spec.ts` — `mancano_scaglioni` vero/falso; agenzia con `storico_id` valido
  → riga `usata` con `interscambio_id` e `usato_il`; `storico_id` di un'altra coppia → 400 e nessuna
  scritta; senza `storico_id` tutto come prima.
- Browser: `app_fornitori.py` (fornitore senza scaglioni → avviso → form → salva → l'avviso
  sparisce); `app_clienti.py` (form agenzia precompilato dallo storico e caso «non rappresentato»).
  Rilanciali entrambi, 0 KO, a 1440 e 768 px.
- `npx jest --runInBand` suite per suite; `npx tsc --noEmit` in backend e frontend.
- Schermate in `%TEMP%\f1-a13` e **guardale**.

## Regole

- I numeri e la validazione sono del server (V12); il browser manda solo le scelte.
- Una operazione, una transazione (V13).
- Non toccare `documenti.ts`, `proposta.ts` né `VistaDocumento.tsx`: i messaggi *Mancano gli
  scaglioni* e *Non rappresentato* sulla card del documento sono di F2-A6.
- Niente librerie nuove; riusa `FormAgenzia` e il form delle percentuali che ci sono.
- Italiano semplice; commenti con `// D-113` / `// D-112`; niente commit, push, `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a13.md`: file toccati, come si comporta ogni caso, prove con
numeri, schermate, controlli caricati, dubbi, righe per spec/piano/avanzamento (non applicarle).
