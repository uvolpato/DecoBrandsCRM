# Prompt per OpenCode — F1-A4, correzioni 1

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. Lavoro da Sonnet: una sola
sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`, poi `strumenti/opencode/f1-a4-sincronizzazione.md` e
`strumenti/opencode/resoconto-f1-a4.md`: sono il compito e il resoconto del primo giro (commit
d06edac). Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api` e
`javascript-typescript-jest`. Usa `graphify query "<domanda>"` prima di cercare nei file.

Il controllo finale di Claude Code ha trovato i punti qui sotto. Correggili **solo** in
`app/backend/src/integra.ts` e `app/backend/test/integra.spec.ts`, più `registro.ts` se serve un
codice nuovo in `SCHEMI`. Fai una prova per ogni punto, salvo il 7.

⚠ **Integra si legge e basta**: il CRM non deve mai scrivere sul ponte né su Integra (Ugo,
02/11/2026).

## 1. Un giro alla volta anche dalla rotta

`inCorso` protegge solo il timer, quindi `POST /api/integra/sincronizza` può partire mentre gira
il timer. Le due corse leggono `identita()` fuori dalla transazione, e una delle due fallisce sul
vincolo unico di `codici_esterni`, oppure scrive due versioni uguali.

**Correzione:** sposta il controllo `inCorso` dentro `sincronizza()`, così vale sia per la rotta
sia per il timer. Se c'è già un giro in corso, la rotta risponde **409** con il testo
"Sincronizzazione già in corso".

**Prova:** lancia due `sincronizza()` insieme; una dà 409, e alla fine nel database c'è un solo
cliente per codice.

## 2. Una riga andata in errore non deve sparire

Se `applicaCliente()` o `applicaFornitore()` lanciano un errore, la riga finisce solo in
`scartati` e nel log, e il giro chiude comunque `ok`. Il giro dopo legge solo dall'inizio
dell'ultimo giro riuscito meno un giorno, quindi la riga non torna più finché Integra non la
modifica.

**Correzione:**
- apri l'anomalia `integra.riga`:
  - chiave `"<vista>:<id_integra>"`;
  - `dettaglio` `{ vista, id_integra, errore: pulisci(e) }`;
  - testo fisso, per esempio "Il cliente X non è stato copiato: …";
  - schema in `SCHEMI`;
- chiudila quando la riga passa;
- in `daQuando()`: se ci sono anomalie `integra.riga` aperte, il punto di partenza è il **più
  vecchio** fra l'ultimo giro riuscito e la creazione dell'anomalia aperta più vecchia, meno un
  giorno. Così la riga si rilegge finché non passa.

**Prova:**
- una riga che fa fallire `applicaCliente()`: per esempio, con `jest.spyOn`, il primo
  `clienti.create` lancia un errore;
- l'anomalia resta aperta;
- al giro dopo la riga viene copiata, anche se `modificato_il` è più vecchio di 2 giorni, e
  l'anomalia si chiude.

## 3. «Integra non risponde» solo per il ponte irraggiungibile

`controllaConnessione()` conta gli ultimi 3 giri con esito `errore`, ma anche una vista mancante
(`integra.vista`) chiude il giro con `errore`. Con 2 viste mancanti seguite da 1 ponte giù, si
apre `integra.connessione` troppo presto.

**Correzione:**
- salva in `misure` anche `ponte: false` quando il ponte non risponde;
- conta solo i giri con `misure.ponte === false` fra gli ultimi 3 giri conclusi, cioè con
  `esito` non nullo (filtro JSON di Prisma `path`).

**Prova:**
- 2 giri con vista mancante, poi 1 con il ponte irraggiungibile: nessuna `integra.connessione`;
- 3 giri di fila con il ponte irraggiungibile: `integra.connessione` aperta (la prova che c'è già
  deve restare verde).

## 4. Chiave solo dal codice di Integra, senza secondo tentativo

`identita()` cerca prima il codice leggibile, poi `String(id_integra)`. Se un soggetto ha
`codice = "500"` e un altro ha `id_integra = 500` e un codice diverso non ancora nel CRM, il
secondo prende l'identità del primo: due anagrafiche diverse diventano una.

**Correzione:** cerca solo con `codiceDi(r)`, quello che si salva in `codici_esterni` alla
creazione, e togli il ciclo.

Aggiungi in fondo a `strumenti/integra/viste-crm.sql` la domanda 6: «`cli_cdclistr` è unico e non
cambia mai per lo stesso soggetto?».

**Prova:** soggetto A con codice `"500"` già nel CRM, poi soggetto B con `id_integra = 500` e
codice `"C00500"`. Si crea un soggetto nuovo e A non cambia.

## 5. Il ponte in sola lettura anche dal lato del CRM

Aggiungi al `Pool` del ponte `options: '-c default_transaction_read_only=on'`, oltre all'utente
`crm_lettura` del sistemista. È una difesa in più: anche per errore il CRM non scrive mai sul
ponte.

**Prova:** con il pool del ponte finto, `SHOW transaction_read_only` dà `on`. Un `CREATE TEMP
TABLE` o un `INSERT` fallisce con 25006.

Per provarlo esporta il pool, oppure fai la prova sul `Pool` creato come in `IntegraService`, ma
con la stessa funzione: non duplicare le opzioni.

## 6. Niente indirizzo nei messaggi di errore

`pulisci()` toglie gli URL `postgres://` e `password=`, ma gli errori di rete di `pg` contengono
l'indirizzo, per esempio `connect ECONNREFUSED 192.168.1.5:5432` o `getaddrinfo ENOTFOUND
nome-host`. Questi arrivano nella risposta di `/prova` e nel registro.

**Correzione:**
- togli anche gli indirizzi IP, con o senza porta;
- togli il nome che segue `ENOTFOUND` o `EAI_AGAIN`;
- sostituiscili con `[indirizzo rimosso]`.

**Prova:** chiama `pulisci()` sui tre esempi (IP con porta, `ENOTFOUND host`, URL con password) e
controlla che nel risultato non resti niente. Se serve, esporta `pulisci`.

## 7. Codice più corto (ponytail)

- **`applicaCliente()` e `applicaFornitore()`:** sono uguali a meno dei nomi delle tabelle e dei
  dati. Uniscile in una sola funzione con una piccola tabella per tipo, per esempio
  `{ entita, versioni, campoId, dati }`. Se il tipaggio di Prisma rende la versione unita più
  lunga delle due attuali, **lasciale come sono** e scrivilo nel resoconto.
- **`pivaDoppie()`:** fai il conteggio in SQL, con `GROUP BY piva HAVING count(*) > 1`, invece
  della `Map` in JavaScript. Attenzione: la P.IVA salvata è già normalizzata.

Le prove che ci sono già devono restare verdi.

## Verifica

1. In `app/backend`: `npx tsc --noEmit`, poi `npx jest --runInBand` per **tutte** le prove, due
   volte di seguito, con 0 KO. Usa il database `decobrands_test`, mai `decobrands_db`.
2. Niente commit, niente push, niente `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a4-correzioni-1.md`:
- per ogni punto, cosa hai cambiato e con quale prova;
- l'esito dei comandi, numero di prove e KO;
- i dubbi.
