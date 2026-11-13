# Resoconto pacchetto 2-03 — Connessioni (Posta, Casella, Integra) modificabili solo dal superutente

Data: 13/11/2026 · Esecutore: DeepSeek V4 · Gravità: P1 · Rilievi: A1-01 (solo parte b) · Decisione U2 → D-115.

Esito: **corretto**. `npx tsc --noEmit` backend e frontend 0 errori. `npx jest test/impostazioni.spec.ts test/accesso.spec.ts test/utenti.spec.ts` → **66 prove, 0 KO**. Prove nel browser **non lanciate** (regole dell'onda): le lancia il controllo di fine onda.

## Rilievi

### A1-01 (parte b) — permesso `sistema.connessioni` per le connessioni (D-115)
La parte (a) (400 quando cambia server/porta/utente senza password) era già fatta dal pacchetto `impostazioni-segreti`: sta in `app/backend/src/impostazioni.ts:291-302` e non l'ho toccata. Qui solo la parte (b) e la prova 2).

- `app/backend/src/accesso.ts:53`: aggiunto il permesso `sistema.connessioni` (`ruoli: ['superutente']`). `sistema.impostazioni` resta a superutente e amministratore per le altre sezioni (azienda, lettura, conservazione).
- `app/backend/src/impostazioni-api.ts:41-55`: costante `CONNESSIONI = ['casella','posta','integra']` e metodo `controllaConnessione(req, chiave)` che risponde 403 quando la sezione è una connessione e `req.utente.ruolo !== 'superutente'`. Chiamato in `salva` (PUT) e `prova` (POST `:chiave/prova`).
- `app/backend/test/impostazioni.spec.ts`: aggiunto utente `super-imp` e sessione `supert` (con `csrfSuper`); le prove che scrivono casella/posta/integra ora usano il superutente (limiti, cambio server, evento crud, prove di connessione); nuova prova «le connessioni si toccano solo dal superutente» (amministratore → 403 su posta/casella/integra, segreto invariato; superutente → 200).
- `app/frontend/app/(app)/impostazioni/VistaImpostazioni.tsx:21,25,36,52,98-127`: le sezioni di connessione si aprono in **sola lettura** per chi non ha `sistema.connessioni`: campi disabilitati, niente «Salva» né «Prova la connessione», nota «Solo il superutente può modificare le connessioni…».

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` in `app/backend` | 0 errori |
| `npx tsc --noEmit` in `app/frontend` | 0 errori |
| `npx jest test/impostazioni.spec.ts test/accesso.spec.ts test/utenti.spec.ts` (db `decobrands_test_2_03`) | 66 prove, 0 KO |
| `app_impostazioni.py` (browser) | **da lanciare a fine onda** — vedi nota sotto |

Database di prova `decobrands_test_2_03`: creato, migrazioni applicate, prove lanciate, poi **cancellato**.

File toccati (solo ammessi): `app/backend/src/accesso.ts`, `app/backend/src/impostazioni-api.ts`, `app/backend/test/impostazioni.spec.ts`, `app/frontend/app/(app)/impostazioni/VistaImpostazioni.tsx`, questo resoconto.

## Nota: prova nel browser `app_impostazioni.py`

La pagina Impostazioni ora è in sola lettura per l'amministratore sulle sezioni casella/posta/integra. La prova esistente `strumenti/prove/app_impostazioni.py:53-83` usa l'utente `-ammi` per «Prova la connessione» e per salvare la password della casella: **quei passi falliranno** (il pulsante non c'è più per l'amministratore). Il file non è fra i miei ammessi (né è indicato come vietato ad altri): non l'ho toccato. Da sistemare a fine onda o nel pacchetto documentazione/prove: usare un utente **superutente** per i passi sulla casella, e lasciare `-ammi` per azienda/conservazione/lettura. La prova di backend copre già il 403/200 richiesto dal rilievo.

## Da documentare

**Registro §19 — D-115 (U2).** Testo pronto:
> D-115 (13/11/2026) — *Connessioni solo al superutente.* Le sezioni Posta, Casella e Integra delle Impostazioni si modificano con il permesso nuovo `sistema.connessioni` (solo superutente); le altre sezioni restano a `sistema.impostazioni`. Se cambia server, porta o utente di una connessione la password va riscritta (400): il segreto salvato non parte mai verso un indirizzo nuovo. Perché: un amministratore, dirottando la posta su un SMTP suo, leggerebbe i link di reset e prenderebbe il posto del superutente (D-39, D-45). Chi: Ugo. Dove: `accesso.ts` (PERMESSI), `impostazioni-api.ts`, `impostazioni.ts` (parte a, pacchetto impostazioni-segreti), `VistaImpostazioni.tsx`.

**Spec §7.15 (Impostazioni) — riga *Perché* pronta:**
> Posta, Casella e Integra individuano una connessione esterna: si modificano e si provano solo con `sistema.connessioni` (superutente). Un amministratore le vede ma i campi sono disabilitati e non ci sono «Salva» né «Prova la connessione»: chi le dirotta su un server proprio leggerebbe i segreti salvati e i link di reset (D-115).

**Spec §8.3 (tabella dei permessi) — riga pronta:**
> `sistema.connessioni` — Connessioni (casella, posta, Integra) nelle Impostazioni — solo superutente (D-115).

**Guida (`lib/guida.ts`)** — testo pronto (da mettere in `sapere` e nel campo `modifica` dell'argomento Impostazioni, a cura del pacchetto documentazione):
> sapere: «Posta, Casella e Integra sono le <b>connessioni</b>: le modifica e le prova solo il <b>superutente</b>. Un amministratore le vede ma non può cambiarle né provarle, perché chi le dirotta su un server suo leggerebbe le password e i link di reset.»
> modifica: «Superutente e Amministratore; le connessioni (Posta, Casella, Integra) solo Superutente.»

**Piano (`piano-lavoro-crm.md`)**: nessuna attività nuova, 0 ore da approvare (correzione del collaudo onda 2, dentro le attività già previste).

**README**: niente da cambiare.
