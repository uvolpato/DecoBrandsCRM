# PRD — CRM Ordini a fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 1.0 · **Data:** 18/10/2026 · **Autore:** Ugo Volpato (con Claude Code)
**Stato:** bozza da rivedere con Decobrands (Matteo Caironi) prima della condivisione
**Fonti sintetizzate:** `specifica-crm-provvigioni.md` v4.9 (fonte di verità), `piano-lavoro-crm.md` v1.4,
`preventivo-crm-provvigioni.md` (aggiornato al 15/10/2026), `ANALISI_CRM_PROVVIGIONI.md`,
`idee-supporto-decisioni.md`, `mtngfxeo-specifica-app-gestione-ordini.md` (sistema esistente),
`prototipo-alternativo/LEGGIMI.md`, `app/README.md`, `CLAUDE.md`.
Escluso: `mtnfhbwr-preventivo.md` (altro progetto: convertitore XML → Excel).

> **Come leggerlo.** Questo PRD dice *cosa* si costruisce, *per chi*, *perché* e *come si
> misura*. Il *come* (tabelle, colonne, API, testi esatti) resta nella **specifica**: ogni
> sezione rimanda al paragrafo (§) giusto. In caso di conflitto vincono, nell'ordine, il
> prototipo ufficiale `prototipo-alternativo/` (D-24), la specifica, questo PRD.
>
> Segni usati: 🔶 **Ipotesi** (plausibile, non verificata) · 🔵 **Domanda aperta** (da chiarire).

---

## 1. Sintesi

Decobrands SRL fa da **agente** per alcuni fornitori (Gries, Gasper, Ing's, Nordgarten, …)
verso garden center e vivai. Si appoggia a **subagenti** che seguono i clienti. Oggi il ciclo
delle provvigioni è diviso fra:
- un Excel per fornitore, compilato a mano (ordini, conferme, fatture);
- nessun controllo sistematico dei bollettini dei fornitori;
- un CRM (Woodoo) che copre solo la liquidazione ai subagenti.

**Costruiamo un'unica applicazione web** in cui ordine, conferma, fattura, bollettino e
liquidazione sono **lo stesso dato visto da tre angolazioni**. I documenti entrano da un solo
ingresso: casella email e caricamento. Li legge **GLM-OCR in locale**, l'operatore li
controlla e il CRM li abbina da solo. Il CRM poi:
- confronta riga per riga i bollettini mensili con il proprio calcolo;
- calcola al volo la liquidazione trimestrale ai subagenti, con esportazione in Excel, PDF e CSV;
- offre un'analisi (BI) per periodo, fornitore, subagente e cliente.

**Impatto atteso:** niente più doppie digitazioni, provvigioni non riconosciute scoperte ogni
mese invece che mai, liquidazione trimestrale prodotta senza ricalcoli a mano, dati che non
escono dall'azienda.

**Investimento:** 105 h, € 6.175 (16 h già svolte + 89 h da svolgere, margine incluso).
In più ci sono **53 h fuori preventivo da approvare** (§10.3).

---

## 2. Il problema

### 2.1 Chi ha il problema

- **Chi lavora le pratiche in Decobrands**: sales assistant e operatori. Inseriscono gli
  ordini, attendono conferme e fatture, controllano i bollettini.
- **La direzione** (Marco): deve sapere quanto rende ogni fornitore e ogni subagente e
  risolvere i casi di attribuzione.
- **I subagenti**: ricevono ogni trimestre il prospetto delle provvigioni.

### 2.2 Qual è il problema

L'analisi individua tre obiettivi. Il sistema attuale ne copre uno solo:

| Obiettivo | Oggi | Problema |
|---|---|---|
| 1. Tracciare ordine → conferma → fattura | un **Excel per fornitore**, aggiornato a mano in tre momenti; a riga completa si riporta nel CRM | stessi dati scritti due volte; il processo vive fuori dal sistema; nessun avviso se la conferma non arriva |
| 2. Controllare i bollettini mensili dei fornitori | **a mano o per niente** | provvigioni non riconosciute, percentuali sbagliate, fatture dimenticate non vengono scoperte |
| 3. Liquidare i subagenti ogni trimestre | CRM Woodoo (rendiconto congelato) | rendiconto fermo: se si corregge un importo o una percentuale non si riallinea |

### 2.3 Perché fa male

- **Soldi persi**: senza controllo sistematico, ogni errore del fornitore a sfavore di
  Decobrands passa inosservato. 🔶 Ipotesi: l'importo annuo delle differenze non recuperate
  è rilevante; 🔵 Domanda aperta: c'è una stima storica?
- **Tempo**: doppia digitazione per ogni documento, ricontrollo a mano dei bollettini e
  ricalcolo della liquidazione.
- **Fiducia con i subagenti**: un prospetto ricalcolato a mano è difficile da spiegare e da
  correggere.
- **Insoluti**: Decobrands non incassa, incassa il fornitore. Quando un cliente non paga, la
  provvigione viene stornata, ma oggi nessuno lega lo storno alla fattura, al cliente da
  sollecitare e alla liquidazione del subagente.

### 2.4 Prove

- **Analisi con il cliente**: 12 domande chiuse da Matteo Caironi (Sales Assistant), riportate
  in `ANALISI_CRM_PROVVIGIONI.md` e integrate nella specifica.
- **Rendiconto verificato**: provvigione agente e provvigione subagente sono due conti separati
  sullo stesso importo. Esempi: 253,83 € × (5 % + 6 %) = 12,69 + 15,23 = 27,92 €;
  210,00 € × (8 % + 12 %) = 16,80 + 25,20 = 42,00 €.
- **Regole degli incassi** chiarite da Decobrands il 16 e il 18/10/2026 (D-11).
- **Prototipo navigabile** con dati realistici: circa 180 controlli automatici in
  `strumenti/prove/flusso.py`.

---

## 3. Utenti e ruoli

### 3.1 Persona principale — l'operatore della pratica ("Matteo")

- **Ruolo**: sales assistant, ruolo CRM *Operatore*.
- **Obiettivi**:
  - ogni pratica avanza senza buchi;
  - ogni bollettino è controllato entro il mese;
  - il trimestre si chiude senza sorprese.
- **Ritmo**:
  - ogni giorno: documenti in arrivo, conferme in ritardo;
  - ogni mese: bollettini;
  - ogni trimestre: liquidazione.
- **Dolori**: Excel per fornitore, ricontrollo riga per riga, solleciti scritti a mano,
  documenti in tedesco o inglese, formati diversi per fornitore.
- **Cosa gli serve**: una lista di cose da fare, il documento affiancato ai dati letti, solo le
  righe che non tornano, testi di sollecito già pronti.

### 3.2 Persona secondaria — la direzione ("Marco")

- **Ruolo**: titolare. Risolve internamente i casi di attribuzione (cliente conteso fra
  subagenti).
- **Cosa gli serve**:
  - fatturato, provvigioni e margine per fornitore, subagente e cliente;
  - confronto con il periodo prima;
  - esportazioni da portare in riunione (pagina **Analisi**).

### 3.3 Persona secondaria — l'amministratore del sistema ("Ugo")

- **Cosa gestisce**: utenti e ruoli, impostazioni (casella, server di lettura, Integra, posta),
  stato dei servizi automatici.

### 3.4 Persona secondaria — chi consulta soltanto

- **Ruolo**: *Sola lettura* (es. commercialista, collaboratore).
- **Cosa può fare**: consulta ed esporta, non modifica nulla (D-05).

### 3.5 Destinatari esterni (non usano l'app)

- **Subagenti** (es. Bastasin, Nista): ricevono il prospetto trimestrale in Excel, PDF o CSV.
- **Fornitori**: ricevono contestazioni e solleciti di conferma o di bollettino (testi
  preparati dal CRM, inviati da Decobrands).
- **Clienti**: ricevono i solleciti di pagamento (🔵 da chi: vedi §10.1).

### 3.6 Lavori da svolgere

| Quando… | voglio… | così che… |
|---|---|---|
| arriva un PDF da un fornitore | che il sistema lo legga e lo abbini alla pratica giusta | non debba ricopiarlo |
| una conferma tarda | sapere quali e preparare un solo sollecito per fornitore | i fornitori ricevano un messaggio ordinato |
| arriva il bollettino | vedere solo le righe che non quadrano e decidere in un clic | il controllo duri minuti, non ore |
| un cliente non paga | vedere lo storno, il cliente da sollecitare e l'effetto sul subagente | nulla si perda fra i mesi |
| finisce il trimestre | esportare il prospetto per ogni subagente | si liquidi senza ricalcoli |
| la direzione chiede "come va Gasper?" | filtrare e confrontare periodi in un attimo | si risponda subito con i numeri |

---

## 4. Contesto strategico

### 4.1 Obiettivi di business

1. **Un solo posto per il ciclo delle provvigioni.** Si spegne l'Excel per fornitore; il CRM
   Woodoo resta solo come storico.
2. **Recupero delle provvigioni non riconosciute** con il controllo mensile dei bollettini.
3. **Liquidazione trimestrale affidabile**, calcolata al volo e coerente con i bollettini:
   bollettini e liquidazione leggono gli stessi dati, quindi non possono divergere.
4. **Documenti che non escono dall'azienda**: lettura in locale, nessun costo per pagina,
   nessun n8n o servizio esterno.

### 4.2 Perché adesso

- La Gestione Ordini esistente (ordini cliente → Integra, con n8n e LlamaIndex) funziona, ma
  dipende da servizi esterni. Il nuovo ingresso documenti è la base per sostituirla in seguito
  (§17 della spec).
- Lo stack del **Portale B2B Luis** è già pronto (accesso, sessioni, CSRF, registro eventi):
  riusarlo fa risparmiare 5 h, reinvestite nella prova di lettura dei documenti.
- Le regole del cliente sono state chiarite il 16 e il 18/10/2026 e il prototipo ufficiale
  è stato fissato (D-24): si può partire con lo sviluppo.

### 4.3 Mercato e concorrenza

Non applicabile: è uno strumento interno su misura. L'alternativa è restare con Excel e
Woodoo, cioè lo status quo.

### 4.4 Vincoli di contesto

- **Database condiviso** con la Gestione Ordini (`decobrands`). Le tabelle esistenti si
  leggono e **non si modificano** (V2).
- **Integra** (gestionale) è il padrone delle anagrafiche clienti e fornitori. Si legge da
  viste, in sola lettura (D-01, D-07).
- **Server GPU** del cliente per GLM-OCR: hardware, sistema operativo e driver a carico del
  cliente.

---

## 5. La soluzione

### 5.1 Il modello in una figura

```
FORNITORE ──provvigione agente──► DECOBRANDS ──provvigione subagente──► SUBAGENTE
          (si controlla: bollettini)           (si liquida: trimestre)

Documenti ─► Pratiche ─► Bollettini ─► Liquidazioni ─► Analisi
 (ogni giorno)            (ogni mese)   (ogni trimestre)
```

Le due percentuali sono **indipendenti**: il subagente non prende una fetta della percentuale
dell'agente. Sono due conti sullo stesso imponibile.

### 5.2 Le regole che reggono tutto (spec §5)

| Regola | Sintesi | § spec |
|---|---|---|
| Scaglioni | Lo sconto del cliente sul fornitore (`interscambio.discount`) cade in uno scaglione che dà % agente e % subagente: più sconto, meno provvigione. Esempio Gries: 0 % → 18/10 · 1 % → 18/0 · 5 % → 13/7 · 10 % → 5/2 · 100 % → 0/0 | §4.2.2, §5.1 |
| Eccezioni | Rarissime: una % personale del subagente vince sullo scaglione; si inseriscono nel CRM dalla scheda del subagente e il motore le applica (D-26) | §5.2 |
| Regole del subagente | In ordine: correzione sul singolo documento (con motivo) → una fattura al mese (la prima o la più alta) → % dell'agenzia per quel cliente → eccezione → scaglione. Solo la quota del subagente: il fornitore si controlla nel bollettino. Lo sconto fittizio non serve più (D-27) | §5.2 |
| Zero, trattino, nota di credito | 0 = nessuna provvigione; `–` = % standard; la nota di credito è un documento con importo negativo, quindi provvigione negativa. Se totale azzera la fattura, se parziale riduce l'imponibile | §5.3 |
| Agente unico | Decobrands SRL; Schwarzmeier e Monzani restano solo come storico | §5.4 |
| Maturato / fatturato | Si imposta per fornitore e vale uguale per Decobrands e per il subagente | §5.5 |
| Cadenze | Bollettini mensili, attesi entro il giorno `giorno_bollettino` (iniziale 10) del mese dopo; sollecito solo dopo quel giorno. Trimestri fissi per i subagenti | §5.6, D-03 |
| La conferma può cambiare | Si salvano tre fotografie delle righe (ordine, conferma, fattura); il confronto si calcola al volo; la provvigione si calcola sul fatturato | §5.8 |
| Multi-ordine / multi-tranche | Una fattura può essere divisa su più pratiche (una quota per pratica) e una pratica può avere più fatture | §5.9 |
| Un subagente per cliente × fornitore | Vincolo unico | §5.10 |
| Percentuali nel tempo | Versioni con data di validità: ogni documento usa quelle in vigore alla sua data (D-25); in più i valori si congelano alla verifica del bollettino | §4.2.2, §5.11 |
| Avvisi solo nell'app | Nessuna email | §5.12 |
| Correzione senza blocchi | Nel bollettino l'operatore accetta l'importo del fornitore o lo corregge; la differenza resta registrata | §5.13 |
| Incassi | Sul fatturato: **storno** se il cliente non paga e **riaccredito** quando paga. Sul maturato: riconoscimento nel mese del pagamento, *incasso da verificare* dopo `giorni_incasso`. Lo storno va alla **liquidazione successiva**: il mese dopo per Decobrands, il trimestre dopo per il subagente, come voce negativa | §5.14, D-11 |

### 5.3 Formula (spec §10)

```
per ogni documento d (fattura > 0, nota di credito < 0):
  versione  = percentuali del fornitore con valido_dal ≤ d.data, la più recente
  scaglione = interscambio.discount ∈ [sconto_min, sconto_max] → pct_agente, pct_subagente
              (pct_override dell'eccezione del subagente, se presente)
  provv_agente(d)    = d.importo × pct_agente / 100
  provv_subagente(d) = regole del subagente (D-27), altrimenti d.importo × pct_subagente / 100
pratica = somma sui documenti; nessuna provvigione su ordine o conferma
```

Il motore gira **solo sul server**: l'interfaccia mostra i valori, non li ricalcola.

### 5.4 Le pagine (spec §7; prototipo `prototipo-alternativo/`)

La barra laterale segue il ritmo del lavoro:

| Cadenza | Pagina | A cosa serve |
|---|---|---|
| sempre | **Carica documenti** | Pulsante sempre presente nella barra |
| Ogni giorno | **Oggi** | Cose da fare per gruppi (conferme in ritardo, documenti da decidere, bollettini, pagamenti da sollecitare); a destra le prossime scadenze, le ultime operazioni e il trimestre in corso |
| | **Documenti** | Unico ingresso: lettura, affidabilità per campo, *Correggi i dati letti* con il PDF a fianco; poi abbina, apri pratica, registra bollettino o scarta |
| | **Pratiche** / Pratica | Elenco con segmenti di stato e filtri standard. Il dettaglio mostra il binario delle fasi e due schede: *Riepilogo* (provvigione, incasso, documenti) e *Righe a confronto*. I documenti si consultano affiancati |
| Ogni mese | **Bollettini** / Bollettino | Matrice fornitore × 6 mesi con selettore a mesi; riconciliazione "a cerniera" (fornitore \| nostro calcolo) e righe d'incasso |
| Ogni trimestre | **Liquidazioni** | Trimestri; a sinistra i subagenti (fanno da filtro), a destra le schede *Documenti* e *Report subagenti*; esportazione; chiusura |
| | **Analisi** | BI su 3, 6 o 12 mesi, filtri a selezione multipla, filtro incrociato, 4 numeri con confronto, 4 grafici, tabella raggruppabile; esportazione Excel con grafici, PDF e CSV |
| Anagrafiche | **Fornitori**, **Subagenti**, **Clienti** | Fornitori e clienti da Integra in sola lettura. Nel CRM: condizioni, percentuali, subagenti e agenzie (cliente × fornitore × subagente × sconto) |
| Gestione | **Utenti e ruoli**, **Stato del sistema**, **Impostazioni**, **Documenti scartati**, **Guida**, **Eventi** | Amministrazione, salute dei servizi, configurazione, recupero degli scarti, guida in linea, registro degli eventi |

### 5.5 Ingresso documenti (spec §6.5)

```
casella IMAP ─┐
caricamento ──┴─► coda (PostgreSQL, SKIP LOCKED) ─► GLM-OCR su vLLM (GPU locale)
  ─► affidabilità per campo + controlli fissi ─► Documenti: controllo dell'operatore
  ─► abbinamento a pratica · nuova pratica · registrazione bollettino
```

- **Affidabilità**:
  - per numeri, codici e date è la probabilità **minima** dei pezzi del valore;
  - per i testi lunghi è la **media**;
  - il documento vale quanto il suo campo peggiore.
- **Livelli** (soglie da tarare):

  | Livello | Quando |
  |---|---|
  | affidabile | tutti i campi ≥ 0,90 |
  | da controllare | un campo fra 0,70 e 0,90, o un controllo fallito |
  | bassa | un campo < 0,70, o un controllo fallito su un campo chiave |

- **Controlli fissi**:
  - totale ≠ somma righe;
  - quantità × prezzo ≠ importo della riga;
  - codice cliente sconosciuto per quel fornitore;
  - articolo assente dalla pratica;
  - data fuori periodo;
  - bollettino doppio.
- **Articoli**: nessun blocco sull'anagrafica articoli (nel giro agenzia gli articoli dei
  fornitori non sono di Decobrands): pallino verde se l'articolo è già noto, rosso se è nuovo.
