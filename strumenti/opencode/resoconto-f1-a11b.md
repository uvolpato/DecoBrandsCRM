# F1-A11b — Clienti e Fornitori con «Cerca in Integra» (D-111) — resoconto

Lavoro di DeepSeek Flash (`deepseek/deepseek-flash`), 11/11/2026. Nessun commit, nessun push,
nessun comando git. Backend non toccato: le due rotte di F1-A11 sono usate così come sono.

## Cosa è stato consegnato

Nelle liste **Clienti** e **Fornitori**, sotto il campo di ricerca, c'è un pulsante discreto
**Cerca in Integra**. Apre una finestra (`Modale`) con un campo e **Cerca**: la ricerca parte
**solo al clic** (mai mentre si digita, il ponte è lento). I risultati arrivano dal server
(`GET /api/integra/cerca`, massimo 10 righe, esclusi i soggetti già in anagrafica) con ragione
sociale, codice e P.IVA; **Importa** chiama `POST /api/integra/importa`, chiude la finestra,
ricarica l'elenco e mostra il nuovo soggetto. Il componente sta in uno solo posto
(`componenti/CercaInIntegra.tsx`) ed è usato dalle due liste.

## File toccati

| File | Cosa |
|---|---|
| `app/frontend/componenti/CercaInIntegra.tsx` | **nuovo**: pulsante + finestra + ricerca/import (un solo posto per le due liste) |
| `app/frontend/app/(app)/clienti/VistaClienti.tsx` | import e `<CercaInIntegra tipo="cliente" onImportato={carica} />` sotto i filtri |
| `app/frontend/app/(app)/fornitori/VistaFornitori.tsx` | import e `<CercaInIntegra tipo="fornitore" onImportato={carica} />` sotto i filtri |
| `app/frontend/app/(app)/componenti/page.tsx` | voce `CercaInIntegra` nel catalogo, con la firma (demo null, come FormAgenzia) |
| `app/frontend/lib/guida.ts` | *Clienti* e *Fornitori*: pulsante, finestra e frase sul perché l'elenco è corto |
| `strumenti/prove/app_clienti.py` | percorso Cerca in Integra (ponte lento, vuoto, import, permessi, 768 px); attesa robusta della scheda dopo il clic |
| `strumenti/prove/app_fornitori.py` | percorso Cerca in Integra (vuoto, import, permessi, 768 px) |
| `strumenti/prove/integra_prova.js` | **nuovo** aiuto di prova: riga nel ponte finto (`ponte-aggiungi`/`ponte-togli`) e pulizia dell'import nel database di prova (`pulisci`, solo `decobrands_test`) |

Non toccati: `FormAgenzia.tsx`, il dettaglio del fornitore, backend, spec, piano,
`avanzamento-app.md`, prototipo.

## API

- Usate, non modificate: `GET /api/integra/cerca?tipo=cliente|fornitore&q=…` (→ `{righe, ms}` o
  `{errore:'ponte lento'}`) e `POST /api/integra/importa` (→ `{creato, …}` o `{gia_presente, id}`).
- Dal browser partono solo `tipo`, il testo cercato e `id_integra`; il riconoscimento, il limite
  di 10, l'esclusione degli importati, i permessi (`dati.importa`) e il timeout di 3 s restano sul
  server (V12, D-28). Nessuna nuova rotta.

## Come si comporta ogni caso

- **Apertura**: pulsante secondario piccolo con la lente, sotto la barra dei filtri; il fuoco va al
  campo (lo mette `Modale`). Esc, velo o *Chiudi* chiudono; mentre la ricerca o l'import sono in
  corso la finestra non si chiude.
- **Solo al clic**: nessun `useEffect` e nessun `onChange` che chiama il server; Invio nel campo e
  *Cerca* fanno la stessa cosa, una richiesta alla volta (guardia su `attesa`). Campo vuoto: *Cerca*
  spento.
- **Risultati**: fino a 10 righe, ognuna con ragione sociale, `codice · P.IVA` (e «non attivo» se
  serve), pulsante *Importa*. Lista semplice `Elenco`, non una DataTable (10 righe, niente
  paginazione).
