# Resoconto `documenti-non-letti-in-elenco`

Data: 18/11/2026. Pacchetto eseguito alla lettera (tre file ammessi, nessun commit, nessuna migrazione).

## File toccati

1. `app/backend/src/documenti.ts`
2. `app/backend/test/documenti.spec.ts`
3. `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`

## Diff sintetico

**`documenti.ts`**

- `STATI_APERTE` = `['in_coda', 'in_lettura', 'da_controllare', 'errore']`, con il perché in due righe
  di commento (`// D-208`): un documento non letto dopo 3 tentativi si apre e si sistema a mano o si
  scarta, quindi è da decidere come gli altri e deve stare in elenco.
- `totale` del ramo `aperte`: aggiunto `conteggi.errore` alla somma. **Non era nell'elenco del
  pacchetto ma è la stessa costante in un altro punto**: il test nuovo falliva 55 ≠ 54 proprio perché
  la somma dei segmenti era ancora a tre stati. Il commento della rotta `elenco` aggiornato.
- Nessun altro cambiamento: l'`ORDER BY ricevuto_il ASC` (D-169) e il commento della query parlavano
  già di `errore` come parte della coda; `conteggi` e il dettaglio `GET /documenti/:id` non cambiano
  (il dettaglio apriva già un documento in errore).

**`documenti.spec.ts`** (test «stato=aperte», ~riga 892)

- Titolo aggiornato a quattro stati con `(D-208)`.
- Aggiunto `inErrore`: `db.documenti_in_arrivo.create` con `stato: 'errore', tentativi: 3`, e la
  verifica che compaia in `?stato=aperte` con `{ stato: 'errore', file_nome: 'errore-elenco.pdf' }`.
- Tolto `expect(stati).not.toContain('errore')`; restano i controlli su `scartato` e `abbinato`.
- `totale` = somma dei **quattro** segmenti.
- Nessun altro test contava i documenti aperti: gli altri usi di `stato=aperte`
  (`documenti-lentezza.spec.ts`, `riconoscimento-furbo.spec.ts`) non confrontano i totali;
  `documenti-lettura.spec.ts` controlla `conteggi` con filtri per tipo, invariato.

**`VistaDocumenti.tsx`** (elenco, ~riga 175)

- `<Stato v="errore">Non leggibile</Stato>` come primo segno della riga, prima del livello e degli
  avvisi, come «In coda» per i documenti in coda. La condizione che mostra il blocco dei segni
  ora comprende `d.stato === 'errore'`.
- La pagina chiedeva già `documenti?stato=aperte`, quindi i documenti in errore ora arrivano
  nell'elenco senza altre modifiche. Nota dei non letti e testi invariati; nessun componente,
  classe CSS o rotta nuovi.

## Prove

- `npx tsc --noEmit` in `app/backend`: **0 errori**.
- `npx tsc --noEmit` in `app/frontend`: **0 errori**.
- `npm test -- documenti.spec.ts --forceExit` in `app/backend`: **70 passati, 0 KO** (27,8 s).
  Database di prova già allineato: nessuna migrazione eseguita, nessun errore di schema.
- Playwright non lanciato (lo fa l'orchestratore).

## Dubbi

- **Numero della decisione**: ho scritto `D-208` perché il registro si ferma a `D-207`.
  Confermare o rinumerare in §19 insieme alla spec.
- **`totale` del ramo `aperte`** (vedi sopra): corretto in `documenti.ts`; senza, il conteggio
  della pagina restava a tre stati e la nota «Mostrati i primi N» sbagliava di uno.
- **Riga in errore con `livello` valorizzato** (lettura parziale): mostra sia «Non leggibile» sia il
  segno del livello. Lasciato com'è (il pacchetto dice «nient'altro»); se il livello è considerato
  stale andrebbe spento per `errore`, ma è una decisione, non una svista.
- **Posizione in elenco**: un documento in errore non va in fondo per forza, segue l'ordine di
  caricamento (D-169). Nessun requisito contrario nel pacchetto.

## Da documentare (non fatto, fuori dai file ammessi)

- **§19, riga `D-208`**: «Lo stato *aperte* dell'elenco documenti comprende anche `errore`.» Un
  documento non letto dopo 3 tentativi deve essere apribile e scartabile come gli altri: prima non
  compariva in nessuna lista, pur essendo citato solo da una nota che non permetteva di aprirlo
  (vicolo cieco). Il server decide lo stato (V12/D-28). Dove: `documenti.ts` (`STATI_APERTE`,
  `totale` del ramo `aperte`), test `documenti.spec.ts`, `VistaDocumenti.tsx`.
- **§7.9**: se elenca gli stati di «Da controllare», aggiungere `errore` con il segno
  «Non leggibile» in elenco.
- **Guida** (`prototipo-alternativo/assets/guida.js`, pagina Documenti): una riga del tipo «Se un
  documento non si legge dopo 3 tentativi resta in elenco con il segno *Non leggibile*: aprilo per
  inserire i dati a mano o scartalo».
