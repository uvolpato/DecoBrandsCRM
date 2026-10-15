# Decobrands — prototipo alternativo

Prototipo indipendente dal primo (`prototipo-crm/`): stessa materia, ma costruito sui **flussi di lavoro** invece che sulle tabelle, con la palette Decobrands e gli stessi componenti standard del primo. Si apre con `index.html` (doppio clic, nessun server, nessuna libreria esterna).

## Idea

Il lavoro vero è **quadrare i conti** con un ritmo preciso: ogni giorno arrivano documenti, ogni mese arrivano i bollettini, ogni trimestre si liquidano i subagenti. La navigazione segue quel ritmo:

| Cadenza | Pagina | A cosa serve |
|---|---|---|
| Ogni giorno | **Oggi** | Riquadri per tipo di lavoro (fanno da filtro); "Da fare" in gruppi richiudibili: **conferme in ritardo** (dalla più vecchia, *Prepara i solleciti* = un testo per fornitore), **documenti da decidere** (solo quelli che chiedono una decisione; gli altri contati), **bollettini**; a destra **prossime scadenze**, trimestre, ultime operazioni |
| | **Documenti** | Unico ingresso di **tutti** i documenti (ordini, conferme, fatture, note di credito, bollettini): si caricano trascinandoli o con *Carica documenti* nella barra, da qualsiasi pagina. Lettura automatica, controllo dei dati letti (*Correggi i dati letti*), poi: l'ordine apre una pratica, conferme e fatture si abbinano alla pratica proposta (codice cliente + articoli in comune), il bollettino si registra e si verifica |
| | **Pratiche** | Elenco filtrabile; la scheda mostra il **binario** ordine → conferma → fattura → nota di credito con le differenze fra le fasi. I documenti si consultano **affiancati**: a sinistra il documento, a destra il confronto riga per riga con un altro documento della pratica (clic su un documento, su *Consulta affiancati* o su una riga a confronto) |
| Ogni mese | **Bollettini** | Matrice fornitore × mese: verificato, da decidere, pronto, atteso (fino al giorno del fornitore), non arrivato (con sollecito) |
| | Bollettino | Riconciliazione **a cerniera**: a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura |
| Ogni trimestre | **Liquidazioni** | Trimestri fissi, elenco dei subagenti con documenti nel trimestre (clic = filtro, regge qualsiasi numero), documenti liquidabili o in attesa, prospetti CSV a 8 campi, chiusura |
| Anagrafiche | Fornitori, Subagenti, Clienti | Clienti e fornitori da Integra in **sola lettura**; nel CRM condizioni, percentuali **datate**, eccezioni, subagenti e **agenzie del cliente** (fornitore, codice, subagente, sconto) |

## Controllo dei dati letti

Ogni documento letto ha un'**affidabilità per campo** (nell'app arriva da GLM-OCR, qui è simulata) e passa da **controlli fissi** (codice cliente presente fra i clienti del fornitore, totale del documento uguale alla somma delle righe, bollettino non già registrato).

