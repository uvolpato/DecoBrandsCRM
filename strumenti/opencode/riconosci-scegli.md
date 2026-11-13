# Fornitore e cliente: ricerca nel CRM e in Integra, scelta dell'operatore se non è certo (13/11/2026)

**Esecutore: DeepSeek V4 pro** · decisione di Ugo durante il giro con i documenti veri (**D-152**). Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002; **Integra (192.168.239.49) mai**: nelle prove si usa il ponte finto, come fanno già le prove di `proposta.spec.ts`/`clienti.spec.ts`). **Non lanciare le prove nel browser** (le lancia Claude Code): solo `py_compile`. Scrivi subito `strumenti/opencode/resoconto-riconosci-scegli.md`. Massimo 2 ore.

## Oggi
`app/backend/src/proposta.ts` (~righe 402–431): fornitore e cliente si cercano prima nel CRM (codice del fornitore, P.IVA, ragione sociale normalizzata, D-71, D-91, D-106, D-124); se il fornitore non c'è si guarda Integra (`contesto.fornitore_su_integra`) e **solo con una riga** si propone `fornitore_da_integra`; con 0 o più righe niente (D-111: mai una scelta a caso). Il cliente: storico (D-112) o una riga di Integra (`cliente_da_integra`). La pagina del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`) mostra la proposta; c'è già `componenti/CercaInIntegra.tsx` e l'import dal documento nella stessa transazione (D-133).

## Decisione D-152 (Ugo, 13/11/2026)
Dopo la lettura il sistema cerca fornitore e cliente **in entrambe le fonti** (anagrafica del CRM e viste di Integra), per P.IVA (con o senza prefisso del paese) e per ragione sociale normalizzata:
- **riconoscimento certo** → si usa senza chiedere: P.IVA uguale a **un solo** soggetto del CRM; oppure, se nel CRM non c'è, **una sola** riga di Integra (come oggi: si propone l'import);
- **altrimenti** (nessuno, o più candidati, o solo somiglianze di nome) → la pagina del documento mostra **l'elenco dei candidati** (massimo 10 per fonte), ognuno con la **fonte** (CRM / Integra), ragione sociale, P.IVA, città se c'è, e perché è candidato (P.IVA uguale, nome simile); l'operatore **sceglie**:
  - un candidato del CRM → si collega;
  - un candidato di Integra → si **importa e si collega nella stessa transazione** (riusa l'import di D-133/D-111, con il permesso `dati.importa`; senza permesso il candidato si vede ma non si importa, con la nota);
  - «Nessuno di questi» → resta da scegliere a mano con la ricerca normale (`CampoRicerca` del fornitore/cliente, più *Cerca in Integra*).
- La scelta non è mai automatica fra più candidati (D-111 resta). Nessun calcolo nel browser (V12): candidati e motivo li prepara il server.
- Se Integra non risponde: candidati solo dal CRM e una nota «Integra non raggiungibile» (niente errore che blocca la pagina).

## Da fare
1. Backend: in `proposta.ts` (e dove si preparano `fornitore_su_integra`/`cliente_su_integra`) restituisci `candidati_fornitore` e `candidati_cliente` (fonte, id CRM o id Integra, ragione sociale, P.IVA, città, motivo) quando il riconoscimento non è certo. Riusa le funzioni di normalizzazione già presenti (`riconosciClienteDai`, D-71). Rotta per **scegliere**: se esiste già quella del D-133 per collegare/importare dal documento, riusala; altrimenti una sola rotta nuova `POST /api/documenti/:id/scegli` `{ ruolo: 'fornitore'|'cliente', fonte: 'crm'|'integra', id }` con `@Richiede('provvigioni.modifica')` (+ `dati.importa` per Integra), una transazione (V13), `SELECT … FOR UPDATE` sul documento, evento nel registro, poi ricalcolo della proposta.
2. Frontend: in `VistaDocumento.tsx` un riquadro «Fornitore da scegliere» / «Cliente da scegliere» con l'elenco dei candidati (riusa `DataTable` compatta o `Elenco`, nessun componente nuovo se non serve) e il pulsante *Scegli*; la fonte come etichetta (`Stato` o classe esistente). Fuoco e lettore di schermo come le altre finestre.
3. Guida (`app/frontend/lib/guida.ts`, Documenti, «da sapere»): una frase sulla scelta fra i candidati.

## Prove
- jest: `test/proposta.spec.ts` (certo CRM; certo Integra; due CRM con la stessa P.IVA → candidati; nome simile → candidati; Integra giù → solo CRM con la nota), `test/documenti.spec.ts` (scelta CRM; scelta Integra → importato e collegato nella stessa transazione; senza `dati.importa` → 403), una per volta, su `decobrands_test_scegli` (creato e cancellato da te).
- `npx tsc --noEmit` backend e frontend.
- `strumenti/prove/app_documenti.py`: aggiungi un controllo (candidati visibili, scelta che collega) **senza lanciarlo**: `py_compile`.

## Documentazione (in questo pacchetto)
`specifica-crm-provvigioni.md`: riga **D-152** nel §19 (6 colonne; Chi «Ugo (collaudo 13/11/2026)»; Dove §6.5, §7.9, `proposta.ts`, `VistaDocumento.tsx`), *Perché* in §6.5/§7.9; versione 8.81 → **8.82** (controlla prima che D-152 sia libero). `python3 strumenti/genera-pagine-doc.py`.

## File ammessi
`app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/src/anagrafica-integra.ts`, `app/backend/test/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/componenti/CercaInIntegra.tsx` (solo se serve), `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, `specifica-crm-provvigioni.md`, `prototipo-crm/specifica.html` (rigenerata), il resoconto. Carica davvero `owasp-security`, `postgresql-code-review` (se scrivi SQL), `ponytail-review`, `caveman`.
