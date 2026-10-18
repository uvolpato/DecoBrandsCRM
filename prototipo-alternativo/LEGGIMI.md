# Decobrands — prototipo alternativo

Prototipo indipendente dal primo (`prototipo-crm/`): stessa materia, ma costruito sui **flussi di lavoro** invece che sulle tabelle, con la palette Decobrands e gli stessi componenti standard del primo. Si apre con `index.html` (doppio clic, nessun server, nessuna libreria esterna).

## Idea

Il lavoro vero è **quadrare i conti** con un ritmo preciso: ogni giorno arrivano documenti, ogni mese arrivano i bollettini, ogni trimestre si liquidano i subagenti. La navigazione segue quel ritmo:

| Cadenza | Pagina | A cosa serve |
|---|---|---|
| Ogni giorno | **Oggi** | Riquadri per tipo di lavoro (fanno da filtro); "Da fare" in gruppi richiudibili: **conferme in ritardo** (dalla più vecchia, *Prepara i solleciti* = un testo per fornitore), **documenti da decidere** (solo quelli che chiedono una decisione; gli altri contati), **bollettini**; a destra **prossime scadenze**, trimestre, ultime operazioni |
| | **Documenti** | Unico ingresso di **tutti** i documenti (ordini, conferme, fatture, note di credito, bollettini): si caricano trascinandoli o con *Carica documenti* nella barra, da qualsiasi pagina. Lettura automatica, controllo dei dati letti (*Correggi i dati letti*), poi: l'ordine apre una pratica, conferme e fatture si abbinano alla pratica proposta (codice cliente + articoli in comune), il bollettino si registra e si verifica. Il dettaglio ha due schede: prima l'azione proposta, poi *Righe lette* con il contatore delle righe incerte |
| | **Pratiche** | Elenco filtrabile; la scheda mostra il **binario** ordine → conferma → fattura → nota di credito e due schede: **Riepilogo** (provvigione, incasso del cliente, documenti; avviso se le fasi cambiano righe) e **Righe a confronto** (contatore rosso delle variazioni nel titolo; si apre per prima se arrivi dal filtro *Con variazioni*). I documenti si consultano **affiancati**: a sinistra il documento, a destra il confronto riga per riga con un altro documento della pratica (clic su un documento, su *Consulta affiancati* o su una riga a confronto) |
| Ogni mese | **Bollettini** | Matrice fornitore × mese: verificato, da decidere, pronto, atteso (fino al giorno del fornitore), non arrivato (con sollecito). Sempre 6 mesi: selettore a mesi (anno + griglia, scorciatoie) che completa il periodo da solo, ‹ › per spostarlo, filtro fornitore, *Con qualcosa da fare* |
| | Bollettino | Riconciliazione **a cerniera**: a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura |
| Ogni trimestre | **Liquidazioni** | Trimestri fissi; a sinistra i subagenti con documenti nel trimestre (clic = filtro, regge qualsiasi numero); a destra le schede *Documenti* (liquidabili o in attesa, storni e riaccrediti) e **Report subagenti** (grafico e tabella per subagente con confronto sul trimestre prima; con un subagente scelto: suoi numeri, trimestri, clienti principali); *Analisi completa*; esportazione (completa per subagente, un solo subagente, solo riepilogo) in Excel, PDF identico all'Excel o CSV; chiusura |
| | **Analisi** | La BI: periodo di 3, 6 o 12 mesi, filtri fornitori / subagenti / clienti con **campi di ricerca a selezione multipla** (etichette nel campo, maschera con caselle), **filtro incrociato** con un clic su grafici e righe (il grafico mette in risalto la scelta), 4 numeri con confronto sul periodo precedente, andamento mensile, fatturato per fornitore, subagenti, primi 10 clienti (Chart.js, MIT), tabella raggruppabile; esportazione Excel con i grafici, PDF, CSV. Importi per data del documento |
| Vendita diretta · **spenta** (ampliamento futuro, spec §17; si accende con `index.html?vendita=1`) | **Ordini cliente** | Come la Gestione Ordini: ordini dei clienti con controllo degli articoli (pallino), disponibile per riga, *Esporta per Integra* a schede (alias con casi A/B/C, ricerca, filtri e quantità modificabili; kit; file e controlli con l'anteprima delle righe) e riepilogo sempre visibile, file **Ordine cliente (OC)** e/o **Ordine fornitore (OF)** nel tracciato di Integra; le quantità esportate restano impegnate finché Integra non registra l'ordine; *Annulla esportazione* le rilascia |
| | **Articoli**, **Giacenze** | Da Integra in sola lettura (viste sul database, sincronizzazione ogni 15–60 secondi). Disponibile = giacenza di Integra − impegni; riquadri esauriti, negativi, con impegni aperti |
| | **Alias e kit** | Codici vecchio → nuovo (con "chiede conferma") e kit (articolo → componenti × quantità, acceso/spento); modifiche solo all'amministratore |
| Anagrafiche | Fornitori, Subagenti, Clienti | Clienti e fornitori da Integra in **sola lettura**; nel CRM condizioni, percentuali **datate**, eccezioni, subagenti e **agenzie del cliente** (fornitore, codice, subagente, sconto) |
| Gestione (gruppo richiudibile) | **Utenti e ruoli** | Utenti condivisi con la Gestione Ordini; ruoli *Amministratore*, *Operatore*, *Sola lettura*; nuova password via email; tabella di cosa può fare ogni ruolo |
| | **Stato del sistema** | Casella dei documenti, server di lettura, sincronizzazione da Integra, posta in uscita: stato, problemi da vedere (contatore nella barra), ultime esecuzioni |
| | **Impostazioni** | Dati azienda, casella IMAP, server di lettura e soglie, posta in uscita, sincronizzazione da Integra (database, viste, ogni quanti secondi), conservazione; password mai rilette |
| | **Documenti scartati** | Scarto con motivo; recupero (operatore) o eliminazione definitiva (amministratore) |
| | **Guida** | *Come funziona il CRM* (schema del ciclo) e *Comandi comuni*; per ogni pagina sintesi, passi, pulsanti, finestre e regole; ricerca in tutto il testo; pulsante *Guida* in testata a ogni pagina. Contenuti in `assets/guida.js` |

**Prova i ruoli:** in fondo alla barra *Prova come* cambia utente. Con *Giulia Ferri · Lettura* la gestione sparisce, compare la fascia "Profilo in sola lettura", i pulsanti che modificano sono spenti e l'esportazione resta attiva; con *Matteo Caironi · Operatore* restano Stato del sistema, Scartati e Guida.

## Controllo dei dati letti

Ogni documento letto ha un'**affidabilità per campo** (nell'app arriva da GLM-OCR, qui è simulata) e passa da **controlli fissi** (codice cliente presente fra i clienti del fornitore, totale del documento uguale alla somma delle righe, bollettino non già registrato).