- **Excel dei bollettini**: si leggono con `exceljs`, senza modello.
- **Evidenziazione del valore nel PDF**: **da verificare** con la prova F0-A7 prima di
  prometterla (D-06, §6.6). Correggere i dati funziona comunque, anche senza.

### 5.6 Esportazione della liquidazione (spec §11)

- **Contenuto** (D-04):
  - *tutto il trimestre diviso per subagente*: riepilogo + un foglio per subagente;
  - *un solo subagente*;
  - *solo riepilogo*.
- **Formati**:
  - **Excel** curato, con formule;
  - **PDF** identico all'Excel (conversione LibreOffice);
  - **CSV** di soli dati (`;`, virgola decimale, UTF-8 con BOM).
- **8 campi** del dettaglio: fornitore, numero documento, data documento, codice cliente,
  ragione sociale, importo documento, % provvigione, importo provvigionale.
- **Righe particolari**: storni e riaccrediti compaiono come voci *Storno F-…* / *Riaccredito
  F-…*, con il trimestre d'origine.

### 5.7 Architettura e stack (spec §3, §16.3)

> ⚠ **Tutto sul backend, MAI dai dati del frontend** (spec V12, D-28): ogni calcolo (provvigioni, bollettini, liquidazione, Analisi, totali, esportazioni) e ogni operazione sensibile (stati, verifiche, chiusure, abbinamenti, correzioni, permessi, eventi) si esegue sul server partendo dal database; il frontend mostra e invia solo le scelte (id, valori digitati, motivo); il server ricarica, ricontrolla e ricalcola, e non salva mai un valore calcolato arrivato dal browser. Il prototipo calcola nel browser solo perché è una dimostrazione.

