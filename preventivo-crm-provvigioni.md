# Preventivo — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Redatto da:** Ugo Volpato — AI Consultant
**Data:** 04/09/2026 — aggiornato il 18/10/2026 (variazioni da approvare §5: 53 h; grafica del prototipo ufficiale, margine 18 h, calcoli solo sul backend) e il 15/10/2026 (ingresso documenti interno senza n8n, GLM-OCR in locale; modulo ordini cliente rinviato)
**Cliente:** Decobrands S.r.l. (da confermare)
**Modalità di sviluppo:** assistita da AI (analisi, generazione e codifica tramite modelli AI)

---

## 1. Oggetto

Web app full-stack con **lo stesso stack del Portale B2B Luis** (**Next.js 16 + React 19 + TypeScript**, **NestJS 11**, **Prisma 7**, **PostgreSQL condiviso** con la Gestione Ordini — **senza modificare le tabelle esistenti** —, pubblicazione con **Caddy** e due processi Node) per:

- tracciare il percorso **ordine → conferma d'ordine → fattura** delle pratiche verso i fornitori, con **upload dei documenti PDF** e scadenze conferma automatiche;
- controllare i **bollettini** mensili dei fornitori, confrontando riga per riga il **riconosciuto** con il **calcolato** (differenze evidenziate, verifica/contestazione);
- **liquidare i subagenti** ogni trimestre con rendiconto calcolato al volo dagli scaglioni e **export a 8 campi**;
- condividere autenticazione, clienti, articoli e ordini con la Gestione Ordini esistente (stesse tabelle, stessi ruoli, `requireAuth`/`requireAdmin`);
- far entrare **tutti i documenti** (ordini a fornitore, conferme, fatture, note di credito, bollettini) da un **ingresso documenti interno**: casella email e caricamento, coda nel database, lettura con **GLM-OCR su un server locale con GPU**, affidabilità per campo, controllo dell'operatore con il PDF a fianco — **senza n8n e senza servizi esterni**.

La **sostituzione della Gestione Ordini** (ordini cliente, CSV Integra) è prevista in una fase successiva, **esclusa** da questo preventivo (spec §17).

Riferimento tecnico: `specifica-crm-provvigioni.md` v5.3 (stack §3.4, §16.3; ingresso documenti §6.5; registro delle decisioni §19) · piano: `piano-lavoro-crm.md` v1.7 · sintesi: `PRD-crm-provvigioni.md` · prototipo ufficiale: `prototipo-alternativo/`.

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
| 1 | Setup progetto sul modello Luis B2B (Next.js + NestJS + Prisma), collegamento al **PostgreSQL condiviso** `decobrands`, Caddy + due processi Node (8001/8002), Docker solo in sviluppo | 3 | 8 | € 165,00 |
| 2 | Autenticazione **ripresa da Luis B2B** sulla tabella `users` condivisa: sessioni nel DB, argon2, CSRF, Helmet, limite tentativi, cambio password / reset, guard `requireAuth`/`requireAdmin`; verifica accesso unico con la Gestione Ordini | 3 | 8 | € 165,00 |
| 3 | Schema Prisma delle **nuove tabelle CRM** (fornitori, scaglioni, eccezioni, agenti, subagenti, interscambio, pratiche + righe + documenti, bollettini + righe, eventi) + lettura delle tabelle esistenti condivise (ordini cliente, clienti, articoli, giacenze, log) | 6 | 16 | € 330,00 |
| 4 | Motore provvigioni **solo lato server**: scaglioni, eccezioni, maturato/fatturato, congelamento percentuali alla verifica, note di credito, confronto bollettini riconosciuto vs calcolato (§4.2, §5.3, §5.5, §5.11, §10) | 5 | 14 | € 275,00 |
| 5 | API REST NestJS: CRUD fornitori + scaglioni, interscambio (vincolo unico), pratiche + righe + documenti + cambio stato, **upload documenti** (multer), bollettini + righe con calcolo differenze, liquidazione, controllo pianificato conferme scadute | 12 | 30 | € 660,00 |
| 6 | Frontend Next.js viste CRM come il prototipo ufficiale `prototipo-alternativo/` (`stile.css`, Public Sans, niente Bootstrap, spec D-24): accesso, Oggi a gruppi, anagrafiche, pratica con *Riepilogo · Righe a confronto* e documenti affiancati, bollettini a 6 mesi con riconciliazione, liquidazione con *Documenti*, tabelle standard (spec §16.4) | 12 | 30 | € 660,00 |
| 7 | **Ingresso documenti senza n8n** (spec §6.5): lettura casella email + caricamento, coda su PostgreSQL, servizio di lettura **GLM-OCR/vLLM** con schema per tipo documento, **affidabilità per campo** dai `logprobs`, controlli fissi, schermata Documenti con **finestra di correzione** (PDF a sinistra, campi a destra), installazione sul server GPU e prima taratura | 18 | 45 | € 990,00 |
| 8 | Test (Jest + supertest) ed end-to-end, collaudo con dati seed (§12), rifiniture responsive, pubblicazione | 5 | 13 | € 275,00 |
| 9 | Registro eventi (§15) adattato dai moduli `audit`/`events` di Luis B2B + schermata `/eventi` | 2 | 5 | € 110,00 |
| 10 | Export liquidazione a 8 campi (§11) e gestione trimestri | 1 | 3 | € 55,00 |
| 11 | **Prova GLM-OCR su documenti reali** (conferme, fatture, bollettini di 2–3 fornitori) sul server GPU: esito per campo, affidabilità, tempi; prime soglie e stima dell'adattamento | 4 | 10 | € 220,00 |
| | *Subtotale attività* | *71* | *182* | *€ 3.905,00* |
| 12 | **Margine di rischio (25 %)**: imprevisti su lettura documenti, server GPU, accesso condiviso e dati reali. Riserva usata solo se necessaria e rendicontata a ore | 18 | 46 | € 990,00 |
| **Subtotale da svolgere** | | **89** | **228** | **€ 4.895,00** |

