# Resoconto collaudo · Onda 1 · 1-10 — correzioni 1 (C1)

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Rilievo: **C1** (P3). Database: `decobrands_test_1_10c` (cancellato).

## Esito

Rilievo **corretto**. Solo i file ammessi toccati, nessun commit, database di prova cancellato.

## Cosa ho fatto

### C1 — un errore interno della casella non è più segnalato come «email non leggibile»

- `app/backend/src/casella.ts`:
  - `TESTO` (riga ~57): nuovo testo `interno` = «Un'email non si è potuta registrare per un errore del server:
    riprova; se si ripete, avvisa l'assistenza.».
  - `apriAnomaliaCasella` (righe 170-179): un aiuto solo per l'anomalia «dettaglio nome+errore», con codice e
    messaggio come argomenti. Rimpiazza i quattro blocchi `apriAnomalia` duplicati (troppoGrande, illeggibile,
    allegato scartato, errore interno).
  - errore interno (righe 233-241): ora apre `casella.interno` con `TESTO.interno` (prima era `casella.allegato`
    con `TESTO.illeggibile`, il blocco duplicato).
  - illeggibile, troppoGrande e allegato scartato restano `casella.allegato` con i loro testi, invariate.
- `app/backend/test/casella.spec.ts`: nuova prova «errore interno del server su un allegato → `casella.interno`,
  non si sposta, si va avanti» (spia su `riceviDocumento` con `mockRejectedValueOnce(new Error('database giù'))`;
  l'altra email entra, la prima resta e apre `casella.interno`, nessuna `casella.allegato`).

## Prove eseguite

Database `decobrands_test_1_10c` creato, `prisma migrate deploy`, cartella documenti in `TMP/TEMP`, poi cancellato.

- `cd app/backend && npx jest test/casella.spec.ts` → **1 suite, 13 prove, 0 KO** (era 12, +1 per C1).
- `cd app/backend && npx tsc --noEmit` → **i miei file passano**; restano errori in `src/motore/motore.ts` e
  `test/motore.spec.ts` (firme e tipi), file di **altri pacchetti** in parallelo, non miei e fuori dagli ammessi.
- `git status --short`: fra i miei file ho toccato solo `app/backend/src/casella.ts`,
  `app/backend/test/casella.spec.ts` e questo resoconto. Tutto il resto è lavoro degli altri pacchetti.

## Prove nel browser da lanciare a fine onda

Nessuna prova nuova (difetto solo nel backend). Da rilanciare invariate:

- `python strumenti/prove/app_sistema.py <suffisso> <cartella schermate>` — Stato del sistema (anomalie `casella.*`);
- `python strumenti/prove/app_documenti.py <suffisso> <cartella schermate>` — ingresso documenti.

## Cose aperte

- Il nuovo codice `casella.interno` va registrato anche in **due file non ammessi** (li possiedono altri pacchetti),
  altrimenti in *Stato del sistema* l'anomalia non ha il «cosa fare» (`sistema.ts`) e manca dallo schema (`registro.ts`):
  - `app/backend/src/sistema.ts` → `COSA_FARE['casella.interno'] = 'Riprovare; se si ripete, avvisare l'assistenza.'`;
  - `app/backend/src/registro.ts` → `SCHEMI['casella.interno'] = ['nome', 'errore']` (per ora le anomalie non passano
    da `controlla`, quindi non è bloccante, ma va allineato).
  Li segnalo qui perché non posso toccarli.
- Nessuna correzione contro il §19: è una correzione di correttezza dentro D-66 (le anomalie `casella.*` restano).

## Da documentare (per il pacchetto documentazione dell'onda)

### §19 — riga D-nn

**Nessuna decisione nuova.** C1 è una correzione dentro D-66 (codice e testo dell'anomalia di errore interno).

### Spec §7.14.3 — catalogo dei problemi (riga nuova)

Aggiungere al catalogo (§7.14.3, tabella delle anomalie della casella):

> | casella | `casella.interno` | attenzione | un errore del server ha impedito di registrare un'email (es. database giù) | riprovare; se si ripete, avvisare l'assistenza | no (si segna come visto) |

*Perché:* un guasto del server non è un'email illeggibile: prima condivideva codice e testo con `casella.allegato`
e mandava l'utente a caricare il documento a mano. Ora le due cause hanno codice e messaggio propri (C1).

### Guida in linea (`app/frontend/lib/guida.ts`) e prototipo (`prototipo-alternativo/assets/guida.js`)

**Nessuna modifica**: non cambia nulla per chi usa l'app.

### Piano (`piano-lavoro-crm.md`)

**Nessuna voce nuova**: sta dentro F6-A1 (ingresso documenti) già prevista. Se il controllo di fine onda vuole
tracciarla: riga «casella: codice e testo distinti per l'errore interno (C1)» con 0,5 h **da approvare**, fatte.

### README

**Nessuna modifica**.
