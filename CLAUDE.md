# Decobrands CRM — istruzioni per gli agenti (Claude Code, OpenCode)

Questo file si carica all'avvio della CLI nella cartella del progetto. Dà la visione
d'insieme, le regole di lavoro e dove trovare tutto. I dettagli stanno nei documenti citati:
leggili prima di cambiare qualcosa.

## 1. Il progetto in breve

Decobrands SRL fa da **agente** per alcuni fornitori (Gries, Gasper, Ing's, Nordgarten, …)
verso i clienti (garden center, vivai) e si appoggia a **subagenti** che seguono i clienti.
Il CRM segue il ciclo delle provvigioni:

1. **Documenti**: ordini, conferme, fatture, note di credito e bollettini dei fornitori
   arrivano da un ingresso unico (casella email + caricamento). Vengono letti in locale
   con **GLM-OCR** (server GPU, vLLM), controllati e abbinati.
2. **Pratiche**: ogni ordine a fornitore è una pratica. Lo stato si ricava dai documenti
   arrivati (attesa conferma → attesa fattura → fatturata), non si scrive a mano.
3. **Bollettini**: ogni mese ogni fornitore comunica le provvigioni che riconosce a
   Decobrands. Il CRM le confronta con il proprio calcolo (riconciliazione "a cerniera").
4. **Liquidazioni**: ogni trimestre si pagano le provvigioni ai subagenti; il prospetto si
   esporta in Excel, PDF o CSV.
5. **Incassi dei clienti**: Decobrands non incassa, incassa il fornitore. Le regole:
   - provvigioni **sul fatturato**: se il cliente non paga, il fornitore storna e poi
     riaccredita. Lo storno va nella **liquidazione successiva**: il mese dopo per
     Decobrands, il trimestre dopo per il subagente, come voce negativa;
   - provvigioni **sul maturato**: la provvigione è riconosciuta nel mese in cui il
     cliente paga.
6. **Analisi**: BI per periodo, fornitore, subagente, cliente, con esportazione.

Anagrafiche: **clienti e fornitori solo da Integra** (gestionale; viste sul database,
sincronizzazione ogni pochi secondi), in sola lettura. I **subagenti** non sono in Integra
e si gestiscono per intero nel CRM.

La **vendita diretta** (ordini cliente, articoli, giacenze, alias e kit, esportazione per
Integra) è progettata ma **spenta**: ampliamento futuro (spec §17). Nel prototipo si
accende con `index.html?vendita=1`.

Persone: **Ugo Volpato** (sviluppatore, referente del progetto), **Matteo** (Decobrands,
cliente).

## 2. Dove sta cosa

| Percorso | Cosa contiene |
|---|---|
| `specifica-crm-provvigioni.md` | **Specifica** per chi sviluppa l'app (versione in testa). Fonte di verità di regole, schermate, componenti, API |
| `specifica-crm-provvigioni.md` §19 | **Registro delle decisioni D-01…**: cosa si è deciso e **perché** |
| `piano-lavoro-crm.md` | Fasi e attività (ore, dipendenze, file del prototipo da replicare); le ore fuori preventivo sono segnate **da approvare** |
| `PRD-crm-provvigioni.md` | PRD unico: problema, utenti, misure, storie con criteri, fuori ambito, rischi, domande e incoerenze fra i documenti (sintesi; vince la spec) |
| `specifica-automazione-llm.md` | Specifica tecnica della fase LLM e agenti in locale (A1–A8, `suggerimenti`, ombra → attivazione, V12) |
| `PRD-supporto-decisioni-llm.md` | PRD della fase successiva: modelli linguistici e agenti in locale (proposte con probabilità, in ombra prima, V12) |
| `preventivo-crm-provvigioni.md` | Preventivo |
| `ANALISI_CRM_PROVVIGIONI.md` | Analisi iniziale |
| `idee-supporto-decisioni.md` | Idee sul supporto alle decisioni con modelli linguistici (fase successiva, spec §18) |
| `STILE-GUIDA-DECOBRANDS.md` | Stile del primo prototipo e della Gestione Ordini (Bootstrap): **archivio**, per il CRM vale `prototipo-alternativo/assets/stile.css` |
| `prototipo-alternativo/` | **Prototipo ufficiale** (D-24; JavaScript puro, nessun build): sorgente di verità dell'interfaccia |
| `prototipo-crm/` | Primo prototipo (HTML + Bootstrap), **solo archivio**; contiene le pagine generate della documentazione (`specifica.html`, `preventivo.html`) |
| `app/` | Applicazione vera (Next.js + NestJS). È l'**unica cartella che va in produzione** (sparse checkout, vedi `app/README.md`) |
| `strumenti/genera-pagine-doc.py` | Rigenera `prototipo-crm/specifica.html` e `preventivo.html` dai `.md` |
| `strumenti/prove/flusso.py` | Prova completa del prototipo (Playwright): ~180 controlli |

Prototipo pubblicato: https://uvolpato.github.io/DecoBrandsCRM/prototipo-alternativo/index.html
Repository: https://github.com/uvolpato/DecoBrandsCRM

> **Prototipo ufficiale: `prototipo-alternativo/`** (D-24, spec §16.1). È la sorgente di
> verità per struttura, stile (`stile.css`, Public Sans, niente Bootstrap), componenti,
> testi e numeri. `prototipo-crm/` e `STILE-GUIDA-DECOBRANDS.md` restano come archivio: non
> sono un riferimento per l'app. La radice del sito (`index.html`) apre il prototipo
> ufficiale.

## 3. Il prototipo `prototipo-alternativo/`

Si apre `index.html` direttamente nel browser: niente server, niente build. Usa rotte con
`#/percorso` e salva i dati di prova nel `localStorage`. *Ripristina i dati di prova*
riporta tutto all'inizio; *Prova come* cambia utente e ruolo.

| File (`assets/`) | Ruolo |
|---|---|
| `dati.js` | Dati di prova (fornitori, clienti, abbinamenti, pratiche, bollettini, liquidazioni chiuse, impostazioni). "Oggi" simulato: 04/09/2026 |
| `motore.js` | Regole (`M.*`): stato pratica, percentuali datate, riconciliazione bollettini, `righeLiquidazione`, incassi, `analisiTrimestre`, `fattiAnalisi`, permessi |
| `componenti.js` | Libreria `CRM.*`: Pagina, Pannello, Schede, DataTable, FilterBar, RiepilogoFiltri, KpiRow, CampoRicerca/RicercaEntita, PeriodoMesi, Grafico, Modale, … Contiene anche icone, rotte (`CRM.rotta`) e memoria della schermata (`CRM.registra`) |
| `entita.js` | Entità dei campi di ricerca (fornitore, cliente, subagente, articolo, pratica, …) |
| `viste-giorno.js` | Oggi, Documenti, Pratiche, Pratica |
| `viste-periodo.js` | Bollettini, Bollettino, Liquidazioni (con Report subagenti) |
| `viste-analisi.js` | Analisi (BI) |
| `viste-anagrafiche.js` | Fornitori, Subagenti, Clienti |
| `viste-gestione.js` | Utenti, Stato del sistema, Impostazioni, Scartati, Guida |
| `viste-vendita.js`, `motore-vendita.js`, `esporta-integra.js` | Vendita diretta (spenta) |
| `esporta-liquidazione.js` | Modello fogli → blocchi per Excel/PDF/CSV; `CRM.esportaModello` (usato anche dall'Analisi) |
| `guida.js` | Testi della Guida in linea (`CRM.GUIDA`) |
| `viste-componenti.js` | Catalogo dei componenti con esempi (voce *Componenti*) |
| `lib/` | ExcelJS, jsPDF + AutoTable, Chart.js 4.4.4 (MIT), in locale |

Regole del codice del prototipo:
- Le viste sono **solo composizione** di componenti `CRM.*`. Se serve qualcosa di nuovo, si
  crea un componente parametrico riutilizzabile, lo si aggiunge al catalogo e alla spec
  §16.4.
- **Filtri standard** (D-22, spec §16.4.1):
  - le entità si filtrano sempre con un campo di ricerca a selezione multipla
    (`FilterBar { tipo: 'ricerca', entita, multipla: true }`), mai con una tendina;
  - le barre con più filtri hanno il riepilogo (`riepilogo: true`);
  - i numeri dei segmenti contano con gli altri filtri e si aggiornano subito
    (`conta`, D-23).
- Tutte le DataTable sono uguali:
  - riempiono lo spazio, con intestazione fissa;
  - l'ordinamento e i totali valgono su **tutto** l'elenco;
  - hanno la paginazione.
- Si torna sempre alla schermata precedente nello stesso punto: filtri, scheda,
  ordinamento, pagina, scorrimento (`CRM.registra`, spec §7.12).
- Nei punti non ovvi, un commento breve rimanda alla decisione (`// D-11 §19`).
- Nomi delle classi CSS: controlla che non esistano già (`grep` su `stile.css`) prima di
  crearne una nuova. Un doppione ha già rotto un riquadro (`.scelta`).

## 4. Regole di lavoro (obbligatorie)

0. ⚠ **Tutto sul backend, MAI dai dati del frontend** (spec V12, D-28): ogni calcolo (provvigioni, bollettini, liquidazione, Analisi, totali, esportazioni) e ogni operazione sensibile (stati, verifiche, chiusure, abbinamenti, correzioni, permessi, eventi) si esegue sul server partendo dal database; il frontend mostra e invia solo le scelte (id, valori digitati, motivo); il server ricarica, ricontrolla e ricalcola, e non salva mai un valore calcolato arrivato dal browser. Il prototipo calcola nel browser solo perché è una dimostrazione.
1. **Lingua**: si scrive in italiano, semplice e conciso, senza parole inglesi inutili:
   - interfaccia: "Esporta", "Riepilogo", "Filtro multiplo", non "export" o "dashboard";
   - risposte a Ugo: brevi, tecniche, senza ripetere quello che si vede;
   - commit in italiano.
2. **Il perché accompagna sempre il cosa** (spec §16.5): ogni decisione nuova o cambiata
   va registrata in tre posti:
   - una riga nel registro **§19** (D-nn: data, decisione, perché, chi, dove);
   - una riga *Perché* nella sezione della spec che la descrive;
   - se cambia le ore, l'attività nel piano §12.

   Chi sviluppa deve sapere cosa non "semplificare".
3. **Ogni modifica si documenta nello stesso lavoro**. Vanno tenuti allineati:
   - `specifica-crm-provvigioni.md`: sezione della pagina, §16.4 componenti, §19; si alza
     la versione in testa con il riassunto della modifica;
   - `prototipo-alternativo/assets/guida.js`: pulsanti, finestre, "da sapere" della pagina;
   - `prototipo-alternativo/LEGGIMI.md`;
   - `piano-lavoro-crm.md`: attività nuove o modificate, ore **da approvare**;
   - il catalogo `assets/viste-componenti.js`, se cambia un componente.

   Poi si lancia `python3 strumenti/genera-pagine-doc.py`.
4. **Prove**: dopo ogni modifica al prototipo lancia `python strumenti/prove/flusso.py`
   (servono `playwright` con Chromium e `openpyxl`). Deve chiudere con 0 KO. Aggiungi i
   controlli per ciò che hai fatto. Nei selettori le schede vanno cercate con
   `.schede-barra [role=tab]`, perché anche i segmenti hanno `role=tab`.
5. **Controllo visivo**: per le modifiche all'interfaccia fai una schermata (Playwright, a
   1440 px e a 390 px) e guardala prima di consegnare.
6. **Git**:
   - si lavora su `main`, con commit piccoli e messaggi in italiano;
   - non committare `image.png`, né le cartelle di uscita degli strumenti;
   - pubblica (`git push`) solo se Ugo lo chiede.
7. **Domande**: se una richiesta è ambigua o va contro una decisione del §19, chiedi
   prima di procedere. I dubbi aperti con il cliente stanno nella spec, ad esempio §5.14:
   - chi manda il sollecito di pagamento;
   - in che forma arrivano i solleciti dei fornitori;
   - i `giorni_incasso` per cliente;
   - l'email del cliente da Integra.

## 5. Decisioni chiave da non perdere (dettagli in spec §19)

- Clienti e fornitori solo da Integra, in sola lettura; subagenti gestiti nel CRM (D-01,
  D-07).
- Bollettino atteso entro un giorno fissato per fornitore; il sollecito parte solo dopo
  (D-03).
- Incassi:
  - storno e riaccredito sul fatturato;
  - riconoscimento al pagamento sul maturato;
  - storno alla liquidazione successiva (D-11).
- Pratica e documenti a schede: prima l'informazione aggregata e l'azione proposta, poi
  le righe (D-12, D-15).
- Bollettini: sempre 6 mesi, scelti con un selettore a mesi (D-16).
- Liquidazioni: due colonne, con le schede *Documenti* e *Report subagenti*; la BI
  completa è nella pagina **Analisi** (D-18), con importi per data del documento (D-19).
- Filtri standard e conteggi dal vivo (D-20 → D-23).
- Prototipo ufficiale `prototipo-alternativo/` (D-24).
- ⚠ **Tutto sul backend, mai dai dati del frontend** (V12, D-28).
- Vendita diretta spenta, ampliamento futuro (D-08).
- Evidenziazione dei valori nel PDF/Excel: **da verificare** con una prova di fattibilità
  prima di prometterla (D-06). Il cliente prende per certo ciò che vede nel prototipo:
  le funzioni incerte vanno segnalate come tali.

## 6. L'applicazione (`app/`)

Lo stack ricalca il **Portale B2B Luis** (spec §16.3):

| Livello | Scelta |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Backend | NestJS 11 + Prisma 7, PostgreSQL condiviso `decobrands` |
| Stile | `stile.css` del prototipo ufficiale, Public Sans, niente Bootstrap |
| Grafici | Chart.js |
| Excel | `exceljs` |
| Processi | Node 24, Caddy, due processi (porte 8001 e 8002) |

- ⚠ **Calcoli e operazioni sensibili solo nel backend NestJS, dal database; mai fidarsi dei dati del frontend** (V12, D-28).
- Da Luis si riusa **solo l'infrastruttura** (accesso, sessioni, CSRF, Prisma, registro
  eventi). Non si riusano le sue interfacce né il suo CSS.
- Le tabelle esistenti (Gestione Ordini, Integra) si leggono in sola lettura e non si
  migrano.
- Le attività sono nel piano: ogni attività è una slice con file propri, si consegna
  quando la checklist §16.1 è superata e i numeri sul seed §12 coincidono con il
  prototipo.
