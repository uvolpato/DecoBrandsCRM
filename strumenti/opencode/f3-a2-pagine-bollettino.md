# Prompt per OpenCode: F3-A2, pagine del dettaglio del bollettino ("a cerniera")

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da Sonnet: usa il modello
caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nextjs-app-router-patterns`, `ui-ux-pro-max`,
`webapp-testing` e `playwright-best-practices`. Prima di cercare nei file usa
`graphify query "<domanda>"`.

## Compito

Il server di F3-A2 è già fatto e provato (commit d14e8c7):
- codice in `app/backend/src/bollettino.ts`;
- prove in `test/bollettino.spec.ts`, che sono la fonte di verità delle rotte.

**Non toccare il server.** Tu fai la pagina `/bollettini/[id]`, che oggi è un segnaposto, come la
pagina *Bollettino* del prototipo (`prototipo-alternativo/assets/viste-periodo.js`). Deve contenere:
- **la cerniera**: a sinistra le righe del fornitore, a destra il nostro calcolo, la differenza sulla
  cucitura;
- **i gruppi** *Da decidere*, *Decise*, *Quadrano*, *Incassi*;
- **le decisioni** su righe e documenti mancanti;
- **l'abbinamento manuale** di una riga a un documento;
- **la chiusura** (*Verifica* o *Contesta*);
- **l'azione proposta** in alto e i totali;
- **il PDF del bollettino** affiancato, se c'è.

Da leggere:
- la spec `specifica-crm-provvigioni.md`: §4.2.10, §4.2.10.1, §6.2, §7.7, §8.1, §15.2.5, §16.4;
- nel §19: D-16, D-49, D-51, **D-56**. Per D-56: le decisioni sui documenti mancanti stanno in una
  tabella a parte, e anche *contestato* congela gli importi e chiude il mese.

## Rotte, già pronte

- `GET /api/bollettini/:id` (`provvigioni.consulta`) restituisce
  `{id, fornitore_id, fornitore, maturazione, mese, anno, stato, badge, ricevuto, chiuso_il, chiuso_da, note, file, modificabile, righe, totali, azione}`.
  - `badge`: `da_verificare` | `pronto` | `verificato` | `contestato`.
  - `file`: `{arrivo_id, nome}` oppure `null`. Il PDF si apre con `GET /api/documenti/<arrivo_id>/file`.
  - `righe[]` contiene
    `{id|null, documento_id?, numero, data, tipo, pratica_id, cliente_id, cliente, categoria, gruppo, loro?, noi?, differenza, aperta, incasso, pagamento, giorni, pagata_in?, decisione?, scelte}`.
    - `gruppo`: `da_decidere` | `decise` | `quadrano` | `incassi`.
    - `loro` e `noi` hanno la forma `{imponibile, pct, importo}`.
    - `decisione` ha la forma `{esito, motivo, da, da_nome, il}`.
    - `scelte` elenca le decisioni ammesse per quella riga.
    - I documenti **mancanti** hanno `id: null` e `documento_id`.
  - `totali`: `{riconosciuto, calcolato, differenza, aperte, contestate}`.
  - `azione`: `{tipo: decidi|contesta|verifica|chiuso, testo}`.
- `PUT /api/bollettini/:id/righe/:rid/decisione` con `{decisione: accettato|contestato|null, motivo?}`.
  È per le righe del fornitore.
- `PUT /api/bollettini/:id/documenti/:did/decisione` con
  `{decisione: attendere|contestato|null, motivo?}`. È per i mancanti.
- `PUT /api/bollettini/:id/righe/:rid/documento` con `{documento_id}`. Serve all'abbinamento.
- `PUT /api/bollettini/:id/stato` con `{stato: verificato|contestato, note?}`. Serve alla chiusura.

Le scritture vogliono `provvigioni.modifica` e rispondono come il GET.

| Codice | Quando |
|---|---|
| 400 | motivo mancante per *contestato*, oppure una scelta non ammessa |
| 409 | bollettino chiuso, riga che quadra, documento già su un'altra riga, chiusura con righe aperte |

Mostra i messaggi del server nella finestra così come arrivano.

## Pagina

- **Componenti**: usa quelli che ci sono già (`Pagina`, `Pannello`, `Schede`, `DataTable`, `Kpi`,
  `FormModal`/`Modale`, `CampoRicerca`). La cerniera c'è nel prototipo: se nell'app non esiste,
  creala come **componente parametrico**, mettila nel catalogo `/componenti` e nella spec §16.4.
- **Contestato**: la finestra chiede il motivo, che è obbligatorio.
- **Abbinamento**: si sceglie il documento con un campo di ricerca sui documenti dello stesso
  fornitore. Se serve un'entità nuova in `lib/entita.ts`, aggiungila.
- **Chiusura**:
  - è attiva solo quando `azione.tipo` è `verifica` o `contesta`;
  - chiede conferma con un testo chiaro: "il mese diventa chiuso: le percentuali e i documenti di quel
    mese non si cambiano più";
  - dopo la chiusura la pagina è in sola lettura (`modificabile: false`).
- **Permessi**: chi non ha `provvigioni.modifica` non vede i pulsanti di scrittura.
- **Navigazione**: tornando alla matrice si torna nello stesso punto (§7.12). Un clic su un cliente o
  su una pratica porta alla pratica.
- **Matrice** (dubbio 1 del resoconto di F3-A1): **non** aggiungere ora il conteggio delle righe
  aperte. Scrivilo nei dubbi se ti serve.

## Documenti

- **Spec**: §7.7 se l'app è diversa dal prototipo, e la versione in testa.
- **Guida**: in `prototipo-alternativo/assets/guida.js`, pagina Bollettino. Descrivi i pulsanti, le
  finestre e queste regole:
  - "contestato vuole il motivo";
  - "chiuso = mese chiuso";
  - "*Attendi il prossimo* vale finché il documento manca".
- Poi lancia `python strumenti/genera-pagine-doc.py`.

## Regole

- Tutto sul backend (V12): il browser mostra e manda solo le scelte.
- Italiano semplice. Codice minimo (ponytail). I due `stile.css` (app e prototipo) restano identici.
- **Non chiudere processi node che non hai avviato tu.** Ugo ha i server di sviluppo su 8001/8002. Le
  tue porte sono 8011/8012; se sono occupate, scegline altre e scrivilo.
- Per il browser usa il database `decobrands_test_f3a1`. Applica prima le migrazioni nuove con
  `prisma migrate deploy` e `DATABASE_URL` puntato a quel database, poi `npm run db:seed` se è vuoto.
  Non usare `decobrands_test` né `decobrands_db`.
- Niente commit, niente push, niente `.env`. `DOCUMENTI_DIR` per il browser va su una cartella
  temporanea, nell'ambiente del processo.

## Prove

1. In `app/frontend`: `npx tsc --noEmit` e `npm run build`.
2. Avvia:
   - il backend su 8012, con `decobrands_test_f3a1`, `TENTATIVI=1000` e `TENTATIVI_IP=1000`;
   - il frontend su 8011, con `BACKEND_URL`.

   Gli utenti sono `f3-ammi`, `f3-oper` e `f3-lett`, password `password-di-prova`.

   Scrivi `strumenti/prove/app_bollettino.py`, che controlla:
   - cerniera e gruppi, con i numeri del seed uguali al prototipo;
   - totali e azione;
   - decisione *accettato* su una riga con differenza;
   - *contestato* senza motivo: errore visibile; con motivo: riga decisa;
   - documento mancante: *Attendi il prossimo*, poi annullamento;
   - abbinamento manuale; un doppione dà un errore visibile;
   - chiusura con righe aperte: errore visibile; poi tutte decise, *Verifica*, pagina in sola lettura;
   - la sola lettura (`f3-lett`) senza pulsanti;
   - il PDF che si vede, se c'è;
   - il ritorno alla matrice nello stesso punto;
   - nessun errore JavaScript.

   La prova chiude un bollettino del seed: per lasciare tutto com'era, rilancia il seed alla fine,
   oppure usa un bollettino creato dalla prova.

   Rilancia anche `app_bollettini.py` e `app_componenti.py`. Tutto con 0 KO.
3. Fai le schermate a 1440 e 768 px in `%TEMP%\f3-a2` e **guardale**.
4. Chiudi solo i **tuoi** processi.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f3-a2-pagine.md` con:
- i file toccati;
- l'esito delle prove (numeri e KO);
- le schermate;
- i dubbi.
