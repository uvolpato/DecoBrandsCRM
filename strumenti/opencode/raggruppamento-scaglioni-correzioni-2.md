# Pacchetto `raggruppamento-scaglioni-correzioni-2`

Leggi `strumenti/opencode/resoconto-revisione-0-2-9.md`: rilievi con file:riga, scenario e prova. Correggi **1–7**;
per l'8 vedi sotto.

## Rilievi
1. **GRAVE**: in modalità `riga` `percentuali()` (sconto medio) non deve fare da cancello. Radice: un solo punto che dica
   «questo documento ha una provvigione calcolabile» valido in entrambe le modalità (in `riga`: `provvigioneDocumento`/
   `quotaSub` → gruppi; `subagente_id` da `abbinamento`). Usalo in `righeLiquidazione`, `fattiAnalisi`/`analisiTrimestre`
   e nel Riepilogo (`pratiche.ts` `bicchiere`). Prova della revisione: esatti+riga, 0% (600) + 10% (900) → 225 € in
   documento, Riepilogo, liquidazione, Analisi; nessuna anomalia.
2. **GRAVE**: in `righeLiquidazione`, in modalità `riga`, niente `differenzaNotaCongelata` (D-197): valore lineare come
   `calcoloDocumento`/`riconcilia`. Prova: nota su fattura congelata in riga → liquidazione = `quotaSub` = `calcolo`.
3. Cambio di `raggruppamento` (deroga o fornitore) e di `scaglioni_esatti` → aggiorna le anomalie
   (`aggiornaAnomalieProvvigione` o equivalente) nella stessa transazione. Prova: deroga che crea un'anomalia → elenco
   anomalie aggiornato subito.
4. + 5. Precedenza correzione → mensile → % agenzia **in una sola funzione** riusata da `quotaSub` e `provvigioneRiga`;
   `calcoloDocumento` non calcola `provvigioneRiga` due volte.
6. Messaggi di chiusura (`bollettino.ts`, `liquidazioni.ts`) dal tipo di anomalia vero (sconto medio, gruppo oltre
   l'ultimo, senza scaglione esatto).
7. Riepilogo: `anomaliaProvvigione` invece di `anomaliaScontoMedio`; `margine_pct` dalla provvigione effettiva; il segno
   `eccezione` in liquidazione vero anche quando un gruppo usa un'eccezione personale.
8. Motivo della deroga: salvalo nel `dettaglio` dell'evento con un campo esplicito (`{ campo: 'raggruppamento', prima,
   dopo, motivo }`) e leggilo filtrando su quel campo, non sull'ultimo `crud.update`. Niente colonna nuova.

## Prove
Jest con `DATABASE_URL` esplicito su `decobrands_test_correzioni2` (crea, migrazioni, cancella), a gruppi di suite (il giro
unico va in crash su Windows): tutte le suite in `app/backend/test`, **0 KO**; `npx tsc --noEmit` backend e frontend.
Modalità `documento`: suite esistenti senza ritocchi ai valori attesi.

## File ammessi
`app/backend/src/**`, `app/backend/test/**`, `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (solo se il
Riepilogo lo richiede), `strumenti/opencode/resoconto-revisione-0-2-9.md` (aggiungi in fondo «Correzioni 2»: rilievo →
cosa è cambiato → prova). Niente migrazioni.

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, D-27, D-51, D-183, D-197, D-199, D-200.
Codice minimo, una sola copia di ogni regola. **Ogni comando prisma/jest con `DATABASE_URL` esplicito nella stessa riga**;
mai `decobrands_db`; `.env` mai letto (URL con grep). Niente commit, porte 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill con lo
strumento `skill`: `owasp-security`, `ponytail-review`, `caveman`. Riepilogo in massimo 10 righe.
