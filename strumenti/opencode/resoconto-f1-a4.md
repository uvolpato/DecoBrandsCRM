# Resoconto F1-A4 + F1-A7 — sincronizzazione da Integra

## File e rotte

### File creati/modificati
- `app/backend/src/integra.ts` — sincronizzazione, anomalie, service e controller.
- `app/backend/test/integra.spec.ts` — 14 prove.
- `app/backend/prisma/ponte-prova.sql` — DDL del ponte finto (`crm_viste`, tabelle `v_clienti`,
  `v_fornitori`).
- `app/backend/prisma/ponte-prova.ts` — crea/riempie `decobrands_ponte_prova` dai dati di prova.
- `strumenti/integra/viste-crm.sql` — proposta di viste per il sistemista (`postgres_fdw`,
  `USER MAPPING`, ruolo `crm_lettura`, domande aperte).
- `app/backend/src/registro.ts` — `apriAnomalia`/`chiudiAnomalia`, schemi `integra.*`.
- `app/backend/src/app.module.ts` — `IntegraController`, `IntegraService`.
- `app/backend/package.json` — script `ponte:prova`.
- `app/backend/.env.example` — `PONTE_URL`.
- `app/README.md` — come creare il ponte finto e impostare `PONTE_URL`.
- `specifica-crm-provvigioni.md` §4.5 — colonne, margine, disattivati, password, versione 8.7.
- `prototipo-crm/specifica.html` — rigenerata.

### Rotte
- `POST /api/integra/prova` (`sistema.impostazioni`) — conteggi delle viste, mai indirizzo o
  password.
- `POST /api/integra/sincronizza` (`sistema.impostazioni`) — giro a mano con i conteggi.

## Scelta della chiave
- Il seed e il ponte finto usano lo **stesso codice leggibile** in `codici_esterni.codice`
  (`C00412`, `F00031`, …). La sincronizzazione cerca prima il codice leggibile, poi
  `id_integra` in testo.
- Non serve una colonna nuova: `clienti_versioni` e `fornitori_versioni` hanno già i campi
  descrittivi; `id_integra` resta la chiave stabile del ponte, il codice leggibile serve alla
  ricerca.
- Con il ponte vero si potrà scegliere di salvare `id_integra` in `codici_esterni.codice` e il
  codice leggibile in una colonna della versione: richiede una migrazione, quindi la decide
  Claude Code.

## Prove
- `npx tsc --noEmit`: 0 errori.
- `npx jest --runInBand` (tutte le prove): **153/153**, 0 KO, due volte di seguito.
- `npx jest --runInBand test/integra.spec.ts`: 14/14, 0 KO.
- Casi coperti: primo giro, secondo giro senza cambi, cambio ragione sociale con pratica sulla
  versione vecchia, solo `modificato_il`/P.IVA con spazi, soggetto cliente+fornitore, disattivato,
  P.IVA mancante e chiusura anomalia, P.IVA estera, P.IVA doppia, ponte irraggiungibile (3 giri),
  colonna mancante, campi CRM invariati, margine, rotte e 403.

## Cosa cambierà col ponte vero (F0-A8)
- Le tabelle del ponte finto diventano viste vere in `crm_viste`, con `postgres_fdw` o funzione
  con parametro; il codice del CRM non cambia (colonne in `VISTE`).
- Il ruolo `crm_lettura` va creato dal sistemista: in locale non abbiamo i permessi per creare
  ruoli, quindi il ponte finto ha usato `decobrands`.
- Le P.IVA vere potranno avere il controllo della cifra di controllo italiana: oggi è disattivato
  perché i dati di prova sono inventati (`// shortcut` in `integra.ts`).

## Domande aperte (anche in fondo a `strumenti/integra/viste-crm.sql`)
1. Codice azienda di Decobrands in Integra (`azi_cdazi`): è `'001'` come per Luis?
2. Clienti privati con solo codice fiscale e senza P.IVA: si scartano o si accettano?
3. Email per i solleciti (§5.14): `cli_email` o PEC?
4. `cla_agecod`: corrisponde al subagente del CRM? Ora non si usa.
5. `postgres_fdw` o funzione con parametro: lo decide il sistemista.
