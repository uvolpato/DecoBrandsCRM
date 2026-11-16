# Resoconto `pagamento-numero-lungo`

## Causa

Il `numero` di un documento sta in `ordini_fornitore_documenti.numero` (`VarChar(50)`). Per il pagamento
questo campo è il «Riferimento (facoltativo)» (pacchetto `pagamento-senza-numero`), un testo libero: un
riferimento di bonifico o una nota può superare i 50 caratteri.

Quando si abbina (`POST /documenti/:id/abbina`), il DTO `NuovoDocumento` dichiarava
`@MaxLength(50) numero`, quindi il `ValidationPipe` rifiutava con «numero must be shorter than or equal
to 50 characters», e il frontend lo mostrava tale e quale (in inglese, `api.ts` prende `message[0]`).

Nel db vero i due pagamenti in coda (id 9, 13) non hanno il campo `numero` letto (il lettore non lo
produce); il riferimento lungo arriva quindi da chi lo digita in *Correggi i dati letti* (salvato in
`documenti_campi`, senza limite) o da una lettura futura. C'era anche un secondo difetto: il frontend
manda `numero: null` quando il riferimento è assente, e `@Facoltativo()` (= `ValidateIf(v !== undefined)`)
**non** salta `null`, quindi anche il pagamento senza riferimento veniva rifiutato da `@IsString()`
(«numero must be a string»). La prova esistente non lo vedeva perché omette del tutto `numero`.

## Correzione

- `app/backend/src/documenti.ts`
  - `NuovoDocumento.numero`: da `@Facoltativo() @Testo() @IsString() @IsNotEmpty() @MaxLength(50)` a
    `@IsOptional() @Testo() @IsString()`. `@IsOptional` salta `null` e `undefined`; l'obbligo per ordine,
    fattura e nota di credito resta in `registra` (V12), che già controlla `!b.numero`.
  - `registra`: `const numero = (b.numero ?? '').slice(0, 50)` — il riferimento lungo si tronca al campo
    DB (VarChar 50), senza bloccare l'abbinamento. Niente migrazioni.
- `app/backend/src/errori.filter.ts` (punto unico dei 400/422)
  - `NOME_CAMPO`: nome italiano dei campi ovvi; per quelli non ovvi vale il messaggio generico.
  - `traduciValidazione`: traduce i modelli inglesi standard di class-validator (maxLength → «Il campo …
    è troppo lungo (al massimo N caratteri)», isString, isNotEmpty, …); i messaggi già italiani
    (personalizzati nei DTO) restano com'erano.
  - `validazioneInItaliano`: applica la traduzione all'elenco di messaggi del ValidationPipe, lasciando
    intatte le risposte con `message` stringa (già italiane).

## Prove (0 KO)

- `npx tsc --noEmit` backend: pulito.
- `npx jest test/documenti-pratica.spec.ts` (34) e le spec di documenti, accesso, soggetti, utenti,
  subagenti, fornitori, clienti, bollettini, pratiche, correzione, incassi, liquidazioni, analisi, coda,
  lettura, proposta, registro, impostazioni, …: tutte verdi.
  - Nuove prove in `documenti-pratica.spec.ts`:
    - un pagamento con riferimento lungo (80 car) si abbina e il numero salvato è troncato a 50;
    - un pagamento con `numero: null` si abbina (numero salvato vuoto);
    - un campo troppo lungo risponde «Il campo Note è troppo lungo (al massimo 2000 caratteri)» (italiano).

Nota: `test/sistema.spec.ts` esce con codice 1 per un `ReferenceError` preesistente («require after the
Jest environment has been torn down», 22/22 test verdi): non tocca i file di questo pacchetto.

## Da documentare

- D-… §19: «il riferimento del pagamento (facoltativo) non blocca l'abbinamento: si tronca a 50
  caratteri, limite del campo DB, e il valore assente (null) non è rifiutato dalla validazione».
- §15.2.7 / guida: i rifiuti del `ValidationPipe` arrivano all'utente in italiano, con il nome del campo
  in italiano dove ovvio, altrimenti «Dati non validi: controlla i campi».
