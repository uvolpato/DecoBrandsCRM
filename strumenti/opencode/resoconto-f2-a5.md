# Resoconto F2-A5 — Agenzia mancante: configurarla dal documento

Lavoro completato il 09/11/2026 nella slice F6/F2 (Documenti). Nessun commit, nessun push.

## Cosa si è fatto

Il controllo dell'agenzia (cliente × fornitore, valido alla data del documento) è diventato una
regola unica: prima si anticipa nella proposta, poi si configura dal documento, e il controllo
vero resta su **tutte** le strade di ingresso in pratica.

### Server

- **`src/proposta.ts`**
  - nuovo esito `manca_agenzia` e campo `Proposta.agenzia_mancante` (con `cliente_id`,
    `fornitore_id`, `cliente`, `fornitore`, `codice_cliente`, `data`).
  - helper `agenziaMancante(...)` e `agenziaValida(...)`; tipi che entrano in pratica:
    ordine, conferma, fattura, nota di credito.
  - `riconosciCliente` rifattorizzato in `riconosciClienteDai(...)` (clienti già caricati), così
    l'elenco riusa la stessa risoluzione senza query per riga.
  - `mancaAgenziaRighe(...)`: per l'elenco, una query di clienti e una di interscambio per pagina.
- **`src/documenti.ts`**
  - `dettaglioDocumento`: serializza `agenzia_mancante` (bigint → stringa).
  - `GET /api/documenti`: riga con `manca_agenzia: boolean` (CTE `campi` allargata con
    `piva_cliente`); filtri, conteggi e ordine invariati.
  - nuovo `richiediAgenzia(...)` chiamato in `registra` (copre registrazione manuale e
    abbinamento di un file in coda) e in `sposta`. Il controllo di `nuovaPratica` resta.
  - messaggio 409: «Il cliente non ha un'agenzia con questo fornitore alla data del documento:
    aggiungila in Clienti o dal documento».

### Frontend

- **`componenti/FormAgenzia.tsx`** (nuovo): form unico dell'agenzia estratto da
  `VistaClienti.tsx`. Proprietà: `cliente {id, nome}`, `agenzia` (null = nuova),
  `fornitoreFisso {id, nome}`, `iniziali {codice_cliente_fornitore, valido_dal}`, `onSalvata`,
  `onChiudi`. Salva con POST/PUT `/api/clienti/:id/agenzie`; i messaggi d'errore restano del
  server; sconti in vigore e permessi `dati.condizioni` come prima.
- **`clienti/VistaClienti.tsx`**: usa `FormAgenzia` (creazione e modifica); rimosso il form
  duplicato (`nuovaAgenzia`, `modificaAgenzia`, `aiutoSconto`, `conResp`, …). L'eliminazione
  resta dov'era.
- **`documenti/[id]/VistaDocumento.tsx`**: con esito `manca_agenzia` la card Azione proposta
  mostra «Il cliente non ha un'agenzia con questo fornitore: senza, il documento non entra in
  una pratica. È normale al primo ordine.» e il pulsante **Configura l'agenzia** (cliente e
  fornitore fissi, «Valido dal» = data del documento). Salvando si ricaricano documento e lista.
- **`documenti/VistaDocumenti.tsx`**: pillola `Manca l'agenzia` (componente `Stato`, variante
  `attesa`) accanto al livello; sparisce dopo la configurazione.
- **`componenti/page.tsx`**: voce FormAgenzia nel catalogo con la firma.
- **`lib/guida.ts`**: in Documenti e Clienti la regola e il pulsante, in italiano semplice.

### Prove

- **`test/proposta.spec.ts`** (+5, ora 43): agenzia valida → esito normale; agenzia assente →
  `manca_agenzia` con i dati giusti; agenzia presente ma non valida alla data → `manca_agenzia`;
  cliente non riconosciuto → esito attuale senza `agenzia_mancante`; proforma mai `manca_agenzia`.