| Livello | Scelta |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript; `stile.css` del prototipo, Public Sans, niente Bootstrap; Chart.js |
| Backend | NestJS 11 + Prisma 7 (solo tabelle nuove del CRM), DTO `class-validator` |
| Database | PostgreSQL `decobrands`, condiviso; tabelle esistenti in sola lettura |
| Accesso | sessioni su PostgreSQL, argon2, CSRF, Helmet, throttler; tabella `users` condivisa, ruoli CRM in `crm_ruoli_utente` |
| Documenti | `imapflow`, coda su PostgreSQL, `pdftoppm`, GLM-OCR (`zai-org/GLM-OCR`, 0,9 miliardi di parametri) su vLLM ≥ 0.19 |
| Esercizio | server Windows: Caddy (HTTPS) → Next.js `:8001` → `/api/*` → NestJS `:8002`; Node 24; Docker solo in sviluppo; in produzione va solo `app/` (sparse checkout) |
| Riuso da Luis B2B | **solo infrastruttura**: accesso, sessioni, CSRF, Prisma, registro eventi, utilità, inoltro, pubblicazione. Nessun componente, CSS o layout di Luis |

### 5.8 Prototipo = contratto dell'interfaccia (D-24, spec §16.1)

Ogni schermata dell'app deve superare **6 criteri** prima del merge:

1. struttura e navigazione;
2. layout;
3. solo componenti standard, con `stile.css` copiato;
4. testi **identici parola per parola**;
5. interazioni;
6. **stessi numeri** sul seed §12.

La verifica si fa così:
- confronto affiancato nel browser;
- confronto numerico sul seed;
- prova Playwright `strumenti/prove/flusso.py` (deve chiudere con 0 KO).

---

## 6. Misure di successo

> 🔵 **Domanda aperta comune a tutta la sezione:** nessun documento riporta i valori di
> partenza. Vanno misurati sul mese prima dell'avvio (tempi, numero di bollettini controllati,
> differenze trovate). Gli obiettivi sotto sono 🔶 ipotesi da concordare con Decobrands.

### 6.1 Misura principale

**Percentuale dei bollettini mensili verificati o contestati entro la fine del mese successivo.**
- Oggi: 🔵 da misurare (probabilmente vicina allo 0 %: il controllo "si fa a mano o non si fa").
- Obiettivo: 🔶 ≥ 95 % entro 3 mesi dall'avvio.
- Perché questa: è l'obiettivo che oggi manca del tutto ed è dove stanno i soldi.

### 6.2 Misure secondarie

| Misura | Obiettivo 🔶 | Fonte nel CRM |
|---|---|---|
| Excel per fornitore ancora in uso | 0 dopo il primo trimestre completo | uso |
| Differenze dei bollettini scoperte e contestate (€ per trimestre) | da tracciare: è il valore recuperato | `bollettini_righe.differenza`, stato `contestato` |
| Documenti letti al livello *affidabile* | ≥ 70 % dopo la taratura sulle prime centinaia di documenti | `documenti_in_arrivo.livello` |
| Campi corretti a mano per documento | in calo mese su mese | `documenti_campi.verificato`, `valore_letto ≠ valore_finale` |
| Tempo dalla fine del trimestre all'invio dei prospetti ai subagenti | ≤ 2 giorni lavorativi | eventi `export` |
| Conferme oltre la scadenza senza sollecito | 0 | Oggi → Conferme in ritardo |
| Fatture insolute senza sollecito da più di 15 giorni | 0 | `stato_incasso`, `sollecitata_il` |

### 6.3 Misure di guardia (non devono peggiorare)

- **Errori nella liquidazione ai subagenti: 0** (provvigione sbagliata o voce mancante).
- **Nessun documento esce dall'azienda**: nessuna chiamata a servizi esterni (V11).
- **Gestione Ordini invariata**: nessuna modifica alle tabelle esistenti, nessun disservizio
  sugli ordini cliente (V2).
- **Ripresa dei servizi**: il server di lettura fermo non perde documenti. Restano in coda e
  si rileggono alla ripresa.

### 6.4 Misure della consegna

- `strumenti/prove/flusso.py`: 0 KO.
- Checklist dei 6 criteri superata da ogni schermata (F7-A1).
- Test numerici Jest sul seed: stessi risultati del prototipo.
  Casi: Gries 0/1/5/10/100 %, conferma ridotta 7/10, NC-2026-005.
- Prova F0-A7: esito verde, giallo o rosso secondo le soglie della spec §6.6.3.

---

## 7. Storie e requisiti

### 7.1 Ipotesi dell'epica

> Crediamo che riunire documenti, pratiche, bollettini e liquidazioni in un'unica applicazione,
> con lettura automatica dei documenti in locale, porti al controllo di ogni bollettino mensile
> e a una liquidazione senza ricalcoli. Oggi il controllo manca e i dati sono scritti due volte
> fra Excel e CRM. Lo misureremo con la percentuale di bollettini verificati entro il mese
> successivo e con le differenze recuperate, a 3 mesi dall'avvio.

### 7.2 Epiche e storie

I criteri di accettazione riassumono la spec. Testi e comportamenti esatti stanno nel prototipo.

#### E1 · Ingresso documenti (spec §6.5, §7.9, §7.16 · piano F6)

**E1.1 — Ricezione automatica.** Come operatore, voglio che gli allegati della casella dei
documenti entrino da soli, per non doverli scaricare.
- [ ] Un lavoro pianificato legge la casella IMAP ogni N minuti (1–60, Impostazioni) e
      salva PDF ed Excel in `documenti_in_arrivo`.
- [ ] L'impronta SHA-256 del file scarta i doppioni.
- [ ] Gli allegati non utilizzabili (zip, file danneggiati) aprono un problema `casella.allegato`.

**E1.2 — Caricamento manuale.** Come operatore, voglio trascinare o caricare i file da
qualsiasi pagina.
- [ ] *Carica documenti* sempre presente nella barra.
- [ ] Il caricamento finisce nella stessa coda della casella.

**E1.3 — Lettura con affidabilità.** Come operatore, voglio i dati già letti con un indice di
fiducia per campo, per controllare solo quelli incerti.
- [ ] Coda con `FOR UPDATE SKIP LOCKED`; fino a 3 tentativi, poi stato `errore` e avviso in app.
- [ ] Per ogni campo l'affidabilità (0–1) dai `logprobs`; il livello del documento segue le
      soglie configurabili.
- [ ] I documenti su più pagine si leggono pagina per pagina e le righe si uniscono.
- [ ] Gli Excel dei bollettini si leggono senza modello.

**E1.4 — Correzione con il documento a fianco.** Come operatore, voglio correggere i dati
guardando il PDF.
- [ ] *Correggi i dati letti* mostra il numero di campi da controllare e apre una finestra a
      tutto schermo:
  - a sinistra il documento, con divisore trascinabile;
  - a destra testata e righe modificabili;
  - campi incerti con bordo giallo o rosso.
- [ ] Ogni campo confermato o corretto diventa `verificato`.
- [ ] Al salvataggio si ricalcolano controlli e abbinamento proposto.
- [ ] L'evidenziazione nel PDF compare **solo** se la posizione è stata trovata (esatta,
      approssimata o "posizione non trovata"), secondo l'esito di F0-A7.

**E1.5 — Decidere cosa farne.** Come operatore, voglio vedere prima l'azione proposta e poi
le righe (D-15).
- [ ] Scheda azione con un nome che dice cosa fare: *Pratica proposta* (candidate con i
      motivi + *Abbina a …*), *Scegli la pratica*, *Nuova pratica*, *Cosa farne* (bollettino).
- [ ] Avviso giallo "N righe lette con valori incerti" se ci sono incertezze.
- [ ] Scheda *Righe lette* con il contatore "N da controllare".
- [ ] Con livello *bassa* l'abbinamento chiede conferma.

**E1.6 — Scarto e recupero.** Come operatore, voglio scartare i documenti che non
riguardano Decobrands e poterli recuperare.
- [ ] Lo scarto chiede il motivo (*Doppione*, *Non riguarda Decobrands*, *Documento
      illeggibile*, *Altro*) e accetta una nota.
- [ ] *Recupera* rimette il documento fra quelli da controllare.
- [ ] L'eliminazione definitiva la fa solo l'amministratore.
- [ ] L'eliminazione automatica scatta dopo `scartati_giorni`.

#### E2 · Pratiche (spec §4.2.7–4.2.8, §5.8–5.9, §7.2–7.3, §9 · piano F2)

**E2.1 — Lo stato si ricava dai documenti.** Come operatore, non voglio scrivere lo stato a
mano.
- [ ] Ordine → *inviato*: in attesa, oppure in ritardo dopo `conferma_scadenza`.
- [ ] Conferma → *confermato*.
- [ ] Fattura → *fatturato*: la pratica entra nel calcolo delle provvigioni.
- [ ] La nota di credito è un documento, non uno stato.

**E2.2 — Elenco con filtri standard.**
- [ ] Segmenti di stato con conteggi calcolati sugli altri filtri.
- [ ] Ricerca libera.
- [ ] Fornitore, cliente e subagente a selezione multipla.
- [ ] Riepilogo dei filtri e paginazione.
- [ ] Segno sulle pratiche con variazioni fra fasi o con note di credito.

**E2.3 — Dettaglio: prima la provvigione, poi le righe** (D-12).
- [ ] Binario ordine → conferma → fattura → nota di credito, con la differenza di ogni fase.
- [ ] Scheda *Riepilogo*:
  - provvigione (imponibile, sconto, percentuali, quote, regola maturato/fatturato);
  - incasso del cliente;
  - documenti.
- [ ] Con variazioni, avviso giallo "La conferma cambia N righe … ±X €".
- [ ] Scheda *Righe a confronto*:
  - contatore rosso "N variazioni";
  - segmenti *Solo righe che cambiano · Tutte le righe*.
- [ ] Aperta dal filtro *Con variazioni*, la pratica parte da *Righe a confronto*.

