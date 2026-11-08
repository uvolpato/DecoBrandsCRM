# A4 — Documenti e lettura (collaudo finale, 08/11/2026)

- **Skill caricate** (strumento Skill): `owasp-security`, `nestjs-best-practices`, `javascript-typescript-jest`.
- **Prove lanciate**: nessuna (regola del piano: le lancia solo A6). Niente app avviata, niente casella, niente server di lettura, niente Integra.
- **Letti**: `documenti.ts`, `lettura.ts`, `lettura-prova.ts`, `lettore.ts`, `casella.ts`, `posta.ts`, `scartati.ts`, `proposta.ts`, `solleciti.ts`, parti di `oggi.ts` (D-03), `sistema.ts` (`pulisciScartati`), `impostazioni.ts` (config), `main.ts`; frontend `lib/api.ts` (caricamento), `PdfEvidenziato.tsx`, righe di `VistaDocumento.tsx` e `VistaBollettino.tsx` che servono il file.
- **Controllato e a posto**: tipo del file dai primi byte (PDF/JPEG/PNG, Excel e .msg rifiutati); limite `DOCUMENTI_MAX_MB` sia in multer sia in `riceviDocumento`; nome su disco = impronta SHA-256, il nome originale non tocca mai il disco; percorso di archivio ripulito (`pulisci`) e servizio del file con `resolve` + controllo della radice; risposta del file con `nosniff`, `CSP: sandbox`, nome RFC 5987; scartati visibili solo con `provvigioni.scartati`; SSRF: l'indirizzo di LlamaCloud è fisso nel codice (la chiave non va a un indirizzo scelto); file su disco prima della transazione e archiviazione dopo il commit (V13); lettura salvata in una transazione con la riga bloccata e ricontrollo dello stato; `SKIP LOCKED` sulla coda; doppioni per impronta (anche in parallelo: P2002 → 409); tempi massimi su tutte le chiamate a LlamaCloud; D-87 (fornitore, agenzia, scaglione) in `nuovaPratica`; pdfjs-dist 6.x (fuori dalle versioni con CVE-2024-4367).
- **Non controllato**: comportamento reale di imapflow/mailparser su email malformate (solo lettura del codice); resa dei PDF nei browser (A4-10 va verificato a schermo da A6); connettore GLM-OCR locale (non esiste ancora, D-67); prompt injection dentro i documenti (nessun abbinamento automatico: decide sempre la persona, quindi solo rischio di valori proposti sbagliati); prestazioni (`riconosciCliente` carica tutti i clienti a ogni dettaglio: lo lascio ad A7).

---

