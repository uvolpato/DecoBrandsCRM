# Resoconto — Documenti della pratica (affiancati): righe anche senza confronto + icona «Copia» (D-173) (15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/affiancati-righe.md` (P2). Parte dopo `link-diretti`, `numero-ordine-fornitore` e `azioni-riga` (modifiche non committate). Regole comuni rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto, prove su `decobrands_test_e2e`, niente 8001/8002, niente Integra, niente commit.

## Cosa è stato fatto

### 1. Finestra «Documenti della pratica» (`componenti/ConsultaDocumenti.tsx`)
- **Le righe del documento aperto si vedono sempre**, anche senza confronto: senza `rif` la tabella a destra mostra le righe di `cur.righe` (già dal server in `documentiPratica`, V12) con le colonne **Articolo, Descrizione, Quantità, Prezzo, Importo** e il totale in euro nel piede (colonna `importo` con `totale:'somma'`, `DataTable`). L'importo mancante si ricava da quantità × prezzo (come nell'anteprima).
- Quando si sceglie un documento in «Confrontato con» restano le colonne dell'altro documento e la differenza, **come oggi** (righe allineate dal server, D-78).
- La tendina «Confrontato con» è **spenta** con un solo documento, motivo nel `title` («Nella pratica c'è un solo documento»).
- La nota «Scegli un documento con cui confrontare» resta **solo come testo sopra la tabella** quando ci sono altri documenti e nessun confronto scelto; l'`emptyHint` senza confronto è «Il documento non ha righe lette».
- Clic su una riga: resta l'evidenziazione della riga in tabella (`segnata`); **niente evidenziazione nel PDF** (vedi Aperti).

### 2. Icona «Copia» sui codici (D-173)
- Nuovo componente **`componenti/Copiabile.tsx`**: icona «copia» che copia negli appunti (`navigator.clipboard.writeText`, con fallback) e mostra una **spunta per 1,5 s** al posto dell'icona. `aria-label` e `title` «Copia <valore>»; riusa `.btn-riga` (fuoco a bordo interno D-64, area 32 px, non sposta il testo perché l'icona non cambia posto).
- Icona `copia` aggiunta in `componenti/Icona.tsx` (non c'era).
- **`Pannello.titolo` ora accetta `ReactNode`** (`componenti/Pagina.tsx`): serve a mettere l'icona accanto al numero nel titolo del documento.
- Applicato (elenco in tabella sotto):
  - **Pratica** (`VistaPratica`): numero pratica nel titolo (`OF/2026/001`) e numero d'ordine del fornitore nel sottotitolo (`AU276839`).
  - **Documento** (`VistaDocumento`): numero del documento e numero d'ordine del fornitore nell'intestazione (titolo), codice cliente presso il fornitore nella voce «Codice cliente».
  - **Cliente / Fornitore** (`VistaClienti` / `VistaFornitori`): P.IVA nella scheda.
- Voce **`Copiabile`** nel catalogo `componenti/page.tsx`.

## Passaggio su tutta l'interfaccia (D-173)

| Pagina | Dato | Perché si copia (dialogo con…) | Fatto / proposto |
|---|---|---|---|
| Pratica (testata) | numero pratica `OF/2026/001` | dialogo col fornitore | **fatto** |
| Pratica (testata) | numero d'ordine fornitore `AU276839` | dialogo col fornitore | **fatto** |
| Documento (intestazione) | numero documento | dialogo col fornitore | **fatto** |
| Documento (intestazione) | numero d'ordine fornitore | dialogo col fornitore | **fatto** |
| Documento (testata) | codice cliente presso il fornitore | dialogo col fornitore | **fatto** |
| Cliente (scheda) | P.IVA | email/fatturazione al cliente | **fatto** |
| Fornitore (scheda) | P.IVA | email/fatturazione al fornitore | **fatto** |
| Cliente (scheda) | codice soggetto, codice Integra | ricerca in Integra | proposto |
| Fornitore (scheda) | codice soggetto, codice Integra | ricerca in Integra | proposto |
| Subagenti (scheda) | codice, email | pagamento/comunicazioni al subagente | proposto |
| Soggetti (scheda) | P.IVA, codice fiscale | ricerca in Integra, fatturazione | proposto |
| Utenti (scheda) | nome utente | assistenza | proposto |
| Profilo | nome utente, email | assistenza | proposto |
| Pratiche (elenco) | numero pratica, ordine fornitore | dialogo col fornitore | proposto (niente icone nelle celle delle tabelle) |
| Documenti (elenco) | numero documento | dialogo col fornitore | proposto (idem) |
| Bollettino (righe) | numero fattura | dialogo col fornitore | proposto (idem) |
| Liquidazioni (righe) | numero documento/pratica | dialogo col fornitore/subagente | proposto (idem) |
| Binario (fase Ordine) | numero documento `AU276839` | dialogo col fornitore | proposto (già copiabile dal sottotitolo della pratica) |
| Bollettini, Analisi, Oggi, Scartati, Registro, Stato, Impostazioni, Guida | — | nessun codice da copiare chiaro | niente |

## Prove

- `npx tsc --noEmit` nel frontend: **pulito** (il backend non è stato toccato).
- `python -m py_compile strumenti/prove/app_pratica.py`: OK.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_pratica`: **0 KO / 97 controlli**.
  - Controlli nuovi: con un solo documento la tendina «Confrontato con» è spenta, la tabella a destra mostra le 20 righe del documento, colonne Articolo/Descrizione/Quantità/Prezzo/Importo e il totale nel piede.
  - Primo giro fallito a `pg.go_back()` della catena navigabile (link-diretti) per un timeout di navigazione; al secondo giro la stessa catena è passata: flake di navigazione, non di questo pacchetto.

## Controlli (skill caricate davvero)

- `ponytail-review`: nessuna astrazione nuova; `Copiabile` è un pulsante che riusa `.btn-riga` e `Icona`; la tabella senza confronto ricicla `DataTable` con `totale:'somma'` (niente somma nel browser, il valore viene dalla colonna). Il cambio `Pannello.titolo` a `ReactNode` è retrocompatibile. `net: 0`.
- `caveman`: risposte concise.

## Aperti / note

- **Evidenziazione della riga nel PDF** (punto 4 del pacchetto): **non fattibile con i dati attuali**. Le righe di pratica (`ordini_fornitore_righe`) non hanno la posizione nel PDF (solo `codice`/`descrizione`/quantità/prezzo/importo); la posizione sta su `documenti_in_arrivo` (§6.6, per *Correggi i dati letti*). In più il lato sinistro della finestra usa `<object>`/`<img>`, non `PdfEvidenziato`. Al clic resta l'evidenziazione della riga in tabella; per il rettangolo nel PDF servirebbe portare la posizione sulle righe di pratica — da decidere con Ugo.
- File fuori dall'elenco ammesso (richiesti dal componente che usa la finestra, "solo se serve"): `componenti/Icona.tsx` (icona `copia`) e `componenti/Pagina.tsx` (`Pannello.titolo` a `ReactNode`). Da tenere presenti se altri pacchetti li toccano in parallelo.
- I codici dentro le celle delle tabelle (elenchi Pratiche/Documenti, righe Bollettino/Liquidazioni, codici articolo riga per riga) sono **solo proposti**, da far decidere a Ugo (regola: niente icone nelle celle salvo casi chiarissimi).

## Da documentare (spec)

- **§7.3 (pratica)**: nella testata l'icona «Copia» su numero pratica e numero d'ordine del fornitore; nella finestra «Documenti della pratica» a destra si vedono sempre le righe del documento aperto (Articolo, Descrizione, Quantità, Prezzo, Importo, totale), e la tendina «Confrontato con» è spenta con un solo documento (motivo nel `title`).
- **§7.9 (documento)**: icona «Copia» su numero documento, numero d'ordine del fornitore e codice cliente presso il fornitore.
- **§7.x (clienti/fornitori)**: icona «Copia» sulla P.IVA.
- **§16.4 (componenti)**: nuovo `Copiabile` (icona «Copia» → spunta 1,5 s, `aria-label`/`title` «Copia …», fuoco a bordo interno D-64, non sposta il testo); `Pannello.titolo` accetta `ReactNode`.
- **§19 — D-173** (da proporre): gli identificativi che si copiano spesso per dialogare con fornitori e clienti (numero pratica/ordine/documento, codice cliente, P.IVA) hanno una piccola icona «Copia»; i casi dentro le celle delle tabelle restano da valutare caso per caso.