- **Livello:** affidabile (tutto ≥ 90 %) · da controllare (un campo fra 70 e 90 % o un controllo fallito) · bassa (un campo sotto 70 % o un controllo grave). Compare nell'elenco e come contatore su *Correggi i dati letti*; con livello basso l'abbinamento chiede conferma.
- **Correggi i dati letti** apre una finestra a tutto schermo: a sinistra il documento com'è stampato, a destra testata e righe modificabili. I campi incerti sono bordati (giallo / rosso con la percentuale); selezionando un campo si evidenzia nel documento; ✓ conferma un valore giusto; si possono aggiungere ed eliminare righe. Il riepilogo in alto elenca i punti da controllare e porta al campo.
- Le righe sono una **DataTable** standard (ordinabile, totale fisso) con celle modificabili. Il codice articolo è un campo di ricerca sugli articoli già usati dal fornitore nei documenti registrati (nel giro agenzia gli articoli non sono nell'anagrafica Decobrands): pallino verde se noto, rosso se nuovo; un articolo nuovo si inserisce lo stesso e non conta fra i punti da controllare. *Aggiungi riga* apre una finestra modale: scegliendo un articolo noto propone descrizione e ultimo prezzo.
- **Prova:** conferma AB-77120 di Gries → quantità della riga 3 letta 12 ma stampata 18 (il totale non torna) e codice della riga 8 letto CI0T-387 con lo zero (affidabilità 86 %) → correggi in 18 e CIOT-387, conferma data e prezzo della riga 5 → lettura affidabile.

> ⚠ **Evidenziazione nel documento: funzione da verificare.** Nel prototipo il documento a sinistra è una pagina simulata, quindi l'evidenziazione è sempre precisa. Con i file reali dipende dal file: attesa precisa sui PDF da gestionale e sugli Excel, possibile approssimata o assente sugli scansionati. La fattibilità si misura con la prova F0-A7 (specifica §6.6) prima di confermarla al cliente.

## Regole di flusso applicate

- **Si torna sempre indietro, nello stesso punto**: ogni schermata aperta da un'altra ha *‹ Torna a …* in testa (come il tasto Indietro del browser); al ritorno filtri, riquadri scelti, ordinamento delle tabelle e scorrimento sono come li avevi lasciati. Prova: Pratiche → filtra, ordina, scorri → apri una pratica → *Torna a Pratiche*.
- **Anagrafiche**: clienti e fornitori arrivano da Integra (sola lettura); i subagenti si gestiscono per intero nel CRM.
- **Bollettino atteso**: ogni fornitore ha nelle condizioni il giorno del mese successivo entro cui manda il bollettino (iniziale 10). Fino a quel giorno il bollettino è *atteso* (Prossime scadenze), dopo diventa *non arrivato* e in Oggi compare il sollecito.

- **Lo stato della pratica non si scrive a mano**: si ricava dai documenti (ordine → in attesa/in ritardo; conferma → confermata; fattura → fatturata). La nota di credito è un documento, non uno stato.
- **I documenti entrano solo da "Documenti"** (caricamento → lettura automatica → controllo → abbinamento), come nella Gestione Ordini; un codice cliente sconosciuto si corregge o richiede la scelta manuale. Nel prototipo la lettura è simulata: qualsiasi file produce uno dei documenti di esempio.
- **Bollettino**: ogni riga che non quadra va accettata (con motivo) o contestata (motivo obbligatorio); "manca nel bollettino" si può rimandare al mese dopo. Si chiude come verificato o contestato; per la contestazione viene preparato il testo da inviare.
- **Dal fornitore ci aspettiamo** % agente + % subagente dello scaglione; **al subagente liquidiamo** la sua %, con eventuale eccezione personale. Se il fornitore riconosce un importo diverso, al subagente resta quello calcolato sull'imponibile.
- **Maturato / fatturato**: per chi paga sul fatturato (Gasper, Ing's) la provvigione entra nel trimestre del documento; per chi paga sul maturato (Gries) entra quando il bollettino che la riconosce è verificato.
- **Percentuali nel tempo**: le nuove percentuali hanno una data di validità; i documenti si calcolano con quelle in vigore alla loro data.
- **Trimestre**: si chiude solo a trimestre finito e senza documenti in attesa.

## Prova consigliata (5 minuti)

1. **Oggi**: 20 cose da fare divise per tipo; *Prepara i solleciti* prepara un testo per Gries, Gasper e Ing's.
2. **Documenti** → fattura F-2026-0930 di Ing's → *Abbina*: la pratica diventa fatturata e la riga del bollettino di agosto quadra.
3. **Bollettini** → Ing's agosto è "pronto da chiudere" → *Segna come verificato*.
4. **Bollettini** → Gries luglio → *Accetta il loro importo* sulla riga con la promozione → *Segna come verificato*: si sbloccano 505,80 € ai subagenti.
5. **Liquidazioni**: il 3° trimestre si aggiorna; prova *Scarica i prospetti*.
6. **Bollettini** → Gasper agosto: la fattura F-2026-0933 manca → *Contesta* → *Prepara la contestazione*.
7. **Carica documenti** (barra a sinistra) con un file qualsiasi: arriva la fattura F-2026-0951 → abbinala. Ricarica: arriva l'ordine OF/2026/052 → *Apri la pratica*. In **Bollettini** → *Carica un bollettino*: Gasper giugno → *Registra e verifica*.

Le modifiche restano salvate nel browser; *Ripristina i dati di prova* (in basso a sinistra) riporta tutto all'inizio. Data simulata: 4 settembre 2026.

## Grafica

Palette Decobrands da `STILE-GUIDA-DECOBRANDS.md` §2, la stessa del primo prototipo.

| Token | Valore | Uso |
|---|---|---|
| Primario | `#0d6efd` (hover `#0b5ed7`) | azioni principali, voce attiva, selezione |
| Scuro | `#212529` | barra laterale, testo |
| Sfondo · bordi | `#f5f6f8` · `#dee2e6` · intestazioni tabella `#e9ecef` / `#495057` | superfici |
| Stati | success `#198754` · warning `#ffc107` · danger `#dc3545` · info `#0dcaf0`, ognuno col suo fondo tenue | fatturata / in attesa / problema / confermata |

Logo monocromatico, bianco sulla barra scura. Carattere **Public Sans** (OFL, incorporato in `assets/font/public-sans.css`), cifre tabellari; la guida prevede il carattere di sistema: si può tornare a quello cambiando una riga di `stile.css`. Importi in formato italiano (`1.234,56 €`).

## Componenti

Ogni vista è **solo composizione** di componenti `CRM.*` parametrizzati (`assets/componenti.js`); il catalogo con esempi dal vivo e parametri è nella voce **Componenti** della barra.

- Stessi nomi e parametri del primo prototipo: `Pagina`, `Pannello`, `DataTable`, `FilterBar`, `KpiRow`, `Form`, `FormModal`, `Modale`, `Conferma`, `Avviso`, `stato`.
- Propri di questi flussi: `Caricamento`, `FinestraAffiancata`, `CampoRicerca` + `RicercaEntita` (campi collegati a entità: autocompletamento con 5 voci, lente / F4 per la maschera di ricerca, pallino se il valore esiste; entità in `assets/entita.js`), `ListaDaFare`, `ElencoSelezionabile`, `Scelte`, `Binario`, `Matrice`, `Cerniera`, `Periodi`, `Cifre`, `Dettagli`, `Elenco`, `TestoDaInviare`.

`DataTable` occupa sempre lo spazio disponibile, con intestazione fissa, righe scorrevoli, intestazioni ordinabili e totali fissi; con `naturale` prende l'altezza del contenuto (righe di un documento).

## File

```
index.html                    pagina unica
assets/dati.js                dati di prova organizzati per flusso
assets/motore.js              regole: stato pratica, scaglioni datati, riconciliazione, liquidazione, abbinamento
assets/componenti.js          libreria CRM.*: componenti standard, icone, rotte
assets/entita.js              entità dei campi di ricerca (fornitore, cliente, subagente, codice cliente, articolo, pratica, fattura)
assets/viste-giorno.js        Oggi, Documenti in arrivo, Pratiche, Pratica
assets/viste-periodo.js       Bollettini, Bollettino, Liquidazioni
assets/viste-anagrafiche.js   Fornitori, Subagenti, Clienti (con agenzie)
assets/viste-componenti.js    catalogo dei componenti
assets/stile.css              palette Decobrands e stile dei componenti
assets/logo-decobrands.png    logo
```
