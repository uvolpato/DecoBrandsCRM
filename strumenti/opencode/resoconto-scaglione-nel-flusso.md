# Resoconto — Scaglione mancante configurato dentro «Apri la pratica» (P1, 14/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/scaglione-nel-flusso.md`. Nell'albero c'erano le
modifiche non committate di `ricerca-numeri-rossi` (`VistaDocumento.tsx`, `Campo.tsx`, `CampoRicerca.tsx`,
`FormAgenzia.tsx`, `app_documenti.py`): **non le ho perse**, ci ho lavorato sopra.

## Cosa è stato fatto

1. **Server** (`documenti.ts`): il 409 dello scaglione mancante (`nuovaPratica`) ora porta un codice e i dati,
   invece del solo messaggio. Nuova funzione `scaglioneMancante` (stessa idea di `agenziaDaConfermare`, D-159):
   `code: 'scaglione_mancante'`, messaggio «‹Fornitore› non ha ancora le percentuali delle provvigioni valide al
   ‹gg/mm/aaaa› (sconto ‹n› %): senza, la provvigione sarebbe zero.», e `scaglione` con `fornitore_id`,
   `fornitore` (ragione sociale), `sconto`, `data` (dell'ordine) e `ha_percentuali` (se il fornitore ha già
   versioni di percentuali). Il fornitore si legge col `corrente.ragione_sociale` nel `select` già esistente.
2. **Componente condiviso** (`componenti/FormPercentuali.tsx`, nuovo): la finestra delle percentuali/scaglioni
   prima dentro `VistaFornitori.tsx` (righe ~195–265) è stata spostata qui, **stessa logica, stesse rotte, stessi
   controlli** (`fornitori/:id/percentuali`, POST/PUT, nessuna logica nuova). Espone i tipi `Scaglione`,
   `ScaglioneVersione`, `Versione`, `Percentuali` e le prop `idFornitore`, `ragioneSociale`, `correzione`
   (correggi una versione), `validoDalProposta`, `nonOltre` (dal documento), `onSalvata`, `onChiudi`.
3. **Fornitori** (`VistaFornitori.tsx`): usa `FormPercentuali` al posto del `FormModal` interno. **Niente di
   visibile è cambiato** (stessi titoli, campi, etichette, controlli): `nuovePercentuali`/`correggi` ora aprono
   `FormPercentuali`; `campiBozza`/`salvaBozza` e i tipi locali sono stati rimossi.
4. **Apri la pratica** (`VistaDocumento.tsx`, `ApriPratica`): al 409 `scaglione_mancante` compare il pulsante
   **«Configura le percentuali»** (il messaggio del server è già nel riquadro); apre `FormPercentuali` con
   fornitore fisso e «Valide dal» proposto alla data dell'ordine (con l'aiuto «Non oltre … (data dell'ordine)»);
   al salvataggio riprova ad aprire la pratica. Senza il permesso `dati.condizioni` il pulsante è spento col
   motivo nel `title` («Serve il livello responsabile in Dati»).
5. **guida.ts**: pulsante «Configura le percentuali» e voce «da sapere» corrispondente.
6. **Stesso 409 altrove**: lo scaglione mancante esiste solo in `nuovaPratica` (apertura pratica da un ordine).
   Conferme/fatture e bollettini registrano in una pratica già aperta (dove vale `richiediAgenzia`, non lo
   scaglione) e la card `scaglioni_mancanti` del dettaglio documento è informativa, non un 409. Non serve altro.

## Prove

- `npx tsc --noEmit`: pulito nel backend e nel frontend.
- jest su `decobrands_test_scaglione` (creato, migrazioni, seed, poi **cancellato**): `documenti.spec.ts`
  **68/68**. Aggiunto `describe('scaglione mancante (D-162)')`: 409 con codice e dati (`ha_percentuali` false
  senza versioni, true con uno scaglione solo futuro), e dopo la creazione dello scaglione l'ordine apre la
  pratica.
- Prove nel browser **non lanciate** (regola onda): `python -m py_compile` pulito su `app_documenti.py`,
  `app_fornitori.py`, `app_componenti.py`. Le lancia Claude Code (`giro.sh decobrands_test_e2e app_documenti
  app_componenti app_fornitori app_pratica`).

## Aggiunta di Claude Code (da fare alla fine)

1. **`app_documenti.py` (limite 10 accessi, D-41)**: `pgN = entra(S + '-ammi')` (~riga 721, D-161) era l'11°
   accesso di `-ammi` e andava in timeout. Ho cambiato `pgN` e `pgA` (D-158) in `-oper` (ha `dati.modifica`, il
   flusso è identico a D-159 che già usa `-oper`), così `-ammi` resta a 9 accessi e l'ho usato **una** volta per
   il nuovo blocco D-162 (serve `dati.condizioni`, solo responsabile): totale 10, sotto il tetto. Aggiunto il
   blocco D-162 con rotte simulate: abbina 409 `scaglione_mancante` → «Configura le percentuali» → salva →
   abbina 200 → la pratica si apre. Controlla anche «Valide dal = data dell'ordine».
2. **`app_componenti.py` 1 KO «memoria: la scheda aperta si ritrova»**: **non è la correzione di CampoRicerca.tsx**.
   La modifica D-161 tocca solo `useVoci`/`Singola`/`Multipla` di `CampoRicerca` (isolate); `Schede.tsx`,
   `memoria.ts`, `DataTable.tsx` e la pagina del catalogo non sono cambiati. Siccome l'ordinamento della tabella
   (stessa `useMemoria`) si ritrova e la scheda no, è un **gara di tempo nel re-render dopo `go_back()`**: la
   verifica correva prima che la scheda ricordata fosse riselezionata. Ho reso la prova robusta con un
   `wait_for_function` sulla scheda `aria-selected` (5 s) invece della verifica immediata. Da confermare nel giro.

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `vercel-composition-patterns`, `caveman`. Rilievi
veri: nessuno. Il 409 manda solo id e dati già noti al server (nessun valore calcolato dal browser, V12); la
scrittura delle percentuali resta quella esistente (`fornitori/:id/percentuali`, permesso `dati.condizioni` sul
server). `FormPercentuali` è lo stesso codice spostato, nessuna logica nuova (nessun controllo di permesso nel
componente: lo fa il server e il pulsante spento usa `usePuo`).

## Da documentare

- **§19 — D-162** (da proporre): lo scaglione mancante del fornitore non rimanda più in Fornitori: «Apri la
  pratica» risponde 409 `scaglione_mancante` con i dati e apre la finestra delle percentuali lì, poi riprova.
- **§7.9 (Documenti)** — `Apri la pratica`: riquadro «Configura le percentuali» con la data dell'ordine proposta.
- **§16.4 (componenti)** — nuovo componente condiviso `FormPercentuali` (finestra percentuali/scaglioni, usata
  da Fornitori e Documenti); il codice è uscito da `VistaFornitori`.

## Aperto

- Il giro del browser non è stato eseguito qui (regola onda): lo lancia Claude Code. Il blocco D-162 di
  `app_documenti.py` e la correzione di `app_componenti.py` sono da confermare nel giro (0 KO attesi).
- `ha_percentuali` è nel 409 ma il pulsante ha etichetta fissa «Configura le percentuali» (come da pacchetto);
  se si vuole distinguere «Configura gli scaglioni» / «Nuove percentuali» va deciso con Ugo e documentato.
