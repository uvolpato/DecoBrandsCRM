# PRD — Supporto alle decisioni con modelli linguistici e agenti in locale (Decobrands CRM)

**Versione:** 0.1 (bozza) · **Data:** 18/10/2026 · **Autore:** Ugo Volpato (con Claude Code)
**Stato:** proposta, **fase successiva** alla messa in esercizio del CRM; fuori dal preventivo attuale
**Fonti:** `specifica-crm-provvigioni.md` §6.5, §18, V11, V12, D-28 · `idee-supporto-decisioni.md` ·
`PRD-crm-provvigioni.md`

> Segni usati: 🔶 **Ipotesi** (plausibile, non verificata) · 🔵 **Domanda aperta**.
>
> ⚠ **Vincolo che vale per tutto il documento (V12, D-28).** I numeri li calcola **il backend
> del CRM** dai dati del database, **mai il modello** e mai il browser. Il modello riceve dati
> già calcolati e si limita a **classificare, spiegare, proporre o scrivere**. Ogni proposta
> passa dall'operatore: nessuna azione automatica.

---

## 1. Sintesi

Il CRM rende ordinato il lavoro: i documenti si leggono in automatico, i bollettini si
riconciliano, la liquidazione si calcola da sola. Restano però molte **decisioni ripetitive**
che fa l'operatore:
- che documento è questo allegato;
- perché questa riga del bollettino non quadra;
- a quale pratica va questo documento;
- cosa risponde il fornitore;
- come scrivere la contestazione in tedesco.

**Proponiamo** di affiancare all'operatore un modello linguistico e agenti **in locale**, sullo
stesso server con scheda video di GLM-OCR. Fanno **proposte con la probabilità e le prove**,
che l'operatore accetta o ignora.

Si parte **in ombra**: per un mese il sistema registra le proposte senza mostrarle e le
confronta con le scelte reali. Si mostra all'operatore solo ciò che arriva ad almeno **90 % di
proposte corrette**.

**Impatto atteso** 🔶:
- meno tempo per documento e per bollettino;
- contestazioni pronte;
- anomalie viste prima che diventino differenze;
- nessun dato fuori dall'azienda.

---

## 2. Il problema

### 2.1 Chi lo ha

L'operatore della pratica (*Matteo*, ruolo *Operatore*) e, per le domande sui numeri, la
direzione (*Marco*).

### 2.2 Cosa resta manuale anche con il CRM

| Lavoro | Oggi nel CRM | Cosa resta all'operatore |
|---|---|---|
| Smistare gli allegati della casella | la lettura propone il tipo dai campi | listini, pubblicità e bolle si scartano a mano; il tipo dubbio si sceglie a mano |
| Riconciliare il bollettino | il CRM mostra la differenza riga per riga | capire **perché** (sconto, percentuale vecchia, nota di credito, mese sbagliato, errore del fornitore) e scrivere la contestazione in tedesco o inglese |
| Abbinare documenti dubbi | proposta per codice cliente e articoli | scegliere fra più pratiche candidate |
| Email dei fornitori | non entrano nel CRM | leggerle, capire se confermano o ritardano, ricordarsi di non sollecitare |
| Anomalie | nessuna | accorgersi a occhio di prezzi o sconti strani e di ritardi che peggiorano |
| Domande sui numeri | pagina Analisi con filtri | le domande fuori dagli schemi richiedono esportazioni ed Excel |
| Testi | solleciti già precompilati | adattarli, tradurli, scrivere il commento del trimestre |

### 2.3 Prove

- 🔵 Non ci sono ancora misure: il CRM non è in esercizio. Le misure verranno dalla tabella
  `suggerimenti` (§5.5) e dal registro eventi.
- 🔶 Le cause delle differenze nei bollettini sono poche e ricorrenti: risposte di Matteo,
  punti 5 e 11 dell'analisi.

---

## 3. Utenti

- **Operatore**: riceve le proposte nelle pagine dove lavora già (Documenti, Bollettino, Pratica,
  Oggi). Vuole capire **perché** il sistema propone una cosa, prima di accettarla.
- **Direzione**: fa domande in italiano sui numeri e legge il commento del trimestre.
- **Amministratore**: attiva o spegne ogni funzione, regola le soglie, guarda le misure.
- **Sola lettura**: vede analisi e risposte, non le proposte che modificano qualcosa (§8.3
  della specifica).

---

