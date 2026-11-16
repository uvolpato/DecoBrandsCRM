# Resoconto `liquidazioni-anno` — tendina dell'anno nelle Liquidazioni

Esecutore: DeepSeek V4 pro · Data: 15/11/2026 · Pacchetto: `liquidazioni-anno` (§7.8).

## Cosa ho fatto

Pagina **Liquidazioni**: menu a tendina con l'anno nella testata, a sinistra di «Esporta in Excel»
(subito dopo «Torna alle Liquidazioni»). Predefinito l'anno corrente. Scegliendo un anno si resta
sullo stesso trimestre e si naviga a `/liquidazioni/{anno}/{trimestre}` (il link porta l'anno, la
memoria della schermata §7.12 lo ritrova tornando indietro).

- **Backend** `app/backend/src/liquidazioni.ts`:
  - le rotte accettano già `anno` (`Periodo` con `@IsInt @Min(2000) @Max(2100)`; senza `anno` = anno
    corrente del server, come da spec). Nessun cambio necessario qui.
  - nuova rotta `GET /liquidazioni/anni` (`provvigioni.consulta`): `anniDisponibili(db, oggi)` prende il
    minimo fra il primo anno dei documenti (`ordini_fornitore_documenti.data`), delle pratiche
    (`ordini_fornitore_testata.data_ordine`) e delle liquidazioni (`liquidazioni.anno`) e costruisce la
    lista fino all'anno corrente, sempre almeno l'anno corrente. `aggregate` Prisma, niente SQL a mano.
  - l'esportazione (`esporta-liquidazione.ts`) usa già `anno` dal query e non cambia.
- **Frontend** `app/frontend/componenti/Pagina.tsx` (file condiviso, vedi «Da documentare»):
  - nuovo prop opzionale `testa?: ReactNode`, reso nella testata fra «Torna a…» e le azioni. Aggiuntivo,
    non cambia il comportamento delle altre pagine.
- **Frontend** `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`:
  - `useRouter` + stato `anni`, caricato una volta da `liquidazioni/anni`;
  - `<select className="filtro-select" aria-label="Anno">` con le opzioni `anni ∪ {anno}` in ordine
    decrescente (anno corrente in cima), `value={anno}`, `onChange` → `router.push`. Passato a `Pagina`
    via `testa` in entrambi i rami (caricamento e pagina piena); il bordo interno del fuoco è quello di
    `filtro-select` (D-64).
- **Guida** `app/frontend/lib/guida.ts` (pagina Liquidazioni): nota nel `sapere` sulla tendina Anno.

## Prove lanciate (database `decobrands_test_liq_anno`, creato, migrato, seminato e cancellato alla fine)

- `npx jest test/liquidazioni.spec.ts` → **25/25 OK, 0 KO** (incluse le 2 nuove: tendina anni, anno passato).
- `npx tsc --noEmit` (backend) → **0 errori**.
- `npx tsc --noEmit` (frontend) → **0 errori**.
- Nuove prove aggiunte in `app/backend/test/liquidazioni.spec.ts`:
  - `GET /liquidazioni/anni`: termina con l'anno corrente, anni consecutivi, primo anno = minimo fra
    documenti/pratiche/liquidazioni.
  - anno passato (`2025`): `anno`/`trimestre` giusti, 4 trimestri di quell'anno tutti `da_liquidare`;
    `anno=1900` e `anno=3000` → 400.

## Prove nel browser

Non lanciate qui (regole dell'onda). Nessun file `strumenti/prove/*` aggiornato: la tendina cambia
l'indirizzo e rilegge; la prova `app_liquidazioni.py` non verifica l'anno. Da valutare a fine onda se
aggiungere un controllo sulla tendina.

## Controlli fatti (skill caricate davvero)

- `owasp-security`: la rotta `anni` è in sola lettura con `provvigioni.consulta`, nessun input utente
  nelle query (aggregate senza parametri); l'anno resta validato sul server (`@IsInt` con limiti). Il
  valore della tendina entra solo nell'URL e il backend lo rivalida (V12). Nessun rilievo.
- `ponytail-review`: la soluzione è il minimo (una rotta + un prop opzionale + un `<select>` nativo).
  Nessun rilievo. `net: 0`.

## Da documentare

### §19 — riga nuova (decisione di Ugo del 15/11/2026)

- **Liquidazioni: tendina dell'anno.** Nella testata un `<select>` nativo con l'anno, a sinistra di
  «Esporta in Excel»; predefinito l'anno corrente; l'elenco lo dà il server (`GET /liquidazioni/anni`),
  dal primo anno con dati (documenti/pratiche/liquidazioni) all'anno corrente, sempre almeno l'anno
  corrente. Scegliendo un anno si resta sullo stesso trimestre; l'anno entra nell'indirizzo
  (`/liquidazioni/:anno/:t`), nella memoria della schermata (§7.12) e nell'esportazione. Perché: oggi
  l'anno non si può scegliere, si vedono solo i trimestri dell'anno in corso. Chi: Ugo. Dove:
  `liquidazioni.ts` (rotta `anni`), `VistaLiquidazioni.tsx`, `componenti/Pagina.tsx` (prop `testa`),
  `lib/guida.ts`.

### File fuori dall'elenco «ammessi»

- `app/frontend/componenti/Pagina.tsx`: aggiunto il prop opzionale `testa` per mettere la tendina nella
  testata (la testata la rende solo `Pagina`; senza questo prop non si può inserire nulla fra «Torna a…»
  e le azioni). Aggiuntivo e retrocompatibile (le altre pagine non lo passano). Non era nell'elenco
  ammessi e non è fra i file «non toccare»; lo segnalo perché non l'ho potuto evitare senza rifare la
  testata (peggio). Non ho toccato `motore/*`, `proposta.ts`, `documenti.ts`, `pratiche.ts`,
  `lettura.ts`, `lettore.ts`, `VistaSistema.tsx` né il registro.

### Guida (già aggiornata in `lib/guida.ts`)

> **Da sapere** — La tendina **Anno** nella testata sceglie l'anno dei quattro trimestri: parte
> dall'anno corrente ed elenca gli anni dal primo con dati. Scegliendo un anno si resta sullo stesso
> trimestre.

### Piano (`piano-lavoro-crm.md`)

> Attività «liquidazioni-anno» (§7.8): tendina dell'anno nelle Liquidazioni, rotta `GET
> /liquidazioni/anni`, prop `testa` in Pagina, prove. Ore: da approvare.