- **Livello:** affidabile (tutto ≥ 90 %) · da controllare (un campo fra 70 e 90 % o un controllo fallito) · bassa (un campo sotto 70 % o un controllo grave). Compare nell'elenco e come contatore su *Correggi i dati letti*; con livello basso l'abbinamento chiede conferma.
- **Correggi i dati letti** apre una finestra a tutto schermo: a sinistra il documento com'è stampato, a destra testata e righe modificabili. I campi incerti sono bordati (giallo / rosso con la percentuale); selezionando un campo si evidenzia nel documento; ✓ conferma un valore giusto; si possono aggiungere ed eliminare righe. Il riepilogo in alto elenca i punti da controllare e porta al campo.
- Le righe sono una **DataTable** standard (ordinabile, totale fisso) con celle modificabili. Il codice articolo è un campo di ricerca sugli articoli già usati dal fornitore nei documenti registrati (nel giro agenzia gli articoli non sono nell'anagrafica Decobrands): pallino verde se noto, rosso se nuovo; un articolo nuovo si inserisce lo stesso e non conta fra i punti da controllare. *Aggiungi riga* apre una finestra modale: scegliendo un articolo noto propone descrizione e ultimo prezzo.
- **Prova:** conferma AB-77120 di Gries → quantità della riga 3 letta 12 ma stampata 18 (il totale non torna) e codice della riga 8 letto CI0T-387 con lo zero (affidabilità 86 %) → correggi in 18 e CIOT-387, conferma data e prezzo della riga 5 → lettura affidabile.

> ⚠ **Evidenziazione nel documento: funzione da verificare.** Nel prototipo il documento a sinistra è una pagina simulata, quindi l'evidenziazione è sempre precisa. Con i file reali dipende dal file: attesa precisa sui PDF da gestionale e sugli Excel, possibile approssimata o assente sugli scansionati. La fattibilità si misura con la prova F0-A7 (specifica §6.6) prima di confermarla al cliente.

## Regole di flusso applicate

- **Si torna sempre indietro, nello stesso punto**: ogni schermata aperta da un'altra ha *‹ Torna a …* in testa (come il tasto Indietro del browser); al ritorno filtri, riquadri scelti, ordinamento delle tabelle e scorrimento sono come li avevi lasciati. Prova: Pratiche → filtra, ordina, scorri → apri una pratica → *Torna a Pratiche*.
- **Dati di Integra**: clienti e fornitori (con l'ampliamento anche articoli e giacenze) si leggono da viste sul database di Integra, sincronizzate ogni pochi secondi (sola lettura, niente file da importare); i subagenti, alias e kit si gestiscono nel CRM.
- **Bollettino atteso**: ogni fornitore ha nelle condizioni il giorno del mese successivo entro cui manda il bollettino (iniziale 10). Fino a quel giorno il bollettino è *atteso* (Prossime scadenze), dopo diventa *non arrivato* e in Oggi compare il sollecito.

- **Lo stato della pratica non si scrive a mano**: si ricava dai documenti (ordine → in attesa/in ritardo; conferma → confermata; fattura → fatturata). La nota di credito è un documento, non uno stato.
- **I documenti entrano solo da "Documenti"** (caricamento → lettura automatica → controllo → abbinamento), come nella Gestione Ordini; un codice cliente sconosciuto si corregge o richiede la scelta manuale. Nel prototipo la lettura è simulata: qualsiasi file produce uno dei documenti di esempio.
- **Bollettino**: ogni riga che non quadra va accettata (con motivo) o contestata (motivo obbligatorio); "manca nel bollettino" si può rimandare al mese dopo. Si chiude come verificato o contestato; per la contestazione viene preparato il testo da inviare.
- **Dal fornitore ci aspettiamo** % agente + % subagente dello scaglione; **al subagente liquidiamo** la sua %, con eventuale eccezione personale. Se il fornitore riconosce un importo diverso, al subagente resta quello calcolato sull'imponibile.
- **Maturato / fatturato**: per chi paga sul fatturato (Gasper, Ing's) la provvigione entra nel trimestre del documento; per chi paga sul maturato (Gries) entra quando il bollettino che la riconosce è verificato.
- **Clienti che non pagano** (da Decobrands, 16 e 18/10/2026, spec §5.14): incassa il fornitore, che sollecita Decobrands, che sollecita il cliente. Sul fatturato la provvigione viene stornata 1–2 mesi dopo e riaccreditata al pagamento: lo storno va nella liquidazione successiva, il mese dopo per Decobrands e il trimestre dopo per il subagente, come voce negativa. Sul maturato la provvigione arriva solo nel mese in cui il cliente paga; dopo i giorni d'incasso del fornitore la fattura è *da verificare*. Prova: Bollettini → Gasper agosto (storno di F-2026-0822 → *Prepara il sollecito al cliente*); Oggi → *Pagamenti dei clienti*; pratica OF/2026/028 di Gries (incasso da verificare).
- **Percentuali nel tempo**: le nuove percentuali hanno una data di validità; i documenti si calcolano con quelle in vigore alla loro data.
- **Trimestre**: si chiude solo a trimestre finito e senza documenti in attesa.

## Prova consigliata (5 minuti)

1. **Oggi**: 20 cose da fare divise per tipo; *Prepara i solleciti* prepara un testo per Gries, Gasper e Ing's.
2. **Documenti** → fattura F-2026-0930 di Ing's → *Abbina*: la pratica diventa fatturata e la riga del bollettino di agosto quadra.
3. **Bollettini** → Ing's agosto è "pronto da chiudere" → *Segna come verificato*.
4. **Bollettini** → Gries luglio → *Accetta il loro importo* sulla riga con la promozione → *Segna come verificato*: si sbloccano 505,80 € ai subagenti.
5. **Liquidazioni**: il 3° trimestre si aggiorna; prova *Esporta in Excel* con le tre scelte e i tre formati.
6. **Bollettini** → Gasper agosto: la fattura F-2026-0933 manca → *Contesta* → *Prepara la contestazione*.
7. *(Solo con `index.html?vendita=1`)* **Ordini cliente** → OC-2026-121 (12 alias e 6 kit) → *Esporta per Integra*: scorri le schede. Poi OC-2026-118 → *Esporta per Integra*: VASA-3050 si divide 20 sul vecchio e 40 sul nuovo, KIT-BALC60 esaurito diventa balconetta + sottobalconetta; scegli OC e OF → *Genera i file*. In **Giacenze** → BALC-601 compare l'impegno; *Prototipo: simula la registrazione in Integra* lo chiude.
8. **Carica documenti** (barra a sinistra) con un file qualsiasi: arriva la fattura F-2026-0951 → abbinala. Ricarica: arriva l'ordine OF/2026/052 → *Apri la pratica*. In **Bollettini** → *Carica un bollettino*: Gasper giugno → *Registra e verifica*.

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

**Schede** (`CRM.Schede`) dove un dettaglio impilava più tabelle: fornitore (percentuali · clienti seguiti), cliente (agenzie · pratiche con filtro; prova *Garden Store Brianza*: 10 agenzie e 34 pratiche), utente (dati · permessi), Oggi (scadenze · ultime operazioni), Alias e kit, esportazione per Integra.

Ogni vista è **solo composizione** di componenti `CRM.*` parametrizzati (`assets/componenti.js`); il catalogo con esempi dal vivo e parametri è nella voce **Componenti** della barra.

- Stessi nomi e parametri del primo prototipo: `Pagina`, `Pannello`, `DataTable`, `FilterBar`, `KpiRow`, `Form`, `FormModal`, `Modale`, `Conferma`, `Avviso`, `stato`.
- Propri di questi flussi: `Caricamento`, `FinestraAffiancata`, `CampoRicerca` + `RicercaEntita` (campi collegati a entità: autocompletamento con 5 voci, lente / F4 per la maschera di ricerca, pallino se il valore esiste; **selezione singola o multipla** con `multipla: true`; entità in `assets/entita.js`), `ListaDaFare`, `ElencoSelezionabile`, `Scelte`, `Binario`, `Matrice`, `Cerniera`, `Periodi`, `PeriodoMesi`, `Grafico` (Chart.js; clic come filtro, immagine per l'esportazione), `Cifre`, `Dettagli`, `Elenco`, `TestoDaInviare`.

`DataTable` occupa sempre lo spazio disponibile, con intestazione fissa, righe scorrevoli, intestazioni ordinabili e totali fissi; con `naturale` prende l'altezza del contenuto (righe di un documento).

## File

```
index.html                    pagina unica
assets/dati.js                dati di prova organizzati per flusso
assets/motore.js              regole: stato pratica, scaglioni datati, riconciliazione, liquidazione, abbinamento
assets/componenti.js          libreria CRM.*: componenti standard, icone, rotte
assets/entita.js              entità dei campi di ricerca (fornitore, cliente, subagente, codice cliente, articolo, pratica, fattura)
assets/viste-giorno.js        Oggi, Documenti in arrivo, Pratiche, Pratica
assets/viste-periodo.js       Bollettini, Bollettino, Liquidazioni (con Report subagenti)
assets/viste-analisi.js       Analisi: BI con filtri, filtro incrociato, grafici ed esportazione
assets/viste-anagrafiche.js   Fornitori, Subagenti, Clienti (con agenzie)
assets/viste-componenti.js    catalogo dei componenti
assets/stile.css              palette Decobrands e stile dei componenti
assets/logo-decobrands.png    logo
```

## Perché

Ogni scelta del prototipo ha il suo motivo nel **registro delle decisioni** della specifica (§19). Prima di cambiare un comportamento che sembra strano, leggi lì perché è così.