- **Nessuna corrispondenza**: «Nessuna corrispondenza in Integra: registralo a mano.» — nessun
  doppione creato.
- **Import**: `Importa` → finestra chiusa, `avviso` con il nome, elenco ricaricato; filtri e
  ordinamento restano perché si ricaricano solo i dati (lo stato dei filtri non si tocca). Se il
  server risponde `gia_presente` l'elenco si ricarica lo stesso e l'avviso dice «Era già in
  anagrafica». Errore del server: messaggio nella finestra, che resta aperta.
- **Ponte lento**: quando il server risponde `{errore:'ponte lento'}` (oltre 3 s) la finestra dice
  «Il ponte di Integra non risponde, riprova.» Non c'è attesa infinita lato server; vedi *Dubbi*.
- **Permessi**: senza `dati.importa` il pulsante è spento e il titolo dice «Serve il livello
  operatore in Dati» (stesso schema di *Configura gli scaglioni*). Il server ricontrolla: 403.
- **768 px**: la finestra sta nella pagina, nessuno scorrimento orizzontale; la lista resta a una
  colonna con la scheda sotto (come già era).

## Prove (database `decobrands_test`, ponte finto `decobrands_ponte_prova`)

Comandi del giro: backend `dist` su 8012 con `DATABASE_URL` di prova, `PONTE_URL` del ponte finto,
`NODE_ENV=development`, `TENTATIVI=1000`; frontend `next dev -p 8011` con
`BACKEND_URL=http://127.0.0.1:8012`; seed §12 ricaricato con `test/svuota.ts` + `prisma/seed` e
`utenti_prova.js crea f1b`.

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (frontend) | pulito |
| `app_clienti.py` | **42 controlli, 0 KO** |
| `app_fornitori.py` | **34 controlli, 0 KO** |
| `app_componenti.py` (catalogo toccato) | **54 OK, 0 KO** |
| `app_guida.py` (guida toccata) | **26 controlli, 0 KO** |

Controlli nuovi del percorso, senza contare quelli già esistenti:

- Clienti (8 nuovi): finestra con il campo e nessuna ricerca automatica; ponte lento; nessuna
  corrispondenza; riga con codice/P.IVA/Importa; import con elenco 13 → 14; 768 px (pagina e
  finestra); operatore con pulsante attivo; lettura con pulsante spento e motivo.
- Fornitori (6 nuovi): finestra senza ricerca automatica; nessuna corrispondenza; riga con
  codice/P.IVA/Importa; import con elenco 12 → 13; 768 px; operatore/lettura.

Note del giro:

- `app_componenti.py` vuole un superutente `<s>-super` con `password-di-prova`, che
  `utenti_prova.js` non crea: l'ho creato per la prova e tolto con `utenti_prova.js togli`.
- I residui di prova sono stati tolti: nessun codice `C99001`/`F99001` in `codici_esterni` né nel
  ponte, nessun utente `@prova-e2e.it`.
- 8011/8012 sono stati spenti a fine lavoro; 8001/8002 mai toccati.

**Numeri sul seed** (confronto col prototipo):

| | Prototipo (`dati.js`) | App, seed §12 | Dopo l'import |
|---|---|---|---|
| Clienti | 11 | **13** (11 + MCL e Consorzio Agrario, D-101); 9 con agenzie, 4 senza | 14 |
| Fornitori | 11 | **12** (11 + MCL) | 13 |

Nessun numero di calcolo cambia: la slice aggiunge due pulsanti e una finestra.

## Schermate (`%TEMP%\f1-a11b`, guardate)

- `app-clienti-cerca-integra-1440.png` — finestra con la riga di prova e *Importa*.
- `app-clienti-cerca-integra-768.png` — finestra a tablet, nessuno scorrimento orizzontale.
- `app-clienti-1440.png` — pulsante sotto i filtri, lista e scheda invariate.
- `app-clienti-importato-1440.png` — riga importata nell'elenco.
- `app-fornitori-cerca-integra-1440.png`, `app-fornitori-cerca-integra-768.png`,
  `app-fornitori-importato-1440.png`, `app-fornitori-768.png`.

## Controlli caricati

`ponytail-review` (caricata davvero). Rilievi applicati, entrambi piccoli:

