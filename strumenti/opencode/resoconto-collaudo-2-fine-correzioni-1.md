# Resoconto collaudo · Onda 2 · fine correzioni 1 (13/11/2026)

Esecutore: DeepSeek V4 pro · Gravità: P1 · Database di prova: `decobrands_test_2_fine` (jest), `decobrands_test_e2e` (browser).

## Rilievi e correzioni

### C1 — `Schede` perdeva la scheda ricordata (StrictMode) — corretto
- `app/frontend/componenti/Schede.tsx`: tolto `primo`; ora `prima = useRef(iniziale)` e l'effetto segue solo i cambi veri di `iniziale` (se uguale al valore precedente esce subito). Il doppio giro di StrictMode non sovrascrive più la scheda di `memoria` (§7.12).

### C2 — Somma per codice replicata in `documenti.ts` — corretto
- `app/backend/src/motore/motore.ts`: esportati `chiaveRiga` e `perCodice`.
- `app/backend/src/documenti.ts`: `confrontoDocumenti` ora mappa le righe del documento nella forma del motore e chiama `perCodice`, tolta la copia locale (una sola regola, V12).

### C3 — `app_impostazioni.py` usava l'amministratore per le connessioni — corretto
- `strumenti/prove/app_impostazioni.py`: «Prova la connessione» e il salvataggio della password della casella ora usano `<s>-super`; aggiunto un controllo che per `<s>-ammi` la sezione casella è in sola lettura (niente *Prova la connessione*, niente *Salva*, nota «Solo il superutente»). Intestazione del file aggiornata.

### C4 — *Scarica* spento in sola lettura in Liquidazioni — corretto
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`: il pulsante *Scarica* della finestra *Esporta* ha ora `className="btn consentito"`.

### C5 — Prove ferme del giro — (vedi sezione Prove)

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` backend | 0 errori |
| `npx tsc --noEmit` frontend | 0 errori |
| `npx jest test/pratiche.spec.ts` | 16 prove, 0 KO |
| `npx jest test/motore.spec.ts` | 23 prove, 0 KO |
| `npx jest test/documenti.spec.ts` | 48 prove, 0 KO |
| `npx jest test/documenti-pratica.spec.ts` | 20 prove, 0 KO |
| `python -m py_compile strumenti/prove/app_impostazioni.py` | OK |
| prove nel browser (prepara.sh + giro.sh) | vedi sotto |

## Da documentare

- **Registro §19 — nessuna decisione nuova.** C1 è la correzione di A5-01 (§7.12), C2 di D-60/V12, C3 di D-115, C4 di una regola di sola lettura (§11). Nessun cambio di decisione, nessuna riga nuova richiesta.
- **Spec**: nessun cambio di sezione né riga *Perché* (correzioni di bug dentro decisioni già scritte).
- **Guida**: nessun testo da cambiare.
- **Piano**: nessuna attività nuova, 0 ore da approvare.
