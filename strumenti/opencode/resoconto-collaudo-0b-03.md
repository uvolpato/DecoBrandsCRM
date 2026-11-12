# Resoconto · Onda 0 bis · Pacchetto 0b-03 — Storico del vecchio CRM e agenzia dal documento

Data: 12/11/2026 · Esecutore: DeepSeek V4 · Rilievi: O0-10, R1-07, R2-05, R2-06, R2-13, R1-10, R1-09, R1-13 · Decisione applicata: D-134.

## Cosa ho fatto

### R1-07 — riga dello storico di un altro cliente, e riga consumata due volte
- `app/backend/src/clienti.ts:35` `stessaCoppia`: prima bastava **un** lato corrispondente; ora ogni lato deve avere un riscontro positivo — id, P.IVA, oppure (solo se mancano entrambi) ragione sociale normalizzata con `normalizzaNome`. Un lato senza riscontro = 400.
- `app/backend/src/clienti.ts:231` `creaAgenzia`: la riga si legge con `SELECT id FROM interscambio_storico WHERE id = … FOR UPDATE` dentro la transazione e, se `stato <> 'da_usare'`, risponde **409** «La riga dello storico è già stata usata per un'altra agenzia». Il lock (V13) chiude anche la corsa fra due creazioni simultanee.
- Effetto sui dati veri: le righe senza P.IVA cliente (le «senza P.IVA cliente» del report) non passano più per qualunque cliente del fornitore; si riconoscono dal nome, quando c'è.

### R2-05 / D-134 — il subagente lo risolve il server, il campo vuoto va scelto
- `app/backend/src/storico.ts:108-124`: `GET interscambio/storico` riempie `subagente_id` dal legame o dal nome del vecchio CRM (`nome cognome` o `cognome nome`, via `normalizzaNome`), **solo se in anagrafica la corrispondenza è una sola**; omonimi, nome assente o nessun subagente → `null`. Una sola query `subagenti` per richiesta, e solo se qualche riga ne ha bisogno.
- `app/frontend/componenti/FormAgenzia.tsx:115-120`: tolti `normalizza`, `trovaSubagente` e la priorità al nome; il campo Subagente vale `agenzia?.subagente_id ?? pro?.subagente_id ?? ''` — niente più `subagenti[0]?.id`, quindi su una agenzia nuova senza subagente risolto il campo è vuoto e obbligatorio.

