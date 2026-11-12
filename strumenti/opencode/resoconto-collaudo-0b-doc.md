# Resoconto · Onda 0 bis · 0b-doc — Documentazione dell'onda
Data: 12/11/2026 · Esecutore: DeepSeek V4.1 Flash (OpenCode) · Nessun commit.

## Cosa ho fatto

### Spec `specifica-crm-provvigioni.md`

- **Versione in testa 8.76 → 8.77** con il riassunto dell'onda (D-133…D-138), stile delle versioni
  precedenti (`**Versione 8.76:**` conservata).
- **§19, registro delle decisioni:** aggiunte in fondo le 6 righe pronte D-133, D-134, D-135, D-136,
  D-137, D-138 (6 celle, chi come da pacchetto). D-139 non l'ho scritta (la scrive 0-doc), D-106,
  D-109, D-110 non toccate, nessuna rinumerazione.
- **Righe *Perché*** (o testi aggiornati) nelle sezioni indicate dai resoconti:
  - §4.6 (identità e versioni): D-138 — soggetto con ruolo da Integra in sola lettura (409), versioni
    nuove di ogni ruolo al cambio P.IVA, codice di Integra solo da *Importa*.
  - §4.7.1: regola 2 (limite 5 s solo su ricerca e import), regola 3 (risposta con `codice_registrato`
    /`documento_collegato`, 409 su altro codice dello stesso ruolo, `documento_id` nella stessa
    transazione, *Importa* che apre la scheda); nuovo *Perché* unico con D-111, D-133…D-135 (nome
    letto → una sola riga, controlli fuori dalla transazione, `cerca` che non apre anomalie, doppione
    di P.IVA, 3 s/5 s del pool, paese della P.IVA, lucchetto sugli import). Regola 5: `scaglioni_mancanti`
    alla data del documento (R1-12).
  - §4.7.2: riga dello storico consumata una volta (`FOR UPDATE`, 409), coppia con entrambi i lati,
    subagente dal server solo se unico (D-134), una sola `normalizzaPiva` (R1-07, R1-09).
  - §4.7.3: `--sostituisci` dentro la transazione, senza `RESTART IDENTITY`, rifiuto se una riga è usata
    (R1-10).
  - §6.1: *Perché (D-137)* — agenzia alla data dell'ordine per una pratica già aperta.
  - §6.5 punto 7: *Perché (D-133)* — le righe si riscrivono solo se il corpo le porta.
  - §7.4 (fornitori): *Perché (D-138)* — master da Integra in sola lettura, 409 sulle modifiche.
  - §7.6: paragrafo *Cerca in Integra* (D-135, R2-10) e *Perché (R2-06, R2-13, D-134, D-139)* — sconti
    in vigore dal server in una richiesta, sagoma ed errore, subagente precompilato solo se unico, 409
    sull'eliminazione di un'agenzia con sconti.
  - §7.9: paragrafo **Segni dell'elenco e import dal documento** (Fornitore/Cliente in Integra, Non
    rappresentato, Manca l'agenzia, *Importa da Integra* in transazione, *Importo…*, *Importa dal
    vecchio CRM* spento) con *Perché* (D-133, R1-06, R1-11, D-137) e la precisazione della pillola
    «Manca l'agenzia» per un documento non abbinato (nota di 0b-02 correzioni 1).
  - §7.14.3: riga `integra.connessione` aggiornata (3 giri di sincronizzazione, ricerca/import non la
    aprono) con il *Perché*.
  - §16.1: **eccezione voluta D-136** — *Cerca in Integra* solo nell'app.

### Guida in linea (`app/frontend/lib/guida.ts`)

- **Documenti**: «Configura l'agenzia» (data che serve + livello operatore in Dati, R2-07); nuovi
  pulsanti «Importa da Integra», «Importa dal vecchio CRM» (spento), «Segni in elenco»; sostituita la
  voce «Manca l'agenzia» con il testo D-137; aggiunte D-133 (import che non tocca le righe) e la nota
  sullo storico senza codice (C1/C2).
