# Resoconto · Pacchetto `oggi-dettagli` — Oggi: titolo e descrizione delle voci «Documenti da decidere»

Esecutore: DeepSeek · Data: 15/11/2026 · Database di prova: `decobrands_test_oggi_dett` (creato, usato, cancellato).

## Esito

- Titolo e dettaglio delle voci del gruppo *Documenti da decidere*: **corretti**.
- «fornitore non riconosciuto» falso: **corretto** (vedi *Da verificare*).
- Prove del pacchetto: **0 KO** (jest `test/oggi.spec.ts` 17/17, `npx tsc --noEmit` 0 errori backend e frontend).

## Cosa cambia

### Backend — `app/backend/src/oggi.ts`

- La query `daDecidere` seleziona ora anche `stato`, `file_nome`, `letto_il`, `ricevuto_il` e i campi
  `data`, `codice_cliente`, `cliente`, `importo_totale`, `fornitore` (oltre a `numero` e `mese`).
- Titolo: quale documento —
  - **bollettino** (invariato): `Registra il bollettino di <mese> di <fornitore>`, pulsante `Apri`;
  - **ordine** (invariato): `Apri la pratica dell’ordine <numero>`, o il nome del file se non letto, pulsante `Apri`;
  - gli altri: documento non letto (`letto_il` null) → il nome del file (`Abbina estratto-conto.pdf`);
    letto con numero → tipo e numero (`Abbina fattura RE196022`); letto senza numero → tipo e file
    (`Abbina pagamento dettaglioDistinta (6).pdf`). Pulsante `Abbina`.
- Dettaglio su una riga (pezzi separati da « · »): fornitore, cliente, importo, data documento,
  motivo (`errore` / `affidabilità bassa` / `da controllare`), giorni in coda. Il frontend la tronca
  con ellissi e mette il testo intero nel `title`.

### Frontend — `app/frontend/componenti/Flussi.tsx` e `app/frontend/app/stile/stile.css`

- `Flussi.tsx`: `title={x.dettaglio}` sullo `<span>` della descrizione.
- `stile.css`: `.da-fare div { min-width: 0 }` e `.da-fare div > span` con `white-space: nowrap`,
  `overflow: hidden`, `text-overflow: ellipsis` (una riga sola, ellissi).

> Nota sui file ammessi: `Flussi.tsx` e `stile.css` sono componenti/stile condivisi usati dalla vista
> Oggi, non strettamente «la sua vista». Servono per il requisito «Massimo una riga: tronca con ellissi,
> testo intero nel title». Nessun altro pacchetto della stessa onda tocca le righe modificate (verificato
> sul diff: le altre modifiche a `stile.css` sono di altri pacchetti, in punti diversi).

## Da verificare (il falso «fornitore non riconosciuto»)

