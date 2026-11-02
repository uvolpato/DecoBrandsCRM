# Prompt per OpenCode: F1-A5, pagine (percentuali datate ed eccezioni personali)

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da Sonnet: una sola
sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nextjs-app-router-patterns`, `ui-ux-pro-max`,
`webapp-testing` e `playwright-best-practices`. Usa `graphify query "<domanda>"` prima di cercare
nei file.

## Compito

Il server di F1-A5 è già fatto e provato (`app/backend/src/fornitori.ts`: `FornitoriController` e
`EccezioniController`; le prove sono in `test/percentuali.spec.ts`). **Non toccare il server.** Tu
fai le pagine, la guida e la spec.

Replica dal prototipo `prototipo-alternativo/assets/viste-anagrafiche.js`:

1. **Fornitore → scheda *Percentuali*** (in `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`):
   - elenco delle versioni da `GET /api/fornitori/:id/percentuali`: la versione in vigore in evidenza,
     le future e le passate sotto;
   - per ogni scaglione: sconto, % agente, % subagente, totale dal fornitore, numero di clienti,
     eccezioni;
   - pulsante **Nuove percentuali** (solo con il permesso `dati.condizioni`), che apre la finestra
     come `nuovePercentuali` (riga ~96):
     - data `valido_dal`;
     - righe precompilate dalla versione più recente;
     - si possono aggiungere soglie, ma non toglierle;
     - invio con `POST /api/fornitori/:id/percentuali`.
   - Gli errori 400 del server si mostrano nella finestra, con il testo del server.
2. **Subagente → sezione *Eccezioni personali*** (in `subagenti/VistaSubagenti.tsx`), come
   `modificaEccezione` (righe ~164–172):
   - elenco da `GET /api/eccezioni?subagente_id=N`: fornitore, sconto, "X % invece di Y %", data
     delle percentuali;
   - **Aggiungi** (solo con `dati.condizioni`) apre una finestra con fornitore (campo di ricerca,
     entità `fornitore`), sconto (gli `scaglioni` della versione con `in_vigore: true`) e % personale;
     invio con `POST /api/eccezioni`;
   - un clic su una riga apre **Modifica** (`PUT /api/eccezioni/:id`, solo `pct_personale`) ed
     **Elimina** (`DELETE`, con conferma);
   - il messaggio 409 si mostra così com'è.
3. Riusa i componenti che ci sono già (`Pannello`, `DataTable`, `Modale`/FormModal, `CampoRicerca`,
   `Kpi`…) e le classi di `stile.css`. Niente componenti nuovi, salvo che servano davvero: in quel
   caso vanno nel catalogo `/componenti`.

## ⚠ Aggiornamento D-51 (vale sopra a tutto il resto)

Le eccezioni non sono più legate a una versione: sono **subagente + fornitore + sconto + periodo**
(`valido_dal` compreso, `valido_al` escluso, `null` = senza fine) e non si copiano. Regola unica:
un cambio vale da una data in poi e la data deve venire **dopo l'ultima chiusura** del fornitore
(bollettino verificato o contestato, trimestre liquidato). Leggi D-51 in §19 e §4.2.3 della spec,
e le prove `app/backend/test/percentuali.spec.ts`: sono la fonte di verità delle rotte.

Cosa cambia nelle pagine:
- **Percentuali**: ogni versione dopo l'ultima chiusura ha *Correggi* (`PUT
  /api/fornitori/:id/percentuali/:valido_dal`, corpo `{ scaglioni }`) ed *Elimina* (`DELETE`, con
  conferma); quelle nel periodo chiuso sono in sola lettura. *Nuove percentuali* accetta qualsiasi
  data dopo l'ultima chiusura, anche fra due versioni. Mostra i 400/409 del server nella finestra.
- **Eccezioni** del subagente: elenco con periodo ("dal … al …" o "dal …"), "X % invece di Y %" e
  il campo `modificabile`:
  - *Aggiungi*: fornitore, sconto, % personale, **dal** (`POST /api/eccezioni` con `valido_dal`);
  - *Cambia la %* da una data (`POST /api/eccezioni/:id/cambia { pct_personale, dal }`): chiude la
    riga e ne apre una nuova;
  - *Termina* (`POST /api/eccezioni/:id/termina { al }`, `al` = primo giorno in cui non vale più);
  - *Modifica* (`PUT /api/eccezioni/:id { pct_personale, valido_dal? }`) ed *Elimina* (`DELETE`)
    solo se `modificabile`;
  - non serve più la scelta sullo "storico delle copie": mostra tutte le righe, la più recente in
    alto, quelle finite in grigio.
- Lo sconto proposto nella finestra viene dalle soglie della versione valida alla data scelta.

Le forme qui sotto erano della prima versione: dove non coincidono con quelle nuove, valgono le
prove del server.

## Forma delle risposte del server (prima versione)

Gli id sono stringhe, le percentuali numeri, le date `aaaa-mm-gg`.

```
GET  /api/fornitori/:id/percentuali   (dati.consulta)
  → { in_vigore: 'aaaa-mm-gg' | null,
      versioni: [ { valido_dal, in_vigore: bool,
        scaglioni: [ { id, sconto_min, pct_agente, pct_subagente, valido_dal, dal_fornitore, clienti,
                       eccezioni: [ { id, subagente_id, subagente, pct_personale } ] } ] } ] }
    (versioni dalla più recente, scaglioni per sconto crescente)
