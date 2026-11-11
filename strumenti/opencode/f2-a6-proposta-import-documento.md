# F2-A6 — Proposta del documento con l'import da Integra (D-111, D-112)

Lavoro da **DeepSeek V4 Pro** (`deepseek/deepseek-v4-pro`), una sessione sola. Leggi `CLAUDE.md` e
`AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`javascript-typescript-jest`, `nextjs-app-router-patterns`, `ui-ux-pro-max`, `accessibility`.
A fine lavoro carica davvero `owasp-security` e `ponytail-review`; applica i rilievi veri.

Dipende da F1-A11 (rotte `/api/integra/*`) e F1-A12 (`interscambio_storico`, servizio).

## Cosa si fa

La card del documento diventa il punto in cui l'anagrafica nasce, senza mandare l'operatore in
Integra o in Clienti.

### 1. `src/proposta.ts` resta **pura**

Non chiama il ponte. Il chiamante (`documenti.ts`) gli passa i candidati già cercati:

- `propostaDocumento(letto, contesto)` accetta `contesto: { fornitore_su_integra?: RigaIntegra[],
  cliente_su_integra?: RigaIntegra[], storico?: RigaStorico[] }`.
- Esiti nuovi, in ordine di priorità rispetto a quelli attuali:
  - `manca_rappresentanza`: cliente e fornitore riconosciuti, coppia nello storico **senza**
    subagente, nessuna agenzia valida alla data;
  - `fornitore_da_integra`: il fornitore letto **non è** in anagrafica ma una sola riga delle viste
    corrisponde (nome normalizzato o P.IVA); porta `{ id_integra, ragione_sociale, piva }`;
  - `cliente_da_integra`: fornitore riconosciuto, `codice_cliente`/P.IVA del cliente presenti nello
    storico o in una sola riga delle viste; porta i dati per proporre l'import, il subagente e lo
    sconto dello storico;
  - gli esiti di oggi (`manca_agenzia`, `certo`, `probabile`, `ambiguo`, `nessuno`, `doppio`,
    `bollettino`, `nuova`) restano e non cambiano significato.
- Più righe candidate = `ambiguo` con i motivi (come oggi), **mai** una scelta a caso.

### 2. `src/documenti.ts`

- Per la pagina e per il dettaglio: una query sola per la ricerca su Integra **per pagina**, e solo
  per i documenti che ne hanno bisogno (fornitore o cliente non riconosciuti). Se la ricerca non
  risponde entro 3 s si prosegue senza candidati: la card mostra l'esito di oggi.
- `GET /api/documenti` porta per riga: `manca_rappresentanza`, `fornitore_da_integra`,
  `cliente_da_integra` (booleani), calcolati dal server (V12).
- Il dettaglio `GET /api/documenti/:id` porta `proposta` con i dati dei candidati e dello storico.
- La registrazione continua a chiedere agenzia e scaglioni (D-87): **non** si allenta niente.

### 3. Pagine

- `documenti/VistaDocumento.tsx`, card *Azione proposta*:
  - `fornitore_da_integra` → «Il fornitore non è in anagrafica. In Integra c'è: *nome, P.IVA*» +
    pulsante **Importa da Integra**; dopo l'import la proposta si ricalcola e compare *Mancano gli
    scaglioni* con il link alla scheda del fornitore (non blocca il giro, lo spiega).
  - `cliente_da_integra` → «Il cliente *nome* non è in anagrafica» + *Importa da Integra* (o
    *Importa dal vecchio CRM* quando il candidato è in `soggetti_storico`) + il riquadro «Dal
    vecchio CRM: subagente X, sconto Y%» e *Configura l'agenzia* già precompilata.
  - `manca_rappresentanza` → «Questo fornitore non è rappresentato per questo cliente: senza
    agenzia il documento non entra in una pratica» + *Configura l'agenzia*.
- `documenti/VistaDocumenti.tsx`: pillola `In Integra` / `Non rappresentato` accanto al livello.
- Dopo ogni import si ricaricano documento e lista (pattern D-94: l'elenco sta nel layout).
- Testi in italiano semplice, accessibili: il pulsante ha un nome che dice cosa fa, l'esito non è
  affidato solo al colore.

## Prove

- `test/proposta.spec.ts`: ogni esito nuovo, con candidati iniettati (0, 1, più righe), e che gli
  esiti di oggi non cambino quando il contesto è vuoto.
- `test/documenti.spec.ts`: la lista porta i tre campi giusti; un documento con fornitore
  sconosciuto non fa più query per riga (conta le query o misura il tempo); il dettaglio porta i
  candidati; registrazione senza agenzia ancora 409.
- Browser: percorso in `app_documenti.py` (documento → *Importa da Integra* → scaglioni → agenzia
  precompilata → *Registra*), 0 KO a 1440 e 768 px. Il percorso completo con dati veri è F2-A7.
- `npx jest --runInBand` suite per suite; `npx tsc --noEmit` in backend e frontend.
- Schermate in `%TEMP%\f2-a6` e **guardale**.

## Regole

- Nessun calcolo nel browser; nessuna scelta automatica quando i candidati sono più di uno.
- Nessuna modifica al motore, a `interscambio` o a D-87.
- Una transazione per l'import (la fa F1-A11): qui si chiama la rotta, non si scrive a mano.
- Niente librerie nuove; codice minimo (ponytail).
- Italiano semplice; commenti con `// D-111` / `// D-112`; niente commit, push, `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f2-a6.md`: file toccati, forma del contesto e degli esiti,
come si comporta ogni caso a schermo, prove con numeri, schermate, controlli caricati, dubbi, righe
per spec/piano/avanzamento (non applicarle).
