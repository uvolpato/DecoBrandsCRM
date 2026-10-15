# Decobrands CRM — Supporto alle decisioni con modelli (idee e strumenti)

Estratto dalla specifica v2.9, §18.

## Fase successiva: supporto alle decisioni e all'analisi con modelli

**Non in questa fase** e fuori dal preventivo: raccolta di idee e strumenti da valutare
dopo la messa in esercizio, con una prova misurata prima di ogni adozione.

###1 Principi

1. **I numeri li calcola il programma**, mai il modello: il modello riceve importi,
   percentuali, date e storico già calcolati e si limita a classificare, spiegare,
   proporre o scrivere.
2. **Il modello propone, l'operatore decide**: nessuna azione automatica; ogni proposta
   ha un pulsante di conferma e si può ignorare.
3. **Ogni proposta mostra le prove** (i dati su cui si basa, con i collegamenti) e, quando
   c'è, la **probabilità**; sotto una soglia la proposta non si mostra.
4. **Si registra tutto**: proposta, probabilità, scelta dell'operatore (tabella
   `suggerimenti`, §18.5). Così si misura quanto il modello ci prende e se vale la pena.
5. **I dati non escono**: modelli in locale sul server con scheda video di GLM-OCR (§6.5);
   in alternativa un servizio esterno solo con contratto sul trattamento dei dati.
6. **Rispetto dei ruoli** (§8.3): le proposte che portano a una modifica compaiono solo a
   chi può modificare; le analisi in sola lettura a tutti.

###2 Idee (ordinate per valore rispetto allo sforzo)

| # | Idea | Cosa fa | Dove compare | Strumento | Valore · sforzo |
|---|---|---|---|---|---|
| 1 | **Spiegare le differenze dei bollettini** | per ogni riga che non quadra propone la causa più probabile (sconto diverso da quello in anagrafica, percentuale vecchia, nota di credito non riconosciuta, fattura del mese sbagliato, errore del fornitore, informazioni insufficienti) con le prove; suggerisce *accetta* o *contesta* e scrive la contestazione in tedesco o inglese | cerniera del bollettino (§7.7) | decisione tipizzata per la causa; modello che scrive per il testo | alto · basso |
| 2 | **Anomalie prima che diventino differenze** | il programma confronta ogni documento con lo storico (prezzo di un articolo fuori dal solito, sconto fuori scaglione, conferme ridotte ricorrenti da un fornitore, ritardi di conferma in peggioramento); il modello decide se è un'anomalia e la riassume in una frase | Oggi (§7.1), gruppo dedicato | statistiche + decisione tipizzata (sì/no + punteggio) | alto · medio |
| 3 | **Domande in italiano sui dati** | es. "quanto ha maturato Nista da Gasper quest'anno rispetto al 2025?": il modello scrive l'interrogazione in **sola lettura** su viste dedicate, il programma la esegue e mostra la tabella con l'interrogazione visibile e i collegamenti | pagina "Chiedi ai dati", per tutti i ruoli | modello che scrive (SQL) su viste in sola lettura | alto · medio |
| 4 | **Riepilogo del trimestre per la direzione** | commento generato dai numeri: fornitori in crescita o in calo, provvigioni bloccate e perché, tempi medi di conferma per fornitore, clienti fermi da mesi | accanto all'esportazione della liquidazione (§11) | modello che scrive | medio · basso |
| 5 | **Leggere le email dei fornitori** | classifica le risposte (conferma in arrivo, ritardo, articolo esaurito, altro) e le allega come nota alla pratica; sospende il sollecito se il fornitore ha già risposto | ingresso documenti (§6.5), pratica (§7.3) | decisione tipizzata (scelta) | medio · medio |
| 6 | **Previsioni semplici** | data probabile di conferma per fornitore, provvigioni attese nel trimestre, quanto si sblocca con il prossimo bollettino sul maturato | Oggi, Liquidazioni | statistiche sullo storico (nessun modello linguistico) | medio · basso |
| 7 | **Lettura che migliora nel tempo** | dalle correzioni in `documenti_campi` propone regole per fornitore (es. "su Ing's la data è in formato tedesco"), da approvare prima dell'uso | Impostazioni › Server di lettura (§7.15) | modello che scrive + approvazione | medio · basso |

**Decisioni tipizzate adatte al CRM** (domande chiuse con probabilità):

