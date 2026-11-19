# Resoconto `doppione-file-link`

## File toccati

- `app/frontend/lib/api.ts` — tipo di ritorno di `caricaPdf` con `pratica?: { id: string; numero: string } | null` (e la nota nel commento sopra la funzione).
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` — `FinestraDocumento`: stato `praticaDoppione`, azzeramento in `invia` e in `onFile`, link «Apri la pratica …» sotto l'errore del modulo.

Nessun altro file. Niente commit, backend, CSS, `.env`, database, porte.

## Diff sintetico

- `api.ts`: `caricaPdf(file)` → `Risposta<{ id; file_nome; stato; ricevuto_il; pratica?: { id; numero } | null }>`. Il corpo dell'errore arrivava già in `dati` (`dati as never`): nessun'altra modifica.
- `VistaPratica.tsx`, `FinestraDocumento`:
  - `const [praticaDoppione, setPraticaDoppione] = useState<{ id: string; numero: string } | null>(null);`
  - `invia`: `setPraticaDoppione(null)` accanto a `setErrore('')`; sul fallimento di `caricaPdf` `setErrore(c.messaggio); setPraticaDoppione(c.dati?.pratica ?? null); return;`
  - `Caricamento.onFile`: azzera anche `praticaDoppione` (come `arrivoId`).
  - sotto `<p className="modulo-errore">` del modulo: `{praticaDoppione && <p className="aiuto"><Link href={'/pratiche/' + praticaDoppione.id}>Apri la pratica {praticaDoppione.numero}</Link></p>}`

V12/D-28: il frontend mostra solo il `pratica` deciso dal server, nessun calcolo. Ponytail: un solo stato, nessun componente né classe CSS nuovi (`aiuto`, `Link` già presenti).

## Esito prove

- `npx tsc --noEmit` in `app/frontend`: **0 errori** (exit 0).
- Playwright non lanciato (come da pacchetto: prova a schermo dell'orchestratore).

## Dubbi

- Se il backend non manda ancora `pratica` (pacchetto `documento-doppione-pratica` non rilasciato), il link semplicemente non compare: nessun errore. Da verificare la prova a schermo con il 409 vero.
- Il link naviga e la finestra resta aperta sul componente precedente: si finisce sulla pratica giusta nell'elenco aggiornato perché cambia la rotta; se Ugo vuole anche la chiusura della finestra, serve un `onChiudi()` prima del cambio pagina (fuori dal pacchetto).
- Nel ramo «Prendi dalla coda» l'errore non mostra il link (lì non si carica un file, l'abbina risponde con altri 409): coerente col pacchetto.

## Pagina Documenti

Pacchetto `doppione-file-link-documenti` (18/11/2026).

- File toccato: solo `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`. Niente backend, CSS, `.env`, database, porte; nessun commit.
- Diff sintetico:
  - stato `rifiutato: { messaggio; pratica: { id; numero } | null } | null` accanto agli altri;
  - `carica`: `setRifiutato(null)` all'inizio del giro; sui file falliti `setRifiutato({ messaggio: r.messaggio, pratica: r.dati?.pratica ?? null })` **al posto** di `avviso(r.messaggio, true)` (un file per volta, si tiene l'ultimo); se almeno un file entra il rifiuto precedente resta (non si azzera a fine giro);
  - riquadro `avviso-variazioni` con `role="alert"`, `Icona nome="avviso"`, messaggio del server e, se c'è, link `Apri la pratica <numero>` verso `/pratiche/<id>`, subito sotto il `Caricamento`, dentro il ramo `puoModifica`.
- V12/D-28: si mostra solo il `pratica` che il server ha risposto; nulla è calcolato nel browser. Ponytail: uno stato in più, nessun componente e nessuna classe CSS nuovi.
- `npx tsc --noEmit` in `app/frontend`: **0 errori** (exit 0). Playwright non lanciato (prova a schermo all'orchestratore).
- Dubbi: il riquadro è dentro `puoModifica` (chi non carica non lo vede); un 400 di validazione non porta `pratica`, quindi resta il solo messaggio senza link; dopo un caricamento riuscito il rifiuto vecchio resta in pagina finché non si ricarica un altro file o si cambia pagina — è quello chiesto dal pacchetto.

## Seconda correzione

Pacchetto `doppione-file-link-2` (18/11/2026).

### File toccati

- `app/backend/src/documenti.ts`
- `app/backend/test/documenti.spec.ts`
- `app/frontend/lib/api.ts`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

Niente CSS, migrazioni, `.env`, Integra, database di sviluppo, porte 8001/8002. Nessun commit.

### Diff sintetico

- **`documenti.ts`** — `doppione(client, riga)` riceve la **riga** del doppione (`{ id, abbinato_pratica_id }`, oppure `null`), non più il solo id pratica, e aggiunge sempre `documento: { id: String(riga.id) } | null` al corpo. Tre chiamanti aggiornati: lettura iniziale (`doppione(db, gia)`), transazione (`doppione(tx, riga)`), `P2002` (rilettura per `file_hash` con `select: { id, stato, abbinato_pratica_id }` e `doppione(db, altra)`: riga sparita → `documento: null`). Messaggio e `pratica` invariati.
- **`documenti.spec.ts`** — i due test del doppione attendono anche `documento: { id: … }` (l'id del documento caricato, `arrivo` nel primo, `String(id)` nel secondo).
- **`api.ts`** — tipo di `caricaPdf`: `documento?: { id: string } | null` accanto a `pratica?`.
- **`VistaDocumenti.tsx`** — `rifiutato` porta anche `documento`; il link nel riquadro: `pratica` → «Apri la pratica {numero}», altrimenti `documento` → «Apri il documento» verso `/documenti/{id}`, altrimenti niente. L'«i» dei due pannelli è passato nella testata con `info={<Informazioni …>}`, tolti i due `div.strumenti-scheda`; testi invariati.
- **`VistaPratica.tsx`** — `FinestraDocumento`: `praticaDoppione` → `doppione` con `{ pratica, documento }` (azzerato in `invia` e in `onFile`); sotto il messaggio d'errore il link segue la stessa regola della pagina Documenti.

V12/D-28: id e stato vengono dal database, il browser mostra soltanto. V13: dentro la transazione si usa `tx`. Ponytail: nessun campo né migrazione, nessuna classe CSS nuova.

### Corpo 409 finale

```json
{ "message": "Documento già caricato: è lo stesso file di uno già arrivato",
  "pratica": null,
  "documento": { "id": "43" } }
