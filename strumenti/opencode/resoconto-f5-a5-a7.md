# Resoconto F5-A5 · Stato del sistema e F5-A7 · Documenti scartati

**Data:** 06/11/2026 · **Ramo:** `main` · **Spec:** 8.52 · **Decisione:** D-74
**Attività:** F5-A5 (§7.14, §4.2.15, §8.1, D-31), F5-A7 (§7.16, §8.1) — ore invariate nel piano.

## Cosa è stato fatto

### Server nuovi

| File | Contenuto |
|---|---|
| `app/backend/src/sistema.ts` | `SistemaService` (controlli ogni 5 minuti con timer di 60 s, nessun timer nelle prove; pulizie notturne), quattro **prove iniettabili** (`sondaCasella`, `sondaLettura`, `sondaIntegra`, `sondaPosta`), `controllaServizio`, `eseguiControlli`, `controllaTutto` (30 s), `stato()` (riquadri §7.14.2), `contatore()`, `pulisciScartati`, `pulisciEsecuzioni`, `SistemaController` |
| `app/backend/src/scartati.ts` | `ScartatiController`: elenco con ricerca e conteggi (D-23), recupero, eliminazione definitiva |
| `app/backend/src/app.module.ts` | registrazione di `SistemaController`, `ScartatiController`, `SistemaService` (righe di registrazione) |

Nessuna migrazione: le tabelle c'erano (`registro`, `servizi_esecuzioni`, `documenti_in_arrivo`).

### Frontend nuovo

| File | Contenuto |
|---|---|
| `app/frontend/app/(app)/sistema/page.tsx`, `VistaSistema.tsx` | riquadri-filtro, problemi (*Da vedere · Tutti*, *Segna come visto*, *Segna tutti come visti*, *Risolto il …*), ultime esecuzioni raggruppate, *Controlla adesso*, aggiornamento ogni 30 s, sagome |
| `app/frontend/app/(app)/scartati/page.tsx`, `VistaScartati.tsx` | tabella con ricerca, segmenti per motivo, *Recupera*, *Elimina* (amministratore, con conferma), eliminazione automatica, pagine |

### Modifiche a file esistenti (minime)

