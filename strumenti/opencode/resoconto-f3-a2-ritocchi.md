# Resoconto F3-A2b — ritocchi al dettaglio del bollettino

## File toccati

**Server**
- `app/backend/src/documenti.ts`: rotta `GET /api/documenti/cerca` e classe `CercaDocumenti` (parametri,
  limite, ricerca con `ILIKE` e `%`/`_`/`\` neutralizzati come in `pratiche.ts`). `su_riga` vale sia per
  un documento abbinato per id sia per una riga **non ancora abbinata** con lo stesso numero (la stessa
  regola con cui `abbina` risponde 409).
- `app/backend/src/bollettino.ts`: rotta `GET /api/bollettini/:id/contestazione` e i formati
  `numeroIt`/`euroIt`/`pctIt`/`dataIt`. Il testo lo compone il server (V12); il totale compare solo se
  almeno una riga contestata ha una differenza (un documento sconosciuto non ne ha).

**Pagine**
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`: *Mancano N righe da decidere* + *Vai
  alla prima* accanto alla chiusura; abbinamento con l'entità nuova; *Prepara la contestazione* con
  oggetto e testo modificabili, *Copia* (con ripiego `execCommand`) e *Scarica .txt*.
- `app/frontend/lib/entita.ts`: `documentoFornitore` al posto di `documentoMese` (legge la rotta, 50
  voci, avviso `già sul bollettino M/AAAA`, colonna *Bollettino*).
- `app/frontend/componenti/Flussi.tsx`: `data-gruppo` sui gruppi della cerniera (serve a *Vai alla
  prima*) e `data-etichetta` sui due lati (etichetta sul tablet).
- `app/frontend/app/stile/stile.css` e `prototipo-alternativo/assets/stile.css`: identici (hash uguale);
  sotto gli 860 px la cerniera si impila, le intestazioni spariscono, ogni valore porta la sua etichetta
  e i pulsanti vanno a tutta larghezza; `.c-riga.evidenzia` per l'evidenziazione di un attimo.
- `prototipo-alternativo/assets/componenti.js`: `data-etichetta` anche nel `CRM.Cerniera` del prototipo
  (così le etichette compaiono anche lì).

**Prove e documenti**
- `app/backend/test/documenti.spec.ts`: 6 prove della ricerca (fornitore, numero e cliente, `%`/`_`,
  ordine con il mese prima, `su_riga` per id e per numero, 403).
- `app/backend/test/bollettino.spec.ts`: 3 prove della contestazione (testo con numeri, date, due lati,
  differenza, motivo e totale; righe accettate assenti; 409; 403).
- `strumenti/prove/app_bollettino.py`: 42 controlli (erano 26).
- `specifica-crm-provvigioni.md`: versione **8.22**, §7.7 (i quattro ritocchi con i *Perché*), §8.1 (le
  due rotte), §16.4 (riga *Cerniera*), §19 **D-58**. 8.21 e D-57 restano di F4-A1 (erano già nel file
  non committato).
- `prototipo-alternativo/assets/guida.js`, `assets/viste-componenti.js`, `LEGGIMI.md`.
- `prototipo-crm/specifica.html` rigenerato con `python strumenti/genera-pagine-doc.py`.

## Forma delle due rotte

`GET /api/documenti/cerca?fornitore_id=&q=&mese=AAAA-MM&limite=` (`provvigioni.consulta`)

```
[{ id, numero, data, tipo, cliente, pratica_id, pratica, importo,
   su_riga: { bollettino_id, mese, anno } | null }]
```

`fornitore_id` obbligatorio (int ≥ 1), `q` ≤ 100 caratteri, `mese` `AAAA-MM`, `limite` 1–50 (20 se
assente). Ordine: prima i documenti del mese passato (`mese`), poi gli altri dal più recente.

`GET /api/bollettini/:id/contestazione` (`provvigioni.consulta`)

```
{ oggetto: "Contestazione bollettino provvigioni luglio 2026 · Gries GmbH & Co. KG",
  testo: "Gentili colleghi di …\n\n…\n\n- F-2026-0912 (Cliente) del 28/07/2026: voi riconoscete
          1.144,50 € (17,5 %), noi calcoliamo 1.177,20 € (18 %). Differenza -32,70 €.
          Motivo: ….\n\nTotale della differenza contestata: -32,70 €.\n\n…" }
```

404 bollettino inesistente, 409 `Nessuna riga contestata`, 403 senza l'area Provvigioni.

## Prove

- **Server**, `DATABASE_URL_TEST` su `decobrands_test_f3a1`:
  - `npx tsc --noEmit` in `app/backend`: OK;
  - `npx jest --runInBand test/documenti.spec.ts test/bollettino.spec.ts`: **48/48 OK**;
  - tutte le prove, lanciate in due gruppi (18 suite in un colpo solo usciva senza output e con codice 1,
    probabilmente memoria/console della macchina): **147 + 126 = 273 prove, 0 KO**.
- **Frontend**: `npx tsc --noEmit` resta con i due errori noti di `.next/dev` (tipi rimasti dal server di
  sviluppo acceso sulla 8001, percorso `/bollettini` assente dalla sua build); `next build --webpack` su
  una copia isolata con `node_modules` in junction: **OK** (TypeScript compreso).
- **Browser** (backend su 8032 con `decobrands_test_f3a1`, `TENTATIVI=1000`, `DOCUMENTI_DIR` in temp;
  frontend `next start` su 8031 dalla copia):
  - `app_bollettino.py f3`: **42 controlli, 0 KO**. Coprono: *Vai alla prima* (riga a schermo e in
    evidenza), elenco dei documenti dal server anche di altri mesi, avviso `già sul bollettino 7/2026`
    e 409 già usato, contestazione con motivo → *Prepara la contestazione* con numeri, date, differenza,
    motivo, oggetto, *Copia* (avviso) e *Scarica .txt* (nome e contenuto), annullamento e accettazione,
    abbinamento a un documento di settembre e ritorno, 768 px impilato senza scorrimento di lato con i
    pulsanti dentro la cerniera, chiusura, PDF affiancato, sola lettura, nessun errore JavaScript.
  - `app_bollettini.py f3`: **22 controlli, 0 KO** (rilanciato dopo aver rimesso il seed: la prova del
    bollettino crea il bollettino Ing's di settembre che `app_bollettini.py` si aspetta assente).
  - `app_componenti.py f3`: **54 controlli, 0 KO**.
- **Controlli prima della consegna**: rilettura del diff. SQL sempre parametrizzato (unica struttura
  interpolata è statica), `limite` validato, `%`/`_`/`\` neutralizzati, permessi `provvigioni.consulta`,
  nessun valore calcolato preso dal browser. Nessun rilievo. Non ho caricato le skill
  `owasp-security`/`ponytail-review`: il prompt chiedeva una sessione sola su Sonnet e nessun commit.

## Schermate (guardate)

`%TEMP%\f3a2b`:
- `app-bollettino-1440.png` (barra con *Manca 1 riga da decidere* e *Vai alla prima*);
- `app-bollettino-cerniera-768.png` (cerniera impilata con le etichette e i pulsanti a tutta larghezza);
- `app-bollettino-verificato-1440.png` (sola lettura);
- `app-bollettino-768.png` (PDF sopra la cerniera);
- `app-bollettino-contestazione-1440.png` (finestra della contestazione);
- `prototipo-bollettino-768.png` (il prototipo si impila allo stesso modo; hash dei due `stile.css`
  identico).

## Dubbi

1. **Limite della ricerca nel campo**: la rotta ha `limite` 1–50 (20 se assente) come da prompt, ma il
   campo di ricerca filtra le voci già ricevute. L'entità chiede il massimo (50): con più di 50 documenti
   per fornitore un documento molto vecchio non compare. Se serve, il passo successivo è chiedere al
   server a ogni testo digitato (`ctx.q`), non allargare il limite.
2. **Contestazione in sola lettura**: il pulsante *Prepara la contestazione* compare anche a chi ha solo
   `provvigioni.consulta` (copiare non modifica niente). Se si preferisce riservarlo a chi modifica, è una
   riga nella barra.
3. **Testo per un documento sconosciuto**: non c'è un "noi calcoliamo" né una differenza, quindi la riga
   dice solo "voi riconoscete …" e il totale compare solo se almeno una riga ha una differenza.
4. **Doppio testo sulle righe aperte**: la barra mostra sia la frase del server ("1 riga da decidere prima
   di chiudere il bollettino.") sia "Manca 1 riga da decidere" accanto al pulsante, come chiesto. Si può
   togliere la prima se sembra ripetuta.
5. **Versione della spec**: 8.22 e D-58 perché 8.21 e D-57 erano già nel file non committato di F4-A1 (non
   toccati).
6. **Prove in due gruppi**: `jest --runInBand` con tutte le 18 suite in un solo comando terminava con
   codice 1 senza stampare niente; gli stessi file, divisi in due gruppi, danno 273/273 OK.
