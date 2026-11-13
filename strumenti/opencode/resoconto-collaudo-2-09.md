# Resoconto pacchetto 2-09 — Motore: indici costruiti una volta, niente scansioni quadratiche

Data: 13/11/2026 · Esecutore: DeepSeek V4 · Gravità: P2 · Rilievi: A7-21.

Esito: **rilievo corretto**. Stessa semantica e stesso ordine: tutte le prove del motore danno gli stessi numeri di prima, nessun numero atteso cambiato. `npx tsc --noEmit` **0 errori sui file di questo pacchetto** (vedi nota sotto). Prove nel browser **non lanciate** (regole dell'onda).

## Rilievo

### A7-21 — Il motore fa scansioni quadratiche per ogni documento
Gli indici si costruiscono una volta sola in `componi` e le funzioni li leggono; `suDocumento` resta il criterio d'uguaglianza (identico al `documentoDiRiga` di prima).

- `app/backend/src/motore/dati.ts`:
  - `:178` estratto `bollettinoDaDb` (prima la conversione era dentro `componi`), così esiste il tipo `Bollettino` per gli indici.
  - `:197` `scegliDocumento` — la scelta del documento fra i candidati (data esatta → più recente entro il mese → primo), identica a `trovaDocumento`.
  - `:207` `costruisciIndici(pratiche, bollettini)` — costruisce una volta `perDocumento`, `perNumero` (il primo documento per numero e per pratica, come il `.find` di prima), `fattureDi` (per `cliente|fornitore|mese`), `bollettiniDi`, `righeSuDocumento` (per id, risolvendo ogni riga una sola volta) e `praticaPerId`.
  - `:272-274` `componi` ora restituisce gli indici più i riferimenti `_pratiche`/`_bollettini` (servono a `indici()` per capire se rigenerarli).
- `app/backend/src/motore/motore.ts`:
  - `:21` `indici(S)` — se `pratiche` o `bollettini` sono stati sostituiti (le prove lo fanno con lo spread `{ ...S, pratiche: [...] }`), rigenera gli indici sul posto; altrimenti riusa quelli di `componi`.
  - `:141` `documentoPerId` → `perDocumento.get(id)`.
  - `:149` `trovaDocumento` → `perNumero` filtrato per fornitore + `scegliDocumento`.
  - `:155` `fatturaDelMese` → `fattureDi` (stessa ordinazione e stesso esito per la scelta «più alta/prima»).
  - `:208` `bollettinoDi` → `bollettiniDi`.
  - `:216` `riconosciutoIn`, `:221` `righeBollettinoDi` → `righeSuDocumento` (stesso ordine per fornitore e per mese).
  - `:438` `analisiTrimestre` → `praticaPerId.get` (era `S.pratiche.find` nel ciclo).
  - `suDocumento`/`documentoDiRiga` restano identici (ora veloci perché leggono gli indici); `riconcilia` e il giro degli storni ne beneficiano senza modifiche.
- `app/backend/test/motore-volumi.spec.ts` (nuovo): 5.000 pratiche maturate con 5.000 righe di bollettino verificato; `righeLiquidazione(S, 2026, 2)` torna 5.000 righe e deve restare sotto 1 s (il vecchio codice faceva ≈ 6·10¹⁰ confronti).

## Prove

| Prova | Esito |
|---|---|
| `npx jest test/motore.spec.ts` | 23 passati, 0 KO |
| `npx jest test/motore-volumi.spec.ts` | 1 passato, 0 KO |
| `npx jest test/motore.spec.ts motore-volumi.spec.ts liquidazioni.spec.ts analisi.spec.ts oggi.spec.ts bollettino.spec.ts correzione.spec.ts seed.spec.ts` | 8 suite, 106 passati, **0 KO** |
| `npx tsc --noEmit` in `app/backend` | 0 errori sui file del pacchetto; **restano 7 errori in `src/documenti.ts`** (TS2749 `Dec` usato come tipo) che è di un altro pacchetto dell'onda e non è fra i miei file ammessi |

Database di prova `decobrands_test_2_09`: usato e cancellato a fine lavoro.

File toccati (solo ammessi): `motore/dati.ts`, `motore/motore.ts`, `test/motore-volumi.spec.ts`, questo resoconto. Nessun file vietato.

## Da documentare

**Registro §19 — nessuna decisione nuova** (stessa semantica, solo struttura interna per le prestazioni). Se il pacchetto documentazione vuole una riga di traccia, il testo pronto è:
> D-… (13/11/2026) — *Il motore costruisce gli indici una volta sola.* In `componi` si costruiscono `perDocumento`, `perNumero`, `fattureDi`, `bollettiniDi`, `righeSuDocumento` e `praticaPerId`; le funzioni leggono gli indici invece di riscorrere pratiche e bollettini. Perché: con tanti documenti il costo era quadratico (documenti × righe di bollettino, ~6·10¹⁰ confronti) e il `$transaction` della chiusura rischiava il limite dei 30 s. Chi: Ugo/DeepSeek V4. Dove: `motore/dati.ts`, `motore/motore.ts`.

**Spec §10 (motore) — riga *Perché* pronta:**
> Gli indici sui documenti e sulle righe dei bollettini si costruiscono una volta in `componi` e si riusano, così nessuna funzione del motore riscorre tutte le pratiche o tutti i bollettini per ogni documento. Se `pratiche` o `bollettini` vengono sostituiti, gli indici si rigenerano al primo uso.

**Guida (`lib/guida.ts`)**: niente da cambiare.

**Piano (`piano-lavoro-crm.md`)**: nessuna attività nuova, 0 ore da approvare (correzione di prestazioni dentro il motore già previsto).

**README**: niente da cambiare.
