# Link diretti a ciò che serve consultare + allineamento della finestra agenzia (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P2 (tocca molte pagine e la memoria della schermata). Parte dopo `provvigione-non-somma` (leggi il suo resoconto: etichette delle percentuali cambiate, D-166).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Cosa vuole Ugo
1. **Finestra dell'agenzia** (`app/frontend/componenti/FormAgenzia.tsx`, aperta da Clienti → AGRI AGGIO → scheda Agenzie → agenzia ARTE, subagente Bastasin Maurizio): ci sono **campi disallineati** (etichette e campi non sulla stessa linea, larghezze diverse): sistemali con la griglia del modulo come nelle altre finestre (stessa altezza, etichette allineate, niente buchi). Fai una schermata a 1440 e 768 px prima e dopo e guardale.
2. Nella stessa finestra il testo fa riferimento agli **scaglioni** del fornitore (sconto → percentuali): aggiungi un **link diretto** alla pagina del fornitore sulla scheda delle percentuali (`/fornitori/<id>` con la scheda giusta già aperta: usa il parametro che la pagina Fornitori già capisce, o aggiungilo se manca, con la memoria della schermata §7.12). Si apre in una nuova scheda del browser (`target="_blank" rel="noopener"`) se la finestra ha dati non salvati, altrimenti nella stessa.
3. **Applica lo stesso criterio ovunque serva consultare qualcosa** senza perdere il lavoro. Cerca nell'app i punti in cui si cita un'altra entità senza poterci arrivare e metti il link, per esempio (verifica quali mancano davvero):
   - nome del **cliente**, del **fornitore**, del **subagente** in Pratica, Documenti, Bollettino, Liquidazioni, Analisi, Scartati, Registro → la loro scheda;
   - **pratica** citata in un documento, in un bollettino, in una liquidazione → la pratica;
   - **documento/PDF** citato in una pratica o in un bollettino → il documento;
   - **agenzia** usata da una pratica → scheda Agenzie del cliente con l'agenzia selezionata;
   - **percentuali/scaglioni** usati da una pratica (riepilogo provvigione) → percentuali del fornitore alla versione in vigore;
   - nella modale *Apri la pratica* i pallini verdi come in *Correggi i dati letti* (prop `link` di `CampoRicerca`, pacchetto `pallini-link`).
   **Regola generale di Ugo: i dati interconnessi devono essere navigabili in sequenza.** Da qualunque punto si segue la catena senza vicoli ciechi, per esempio documento → pratica → cliente → agenzia → fornitore → percentuali → altre pratiche dello stesso fornitore, e da ogni pagina si torna indietro con «Indietro» del browser alla schermata precedente nello stesso stato (filtri, scheda, voce selezionata, scorrimento: `registra`, §7.12). Ogni pagina di dettaglio deve avere link verso tutte le entità che mostra. Nel resoconto disegna le catene coperte e quelle che restano interrotte.
   Usa un solo componente/stile per i link (riusa quello che c'è, es. `Link` di Next con la classe dei link dell'app); niente link dove l'utente non ha il permesso di vedere la pagina (nascondi o testo semplice).
   Nel resoconto: tabella **«fatti»** (dove, verso cosa) e tabella **«proposti, non fatti»** con i casi dubbi da far decidere a Ugo.
4. **Campi data** (Ugo): tutti i campi data dell'app devono avere il **selettore della data** e la **formattazione italiana** (gg/mm/aaaa). Oggi alcuni sono campi di testo semplici (es. «Valide dal» nella correzione delle percentuali, date nella finestra dell'agenzia «Valido dal / al», filtri di periodo). Cerca ogni campo data (`type="text"` con date, `tipo: 'testo'` usati per date in `FormModal`/`Campo`, valori `AAAA-MM-GG` mostrati grezzi) e usa il tipo data del componente `Campo` (`<input type="date">`, D-… nativo, niente librerie nuove); dove una data è solo **mostrata** usa la funzione di formato già presente nell'app (cercala, es. in `lib/`), mai `2026-02-17` grezzo nei testi (es. «Non oltre il 2026-02-17» → «Non oltre il 17/02/2026», «Ci sono già percentuali dal 2026-02-17»: questi testi arrivano anche dal server → se il testo è del server, scrivilo negli aperti, non toccare il backend). Nel resoconto l'elenco dei campi cambiati.

## File ammessi
`app/frontend/**` (non `app/backend/**`), `strumenti/prove/app_*.py` (allinea i selettori che cambiano), il resoconto `strumenti/opencode/resoconto-link-diretti.md`.

## Fine
- `npx tsc --noEmit` nel frontend.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_clienti app_pratica app_documenti app_fornitori app_bollettino` (timeout 10 min), 0 KO; controlli nuovi per il link agli scaglioni dalla finestra agenzia, per almeno tre link aggiunti e per una catena completa documento → pratica → cliente → agenzia → fornitore → percentuali con ritorno indietro allo stato di partenza a ogni passo.
- Carica davvero `ponytail-review`, `accessibility`, `caveman`.
