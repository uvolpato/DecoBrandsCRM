# Resoconto — riconoscimento furbo (15/11/2026)

Esecutore: DeepSeek V4 pro. Pacchetto `strumenti/opencode/riconoscimento-furbo.md` (P1).

## Causa verificata del punto 3

Confermata sui dati veri (sola lettura su `decobrands_db`):

- 2 documenti in `da_controllare` con `fornitore_id` NULL, entrambi con
  `fornitore` letto `«ARTE WOHNACCESSOIRES GMBH & CO.KG»`.
- In anagrafica c'è `«ARTE WOHNACCESSORIES GMBH & CO.KG»` (una lettera scambiata:
  ACCESSOIRES ↔ ACCESSORIES), **senza P.IVA** (`piva` NULL).

`risolviFornitore` confronta solo il nome normalizzato esatto (più il ripiego sulle sigle):
la lettera diversa fa fallire il riconoscimento, `fornitore_id` resta NULL e
`abbinamentoPerCodice` (che esige il fornitore) non parte: il cliente non si associa anche se il
codice cliente è giusto. Risolto con somiglianza pg_trgm + vocabolario imparato (sotto).

## Cosa è stato fatto

1. **Ordine della coda** (`documenti.ts` ~riga 651): `ORDER BY` — `in_coda`/`in_lettura` dal più
   vecchio (`ricevuto_il, id` crescente), il resto dal più recente.
2. **Coda che si aggiorna da sola**: il lettore pubblica un evento `documento.stato` al cambio di
   stato (`prelevaDocumento` in_coda→in_lettura, `salva` in lettura.ts in_lettura→da_controllare);
   nuovo codice nel registro (`registro.ts` SCHEMI) → area `documenti` → la pagina già ascoltava
   via SSE e rifà solo l'elenco, senza sagome né rimontaggio del dettaglio a destra.
3. **Riconoscimento furbo**, nell'ordine richiesto, tutto sul server (V12):
   - **a. Vocabolario imparato (D-164)**: tabella nuova `alias_letti(tipo, nome_normalizzato,
     nome_letto, ruolo_id, creato_da, creato_il)`, unico su (tipo, nome_normalizzato). Salva il
     nome letto → soggetto scelto in `scegli`, `correggi` e `abbina` (`ricordaAlias`). Il
     riconoscimento (`risolviFornitore`, `riconosciCliente`/`propostaDocumento`) lo consulta prima
     di tutto.
   - **b. Somiglianza pg_trgm (D-164)**: `fornitoriSimili` con `similarity(...)` (costante
     `SOGLIA_SIM = 0.6`, distacco `DISTACCO_SIM = 0.2`); un solo candidato (o il primo ben
     distaccato) si riconosce, più candidati → `fornitore_da_scegliere` con il `punteggio`.
   - **c. Codice cliente** (`abbinamentoPerCodice`): già considerava le agenzie `da_confermare`
     (nessun filtro su quel flag); verificato con una prova dedicata (D-159).
   - **d.** Il riconoscimento si rifà a ogni apertura (già così, `propostaDocumento`).
4. **P.IVA dal documento (D-165)**: `dettaglioDocumento` espone `piva_da_salvare` (soggetto
   riconosciuto senza P.IVA + P.IVA letta valida); nuova rotta `POST /documenti/:id/piva`
   (`dati.modifica`, una transazione, riga bloccata): nuova versione del cliente/fornitore con la
   P.IVA, registro, rifiuto con il nome se un altro soggetto ha già quella P.IVA. Frontend: nota
   «Salva la P.IVA» in *Correggi i dati letti* e *Apri la pratica*, poi «aggiornala anche in
   Integra» (Integra mai toccato, D-100).

## Comando della migrazione

Migrazione nuova: `20261115090000_alias_letti` (crea `alias_letti` + indice univoco + CHECK sul
`tipo`). Si applica con:

```
npx prisma migrate deploy
```

(poi `npx prisma generate`, già rigenerato). Nessun'altra migrazione; il CHECK su `codici_esterni`
non si è toccato (la fonte nuova stava meglio in una tabella dedicata, come previsto dal pacchetto).

## Prove

- `npx tsc --noEmit` OK nel backend e nel frontend.
- Jest su `decobrands_test_furbo` (poi cancellato):
  - `riconoscimento-furbo.spec.ts` (nuova): 13/13 — ordine coda, vocabolario, somiglianza, codice
    cliente con agenzia da confermare, P.IVA (salvata solo se mancante, rifiuto se doppia).
  - `coda.spec.ts` 6/6, `proposta.spec.ts` 60/60, `documenti.spec.ts` 68/68,
    `documenti-lettura.spec.ts`+`lettura.spec.ts` 36/36, `eventi.spec.ts`+`registro.spec.ts` 13/13.
- Prove nel browser **non lanciate** (regole onda): aggiornato `strumenti/prove/app_documenti.py`
  con i controlli nuovi (coda auto-aggiornante via SSE senza ricaricare il dettaglio, ordine della
  coda); `python -m py_compile` OK. Le lancia Claude Code con `giro.sh`.

## Controlli fatti (skill caricate davvero)

- `owasp-security`: la rotta P.IVA ricontrolla tutto dal DB (V12), permesso `dati.modifica`,
  transazione unica con riga bloccata, nessun valore dal browser oltre al `ruolo`; nessuna
  iniezione (`$queryRaw`/`Prisma.sql` parametrizzati).
- `postgresql-code-review`: `alias_letti` senza FK (come `codici_esterni`, ruolo non cancellabile);
  `similarity` su `fornitori_versioni` correnti (l'indice gin_trgm è lì; la trasformazione
  `lower(regexp_replace(...))` non lo usa, ma le versioni correnti sono poche decine — accettabile).
- `ponytail-review`: nessuna astrazione inutile; `ricordaAlias`/`imparaAlias`/`suggerimentoPiva`
  sono helper unici riusati, non classi né factory.

## Da documentare (per Ugo / il lead)

- **§6.5 / §7.9 / §19 D-164**: vocabolario imparato (`alias_letti`), ordine della coda dal più
  vecchio, coda che si aggiorna via SSE (`documento.stato`), somiglianza pg_trgm con `SOGLIA_SIM`
  0,6 e `DISTACCO_SIM` 0,2.
- **§19 D-165**: salvataggio della P.IVA dal documento (solo se mancante, rifiuto se doppia,
  nota «aggiornala anche in Integra»).
- **Aperti**:
  - Il master `soggetti.piva` non viene allineato quando si salva la P.IVA del ruolo dal documento
    (il pacchetto chiede solo la nuova versione del cliente/fornitore); da decidere se propagare.
  - La somiglianza vale solo per il **fornitore** (il bug reale); per il cliente il vocabolario +
    P.IVA/nome bastano. Se serve anche il cliente per nome simile, va esteso.
  - La somiglianza non toglie le sigle societarie (confronto sul nome normalizzato intero): con
    sigle rumorose si può raffinare; per il caso reale (una lettera) non serve.
  - L'elenco (pillole «Manca l'agenzia»/«Cliente in Integra») non consulta vocabolario e
    somiglianza: le pillole valgono solo per il riconoscimento classico; si allinea se serve.
