# Resoconto — `documenti-sostituiti-visibili` (D-204, 17/11/2026)

**Esecutore: DeepSeek.** Pacchetto `strumenti/opencode/documenti-sostituiti-visibili.md`.

## Cosa è stato fatto

1. **Server** — `documenti.ts`: nuova funzione `versioniPrecedenti(db, t)` (V12, **niente migrazione**). Il
   collegamento fra documento attuale e documenti in arrivo vecchi si ricava dagli eventi `documento.update`
   con `sostituito: true` del registro (catena `prima.arrivo_id` → `dopo.arrivo_id`, dalla più recente); i valori
   di allora (tipo, numero, data, importo, righe) dai campi letti del documento in arrivo vecchio
   (`documenti_campi`, ancora `abbinato` alla pratica) con `lettoDaCampi`, e il `file_nome` per il PDF.
   `documentiPratica` è diventata `async` e riceve `db`: ogni documento **tracciato** (`altri`) porta `versioni`
   (ordine, conferma, proforma: gli unici sostituibili). Tutti i sei chiamanti aggiornati; i due con spread
   (`abbina`, `sostituisci`) ora fanno `await` prima di `...` (il vecchio `documentiPratica` era sincrono).
2. **Frontend** — `ConsultaDocumenti.tsx`: tipo `VersioneDoc` e componente `VersioniPrecedenti` (tipo, numero,
   data, importo, numero di righe, «sostituito il … da … — motivo», link «Apri il PDF» e `<details>` con le righe
   di allora, sola lettura). Usato nella pratica (`VistaPratica.tsx`, card Documenti) e nel visualizzatore
   «Consulta affiancati». `VistaAnalisi.tsx`: conteggio «Ordini annullati» come riquadro tenue, solo lettura
   (il backend lo mandava già da D-207).
3. **Guida e spec** — `guida.ts` (voce «Versioni precedenti» nella pagina Pratiche e nota nella voce
   «Sostituisci l'ordine registrato»); `specifica-crm-provvigioni.md` (D-204 riga §19 + *Perché* §6.5, versione
   8.95 → 8.96).

## Prove

Su `decobrands_test_sostituiti` (creato, migrato, da cancellare):

- `documenti-sostituiti.spec.ts`: **3/3** — due sostituzioni → documento attuale + 2 versioni (PDF, data, importo,
  righe, motivo, dalla più recente) e stato/provvigione invariati con stima = solo documento attuale; PDF della
  versione precedente aperto con `provvigioni.consulta`; eliminazione della pratica → versioni negli scartati.
- Non regressione: `ordine-aggiornato`, `documenti-pratica`, `documenti`, `pratica-elimina-annulla`, `analisi`,
  `pratiche` → **166/166**.
- `npx tsc --noEmit` backend e frontend: puliti. `python -m py_compile strumenti/prove/app_pratica.py`: pulito
  (blocco D-204 con elenco documenti simulato: non lanciato, lo lancia Claude Code).

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`, `postgresql-code-review` (niente
migrazione → non applicabile). Rilievi veri: nessuno. `versioniPrecedenti` legge solo dal database con query
parametriche Prisma (nessun input del browser); il PDF vecchio si apre dalla rotta `GET /documenti/:id/file`
esistente (stesso permesso `provvigioni.consulta`); le versioni non entrano in nessun calcolo (V12).

## Da documentare

- **§19 — D-204** (completamento): versioni precedenti visibili nella pratica + conteggio «Ordini annullati» in
  Analisi. Già inserita in `specifica-crm-provvigioni.md` (riga §19, *Perché* §6.5, versione 8.96).
- Nessuna migrazione (scelta «senza migrazione» del pacchetto); nessuna ora in più sul piano.

## Aperto

- Il giro del browser (`app_pratica.py`) non è eseguito qui: lo lancia Claude Code a fine onda.
- Il prototipo ufficiale non replica le versioni precedenti (fuori dai file ammessi).