1. **Doppia richiesta**: Invio nel campo mentre una ricerca è in corso poteva lanciarne una seconda
   (il pulsante era spento, il submit no). Aggiunta la guardia `if (attesa) return` in `cerca()`.
2. **Piede ridondante**: la finestra ripeteva il piede predefinito di `Modale` (*Chiudi*); tolto.

Nessun rilievo di sicurezza: il testo va in `encodeURIComponent`, il `tipo` è una costante del
componente, i nomi delle righe sono resi da React (niente HTML), i permessi sono doppi (pulsante e
server).

## Dubbi e punti aperti

1. **Timeout del ponte**: i 3 s sono del server (`Promise.race` in `anagrafica-integra.ts`). Il
   frontend mostra il messaggio quando arriva `{errore:'ponte lento'}`; non ha un timer proprio,
   quindi se è il *backend* a non rispondere (non il ponte) `fetch` aspetta come per ogni altra
   chiamata. Non ho aggiunto un `AbortController` perché `api()` è condiviso: se serve, è una
   modifica a `lib/api.ts`, fuori da questa slice.
2. **Testo del brief**: il brief scrive «Nesuna corrispondenza»; ho usato **«Nessuna»** (italiano
   corretto). Se era voluto, si cambia in un punto solo.
3. **Prova di clienti resa robusta**: su un server di sviluppo freddo il clic su una riga poteva
   arrivare alla scheda prima del dettaglio; il form dell'agenzia finiva sul cliente precedente e
   il server rispondeva «Periodo sovrapposto». Il comportamento dell'app era giusto: ho sostituito
   l'attesa fissa di 500 ms con l'attesa di `tr.selezionata` (la riga si evidenzia solo quando la
   scheda è quella cliccata). Vale per tutte le esecuzioni, non solo per questa slice.
4. **Prove con dipendenze d'ambiente**: `app_clienti.py` e `app_fornitori.py` ora hanno bisogno di
   `DATABASE_URL` (di prova) e `PONTE_URL` nel processo che lancia Python, come il backend.
   Documentato in testa ai due file e da mettere in `app/README.md` (riga sotto).
5. **Voce di catalogo senza esempio dal vivo**: `demo: null` (come `FormAgenzia`): l'esempio
   chiamerebbe Integra e i permessi. La firma c'è.

## Righe per spec / piano / avanzamento / README (NON applicate)

- **spec §4.7.1**, in coda all'elenco: «F1-A11b (11/11/2026): le liste *Clienti* e *Fornitori*
  mostrano solo chi è in anagrafica e hanno il pulsante *Cerca in Integra* (finestra con campo e
  *Cerca*; la ricerca parte solo al clic). Massimo 10 righe, *Importa* per riga, elenco ricaricato
  dopo l'import; senza `dati.importa` il pulsante è spento con il motivo; oltre 3 s «Il ponte di
  Integra non risponde, riprova».»
- **spec §7.9 / §7.10** (Fornitori, Clienti): una riga *Perché*: «L'elenco è corto per scelta
  (D-111): i soggetti entrano quando un documento o un legame li tocca; chi manca si cerca in
  Integra dal pulsante e si importa.»
- **spec §16.4**: componente `<CercaInIntegra tipo={cliente|fornitore} onImportato={() => ricarica
  l'elenco} />` — pulsante in testa all'elenco e finestra di ricerca/import; spento senza
  `dati.importa`, messaggio per ponte lento e per nessuna corrispondenza.
- **piano-lavoro F1-A11b**: «consegnata; ore a consuntivo — da approvare se fuori preventivo».
- **avanzamento-app.md**: «F1-A11b completata: *Cerca in Integra* nelle liste Clienti e Fornitori,
  import su richiesta con ricarica dell'elenco e permesso `dati.importa`; prove browser verdi
  (clienti 42, fornitori 34).»
- **app/README.md**, sezione delle prove: «`app_clienti.py` e `app_fornitori.py` hanno bisogno anche
  di `DATABASE_URL` (di prova) e `PONTE_URL` (ponte finto) nel processo, perché aggiungono una riga
  al ponte con `strumenti/prove/integra_prova.js`.»
