# Resoconto collaudo · Onda 1 · 1-20 correzioni 1 (C1, C2)

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Database di prova: `decobrands_test_1_20c`, poi cancellato.

## Stato al riavvio

Una sessione precedente si era fermata a metà: le correzioni C1 e C2 erano già scritte nei file ammessi, ma il lavoro non era stato verificato né chiuso. Ho controllato il `git diff` dei tre file ammessi e completato.

## Cosa era già fatto (confermato nel diff)

- **C1** — `app/backend/src/utenti.ts` (`modifica`, `PUT /api/utenti/:id`): nel ramo `'email' in diff.dopo` salva `vecchioUsername = prima.username` (l'account cambiato, non `req.utente`); dopo il commit chiama `avvisoEmailCambiata(this.db, vecchiaEmail, { username: vecchioUsername! }, { nome: req.utente!.nome }, new Date())`. `req.utente` serve solo per il campo `da` (chi ha fatto il cambio).
- **C2** — `app/backend/src/posta.ts` (`avvisoEmailCambiata`): il testo usa `quando.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })`.
- La firma di `avvisoEmailCambiata` è `(db, vecchio, utente: { username }, da: { nome }, quando, trasportoFinto?)` — separa l'account cambiato da chi l'ha fatto.

## Cosa ho completato (bug nel test C1/C2)

Il test nuovo «l'avviso nomina l'utente cambiato e l'ora di Roma (C1, C2)» in `app/backend/test/utenti.spec.ts` falliva per due motivi, entrambi nel file di prova (non nel codice di produzione):

1. **`cifra` sbagliata**: usava `cifra` di `../src/password` (hash della password) per cifrare la password SMTP delle impostazioni. `postaConfig` si aspetta un segreto `v1:…` di `../src/segreto`; con l'hash la config tornava `null`, `spedisci` non mandava nulla e `testo` restava vuoto. Corretto importando `import { cifra as cifraSegreto } from '../src/segreto'` e usando `cifraSegreto('pw')`.
2. **Asserzione non corrispondente al testo**: il testo reale è «L'email **del** tuo utente lbianchi…» (articolo partitivo «del», non «il»). `toContain('il tuo utente lbianchi')` non trovava la sottostringa. Corretto in `toContain('tuo utente lbianchi')`, che è il punto di C1: nomina l'account cambiato, non chi l'ha fatto.

## Prove lanciate

Ambiente: `DATABASE_URL_TEST` ricavato con `node` + `dotenv` dentro `app/backend`, sostituendo il nome del database con `decobrands_test_1_20c` (mai stampato nei log). Il database esisteva già da un giro interrotto e sporco: l'ho **ricreato da zero** (`DROP … WITH (FORCE)` + `CREATE`), poi `prisma migrate deploy`.

- `npx jest test/utenti.spec.ts` → **20/20 passati, 0 KO** (EXIT 0).
- `npx tsc --noEmit` (backend) → **0 errori**.
- `git diff --stat` sui tre file ammessi: `posta.ts` (35 righe), `utenti.ts` (10), `utenti.spec.ts` (31) — nessun file fuori dagli ammessi toccato da me.
- Prove nel browser: **nessuna** (rilievo solo backend, nessuna modifica all'interfaccia; `app_utenti.py` non va aggiornato né rilanciato per questo pacchetto).
- Database `decobrands_test_1_20c` **cancellato** a fine prova.

## Cose aperte

Nessuna.

## Da documentare

Nessuna nuova decisione: C1 e C2 sono correzioni dell'implementazione di **D-117**, la cui riga §19, la riga *Perché* e il testo guida sono già pronti in `resoconto-collaudo-1-20.md`. Il testo guida («…al vecchio indirizzo arriva un avviso con chi ha fatto il cambio e quando») resta valido; C2 (ora di Roma) è un dettaglio di presentazione dell'avviso, non una regola da documentare. Nessun cambio a spec, guida, piano o README.
