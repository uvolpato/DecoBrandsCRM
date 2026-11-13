# Resoconto pacchetto 1-01-correzioni-1 — Motore: `suDocumento` disambigua i numeri riusati

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Gravità: P2 · Rilievo: C1

## Cosa ho fatto

### C1 — `suDocumento` confronta ancora solo il numero

`app/backend/src/motore/motore.ts`:

- `suDocumento` ora delega a `documentoDiRiga` (l'unico aiuto, quello già esistente), che distingue i
  numeri riusati per data e mese come `trovaDocumento`: `documentoDiRiga(S, b, r)?.doc.id === d.id`.
  Firmato per accettare `S` e `b` (servono alla ricerca), niente copie.
- Aggiornati i **quattro** punti d'uso di `suDocumento` (non solo i due dichiarati nel rilievo, che
  erano `riconosciutoIn` e `righeBollettinoDi`): anche le due chiamate dentro `riconcilia`
  (`motore.ts:263` e `:277`). Senza quest'ultime, `riconcilia` andava in errore a runtime
  (`r` inesistente nella nuova firma).

`app/backend/test/motore.spec.ts`:

- nuovo `it` «numero riusato sul maturato: la riga del bollettino di un anno non riconosce il
  documento dell'altro (C1)»: due bollettini verificati (2025 e 2026), ognuno con una riga
  `F-2026-0858` non abbinata; il documento 2026 è riconosciuto solo nel bollettino 2026, quello 2025
  solo nel 2025.

## Prove lanciate (database `decobrands_test_1_01c`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` su `decobrands_test_1_01c` | tutte le migrazioni applicate |
| `npx jest test/motore.spec.ts test/liquidazioni.spec.ts test/analisi.spec.ts` | **3 suite, 58 prove, 0 KO** |
| `npx jest test/seed.spec.ts test/bollettino.spec.ts` | **2 suite, 28 prove, 0 KO** (i numeri §12 non cambiano) |
| `npx tsc --noEmit` (backend) | 0 errori nei miei file; **2 errori in `test/utenti.spec.ts`** (file non mio, di un pacchetto parallelo) |

Il database `decobrands_test_1_01c` è stato creato, migrato, usato e **cancellato** alla fine. Mai
toccati `decobrands_db`, il database condiviso `decobrands_test`, né Integra (192.168.239.49).

**Nota `tsc`**: i 2 errori in `test/utenti.spec.ts` (`password: Promise<string>` su un JSON) sono
di un pacchetto parallelo (file nella lista dei vietati). Non li ho toccati. I miei file compilano
puliti.

## Prove nel browser da lanciare a fine onda

Nessuna: correzione solo nel motore (backend), nessun file del frontend `app/` toccato.

## Da documentare (per il pacchetto documentazione)

**Nessuna decisione nuova (D-nn)**: la correzione allinea `suDocumento` alla regola già esistente
D-34 (numero riusato, disambiguazione per data/mese) introdotta con A2-05. Non nasce né cambia una
regola.

**Riga *Perché* in §4.2.7 / D-34**: «La ricerca del documento di una riga di bollettino sta in un
solo aiuto (`documentoDiRiga`) e vale anche per dire se una riga è "su" un documento: `suDocumento`
lo usa, così un numero riusato in due anni non fa risultare riconosciuto (o stornato) il documento
dell'anno sbagliato sul maturato (C1).»

**Guida, piano, README**: nessun testo nuovo (comportamento interno del calcolo).
