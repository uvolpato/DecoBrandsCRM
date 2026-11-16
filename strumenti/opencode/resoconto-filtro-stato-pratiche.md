# Resoconto — Filtro per stato nella ricerca delle pratiche per l'abbinamento (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/filtro-stato-pratiche.md`. Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), prove su `decobrands_test_filtro_stato` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit. Non toccati `proposta.ts`, `lettura.ts`, `documenti.ts` (modifiche non committate di un altro pacchetto).

## Richiesta di Ugo (15/11/2026)

Nel cerca pratiche un filtro per stato che dipende da dove arrivo: ordine/proforma/conferma → pratiche con solo l'ordine; fattura → pratiche con la conferma; nota di credito → pratiche con una fattura. L'operatore può togliere o cambiare il filtro.

## Server

- **`app/backend/src/pratiche.ts`**:
  - `CercaPratiche` guadagna `stato` `@IsOptional() @IsIn(['attesa','confermata','fatturata'])` (lista chiusa, V12).
  - `cerca` aggiunge `AND t.stato = …` dal `STATO_DB` già esistente (attesa→inviato, confermata→confermato, fatturata→fatturato). La mappatura è un const chiuso, mai testo del browser dentro SQL. Senza `stato` il comportamento resta identico (il campo dello *Sposta* in `VistaPratica.tsx` non cambia).

## Interfaccia

- **`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`**:
  - `PRATICA.voci` manda `stato` al server quando presente nel contesto (`URLSearchParams`).
  - Nuovi const `STATO_DAL_TIPO` (tipo documento → stato iniziale) e `STATI_ABBUNA` (Tutte · Solo ordine · Confermata · Fatturata).
  - Stato `statoFiltro`, inizializzato dal tipo del documento con `useEffect` su `d?.testata.tipo`; il componente si rimonta a ogni documento (key in VistaDocumenti, D-94), quindi il valore parte sempre dal tipo corrente.
  - Nella sezione «Oppure abbina a un'altra pratica» un gruppo di segmenti (`.segmenti`, role=tablist/tab) prima del campo; il cambio aggiorna `contesto` e la ricerca ricarica (server-side). «Tutte» toglie il filtro.
- **`app/frontend/lib/guida.ts`**: nota in «Abbinare il documento alla pratica» che spiega il filtro e che si può togliere.

## Prove

Su `decobrands_test_filtro_stato` (creato, `prisma migrate deploy`, poi cancellato):
- `npx tsc --noEmit` backend e frontend: puliti.
- jest `pratiche.spec.ts` **20/20** (16 pre-esistenti + 4 nuovi: un caso per ogni stato via `it.each` e lo stato non ammesso → 400).

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. `stato` arriva dal DTO (`@IsIn`), la mappa `STATO_DB` è un const chiuso; il valore finisce in `Prisma.sql` come parametro legato, mai testo libero. La rotta resta `@Richiede('provvigioni.consulta')`.
- `postgresql-code-review`: nessun indice o schema nuovo; il filtro usa `t.stato` già presente, nessun JSONB o array.
- `ponytail-review`: lean. `STATO_DAL_TIPO` e `STATI_ABBUNA` sono due costanti piccole e chiare; nessuna astrazione. `net: 0`.

## Da documentare

- **§7.9 / §6.5 (abbinamento)**: nella ricerca «Oppure abbina a un'altra pratica» il filtro per stato parte dal tipo del documento (ordine/proforma/conferma → «Solo ordine»; fattura → «Confermata»; nota di credito → «Fatturata») e si può togliere o cambiare. Fuori dall'abbinamento (es. lo *Sposta*) nessun filtro iniziale.
- **§16.4.1**: i segmenti del filtro per stato non mostrano i conteggi dal vivo (D-23): è un campo di ricerca a scelta singola, non una FilterBar, e `/pratiche/cerca` risponde con un elenco (condiviso con `VistaPratica.tsx`, non toccabile); aggiungere i conteggi richiederebbe cambiare la forma della risposta condivisa.
- **§19 — D-177 (proposta, da confermare)**: «Il campo di ricerca delle pratiche per l'abbinamento filtra per stato secondo il documento da abbinare: ordine, proforma e conferma cercano le pratiche con solo l'ordine, la fattura quelle confermate, la nota di credito quelle fatturate. Il filtro lo applica il server (`GET /api/pratiche/cerca?stato=`, lista chiusa `attesa|confermata|fatturata`); il browser invia solo la scelta (V12). L'operatore può togliere o cambiare il filtro; fuori dall'abbinamento (Sposta) nessun filtro iniziale.»

## Aperti / note

- **Conteggi dal vivo non mostrati** (D-23): vedere sopra. Da decidere con Ugo se valga la pena estendere `/pratiche/cerca` (o un endpoint dedicato) per portarli, cambiando la forma della risposta condivisa con lo *Sposta*.
- **Giro nel browser non lanciato** (regola onda): nessun file `.py` toccato; il controllo visivo (segmenti a 1440 e 768 px) resta a Claude Code.
