# Resoconto — Revisione `revisione-0-2-12` (agenzia senza subagente, D-205)

Revisore: DeepSeek (sola lettura, nessun file modificato tranne questo). Skill caricate davvero: `owasp-security`,
`postgresql-code-review`, `ponytail-review`, `caveman`. Diff + file nuovi letti per intero; grep di ogni lettura di
`subagente_id`/`agente_id` nel backend e nel frontend; `npx tsc --noEmit` pulito nel backend e nel frontend.

## Da correggere prima del rilascio

### 1. `regolaPiatta` non toccata: in modalità riga una correzione su documento senza subagente dà quota ≠ 0

- **File**: `app/backend/src/motore/motore.ts:467` (radice in `regolaPiatta`, `motore.ts:273`).
- **Scenario concreto**: fornitore in raggruppamento `riga` (D-199) + agenzia con `subagente_id` NULL + «Correggi»
  su una fattura (`VistaPratica.tsx:391`, azione sempre visibile → `PUT /documenti-fiscali/:id/correzione`, che
  **non** rifiuta il caso senza subagente). `provvigioneRiga` chiama `regolaPiatta` (riga 450) che restituisce la
  correzione; `sub = piatta.provvigione` (riga 467) **non** è guardato, mentre `pctSub` (riga 458) sì. Effetto:
  `calcoloDocumento` salva `provvigione_subagente` = correzione (riga 539) e `provvigioneDoc` (riga 337
  `pagate = v.sub ?? …`) fa comparire la voce «Senza subagente» in Analisi con `pagate` ≠ 0 e, nel Riepilogo della
  pratica, un importo «a_subagente» non zero accanto a «Subagente: —, tutta a Decobrands». In modalità `documento`
  è salvo (`quotaSub` esce a 0 in riga 305 prima di `regolaPiatta`); la fuga è solo nella modalità `riga`.
- **Correzione proposta** (un punto solo, come da decisione): in cima a `regolaPiatta` aggiungere
  `if (ab.subagente_id == null) return null;`. Copre `quotaSub` (320) e `provvigioneRiga` (450). Il testo D-205
  elenca proprio `regolaPiatta` fra i punti da toccare: è stato dimenticato.
- **Prova**: una prova jest (funzione pura, come `agenzia-senza-subagente.spec.ts`) che con raggruppamento `riga`,
  `d.correzione` valorizzata e `ab.subagente_id == null` → `calcoloDocumento`/`provvigioneDocumento` danno `sub` 0.

## Migliorie (non bloccanti)

### 2. Non si può togliere il subagente dalla modifica

- **File**: `app/frontend/componenti/FormAgenzia.tsx:183` (`…(v.subagente_id ? { subagente_id: … } : {})`).
- **Scenario**: agenzia con subagente → si svuota il campo «Subagente» → il corpo non manda `subagente_id`, quindi
  `modificaAgenzia` (`clienti.ts:363`, `if (b.subagente_id !== undefined)`) conserva il valore precedente: il campo
  si svuota a video ma il subagente resta. D-205 chiede solo «aggiungere dopo», non togliere: non è un blocco.
  Se in futuro servirà rimuoverlo, mandare esplicitamente `subagente_id: null` (e accettarlo nella modifica).

## Verifiche positive (nessun rilievo)

- **Migrazione** OK: `ALTER COLUMN subagente_id DROP NOT NULL`, additiva e idempotente; FK `RESTRICT` resta per i
  valori non nulli; indice `interscambio_subagente_id_idx` invariato. Gli EXCLUDE D-35 (`migrazione iniziale`
  righe 650-653) usano `cliente_piva`/`codice_cliente_fornitore` + `fornitore_id`, **non** `subagente_id`: nessun
  effetto sui vincoli di sovrapposizione.
- **Soldi con subagente presente**: i guard `ab.subagente_id == null ? ZERO : …` restituiscono i valori originali
  quando il subagente c'è; nessuna riga di liquidazione con `subagente_id` null (`righeLiquidazione:777`); il
  cambio «nessuno → subagente» con data è provato (`transizione` nel nuovo spec). Eccezione D-51 mai applicata
  senza subagente (`percentuali:228`, `e.subagente_id === ab.subagente_id` con null → false).
- **Letture di `subagente_id`/`agente_id`**: tutte null-safe dove serve. `pratiche.ts` usa `LEFT JOIN` (riga 243),
  `esporta-liquidazione.ts:71` e `liquidazioni.ts` lavorano sulle righe di liquidazione (mai null); `analisi.ts`
  (`filtra`, `N.s`, `voci`) gestisce null e la voce «Senza subagente» non è sceglibile; il frontend ignora il click
  su chiave null (`VistaAnalisi.tsx:250,273-274`).
- **Sicurezza e validazione**: il rifiuto 400 di `pct_subagente`/`regola_mensile` senza subagente resta nel server
  (`creaAgenzia` e `modificaAgenzia`, `clienti.ts:279,385`); permessi invariati (`Richiede`); query Prisma
  parametriche. Nessun nuovo problema OWASP.

## Riepilogo

1. Diff `agenzia-senza-subagente` (D-205) rivisto per intero; `tsc --noEmit` pulito backend e frontend.
2. Un rilievo vero da correggere: `regolaPiatta` non toccata → correzione in modalità riga su documento senza subagente dà quota ≠ 0 (`motore.ts:467`).
3. Fix un punto: `if (ab.subagente_id == null) return null;` in cima a `regolaPiatta`; D-205 la elencava, è sfuggita.
4. Prova: jest pura su `calcoloDocumento` in riga con `correzione` e subagente null → sub 0.
5. Miglioria minore: la modifica non permette di togliere il subagente (campo svuotato non manda `subagente_id`).
6. Migrazione additiva corretta; EXCLUDE D-35 non dipende dal subagente.
7. Soldi con subagente presente invariati; nessuna riga di liquidazione con subagente null; eccezioni/mensile mai senza subagente.
8. Letture di `subagente_id`/`agente_id` tutte null-safe (LEFT JOIN, filtri, Analisi, export).
9. Sicurezza: 400 sul server, permessi invariati, query parametriche; nessun nuovo rilievo OWASP/PostgreSQL.
10. Complessità: scelte «lazy» corrette (quota 0 in un punto, voce «Senza subagente» riusa il canale `chiavi: null`); resta solo il punto unico mancato in `regolaPiatta`.