### A4-01 — Un documento in `errore` non si può più né correggere, né abbinare, né rileggere
- Gravità: P1
- Dove: `app/backend/src/documenti.ts:548` (`correggi`: solo `da_controllare`), `documenti.ts:1063` (`registra`: solo `in_coda`/`da_controllare`), `documenti.ts:77` (ricaricare lo stesso file → 409 doppione), `app/backend/src/lettura.ts:359-368`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:305`
- Problema: l'anomalia `lettura.fallita` dice «aprirlo in Documenti e inserire i dati a mano», ma da `errore` l'unica azione ammessa è lo scarto; in più un errore del servizio (chiave scaduta, crediti finiti: 401/402/403/429) brucia i 3 tentativi di **ogni** documento in coda in 45 s.
- Scenario: finiscono i crediti di LlamaCloud → ogni giro (15 s) risponde 402 → tutti i documenti in coda vanno in `errore` dopo 3 giri, con un'anomalia ciascuno → l'operatore apre il documento: niente *Correggi*, `PUT /api/documenti/:id` → 409, `POST /documenti/:id/abbina` → 409, ricaricare il PDF → 409 «Documento già caricato». Resta solo il giro scarta → recupera.
- Correzione puntuale: (1) nuova rotta `POST /api/documenti/:id/rileggi` (`provvigioni.modifica`, transazione con `FOR UPDATE`, solo da `errore`: `stato='in_coda', tentativi=0, errore=null`, chiude `lettura.fallita`, evento `documento/update`); (2) ammettere `errore` in `correggi` (porta a `da_controllare`) e in `registra`; (3) in `leggiDallaCoda`, se l'errore è di servizio (`LetturaFallita` con stato HTTP 401/402/403/429 — farlo portare come proprietà `stato` in `lettore.ts`) rimettere la riga `in_coda` **senza** consumare il tentativo (`tentativi - 1`) e aprire `lettura.non_raggiungibile`; (4) pulsante *Rileggi* nella pagina per `errore`.
- Prova che la verifica: `test/coda.spec.ts` (402 non consuma tentativi), `test/documenti-lettura.spec.ts` (rileggi da `errore`; `PUT` da `errore` → 200), `strumenti/prove/app_documenti.py` (pulsante).
- Esecutore: DeepSeek V4 — più file, backend + frontend, cambio di flusso.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/src/lettura.ts`, `app/backend/src/lettore.ts`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts`, spec §7.9/§8.1/§19, test sopra.
- Dipende da / correlato a: D-66, D-69, D-72, D-74.

### A4-02 — I bollettini dell'anno prima non si sollecitano più (dicembre mai)
- Gravità: P1
- Dove: `app/backend/src/oggi.ts:51-74` (`mesiBollettini`, `anno = anno di oggi`)
- Problema: i mesi considerati sono solo quelli dell'anno in corso; il bollettino di dicembre arriva per regola a gennaio, quando la query guarda già il nuovo anno.
- Scenario: fornitore con `giorno_bollettino = 15`, fatture a dicembre 2026, nessun bollettino. Il 20/01/2027 il bollettino di dicembre è in ritardo (D-03), ma `mesiBollettini` genera solo gennaio–dicembre 2027 → nessun «Sollecita il bollettino di dicembre», contatore della barra a 0. Lo stesso per un bollettino di novembre ancora aperto: sparisce da Oggi il 1° gennaio.
- Correzione puntuale: `periodi` sugli ultimi 12 mesi chiusi invece che sull'anno: `SELECT extract(month FROM g)::int AS mese, extract(year FROM g)::int AS anno, g::date AS inizio, (g + interval '1 month - 1 day')::date AS fine FROM generate_series(date_trunc('month', ${oggi}::date) - interval '12 months', date_trunc('month', ${oggi}::date), interval '1 month') g`; join `b.anno = p.anno AND b.mese = p.mese`; aggiungere `anno` a `MeseBollettino` e ai titoli («dicembre 2026»).
- Prova che la verifica: `test/oggi.spec.ts` — caso con oggi = 2027-01-20 e fatture di dicembre 2026 senza bollettino → voce presente.
- Esecutore: DeepSeek V4 Flash — una funzione SQL in un file.
- File toccati: `app/backend/src/oggi.ts`, `app/backend/test/oggi.spec.ts`.
- Dipende da / correlato a: D-03 (§5.6). Possibile doppione con A2 se guarda `oggi.ts`.

### A4-03 — Un file scritto a metà su disco resta per sempre come «stesso contenuto»
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:86-88` (`writeFile(..., { flag: 'wx' })`, `EEXIST` accettato)
- Problema: se la scrittura si interrompe (disco pieno, processo fermato) il file parziale resta con il nome dell'impronta; il nuovo invio trova `EEXIST`, lo considera identico e crea la riga su un file troncato.
- Scenario: disco pieno durante il caricamento di un PDF di 12 MB → `ENOSPC`, 500 → si libera spazio e si ricarica → `EEXIST` → riga creata, il lettore manda a LlamaCloud un PDF rotto → 3 tentativi → `errore`; ricaricarlo dà 409 (doppione). Il file vero non entra più.
- Correzione puntuale: scrivere su `<percorso>.<randomUUID()>.tmp` e poi `link(tmp, percorso)` (fallisce se esiste) + `rm(tmp)`; su `EEXIST` rileggere il file esistente e confrontare lo SHA-256: se diverso, sostituirlo con `rename(tmp, percorso)`.
- Prova che la verifica: `test/documenti.spec.ts` — file parziale già presente con il nome dell'impronta → dopo il caricamento il contenuto su disco ha l'impronta giusta.
- Esecutore: DeepSeek V4 Flash — una funzione, logica locale.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`.
- Dipende da / correlato a: D-54, V13.

### A4-04 — Casella IMAP: la password può viaggiare in chiaro sulle porte diverse da 993
- Gravità: P2
- Dove: `app/backend/src/casella.ts:103-106` (`apriImap`)
- Problema: con porta 143 imapflow fa STARTTLS solo se il server lo offre; un intermediario che toglie `STARTTLS` dalle capacità ottiene `LOGIN` in chiaro. La posta in uscita invece lo impone (`requireTLS`, `posta.ts:328`).
- Scenario: Impostazioni → Casella con porta 143 su rete con un apparato malevolo/vecchio → utente e password della casella dei fornitori in chiaro.
- Correzione puntuale: in `new ImapFlow({...})` aggiungere `doSTARTTLS: config.porta === 993 ? undefined : true` (imapflow: `true` = STARTTLS obbligatorio, fallisce se manca).
- Prova che la verifica: controllo a mano nel test di `casella.spec.ts` sulle opzioni passate (estrarre le opzioni in una funzione `opzioniImap(config)` ed esportarla).
- Esecutore: DeepSeek V4 Flash — una riga in un file.
- File toccati: `app/backend/src/casella.ts`, `app/backend/test/casella.spec.ts`.
- Dipende da / correlato a: A1 (sicurezza), D-66.

### A4-05 — Un'email che dà un errore inatteso blocca tutte le email dopo di lei, a ogni giro
- Gravità: P2
- Dove: `app/backend/src/casella.ts:82` (`simpleParser` nel generatore), `casella.ts:199-201` (`throw e`)
- Problema: qualsiasi errore non classificato (parse MIME, errore del database su quell'allegato, `fetchOne` fallito) interrompe il `for await`: l'email non si sposta e il giro dopo riparte da lei, con lo stesso esito.
- Scenario: un'email malformata con UID 120 in cima alla cartella → ogni 2 minuti il giro finisce in `errore` a UID 120; le email 121…n (fatture vere) non entrano mai. L'unico segnale è l'esito del servizio in Stato del sistema, senza dire quale email.
- Correzione puntuale: nel generatore, `try { parsed = await simpleParser(...) } catch (e) { yield { uid, da: '', oggetto: '', allegati: [], errore: pulisci(e) }; continue; }`; in `giroCasella` gestire `msg.errore` e gli errori non classificati per messaggio: `esito = 'attenzione'`, anomalia `casella.allegato` con `chiave: String(uid)` e il testo fisso, **niente spostamento**, `continue` con la successiva (contare `ignorati`). Gli errori di connessione (`client` chiuso) restano fatali.
- Prova che la verifica: `test/casella.spec.ts` — casella finta con 3 email, la seconda lancia: la prima e la terza entrano, la seconda resta e apre l'anomalia.
- Esecutore: DeepSeek V4 — cambia il flusso del giro e le anomalie.
- File toccati: `app/backend/src/casella.ts`, `app/backend/test/casella.spec.ts`.
- Dipende da / correlato a: D-66, §7.14.3.

### A4-06 — Annullare un documento abbinato lo rimanda alla lettura: correzioni perse e crediti spesi
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:1034` (`elimina`: `stato: 'in_coda'`), `app/backend/src/lettura.ts:303` (`deleteMany` dei campi)
- Problema: «il file torna in coda» oggi vuol dire «da leggere»: il lettore lo preleva, cancella tutti i `documenti_campi` (valori finali e ✓ verificati compresi) e lo rilegge a pagamento.
- Scenario: fattura letta, 4 campi corretti a mano, abbinata alla pratica sbagliata → *Annulla* per abbinarla a quella giusta → entro 15 s il documento torna `da_controllare` con i valori letti originali: le 4 correzioni sono sparite e si è consumata una lettura LlamaCloud.
- Correzione puntuale: in `elimina`, `stato: a.letto_il ? 'da_controllare' : 'in_coda'` (leggere `letto_il` dalla riga bloccata). Allineare il testo «torna in coda» in guida/spec.
- Prova che la verifica: `test/documenti.spec.ts:211-225` — dopo l'annullamento di un documento letto lo stato è `da_controllare` e i campi corretti restano.
- Esecutore: DeepSeek V4 Flash — una condizione in un file.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`, `app/frontend/lib/guida.ts`.
- Dipende da / correlato a: D-54, D-60, D-72.

### A4-07 — P.IVA con prefisso del paese non riconosciuta; P.IVA condivisa → cliente a caso
- Gravità: P2
- Dove: `app/backend/src/proposta.ts:200-212` (`normalizzaPiva`, `riconosciCliente`)
- Problema: la normalizzazione tiene il prefisso (`IT01234567890` ≠ `01234567890`) benché il commento dica «prefissi ignorati»; con più clienti con la stessa P.IVA (sedi/punti vendita di una catena in Integra) `find` prende il primo.
- Scenario 1: documento tedesco «Ihre USt-IdNr.: IT 01234567890» (proprio il caso di D-91), Integra ha `01234567890` → cliente non riconosciuto, l'operatore va a cercarlo a mano. Scenario 2: «Garden Rossi Bergamo» e «Garden Rossi Brescia» con la stessa P.IVA → il link porta sempre al primo, anche quando la ragione sociale letta è l'altro.
- Correzione puntuale: `normalizzaPiva = s => s.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^[A-Z]{2}(?=\d)/, '')`; raccogliere **tutti** i clienti con quella P.IVA: uno → quello; più di uno → scegliere fra loro con la ragione sociale normalizzata (match unico), altrimenti `null`.
- Prova che la verifica: `test/proposta.spec.ts` — `IT01234567890` contro `01234567890`; due clienti con la stessa P.IVA e ragioni diverse.
- Esecutore: DeepSeek V4 Flash — una funzione, logica locale.
- File toccati: `app/backend/src/proposta.ts`, `app/backend/test/proposta.spec.ts`.
- Dipende da / correlato a: D-91, D-92 (la «P.IVA univoca» di D-92 è un'ipotesi: vedi *Da decidere*).

### A4-08 — La stessa fattura da due file diversi si abbina a due pratiche: fatturato doppio
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:771-779` (`controllaNumero`), `documenti.ts:1048` (`registra`)
- Problema: il doppione per impronta non copre lo stesso documento in due file diversi (PDF dall'email + scansione caricata); il server accetta la stessa fattura su un'altra pratica dello stesso fornitore con la stessa data (regola multi-ordine), e la proposta `doppio` è solo un avviso.
- Scenario: fattura 2026/481 di Gries da 5.000 € arriva per email (PDF) e un collega carica la scansione → due documenti in coda; il primo si abbina a OF/2026/012, il secondo (proposta «doppio» ignorata o non vista) a OF/2026/015 → nessun 409 (stessa data, altra pratica = multi-ordine) → accettata → 10.000 € di fatturato e provvigioni doppie.
- Correzione puntuale: in `registra`, se `fiscale(b.tipo)` e c'è già lo stesso `tipo+numero` del fornitore su un'**altra** pratica, rifiutare con 409 «Fattura già registrata in OF/…: se è una fattura su più ordini conferma» a meno che il corpo porti `multi_ordine: true` (nuovo campo booleano in `NuovoDocumento`, è una scelta della persona, non un valore calcolato: V12 rispettata); la finestra mostra la conferma.
- Prova che la verifica: `test/documenti-pratica.spec.ts` — seconda registrazione senza `multi_ordine` → 409, con → 201.
- Esecutore: DeepSeek V4 — soldi, backend + frontend.
- File toccati: `app/backend/src/documenti.ts`, finestra di abbinamento/registrazione nel frontend (`componenti/Flussi.tsx` o `VistaPratica.tsx`), test sopra, spec §4.2.7.1/§19.
- Dipende da / correlato a: D-54 (multi-ordine) → anche in *Da decidere*.

### A4-09 — La pulizia notturna degli scartati può cancellare un documento appena recuperato
- Gravità: P2
- Dove: `app/backend/src/sistema.ts:419-424` (`pulisciScartati`: `findMany` poi `deleteMany` per id, senza ricontrollare lo stato)
- Problema: fra la lettura degli id e la cancellazione una riga può essere stata recuperata (`/scartati/:id/recupera`) o rianimata dallo stesso file arrivato per email (`riceviDocumento` riporta in coda uno scartato, e la casella gira anche di notte); `deleteMany({ id: { in } })` la cancella comunque, file compreso.
- Scenario: documento scartato 91 giorni fa; il fornitore lo rimanda per email alle 03:00 mentre gira la pulizia → la riga torna `in_coda`, poi viene cancellata e il file rimosso; l'email è già stata spostata nelle lette → documento perso senza traccia.
- Correzione puntuale: una sola istruzione `DELETE FROM documenti_in_arrivo WHERE stato = 'scartato' AND scartato_il < ${limite} RETURNING id, file_percorso` con `tx.$queryRaw` (oppure `deleteMany` con lo stesso `where` completo dopo un `SELECT … FOR UPDATE`), poi anomalie e file sui soli id restituiti.
- Prova che la verifica: `test/sistema.spec.ts` — riga scartata vecchia riportata `in_coda` dopo la lettura degli id (simulare con due chiamate) → non cancellata.
- Esecutore: DeepSeek V4 Flash — una query in un file.
- File toccati: `app/backend/src/sistema.ts`, `app/backend/test/sistema.spec.ts`.
- Dipende da / correlato a: A3 (transazioni), D-74.

### A4-10 — Il PDF del bollettino in `<object>` con `CSP: sandbox` (probabile riquadro vuoto in Chrome/Edge)
- Gravità: P2 (da verificare a schermo)
- Dove: `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx:291-293`; intestazione in `app/backend/src/documenti.ts:518`
- Problema: il server manda il file con `Content-Security-Policy: sandbox` (giusto per la sicurezza); i visualizzatori PDF integrati di Chromium non si aprono nei documenti in sandbox, quindi `<object>` e il link «Apri il PDF in una scheda» possono mostrare una pagina bloccata. La pagina Documenti usa già PDF.js (`PdfEvidenziato`), il bollettino no.
- Scenario: Chrome, bollettino con PDF → il riquadro resta vuoto/bloccato anche col link di riserva.
- Correzione puntuale: sostituire `<object>` con `PdfEvidenziato` (senza rettangolo) come in `VistaDocumento.tsx:474`; **non** togliere `sandbox` dal backend. Prima verificare con una schermata (A6).
- Prova che la verifica: `strumenti/prove/app_bollettino.py` — il canvas del PDF ha dimensioni > 0.
- Esecutore: DeepSeek V4 Flash — un componente in un file.
- File toccati: `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`.
- Dipende da / correlato a: A5, A6, D-93.

### A4-11 — Oggi: «Documenti da decidere» è ancora spento anche se l'ingresso documenti funziona
- Gravità: P2
- Dove: `app/backend/src/oggi.ts:208-210` (`disponibile: false, conta: 0`)
- Problema: il gruppo doveva accendersi con F6 (spec 8.37); ora la lettura c'è ma Oggi dice sempre «Nessun documento richiede una decisione», anche con documenti `da_controllare` o in `errore`.
- Scenario: 5 documenti in `errore` e 3 `da_controllare` → Oggi mostra 0 e il testo «arriva con la lettura automatica».
- Correzione puntuale: `conta` = documenti `da_controllare` + `errore` non abbinati (la stessa condizione di `conteggiBarra`), voci con `href: '/documenti/' + id`, titolo per livello (`bassa` prima), `disponibile: true`; togliere il sommario provvisorio.
- Prova che la verifica: `test/oggi.spec.ts`, `strumenti/prove/app_oggi.py`.
- Esecutore: DeepSeek V4 Flash — un file backend (+ guida).
- File toccati: `app/backend/src/oggi.ts`, `app/backend/test/oggi.spec.ts`, `app/frontend/lib/guida.ts`.
- Dipende da / correlato a: A9 (coerenza spec), §7.1.

### A4-12 — Il limite della casella vale sull'email intera, non sull'allegato
- Gravità: P3
- Dove: `app/backend/src/casella.ts:76`
- Problema: `RFC822.SIZE` comprende la codifica base64 (+37 %) e tutti gli allegati: un PDF di 16 MB (sotto i 20 MB) arriva in un'email di ~22 MB e non si scarica; tre PDF da 7 MB nella stessa email idem.
- Scenario: fornitore manda 3 fatture da 7 MB insieme → nessuna entra, solo l'anomalia «supera il limite».
- Correzione puntuale: soglia dell'email `Math.ceil(MAX_BYTE * 1.4) * 3` (o `bodyStructure` per scaricare gli allegati uno a uno, come già annotato nel `shortcut`); il limite del singolo file resta in `riceviDocumento`.
- Prova che la verifica: `test/casella.spec.ts` (email di 25 MB con allegati da 7 MB → presi).
- Esecutore: DeepSeek V4 Flash.
- File toccati: `app/backend/src/casella.ts`, `app/backend/test/casella.spec.ts`.
- Dipende da / correlato a: D-66.

### A4-13 — `PUT /api/documenti/:id` con un corpo non oggetto dà 500
- Gravità: P3
- Dove: `app/backend/src/documenti.ts:541-553` (corpo tipizzato con un'interfaccia: il `ValidationPipe` non lo controlla)
- Problema: `'fornitore_id' in testata` con `testata` stringa o numero, oppure una riga `null`, lancia `TypeError` → 500 nel registro errori.
- Scenario: `{"testata":"x","righe":[null]}` → 500 invece di 400.
- Correzione puntuale: in testa a `correggi`: `const ogg = (v) => v != null && typeof v === 'object' && !Array.isArray(v)`; 400 se `b.testata` non è oggetto, se `b.righe` non è un array di oggetti o supera 1000 righe.
- Prova che la verifica: `test/documenti-lettura.spec.ts` — corpo errato → 400.
- Esecutore: DeepSeek V4 Flash.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti-lettura.spec.ts`.
- Dipende da / correlato a: D-72, V12.

### A4-14 — Ricaricare uno scartato mentre lo si elimina dà 500
- Gravità: P3
- Dove: `app/backend/src/documenti.ts:96-97` (`findUniqueOrThrow` sulla riga appena cancellata da `scartati.ts:563` o da `pulisciScartati`)
- Problema: la riga letta fuori dalla transazione può sparire prima del `FOR UPDATE`; `findUniqueOrThrow` → P2025 → 500 (e il file può essere rimosso subito dopo dall'eliminazione).
- Scenario: l'amministratore elimina definitivamente uno scartato nello stesso istante in cui il file torna per email → 500, il giro della casella finisce in `errore` (vedi A4-05) e l'email resta.
- Correzione puntuale: se la riga bloccata non c'è più, uscire dalla transazione e rifare `riceviDocumento` una volta da capo (nuova riga, nuovo percorso del giorno).
- Prova che la verifica: `test/documenti.spec.ts` (riga cancellata fra la lettura e la transazione: simulare con uno spy su `findUnique`).
- Esecutore: DeepSeek V4 Flash.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`.
- Dipende da / correlato a: A4-05, A4-09.

---

## Da decidere (Ugo)

1. **D-54, stesso file scartato che ritorna per email** — oggi lo stesso PDF rimandato dal fornitore (es. un promemoria) rimette in coda **in automatico** un documento scartato con motivo «Non riguarda Decobrands» o «Doppione». D-54 lo prevede per il ricaricamento; per la casella forse andrebbe solo contato fra gli ignorati. Proposta: rianimare lo scartato solo se `origine = 'caricamento'`.
2. **D-54, multi-ordine e fatture doppie (A4-08)** — la regola «stessa fattura su più pratiche con la stessa data» non distingue il multi-ordine vero dallo stesso documento arrivato due volte in file diversi. Serve la conferma esplicita `multi_ordine`?
3. **D-92, «P.IVA univoca»** — in Integra più clienti (sedi di una catena) possono avere la stessa P.IVA: confermare la regola «più clienti con la stessa P.IVA → decide la ragione sociale, altrimenti non riconosciuto» (A4-07).
4. **D-67 / CLAUDE.md** — CLAUDE.md dice «letti in locale con GLM-OCR», l'app legge con LlamaCloud UE (D-67) e il connettore locale non esiste: se in Impostazioni si sceglie `glm_ocr_locale` i documenti restano `in_coda` per sempre senza anomalia (`lettura.ts:342`). Allineare CLAUDE.md a D-67 e decidere se scegliere il connettore locale debba essere impedito finché non c'è (o aprire `lettura.non_raggiungibile`).
