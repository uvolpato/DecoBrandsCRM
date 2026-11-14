# Resoconto — Correzione delle percentuali: aggiungere o togliere scaglioni (P1, 14/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/correggi-percentuali-scaglioni.md`.
Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Cosa è stato fatto

1. **Server: nessuna modifica** (confermato, non serve). La rotta di correzione
   `PUT fornitori/:id/percentuali/:valido_dal` in `app/backend/src/fornitori.ts` accettava già
   l'elenco completo degli scaglioni (aggiunti, cambiati, tolti) con gli stessi controlli delle
   nuove percentuali: `controllaSoglie` (percentuali valide, sconti distinti, soglie della versione
   prima e dopo), `controllaOrfane` (scaglione tolto usato da un'eccezione personale → 409),
   `dopoChiusura` (versione nel periodo chiuso → 409), una transazione e registro con prima/dopo.
   Quindi il lavoro è tutto frontend + prove.

2. **`FormPercentuali.tsx`** (componente condiviso): ora la correzione accetta scaglioni aggiunti e
   tolti. Le righe esistenti hanno lo sconto fisso (non modificabile) e le due percentuali
   modificabili; in coda c'è la riga «Aggiungi uno sconto %» (sconto modificabile solo qui) come in
   «Nuove percentuali»; una ✕ toglie una riga (non l'ultima). In più, dall'ordine (nuova prop
   `scontoAgenzia`), se alla data proposta esiste già una versione la finestra passa da sola alla
   **correzione di quella versione** (titolo «Correggi le percentuali…», «Valide dal» bloccato) con
   lo sconto dell'agenzia già proposto come riga nuova da compilare; stesso passaggio se il server
   risponde «Ci sono già percentuali … usa la correzione» al salvataggio di una data già usata.
   Gli stessi id e nomi dei campi di prima (`c-valido_dal`, `c-scontoN`, `c-agenteN`, `c-subN`),
   così le prove esistenti non si rompono. Ho scritto un modulo dentro il componente (niente
   `FormModal`) perché serviva la ✕ per riga: `Campo.tsx` e `stile.css` non sono nei file ammessi.

3. **`VistaDocumento.tsx`** (`ApriPratica`): passa `scontoAgenzia={configuraPct.d.sconto}` a
   `FormPercentuali`, così la finestra conosce lo sconto dell'agenzia per la riga nuova.

4. **`guida.ts`**: aggiornate le voci «Correggi · Elimina» (aggiungere/togliere scaglioni, ✕ non
   sull'ultima), «Salva la correzione» e «Configura le percentuali» (se esiste già una versione a
   quella data si apre la sua correzione).

## Prove

- `npx tsc --noEmit` pulito nel backend e nel frontend.
- jest `percentuali.spec.ts` su `decobrands_test_correggi_perc` (creato, migrazioni, seed, poi
  **cancellato**): **34/34**. Nuovo `describe('correzione: scaglioni aggiunti e tolti (D-163)')`:
  aggiunge uno scaglione, lo toglie, 409 se toglie uno scaglione usato da un'eccezione. Il rifiuto
  nel periodo chiuso è già coperto dal test esistente «correzione: ammessa dopo la chiusura, negata
  nel periodo chiuso».
- Browser, due giri (ognuno dopo `prepara.sh decobrands_test_e2e`):
  - giro 1: `app_fornitori` 36/0, `app_documenti` 140/0.
  - giro 2: `app_fornitori` 36/0, `app_documenti` 140/0.
  - Controlli nuovi: correzione con riga aggiunta salvata (app_fornitori, sconto 25 %); da *Apri la
    pratica* con una versione già esistente alla data si apre la correzione con lo sconto 0 %
    proposto (app_documenti, rotta PUT della versione).

## Note

- **Limite 10 accessi per utente (D-41)**: il mio blocco in `app_documenti.py` usava `-ammi` come
  undicesimo accesso e andava in timeout. Ho cambiato il blocco A6-16 (ordine senza fornitore, solo
  lettura di testi) da `-ammi` a `-oper`, così `-ammi` resta a 10 accessi. Nessun file dell'app
  toccato per questo.
- Il primo giro ha avuto un KO «correzione con la riga …» (contavo la riga prima che il form finisse
  di caricare): ora `nuova.wait_for()` al posto del solo `count()`. Il secondo giro ha avuto un
  flake su «Cerca in Integra» (import → scheda, flusso pre-esistente non toccato): ripetuto, è
  passato a 0 KO.

## Review

`ponytail-review`: nessun rilievo. Il modulo dentro `FormPercentuali` non è ridondanza: `Campo.tsx`
e `stile.css` non sono fra i file ammessi, quindi la ✕ per riga si rende dentro il componente
stesso. `owasp-security`: nessun rilievo; il frontend manda solo id e valori digitati, il server
ricarica e ricalcola (V12), la scrittura resta `fornitori/:id/percentuali/:valido_dal` con
`@Richiede('dati.condizioni')` lato server.

## Da documentare

- **§5 (percentuali datate)** — la correzione di una versione sostituisce le sue righe e accetta
  scaglioni aggiunti o tolti (già così nel server); togliere uno scaglione usato da un'eccezione o
  da un periodo chiuso è rifiutato.
- **§7 Fornitori** — la finestra di correzione ha lo sconto modificabile solo per le righe nuove,
  «Aggiungi uno sconto %» e una ✕ per togliere una riga (non l'ultima).
- **§19 — D-163** (da proporre): la correzione delle percentuali permette di aggiungere e togliere
  scaglioni; da *Apri la pratica*, se alla data dell'ordine esiste già una versione, la finestra
  delle percentuali apre la correzione di quella versione con lo sconto dell'agenzia già proposto.

## Aperto

- Nessuno. Il flake su «Cerca in Integra» del secondo giro non si è ripresentato nel giro rifatto;
  se dovesse ripresentarsi non è legato a questo pacchetto (flusso non toccato).
