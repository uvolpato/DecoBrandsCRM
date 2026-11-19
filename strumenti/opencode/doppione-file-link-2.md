# Pacchetto `doppione-file-link-2` (backend + pagina Documenti + finestra pratica)

## Compito

Ugo (18/11/2026), seconda prova: il file che ricarica non era ancora abbinato a una pratica, quindi il 409 dice solo «è lo stesso file di uno già arrivato» e **non c'è il link**, perché non c'è una pratica da linkare. In quel caso il file è comunque un documento in coda, con una sua pagina: il link deve portare lì.

Nello stesso giro, nella pagina Documenti l'«i» dei due pannelli («Da controllare», «Come entrano i documenti») deve stare nella **testata del pannello**, all'estrema destra dopo i pulsanti, come già nella pratica (prop `info` di `Pannello`), non su una riga del corpo.

## 1. Backend — `app/backend/src/documenti.ts`

Il 409 porta un campo in più, sempre presente: il documento in arrivo che ha già quel file.

```json
{ "message": "Documento già caricato: è lo stesso file di uno già arrivato",
  "pratica": null,
  "documento": { "id": "43" } }
```

- `doppione` riceve la riga del doppione (l'oggetto con `id`, `stato`, `abbinato_pratica_id`) e non solo l'id pratica.
- i tre punti passano la riga: lettura iniziale (`select` con `id` c'è già → `doppione(db, gia)`), transazione (`doppione(tx, riga)`), `P2002` (rilettura per `file_hash` con `select: { id: true, stato: true, abbinato_pratica_id: true }`; se la riga non c'è più, `documento: null`).
- messaggio e `pratica` restano come sono: cambia solo l'aggiunta di `documento`.

## 2. Backend — test `app/backend/test/documenti.spec.ts`

Nei due test del doppione (~righe 117-135) aggiungi `documento: { id: <id della riga caricata> }` atteso, accanto a `pratica`.

## 3. Frontend — `app/frontend/lib/api.ts`

`caricaPdf` ha già `pratica?`: aggiungi `documento?: { id: string } | null`.

## 4. Frontend — `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`

- lo stato `rifiutato` prende anche `documento: { id: string } | null` (dalla risposta `r.dati`);
- il link nel riquadro, dopo il messaggio:
  - se c'è `pratica`: `Apri la pratica {numero}` → `/pratiche/{id}` (come adesso);
  - se non c'è la pratica ma c'è `documento`: `Apri il documento` → `/documenti/{id}`;
  - niente link se mancano entrambi.
- **«i» nella testata**: togli i due `<div className="strumenti-scheda"><span className="spazio" /><Informazioni …>…</Informazioni></div>` e passa `info={<Informazioni …>…</Informazioni>}` ai due `Pannello` («Da controllare» ~riga 124, «Come entrano i documenti» ~riga 196). Testi invariati.

## 5. Frontend — `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

`FinestraDocumento`: lo stato `praticaDoppione` diventa `doppione` con `{ pratica, documento }` (o due stati, come preferisci il minimo); sotto il messaggio d'errore il link segue la stessa regola del punto 4 (pratica, altrimenti documento, altrimenti niente).

## File ammessi

- `app/backend/src/documenti.ts`
- `app/backend/test/documenti.spec.ts`
- `app/frontend/lib/api.ts`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

Vietati tutti gli altri: CSS, altre pagine, profilo, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 V12/D-28: id e stato del documento vengono dal database, mai dal browser. V13: dentro la transazione si usa `tx`.
- Ponytail: nessun campo nuovo nel database, nessuna migrazione, nessuna classe CSS nuova.
- ⚠️ Il working tree ha **molte modifiche non committate**: niente `git stash`, `git checkout`, `git reset`; tocca solo le righe necessarie.

## Prove

- `npx tsc --noEmit` in `app/backend` e in `app/frontend`: 0 errori.
- `npm test -- documenti.spec.ts --forceExit` in `app/backend` (database `decobrands_test`, già allineato): 0 KO.
- Non lanciare Playwright: le schermate le fa l'orchestratore.

## Resoconto

Aggiorna `strumenti/opencode/resoconto-doppione-file-link.md` con una sezione «Seconda correzione»: file toccati, diff sintetico, corpo 409 finale, esito `tsc` e `jest`, dubbi, righe per la documentazione (spec §19, §6.5, §8.1, Guida).
