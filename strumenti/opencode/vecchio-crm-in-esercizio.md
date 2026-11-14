# Anagrafica del vecchio CRM nel database di lavoro, per ora (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo è fermo nel giro con i documenti veri).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`** (per l'URL usa il modo con `grep` scritto nelle regole, senza stamparlo). Prove solo su `decobrands_test_vecchio` (crealo, migrazioni, poi cancellalo). **Non eseguire tu l'import su `decobrands_db`: lo lancia Claude Code dopo il controllo.** Mai porte 8001/8002, Integra (192.168.239.49) mai. Niente commit.

## Perché
Ugo carica documenti veri (es. ordine ARTE WOHNACCESSOIRES → cliente Agri Aggio, codice 45172). Il fornitore ARTE **non è in Integra** (né nelle viste locali `public.integra_v_fornitori`) ma c'è nel vecchio CRM (`dati-crm-legacy/fornitori.json`, id 37, senza P.IVA) con 153 collegamenti, fra cui Agri Aggio / 45172 / subagente Maurizio Bastasin. Decisione di Ugo (D-156, da proporre nel resoconto): **per ora** si attinge anche all'anagrafica del vecchio CRM (fornitori, clienti, subagenti, collegamenti con codice cliente, sconti, subagente) per poter provare con dati reali; si **segna cosa manca in Integra** e lo si farà aggiungere. In esercizio la regola resta: un cliente/fornitore nuovo si inserisce prima in Integra e poi si trova nel CRM.

## Cosa esiste già
`app/backend/prisma/import-vecchio-crm.ts` (F1-A9, D-102, `specifica-anagrafica-soggetti.md` §7): import one-shot, una transazione, idempotente, scrive solo su `decobrands_import`, assume il database **vuoto** (`--sostituisci` fa `TRUNCATE`). Uscite in `dati-crm-legacy/import/` (conflitti, fusioni, scarti, riepilogo). Leggilo tutto.

## Cosa fare
1. Nuova modalità **additiva** dello stesso script (non un secondo script): `--db decobrands_db --aggiungi`.
   - Mai `TRUNCATE`, mai cancellare o modificare soggetti/ruoli/legami/documenti/pratiche già presenti.
   - Deduplica con quello che c'è: stessa P.IVA/CF → stesso soggetto (aggiunge il ruolo se manca, come `importa` di Integra in `src/anagrafica-integra.ts`, D-102); stesso codice esterno del vecchio CRM già presente → salta (idempotente: lanciato due volte non cambia nulla la seconda).
   - Ogni soggetto/ruolo creato porta il codice esterno con fonte del vecchio CRM (usa il meccanismo `codici_esterni` già usato dallo script) così si distingue da quelli di Integra.
   - Collegamenti cliente–fornitore (codice cliente, sconti, subagente, agente) e subagenti come fa già lo script, senza toccare quelli esistenti; un periodo chiuso o un'agenzia già presente per la stessa coppia non si tocca (rapporto nei conflitti).
   - Consentito su `decobrands_db` **solo** con `--aggiungi`; senza, il controllo attuale resta (`decobrands_import` soltanto). `--prova` fa tutto e poi rollback.
   - Una transazione (V13), un evento nel registro con i conteggi.
2. **Cosa manca in Integra**: a fine import scrivi `dati-crm-legacy/import/da-inserire-in-integra.csv` con i fornitori e i clienti presi dal vecchio CRM che non hanno corrispondenza nelle viste di Integra (`integra_v_fornitori`, `integra_v_clienti` dello stesso database, per P.IVA normalizzata e, senza P.IVA, per ragione sociale normalizzata): tipo, ragione sociale, P.IVA, città, codice vecchio CRM, numero di collegamenti. Se le viste non ci sono, la colonna dice «viste di Integra assenti».
3. Comando npm `import:vecchio-crm` invariato; documenta l'uso in testa allo script.

## Prove
- Su `decobrands_test_vecchio`: migrazioni, un soggetto già presente con la stessa P.IVA di un cliente del vecchio CRM e un fornitore già presente, poi `--aggiungi --prova` e `--aggiungi` due volte: la seconda non crea nulla; i dati presenti restano uguali; ARTE e il collegamento Agri Aggio/45172/Maurizio Bastasin ci sono. (Per puntare lo script al database di prova usa la variabile `DATABASE_URL` costruita con grep e sostituendo il nome del database, senza stamparla.)
- `npx tsc --noEmit` nel backend; jest delle suite toccate se ce ne sono.
- Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.

## File ammessi
`app/backend/prisma/import-vecchio-crm.ts`, `app/backend/package.json` (solo script npm se serve), `dati-crm-legacy/import/*` (uscite), il resoconto `strumenti/opencode/resoconto-vecchio-crm-in-esercizio.md` con: comando esatto da lanciare su `decobrands_db`, conteggi della prova, «Da documentare» (§19 D-156, `specifica-anagrafica-soggetti.md` §7). Vietati: schema, migrazioni, seed, `src/**` (salvo lettura), spec, piano.