**E2.4 — Documenti affiancati.**
- [ ] Clic su un documento o su una riga del confronto: a sinistra il PDF con le schede dei
      documenti (← → per scorrere), a destra il confronto con la fase precedente.
- [ ] Esc chiude.

**E2.5 — Netto e casi complessi.**
- [ ] Base del calcolo = fatture − note di credito.
- [ ] Una nota di credito totale porta la provvigione a 0.
- [ ] Una fattura multi-ordine ha una quota per pratica; una pratica può avere più fatture.
- [ ] Al cambio di fase si salva una fotografia delle righe; le fasi precedenti restano.

**E2.6 — Sollecito delle conferme.**
- [ ] *Prepara il sollecito* (pratica) e *Prepara i solleciti* (Oggi) preparano **un testo per
      fornitore** con le pratiche in ritardo.
- [ ] *Copia il testo* registra l'operazione e passa al fornitore successivo.

#### E3 · Bollettini (spec §4.2.9–4.2.10, §5.6, §5.11, §5.13, §6.2, §7.7 · piano F3)

**E3.1 — Matrice di 6 mesi** (D-14, D-16).
- [ ] Fornitore × mese, con questi stati:
  - verificato;
  - da decidere;
  - pronto da chiudere;
  - *atteso entro il gg/mm*;
  - *non arrivato* con *Sollecita*;
  - mese in corso.
- [ ] Sempre 6 mesi, scelti con PeriodoMesi (anno + griglia, scorciatoie, completamento
      automatico, anteprima al passaggio del mouse); ‹ › spostano il periodo di un mese.
- [ ] Filtro fornitore a selezione multipla; segmenti *Tutti · Con qualcosa da fare*.

**E3.2 — Riconciliazione a cerniera.** Come operatore, voglio vedere solo le righe che non
quadrano.
- [ ] Ogni riga mostra il riconosciuto dal fornitore e il nostro calcolo, con % e importo, e
      la differenza evidenziata.
- [ ] Ogni riga che non quadra si **accetta** (con motivo) o si **contesta** (motivo
      obbligatorio).
- [ ] *Manca nel bollettino* si può rimandare al mese dopo.
- [ ] Si può correggere l'importo a mano senza bloccare il flusso (§5.13).
- [ ] Chiusura come `verificato` o `contestato`; per la contestazione si prepara il testo.
- [ ] Alla verifica si **congelano** `pct_calcolata` e `importo_calcolato`.
- [ ] Un solo bollettino per fornitore, mese e anno.

**E3.3 — Atteso e sollecito** (D-03).
- [ ] Prima del giorno `giorno_bollettino` del mese successivo il bollettino è *atteso*
      (Prossime scadenze), dopo è *non arrivato* (Oggi, *Sollecita*).
- [ ] Senza documenti fiscali nel mese il bollettino non è atteso.

#### E4 · Incassi dei clienti (spec §5.14 · piano F3-A3, **da approvare**)

**E4.1 — Storno e riaccredito (fatturato).**
- [ ] Una riga di storno nel bollettino si riconosce come `storno`: **non** è una differenza
      da contestare.
- [ ] Con lo storno la fattura passa a `insoluta` e compare fra i pagamenti da sollecitare.
- [ ] Il riaccredito riporta la fattura a `pagata`.

**E4.2 — Riconoscimento al pagamento (maturato).**
- [ ] Una fattura assente dal bollettino è *in attesa di incasso*: nessuna decisione richiesta.
- [ ] La riga del mese del pagamento si abbina a fatture di qualsiasi mese precedente.
- [ ] Oltre `giorni_incasso` (iniziale 60) la fattura diventa *incasso da verificare*.

**E4.3 — Storno alla liquidazione successiva** (D-11).
- [ ] Lo storno entra nella **prima liquidazione trimestrale ancora aperta** dopo la chiusura
      del bollettino che lo contiene.
- [ ] Compare come voce negativa *Storno F-…*, con il trimestre d'origine, anche se la
      provvigione originale era già stata liquidata.
- [ ] Il riaccredito segue la stessa regola con una voce positiva.

**E4.4 — Solleciti di pagamento.**
- [ ] Gruppo **Pagamenti da sollecitare** in Oggi, dal più vecchio.
- [ ] Finestra *Solleciti di pagamento*: un testo per cliente; *Copia il testo* registra il
      sollecito (`sollecitata_il`, `solleciti`) e l'evento.
- [ ] *Segna come non pagata* (con nota) e *Segna come pagata* nella pratica.
- [ ] Filtro *Non pagate* nella scheda del cliente.

#### E5 · Liquidazione (spec §6.3, §7.8, §11 · piano F4)

**E5.1 — Trimestre e subagenti.**
- [ ] Quattro trimestri fissi.
- [ ] A sinistra l'elenco dei subagenti **con documenti nel trimestre**, per qualsiasi numero
      di subagenti; gli altri sono contati in testata. Clic = filtro.
- [ ] Scheda *Documenti*:
  - documenti liquidabili e in attesa (con il motivo);
  - storni e riaccrediti;
  - contatore giallo se ci sono documenti in attesa.

**E5.2 — Report subagenti** (D-18, piano F4-A4, **da approvare**).
- [ ] Senza subagente scelto:
  - barre impilate, quota del subagente + margine Decobrands;
  - tabella con la variazione sul trimestre prima.
- [ ] Con un subagente scelto:
  - 3 numeri con confronto;
  - trimestri dell'anno;
  - primi 5 clienti.
- [ ] Il pulsante *Analisi completa* apre l'Analisi con gli stessi filtri.

**E5.3 — Esportazione** (D-04).
- [ ] Tre contenuti × tre formati, nomi `Liquidazione_<anno>_T<n>_….<estensione>`.
- [ ] Excel con formule `SUM`, intestazione bloccata, filtro automatico, A4 orizzontale.
- [ ] PDF identico all'Excel.
- [ ] CSV con il formato della spec §11.
- [ ] L'evento `export/export` si scrive solo al download.

**E5.4 — Chiusura del trimestre.**
- [ ] Il trimestre si chiude solo quando è finito e non ha documenti in attesa.
- [ ] Serve il permesso `chiudi`.

#### E6 · Analisi (spec §7.22 · piano F4-A5, **da approvare**)

**E6.1 — Periodo e filtri.**
- [ ] Durata di 3, 6 o 12 mesi (predefinito 12) con PeriodoMesi; ‹ › spostano di un mese.
- [ ] Fornitori, subagenti e clienti a selezione multipla sulla stessa riga del periodo
      (D-20, D-21).
- [ ] Voci dello stesso campo in **o**, campi diversi in **e**.
- [ ] Icone *Riepilogo dei filtri* e *Togli tutti i filtri*.

**E6.2 — Numeri e grafici.**
- [ ] 4 numeri con la variazione sul periodo precedente:
  - fatturato;
  - dai fornitori;
  - ai subagenti;
  - margine.
- [ ] 4 grafici:
  - andamento mese per mese;
  - ciambella dei primi 7 fornitori;
  - subagenti;
  - primi 10 clienti.
- [ ] **Filtro incrociato**: clic su una fetta, una barra o una riga aggiunge o toglie la voce.
      Ogni grafico ignora il proprio filtro e mette in risalto la scelta.
- [ ] Competenza = **data del documento**; storni e riaccrediti esclusi (D-19).

**E6.3 — Tabella ed esportazione.**
- [ ] Segmenti *Per subagente · Per fornitore · Per cliente · Per mese · Documenti*.
- [ ] Excel con riepilogo e grafici come immagini; PDF con lo stesso contenuto; CSV.
- [ ] Tutti i ruoli consultano ed esportano.

#### E7 · Anagrafiche e Integra (spec §4.1, §4.5, §7.4–7.6 · piano F1)

**E7.1 — Sincronizzazione da Integra** (D-01, D-07, piano F1-A4, **da approvare**).
- [ ] Viste `v_clienti` e `v_fornitori` lette ogni 60 s, in modo incrementale, con un utente
      in sola lettura (`crm_lettura`).
- [ ] Si aggiornano solo i campi di Integra; i dati del CRM non si toccano.
- [ ] Problemi aperti in automatico: P.IVA mancante o doppia, vista mancante, connessione
      persa per 3 giri.
- [ ] Ora dell'ultima sincronizzazione visibile nelle pagine con dati di Integra.

**E7.2 — Fornitori.**
- [ ] Anagrafica in sola lettura.
- [ ] Si modificano solo le condizioni:
  - giorni di attesa della conferma;
  - giorno del bollettino;
  - maturato o fatturato;
  - `giorni_incasso`;
  - note;
  - attivo.
- [ ] Schede *Percentuali* (scaglioni, % agente, % subagente) e *Clienti seguiti*.
- [ ] Un fornitore non si elimina, si disattiva.

**E7.3 — Subagenti.**
- [ ] Gestione completa nel CRM (non sono in Integra), legati all'agente Decobrands SRL.

**E7.5 — Percentuali datate ed eccezioni** (D-25, D-26, piano F1-A5, **da approvare**).
- [ ] *Nuove percentuali da una data* crea una nuova versione; i documenti si calcolano con
      quella in vigore alla loro data.
- [ ] Nella scheda del subagente *Aggiungi eccezione* (fornitore, sconto, % 0–100); clic per
      modificare o eliminare; una sola eccezione per subagente e scaglione.
- [ ] Con una nuova versione delle percentuali le eccezioni passano alla nuova versione.

**E7.6 — Regole del subagente per cliente e per documento** (D-27, piano F1-A6, **da approvare**).
- [ ] Nella finestra dell'agenzia: *Al subagente per questo cliente %* (vuoto = scaglione) e *Provvigione al subagente* (ogni fattura · una al mese, la prima · una al mese, la più alta).
- [ ] Con *una fattura al mese* le altre fatture del mese danno 0 al subagente; le note di credito seguono la loro fattura.
- [ ] In Liquidazioni *Correggi* su ogni documento: altra %, importo fisso o nessuna, **motivo obbligatorio**; *Togli la correzione*; solo a trimestre aperto.
- [ ] La regola applicata si vede sotto la provvigione, nel Riepilogo della pratica e nel prospetto esportato (*Provvigioni particolari*).
- [ ] Quanto riconosce il fornitore non cambia.