| Decisione | Tipo | Dove entra |
|---|---|---|
| Che documento è questo allegato? (ordine · conferma · fattura · nota di credito · bollettino · non riguarda Decobrands) | scelta | prima della lettura (§6.5): smista la coda, propone lo scarto di listini e bolle |
| Perché questa riga del bollettino non quadra? (cause dell'idea 1 + informazioni insufficienti) | scelta + probabilità | cerniera del bollettino |
| A quale pratica va questo documento? (fra le candidate) | scelta | Documenti, abbinamenti "da scegliere" |
| Cosa dice la risposta del fornitore? | scelta | email in arrivo |
| Questa conferma è anomala rispetto allo storico? | sì/no + punteggio | Oggi |
| Quanto è urgente questa voce? | punteggio | ordine dei gruppi di Oggi |
| Il totale letto è plausibile? | sì/no | secondo parere accanto all'affidabilità di GLM-OCR |

###3 Strumenti

| Strumento | A cosa serve | Note |
|---|---|---|
| **Rizzo Flow** (Rizzo AI Academy, licenza Apache 2.0) — versione aperta e locale di **Jev** (TypeSafe) | **decisioni tipizzate** senza generare testo: sì/no, scelta fra opzioni (fino a 26), punteggio, numero, ciascuna con probabilità; risposta di astensione "informazioni insufficienti"; **taratura sui propri dati etichettati** (`rizzo calibrate`) | servizio HTTP locale (`/v1/decisions`, compatibile Jev su `/v1/systemone`); modelli da 4 e 1,7 miliardi di parametri, motore llama.cpp, schede NVIDIA/AMD/Intel/Apple o processore. **Progetto giovane**: provato dai manutentori solo su Windows con scheda NVIDIA, **non protetto per l'esposizione in rete**, nessun limite alle richieste → solo dietro il server del CRM, mai raggiungibile da fuori. Stessa interfaccia del servizio commerciale Jev: si può passare dall'uno all'altro |
| **Modello che scrive, in locale** (modello aperto da 7–14 miliardi di parametri, da scegliere nella prova) servito da **vLLM** | spiegazioni, contestazioni e solleciti in tedesco/inglese, riepiloghi, interrogazioni in sola lettura (idea 3) | stesso server e stesso vLLM di GLM-OCR (§6.5); la memoria video necessaria si misura nella prova |
| **Statistiche sullo storico** (nel motore del CRM) | anomalie (idea 2), previsioni (idea 6) | nessun modello: medie, deviazioni, tempi per fornitore |
| **Viste in sola lettura** sul database | base per le domande sui dati (idea 3) | utente del database con soli permessi di lettura; tempo massimo per interrogazione |

###4 Prova consigliata (prima di qualsiasi interfaccia)

1. **Due decisioni**: *tipo di allegato* e *causa delle differenze nei bollettini*.
2. Il servizio gira **in ombra** per un mese: per ogni caso registra proposta e
   probabilità, senza mostrarle; l'operatore lavora come sempre e la sua scelta diventa
   l'etichetta.
3. **Taratura** di Rizzo Flow sulle etichette raccolte.
4. **Misure**: % di proposte corrette sopra soglia, % di astensioni, errori gravi (es.
   "accetta" proposto dove l'operatore ha contestato), tempo per decisione.
5. **Decisione**: si mostra in interfaccia solo la decisione con **≥ 90 % di proposte
   corrette sopra soglia**; le altre restano in ombra o si abbandonano.
6. Poi, nello stesso modo, le idee 1 (testo della contestazione) e 2.

**Stima indicativa** (da quotare a parte): installazione dei servizi e registro dei
suggerimenti 6 h; prova in ombra delle due decisioni 8 h; taratura e relazione 4 h.

###5 Dati

Tabella `suggerimenti`: `id`, `tipo` (es. `tipo_allegato`, `causa_differenza`),
`riferimento` (documento, riga di bollettino, pratica), `stato_in_ingresso` JSONB (i dati
passati al modello), `proposta`, `probabilita`, `modello` (nome e versione),
`mostrata` (bool), `scelta_operatore`, `scelto_da`, `scelto_il`. Conservazione come il
registro eventi (§7.15). È la base per tarare e misurare.

###6 Fonti

- [Rizzo Flow — repository (Rizzo AI Academy)](https://github.com/Rizzo-AI-Academy/rizzo-flow),
  consultato il 16/10/2026: scopo ("decisioni tipizzate da un modello senza generare
  testo"), primitive e servizio HTTP, modelli e motore, licenza, avvertenze su sicurezza e
  piattaforme provate.
- vLLM e GLM-OCR: vedi §6.6.4.