## 5. Variazioni da approvare (fuori preventivo)

Funzioni nate dal confronto con il cliente dopo la specifica iniziale e già presenti nel
prototipo ufficiale. Si sviluppano **solo se approvate**; ognuna è indipendente dalle altre.

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
| | **Totale variazioni** | | **53** | **€ 2.915,00** |

Sulle variazioni approvate vale lo stesso margine di rischio del 25 % (fino a 13 h, € 715,00),
usato solo se serve e rendicontato a ore.

## 6. Riepilogo economico

| Voce | Ore | Importo |
|---|---|---|
| Attività già svolte | 16 | € 1.280,00 |
| Attività da svolgere (incluso margine 18 h) | 89 | € 4.895,00 |
| **Totale del preventivo** | **105** | **€ 6.175,00** |
| Variazioni da approvare (§5), tutte | 53 | € 2.915,00 |
| **Totale con tutte le variazioni** | **158** | **€ 9.090,00** |
| Margine sulle variazioni (riserva, solo se usato) | fino a 13 | fino a € 715,00 |

**Riferimento senza AI** — lo sviluppo tradizionale richiederebbe **228 ore** (≈ 2,6× le ore assistite, margine incluso): 228 h × € 70,00 = **€ 15.960,00**, per un totale di **€ 17.240,00** (€ 1.280,00 già svolto + € 15.960,00 sviluppo).

L'approccio assistito da AI consente un **risparmio di € 11.065,00** sul solo sviluppo (€ 15.960,00 → € 4.895,00, **−69%**).

## 7. Note

- ⚠ **Ogni calcolo e operazione sensibile si esegue sul server, dai dati del database, mai da dati presi dal frontend** (spec V12, D-28): è compreso nelle ore delle attività 4 e 5.

- Le ore della sezione "già svolte" sono una **stima** del tempo impiegato (analisi, specifica, prototipo e iterazioni); da confermare.
- **Ingresso documenti senza n8n (attività 7)**: sostituisce l'integrazione del modulo ordini cliente (6 h) prevista nella versione precedente; la lettura dei documenti non passa più dalla pipeline n8n + LlamaIndex della Gestione Ordini ma da GLM-OCR in locale: nessun costo per pagina, documenti che non escono dall'azienda, regole nel codice del CRM.
- **Server GPU** per GLM-OCR: hardware, sistema operativo e driver a carico del cliente; l'attività 7 copre installazione del servizio di lettura e taratura iniziale.
- **Stack allineato al Portale B2B Luis** (spec §16.3): il riuso di accesso, sicurezza, registro eventi e configurazione di pubblicazione riduce le attività 1, 2 e 9 di **5 ore**, reinvestite nella **prova di lettura dei documenti fornitore** (attività 11), principale rischio tecnico del progetto.
- **Margine di rischio 25 % (18 h, € 990,00)**: copre gli imprevisti più probabili (formati dei documenti fornitore, compatibilità dell'accesso con la Gestione Ordini, dati reali diversi dal seed). È una riserva: si consuma solo se serve e viene rendicontata a ore; le ore non usate non vengono fatturate.
- Il motore di calcolo è **solo lato server** (spec §10): eliminata la voce "motore lato client" della versione precedente.
- **Accesso unico con la Gestione Ordini**: confermato se le sessioni sono compatibili (verifica nell'attività 2); in caso contrario login separato sulla stessa tabella utenti, senza variazione di ore.
- **Grafica**: `stile.css` del prototipo ufficiale `prototipo-alternativo/`, carattere Public Sans, **niente Bootstrap** (spec D-24); stessa palette della Gestione Ordini.
- L'esito dell'attività 11 può richiedere una **stima aggiuntiva** per adattare la lettura ai formati dei singoli fornitori; sarà quotata a parte prima di procedere.
- Il costo ridotto dello sviluppo riflette la **velocizzazione dell'AI**, non una riduzione di qualità o delle garanzie.
- Tariffe indicative e personalizzabili; **IVA esclusa**.
- Il progetto **condivide il database** con la Gestione Ordini: le tabelle esistenti vengono riusate **senza modifiche**; il CRM aggiunge solo le proprie tabelle (§4.2).
- Fatture su più ordini e ordini fatturati in più tranche sono **inclusi** (spec §5.9, documenti a ponte).
- **Esclusa la sostituzione della Gestione Ordini** (ordini cliente, controlli articoli/alias/kit, giacenze, CSV Integra, spegnimento di n8n): fase successiva, da quotare a parte dopo la messa in esercizio del CRM (spec §17).
- **Esclusioni** (backlog spec §13): riga bollettino con solo totale cliente (B2), **popolamento dei dati storici dagli Excel manuali** (B6). Il consolidamento sconto (B4) è già definito nella specifica.
- **Percentuali con data di validità (B3) ed eccezioni personali (B1)**: non più escluse, sono la variazione V3 (§5).
- **Analisi e lavoro di prototipazione dopo il 15/10/2026** (prototipo ufficiale, PRD, regole del subagente, documenti della fase LLM): non conteggiati nelle attività già svolte; da concordare.
- **Esclusa la fase successiva con modelli linguistici e agenti in locale** (spec §18, `specifica-automazione-llm.md`): stima indicativa 46 h, da quotare a parte dopo la messa in esercizio.