**E7.4 — Clienti e agenzie.**
- [ ] Anagrafica da Integra in sola lettura.
- [ ] Scheda *Agenzie*:
  - fornitore, codice cliente del fornitore, subagente, sconto;
  - gli sconti proposti seguono gli scaglioni del fornitore.
- [ ] Vincoli: un subagente per cliente × fornitore; codice unico per fornitore.
- [ ] Contatore giallo se manca un codice cliente.
- [ ] Scheda *Pratiche* con segmenti e il filtro *Non pagate*.

#### E8 · Oggi (spec §7.1 · piano F5-A1)

**E8.1 — Cose da fare per gruppi.**
- [ ] Riquadri che fanno da filtro: conferme in ritardo, documenti in coda, bollettini,
      pagamenti dei clienti.
- [ ] Gruppi richiudibili, che restano come l'utente li lascia.
- [ ] Colonna destra:
  - schede *Prossime scadenze* (15 giorni) e *Ultime operazioni*;
  - sempre visibile, il trimestre in corso: atteso, riconosciuto, da liquidare, bloccato.
- [ ] Gli amministratori vedono "errori di oggi" con il collegamento al registro.

#### E9 · Gestione (spec §7.11, §7.13–7.17, §8.3, §15 · piano F5)

**E9.1 — Ruoli e permessi** (D-05, F5-A3, **da approvare**).
- [ ] Ruoli *Amministratore*, *Operatore*, *Sola lettura* (tabella `crm_ruoli_utente`).
- [ ] I permessi si verificano sul server (`requirePermesso`).
- [ ] Per la sola lettura: fascia "Profilo in sola lettura", pulsanti di modifica spenti,
      pagine non permesse con "Pagina riservata".

**E9.2 — Utenti** (F5-A4, **da approvare**).
- [ ] Utenti condivisi con la Gestione Ordini.
- [ ] Nuova password via email, con cambio obbligatorio al primo accesso.
- [ ] Deve restare almeno un amministratore attivo.
- [ ] Nessuno cambia il proprio ruolo, si disattiva o si elimina.

**E9.3 — Stato del sistema** (F5-A5, **da approvare**).
- [ ] 4 servizi (casella, lettura, Integra, posta), ciascuno con un controllo di salute ogni
      5 minuti.
- [ ] Stato verde, giallo o rosso secondo le regole della spec §7.14.2.
- [ ] Catalogo dei problemi con apertura, ripetizione e chiusura automatica.
- [ ] *Segna come visto*, *Controlla adesso*, aggiornamento da solo ogni 30 s.

**E9.4 — Impostazioni** (F5-A6, **da approvare**).
- [ ] 6 sezioni: azienda, casella, server di lettura e soglie, posta, Integra, conservazione.
- [ ] Le password sono cifrate e non si rileggono mai.
- [ ] *Prova la connessione*.
- [ ] Ogni salvataggio scrive un evento, mai le password.

**E9.5 — Guida in linea** (F5-A8, **da approvare**).
- [ ] Argomenti con ricerca in tutto il testo.
- [ ] Per ogni pagina: sintesi, schema, passi, pulsanti, finestre, "da sapere", chi può
      modificare.
- [ ] Pulsante *Guida* nella testata di ogni pagina.

**E9.6 — Registro degli eventi** (V10, spec §15).
- [ ] Tabella `eventi_app` di sola aggiunta, scritta nella **stessa transazione**
      dell'operazione, con l'unico helper `logEvent()`.
- [ ] Catalogo tassativo: né più né meno eventi di quelli previsti.
- [ ] Le letture non scrivono eventi.
- [ ] Mai password, token o contenuto dei documenti.
- [ ] Pagina `/eventi` per l'amministratore: filtri, dettaglio JSON, esportazione CSV.
- [ ] Conservazione di 36 mesi.

#### E10 · Regole trasversali dell'interfaccia (spec §7.12, §16.4)

**E10.1 — Ritorno nello stesso punto** (D-02).
- [ ] *‹ Torna a …* e il tasto Indietro del browser ripristinano filtri, scheda,
      ordinamento, pagina e scorrimento.
- [ ] Ogni passo della cronologia ha la sua memoria.

**E10.2 — DataTable uguali ovunque** (V9, D-10).
- [ ] Riempiono lo spazio, intestazione fissa, totali fissi.
- [ ] Ordinamento, filtri e totali su **tutto** l'elenco, poi la paginazione (25 righe
      configurabili).

**E10.3 — Filtri standard e numeri dal vivo** (D-22, D-23).
- [ ] Le entità si filtrano sempre con un campo di ricerca a selezione multipla, mai con una
      tendina.
- [ ] Il numero di un segmento conta con gli altri filtri applicati.
- [ ] Quando altri cambiano i dati:
  - i contatori si aggiornano da soli (SSE `/api/eventi/flusso`);
  - le tabelle no: compare l'avviso *Ci sono aggiornamenti · Aggiorna*.

**E10.4 — Lingua e dispositivi** (V5, V6).
- [ ] Tutto in italiano.
- [ ] Funziona su desktop, tablet e telefono; sotto i 992 px la pagina segue il flusso naturale.

### 7.3 Vincoli e casi limite

- ⚠ **Ogni storia** ha un criterio di accettazione implicito: il calcolo o l'operazione si fa sul server dai dati del database; un valore calcolato inviato dal browser si ignora o si rifiuta (V12, D-28).

- **Le tabelle della Gestione Ordini non si modificano** (V2): il CRM legge `users`,
  `clienti` e `ordini_cliente_*`, e scrive solo nelle sue tabelle.
- **Accesso unico con la Gestione Ordini**: si verifica in F0-A3. Se le sessioni non sono
  compatibili, il login è separato con le stesse credenziali, senza ore in più.
- **Codice cliente del fornitore mancante**: l'abbinamento resta manuale (*Scegli la pratica*).
- **Articoli nuovi del fornitore**: si accettano con il pallino rosso; non sono un errore.
- **Fornitore con cadenza non mensile**: è uno solo e verrà dismesso; non si gestisce.
- **Cliente su più subagenti** per lo stesso fornitore: impossibile per vincolo. I casi
  residui li risolve Marco.
- **Riga del bollettino con solo il totale del cliente**: in backlog (B2).

---

## 8. Fuori ambito

| Escluso | Perché | Quando |
|---|---|---|
| **Vendita diretta**: ordini cliente, articoli, giacenze con impegni, alias e kit, esportazione OC/OF per Integra | prima va messo in esercizio il lavoro di agenzia (D-08); progettata e funzionante nel prototipo, spenta (`index.html?vendita=1`) | ampliamento futuro, 12 h indicative da quotare (spec §17, piano §10.1) |
| **Sostituzione della Gestione Ordini** e spegnimento di n8n + LlamaIndex | prerequisito: ingresso documenti in esercizio e tarato | dopo la vendita diretta, con un periodo in parallelo |
| **Supporto alle decisioni con modelli linguistici**: spiegare le differenze, anomalie, domande in italiano sui dati, riepiloghi, lettura delle email | prima serve lo storico e una prova "in ombra" con soglia ≥ 90 % di proposte corrette | fase successiva, circa 18 h indicative (spec §18) |
| Riga del bollettino con solo il totale del cliente (B2) | caso raro | backlog |
| Import dei dati storici dagli Excel manuali (B6) | 🔵 da decidere se serve | backlog |
| CRM commerciale (contatti, attività, gruppi, settori) | non serve ai tre obiettivi | eventuale aggiunta |
| Invio delle email di avviso | decisione del cliente: solo avvisi nell'app (§5.12) | — |

---

## 9. Dipendenze e rischi

### 9.1 Dipendenze

| Dipendenza | Da chi | Blocca |
|---|---|---|
| Server con GPU NVIDIA, driver CUDA e vLLM | Decobrands (hardware a suo carico) | F0-A6, F6 |
| Campione di documenti reali: Gries, Gasper, Ing's + 1 fornitore; circa 100–120 file, scansionati compresi | Decobrands | F0-A6, F0-A7 |
| Viste `v_clienti` e `v_fornitori` su Integra + utente in sola lettura | chi gestisce Integra | F1-A4 |
| Casella email dei documenti (IMAP) e posta in uscita (SMTP) | Decobrands | F6-A1, utenti, solleciti |
| Server Windows con PostgreSQL `decobrands`, Caddy, Node 24 | Decobrands / Ugo | F0-A1, rilascio |
| Moduli di infrastruttura del Portale B2B Luis | Ugo | F0-A1, F0-A3, F0-A5 |
| Approvazione delle 53 h fuori preventivo | Decobrands | le attività segnate **da approvare** |

### 9.2 Rischi e contromisure