## 4. Contesto strategico

- **Perché in locale**:
  - i documenti e i numeri delle provvigioni non escono dall'azienda (V11);
  - nessun costo per richiesta;
  - si riusa il server GPU già previsto per GLM-OCR.
- **Perché dopo il CRM**: servono storico e correzioni reali (`documenti_campi`, scelte nei
  bollettini). Senza dati veri la taratura non è possibile.
- **Perché "in ombra" prima**: il cliente prende per certo ciò che vede. Una proposta sbagliata
  mostrata subito costa fiducia: è meglio misurare prima.

---

## 5. La soluzione

### 5.1 Principi (spec §18.1)

1. **I numeri li calcola il programma**, sul backend (V12, D-28).
2. **Il modello propone, l'operatore decide**: un pulsante per accettare, la proposta si può
   ignorare.
3. **Ogni proposta mostra le prove** (dati e collegamenti) e la **probabilità**; sotto la soglia
   non si mostra.
4. **Si registra tutto** nella tabella `suggerimenti`.
5. **I dati non escono**: tutto in locale.
6. **Rispetto dei ruoli**: chi non può modificare non vede proposte che modificano.

### 5.2 Le funzioni (dal valore più alto)

| # | Funzione | Dove compare | Cosa fa | Tipo |
|---|---|---|---|---|
| 1 | **Smistamento della casella** | prima della lettura, Documenti | tipo dell'allegato (ordine, conferma, fattura, nota di credito, bollettino, sollecito, non riguarda Decobrands); propone lo scarto | decisione chiusa |
| 2 | **Causa delle differenze del bollettino** | Bollettino (cerniera) | causa più probabile con le prove, *accetta* o *contesta*, testo della contestazione in tedesco o inglese | decisione chiusa + testo |
| 3 | **Agente di abbinamento** | Documenti, "Scegli la pratica" | cerca le pratiche candidate con le API del CRM e propone quale, con i motivi | agente |
| 4 | **Email dei fornitori** | Documenti, Pratica | conferma in arrivo, ritardo, esaurito, altro; allega la nota alla pratica; sospende il sollecito | decisione chiusa |
| 5 | **Anomalie** | Oggi, gruppo dedicato | il backend trova prezzi, sconti e ritardi fuori norma; il modello decide se segnalarli e li riassume | statistiche + decisione |
| 6 | **Domande in italiano** | pagina "Chiedi ai dati" | l'agente interroga viste in sola lettura; mostra tabella, interrogazione e collegamenti | agente |
| 7 | **Testi pronti** | solleciti, Liquidazioni | solleciti adattati e tradotti; commento del trimestre per la direzione | testo |
| 8 | **Lettura che impara** | Impostazioni › Server di lettura | dalle correzioni propone regole per fornitore, da approvare | testo + approvazione |

### 5.3 Come funziona

```
evento nel CRM (documento letto, bollettino caricato, domanda)
  → backend prepara i dati GIÀ CALCOLATI (importi, %, storico)       ← V12
  → servizio locale: decisione chiusa (Rizzo Flow) o modello che scrive/agente (vLLM)
  → proposta + probabilità + prove  → registrata in `suggerimenti`
  → sopra soglia e funzione attiva: mostrata all'operatore
  → l'operatore accetta / modifica / ignora → la scelta è registrata e diventa etichetta
  → l'azione (se accettata) la esegue il backend con le sue regole e i suoi permessi
```

### 5.4 Strumenti

| Strumento | Uso | Note |
|---|---|---|
| **Rizzo Flow** (Apache 2.0, versione locale di Jev) | decisioni chiuse con probabilità e astensione; taratura sui dati etichettati | progetto giovane, **non esposto in rete**, solo dietro il server del CRM |
| **Modello aperto da 7–14 miliardi di parametri** su **vLLM** | testi, spiegazioni, agenti con chiamata di strumenti | stesso server di GLM-OCR; memoria video da misurare |
| **Strumenti degli agenti** | solo **API del CRM** e **viste in sola lettura** | nessuna scrittura diretta sul database; utente con soli permessi di lettura e tempo massimo per interrogazione |
| **Statistiche del backend** | anomalie, previsioni | nessun modello: medie, deviazioni, tempi |

### 5.5 Dati

