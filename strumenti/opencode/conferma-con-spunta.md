# Conferma con spunta per le operazioni senza ritorno + «Rileggi il documento» come pulsante (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P1 · **Regola di progetto** (D-172).

Prima leggi i resoconti di `numero-ordine-fornitore`, `azioni-riga`, `affiancati-righe`, `link-diretti` (modifiche non committate negli stessi file). Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Cosa vuole Ugo
1. **«Rileggi il documento» in *Correggi i dati letti*** oggi è un link sopra il campo «Ordine fornitore» (testata). Va tolto da lì e diventa un **pulsante** nel piede della finestra, a sinistra (lontano da «Salva e ricalcola l'abbinamento»), che apre una **conferma** che spiega tutto quello che succede, per esempio:
   - il documento viene **mandato di nuovo al servizio di lettura** (non nominare il fornitore del servizio: «il servizio di lettura», può cambiare);
   - **tutti i campi letti verranno riscritti**, comprese le correzioni fatte a mano; le correzioni non salvate di questa finestra si perdono;
   - fornitore, cliente e abbinamento verranno **riconosciuti di nuovo**;
   - la lettura consuma un tentativo/credito e può richiedere qualche minuto; il documento torna in coda;
   - (scrivi i punti veri leggendo il codice di «Rileggi» in `documenti.ts`/`lettura.ts`: se qualcosa non è vero, non scriverlo).
   Lo stesso pulsante c'è nell'intestazione del documento: stessa conferma.
1b. **Riga 1 della testata di *Correggi i dati letti*** (Ugo, schermata di PR102813): i **5 campi sulla stessa riga**: Tipo · Numero · Ordine fornitore · Data · Importo (con «✓ Somma righe …» sopra l’Importo, allineata a destra, come D-154). Oggi l’Importo va a capo e l’etichetta «Ordine fornitore» è coperta dal link «Rileggi il documento» (che si sposta nel piede, punto 1). Larghezze: **Tipo** largo quanto basta per la voce più lunga «Nota di credito» (+ freccia della tendina), **Data** largo quanto basta per gg/mm/aaaa + icona del calendario, senza tagli; Numero e Ordine fornitore prendono lo spazio che resta; Importo come oggi. Nessun testo tagliato a 1440; a 768 la riga può andare a capo in modo ordinato. Schermate a 1440 e 768, guardale.
2. **Regola standard (D-172)**: tutte le operazioni **impattanti, con perdita o modifica definitiva e senza ritorno dei dati** usano la stessa finestra di conferma con una **casella da spuntare** («Ho capito, procedi» o testo specifico) che **abilita** il pulsante di conferma (spento finché non è spuntata). Un componente unico (es. `ConfermaGrave` in `app/frontend/componenti/`, riusando la finestra di conferma che c'è già): titolo, elenco puntato delle conseguenze, testo della casella, pulsante di conferma rosso. Applicalo a: Rileggi il documento, Scarta il documento, Elimina (agenzie, scaglioni, eccezioni, utenti, subagenti…), chiusura di bollettini e liquidazioni, annullamenti di documenti/note di credito, svuota/elimina definitivo negli Scartati, e ogni altra azione senza ritorno che trovi (elenco nel resoconto, con i casi dubbi da far decidere a Ugo). Le conferme leggere (azioni reversibili) restano come sono.
   Il server non cambia (la conferma è solo nell'interfaccia; i controlli restano sul server).
2b. **Azioni sulle righe anche nelle liste che non sono tabelle** (Ugo, D-171): il componente `AzioniRiga` (pacchetto `azioni-riga`, leggi il resoconto) va applicato con la stessa modalità (icone in slot fissi, spazio vuoto se l’azione manca) anche agli elenchi non `DataTable` con pulsanti di testo sulle righe: `Elenco`, incassi della pratica, e ogni altro che trovi (elenco nel resoconto). Le azioni senza ritorno di queste righe usano la conferma con spunta del punto 2.
3. Accessibilità: la casella con etichetta cliccabile, fuoco iniziale sulla casella, Invio non conferma finché è spenta, Esc annulla.

## File ammessi
`app/frontend/**`, `strumenti/prove/app_*.py` (le prove che confermano operazioni devono spuntare la casella), il catalogo dei componenti, `app/frontend/lib/guida.ts`, il resoconto `strumenti/opencode/resoconto-conferma-con-spunta.md`. Non `app/backend/**`.

## Fine
- `npx tsc --noEmit` nel frontend.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e <tutte le prove app_* toccate>` (timeout 10 min per comando, anche a gruppi), 0 KO; controllo nuovo: «Rileggi» apre la conferma, pulsante spento finché non si spunta.
- Carica davvero `ponytail-review`, `accessibility`, `design:ux-copy`, `caveman`.
- Resoconto con «Da documentare» (§16.4 componente, §16.4.1 regola, §19 D-172).
