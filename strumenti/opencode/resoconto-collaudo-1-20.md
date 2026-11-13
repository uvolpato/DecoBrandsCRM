# Resoconto collaudo · Onda 1 · Pacchetto 1-20

Data: 12/11/2026 · Esecutore: DeepSeek V4 · Rilievi: U4 (→ D-117).

## Cosa ho fatto

### U4 — Avviso al vecchio indirizzo quando cambia l'email di un utente (D-117)

**`app/backend/src/posta.ts`**
- Estratta la funzione privata `spedisci(db, m, trasportoFinto?)` da `invia`: fa l'invio, apre/chiude le anomalie `posta.respinta`/`posta.connessione` e torna il testo dell'errore (o `null`), senza toccare `ultimo_invio` né lanciare. `invia` ora chiama `spedisci` e poi scrive `ultimo_invio` (comportamento identico a prima).
- Aggiunta `avvisoEmailCambiata(db, vecchio, chi, quando, trasportoFinto?)`: compone il testo «L'email del tuo utente *<username>* nel CRM Decobrands è stata cambiata il <data ora> da <nome>.\nSe non l'hai chiesto tu, avvisa il superutente.» (senza il nuovo indirizzo) e lo manda con `spedisci`. Non scrive `ultimo_invio`: quello è per le password; un invio fallito apre la solita anomalia posta e non annulla la modifica.

**`app/backend/src/utenti.ts`** — `modifica` (`PUT /api/utenti/:id`)
- Nel ramo `'email' in diff.dopo` (email cambiata), oltre ad annullare i link di reimpostazione, salva `vecchiaEmail = prima.email` solo se non vuota.
- Dopo il commit (`unico`/`$transaction`), se `vecchiaEmail` c'è: `avvisoEmailCambiata(this.db, vecchiaEmail, { username: req.utente!.username, nome: req.utente!.nome }, new Date())` — dopo il commit, V13.

**`app/backend/test/utenti.spec.ts`** — nuovo caso nella sezione *modifica*
- «cambio email: avviso al vecchio indirizzo; altri campi: nessun messaggio (D-117)»: spia su `posta.avvisoEmailCambiata`; cambio email → 1 chiamata col vecchio indirizzo (`trasloco2@prova-utenti.it`) e con `chi` = l'amministratore che ha fatto il cambio (`{ username: 'ammi', nome: 'Prova ammi' }`); cambio del solo nome (email identica) → nessuna chiamata.

Nota: la correzione chiedeva «codice nuovo in `SCHEMI` se serve: chiedi nel resoconto se `registro.ts` va toccato». **Non serve**: riuso le anomalie esistenti `posta.respinta`/`posta.connessione` (via `spedisci`), nessun codice nuovo, `registro.ts` non toccato.

## Prove

- `cd app/backend && npx jest test/utenti.spec.ts` → **19 passati, 0 KO** (col database `decobrands_test_1_20`).
- `cd app/backend && npx jest test/impostazioni.spec.ts` → **19 passati, 0 KO**: copre il comportamento di `invia`/`spedisci` (incluso «invia con trasporto finto: riuscito aggiorna ultimo_invio, rifiutato apre posta.respinta senza lanciare»), a riprova che il refactoring di `posta.ts` non ha rotto nulla.
- `cd app/backend && npx tsc --noEmit` → **0 errori**.
- Nota sul comando indicato dal pacchetto (`npx jest test/utenti.spec.ts test/posta.spec.ts`): **`test/posta.spec.ts` non esiste**; la prova della posta sta in `test/impostazioni.spec.ts` (non toccata: è fra i file vietati).
- Prove nel browser: **nessuna**. Il rilievo è solo backend, nessuna modifica all'interfaccia, quindi `app_utenti.py` non richiede aggiornamenti né va rilanciato per questo pacchetto.
- Database di prova `decobrands_test_1_20` **cancellato**.
- `git diff --name-only`/`git status --short`: toccati solo `app/backend/src/posta.ts`, `app/backend/src/utenti.ts`, `app/backend/test/utenti.spec.ts` (+ questo resoconto). Gli altri file modificati/untracked appartengono agli altri pacchetti dell'onda, non li ho toccati.

## Cose aperte

Nessuna.

## Da documentare

Nuova regola (D-117): il testo pronto per il pacchetto documentazione.

**Riga §19 (registro):**

`| D-117 | 12/11/2026 | **Quando un amministratore o il superutente cambia l'email di un utente, il server manda al vecchio indirizzo un avviso** con chi ha fatto il cambio e quando, senza rivelare il nuovo indirizzo; un invio fallito apre la solita anomalia `posta.respinta`/`posta.connessione` e non annulla la modifica. Nessun invio se il vecchio indirizzo è vuoto. | Chi cambia l'email e poi reimposta la password entra al posto della persona senza che questa lo sappia: l'avviso al vecchio indirizzo è l'unico segnale che arriva al legittimo proprietario. | Ugo (collaudo 1-20, U4) | §7.13; `utenti.ts`, `posta.ts` |`

**Riga *Perché* in §7.13** (da aggiungere ai punti della sezione Utenti e ruoli):

`- *Perché (D-117):* cambiare l'email senza avvisare il vecchio indirizzo permette a chi può reimpostare la password di entrare al posto della persona, senza che questa ne sappia nulla; l'avviso al vecchio indirizzo è l'unico segnale per il legittimo proprietario.`

**Testo guida (`app/frontend/lib/guida.ts`)** — voce `utenti`, elenco `sapere`, nuova riga:

`'Se cambi l’email di un utente, al vecchio indirizzo arriva un avviso con chi ha fatto il cambio e quando.'`

**Piano/ore e README:** niente. È una correzione di sicurezza del collaudo (P2), nessuna attività né ore da preventivare.