### R2-06 — sconti in vigore dal server, una lettura
- `app/backend/src/fornitori.ts:249`: nuova rotta `GET fornitori/sconti-in-vigore` (`@Richiede('dati.consulta')`, dichiarata **prima** di `:id`), che restituisce per fornitore gli `sconto_min` della versione in vigore (l'ultima con `valido_dal <= oggi`, `giornoRoma`).
- `app/frontend/componenti/FormAgenzia.tsx:85-106`: tolte la `Map` di modulo e `scontiInVigore`; l'apertura fa tre letture in parallelo (fornitori, subagenti, `fornitori/sconti-in-vigore`) e l'aiuto «Scaglioni in vigore» si calcola dai dati del server, quindi dopo una modifica si vede subito senza ricaricare la pagina.

### R2-13 — sagoma e messaggio d'errore nella finestra
- `app/frontend/componenti/FormAgenzia.tsx:136-142`: in attesa `useSagome` + `<SagomaCorpo />` dentro la Modale (sotto i 150 ms solo il titolo, D-59), non più il testo «Caricamento…». Se una delle tre letture fallisce la finestra mostra `r.messaggio` con il pulsante *Chiudi*: il form non si apre più con le liste vuote.

### O0-10 — eliminare un'agenzia con sconti: 409, non 500 (D-139)
- `app/backend/src/clienti.ts:396`: prima della `delete`, `count` delle righe in `sconti` dell'agenzia → **409** «L'agenzia ha sconti storici: si chiude, non si elimina». `VistaClienti.tsx` mostra già `r.messaggio` com'è (`avviso(r.messaggio, true)`), quindi il testo arriva all'operatore senza modifiche al frontend.

### R1-10 — `import:storico --sostituisci` dentro la transazione
- `app/backend/prisma/import-storico.ts:197-210`: il TRUNCATE è passato dentro la `$transaction` di `importaStorico`, **senza** `RESTART IDENTITY`; prima dello svuotamento un `LOCK TABLE interscambio_storico IN EXCLUSIVE MODE` e il conteggio delle righe con `stato <> 'da_usare'`: se ce n'è almeno una lo script si ferma e non tocca niente (lo stato delle agenzie create e i `dettaglio.storico_id` del registro non si perdono). Se l'import fallisce a metà, il rollback lascia le tabelle com'erano.
- `main()` non trunca più prima dell'import; la conferma a mano resta e il testo dice che lo svuotamento avviene solo se nessuna riga è usata.

### R1-09 — una sola `normalizzaPiva`
- `app/backend/src/storico.ts:16-19`: via la copia locale; si importa `normalizzaPiva` da `soggetti.ts` e la si riesporta da `storico.ts` (così `clienti.ts` e `import-storico.ts` non cambiano import). `normalizzaCF` resta locale a `storico.ts` perché `soggetti.ts` non la esporta.

### R1-13 — prove aggiunte
- `app/backend/test/clienti.spec.ts`: riga di un altro cliente con la sola P.IVA del fornitore → 400 e riga ancora `da_usare`; stessa riga usata due volte → 201 poi 409 con `interscambio_id` della prima; agenzia con una riga in `sconti` → DELETE 409 col testo di D-139 e agenzia ancora presente, poi 204 senza sconti. Aggiornata la riga della prova «la rotta che usa il form»: la coppia ora ha anche la P.IVA del cliente (prima si riconosceva dal solo fornitore, che è proprio il buco di R1-07).
- `app/backend/test/storico.spec.ts`: nome → id unico, omonimi → `null`, nome assente dall'anagrafica → `null`; `--sostituisci` in prova (truncate + reimport, poi rollback); `--sostituisci` con una riga `usata` → rifiutato e tabelle intatte; `normalizzaPiva('IT 012 345 678 90')`.
- `app/backend/test/fornitori.spec.ts`: `GET fornitori/sconti-in-vigore` con tre versioni (una superata, una in vigore, una futura) → solo le soglie di quella in vigore, ordinate.

## Prove lanciate

Con `DATABASE_URL_TEST` = `decobrands_test_0b_03` (creato e **cancellato** alla fine), `TMP`/`TEMP` in `decobrands-0b-03`:

- `npx jest test/clienti.spec.ts test/storico.spec.ts test/fornitori.spec.ts test/percentuali.spec.ts test/seed.spec.ts` → **5 suite, 88 prove, 0 KO** (49 sono dei miei tre file, con le 8 prove nuove).
- `cd app/backend && npx tsc --noEmit` → 0 errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori.
- `git diff --name-only` / `git status --short`: fra i file modificati ci sono solo i miei (più quelli degli altri pacchetti dell'onda, toccati in parallelo da loro): `import-storico.ts`, `clienti.ts`, `fornitori.ts`, `storico.ts`, `clienti.spec.ts`, `fornitori.spec.ts`, `storico.spec.ts`, `FormAgenzia.tsx` e questo resoconto.
- Prove nel browser: **non lanciate** (regole dell'onda), nessuna da aggiornare perché `strumenti/prove/*.py` sono file vietati di altri pacchetti.
- Database `decobrands_test_0b_03` cancellato a fine prove.

### Controlli richiesti (skill caricate davvero)

- `owasp-security`: accesso — tutte le letture nuove hanno `@Richiede('dati.consulta')`; `storico_id` dal browser è ricontrollato sul server (coppia + stato) prima di scrivere, quindi non si consuma una riga altrui (object-level authorization); le query raw sono parametrizzate dalla tag di Prisma, l'unica `$executeRawUnsafe` ha solo testo costante; i messaggi 400/409 non espongono dati. Nessun rilievo aperto.
- `postgresql-code-review`: aggiunto `LOCK TABLE … IN EXCLUSIVE MODE` prima del conteggio e del TRUNCATE (senza il lock un'agenzia creata fra il controllo e lo svuotamento perderebbe la riga usata); `TRUNCATE` senza `RESTART IDENTITY`; nessuna migrazione, nessun cambio di schema; la lettura degli sconti è una sola query senza N+1.
- `ponytail-review`: tre funzioni e una `Map` di modulo **cancellate** dal frontend (`scontiInVigore`, `normalizza`, `trovaSubagente`, `scaglioni`), N richieste per apertura ridotte a 3; `stessaCoppia` resta una funzione con un aiuto locale. Rilievo accettato: `normalizzaPiva` resta riesportata da `storico.ts` per non toccare gli import di `clienti.ts` e `import-storico.ts` (2 righe in meno).

## Prove nel browser da lanciare a fine onda

Non le ho lanciate (porte e `.next` condivisi) e non le ho modificate: `strumenti/prove/app_clienti.py`, `app_documenti.py` e `app_fornitori.py` sono file di altri pacchetti (0b-01, 0b-05, vietati qui). Casi da guardare:

- finestra «Nuova agenzia» aperta da un documento con storico **non risolto** (subagente assente od omonimo): campo Subagente **vuoto**, non il primo dell'elenco;
- `page.route('**/api/subagenti', …500)` → dentro la finestra il messaggio del server e il pulsante *Chiudi* (non un form vuoto);
- dopo «Nuove percentuali» in Fornitori, riaprendo l'agenzia l'aiuto «Scaglioni in vigore» mostra i nuovi sconti senza ricaricare la pagina;
- eliminare un'agenzia con sconti storici → avviso con il testo di D-139, agenzia ancora in elenco;
- controllo visivo a 1440 e 768 px della finestra in caricamento (sagoma) e della finestra con errore.

## Cose aperte

- Il `npx tsc --noEmit` del backend era rosso all'inizio per un file non mio (`src/anagrafica-integra.ts` importava `IsOptional` da `@nestjs/common`): è il pacchetto 0b-01 che lavorava in parallelo. A fine lavoro è tornato a 0 errori e le prove girano; non ho toccato quel file.
- Il form manda ancora `storico_id` anche se la riga è già `usata` (finestra aperta prima che un altro utente la consumasse): il server risponde 409 col messaggio nella finestra e l'operatore riapre. Non ho aggiunto un filtro nel browser: il controllo è del server (V12).
- `--sostituisci` quando non ci sono righe usate non è provato sul database vero (solo con `--prova`, che fa truncate + reimport e rollback, quindi la stessa strada).

## Da documentare

### §19 — registro delle decisioni (la riga la scrive 0b-doc)
- **D-134** · 11/11/2026 · Il subagente proposto da una riga dello storico lo decide il server: `GET interscambio/storico` restituisce `subagente_id` preso dal legame o risolto dal nome del vecchio CRM (`nome cognome` o `cognome nome`), **solo se in anagrafica la corrispondenza è una sola**; omonimi o nome assente → `subagente_id: null` e il campo Subagente resta vuoto, obbligatorio da scegliere. Il browser non abbina nomi e non usa mai il primo subagente dell'elenco (V12) · Perché: con due omonimi, o con un nome che in anagrafica non c'è, il browser proponeva il primo trovato o il primo in ordine alfabetico, e due Invio creavano l'agenzia con le provvigioni al subagente sbagliato · Ugo (deciso, pacchetto 0b-03) · Dove: `storico.ts`, `FormAgenzia.tsx`, spec §4.7.2-§4.7.4 e §7.6, `lib/guida.ts`.
- Gli altri rilievi non aggiungono decisioni: rendono vero quello che D-112 (agenzia dallo storico), D-113 (scaglioni in vigore), D-139 (sconti con FK RESTRICT), D-59 (sagome) e V12/V13 già dicono.

### Righe *Perché* nella spec
- §4.7.2 (storico dei legami): «Una riga dello storico si consuma **una volta sola**: si legge con `SELECT … FOR UPDATE` e, se `stato <> 'da_usare'`, la creazione dell'agenzia risponde 409. La coppia si riconosce solo se **entrambi** i lati hanno un riscontro — id, P.IVA o ragione sociale normalizzata —: la P.IVA del fornitore da sola passerebbe per ogni cliente di quel fornitore (R1-07, V13).»
- §4.7.2: «Il subagente proposto lo risolve il server dal nome, solo se è uno solo; omonimi o assente → campo vuoto da scegliere (D-134). La normalizzazione della P.IVA è una sola, quella di `soggetti.ts` (R1-09).»
- §4.7.3 (import dello storico): «`--sostituisci` svuota dentro la stessa transazione dell'import, senza `RESTART IDENTITY`, e **solo** se nessuna riga è già usata (altrimenti rifiuta con il conteggio): il lock sulla tabella esclude una creazione concorrente e lo stato delle agenzie create non si perde (R1-10, V13).»
- §7.6 (finestra dell'agenzia): «Gli sconti in vigore di tutti i fornitori si leggono in una sola richiesta (`GET fornitori/sconti-in-vigore`) a ogni apertura, dal server: niente cache nel browser e niente calcolo degli scaglioni nel browser (R2-06, V12). In attesa il corpo è una sagoma; se una lettura fallisce la finestra mostra il messaggio del server con *Chiudi* (D-59, R2-13).»
- §7.6 (eliminazione): «Un'agenzia con righe in `sconti` non si elimina: 409 «L'agenzia ha sconti storici: si chiude, non si elimina» (D-139, O0-10).»

### Guida (`app/frontend/lib/guida.ts`) — testi pronti
- Documenti, finestra «Nuova agenzia»: al campo **Subagente**, «Si precompila solo se il vecchio CRM indica un subagente che in anagrafica è uno solo; se il campo resta vuoto scegli tu: è obbligatorio (D-134).»
- Documenti/Fornitori, aiuto **Scaglioni in vigore**: «Gli sconti si leggono a ogni apertura: se li hai appena cambiati in *Fornitori*, qui sono già aggiornati.»
- Clienti, voce *Elimina* dell'agenzia: «Un'agenzia con sconti storici non si elimina: chiudila con «Valido al» (D-139).»

### Piano e README
- `piano-lavoro-crm.md`: nessuna attività nuova; le correzioni stanno dentro F1-A12 (storico e agenzia) e F1-A13 (scaglioni). Da annotare, se si contano: **1 h da approvare** per R1-07/R2-05/R2-06/R2-13/O0-10/R1-09/R1-10 con le prove.
- `app/README.md`: nulla da cambiare.