Tabella `suggerimenti` (spec §18.5) con questi campi:
- `id`, `tipo` (es. `tipo_allegato`, `causa_differenza`), `riferimento`;
- `stato_in_ingresso` (JSONB con i dati passati al modello);
- `proposta`, `probabilita`, `modello`;
- `mostrata`, `scelta_operatore`, `scelto_da`, `scelto_il`.

La conservazione segue il registro eventi. In più, nelle Impostazioni ogni funzione ha
*attiva · in ombra · spenta* e una soglia propria.

---

## 6. Misure di successo

### 6.1 Misura principale

**Proposte corrette sopra soglia**, per ogni funzione: ≥ **90 %** per mostrarla all'operatore
(spec §18.4).

### 6.2 Misure secondarie 🔶

| Misura | Obiettivo |
|---|---|
| Tempo medio per documento in Documenti | −30 % rispetto al mese prima |
| Tempo per riconciliare un bollettino | −40 % |
| Contestazioni scritte senza modifiche | ≥ 60 % |
| Astensioni ("informazioni insufficienti") | ≤ 20 % |
| Proposte accettate / mostrate | ≥ 70 % |

### 6.3 Misure di guardia

- **Errori gravi** (es. *accetta* proposto dove l'operatore ha contestato; scarto proposto di un
  documento valido): ≤ **1 %**. Sopra questa soglia la funzione torna in ombra.
- **Nessun numero** calcolato dal modello finisce in un importo salvato (V12).
- **Nessun dato fuori dall'azienda.**
- La lettura GLM-OCR non rallenta: tempi per pagina invariati con i servizi nuovi attivi.

---

## 7. Storie e requisiti

### 7.1 Ipotesi

> Crediamo che proposte locali con probabilità e prove, mostrate solo quando affidabili,
> riducano il tempo per documento e per bollettino senza aumentare gli errori. Lo misureremo con
> le proposte corrette sopra soglia e i tempi delle operazioni, dopo un mese in ombra e un mese
> attive.

### 7.2 Storie

**S1 — Funzionamento in ombra.** Come amministratore voglio attivare una funzione in ombra, per
misurarla senza disturbare.
- [ ] Ogni funzione ha lo stato *spenta · in ombra · attiva* e una soglia.
- [ ] In ombra le proposte si registrano e non si mostrano.
- [ ] La pagina delle misure riporta, per funzione: corrette sopra soglia, astensioni, errori
      gravi, tempo per decisione.

**S2 — Smistamento della casella** (funzione 1).
- [ ] Ogni allegato riceve il tipo proposto, con probabilità.
- [ ] *Non riguarda Decobrands* sopra soglia propone lo scarto con il motivo; non scarta da solo.
- [ ] La scelta dell'operatore aggiorna `suggerimenti`.

**S3 — Causa delle differenze** (funzione 2).
- [ ] Su ogni riga che non quadra: causa proposta, probabilità, prove (sconto in anagrafica,
      versione delle percentuali, nota di credito, mese della fattura).
- [ ] *Accetta* o *Contesta* proposto; il clic resta all'operatore.
- [ ] *Prepara la contestazione* genera il testo in tedesco o inglese; importi e numeri vengono
      dal backend, non dal modello.

**S4 — Agente di abbinamento** (funzione 3).
- [ ] Per un documento "da scegliere" l'agente propone una pratica con i motivi.
- [ ] L'agente usa solo API di lettura; l'abbinamento lo esegue il backend dopo il clic.

**S5 — Email dei fornitori** (funzione 4).
- [ ] Le email senza allegato della casella si classificano.
- [ ] Una conferma in arrivo o un ritardo sospendono il sollecito della pratica, con nota visibile.

**S6 — Anomalie** (funzione 5).
- [ ] Il backend calcola gli scostamenti dallo storico.
- [ ] Il modello decide se segnalarli e scrive una frase; la voce compare in Oggi con le prove.

**S7 — Chiedi ai dati** (funzione 6).
- [ ] Domanda in italiano → interrogazione su viste in sola lettura, con tempo massimo.
- [ ] La risposta mostra tabella, interrogazione e collegamenti.
- [ ] Senza viste adatte risponde "non posso rispondere", non inventa.

**S8 — Testi** (funzione 7).
- [ ] Solleciti e commento del trimestre generati dai numeri del backend.
- [ ] Il testo è sempre modificabile prima di copiarlo o inviarlo.

**S9 — Lettura che impara** (funzione 8).
- [ ] Le regole proposte per fornitore valgono solo dopo l'approvazione dell'amministratore.