| Rischio | Probabilità · impatto | Contromisura |
|---|---|---|
| **Lettura GLM-OCR non abbastanza precisa** sui formati dei fornitori (tedesco, numeri con la virgola, scansionati) | media · alto | Prova F0-A6 su documenti reali **prima** di F6; soglie tarate; correzione sempre possibile; margine di 18 h; eventuale stima aggiuntiva per adattare la lettura ai singoli fornitori, quotata a parte |
| **Evidenziazione del valore nel PDF** errata o assente sugli scansionati | alta sugli scansionati · medio | Prova F0-A7 (6 h, da approvare) con soglie verde/giallo/rosso; se gli errori superano il 3 % non si mostra; la funzione resta "da verificare" finché la prova non è fatta (D-06) |
| Decimali persi nelle tabelle (10,72 → 1072, segnalazione GLM-OCR #241) | bassa · alto | Controllo nella prova; controlli fissi: totale ≠ somma righe, q.tà × prezzo ≠ importo |
| **Sessioni incompatibili** con la Gestione Ordini | media · basso | Login separato sulla stessa tabella `users` |
| Viste di Integra lente o cambiate | bassa · medio | Problemi `integra.lenta` e `integra.vista`; nuovo tentativo al giro dopo; avviso dopo 3 fallimenti |
| **Il cliente dà per certo ciò che vede nel prototipo** | alta · medio | Le funzioni incerte sono segnate come tali nel prototipo e nella spec; il prototipo è il contratto per tutto il resto (D-24) |
| Lo sviluppo "semplifica" regole che sembrano strane | media · alto | Registro delle decisioni §19 con il perché; commenti `// D-nn §19` nel codice; prova `flusso.py` |
| Più agenti che modificano gli stessi file | media · medio | Attività come slice con file propri; contratti congelati in F0 (schema, API, motore, `logEvent`, seed) |
| Server GPU fermo | bassa · medio | I documenti restano in coda e si rileggono alla ripresa; problema `lettura.non_raggiungibile` |
| Dati reali diversi dal seed | media · medio | Collaudo F7-A2 anche con dati reali di prova; margine |

---

## 10. Domande aperte

### 10.1 Per Decobrands (spec §5.14, §17.2)

- 🔵 Il sollecito di pagamento al cliente lo manda Decobrands o il subagente che lo segue (in copia)?
- 🔵 I solleciti dei fornitori arrivano per email in un formato ricorrente? Se sì, possono
  entrare da Documenti come tipo `sollecito_insoluti`.
- 🔵 `giorni_incasso` basta per fornitore o dipende dal cliente (termini di pagamento diversi)?
- 🔵 L'email del cliente per il sollecito arriva da Integra (vista `v_clienti`)?
- 🔵 Serve importare lo storico dagli Excel manuali (B6)? Da quale data?
- 🔵 Quali sono i valori di partenza delle misure del §6 (tempo, differenze, bollettini controllati)?
- 🔵 *(Solo per l'ampliamento)* Ordini dell'agenzia e della vendita diretta arrivano allo
  stesso indirizzo? Un ordine può essere misto? I documenti della vendita diretta hanno
  sempre il codice cliente di Integra?

### 10.2 Tecniche (si chiudono nelle prove)

- 🔵 Memoria video e tempi per pagina di GLM-OCR sul server del cliente (F0-A6).
- 🔵 Quota di PDF digitali e scansionati; scala e origine di `bbox_2d` nel pacchetto
  installato in proprio (F0-A7).
- 🔵 Il PDF originale si salva nel database (`BYTEA`) o su disco? Da decidere in F0.
- 🔵 Compatibilità delle sessioni con la Gestione Ordini (F0-A3).

### 10.3 Ore fuori preventivo da approvare

| Attività | Ore | Motivo |
|---|---|---|
| F0-A7 Prova di fattibilità dell'evidenziazione | 6 | rendere certa o escludere una funzione vista nel prototipo |
| F1-A4 Sincronizzazione da Integra (viste) | 3 | sostituisce l'import da file (D-07) |
| F3-A3 Incassi dei clienti | 4 | regole chiarite il 16 e 18/10/2026 (D-11) |
| F4-A3 Esportazione completa (3 contenuti × 3 formati) | +3 | D-04 (era 1 h) |
| F4-A4 Report subagenti + F4-A5 Analisi (BI) | 13 | D-18, D-19 |
| F4-A6 Filtri standard e numeri dal vivo | 4 | D-22, D-23 |
| F1-A5 Percentuali datate ed eccezioni personali | 3 | D-25, D-26 (chiudono B3 e B1) |
| F1-A6 Regole del subagente (agenzia, mensile, correzione) | 4 | D-27 |
| F5-A3…A8 Pagine di gestione (ruoli, utenti, stato del sistema, impostazioni, scartati, guida) | 13 | spec §7.13–§7.17, §8.3 |
| **Totale** | **53** | ≈ € 2.915 alla tariffa di sviluppo assistito (€ 55/h) 🔶 da confermare |

### 10.4 Incoerenze trovate fra i documenti (da sistemare)

Ogni voce riporta:
- dove sta l'incoerenza (file e riga);
- cosa dice ciascun documento;
- perché conta, cioè cosa succede se si sviluppa così com'è;
- la correzione proposta e chi decide.

La gravità indica l'effetto su chi sviluppa o sul cliente:
- **alta**: porta a costruire una cosa sbagliata o a promettere una cosa diversa;
- **media**: genera dubbi o lavoro rifatto;
- **bassa**: refuso o riferimento sbagliato.

| # | Argomento | Gravità | Esito (18/10/2026) |
|---|---|---|---|
| I-1 | Margine di rischio: 15 h o 18 h | media | ✅ corretto: 18 h, € 990 |
| I-2 | Grafica: Bootstrap o `stile.css` | **alta** | ✅ preventivo allineato a D-24 |
| I-3 | Rotte delle pagine | media | ✅ rotte del prototipo (spec §7, §8.1) |
| I-4 | Filtri della liquidazione | media | ✅ tolti i filtri vecchi (spec §7.8) |
| I-5 | Base del calcolo delle provvigioni | **alta** | ✅ spec §10 riscritto: per documento, sul netto |
| I-6 | Percentuali datate: dentro o in backlog | **alta** | ✅ dentro (D-25), 2 h da approvare |
| I-7 | Azione `snapshot_righe` del registro eventi | media | ✅ tolta: i dati della fotografia vanno nel dettaglio di `stato/change_state` (spec §15.2.4) |
| I-8 | Decisione citata nell'esempio di commento | bassa | ✅ corretto in D-11 |
| I-9 | Riferimento alla checklist nel piano | bassa | ✅ corretto in §1.1 |
| I-10 | Eccezioni per subagente: interfaccia sì o no | **alta** | ✅ si inseriscono nel CRM (D-26), 1 h da approvare; "una fattura al mese" e casi particolari coperti da D-27 (4 h da approvare) |

#### I-1 · Margine di rischio: 15 h o 18 h

- **Dove**:
  - `preventivo-crm-provvigioni.md:61`: la tabella §4, attività 12, dice **18 h, € 990**;
  - `preventivo-crm-provvigioni.md:82`: la nota del §6 dice **"Margine di rischio 25 %
    (15 h, € 825,00)"**.
- **Cosa è successo**: la nota è rimasta della versione precedente. Il margine è il 25 %
  delle attività: con 60 h dava 15 h; ora le attività sono 71 h, quindi 25 % ≈ 18 h.
  Anche il piano (§3) e la specifica (§16.2) dicono 18 h.
- **Perché conta**: il preventivo va al cliente. Due cifre diverse per la stessa voce fanno
  dubitare di tutto il documento e possono aprire una discussione sull'importo totale
  (€ 4.895 comprende già le 18 h).
- **Correzione**: nella nota del §6 scrivere "18 h, € 990,00".

#### I-2 · Grafica: Bootstrap o `stile.css` del prototipo

- **Dove**:
  - `preventivo-crm-provvigioni.md:54`, attività 6: "Frontend Next.js viste CRM
    (**Bootstrap 5.3 + `crm.css`** del prototipo): login, dashboard (KPI + tab
    segnalazioni/ordini) … liquidazione (tab riepilogo/dettaglio)";
  - `preventivo-crm-provvigioni.md:85`, nota: "**Grafica**: Bootstrap 5.3 + `crm.css` del
    prototipo, coerente con la Gestione Ordini";
  - contro: spec V4, §16.3 e **D-24** (18/10/2026) dicono `stile.css` di
    `prototipo-alternativo/`, Public Sans, **niente Bootstrap**. Anche il piano 1.4 e
    `CLAUDE.md` dicono lo stesso.
- **Cosa è successo**: il preventivo descrive il **primo prototipo** (`prototipo-crm/`, con
  Bootstrap), che ora è solo archivio. Anche l'elenco delle pagine dell'attività 6 è
  vecchio: "tab segnalazioni/ordini" e "tab riepilogo/dettaglio" non esistono più. Oggi le
  pagine sono Oggi a gruppi, la pratica con *Riepilogo · Righe a confronto* e la liquidazione
  con *Documenti · Report subagenti*.
- **Perché conta**: è l'incoerenza più rischiosa per lo sviluppo. Chi legge il preventivo
  installerebbe Bootstrap e copierebbe le pagine del prototipo sbagliato, mentre la
  checklist di consegna (criterio 3) vieta Bootstrap e chiede `stile.css` copiato. Per il
  cliente, il preventivo descrive un'interfaccia diversa da quella vista nel prototipo.
- **Correzione**: aggiornare l'attività 6 e la nota *Grafica* a D-24 e riallineare l'elenco
  delle pagine. Le ore non cambiano. Anche l'attività già svolta n. 4 ("Stile applicato alla
  app esistente, Bootstrap 5.3") è storica: resta, ma con la nota "primo prototipo, archivio".

#### I-3 · Rotte delle pagine

- **Dove**:
  - spec §7, tabella iniziale (`specifica-crm-provvigioni.md:1141-1157`): `/dashboard`,
    `/ordini-fornitore`, `/ordini-fornitore/:id`, `/agenti`, `/liquidazione` e la riga 13
    "`/ordini`, `/ordini/upload`, `/liste` — Gestione ordini cliente";
  - contro: spec §7.10 (schema della barra) e prototipo: `#/` (Oggi), `#/documenti/:id`,
    `#/pratiche/:id`, `#/bollettini/:id`, `#/liquidazioni/:anno/:t`, `#/analisi`,
    `#/subagenti/:id`, `#/clienti/:piva`.
- **Cosa manca o non torna nella tabella del §7**:
  - non ci sono `/documenti`, `/analisi`, `/subagenti`;
  - c'è `/agenti`, mentre l'agente è uno solo (§5.4) e la pagina del prototipo è *Subagenti*;
  - la riga 13 (ordini cliente) appartiene alla vendita diretta, che è spenta (D-08);
  - le API del §8.1 usano a loro volta `/ordini-fornitore` e `/liquidazione`.
- **Perché conta**: il criterio 1 della checklist chiede le "stesse rotte" del prototipo.
  Con due elenchi diversi nella stessa specifica ogni sviluppatore sceglierà il suo, e i
  collegamenti fra le pagine (Torna a, link dalla Guida, apertura dall'Analisi) si rompono.
- **Correzione**:
  1. riscrivere la tabella del §7 dallo schema del §7.10;
  2. decidere se le API restano con i nomi vecchi (`/api/ordini-fornitore`) o diventano
     `/api/pratiche`, e scriverlo una volta. Proposta: pagine come il prototipo, API con
     gli stessi nomi delle pagine.

#### I-4 · Filtri della liquidazione

- **Dove**: spec §7.8, parte "Dettaglio (colonna sinistra e scheda *Documenti*)"
  (`specifica-crm-provvigioni.md:1419-1423`):
  - "**Filtri in card**: fornitore (**multifiltro a checkbox** …), subagente, trimestre, anno";
  - "**KPI del periodo**: documenti liquidabili, totale merce, provvigione agente,
    provvigione subagenti".
- **Contro**:
  - la parte iniziale dello stesso §7.8 (D-18): trimestri in alto, elenco dei subagenti che
    fa da filtro, schede *Documenti · Report subagenti*;
  - D-22: le entità si filtrano con il campo di ricerca a selezione multipla, **mai** con
    tendine o caselle.
- **Cosa è successo**: il testo del primo prototipo è rimasto sotto quello nuovo. Il §7.3
  (pratica) lo segnala come "contenuti del primo prototipo, restano validi come elenco dei
  dati"; il §7.8 no.
- **Perché conta**: chi sviluppa può costruire due barre di filtri diverse nella stessa
  pagina, oppure un multifiltro a caselle che D-22 ha tolto. In più i "KPI del periodo" non
  esistono nel prototipo attuale: i numeri stanno nel *Report subagenti*.
- **Correzione**: togliere il paragrafo dei filtri in card e dei KPI. In alternativa,
  marcarlo come "primo prototipo, archivio", come al §7.3.

#### I-5 · Base del calcolo delle provvigioni

- **Dove**:
  - spec §10 (`specifica-crm-provvigioni.md:2085`): "Base = `importo_merce` della pratica
    fatturata (o confermata, a seconda dello stato §5.8)", e la formula usa `importo_merce`;
  - contro:
    - §4.2.7.1: "**Importo netto della pratica** = somma algebrica degli `importo` dei
      documenti (fatture − note di credito). È il netto la **base del calcolo**";
    - §5.3 e §5.8: "la provvigione si calcola sui dati **fatturati**";
    - prototipo: `M.importoDoc` calcola per documento, con la percentuale alla data del
      documento.
- **Cosa è successo**: il §10 è precedente alla tabella dei documenti fiscali (§4.2.7.1).
  "O confermata" contraddice il §5.8: la conferma non genera provvigioni.
- **Perché conta**: è la regola che fa i soldi. Implementando il §10 alla lettera:
  - una nota di credito non ridurrebbe la provvigione;
  - una fattura in più tranche verrebbe contata sull'importo dell'ordine;
  - una conferma ridotta (7/10) darebbe la provvigione sull'ordinato.

  I test numerici sul seed (NC-2026-005, conferma 7/10) fallirebbero, ma solo alla fine.
- **Correzione**: riscrivere il §10 così:
  - base = netto dei documenti fiscali, calcolato **per documento**;
  - percentuale in vigore alla data del documento (vedi I-6);
  - `importo_merce` solo finché la pratica non ha documenti, come stima nel *Riepilogo*;
  - nessuna provvigione sulle pratiche solo confermate.

#### I-6 · Percentuali datate: dentro o in backlog

- **Dove**:
  - nella specifica, la variazione delle percentuali nel tempo è **fuori**:
    - §4.4 (`:628`): "il versioning degli scaglioni per periodo è in backlog";
    - §5.11 (`:784`): "Versioning degli scaglioni per periodo = estensione (§13)";
    - §13, B3: "Versioning scaglioni per periodo"; il preventivo §6 lo esclude
      esplicitamente;
  - nella specifica stessa e nel prototipo è **dentro**:
    - §7.4 (`:1291`): scheda *Percentuali* "in vigore da una data, con *Nuove percentuali
      da una data* e le versioni";
    - §7.8 e §7.22: "percentuali in vigore alla data del documento";
    - prototipo: `motore.js:125-129` sceglie lo scaglione con `valido_dal <= data
      documento`; `viste-anagrafiche.js:47, 102-108` ha il pulsante *Nuove percentuali da
      una data*, che salva una nuova versione;
    - LEGGIMI: "le nuove percentuali hanno una data di validità; i documenti si calcolano
      con quelle in vigore alla loro data".
- **Cosa è successo**: la regola del cliente (punto 11 dell'analisi: "le nuove valgono dal
  periodo in cui vengono riviste") prima era coperta solo dal congelamento alla verifica del
  bollettino. Poi il prototipo è passato alle percentuali con data di validità, ma la
  specifica e il preventivo non sono stati aggiornati.
- **Perché conta**:
  - **per il cliente**: vede nel prototipo una funzione che il preventivo esclude. Per
    regola del progetto (CLAUDE.md §5), quello che vede nel prototipo lo dà per certo;
  - **per lo sviluppo**: cambia lo schema. `provvigioni_scaglioni` non ha la colonna
    `valido_dal`, e il vincolo di unicità deve diventare (fornitore, sconto, `valido_dal`);
    cambia anche il motore, perché la percentuale si cerca per data e non per scaglione
    corrente;
  - le due soluzioni non sono equivalenti. Il congelamento vale solo per i mesi già
    verificati; le versioni datate funzionano anche per i documenti non ancora in un
    bollettino e per l'Analisi su periodi passati.
- **Correzione proposta**: tenere le percentuali datate (sono già nel prototipo e servono
  all'Analisi):
  - aggiungere `valido_dal` allo schema (§4.2.2);
  - chiudere B3;
  - aggiornare §4.4, §5.11 e il preventivo;
  - stimare le ore: 🔶 circa 2 h tra schema, motore e interfaccia, **da approvare**.

  In alternativa, si toglie il pulsante dal prototipo e la specifica resta com'è.

#### I-7 · Azione `snapshot_righe` del registro eventi

- **Dove**:
  - spec §15.2.4 (`:2306`): per il PUT che fa avanzare di fase le righe, l'evento ha
    `tipo = stato`, `azione = snapshot_righe`;
  - contro: spec §4.2.11 (`:463`), dove la colonna `azione` ammette solo `create · update ·
    delete · upload · export · change_state · verify · login · logout · change_password ·
    reset_requested · access_denied · error`.
- **Perché conta**: il §15.1 dice che il catalogo è **tassativo** ("né più né meno eventi").
  Se `azione` diventa un vincolo `CHECK` o un `enum` Prisma, quell'evento fallisce. Siccome
  la scrittura avviene nella stessa transazione, fallisce anche il cambio di fase della
  pratica. Altrimenti la schermata `/eventi` ha un filtro per azione che non prevede quel
  valore.
- **Correzione**: aggiungere `snapshot_righe` all'elenco del §4.2.11. In alternativa si
  registra il passaggio come `change_state` con `da_fase`/`a_fase` nel dettaglio. È più
  semplice: un'azione in meno e il cambio di fase è già un cambio di stato.

#### I-8 · Decisione citata nell'esempio di commento

- **Dove**: spec §16.5 (`:2704`), esempio di commento nel codice: `// storno alla
  liquidazione successiva, D-08 §19`.
- **Contro**: nel §19 lo storno alla liquidazione successiva è **D-11**; D-08 è "vendita
  diretta spenta".
- **Perché conta**: è l'esempio che gli sviluppatori copieranno. Un rimando sbagliato porta
  a leggere il motivo sbagliato, ed è proprio il tipo di errore che il registro delle
  decisioni vuole evitare.
- **Correzione**: scrivere `D-11`.

#### I-9 · Riferimento alla checklist nel piano

- **Dove**: `piano-lavoro-crm.md:39`, `:161`, `:249`, `:268`: "checklist **§11.1**".
- **Contro**: la checklist dei 6 criteri sta nel §1.1 del piano e nel §16.1 della
  specifica; il §11 della specifica è l'esportazione della liquidazione e non ha un §11.1.
- **Perché conta**: chi apre il §11.1 non trova nulla. In F7-A1 ("report checklist §11.1 per
  tutte le schermate") si rischia di compilare la checklist sbagliata.
- **Correzione**: sostituire con "checklist §1.1 (spec §16.1)".

#### I-10 · Eccezioni per subagente: interfaccia sì o no

- **Dove**:
  - nella specifica e nel preventivo l'interfaccia è **fuori**:
    - §4.2.3 (`:257`): "rare, gestite a mano" e "la gestione UI delle eccezioni è in
      backlog";
    - §5.2 (`:673`) e §7.4: "gestione eccezioni per subagente (backlog)";
    - §13, B1; il preventivo §6 la esclude;
  - nel prototipo le eccezioni sono **calcolate e mostrate**:
    - `motore.js:141-144` applica l'eccezione al calcolo (`sub: ecc ? ecc.pct_sub : …`);
    - `viste-anagrafiche.js:54` le mostra nella colonna *Al subagente* delle percentuali
      del fornitore;
    - `viste-anagrafiche.js:154` ha la sezione *Eccezioni personali* nella scheda del
      subagente;
    - il seed comprende Bastasin 3 % sullo scaglione 1 %.
- **Cosa è chiaro e cosa no**:
  - il **calcolo** è dentro (§10: "o `pct_override` … se presente");
  - la **visualizzazione** è nel prototipo, quindi dentro per la regola D-24;
  - la **creazione e modifica** dall'interfaccia è in backlog.

  Non è scritto da nessuna parte come si caricano le eccezioni senza interfaccia: a mano nel
  database? con il seed?
- **Perché conta**: se le eccezioni si mostrano ma non si possono inserire, l'operatore
  non ha modo di aggiungerne una nuova o di toglierla. Inoltre il punto 2 dell'analisi
  (sconto "fittizio" 1 % = eccezione 3 % di Bastasin, riconosciuta "solo una fattura al
  mese") resta senza una regola di calcolo: la specifica dice "gestite a mano fuori dal
  calcolo automatico", il prototipo le calcola in automatico.
- **Correzione proposta**:
  1. scrivere nella specifica che calcolo e visualizzazione sono dentro;
  2. dire come si inseriscono finché B1 è in backlog: proposta, con uno script o una riga
     del seed curata da Ugo, con evento `crud/create` `scaglione`;
  3. 🔵 chiedere a Decobrands se il caso Bastasin ("una fattura al mese") va calcolato dal
     CRM o resta a mano. Se resta a mano, serve un modo di escludere quei documenti dal
     calcolo automatico.

---

## 11. Piano e costi

### 11.1 Fasi (piano `piano-lavoro-crm.md`)

| Fase | Contenuto | Ore | In parallelo |
|---|---|---|---|
| F0 | Fondamenta: scaffold sul modello Luis, schema e seed, accesso, shell e componenti, motore e `logEvent()`, prova GLM-OCR | 28 | 1 → 4 agenti |
| F1 | Anagrafiche: fornitori e scaglioni, subagenti, clienti e agenzie | 6 | 3 |
| F2 | Pratiche: elenco, dettaglio, documenti fiscali | 6 | 3 |
| F3 | Bollettini: matrice e caricamento, riconciliazione | 4 | 2 |
| F4 | Liquidazione: trimestri, documenti, esportazione | 3 | 2–3 |
| F5 | Oggi + registro eventi | 2 | 2 |
| F6 | Ingresso documenti: casella e coda, lettura, controlli, `/documenti`, installazione | 17 | 2–3 |
| F7 | Collaudo, verifica della replica, rilascio | 5 | 1–2 |
| | **Attività** | **71** | |
| | Margine di rischio 25 % (si usa solo se serve, a consuntivo) | 18 | |
| | **Da svolgere** | **89** | |

F0 blocca tutto il resto; F1–F6 procedono in parallelo; F7 chiude.

### 11.2 Costi (preventivo)

| Voce | Ore | Importo |
|---|---|---|
| Già svolto: analisi, specifica, prototipo, dati di prova | 16 | € 1.280 |
| Da svolgere, margine incluso | 89 | € 4.895 |
| **Totale** | **105** | **€ 6.175** (IVA esclusa) |
| Riferimento senza AI | 228 h da svolgere | € 15.960 + € 1.280 |
| Fuori preventivo da approvare (§10.3, preventivo §5) | 53 | € 2.915 |
| **Totale con tutte le variazioni** | **158** | **€ 9.090** |
| Ampliamento vendita diretta (indicativo) | 12 | da quotare |
| Supporto alle decisioni, prova (indicativo) | 18 | da quotare |

### 11.3 Regole di consegna (per chi sviluppa)

- ⚠ **Tutto sul backend, MAI dai dati del frontend** (spec V12, D-28): ogni calcolo (provvigioni, bollettini, liquidazione, Analisi, totali, esportazioni) e ogni operazione sensibile (stati, verifiche, chiusure, abbinamenti, correzioni, permessi, eventi) si esegue sul server partendo dal database; il frontend mostra e invia solo le scelte (id, valori digitati, motivo); il server ricarica, ricontrolla e ricalcola, e non salva mai un valore calcolato arrivato dal browser. Il prototipo calcola nel browser solo perché è una dimostrazione.

- Ogni attività è una slice con file propri; una PR per attività.
- Prima del merge: checklist dei 6 criteri superata, test numerici sul seed, eventi del §15.2
  completi.
- Prima di cambiare un comportamento si legge il perché nel §19. Se il codice si discosta
  dalla spec, il motivo va nella PR e in una nuova riga del §19.
- Ogni modifica aggiorna nello stesso lavoro specifica, guida, LEGGIMI, piano e catalogo dei
  componenti, poi si lancia `strumenti/genera-pagine-doc.py`.

---

## 12. Registro delle decisioni (sintesi del §19)

| # | Decisione | Perché |
|---|---|---|
| D-01 | Clienti e fornitori solo da Integra, in sola lettura; subagenti nel CRM | un'anagrafica, un solo padrone |
| D-02 | Ritorno nello stesso punto | il lavoro è un andare e tornare fra elenco e dettaglio |
| D-03 | Bollettino atteso entro il giorno del fornitore; sollecito solo dopo | i fornitori hanno giorni diversi |
| D-04 | Esportazione: completa, un subagente, riepilogo; Excel, PDF, CSV | sono i tre usi reali |
| D-05 | Ruolo *sola lettura*, permessi verificati sul server | nascondere i pulsanti non basta |
| D-06 | Evidenziazione nel documento da verificare (F0-A7) | non garantita sugli scansionati |
| D-07 | Integra letto da viste, sincronizzato ogni pochi secondi | dati allineati senza import |
| D-08 | Vendita diretta spenta, ampliamento futuro | prima l'agenzia |
| D-09 | Componente Schede; i segmenti restano per filtrare | due bisogni, due strumenti |
| D-10 | Ordinamento e totali su tutto l'elenco | il "più alto" deve essere il più alto |
| D-11 | Incassi: storno e riaccredito, maturato al pagamento, storno alla liquidazione successiva | è come lavorano i fornitori |
| D-12 | Pratica a schede, senza il percorso nelle pagine di dettaglio | le righe contano solo se qualcosa non torna |
| D-13 | Ogni decisione si registra con il suo perché | non "semplificare" il necessario |
| D-14 / D-16 | Bollettini: sempre 6 mesi, selettore a mesi | matrice sempre leggibile |
| D-15 | Documenti: prima l'azione proposta, poi le righe | si apre un documento per decidere |
| D-17 → D-18 | Liquidazioni: *Documenti* + *Report subagenti*; la BI nella pagina Analisi | controllo e analisi hanno bisogni diversi |
| D-19 | Analisi per data del documento; storni esclusi | numeri stabili e confrontabili |
| D-20 / D-21 | Ricerca a selezione singola o multipla, *Filtro multiplo (n)* | le tendine non reggono centinaia di voci |
| D-22 | Filtri standard in tutte le barre | un solo modo di filtrare |
| D-23 | Numeri dal vivo; tabelle aggiornate su richiesta | numeri veri, righe ferme sotto il mouse |
| D-24 | Prototipo ufficiale `prototipo-alternativo/` | un solo riferimento per chi sviluppa |
| D-25 | Percentuali con data di validità, calcolo per documento alla sua data | i documenti vecchi restano con le percentuali di allora |
| D-26 | Eccezioni personali inserite nel CRM | tutto il calcolo sta nel CRM |
| D-27 | Regole del subagente: agenzia, una fattura al mese, correzione sul documento | ogni accordo si gestisce senza toccare il codice, con il motivo |
| D-28 | **Tutto sul backend, mai dai dati del frontend** | dal browser si può alterare tutto; sono soldi |

---

## 13. Glossario

| Termine | Significato |
|---|---|
| **Agente** | Decobrands SRL: riceve dal fornitore la provvigione agente |
| **Subagente** | collaboratore che segue i clienti; riceve da Decobrands la provvigione subagente ogni trimestre |
| **Agenzia** (`interscambio`) | legame cliente × fornitore × subagente con codice cliente del fornitore e sconto |
| **Scaglione** | fascia di sconto del cliente che fissa % agente e % subagente |
| **Pratica** | ordine di Decobrands verso un fornitore, con conferma, fatture e note di credito |
| **Bollettino** | prospetto mensile delle provvigioni che il fornitore riconosce a Decobrands |
| **Riconciliazione a cerniera** | confronto riga per riga fra bollettino e calcolo del CRM |
| **Fatturato / maturato** | provvigione riconosciuta all'emissione della fattura / al pagamento del cliente |
| **Storno / riaccredito** | sul fatturato: provvigione tolta se il cliente non paga / restituita quando paga |
| **Liquidazione** | pagamento trimestrale ai subagenti (Gen-Mar, Apr-Giu, Lug-Set, Ott-Dic) |
| **Integra** | gestionale di Decobrands, padrone delle anagrafiche clienti e fornitori |
| **Gestione Ordini** | applicazione esistente per gli ordini cliente (Express + EJS + n8n + LlamaIndex), resta in esercizio |
| **GLM-OCR** | modello di lettura dei documenti, servito in locale da vLLM sul server con GPU |
| **Seed** | dati di prova (spec §12, `dati.js`): la prova numerica della replica del prototipo |

---

## 14. Autovalutazione del PRD

- **Sezione più solida**: le regole (§5.2) e le storie (§7). Derivano da una specifica
  validata con il cliente e da un prototipo con circa 180 controlli automatici.
- **Sezione più debole**: le misure (§6). Mancano i valori di partenza e gli obiettivi sono
  ipotesi.
- **Ipotesi da verificare per prime**:
  1. GLM-OCR legge i documenti reali con affidabilità sufficiente (F0-A6);
  2. l'evidenziazione nel PDF è fattibile (F0-A7);
  3. le sessioni sono compatibili con la Gestione Ordini (F0-A3).
- **Prossimo passo consigliato**:
  1. rivedere con Matteo i §6 (valori di partenza e obiettivi) e §10.1 (domande);
  2. far approvare le 53 h del §10.3;
  3. sistemare le incoerenze del §10.4 nella specifica e nel preventivo;
  4. poi avviare F0.
