# Comandi di servizio per i dati già caricati + prova rotta (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (sblocca i documenti veri già caricati). Prima leggi i resoconti di `confronto-righe`, `riconosciuto-coerente`, `numero-ordine-fornitore`, `conferme-multiple`.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Su `decobrands_db` **solo letture** (i comandi su `decobrands_db` li lancia Claude Code); prove su `decobrands_test_servizio` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra. Niente commit.

## Da fare
Uno script unico di servizio `app/backend/prisma/sistema-dati.ts` (comando npm `servizio:sistema-dati`, stesso stile di `import-vecchio-crm.ts`: `--db decobrands_db`, `--prova` = tutto e poi rollback, una transazione, un evento nel registro con i conteggi, idempotente, mai sovrascrivere scelte a mano) che fa, per i dati caricati prima delle correzioni:
1. **Righe delle pratiche** (`confronto-righe`): per le pratiche con `ordini_fornitore_righe` vuote e documenti abbinati, copia le righe lette dei documenti abbinati come farebbe oggi `registra` (fase dal tipo). Esempio vero: OF/2026/001 con l'ordine AU276839 (51 righe).
2. **Fornitore riconosciuto** (`riconosciuto-coerente`): per i documenti da lavorare con `fornitore_id` null, risolvi il fornitore come all'apertura e salvalo solo se certo.
3. **Numero d'ordine del fornitore** (`numero-ordine-fornitore`, D-169): per le pratiche senza `numero_ordine_fornitore`, se il documento d'ordine abbinato ha il numero (campo letto `numero`/`numero_ordine_fornitore` di un documento di tipo ordine), scrivilo sulla pratica, controllando l'unicità fornitore + numero (in conflitto: non scrivere, rapporto).
4. **Normalizzazione dei codici articolo** (aperto di `confronto-righe`): togli gli zeri iniziali nel confronto (`chiaveRiga`/normalizzazione in `proposta.ts` e dove si confrontano i codici), solo se l'aperto è vero: scrivi il caso.
Stampa i conteggi per punto e l'elenco delle pratiche/documenti toccati.

## Anche
- La prova jest rotta da giorni: `app/backend/test/documenti-pratica.spec.ts` (1 KO, D-87 «scaglione» → testo «percentuali» cambiato con D-162 nella 0.2.5): allinea l'attesa al testo vero.

## File ammessi
`app/backend/prisma/sistema-dati.ts` (nuovo), `app/backend/package.json` (solo lo script npm), `app/backend/src/proposta.ts` e `app/backend/src/documenti.ts` (solo per riusare/esportare le funzioni e per il punto 4), `app/backend/test/**`, il resoconto `strumenti/opencode/resoconto-comandi-servizio.md` con il **comando esatto** da lanciare su `decobrands_db` e i conteggi della prova su `decobrands_test_servizio`. Vietati: schema, migrazioni, frontend, spec.

## Fine
- `npx tsc --noEmit` nel backend; jest delle suite toccate, una per volta (anche `documenti-pratica.spec.ts` a 0 KO).
- Prova dello script su `decobrands_test_servizio` con dati che riproducono i 3 casi; secondo lancio = 0 modifiche.
- Skill: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
