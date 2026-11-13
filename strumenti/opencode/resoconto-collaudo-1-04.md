# Resoconto pacchetto 1-04 — Impostazioni: il segreto vecchio non parte verso un server nuovo

Data: 08/11/2026 · Esecutore: DeepSeek V4 · Gravità: P1 · Rilievi: A1-01 (solo parte a), A8-06 (solo `elencoSezioni`) · Decisione U2 → D-115 (non aperta)

## Cosa ho fatto

### A1-01 (parte a) — 400 «Hai cambiato il server: scrivi di nuovo la password»

`app/backend/src/impostazioni.ts`, in `applica` (dopo il ciclo sui campi, prima del controllo soglie):

- Aggiunta la mappa `CONNESSIONI`: `casella` → `['server', 'porta', 'utente']`, `posta` → `['server', 'porta', 'utente']`, `integra` → `['server', 'utente']` (Integra non ha `porta`).
- Se cambia un campo che individua il server (`nome in dopo`, cioè un campo realmente cambiato) e il segreto della sezione non arriva nello stesso salvataggio (`dopo[segreto.nome] !== 'sostituita'`, cioè password assente o vuota), si lancia `BadRequestException` «Hai cambiato il server: scrivi di nuovo la password». Commento `// D-115 §19`.

La parte (b) (permesso `sistema.connessioni` solo al superutente) **non è toccata**, come chiede il pacchetto: `accesso.ts` e la tabella permessi restano intatti. Il fronte (nascondere/bloccare la sezione e dire perché) appartiene alla parte (b), anch'essa rimandata.

### A8-06 (parte) — codice morto

`app/backend/src/impostazioni.ts`: cancellato `export const elencoSezioni` (riga 313). Nessun uso nel codice né nelle prove (verificato con grep): `importoRighe` di `motore/motore.ts` resta a un altro pacchetto, come da nota.

### Prove nel file di test

`app/backend/test/impostazioni.spec.ts`:

- Aggiornato «password: vuota conserva la precedente»: il vecchio cambio di `server` con `password: ''` atteso 200 ora è **400** e il segreto resta; aggiunto il caso password vuota su un campo che non individua il server (ancora 200, password conservata).
- Nuovo «cambio di server, porta o utente senza password è 400 e il segreto non parte (A1-01)»: `posta.server`, `posta.porta`, `posta.utente` cambiati senza password → 400, `postaConfig` invariato; con `password` nello stesso salvataggio il cambio passa (200).
- Nuovo «azienda (sezione senza connessione) si salva da amministratore e scrive il registro»: `PUT /api/impostazioni/azienda` da amministratore → 200, dato cambiato, una riga di registro `impostazione` in più.

## Review chiesta dal pacchetto (skill caricate davvero)

**`owasp-security`** (sul controllo nuovo):

- Il controllo sta nel backend dentro `applica`, eseguito nella transazione di `salva`: il browser non può aggirarlo (V12). `chiave` è validata da `sezioneDi` (404) e le chiavi di `valori` contro i campi della sezione (`Campo sconosciuto`): nessun input libero.
- Fallisce chiuso (400) e il messaggio è generico, senza il valore digitato né il segreto: nessun dato sensibile esce né finisce nel registro.
- `sezione.campi.find((c) => c.segreto)!`: per `casella`/`posta`/`integra` c'è un solo campo segreto (`password`), l'assert non-null è sicuro.
- Nessun rilievo. Nota di portata (non un difetto): il cambio di `integra.database` non è bloccato, perché D-115 nomina solo «server, porta o utente»; la password autentica al server, non al database. Se un domani serve, è una riga nella mappa.

**`ponytail-review`** (correttezza, snellezza, prova):

- La mappa è necessaria (Integra non ha `porta`), il controllo è 7 righe utili; nessun codice speculativo. Il taglio di `elencoSezioni` è netto. Prova piccola e mirata: `net: -3 righe` rispetto alla correzione alternativa di duplicare il controllo per sezione. Verdetto: spedire.

## Prove lanciate (database `decobrands_test_1_04`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (backend) | 0 errori |
| `npx prisma migrate deploy` sul database di prova | tutte le migrazioni applicate |
| `npx jest test/impostazioni.spec.ts test/sistema.spec.ts` | **2 suite, 41 prove, 0 KO** |
| `git diff` / `git status --short` | toccati solo `app/backend/src/impostazioni.ts` e `app/backend/test/impostazioni.spec.ts` (i file degli altri pacchetti dell'onda restano loro) |

Database `decobrands_test_1_04` creato, migrato, usato e **cancellato** alla fine. Mai toccati `decobrands_db`, `decobrands_test` condiviso, né Integra.

## Prove nel browser da lanciare a fine onda

Nessuna: la parte (a) non cambia l'interfaccia (il fronte mostra già il messaggio 400 dal server come per gli altri errori di validazione). La parte (b), che nasconde/blocca la sezione Posta/Casella/Integra ai non superutenti, arriva col pacchetto `connessioni-superutente` e porterà con sé le sue prove.

## Da documentare (per il pacchetto documentazione)

La riga §19 **D-115** la scrive il pacchetto documentazione dell'onda di `connessioni-superutente` (parte b), non questo: qui è solo la parte (a). Però il comportamento della parte (a) va citato:

**Riga *Perché* nella sezione della spec** (§7.15 Impostazioni): «Se cambia server, porta o utente di una connessione (casella, posta, integra) e la password non è riscritta nello stesso salvataggio, il salvataggio è rifiutato (400): il segreto salvato non parte mai verso un indirizzo nuovo.»

**Guida (`app/frontend/lib/guida.ts`)** — *Da sapere* delle Impostazioni: «Quando cambi il server di Posta, Casella o Integra devi riscrivere anche la password: quella salvata non viene mai riusata verso un indirizzo nuovo.»

**Piano (`piano-lavoro-crm.md`)**: l'attività «Impostazioni: il segreto vecchio non parte verso un server nuovo (A1-01a, D-115)» è già nel piano-correzioni; nessuna ora nuova oltre a quelle già stimate.

**README**: nulla.