POST /api/fornitori/:id/percentuali   (dati.condizioni)
  { valido_dal, scaglioni: [{ sconto_min, pct_agente, pct_subagente }] } → 201, stessa forma del GET
  400: data non valida, data ≤ ultima versione, soglia della versione precedente mancante,
       % fuori 0–100 o con più di 2 decimali, sconto ripetuto

GET    /api/eccezioni?subagente_id=N   (dati.consulta)
  → [ { id, subagente_id, subagente, scaglione_id, fornitore_id, fornitore, sconto_min, valido_dal,
        pct_personale, pct_standard } ]   (una riga per versione)
POST   /api/eccezioni { subagente_id, fornitore_id, sconto_min, pct_personale } → 201 (dati.condizioni)
       400 sconto non in vigore · 404 · 409 "Il subagente ha già un'eccezione su questo scaglione: modificala"
PUT    /api/eccezioni/:id { pct_personale } → 200
DELETE /api/eccezioni/:id → 204
```

Le eccezioni compaiono una volta per ogni versione (ogni nuova versione le copia). Nella scheda del
subagente mostra solo quelle della versione in vigore oggi; le altre vanno in una riga *Storico* o
restano nascoste. Spiega nel resoconto quale scelta hai fatto.

## Documenti (CLAUDE.md §4, punto 3)

- **Spec** `specifica-crm-provvigioni.md`:
  - §7.4 e §7.5: le rotte qui sopra;
  - "la nuova data viene dopo l'ultima versione; la nuova versione contiene tutte le soglie della
    precedente (si aggiungono, non si tolgono)", con la riga *Perché*: il motore sceglie la versione
    per soglia, quindi una soglia omessa resterebbe in vigore con la versione vecchia;
  - §7.5: il permesso delle eccezioni è `dati.condizioni` e non più "anagrafiche";
  - §15.2.2: l'`entita_id` dell'evento `scaglione` è l'id del fornitore;
  - alza la versione in testa.
- **Guida** `prototipo-alternativo/assets/guida.js`:
  - finestra *Nuove percentuali*: "la data deve venire dopo l'ultima versione";
  - scheda del subagente: "l'eccezione vale sulle percentuali in vigore oggi e passa da sola alle
    versioni nuove".
- Poi lancia `python3 strumenti/genera-pagine-doc.py`.

## Prove

1. `npx tsc --noEmit` e `npm run build` in `app/frontend`.
2. Avvio (non usare le porte 8001/8002 né il database `decobrands_db`):
   - backend: in `app/backend` lancia `npm run build`, poi `node dist/src/main.js` con:
     - `DATABASE_URL` uguale a quella del `.env`, ma con `decobrands_db` → `decobrands_test_f1a1`;
     - `PORT=8012`;
     - `TENTATIVI_IP=1000` e `TENTATIVI=1000`;
   - frontend: con `BACKEND_URL=http://127.0.0.1:8012` lancia `npm run build`, poi
     `node node_modules/next/dist/bin/next start -p 8011 -H 127.0.0.1`;
   - utenti `f1-ammi` (amministratore) e un operatore, entrambi con password `password-di-prova`
     (`strumenti/prove/utenti_prova.js`).
3. Aggiungi i controlli a `strumenti/prove/app_fornitori.py` e `app_subagenti.py`:
   - versioni mostrate;
   - nuova versione salvata e mostrata come futura;
   - errore "data ≤ ultima" visibile nella finestra;
   - eccezione: aggiunta, 409 visibile, modifica, eliminazione;
   - l'operatore non vede i pulsanti.

   Le schede si cercano con `.schede-barra [role=tab]`. Chiudi con 0 KO, e le prove che c'erano già
   restano verdi.
4. Schermate a 1440 e 768 px della scheda *Percentuali*, della finestra *Nuove percentuali* e delle
   *Eccezioni* del subagente, in `%TEMP%\f1-a5`: **guardale**.
5. Chiudi i processi sulle porte 8011 e 8012.

Niente commit, niente push, niente `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a5-pagine.md`:
- i file toccati;
- l'esito delle prove (OK/KO, con i numeri);
- il percorso delle schermate;
- la scelta sullo storico delle eccezioni;
- i dubbi.