Causa: `oggi.ts` leggeva solo `d.fornitore` (il fornitore **abbinato** a un'anagrafica) e, quando
`fornitore_id`/`fornitore_versione_id` erano nulli, scriveva «fornitore non riconosciuto». Ma i documenti
in coda avevano comunque il **nome letto** dall'OCR (campo `fornitore`, es. «ARTE WOHNACCESSOIRES», affidabilità 0,948):
non era «non riconosciuto», solo non ancora abbinato. Correzione: `d.fornitore?.ragione_sociale ?? valore(d,'fornitore') ?? 'fornitore non riconosciuto'`.

Esempi prima → dopo:

| prima | dopo |
|---|---|
| `Abbina pagamento` / `fornitore non riconosciuto · affidabilità bassa` | `Abbina pagamento dettaglioDistinta (6).pdf` / `ARTE WOHNACCESSOIRES · affidabilità bassa · 2 giorni in coda` |
| `Abbina documento` (×4) / `fornitore non riconosciuto · da controllare` | `Abbina <nome file>` / `ARTE WOHNACCESSOIRES · da controllare · … giorni in coda` |

## Prove lanciate

- `npx jest oggi.spec.ts` (con `DATABASE_URL_TEST=…/decobrands_test_oggi_dett`): **17/17, 0 KO**.
  Nuovo `describe('documenti da decidere: titolo e dettaglio')` con 7 prove:
  non letto → nome file nel titolo; letto con numero → tipo e numero; letto senza numero → tipo e file;
  ordine → «Apri la pratica dell'ordine <numero>» e pulsante `Apri`; bollettino → «Registra il bollettino
  di <mese> di <fornitore>» e pulsante `Apri`; fornitore abbinato → niente «non riconosciuto»; fornitore
  non abbinato ma nome letto → si dice il nome letto.
- `npx tsc --noEmit` backend e frontend: **0 errori**.
- Database `decobrands_test_oggi_dett` cancellato (`DROP DATABASE`). Nessun contatto con Integra,
  `decobrands_db`, 8001/8002 o il database condiviso `decobrands_test`.
- Skill caricate davvero e usate sul diff: `owasp-security` (nessun input non fidato nuovo: i valori
  vanno solo in testi mostrati, non in query; la query resta parametrizzata con elenco `in` fisso),
  `ponytail-review` (nessun rilievo), `caveman`.

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_oggi.py` (non modificata). Controllo visivo della pagina Oggi (1440 e 768) a fine
  onda, come da regole: qui non lanciato (regole onda parallela).

## Da documentare

### Spec §7.1 (pagina Oggi, gruppo «Documenti da decidere»)

Nella descrizione delle voci aggiungere:

> Ogni voce dice **quale documento**: bollettino → «Registra il bollettino di \<mese\> di \<fornitore\>»,
> ordine → «Apri la pratica dell'ordine \<numero\>» (o il nome del file se non letto); gli altri, finché il
> documento non è letto, il nome del file; dopo la lettura tipo e numero (es. «Abbina fattura RE196022»),
> oppure tipo e file se il numero non c'è («Abbina pagamento dettaglioDistinta (6).pdf»). La riga di
> descrizione unisce fornitore, cliente, importo, data, motivo (errore / affidabilità bassa / da controllare)
> e giorni in coda, su una sola riga (troncata con ellissi, testo intero nel suggerimento). Il fornitore è il
> nome letto finché non è abbinato a un'anagrafica: «fornitore non riconosciuto» solo quando nemmeno il nome
> è stato letto.

*Perché*: le voci erano tutte uguali («Abbina documento» / «fornitore non riconosciuto») e non dicevano
quale documento richiedesse la decisione; inoltre il nome del fornitore letto dall'OCR era già disponibile
nel campo `fornitore` ma non veniva usato.

### Spec §8.1, tabella `GET /api/oggi` (riga dell'endpoint)

Aggiornare la descrizione del gruppo *Documenti da decidere*: le voci portano titolo («Abbina …» + file o
tipo/numero) e una descrizione su una riga (fornitore, cliente, importo, data, motivo, giorni in coda);
il fornitore cade sul nome letto prima di «non riconosciuto».

### Registro §19

Riga nuova:

| D-nn | 15/11/2026 | **Oggi: le voci «Documenti da decidere» dicono quale documento e usano il nome letto del fornitore.** Bollettino e ordine restano com'erano («Registra il bollettino di …», «Apri la pratica dell'ordine …», pulsante `Apri`); gli altri «Abbina …» + nome file (non letto) o tipo/numero (letto); descrizione su una riga (fornitore, cliente, importo, data, motivo, giorni in coda). Il fornitore è `ragione_sociale` dell'abbinamento, poi il campo letto `fornitore`, poi «non riconosciuto». | Le voci erano tutte uguali e dicevano «fornitore non riconosciuto» anche quando l'OCR aveva letto il nome (es. ARTE WOHNACCESSOIRES, affidabilità 0,948). | pacchetto `oggi-dettagli` | §7.1, §8.1, `src/oggi.ts` |

### Guida in linea (`app/frontend/lib/guida.ts`)

Da valutare: nella guida di Oggi precisare che la voce dice il nome del file finché il documento non è
letto, poi tipo e numero. Non bloccante (testo attuale generico).

### Piano, README, prototipo

- `piano-lavoro-crm.md`: nessuna attività nuova (correzione richiesta da Ugo, da segnare come da approvare
  solo se il pacchetto documentazione lo decide).
- Prototipo: allineato (bollettino/ordine restano con le loro voci, come `M.daFare` in motore.js).