### 7.3 Vincoli

- **V12 / D-28** per ogni storia: un valore prodotto dal modello non diventa mai un importo, una
  percentuale o uno stato senza passare dalle regole del backend.
- Rizzo Flow e vLLM sono raggiungibili **solo** dal backend del CRM.
- Ogni proposta mostrata ha le prove; senza prove non si mostra.

---

## 8. Fuori ambito

| Escluso | Perché |
|---|---|
| Azioni automatiche senza conferma (abbinare, scartare, contestare da solo) | il cliente deve restare in controllo; si valuta dopo mesi di misure |
| Invio automatico di email | regola del CRM: solo avvisi nell'app (§5.12) |
| Modelli esterni in cloud | i dati non escono; ammessi solo con contratto sul trattamento dei dati, decisione a parte |
| Riaddestramento del modello GLM-OCR | possibile con l'archivio di `documenti_campi`, ma è un progetto a sé |
| Calcolo di importi da parte del modello | vietato da V12 |

---

## 9. Dipendenze e rischi

### 9.1 Dipendenze

- CRM in esercizio da **almeno 1–2 mesi**, con storico di correzioni e scelte.
- Server GPU con memoria sufficiente per GLM-OCR **e** il modello che scrive (🔵 da misurare
  nella prova F0-A6).
- Viste in sola lettura per "Chiedi ai dati".

### 9.2 Rischi

| Rischio | Contromisura |
|---|---|
| Proposte sbagliate che fanno perdere fiducia | ombra + soglia 90 %; errori gravi oltre l'1 % → si torna in ombra |
| Memoria video insufficiente per due modelli | misura in F0-A6; modello più piccolo o orari diversi; in alternativa una seconda scheda video |
| Rizzo Flow progetto giovane | solo dietro il backend; stessa interfaccia del servizio commerciale Jev per cambiare |
| Il modello "inventa" numeri o fatti | i numeri arrivano dal backend; la proposta mostra le prove; "Chiedi ai dati" mostra l'interrogazione |
| Prompt injection da email o documenti | il testo letto è solo dato; gli agenti hanno solo strumenti di lettura; le azioni le fa il backend dopo il clic |
| Lentezza | le decisioni chiuse sono rapide; testi e agenti su richiesta, non per ogni documento |

---

## 10. Domande aperte

- 🔵 Memoria video e tempi del server con GLM-OCR e un modello da 7–14 miliardi insieme.
- 🔵 Quale modello aperto scrive meglio in tedesco commerciale? Da scegliere nella prova.
- 🔵 Le email dei fornitori arrivano nella stessa casella dei documenti?
- 🔵 Chi guarda le misure e decide di attivare una funzione: Ugo o Matteo?
- 🔵 Quali domande fa davvero la direzione? Servono per progettare le viste di "Chiedi ai dati".

---

## 11. Piano e stima (indicativa, da quotare a parte)

| Fase | Contenuto | Ore | Si passa avanti se |
|---|---|---|---|
| P0 | CRM in esercizio, storico raccolto | — | 1–2 mesi di dati reali |
| P1 | Servizi locali (Rizzo Flow, vLLM), tabella `suggerimenti`, stati delle funzioni, pagina delle misure; funzioni 1 e 2 **in ombra** | 14 | — |
| P2 | Taratura sulle etichette del mese; attivazione di ciò che passa la soglia | 4 | ≥ 90 % sopra soglia, errori gravi ≤ 1 % |
| P3 | Funzioni 3, 4, 7 (abbinamento, email, testi), in ombra e poi attive | 10–12 | P2 superata |
| P4 | Funzioni 5, 6, 8 (anomalie, Chiedi ai dati, regole di lettura) | 12–15 | scelta del cliente |
| | **Totale indicativo** | **40–45** | |

---

## 12. Autovalutazione

- **Più solido**: principi e vincoli. Derivano dalla specifica §18 e da V12.
- **Più debole**: misure e tempi. Non ci sono ancora dati: dipendono dalla fase in ombra.
- **Ipotesi da verificare per prime**:
  1. il server regge due modelli;
  2. le cause delle differenze sono poche e riconoscibili;
  3. il tedesco del modello locale basta per le contestazioni.
- **Prossimo passo**:
  1. misurare la memoria video in F0-A6;
  2. dopo la messa in esercizio, avviare P1 con le funzioni 1 e 2 in ombra.
