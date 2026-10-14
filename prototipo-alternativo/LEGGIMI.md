# Decobrands — prototipo alternativo

Prototipo indipendente dal primo (`prototipo-crm/`): stessa materia, ma costruito sui **flussi di lavoro** invece che sulle tabelle, e con un'identità grafica propria. Si apre con `index.html` (doppio clic, nessun server, nessuna libreria esterna).

## Idea

Il lavoro vero è **quadrare i conti** con un ritmo preciso: ogni giorno arrivano documenti, ogni mese arrivano i bollettini, ogni trimestre si liquidano i subagenti. La navigazione segue quel ritmo:

| Cadenza | Pagina | A cosa serve |
|---|---|---|
| Ogni giorno | **Oggi** | Lista unica "Da fare" in ordine di urgenza, cifre del trimestre, ultime operazioni |
| | **Documenti in arrivo** | Conferme e fatture lette in automatico: il sistema propone la pratica (codice cliente del fornitore + articoli in comune), tu confermi |
| | **Pratiche** | Elenco filtrabile; la scheda mostra il **binario** ordine → conferma → fattura → nota di credito con le differenze fra le fasi |
| Ogni mese | **Bollettini** | Matrice fornitore × mese: verificato, da decidere, pronto, non arrivato (con sollecito) |
| | Bollettino | Riconciliazione **a cerniera**: a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura |
| Ogni trimestre | **Liquidazioni** | Trimestri fissi, schede per subagente, documenti liquidabili o in attesa, prospetti CSV a 8 campi, chiusura |
| Anagrafiche | Fornitori, Subagenti, Clienti e abbinamenti | Condizioni, percentuali **datate**, eccezioni, abbinamento cliente × fornitore con codice |

## Regole di flusso applicate

- **Lo stato della pratica non si scrive a mano**: si ricava dai documenti (ordine → in attesa/in ritardo; conferma → confermata; fattura → fatturata). La nota di credito è un documento, non uno stato.
- **I documenti entrano solo da "Documenti in arrivo"** e si abbinano alla pratica; un codice cliente sconosciuto richiede la scelta manuale.
- **Bollettino**: ogni riga che non quadra va accettata (con motivo) o contestata (motivo obbligatorio); "manca nel bollettino" si può rimandare al mese dopo. Si chiude come verificato o contestato; per la contestazione viene preparato il testo da inviare.
- **Dal fornitore ci aspettiamo** % agente + % subagente dello scaglione; **al subagente liquidiamo** la sua %, con eventuale eccezione personale. Se il fornitore riconosce un importo diverso, al subagente resta quello calcolato sull'imponibile.
- **Maturato / fatturato**: per chi paga sul fatturato (Gasper, Ing's) la provvigione entra nel trimestre del documento; per chi paga sul maturato (Gries) entra quando il bollettino che la riconosce è verificato.
- **Percentuali nel tempo**: le nuove percentuali hanno una data di validità; i documenti si calcolano con quelle in vigore alla loro data.
- **Trimestre**: si chiude solo a trimestre finito e senza documenti in attesa.

## Prova consigliata (5 minuti)

1. **Oggi**: 10 cose da fare, in ordine di urgenza.
2. **Documenti in arrivo** → fattura F-2026-0930 di Ing's → *Abbina*: la pratica diventa fatturata e la riga del bollettino di agosto quadra.
3. **Bollettini** → Ing's agosto è "pronto da chiudere" → *Segna come verificato*.
4. **Bollettini** → Gries luglio → *Accetta il loro importo* sulla riga con la promozione → *Segna come verificato*: si sbloccano 505,80 € ai subagenti.
5. **Liquidazioni**: il 3° trimestre si aggiorna; prova *Scarica i prospetti*.
6. **Bollettini** → Gasper agosto: la fattura F-2026-0933 manca → *Contesta* → *Prepara la contestazione*.

Le modifiche restano salvate nel browser; *Ripristina i dati di prova* (in basso a sinistra) riporta tutto all'inizio. Data simulata: 4 settembre 2026.

## Grafica

| Token | Valore | Uso |
|---|---|---|
| Carta | `#ECEFEC` | sfondo |
| Inchiostro | `#1F2522` | testo |
| Abete | `#1E4D3F` | barra laterale, azioni principali |
| Ottone | `#B8913A` | solo la cerniera del bollettino e la voce attiva |
| Ambra / rosso / abete tenue | `#8E5400` · `#A3243B` · `#DFEBE5` | stati: in attesa, problema, a posto |

Carattere **Public Sans** (licenza OFL, incorporato in `assets/font/public-sans.css`), cifre tabellari per allineare gli importi. Importi in formato italiano (`1.234,56 €`).

## File

```
index.html                    pagina unica
assets/dati.js                dati di prova organizzati per flusso
assets/motore.js              regole: stato pratica, scaglioni datati, riconciliazione, liquidazione, abbinamento
assets/componenti.js          tabella standard, finestra modale, avvisi, icone, rotte
assets/viste-giorno.js        Oggi, Documenti in arrivo, Pratiche, Pratica
assets/viste-periodo.js       Bollettini, Bollettino, Liquidazioni
assets/viste-anagrafiche.js   Fornitori, Subagenti, Clienti e abbinamenti
assets/stile.css              stile e token
```
