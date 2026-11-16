# Preventivo — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Redatto da:** Ugo Volpato — AI Consultant
**Data:** 04/09/2026 — **aggiornato il 15/11/2026**: versione **0.2.7** in preparazione (versioni 0.2.1 → 0.2.6 consegnate e provate sui documenti veri); variazioni §5 salite a 137 h con V19…V25: documenti in coda e lettura, riconoscimento di fornitore e cliente, anagrafica del vecchio CRM e agenzie, percentuali dal flusso, correzione dei dati letti, sconto di riga e importo calcolato, filtro per stato nell'abbinamento; V18 resta il collaudo delle onde 0–2, fuori dai totali. Il 13/11/2026: versione **0.2.0** consegnata e provata per i documenti veri; collaudo con le onde 0, 0 bis, 1, 2 e i pacchetti scelti (3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01); variazioni §5 a 92 h con F7-A0, F7-A3, F7-A5, F7-A6 e F7-A7. Aggiornato il 19/10/2026 (variazioni da approvare §5: 59 h, con accesso Microsoft 365, registro unico e database ponte; grafica del prototipo ufficiale, margine 18 h, calcoli solo sul backend) e il 15/10/2026 (ingresso documenti interno senza n8n, GLM-OCR in locale; modulo ordini cliente rinviato)
**Cliente:** Decobrands S.r.l. (da confermare)
**Modalità di sviluppo:** assistita da AI (analisi, generazione e codifica tramite modelli AI)

---

## 1. Oggetto

Web app full-stack con **lo stesso stack del Portale B2B Luis** (**Next.js 16 + React 19 + TypeScript**, **NestJS 11**, **Prisma 7**, **PostgreSQL con un database proprio del CRM** `decobrands_db` — **nessuna tabella della Gestione Ordini** (D-29) —, pubblicazione con **Caddy** e due processi Node) per:

- tracciare il percorso **ordine → conferma d'ordine → fattura** delle pratiche verso i fornitori, con **upload dei documenti PDF** e scadenze conferma automatiche;
- controllare i **bollettini** mensili dei fornitori, confrontando riga per riga il **riconosciuto** con il **calcolato** (differenze evidenziate, verifica/contestazione);
- **liquidare i subagenti** ogni trimestre con rendiconto calcolato al volo dagli scaglioni e **export a 8 campi**;
- avere **utenti propri** del CRM, con **nome utente (o email) e password** come nella Gestione Ordini (D-39); clienti e fornitori in sola lettura dalle **viste di Integra** del database ponte (D-32);
- far entrare **tutti i documenti** (ordini a fornitore, conferme, fatture, note di credito, bollettini) da un **ingresso documenti interno**: casella email e caricamento, coda nel database, lettura con **GLM-OCR su un server locale con GPU**, affidabilità per campo, controllo dell'operatore con il PDF a fianco — **senza n8n e senza servizi esterni**.

La **sostituzione della Gestione Ordini** (ordini cliente, CSV Integra) è prevista in una fase successiva, **esclusa** da questo preventivo (spec §17).

Riferimento tecnico: `specifica-crm-provvigioni.md` v5.4 (stack §3.4, §16.3; ingresso documenti §6.5; registro delle decisioni §19) · piano: `piano-lavoro-crm.md` v1.8 · sintesi: `PRD-crm-provvigioni.md` · prototipo ufficiale: `prototipo-alternativo/`.

## 2. Tariffe applicate (indicative, mercato Italia)

| Voce | Tariffa oraria |
|---|---|
| Analisi, consulenza e prototipazione | € 80,00 |
| Sviluppo assistito da AI | € 55,00 |
| Sviluppo tradizionale (riferimento) | € 70,00 |

## 3. Attività già svolte (questa sessione)

| # | Attività | Ore | Tariffa | Importo |
|---|---|---|---|---|
| 1 | Analisi del flusso provvigioni (documento `ANALISI_CRM_PROVVIGIONI`, risposte Matteo Caironi) e redazione della **specifica v1.4 validata** con il cliente | 4 | € 80,00 | € 320,00 |
| 2 | Prototipo HTML navigabile: launcher, login, dashboard, anagrafiche (fornitori con scaglioni, agenti/subagenti, interscambio), elenco/dettaglio pratiche, elenco/dettaglio bollettini, liquidazione; riorganizzazione a tab (dashboard, dettaglio pratica, liquidazione), strip riepilogo e regola contenitori dati stabili (v1.4 §2-V9) | 8 | € 80,00 | € 640,00 |
| 3 | Dati dimostrativi coerenti con il seed (§12): Gries 0/1/5/10/100 %, subagenti Bastasin/Nista, nota di credito e conferma ridotta (7/10) | 2 | € 80,00 | € 160,00 |
| 4 | Stile applicato alla app esistente (Bootstrap 5.3, navbar scura, sfondo `#f5f6f8`, logo) + footer/versione — primo prototipo, ora archivio | 1 | € 80,00 | € 80,00 |
| 5 | Debug e rifiniture (footer fisso, launcher, compatibilità anteprima) | 1 | € 80,00 | € 80,00 |
| **Subtotale già svolto** | | **16** | | **€ 1.280,00** |

