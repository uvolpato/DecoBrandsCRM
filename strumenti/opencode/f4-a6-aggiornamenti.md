# F4-A6 — Numeri che si aggiornano da soli (+ filtri standard da completare)

Compito: il canale degli aggiornamenti (D-23, §16.4.2) e il controllo che i filtri standard
(D-22) siano davvero su tutte le liste. Modello indicato dal piano: Sonnet. In OpenCode: il
modello della sessione, 4 h approvate (04/11/2026).

## Cosa consegnare

1. **Server**:
   - `GET /api/eventi/flusso` (**Server-Sent Events**), `@Richiede('collegato')`, `@Sse`:
     eventi con `data: {"aree":["pratiche","documenti",…]}`. Battito ogni ~25 s (`{"battito":true}`)
     perché proxy e browser non chiudano il canale.
   - Le aree si ricavano dal **registro** (D-31), non da chiamate sparse nei servizi: un solo
     ciclo (ogni ~4 s) che legge `registro` con `id > ultimo`, prende i codici e li raggruppa.
     Parte da `max(id)` al primo collegamento (nessun evento vecchio), unisce gli eventi arrivati
     insieme in uno solo, nessuna query per client, il ciclo gira **solo** mentre qualcuno è
     collegato. Se il backend avrà più di un processo, servirà un canale condiviso: lascia un
     `shortcut:` con questo limite.
   - Mappa codici → aree, fissa e testabile: `pratiche` (pratica.*), `documenti` (documento.*),
     `bollettini` (bollettino.*, calcolo.*), `liquidazioni` (liquidazione.*, provvigioni.*),
     `anagrafiche` (fornitore.*, cliente.*, subagente.*, agente.*, eccezione.*, percentuale.*,
     interscambio.*, integra.*), `utenti` (utente.*, auth.*), `impostazioni` (impostazione.*);
     codici sconosciuti → nessuna area. `stato.change_state` è generico: l'area la dice la colonna
     `registro.entita` (`pratica` → `pratiche`, `documento` → `documenti`, `bollettino` →
     `bollettini`, `liquidazione` → `liquidazioni`, `utente` → `utenti`; le altre → nessuna area).
   - **Prove server**: la funzione pura delle aree (tutti i prefissi, gli sconosciuti), la rotta
     che senza sessione risponde 401/403, e un test che il flusso invia un evento quando il
     registro cresce (se il test SSE con supertest è instabile, prova la funzione del ciclo con un
     registro finto e lascia l'SSE alla prova nel browser).
2. **Frontend**:
   - `lib/eventi.tsx`: `EventiProvider` + `useEventi()` con `{ versione: Record<area, number> }`;
     un solo `EventSource('/api/eventi/flusso')` per scheda, chiuso allo smontaggio, riconnessione
     del browser, niente eventi dopo il logout. Montato nel guscio `app/(app)/layout.tsx`.
   - Componente `Aggiornamenti` (barra) con il testo **«Ci sono aggiornamenti · Aggiorna»** e il
     pulsante; classi di `stile.css`, niente Bootstrap.
   - **Pratiche** e **Bollettini**: quando arriva un evento per la loro area, rileggono i dati in
     silenzio e **aggiornano i contatori** (segmenti, totali, riepilogo) **senza toccare le righe**
     mostrate; se le righe sono cambiate compare la barra, e *Aggiorna* applica i dati nuovi
     mantenendo filtri, ordinamento, pagina, scheda e scorrimento (§7.12).
   - Le modifiche fatte dall'utente stesso continuano a ridisegnare subito (non aspettano l'evento).
   - **Filtri standard (D-22)**: controlla Pratiche, Bollettini e la scheda *Pratiche* del cliente:
     entità con ricerca a selezione multipla, riepilogo, azzeramento a icona, conteggi dei segmenti
     con gli altri filtri (D-23). Se qualcosa manca, completalo; se c'è già, scrivilo nel resoconto
     (niente lavoro inutile).
3. **Prova browser** `strumenti/prove/app_eventi.py`: due schede dello stesso utente; la scheda B
   fa una scrittura vera (scegli la meno distruttiva: un documento di prova su una pratica e poi
   lo elimini, oppure un bollettino di prova e poi lo togli), la scheda A (su Pratiche o Bollettini,
   con un filtro attivo) entro ~10 s mostra la barra, i contatori cambiano e le righe restano;
   *Aggiorna* applica, la barra sparisce, filtri e pagina restano. 1440 e 768 px, 0 KO, nessun
   errore JS. Pulisci tutto quello che scrivi.

## Dove

- Backend: `app/backend/src/` (un file `eventi.ts` con controller e servizio, registrato in
  `app.module.ts`), `app/backend/test/eventi.spec.ts`.
- Frontend: `app/frontend/lib/eventi.tsx`, `app/frontend/componenti/Aggiornamenti.tsx`,
  `app/frontend/app/(app)/layout.tsx`, `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`,
  `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`.
- Spec: §16.4.2 (i due modi di reagire, già scritti; aggiungi il *Nell'app*), §8.1 (nuova rotta),
  §7.2/§7.7 se serve; piano F4-A6. Versione in testa.
- Prototipo: `prototipo-alternativo/assets/componenti.js` (`FilterBar`, `RiepilogoFiltri`,
  `CampoRicerca` multipla) per i filtri; per la barra degli aggiornamenti non c'è: inventa con
  `stile.css` e i testi della guida (`guida.js`: «Ci sono aggiornamenti · Aggiorna»).
- Rigenera `python strumenti/genera-pagine-doc.py`. **Non** toccare `avanzamento-app.md`.

## Regole

- Tutto sul backend, mai dai dati del frontend (V12); una operazione, una transazione (V13) se
  scrivi; qui si legge soltanto.
- Italiano semplice in interfaccia, codice e commenti; commenti brevi con il rimando
  (`// D-23 §19`).
- Codice minimo (ponytail): niente `react-query`, niente WebSocket, niente astrazioni nuove; si
  riusano `api()`, `FilterBar`, `DataTable`, `Sagoma`, `useMemoria`.
- Prove solo su `decobrands_test`, mai su `decobrands_db`; niente reset distruttivi; niente
  commit, niente push, niente `.env`.
- Prima di grep o letture per domande sul codice, `graphify query "<domanda>"`.
- Schermate 1440 e 768 px e guardale (niente telefono, D-44).

## Verifica

- `npx tsc --noEmit` pulito (backend e frontend), `npm run build` frontend.
- `npx jest test/eventi.spec.ts --runInBand` 0 KO e tutte le altre spec una per processo (Jest
  tutto insieme su Windows si pianta), 0 KO.
- `python strumenti/prove/app_eventi.py <suffisso> <cartella> [base]` 0 KO, da seed pulito.
- Rilancia `app_pratiche.py` e `app_bollettini.py`: le pagine toccate non devono perdere niente.

## Resoconto

`strumenti/opencode/resoconto-f4-a6.md`: file toccati, che cosa c'era già nei filtri, prove,
schermate, dubbi e cose lasciate aperte (per esempio: quali pagine restano fuori e perché).
