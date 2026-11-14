# Agenzie del vecchio CRM «da confermare» nel flusso (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1**. Prima leggi `agenzia-nel-flusso.md` e `resoconto-agenzia-nel-flusso.md` (modifiche non committate nell'albero, stessi file).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_confermare` (crealo, migrazioni, poi cancellalo). **Non scrivere su `decobrands_db`**: migrazione e comandi li lancia Claude Code. Mai 8001/8002, Integra mai. Niente commit.

## Decisione di Ugo (D-159, proponila nel resoconto)
Le 1587 agenzie importate dal vecchio CRM **restano** nel database ma sono **«dal vecchio CRM, da confermare»**. Quando servono a un documento l'operatore **sceglie**: le usa così come sono oppure le configura. Alla prima conferma diventano agenzie normali.

## Cosa fare
1. **Schema** (consentito in questo pacchetto): colonna `interscambio.da_confermare boolean NOT NULL DEFAULT false` con migrazione Prisma nuova (`app/backend/prisma/migrations/<data>_agenzie_da_confermare`). La migrazione **marca `true`** le agenzie importate dal vecchio CRM non ancora usate: riconoscile come le riconosce `--correggi-date` in `prisma/import-vecchio-crm.ts` (leggilo) — mai quelle create a mano o usate in periodi chiusi. L'import con `--aggiungi` le crea già con `true`.
2. **Server** (V12, V13):
   - dove si cerca l'agenzia per la data del documento (abbinamento, `documenti.ts` `abbina`, `proposta.ts`, motore se serve), un'agenzia `da_confermare` **non vale da sola**: l'apertura della pratica risponde 409 con un codice nuovo (es. `agenzia_da_confermare`) e i dati dell'agenzia (codice, sconto, subagente, valido dal) invece di usarla. Le pratiche e i calcoli già esistenti non cambiano (verifica che il motore delle provvigioni non scarti agenzie già usate: la marcatura è solo su quelle mai usate).
   - rotta `POST clienti/:id/agenzie/:aid/conferma` (permesso delle agenzie, quello di `FormAgenzia`): mette `da_confermare=false`, registro, una transazione con `FOR UPDATE`.
   - modificare un'agenzia `da_confermare` con la rotta che già usa `FormAgenzia` la conferma anche (`da_confermare=false`).
3. **Frontend**:
   - *Apri la pratica* (`VistaDocumento.tsx`, `ApriPratica`): al 409 `agenzia_da_confermare` riquadro «Agenzia dal vecchio CRM, da confermare: codice 45172 · sconto 0 % · subagente Maurizio Bastasin · dal …» con due pulsanti: **«Usa questa»** (conferma e riprova ad aprire la pratica) e **«Configura»** (apre `FormAgenzia` in modifica di quell'agenzia, con cliente/fornitore/codice bloccati; al salvataggio conferma e riprova). Senza permesso: pulsanti spenti con il motivo nel `title`. Il caso «nessuna agenzia» resta quello del pacchetto precedente («Aggiungi l'agenzia»).
   - Nella pagina Clienti, scheda Agenzie: le agenzie da confermare hanno il segno «da confermare» (stato in attesa) e un'azione «Conferma». Filtro solo se è una riga.
4. **Prove nel browser rotte dal pacchetto precedente** (giro `app_documenti app_clienti app_pratica`):
   - `strumenti/prove/app_documenti.py` riga ~217: `NameError: name 'scheda_errore' is not defined` (blocco nuovo spostato prima della definizione).
   - `strumenti/prove/app_pratica.py` riga ~189: dopo il submit della modale `.modulo-errore:not([hidden])` non compare: probabile che l'agenzia mancante ora mostri «Aggiungi l'agenzia» al posto dell'errore. Capisci se è (a) app o (b) prova superata e correggi.
   - Ricorda il limite di 10 accessi per utente nelle prove (D-41).

## File ammessi
`app/backend/prisma/schema.prisma`, una migrazione nuova, `app/backend/prisma/import-vecchio-crm.ts`, `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/src/clienti.ts`, `app/backend/src/motore/**` (solo se serve, scrivilo), i loro spec in `app/backend/test/`, `app/frontend/componenti/FormAgenzia.tsx`, `app/frontend/componenti/FormModal.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/app/(app)/clienti/**`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, `strumenti/prove/app_pratica.py`, `strumenti/prove/app_clienti.py`, il resoconto. Vietati: seed, spec, piano.

## Fine
- `npx prisma migrate deploy` e `npx prisma generate` sul database di prova; `npx tsc --noEmit` backend e frontend; jest delle suite toccate, una per volta (anche `motore` se lo tocchi).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_clienti app_pratica` (timeout 10 min), 0 KO, due giri.
- Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-agenzia-da-confermare.md`: come riconosci le agenzie da marcare e quante sarebbero su `decobrands_db` (query di sola lettura che posso lanciare io), «Da documentare» (§5, §7.9, §19 D-159).
