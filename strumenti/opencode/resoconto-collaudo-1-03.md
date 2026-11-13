# Resoconto · Onda 1 · Pacchetto 1-03 — Documenti: D-87, documento in errore recuperabile, corpo non valido

Esecutore: DeepSeek V4 · data 12/11/2026 · database di prova `decobrands_test_1_03` (creato, migrato, usato, **cancellato**).

## Riepilogo per rilievo

### A4-01 (P1) — un documento in `errore` non si può correggere, abbinare né rileggere — CORRETTO
- `app/backend/src/lettore.ts:17-24`: `LetturaFallita` porta la proprietà `stato` (stato HTTP); i quattro `throw` con stato (progetti, caricamento, avvio lettura, esito) lo passano (`:75`, `:136`, `:157`, `:166`). I guasti senza HTTP (timeout, job fallito, eccezione generica) restano senza `stato`.
- `app/backend/src/lettura.ts:150-159` (`leggiDallaCoda`): se `LetturaFallita.stato` è 401/402/403/429, chiama `letturaNonRaggiungibile` invece di `letturaFallita`: la riga torna `in_coda` senza consumare il tentativo.
- `app/backend/src/documenti.ts:170-188` (`letturaNonRaggiungibile`): transazione con `FOR UPDATE`, solo da `in_lettura`; `stato='in_coda'`, `tentativi=max(0, tentativi-1)`, `errore`; apre `lettura.non_raggiungibile` con chiave vuota (come il controllo di Sistema §7.14.3, un'anomalia sola di servizio).
- `app/backend/src/documenti.ts:897-918` (`POST /api/documenti/:id/rileggi`): `provvigioni.modifica`, transazione `FOR UPDATE`, solo da `errore` → `in_coda`, `tentativi=0`, `errore=null`, chiude `lettura.fallita`, evento `documento.update`. 409 se non è in errore.
- `app/backend/src/documenti.ts:721-722` (`correggi` PUT): ammette `errore` oltre a `da_controllare`; `:839-846` porta `stato='da_controllare'` (e `tentativi=0` se veniva da errore) e chiude `lettura.fallita`.
- `app/backend/src/documenti.ts:1287-1292` (`registra`): il file in `errore` si può abbinare a mano; se veniva da errore chiude `lettura.fallita`.
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`: pulsante *Rileggi il documento* per `errore` (`rileggi()` a `:314` circa) e *Correggi i dati letti* ammesso anche per `errore` (così «inserire i dati a mano» è raggiungibile).

### A4-13 (P3) — `PUT /api/documenti/:id` con corpo non oggetto dà 500 — CORRETTO
- `app/backend/src/documenti.ts:712-717`: in testa a `correggi`, `ogg = (v) => v != null && typeof v === 'object' && !Array.isArray(v)`; 400 se `testata` non è oggetto, se `righe` non è un elenco di oggetti o supera 1000. `righe` assente resta ammesso (D-133).

### A2-04 (P1) — fattura fuori agenzia: provvigione a 0 in silenzio (D-87 solo sull'ordine) — NON FATTO
Vedi «Cose aperte» punto 1. Va contro D-137 (11/11, successivo al report dell'08/11): fermato, non inventato.

## Prove lanciate

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` su `decobrands_test_1_03` | ok |
| `npx jest test/documenti-pratica.spec.ts test/documenti-lettura.spec.ts test/coda.spec.ts test/lettura.spec.ts test/lettore.spec.ts` | **tutte passate, 0 KO** |
| `npx jest test/documenti.spec.ts` | **1 KO** (non mio, vedi sotto) |
| `npx tsc --noEmit` backend | 0 errori |
| `npx tsc --noEmit` frontend | 0 errori |
| `python -m py_compile strumenti/prove/app_documenti.py` | ok |
| `git status --short` | modificati solo file ammessi (documenti.ts, lettura.ts, lettore.ts, VistaDocumento.tsx, documenti-lettura.spec.ts, coda.spec.ts, app_documenti.py, questo resoconto); gli altri file modificati sono di pacchetti paralleli |

Il KO di `documenti.spec.ts` è nel test «creata l'agenzia via API, la registrazione riesce» (`documenti.spec.ts:463`): `POST /clienti/:id/agenzie` con `valido_dal: '2026-01-01'` ora dà 409, perché il pacchetto 1-02 ha aggiunto in `clienti.ts` il blocco D-114 («periodo chiuso») e il seed ha liquidazioni chiuse. **Non dipende da questo pacchetto**: `clienti.ts` e `documenti.spec.ts` non sono fra i miei file. Da sistemare nella chiusura dell'onda (1-02 o coordinatore).

Database `decobrands_test_1_03` cancellato a fine lavoro; cartella `%TEMP%\decobrands-1-03`.

## Prove nel browser da lanciare a fine onda (non lanciate, regola dell'onda)
- `strumenti/prove/app_documenti.py`: nuovo blocco «A4-01» che, con la scheda simulata `stato='errore'`, verifica i pulsanti *Rileggi il documento* e *Correggi i dati letti*.

## Controlli
Codice non «sensibile» secondo la regola (nessun calcolo di provvigioni, nessuna migrazione/SQL nuovo, nessun dato di Integra, permessi riusati con `@Richiede('provvigioni.modifica')`): controllo leggero fatto da me rileggendo il diff. Le transazioni e i `SELECT … FOR UPDATE` di `rileggi` e `letturaNonRaggiungibile` copiano i pattern esistenti di `scarta`/`letturaFallita` (V13). Nessun rilievo.

## Cose aperte (da decidere, non inventate)
1. **A2-04 contro D-137.** A2-04 chiede di rifiutare (409) una `fattura`/`nota_credito` senza agenzia e scaglione **alla data del documento**. D-137 (11/11, successivo al report dell'08/11) dice il contrario: per una pratica già aperta basta l'agenzia alla **data dell'ordine**, «subagente e percentuali seguono l'ordine, non la fattura». Implementare A2-04 rovescerebbe D-137 e farebbe fallire il test già esistente «l'agenzia chiusa dopo l'ordine non ferma i documenti della pratica già aperta (D-137)». Non l'ho fatto.
2. **Il 0% silenzioso resta.** D-137 ha solo allentato il controllo in registrazione; il motore (`app/backend/src/motore/motore.ts:340` e `:367`, `percentuali(S, p, d.data)` con la **data del documento**) continua a calcolare alla data del documento: la fattura datata dopo la chiusura dell'agenzia entra in pratica ma sparisce da liquidazione e Analisi (il «noi 0,00 €» di A2-04). Il motore è **fuori dai miei file ammessi**. Serve una decisione di Ugo: (a) cambiare il motore perché le percentuali seguano l'ordine (coerente con D-137), oppure (b) ripristinare il blocco alla data del documento (A2-04) rovesciando D-137.

## Da documentare (per il pacchetto documentazione dell'onda)

### §19 — registro delle decisioni
Nessun D-nn nuovo: A4-01 e A4-13 sono correzioni di comportamento già deciso, non regole nuove. L'unica possibile riga da aggiungere, se Ugo vuole, è una *Perché* (non una decisione) sul punto 2 delle cose aperte. Se invece si decide (a) o (b) del punto 2, la riga D-nn la scrive Ugo.

### Riga *Perché* nelle sezioni della spec
- **§6.5 / §7.9 (documento in errore)**: «Perché (A4-01): un errore del servizio di lettura (chiave scaduta, crediti finiti: 401/402/403/429) non è colpa del documento, quindi non consuma i tentativi e apre `lettura.non_raggiungibile`; un documento in `errore` si recupera con *Rileggi* (torna in coda) o inserendo i dati a mano (*Correggi*), non solo scartandolo.»
- **§7.9 (corpo della correzione)**: «Perché (A4-13): il corpo di `PUT /api/documenti/:id` è un'interfaccia, il `ValidationPipe` non lo valida; si controlla a mano che `testata` sia un oggetto e `righe` un elenco di oggetti (al massimo 1000), così un corpo malformato dà 400 e non 500.».

### Guida in linea (`app/frontend/lib/guida.ts`, pagina `documenti`)
- `pulsanti`, **aggiungere** «Rileggi il documento»: «Riprova la lettura di un documento finito in errore (per esempio perché il servizio era irraggiungibile o senza crediti): il documento torna in coda e il lettore lo riprende al giro successivo.»
- `sapere`, **aggiungere**: «Un documento in errore non è perso: puoi riprovare la lettura con *Rileggi* oppure inserire i dati a mano con *Correggi i dati letti* e poi abbinarlo. Solo se non serve lo scarti.»
- `sapere`, **modificare** la voce sul servizio di lettura: «Se il servizio di lettura non risponde (chiave scaduta, crediti finiti), i documenti restano in coda senza consumare i tentativi e si apre l'anomalia *Lettura non raggiungibile*.»

### Piano (`piano-lavoro-crm.md`, §12)
- Attività «Onda 1 — documento in errore recuperabile (Rileggi, correggi/abbinamento da errore, 4xx di servizio senza consumo tentativi) e 400 sul corpo malformato di PUT documenti». **3 ore — da approvare.**

### README
Niente da cambiare in `app/README.md`: nessun comando, porta o variabile nuova.