- `componenti/Barra.tsx`: contatore dei problemi (`GET /api/sistema/contatore` a ogni cambio pagina) sulla voce *Stato del sistema* e sul gruppo della Gestione, giallo con un errore; niente per chi non ha `sistema.stato`.
- `app/(app)/documenti/VistaDocumenti.tsx`: collegamento «N scartati» accanto al contatore, solo con `provvigioni.scartati`.
- `lib/guida.ts`: argomenti *Stato del sistema* e *Documenti scartati* aggiornati alla pagina vera (raggruppamento, aggiornamento automatico, ruoli, «Eliminato il», «N scartati»).
- `test/documenti-lettura.spec.ts`: **una riga di prova** resa coerente con la 8.51 (il totale di un bollettino è la somma delle **provvigioni**: il test si aspettava ancora l'imponibile e falliva da prima di questo lavoro). Vedi «Cose aperte».

## API esposte (§8.1)

| Metodo | Rotta | Permesso | Cosa fa |
|---|---|---|---|
| GET | `/api/sistema` | `sistema.stato` | `{servizi, problemi, esecuzioni, conteggi}`; `?vista=da_vedere\|tutti`, `?servizio=`, `?limite=` |
| GET | `/api/sistema/contatore` | `sistema.stato` | `{problemi, errore}` per la barra |
| POST | `/api/sistema/problemi/:id/visto` | `sistema.stato` | segna visto + evento `stato/change_state` |
| POST | `/api/sistema/problemi/visti` | `sistema.stato` | segna tutti visti + un evento con l'elenco |
| POST | `/api/sistema/controlla` | `sistema.stato` | giro casella + 4 controlli, risponde entro 30 s |
| GET | `/api/scartati` | `provvigioni.scartati` | elenco con motivo, ricerca, conteggi, pagine, `elimina_il` |
| POST | `/api/scartati/:id/recupera` | `provvigioni.scartati` | torna `da_controllare`, evento `documento/update`, 204/409/404 |
| DELETE | `/api/scartati/:id` | `provvigioni.elimina` + ruolo amministratore | elimina riga e file dopo il commit, evento `documento/update {eliminato: true}`, 204/409/404 |

## Numeri delle prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` backend | 0 errori |
| `npx jest test/sistema.spec.ts` | **22/22** |
| `npx jest test/scartati.spec.ts` | **8/8** |
| `npm test` · gruppo 1 (13 file: accesso … eventi) | **172/172** |
| `npm test` · gruppo 2 (13 file: fornitori … registro-api) | **197/197** |
| `npm test` · gruppo 3 (8 file: registro, scartati, seed, sistema, subagenti, superutente, utenti, vincoli) | **104/104** |
| `npx tsc --noEmit` frontend | 0 errori |
| `npm run build` frontend | ok, `/sistema` e `/scartati` fra le rotte |
| `python strumenti/prove/app_sistema.py p5 …` | **24 controlli, 0 KO** |
| `python strumenti/prove/app_scartati.py p5 …` | **30 controlli, 0 KO** |

Screenshot guardate: `strumenti/prove/schermate-p5/app-sistema-1440.png`, `app-sistema-768.png`, `app-scartati-1440.png`, `app-scartati-768.png`. A 768 px niente scorrimento orizzontale della pagina; le due tabelle di `/sistema` si impilano con un'altezza propria (la seconda, senza, restava schiacciata: corretta con `useStretto`). La tabella degli scartati, come le altre dell'app, scorre di lato dentro la sua area quando le colonne non ci stanno.

Il controllo ogni 5 minuti è stato verificato sul server di sviluppo: giro all'avvio e giri alle 19:07:05 e 19:12:05 (UTC), tutti con `esito = ok`.

## Prove nuove e strumenti

- `app/backend/test/sistema.spec.ts`: stato dei riquadri (non configurata, funziona, fermo, ultimi 3 errori, anomalia errore/attenzione, Integra lenta, problemi per servizio), da vedere/tutti/servizio, «cosa fare», «risolto il», contatore, visto e visti con l'evento una volta sola, controlli con prove finte (3 di fila, cartella, 2 di fila, vista, posta, servizio spento), *Controlla adesso* con servizi spenti (nessuna rete) e con una prova lenta (risponde prima del tempo massimo), raggruppamento delle esecuzioni, permessi.
- `app/backend/test/scartati.spec.ts`: elenco con `elimina_il`, segmenti e ricerca, recupero, eliminazione (admin sì, responsabile e operatore 403), 409/404, pulizia per giorni con i file.
- `strumenti/prove/servizi_prova.js`: `spegni`/`accendi` (salva e rimette le quattro sezioni dei servizi, così *Controlla adesso* non tocca la rete), `problema`/`pulisci` (un'anomalia di prova).
- `strumenti/prove/scartati_prova.js`: `crea`/`togli` due documenti scartati con file e campi.
- `strumenti/prove/app_sistema.py`, `app_scartati.py`: le prove nel browser qui sopra.

## Confronto col prototipo

- Riquadri per servizio che fanno da filtro, con stato, nota, indirizzo, ultimo giro e ritmo; problemi a sinistra con i segmenti *Da vedere · Tutti* e *Segna come visto*; ultime esecuzioni a destra: **uguale** a `viste-gestione.js` 244–293. In più, richiesti dalla spec: *Segna tutti come visti* con il numero, *Risolto il …*, «cosa fare» nella riga, raggruppamento dei controlli, aggiornamento automatico.
- Il prototipo calcola i riquadri nel browser con dati fissi; qui tutto arriva dal server (V12) e i servizi spenti sono verdi «Non configurata» invece del giallo/rosso del prototipo (che non prevede il caso).
- Scartati: tabella con scarto il/da, documento (tipo, numero, fornitore, file), motivo e nota, eliminazione automatica, *Recupera* e *Elimina*: **uguale** alla vista del prototipo. In più la ricerca guarda anche il cliente e il riepilogo dei filtri (standard D-22) e la colonna dice anche il cliente.
- Differenza dichiarata: l'eliminazione definitiva nel prototipo era del *responsabile* (`provvigioni.elimina`); qui, come chiede §7.16, è **solo dell'amministratore** (e del superutente).

## Correzione in revisione (sessione principale)

- `lettura.fallita` ora si **chiude** quando il documento è scartato, recuperato, eliminato e nella
  pulizia degli scartati (§7.14.3): prima restava aperta e il riquadro del *Server di lettura*
  diventava rosso per documenti già tolti. Prova aggiunta in `documenti-lettura.spec.ts`.
- Database di sviluppo ripulito dai 29 documenti delle prove `prova-*` in errore e dalle loro
  anomalie; restano le due anomalie dimostrative di Integra. I documenti demo 1–11 sono quelli
  riallineati ai campi veri.

## Cose aperte

1. **`lettura.lenta` non si apre ancora**: il lettore salva i `secondi` ma non le pagine, quindi la media «oltre 8 s per pagina» non si può calcolare. Va aggiunta quando il connettore restituisce le pagine (F6-A5). Scritto in D-74 e nel catalogo dei riquadri.
2. **Evento di apertura/chiusura delle anomalie**: §15.2.7 prevede `errore/error` su `sistema`; oggi nessun servizio lo scrive (neanche la casella e Integra di F6). Non l'ho aggiunto solo per i nuovi controlli, per non avere due comportamenti: lo fa chi scrive le anomalie, tutto insieme.
3. **Eventi mancanti dal catalogo**: scarto, recupero ed eliminazione di uno scartato usano `documento/update` (`stato`, `eliminato: true`) perché §15.2.4 non ha un codice; la pulizia automatica non scrive eventi (manutenzione). Tutto in D-74.
4. **`avviato_da` del giro della casella**: *Controlla adesso* passa l'utente ai quattro controlli, ma il giro vero della casella passa da `CasellaService.esegui()`, che non accetta un autore: la sua riga resta `avviato_da = NULL`. Per correggerlo serve una modifica a `casella.ts` (fuori dai file di questa attività).
5. **Orologio dei controlli**: il timer parte un minuto dopo l'avvio e ripete ogni 5 minuti; `ultimo` sta in memoria, quindi un riavvio fa subito un controllo (come per la sincronizzazione da Integra).
6. **Prova `documenti-lettura.spec.ts`**: una sua attesa era rimasta quella di prima della 8.51 (totale del bollettino = imponibile); l'ho portata al contratto nuovo (provvigione), altrimenti `npm test` restava rosso per un errore non di questo lavoro.
7. **Ambiente di sviluppo**: durante il lavoro il backend di sviluppo è stato riavviato più volte (anche da fuori): le righe dei controlli con `esito` vuoto rimaste da un processo interrotto si possono ignorare, oppure si tolgono da `/registro`. In sviluppo solo il *Server di lettura* è configurato davvero: ogni 5 minuti parte una chiamata di prova a LlamaCloud (1 progetto), come già facevano le prove di connessione; casella, posta e Integra hanno le password del seed (`true`, non cifrate) e risultano «Non configurate».
8. **`provvigioni.scartati` è minimo operatore, `provvigioni.elimina` minimo responsabile**: l'eliminazione chiede *entrambi* e il ruolo di Sistema amministratore (o superutente). Un responsabile d'area non amministratore riceve 403, come da §7.16; se in futuro l'eliminazione deve bastare al responsabile, si toglie il controllo sul ruolo.

## Controlli fatti

Rilettura del diff con attenzione a SQL e permessi (non ho caricato le skill di revisione: il lavoro non tocca migrazioni né soldi):
- **SQL**: tutti i valori sono parametri (`Prisma.sql`); colonne e ordinamenti vengono da elenchi chiusi validati (`IsIn`), il testo di ricerca è escapato (`%` e `_` sono lettere) e non finisce mai come identificatore; pagine e limiti sono interi validati.
- **Permessi**: ogni rotta dichiara `@Richiede`; l'eliminazione definitiva richiede anche il ruolo di Sistema; il contatore e la pagina usano `sistema.stato` (amministratore o operatore in un'area); nessun permesso è calcolato nel browser.
- **File**: si elimina solo un percorso letto dal database e verificato dentro `DOCUMENTI_DIR`, dopo il commit.
- **Segreti**: le configurazioni servono solo per stato e indirizzo; nessuna password o chiave esce dalle API, va nel registro o nei testi delle anomalie.
- **Transazioni** (V13): recupero ed eliminazione con la riga bloccata (`FOR UPDATE`), evento nella stessa transazione; la pulizia elimina le righe in una transazione e i file dopo.
- **Prove**: le chiamate di rete sono iniettabili e con tempo massimo; nei test i servizi sono spenti, quindi nessuna rete.

