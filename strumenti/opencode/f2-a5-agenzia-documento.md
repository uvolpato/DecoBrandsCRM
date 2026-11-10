# Prompt per OpenCode — F2-A5 Agenzia mancante: configurarla dal documento

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da **Opus**
(stati e abbinamento del documento): usa **DeepSeek V4 Pro** (`deepseek/deepseek-v4-pro`), una
sessione sola, senza sottoagenti.

---

Leggi `CLAUDE.md` e `AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nestjs-best-practices`, `prisma-client-api`, `nextjs-app-router-patterns`,
`ui-ux-pro-max`, `accessibility`, `javascript-typescript-jest`, `playwright-best-practices`.
A fine lavoro carica davvero `owasp-security` e `ponytail-review`; applica i rilievi veri.

## La regola (Ugo, 09/11/2026)

Un documento per un cliente che **non ha l'agenzia con quel fornitore** non può essere associato a
una pratica: l'operatore deve configurare l'agenzia (subagente, codice cliente, sconto) — è normale
al primo ordine di quella coppia. Oggi il server lo blocca con un 409 solo alla registrazione
(`documenti.ts`, circa riga 1088: «Il cliente non ha un'agenzia con questo fornitore alla data
dell'ordine: aggiungila in Clienti»). Il controllo resta; va **anticipato nella proposta** e va dato
il percorso per configurarla **dal documento**, senza girare su Clienti e tornare.

## Cosa fare

### 1. Server — la proposta (`src/proposta.ts`)
- Nuovo esito `manca_agenzia`. Quando il documento è di un tipo che entra in una pratica (ordine,
  conferma, fattura, nota di credito), **cliente e fornitore sono riconosciuti**, ma non esiste un
  `interscambio` valido **alla data del documento**, la proposta è `manca_agenzia` al posto di
  `certo`/`probabile` (o `nessuno`).
- `Proposta` porta i dati per agire: `agenzia_mancante: { cliente_id, fornitore_id, cliente,
  fornitore, codice_cliente, data }` (codice cliente = quello letto dal documento, se c'è; data =
  quella del documento).
- Gli altri esiti (doppio, bollettino, proforma/pagamento/altro, cliente non riconosciuto) restano
  come sono. Il controllo vero in `documenti.ts` resta su **tutte** le strade (registrazione
  manuale, spostamento fra pratiche, abbinamento di un file in coda): verificalo e aggiungi le
  prove che mancano.
- Nessuna migrazione, nessun endpoint nuovo: l'agenzia si crea con `POST /api/clienti/:id/agenzie`.

### 2. Server — la lista (`src/documenti.ts`, `GET /api/documenti`)
- Ogni riga porta `manca_agenzia: boolean`, calcolato dal server (V12) con la stessa
  risoluzione cliente/fornitore della proposta e **una sola query** per pagina di `interscambio`
  (niente query per riga).
- Filtri, conteggi e ordine non cambiano.

### 3. Pagine
- **`componenti/FormAgenzia.tsx`** (nuovo): estrae la finestra dell'agenzia dalle funzioni
  `nuovaAgenzia` e `modificaAgenzia` di `clienti/VistaClienti.tsx`, così i due punti usano lo
  stesso form. Proprietà: cliente (id e nome), agenzia esistente o `null`, fornitore fisso
  facoltativo, valori iniziali (codice cliente, data), `onSalvata`. I messaggi d'errore restano
  quelli del server. Aggiungilo al catalogo `/componenti` con la firma.
- **`documenti/VistaDocumento.tsx`**: nella card *Azione proposta*, con esito `manca_agenzia`,
  il testo «Il cliente non ha un'agenzia con questo fornitore: senza, il documento non entra in
  una pratica. È normale al primo ordine.» e il pulsante **Configura l'agenzia**. La finestra ha
  cliente e fornitore fissi e «Dal» = data del documento; salvando si ricaricano documento e
  lista, e la proposta torna normale (l'azione *Registra* si abilita).
- **`documenti/VistaDocumenti.tsx`**: pillola `Manca l'agenzia` sulla riga (componente `Stato`,
  variante attesa), accanto al livello; sparisce dopo la configurazione.
- **Clienti**: la scheda continua a funzionare con il form nuovo (stessi campi, stessi messaggi,
  creazione e modifica; l'eliminazione resta dov'è).
- **Guida** `lib/guida.ts`: in *Documenti* e *Clienti* la regola e il pulsante, in italiano
  semplice. Aggiorna il catalogo se cambi la firma di un componente condiviso.
- Accessibilità (D-64): etichette, fuoco, tastiera; la pillola non deve essere l'unico segno.

### 4. Prove
- `test/proposta.spec.ts`: agenzia valida alla data → esito normale; agenzia assente → 
  `manca_agenzia` con i dati giusti; agenzia presente ma **non valida alla data** → `manca_agenzia`;
  cliente non riconosciuto → esito attuale, senza `agenzia_mancante`.
- `test/documenti.spec.ts`: senza agenzia il documento non entra in pratica su **tutte** le strade
  (creazione, spostamento, abbinamento); creata l'agenzia via API, la registrazione riesce;
  `GET /documenti` porta `manca_agenzia` giusto e i conteggi non cambiano.
- Browser `strumenti/prove/app_documenti.py`: aggiungi il percorso (documento senza agenzia →
  pillola in lista → *Configura l'agenzia* → cliente e fornitore fissi → salva → il documento si
  registra); rilanciato 0 KO. Rilancia anche `app_clienti.py` (form estratto) e `app_guida.py`.
- `npx jest --runInBand` **suite per suite**, 0 KO; `npx tsc --noEmit` in backend e frontend.
- Schermate 1440 e 768 in `%TEMP%\f2-a5` e **guardale**.

## Regole
- Calcoli e stato solo dal server (V12); niente valori dal browser.
- Nessuna migrazione, nessuna tabella nuova, nessuna libreria nuova. Codice minimo (ponytail).
- Italiano semplice; commenti con `// D-106`; niente commit, push, `.env`.
- Prove su `decobrands_test`; non toccare i server sulle porte 8001/8002 né `decobrands_db`.
- Se il form condiviso rompe le prove di Clienti, sistemalo: non duplicare il form.

## Resoconto
Scrivi `strumenti/opencode/resoconto-f2-a5.md`: file toccati, forma della proposta e del campo
`manca_agenzia`, come funziona il percorso, prove con numeri, schermate, controlli caricati, dubbi,
e le righe da mettere in `specifica-crm-provvigioni.md` §19 (**D-106**), piano e
`avanzamento-app.md` (non applicarle).