## 4. Attività da svolgere (implementazione Next.js + NestJS + Prisma)

La colonna "Ore (AI)" è la stima con sviluppo assistito; "Ore (senza AI)" è il tempo che richiederebbe uno sviluppo tradizionale (riferimento).

| # | Attività | Ore (AI) | Ore (senza AI) | Importo (AI) |
|---|---|---|---|---|
| 1 | Setup progetto sul modello Luis B2B (Next.js + NestJS + Prisma), database PostgreSQL **proprio** `decobrands_db` (nessuna tabella della Gestione Ordini, D-29), Caddy + due processi Node (8001/8002), Docker solo in sviluppo | 3 | 8 | € 165,00 |
| 2 | Accesso **ripreso da Luis B2B** su una tabella `utenti` propria: sessioni nel DB, CSRF, Helmet, limite tentativi, guard `requireAuth`/permessi, pagina di accesso con **nome utente (o email) e password** (D-39; la variazione V10 sull'accesso con Microsoft 365 è sostituita) | 3 | 8 | € 165,00 |
| 3 | Schema Prisma delle **nuove tabelle CRM** (fornitori, scaglioni, eccezioni, agenti, subagenti, interscambio, pratiche + righe + documenti, bollettini + righe, eventi, utenti, copia dei clienti da Integra) | 6 | 16 | € 330,00 |
| 4 | Motore provvigioni **solo lato server**: scaglioni, eccezioni, maturato/fatturato, congelamento percentuali alla verifica, note di credito, confronto bollettini riconosciuto vs calcolato (§4.2, §5.3, §5.5, §5.11, §10) | 5 | 14 | € 275,00 |
| 5 | API REST NestJS: CRUD fornitori + scaglioni, interscambio (vincolo unico), pratiche + righe + documenti + cambio stato, **upload documenti** (multer), bollettini + righe con calcolo differenze, liquidazione, controllo pianificato conferme scadute | 12 | 30 | € 660,00 |
| 6 | Frontend Next.js viste CRM come il prototipo ufficiale `prototipo-alternativo/` (`stile.css`, Public Sans, niente Bootstrap, spec D-24): accesso, Oggi a gruppi, anagrafiche, pratica con *Riepilogo · Righe a confronto* e documenti affiancati, bollettini a 6 mesi con riconciliazione, liquidazione con *Documenti*, tabelle standard (spec §16.4) | 12 | 30 | € 660,00 |
| 7 | **Ingresso documenti senza n8n** (spec §6.5): lettura casella email + caricamento, coda su PostgreSQL, servizio di lettura **GLM-OCR/vLLM** con schema per tipo documento, **affidabilità per campo** dai `logprobs`, controlli fissi, schermata Documenti con **finestra di correzione** (PDF a sinistra, campi a destra), installazione sul server GPU e prima taratura | 18 | 45 | € 990,00 |
| 8 | Test (Jest + supertest) ed end-to-end, collaudo con dati seed (§12), rifiniture responsive, pubblicazione | 5 | 13 | € 275,00 |
| 9 | Registro eventi (§15) adattato dai moduli `audit`/`events` di Luis B2B + schermata `/eventi` | 2 | 5 | € 110,00 |
| 10 | Export liquidazione a 8 campi (§11) e gestione trimestri | 1 | 3 | € 55,00 |
| 11 | **Prova GLM-OCR su documenti reali** (conferme, fatture, bollettini di 2–3 fornitori) sul server GPU: esito per campo, affidabilità, tempi; prime soglie e stima dell'adattamento | 4 | 10 | € 220,00 |
| | *Subtotale attività* | *71* | *182* | *€ 3.905,00* |
| 12 | **Margine di rischio (25 %)**: imprevisti su lettura documenti, server GPU, accesso e dati reali. Riserva usata solo se necessaria e rendicontata a ore | 18 | 46 | € 990,00 |
| **Subtotale da svolgere** | | **89** | **228** | **€ 4.895,00** |

## 5. Variazioni da approvare (fuori preventivo)

Funzioni nate dal confronto con il cliente dopo la specifica iniziale e già presenti nel
prototipo ufficiale, più quelle nate dal collaudo sui documenti veri e dal primo uso reale
(V13…V25). Le voci V19…V25 raggruppano per argomento il lavoro delle versioni 0.2.1 → 0.2.7
(non una riga per commit). Si sviluppano **solo se approvate**; ognuna è indipendente dalle altre.

| # | Attività (piano) | Perché | Ore (AI) | Importo (AI) |
|---|---|---|---|---|
| V1 | Prova di fattibilità dell'**evidenziazione del valore nel documento** (F0-A7) | rendere certa o escludere una funzione vista nel prototipo (D-06) | 6 | € 330,00 |
| V2 | **Sincronizzazione da Integra** di clienti e fornitori dalle viste del database, ogni 60 s (F1-A4) | sostituisce l'import da file (D-01, D-07) | 3 | € 165,00 |
| V3 | **Percentuali con data di validità** ed **eccezioni personali** dei subagenti inserite nel CRM (F1-A5) | i documenti si calcolano con le percentuali in vigore alla loro data (D-25, D-26) | 3 | € 165,00 |
| V4 | **Regole del subagente**: % per cliente, una fattura al mese, correzione sul singolo documento con motivo (F1-A6) | ogni accordo con i subagenti si gestisce senza cambiare il programma (D-27) | 4 | € 220,00 |
| V5 | **Incassi dei clienti**: storno e riaccredito, riconoscimento al pagamento, pagamenti da sollecitare (F3-A3) | regole chiarite il 16 e il 18/10/2026 (D-11) | 4 | € 220,00 |
| V6 | **Esportazione completa** della liquidazione: tre contenuti × Excel, PDF, CSV (F4-A3, era 1 h) | i tre usi reali del prospetto (D-04) | 3 | € 165,00 |
| V7 | **Report subagenti** e pagina **Analisi** con filtri, grafici ed esportazione (F4-A4, F4-A5) | controllo e analisi hanno bisogni diversi (D-18, D-19) | 13 | € 715,00 |
| V8 | **Filtri standard** e numeri aggiornati dal vivo (F4-A6) | un solo modo di filtrare in tutte le pagine (D-22, D-23) | 4 | € 220,00 |
| V9 | **Pagine di gestione**: ruoli e permessi, utenti, stato del sistema, impostazioni, documenti scartati, guida in linea (F5-A3…A8) | amministrazione senza intervento tecnico (D-05) | 13 | € 715,00 |
| V10 | **Accesso con Microsoft 365 o link via email**, solo su invito, senza password (F0-A3) | ⚠ **sostituita da D-39** (nome utente o email e password, come la Gestione Ordini): le 2 h restano nel piano F0-A3, riusate per superutente, password provvisoria e password dimenticata | 2 | € 110,00 |
| V11 | **Registro unico** di eventi e anomalie, con dettaglio controllato per codice e pagina delle anomalie (F5-A2) | un solo posto dove guardare cosa è successo (D-31) | 2 | € 110,00 |
| V12 | **Viste di Integra sul database ponte**: colonne e chiavi fissate sui dati veri (F0-A8) | le viste si provano senza toccare Integra (D-32) | 2 | € 110,00 |
| V13 | **Correzioni di sicurezza** dopo l'audit OWASP (F7-A0) | formula injection nei CSV, limite ai tentativi per persona e ai caricamenti, permessi su solleciti e scarti, registro senza dati sensibili, CSP completa (D-80…D-86) | 3 | € 165,00 |
| V14 | **Profilo, pagina di ingresso e timeout** di inattività di 30 minuti (F7-A3) | ogni utente sceglie dove atterra dopo l'accesso ed entra solo nelle aree che ha (D-88, D-89) | 4 | € 220,00 |
| V15 | **Onda 1 del collaudo — attività già fatte** (F7-A5): blocco dell'ordine senza fornitore, agenzia o scaglione; riconoscimento del cliente per P.IVA e ragione sociale; rettangolo sul valore nel PDF; elenco Documenti con aggiornamento dal vivo | i documenti veri hanno mostrato casi che il prototipo non copriva (D-87, D-91…D-94) | 10 | € 550,00 |
| V16 | **Onda 1 del collaudo — correzioni documentate** (F7-A6): documento in errore recuperabile, 400 sul corpo malformato, segreti d'esempio rifiutati in esercizio, messa in esercizio con HSTS | gli errori di lettura non devono bruciare i tentativi e la pubblicazione deve essere sicura (D-114…D-149) | 4 | € 220,00 |
| V17 | **Righe dei bollettini dal PDF** (F7-A7): lettura, creazione in transazione con abbinamento ai documenti, finestra di correzione, prove — ⚠ **non ancora fatta** (stima) | il bollettino arriva come PDF: le righe si devono ricavare dal documento, non digitare (D-34, D-119) | 12 | € 660,00 |
| V18 | **Collaudo onde 0–2 e correzioni per i documenti veri (13/11/2026)** — ore da definire (Ugo); comprende la diagnosi dello sconto non recuperabile dalla lettura grezza, il limite del selettore dei mesi dei Bollettini (si torna fino al primo documento) e la correzione della `Modale` (`<p>` → `<div>`) | le prove sui documenti veri hanno guidato correzioni e pacchetti scelti (3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01); le correzioni di difetti nostri e le diagnosi senza codice stanno qui, **fuori dai totali** | — | — |
| V19 | **Documenti in coda e lettura** (F7-A8): file caricati visibili subito e tolti dalla coda, coda in ordine di lettura aggiornata da sola, PDF su tutte le pagine col campo alla sua pagina, soglie di affidabilità dal server | un file appena caricato non deve sembrare perso, la coda deve leggere dal più vecchio e il PDF deve portare al valore da correggere; le soglie fisse nel browser potevano discordare dal server (D-151) | 8 | € 440,00 |
| V20 | **Riconoscimento di fornitore e cliente** (F7-A9): candidati da CRM e Integra (D-152), ricerca per parole (sigle e punteggiatura non contano), codice cliente nella ricerca, vocabolario dei nomi letti e somiglianza (D-164), P.IVA letta dal documento (D-165) | sui documenti veri la sola P.IVA o il solo nome non bastano: scegliere il primo a caso sposta la provvigione al subagente sbagliato (D-152, D-164, D-165) | 10 | € 550,00 |
| V21 | **Anagrafica del vecchio CRM e agenzie** (F7-A10): import additivo del vecchio CRM (D-156), agenzie del vecchio CRM valide dal 2000 e da confermare (D-158, D-159), «Aggiungi l'agenzia» dentro *Apri la pratica* | il vecchio CRM non ha date d'inizio e le agenzie vanno confermate; mancava un modo per creare l'agenzia senza uscire dal flusso (D-156, D-158, D-159) | 7 | € 385,00 |
| V22 | **Percentuali e scaglioni dal flusso** (F7-A11): percentuali mancanti con «Configura le percentuali», scaglioni aggiunti o tolti nella correzione (D-162, D-163), campi di ricerca senza numeri né pallino rosso durante il caricamento (D-161) | nel vecchio CRM non ci sono percentuali e senza scaglioni la pratica non si apre (D-161, D-162, D-163) | 5 | € 275,00 |
| V23 | **Correzione dei dati letti** (F7-A12): testata su tre righe con cliente e fornitore letto (pulsante ›), somma delle righe con avviso, cliente scelto che resta nel campo, riepilogo dell'affidabilità | l'operatore deve vedere subito cosa ha letto il modello, dove sta nel documento e se le righe sommano all'importo (versione 0.2.2) | 5 | € 275,00 |
| V24 | **Sconto di riga e importo calcolato o letto** (F7-A13): sconto percentuale nelle righe lette e corrette (D-178); importo di riga calcolato se non letto, con «Usa … €» quando il letto è discorde (D-179) | alcuni fornitori stampano prezzo e sconto separati e l'importo va distinto fra letto (da controllare) e calcolato, che il browser non manda mai (V12, D-178, D-179) | 6 | € 330,00 |
| V25 | **Filtro per stato nella ricerca delle pratiche** per l'abbinamento, secondo il tipo del documento (D-177) (F7-A14) | un ordine si abbina a una pratica con solo l'ordine, una fattura a una confermata, una nota di credito a una fatturata; il filtro lo applica il server (V12, D-177) | 4 | € 220,00 |
| | **Totale variazioni** | | **137** | **€ 7.535,00** |

Sulle variazioni approvate vale lo stesso margine di rischio del 25 % (fino a 34 h, € 1.870,00),
usato solo se serve e rendicontato a ore.

## 6. Riepilogo economico

| Voce | Ore | Importo |
|---|---|---|
| Attività già svolte | 16 | € 1.280,00 |
| Attività da svolgere (incluso margine 18 h) | 89 | € 4.895,00 |
| **Totale del preventivo** | **105** | **€ 6.175,00** |
| Variazioni da approvare (§5), tutte | 137 | € 7.535,00 |
| **Totale con tutte le variazioni** | **242** | **€ 13.710,00** |
| Margine sulle variazioni (riserva, solo se usato) | fino a 34 | fino a € 1.870,00 |

**Riferimento senza AI** — lo sviluppo tradizionale richiederebbe **228 ore** (≈ 2,6× le ore assistite, margine incluso): 228 h × € 70,00 = **€ 15.960,00**, per un totale di **€ 17.240,00** (€ 1.280,00 già svolto + € 15.960,00 sviluppo).

L'approccio assistito da AI consente un **risparmio di € 11.065,00** sul solo sviluppo (€ 15.960,00 → € 4.895,00, **−69%**).

## 7. Note

- ⚠ **Ogni calcolo e operazione sensibile si esegue sul server, dai dati del database, mai da dati presi dal frontend** (spec V12, D-28): è compreso nelle ore delle attività 4 e 5.

- Le ore della sezione "già svolte" sono una **stima** del tempo impiegato (analisi, specifica, prototipo e iterazioni); da confermare.
- **Ingresso documenti senza n8n (attività 7)**: sostituisce l'integrazione del modulo ordini cliente (6 h) prevista nella versione precedente; la lettura dei documenti non passa più dalla pipeline n8n + LlamaIndex della Gestione Ordini ma da GLM-OCR in locale: nessun costo per pagina, documenti che non escono dall'azienda, regole nel codice del CRM.
- **Server GPU** per GLM-OCR: hardware, sistema operativo e driver a carico del cliente; l'attività 7 copre installazione del servizio di lettura e taratura iniziale.
- **Stack allineato al Portale B2B Luis** (spec §16.3): il riuso di accesso, sicurezza, registro eventi e configurazione di pubblicazione riduce le attività 1, 2 e 9 di **5 ore**, reinvestite nella **prova di lettura dei documenti fornitore** (attività 11), principale rischio tecnico del progetto.
- **Margine di rischio 25 % (18 h, € 990,00)**: copre gli imprevisti più probabili (formati dei documenti fornitore, casella di posta per le password provvisorie, dati reali diversi dal seed). È una riserva: si consuma solo se serve e viene rendicontata a ore; le ore non usate non vengono fatturate.
- Il motore di calcolo è **solo lato server** (spec §10): eliminata la voce "motore lato client" della versione precedente.
- **CRM separato dalla Gestione Ordini** (spec D-29): database e utenti propri; la Gestione Ordini resta in esercizio e sarà inglobata con la vendita diretta (fase successiva). L'accesso è con **nome utente (o email) e password** (D-39, che sostituisce D-30): nessuna registrazione dell'app in Entra ID, serve solo una **casella SMTP** per la password provvisoria e la password dimenticata.
- **Database ponte per Integra** (spec D-32): lo prepara Ugo, collegato a Integra; il CRM legge solo le sue viste.
- **Grafica**: `stile.css` del prototipo ufficiale `prototipo-alternativo/`, carattere Public Sans, **niente Bootstrap** (spec D-24); stessa palette della Gestione Ordini.
- L'esito dell'attività 11 può richiedere una **stima aggiuntiva** per adattare la lettura ai formati dei singoli fornitori; sarà quotata a parte prima di procedere.
- Il costo ridotto dello sviluppo riflette la **velocizzazione dell'AI**, non una riduzione di qualità o delle garanzie.
- Tariffe indicative e personalizzabili; **IVA esclusa**.
- Fatture su più ordini e ordini fatturati in più tranche sono **inclusi** (spec §5.9, documenti a ponte).
- **Esclusa la sostituzione della Gestione Ordini** (ordini cliente, controlli articoli/alias/kit, giacenze, CSV Integra, spegnimento di n8n): fase successiva, da quotare a parte dopo la messa in esercizio del CRM (spec §17).
- **Esclusioni** (backlog spec §13): riga bollettino con solo totale cliente (B2), **popolamento dei dati storici dagli Excel manuali** (B6). Il consolidamento sconto (B4) è già definito nella specifica.
- **Percentuali con data di validità (B3) ed eccezioni personali (B1)**: non più escluse, sono la variazione V3 (§5).
- **Analisi e lavoro di prototipazione dopo il 15/10/2026** (prototipo ufficiale, PRD, regole del subagente, documenti della fase LLM): non conteggiati nelle attività già svolte; da concordare.
- **Esclusa la fase successiva con modelli linguistici e agenti in locale** (spec §18, `specifica-automazione-llm.md`): stima indicativa 46 h, da quotare a parte dopo la messa in esercizio.