- **Fornitori**: «Configura gli scaglioni» (D-113); *Importa* apre la scheda del nuovo, anche se già in
  anagrafica (D-135).
- **Clienti**: campo *Seguito da* con la precompilazione D-134 e il campo obbligatorio; *Elimina* con il
  409 di D-139; *Sconto al cliente* che si rilegge dal server a ogni apertura (R2-06); *Importa* apre
  la scheda (D-135).
- **Soggetti**: tre voci *sapere* per D-138 (master in sola lettura se da Integra, codice non digitabile,
  versione nuova dei ruoli al cambio P.IVA); finestra *Aggiungi ruolo* senza il campo del codice di
  Integra (R1-08).

### Prototipo, piano, README

- `prototipo-alternativo/LEGGIMI.md`: nota «Cerca in Integra è solo nell'app (D-136)».
- `piano-lavoro-crm.md`: nuova attività **F7-A4 · Onda 0 bis del collaudo — 6 h da approvare**, con la
  nota che le ore di 0b-01 non sono conteggiate (il resoconto non le dà).
- `app/README.md`: una riga su `app_documenti.py` che simula la scheda con `page.route` (D-133).
- `prototipo-crm/specifica.html` rigenerato (`python strumenti/genera-pagine-doc.py`); `preventivo.html`
  non cambia (nessuna modifica al preventivo).

## Prove

| Prova | Esito |
|---|---|
| `python strumenti/genera-pagine-doc.py` | ok, `specifica.html` con 19 sezioni |
| Righe del §19: 6 celle con `\|` non preceduti da `\`; D-133…D-138 una volta sola | **119 righe, 0 con celle ≠ 6**; i sei numeri compaiono 1 volta ciascuno |
| `cd app/frontend && npx tsc --noEmit` | **0 errori** (guida.ts toccata) |
| `app_guida.py` | **non lanciata**: la esegue il controllo di fine onda (porte 8001/8002 e `.next` condivisi con i pacchetti in parallelo) |

## Cose aperte / deviazioni

1. **Dove ho messo D-138.** Il resoconto 0b-04 dice «§4.1 (identità del soggetto) e §5 (ruoli)», ma
   nella spec §4.1 sono le tabelle della Gestione Ordini e §5 sono le regole di business: l'identità e
   le versioni stanno in **§4.6**. Ho scritto lì, per non mettere una regola in una sezione che parla
   d'altro.
2. **Due righe del §19 malformate, corrette.** D-73 e D-74 (onde precedenti) avevano **5 celle**: il
   perché era dentro la decisione. In D-73 l'ho separato nel punto in cui cominciava «**Perché:**»
   (nessun testo cambiato). In D-74 il perché **non c'era**: ho scritto una riga ricavata dalle sue
   stesse parole (anomalie solo per ciò che un controllo verifica, contatore del server, eventi del
   catalogo §15.2.4). Se Ugo preferisce un perché diverso, si cambia solo quella cella.
3. **Pillola «Manca l'agenzia»** (dubbio di 0b-02): non ho cambiato il comportamento. L'ho documentata
   come sta — per un documento non abbinato vale la data del documento — in §7.9 e in guida. Il dubbio
   su un testo più morbido resta di Ugo.
4. **Ore di 0b-01** non conteggiate in F7-A4: i resoconti dicono «da approvare» senza numero.
5. **D-139** citata in §7.6 e in guida ma non scritta (§19): la riga è del pacchetto 0-doc. D-114…D-132
   restano alle onde 1-8.

## Da documentare

Nulla: questo pacchetto è la documentazione. Restano da fare, fuori da qui, le righe D-114…D-132
(onde 1-8) e D-139 (0-doc), e le ore di 0b-01 nel piano.