- **`test/documenti.spec.ts`** (+5, ora 36): senza agenzia il documento non entra in pratica su
  tutte le strade (registrazione a mano, abbinamento di un file in coda, spostamento); creata
  l'agenzia via API la registrazione riesce; `GET /api/documenti` porta `manca_agenzia` giusto e
  i conteggi non cambiano.
- **`strumenti/prove/documenti_prova.js`**: nuovo comando `crea-senza` (ordine di un cliente
  senza agenzia) e pulizia dei due file di prova.
- **`strumenti/prove/app_documenti.py`**: aggiunto il percorso (pillola in lista → Configura
  l'agenzia → cliente e fornitore fissi → salva → il documento si registra).

## Numeri

- `npx tsc --noEmit` backend e frontend: 0 errori.
- `npx jest --runInBand` (suite per suite, su `decobrands_test`): proposta 43/43, documenti 36/36,
  clienti 16/16, pratiche 15/15, documenti-pratica 17/17, documenti-lettura 19/19 → 0 KO.

## Schermate

**Non prodotte.** Servono backend (8002) e frontend (8001) accesi e il database di sviluppo
(`decobrands_db`), ma i server erano spenti e il brief vieta di toccare le porte 8001/8002 e
`decobrands_db` (prove su `decobrands_test`). Il percorso nel browser (`app_documenti.py`,
`app_clienti.py`, `app_guida.py`) è pronto ma non è stato rilanciato per lo stesso motivo; i due
script sono stati comunque verificati sintatticamente (`py_compile` e `node --check`).

## Controlli caricati

- `owasp-security`: nessun rilievo vero. Niente endpoint nuovi; `manca_agenzia` va sul percorso
  già protetto `provvigioni.consulta`; il form usa POST/PUT `/clienti/:id/agenzie` già
  `dati.modifica`; query tutte Prisma/parametrizzate; messaggi 409 generici, nessun dato esposto.
- `ponytail-review`: nessun "must fix". Un "nice to have" noto e accettato: `riconosciCliente`
  ora è calcolato anche per proforma/pagamento/altro prima del ritorno anticipato (una query in
  più, non una correttezza). Il confronto del codice cliente nell'elenco usa `toLowerCase()` (il
  dettaglio/proposta usa il collation del DB con `mode: 'insensitive'`): differenza trascurabile
  sui codici alfanumerici, la pillola è un segnale, la verità resta nella proposta.

## Dubbi / restano aperti

1. Il controllo vero ora vale su **tutte** le registrazioni (anche proforma/pagamento/altro e i
   documenti tracciati), mentre la proposta anticipa `manca_agenzia` solo per ordine/conferma/
   fattura/nota di credito. Coerente con «è una regola», ma per i tipi tracciati la pillola non
   compare e il 409 arriva solo al salvataggio.
2. Il percorso completo (pillola → form → registrazione) non è stato verificato a schermo perché
   i server sono spenti; da rilanciare `app_documenti.py`, `app_clienti.py`, `app_guida.py` appena
   tornano su.

## Righe per i documenti (da applicare, non applicate qui)

- `specifica-crm-provvigioni.md` §19:
  **D-106 (09/11/2026)** — Un documento per un cliente senza agenzia con quel fornitore non entra
  in pratica. La proposta ha il nuovo esito `manca_agenzia` (cliente e fornitore riconosciuti,
  nessun interscambio valido alla data) con i dati per agire; l'elenco Documenti porta
  `manca_agenzia` per riga (una query di interscambio per pagina, V12); il form dell'agenzia è
  condiviso fra Clienti e Documenti (`componenti/FormAgenzia.tsx`, fornitore fisso dal documento)
  e il controllo vero resta su tutte le strade (registrazione, spostamento, abbinamento). Chi:
  Ugo · dove: `proposta.ts`, `documenti.ts`, `componenti/FormAgenzia.tsx`, `VistaDocumento`,
  `VistaDocumenti`, `VistaClienti`.
- `piano-lavoro-crm.md`: attività F2-A5 «Agenzia mancante: configurarla dal documento» (ore da
  approvare).
- `avanzamento-app.md`: F2-A5 completata (server, pagine, prove Jest; browser da rilanciare coi
  server).