```

Con l'abbinamento: `message` «… della pratica 123», `pratica: { id, numero }`, `documento: { id }`. Riga sparita fra le due letture: `documento: null`.

### Esito prove

- `npx tsc --noEmit` in `app/backend`: **0 errori** (exit 0).
- `npx tsc --noEmit` in `app/frontend`: **0 errori** (exit 0).
- `npm test -- documenti.spec.ts --forceExit` in `app/backend`: **70 passati, 0 KO** (34 s, database `decobrands_test` già allineato: nessuna migrazione eseguita). Compare l'avviso `DeprecationWarning` di `pg` (`client.query()` in parallelo), preesistente: non tocca l'esito.
- Playwright non lanciato, come da pacchetto: le schermate le fa l'orchestratore.

### Dubbi

- Se il doppione è un file **scartato**, il flusso non passa più dal 409 (un caricamento lo riporta in coda, `riceviDocumento`): `documento` c'è comunque nel caso di due invii simultanei.
- Nel ramo `P2002` la rilettura può dare `null` (riga eliminata nel frattempo): in quel caso `documento: null` e resta il solo messaggio, senza link.
- Il link «Apri il documento» porta alla pagina del documento in coda: può mostrare il file già arrivato, non una copia; è quello che serve per riconoscerlo.
- L'«i» nella testata toglie una riga al corpo: se il pannello ha `nota` lunga la testata va a capo come nelle altre pagine (nessuna classe nuova, verificare a schermo).

## Da documentare

- Guida della pratica, registrazione documento: se il PDF allegato è già stato caricato, l'errore dice su quale pratica sta e sotto compare il collegamento «Apri la pratica \<numero\>» per andarci subito; se il file non è ancora su una pratica, il collegamento è «Apri il documento».
- Guida della pagina Documenti: caricando un file già arrivato, sotto il riquadro di caricamento compare un avviso fisso con il messaggio del server e il collegamento «Apri la pratica \<numero\>» (o «Apri il documento», se il file non è ancora su una pratica).
- Guida della pagina Documenti: l'«i» dei pannelli «Da controllare» e «Come entrano i documenti» sta nella testata, dove stanno le azioni.
- Spec §6.5 (ingresso documenti): il 409 del doppione porta `pratica` (facoltativa) e `documento: { id }` per il link; §8.1: contratto di `POST /documenti/carica`. Registrare in §19 una riga D-nn (la aggiunge chi chiude la slice: numerazione non assegnata qui).
