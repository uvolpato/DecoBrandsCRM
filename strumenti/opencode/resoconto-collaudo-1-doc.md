# Resoconto · Collaudo onda 1 · Pacchetto 1-doc — Documentazione

Data: 13/11/2026 · Esecutore: DeepSeek V4 Flash · Esito: **fatto**, nessun commit.

## Cosa è stato scritto

### Specifica (`specifica-crm-provvigioni.md`, 8.78 → 8.79)
- Testata: riassunto dell'onda 1 (D-114…D-132, D-144…D-149).
- §19: aggiunte D-114, D-117, D-124, D-127, D-129, D-131, D-144, D-145, D-146, D-147, D-148, D-149;
  tutte le righe `| D-nn |` hanno 6 celle (script di controllo: 0 righe fuori norma).
- D-11: data «16/10/2026 (rivista 18/10/2026)».
- D-87: il blocco nell'app è su *Apri la pratica* (409), «da configurare» è del prototipo (D-131).
- Righe *Perché*: §3.3 (richieste automatiche e tetto 30 giorni, D-89), §3.4 (segreti d'esercizio
  D-145, dominio/certificato D-148), §4.2.6 (D-114, D-146), §4.2.7 (D-34 numero riusato), §5.2
  (una fattura al mese, correzione su NC), §5.14 (storni dalla fotografia), §6.1 (fornitore in D-87,
  D-131), §6.5 (limite email intera, P.IVA con prefisso D-124), §6.6 (formula unica U23/D-06),
  §7.0 (D-129), §7.1 (bollettini 12 mesi D-144), §7.9 (documento in errore A4-01, corpo malformato
  A4-13), §7.13 (D-117), §7.14.3 (`casella.interno`, email illeggibile, C1), §7.15 (segreto non
  verso server nuovo), §7.16 (DELETE condizionata), §15.2.3 (elenco fatture dopo `FOR UPDATE`),
  §15.2.7 (`negato`), §15.4 (scorciatoia solo per esiti non riusciti), §16.4 (Avviso D-149,
  CampoRicerca ARIA), §16.4.2 (riapertura SSE), §16.6 (D-127).
- §8.1: `GET /api/oggi` con bollettini degli ultimi 12 mesi e gruppo Documenti acceso (D-144, D-95).
- §7.14.1: STARTTLS obbligatorio fuori dalla 993 (D-147); §7.14.3: catalogo `casella.interno`.

### Guida e prototipo
- `app/frontend/lib/guida.ts`: rettangolo U23/D-06; *Rileggi il documento*; frasi D-87/D-131, cliente
  per P.IVA/ragione sociale (D-124), documento in errore e servizio di lettura giù; D-146 nelle
  Pratiche; D-127 nell'Accesso; D-117 negli Utenti; server nuovo/password e segreti d'esercizio nelle
  Impostazioni; D-114 nei Clienti.
- `prototipo-alternativo/assets/guida.js`: formula U23/D-06 e nota 744 px (D-127).
- `prototipo-alternativo/LEGGIMI.md`: avviso D-06 allineato, 744 px, `flusso.py` non più obbligatoria.

### Piano (`piano-lavoro-crm.md`, 2.1 → 2.2)
- A9-04: tutte le ore già approvate il 04/11/2026 dicono «approvata il 04/11/2026»; restano «da
  approvare» solo F7-A0 e F7-A3 (più le attività nuove sotto).
- F7-A2: output aggiornato al collaudo 1-15 (Caddyfile/HSTS, script, sparse checkout `--no-cone`).
- F7-A5 (10 h da approvare, U26), F7-A6 (4 h: 1-03, 1-14, 1-15), F7-A7 «Righe dei bollettini dal
  PDF» (12 h da approvare, U9). Tolta la riga «409 chiaro… D-139, 0,25 h», superata da D-139.

### PRD (`PRD-crm-provvigioni.md`, 1.1 → 1.2)
- Fonti: spec v8.79. Accesso D-39/D-41 al posto di Microsoft 365/link senza password (E9.2, §5,
  tabella ore F0-A3). Impostazioni a 6 sezioni (D-65). §12: D-30 «sostituita da D-39», aggiunte
  D-36, D-39, D-41, D-43, D-44, D-59, D-60, D-87, con nota che la sintesi del §19 è ferma a D-32.
- Formula U23/D-06 su evidenziazione e criterio E1.4.

### Esercizio
- `app/deploy/Caddyfile`: commenti con dominio vero e le due strade del certificato (intranet);
  direttive attive invariate.
- `app/README.md`: dominio `crm.decobrands.it`, certificato intranet, segreti ≥ 32 caratteri
  (D-145), `DATABASE_URL_TEST` per due giri di prove insieme.
- `app/backend/src/motore/motore.ts`: commento `D-144` → `D-146` (unico commento trovato).

## Prove
- `python strumenti/genera-pagine-doc.py`: ok (specifica.html 19 sezioni, preventivo aggiornato).
- `npx tsc --noEmit` in `app/frontend` e in `app/backend`: 0 errori.
- Script 6 celle su ogni riga `| D-nn |`: 0 righe fuori norma.
- Prove nel browser non lanciate (le lancia il controllo di fine onda), come da regole.

## Da documentare (per il controllo di fine onda)

- `app/NOTA-RILASCIO.md`, punto 2 dell'installazione: la frase di D-145 sui segreti ≥ 32 caratteri
  non è stata scritta perché il file non è fra quelli ammessi a questo pacchetto.
- I nomi delle prove `test/motore.spec.ts:69,84` dicono ancora «D-144»: sono stringhe di prova, non
  commenti, e le prove non sono fra i file ammessi; il commento nel motore è già D-146.
- `app_flusso.py` / `app_bollettini.py`: vanno lanciate dal controllo di fine onda perché il seed e
  i numeri del motore sono toccati dall'onda (nessuna modifica del seed in questo pacchetto).

## Cose aperte

- `specifica-crm-provvigioni.md` §19 contiene righe fuori ordine cronologico (D-100…D-113 in coda):
  non toccate, per non cambiare il senso del registro.
- Restano i dubbi del cliente di §5.14 (solleciti, giorni d'incasso, email del cliente): invariati.
