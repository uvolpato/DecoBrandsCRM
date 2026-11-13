# Resoconto collaudo 5-01 — Stessa fattura su due pratiche solo con conferma «multi-ordine»

Esecutore: DeepSeek V4 · Data: 13/11/2026 · Rilievo: A4-08 (P2) · Decisione: U11 → D-123.

## Cosa ho fatto per ogni rilievo

### A4-08 — La stessa fattura da due file si abbina a due pratiche: fatturato doppio

- **Backend** `app/backend/src/documenti.ts`:
  - `NuovoDocumento` (riga 974): nuovo campo `@Facoltativo() @IsBoolean() multi_ordine?: boolean`. È una scelta
    della persona, non un valore calcolato (V12 rispettata).
  - `registra` (righe 1357–1364): dopo `controllaNumero`, se `fiscale(b.tipo)` e manca `multi_ordine`, cerca lo
    stesso `tipo+numero` del fornitore su un'**altra** pratica e risponde 409
    «Fattura … già registrata in OF/…: se è una fattura su più ordini conferma». La data diversa resta gestita da
    `controllaNumero` (prima, con un proprio 409). Il controllo è dentro la transazione col fornitore già bloccato
    (`bloccaFornitore` in `crea`/`abbina`): niente corse sul numero unico (D-54).
- **Frontend** (la finestra mostra la conferma):
  - `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (`FinestraDocumento`, righe 505–557 e 596–598): la
    registrazione a mano ora distingue il 409 multi-ordine (messaggio con «su più ordini») e mostra una `Conferma`;
    se confermata rimanda il corpo con `multi_ordine: true`.
  - `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (`inviaAbbina`, righe 197–216): idem per
    l'abbinamento di un file in coda a una pratica.
- **Prove**:
  - `app/backend/test/documenti-pratica.spec.ts` (righe 169–177): nuova prova — seconda registrazione di `RE-900` su
    un'altra pratica senza `multi_ordine` → 409; con `multi_ordine: true` → 201 (poi pulizia con DELETE).
  - `app/backend/test/documenti.spec.ts` (righe 276–277): la prova esistente «fattura su più ordini» registrava la
    seconda copia di `FT-MO` **senza** conferma; aggiornata con `multi_ordine: true` perché D-123 precisa D-54.

### File toccato fuori dagli ammessi

- `app/backend/test/documenti.spec.ts` **non** è nell'elenco «ammessi» (né in quello «vietati»). È stato necessario
  aggiornarlo perché la prova «fattura su più ordini» codificava il vecchio comportamento (multi-ordine senza
  conferma) che D-123 cambia. Nessun altro pacchetto dell'onda lo modifica (non è fra i vietati). Lo segnalo qui.

## Prove lanciate (database `decobrands_test_5_01`, cancellato alla fine)

- `npx jest test/documenti-pratica.spec.ts test/documenti.spec.ts` → **74/74 OK, 0 KO**.
- `npx tsc --noEmit` (backend) → **0 errori**.
- `npx tsc --noEmit` (frontend) → **0 errori**.
- `git status --short`: modificati solo i 5 file sopra (più i file degli altri pacchetti, non miei); nessun file
  fuori dagli ammessi oltre a `documenti.spec.ts` segnalato.

## Prove nel browser da lanciare a fine onda

- `app_pratica.py`, `app_documenti.py` (non modificate: nessuna prova browser copriva il doppione multi-ordine, e la
  conferma non altera il flusso normale di registrazione/abbinamento). Da rilanciare a fine onda come regressione.
- Non lanciate qui (porte e `.next` condivise con gli altri pacchetti). Sintassi non toccata (nessun `.py` modificato).

## Da documentare

Testi pronti per il pacchetto documentazione (io non tocco i file di documentazione).

### §19 — riga nuova

- **D-123** (08/11/2026): La stessa fattura (o nota di credito) può stare su un'altra pratica dello stesso fornitore
  solo se la persona conferma «multi-ordine». Registrando con tipo e numero già presenti per il fornitore su
  un'altra pratica, il server risponde 409 «Fattura già registrata in OF/…» a meno che il corpo porti
  `multi_ordine: true`. Perché: la stessa fattura che arriva da due file diversi (PDF email + scansione) veniva
  accettata su due pratiche e raddoppiava fatturato e provvigioni; la proposta «doppio» era solo un avviso. Precisa
  D-54 (multi-ordine). Chi: Ugo. Dove: `registra` in `app/backend/src/documenti.ts`, conferma nelle finestre di
  registrazione/abbinamento.

### §4.2.7.1 — riga *Perché*

> *Perché*: la stessa fattura su un'altra pratica è legittima solo se è una fattura su più ordini (multi-ordine,
> D-54): il server la rifiuta con 409 «già registrata in OF/…» e la accetta solo con la conferma `multi_ordine`
> della persona (D-123). Così un doppione arrivato da due file diversi non raddoppia fatturato e provvigioni.

### Guida (`app/frontend/lib/guida.ts`)

> **Da sapere** — Una fattura può coprire più ordini dello stesso fornitore. Se registri una fattura o una nota di
> credito con numero già presente su un'altra pratica, il CRM te lo chiede con una conferma: conferma solo se è
> davvero la stessa fattura su più ordini. Le copie restano legate (numero e data cambiano su tutte insieme), ma
> l'importo di ogni pratica resta la sua quota.

### Piano (`piano-lavoro-crm.md`)

> Attività collaudo onda 5, pacchetto 5-01 (A4-08, D-123): correzione backend + conferma nel frontend + prove. Ore:
> da approvare (allineare con il piano dell'onda).

### README (`app/README.md`)

> Nessuna nota specifica richiesta: nessuna nuova dipendenza, tabella o configurazione.
