# F1-A11 — Anagrafica su richiesta da Integra (D-111)

Lavoro da **DeepSeek V4 Pro** (`deepseek/deepseek-v4-pro`), una sessione sola, senza sottoagenti.
Leggi `CLAUDE.md` e `AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nestjs-best-practices`, `prisma-client-api`, `owasp-security`,
`javascript-typescript-jest`. A fine lavoro carica davvero `owasp-security` e `ponytail-review`;
applica i rilievi veri.

## Cosa si fa

L'anagrafica cresce **quando un documento la chiede**. Si tolgono le creazioni massive dalla
sincronizzazione e si aggiunge l'import puntuale.

### 1. `src/integra.ts` — aggiorna, non crea

- Via i rami che creano `clienti` e `fornitori` (righe ~180-240: `clienti.create`,
  `fornitori.create`, `nuovi++`). Restano: lettura incrementale, versioni quando un campo che conta
  cambia (D-46), disattivati, anomalie (`integra.*`), `servizi_esecuzioni`, registro.
- `ConteggioVista.nuovi` resta nella risposta ma vale sempre 0; il testo del giro non deve dire
  «nuovi». Una riga non trovata in anagrafica **non è un'anomalia**: si ignora (la importa chi ha
  il documento).
- Le prove esistenti che contano i nuovi vanno aggiornate: la sincronizzazione **non deve più
  creare nulla** (prova esplicita).

### 2. `src/anagrafica-integra.ts` (nuovo) + rotte

- `cerca(tipo, q)`: legge la vista (`integra_v_clienti`/`integra_v_fornitori`) con **LIMIT 10**;
  ordine: `codice` o `codice_master` esatto → `piva` normalizzata → ragione sociale `ILIKE`.
  Esclude chi è già in `codici_esterni`. **Nessun conteggio, nessuna scansione completa** (il ponte
  è lento: una `exists` correlata ha superato i 120 s). Tempo massimo 3 s: oltre, risposta
  `{errore: 'ponte lento'}` e lo dice la pagina.
- `importa(tipo, idIntegra)` in **una transazione**:
  1. rilegge la riga dalla vista per id (mai fidarsi di quello che arriva dal browser);
  2. se `codici_esterni (integra, tipo, codice)` esiste → `{gia_presente: true, id}`, nessuna scritta;
  3. se esiste già un **soggetto** con la stessa P.IVA/CF normalizzata → gli si aggiunge il
     **ruolo** (nuovo `clienti`/`fornitori` con `soggetto_id`), non un secondo soggetto;
  4. altrimenti crea soggetto (`codice` dalla sequenza `C0000nn`, identità dal master) + ruolo +
     versione iniziale (`fonte='integra'`) + `codici_esterni` (`etichetta` = codice del ruolo);
  5. evento `crud.create` su `cliente`/`fornitore` con `{etichetta, codice, id_integra}`.
- Rotte: `GET /api/integra/cerca?tipo=&q=` e `POST /api/integra/importa`, entrambe
  `@Richiede('dati.importa')`.
- Permesso nuovo in `accesso.ts`: `'dati.importa': { area: 'dati', testo: 'Importare
  un\'anagrafica da Integra', minimo: 'operatore' }`. Non serve una pagina.
- Chi non ha il permesso riceve 403 con il messaggio standard; la pagina spegne il pulsante (lo fa
  F1-A13/F2-A6, qui solo il server).

## Prove

- `test/integra.spec.ts` (aggiornate): il giro **non crea** clienti/fornitori; versioni e anomalie
  come prima.
- `test/anagrafica-integra.spec.ts` (nuovo): crea cliente da vista; crea fornitore; **ruolo
  aggiunto** a un soggetto che era già cliente (stessa P.IVA); idempotenza per codice e per P.IVA;
  `cerca` massimo 10, codice esatto per primo, esclusi quelli già importati; 403 senza
  `dati.importa`; `tsc` pulito.
- Prova sul ponte vero (o finto) che una ricerca non impieghi più di 3 s e non legga più di 10
  righe.

## Regole

- Il server ricarica e ricontrolla tutto: l'id della vista arriva dal browser, il resto no (V12).
- Una operazione, una transazione (V13); niente query dentro un ciclo.
- Niente import massivo, niente pulsante «importa tutti»: se ti viene voglia, è D-111 che lo vieta.
- Non toccare `proposta.ts` né le pagine (sono F2-A6/F1-A13). Niente librerie nuove.
- Italiano semplice; commenti con `// D-111`; niente commit, push, `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a11.md`: file toccati, forma delle rotte, come si comporta
ogni caso (nuovo, ruolo aggiunto, già presente), prove con numeri, tempi della ricerca sul ponte,
controlli caricati, dubbi, e le righe per spec §19/piano/avanzamento (non applicarle).
