# Pratica → «Documenti della pratica» (affiancati): le righe del documento anche senza confronto (15/11/2026)

**Esecutore: DeepSeek V4 pro** (c'è un passaggio su tutta l'interfaccia) · Gravità: P2.

Prima leggi i resoconti di `link-diretti`, `numero-ordine-fornitore` e `azioni-riga` (modifiche non committate). Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Caso (Ugo)
Pratica OF/2026/001 (AGRI AGGIO · ARTE), un solo documento (ordine AU276839, 2.154,50 €, 51 righe). Nella finestra «Documenti della pratica» (a sinistra il PDF, a destra il confronto con un altro documento) a destra c'è «Confrontato con: Nessun confronto» e la tabella dice «Nessuna riga · Scegli un documento con cui confrontare», 0 elementi. Le righe del documento che si sta guardando non si vedono.

## Cosa fare
- A destra la tabella mostra **sempre le righe del documento aperto** (Articolo, Descrizione, Quantità, Prezzo, Importo in euro, con il totale nel piede), anche senza confronto. Le righe vengono dal server (rotta del confronto già esistente `GET pratiche/:id/documenti/:did/confronto` o il dettaglio del documento: usa quella che già dà le righe, V12).
- Quando si sceglie un documento in «Confrontato con», si aggiungono le colonne dell'altro documento e la differenza, come oggi.
- Il testo vuoto «Scegli un documento con cui confrontare» resta solo come nota sopra la tabella quando ci sono altri documenti; con un solo documento nella pratica la tendina «Confrontato con» è spenta con il motivo nel `title` («Nella pratica c'è un solo documento»).
- Cliccando una riga si evidenzia nel PDF a sinistra se la posizione c'è (come in *Correggi i dati letti*), altrimenti niente.

## Anche: icona «Copia» sui codici (Ugo, D-173)
Nella pratica, accanto al numero della pratica (titolo `OF/2026/001`) e al numero d’ordine del fornitore (`AU276839` nella fase Ordine) metti una piccola **icona «Copia»** che copia il valore negli appunti (`navigator.clipboard.writeText`) e mostra per un attimo «Copiato» (avviso breve dell’app o spunta al posto dell’icona per 1,5 s). Componente unico (es. `Copiabile` in `app/frontend/componenti/`, aggiungilo al catalogo): `aria-label` «Copia AU276839», `title` uguale, fuoco con bordo interno (D-64), non deve spostare il testo. Usalo anche per gli altri identificativi che si copiano spesso per dialogare con fornitori e clienti: numero del documento (intestazione del documento), codice cliente presso il fornitore, P.IVA nelle schede cliente/fornitore, numero d’ordine del fornitore nell’intestazione del documento. Elenco nel resoconto.

**Passaggio su tutta l'interfaccia (Ugo):** prima di applicarlo, passa **tutte le pagine** dell'app (Oggi, Documenti, Pratiche, Pratica, Bollettini, Bollettino, Liquidazioni, Analisi, Clienti, Fornitori, Subagenti, Soggetti, Utenti, Scartati, Registro, Stato del sistema, Impostazioni, Profilo) e le loro finestre, e fai una tabella nel resoconto: pagina · dato · perché si copia (dialogo con il fornitore, ricerca in Integra, email al cliente, pagamento al subagente: IBAN, P.IVA, codice fiscale, email, telefono, codici Integra, numeri di documento/pratica/bollettino, codici articolo?) · **fatto / proposto**. Metti l'icona dove l'utilità è chiara; i casi dubbi (es. ogni cella delle tabelle, codici articolo riga per riga) solo **proposti**, da far decidere a Ugo. Niente icone dentro le celle delle tabelle salvo casi chiarissimi.

## File ammessi
`app/frontend/app/(app)/**`, `app/frontend/app/(app)/componenti/page.tsx`, `app/frontend/componenti/Copiabile.tsx` (nuovo), i componenti che usa la finestra in `app/frontend/componenti/` (solo se serve, scrivilo), `app/backend/src/documenti.ts` o `pratiche.ts` solo se nessuna rotta dà già le righe (scrivilo), `strumenti/prove/app_pratica.py`, il resoconto `strumenti/opencode/resoconto-affiancati-righe.md`.

## Fine
- `npx tsc --noEmit` nel frontend (e nel backend se lo tocchi).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_pratica` (timeout 10 min), 0 KO; controllo nuovo: con un solo documento la tabella a destra ha le righe del documento.
- Carica davvero `ponytail-review`, `caveman`.
