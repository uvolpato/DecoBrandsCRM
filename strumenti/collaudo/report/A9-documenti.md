# A9 — Coerenza documenti

- **Skill caricate:** `engineering:documentation` (strumento Skill).
- **Prove lanciate:** nessuna (regola A9: solo lettura, niente app, niente `genera-pagine-doc.py`).
- **Metodo:** `graphify query` per orientarsi; poi grep mirati su `specifica-crm-provvigioni.md` (v8.61), `piano-lavoro-crm.md` (v2.0), `PRD-crm-provvigioni.md` (v1.1), `app/README.md`, `prototipo-alternativo/LEGGIMI.md`, `app/frontend/lib/guida.ts`; confronto con le rotte `@Controller/@Get…` di `app/backend/src`, i commenti `// D-nn` di `app/`, le pagine in `app/frontend/app/(app)`.
- **Controlli automatici fatti:**
  - §19: D-01…D-94 tutti presenti, nessun doppione; tutti i `D-nn` citati nel codice di `app/` (D-03…D-92) esistono nel §19.
  - pagine generate: `prototipo-crm/specifica.html` (08/11 11:02:20) e `preventivo.html` sono **più recenti** dei `.md` e contengono v8.61/D-94 → **allineate**, nessun rilievo.
- **Non controllato:** testo per testo di tutte le finestre della guida (solo Documenti, Pratica, Accesso, Comandi); `PRD-supporto-decisioni-llm.md`, `specifica-automazione-llm.md`, `preventivo-crm-provvigioni.md` nel merito; correttezza del codice (altri agenti).

---

### A9-01 — La guida dice che il rettangolo nel PDF «non si disegna ancora», ma l'app lo disegna
- Gravità: P3
- Dove: `app/frontend/lib/guida.ts:157` (Documenti, *sapere*) contro `app/frontend/componenti/PdfEvidenziato.tsx` (usato in `app/(app)/documenti/[id]/VistaDocumento.tsx:478`) e spec §6.6 titolo («cloud verificato · locale da verificare»), §6.5 r. 1519-1521, versione 8.59.
- Problema: dopo F0-A7 positiva sul connettore cloud il rettangolo c'è (posizione `esatta`); la guida promette meno del vero e non dice che il **locale (GLM-OCR) e gli scansionati** restano da verificare (D-06).
- Scenario: operatore apre *Correggi i dati letti* su un PDF letto da LlamaCloud → vede il rettangolo; la Guida dice che non c'è.
- Correzione puntuale: riga 157 → «⚠ Il rettangolo sul valore si disegna quando la posizione è *esatta* (verificato con il server di lettura cloud, D-06/F0-A7); con GLM-OCR locale e con documenti scansionati o fotografati è ancora da verificare e può mancare: sotto il documento c'è sempre pagina e precisione.» La riga 195 (finestra *Documenti della pratica*) resta giusta (lì `ConsultaDocumenti` non usa `PdfEvidenziato`). Stesso allineamento in `prototipo-alternativo/assets/guida.js` (voce Documenti).
- Prova che la verifica: `strumenti/prove/app_guida.py` (testo della voce Documenti), lettura a occhio.
- Esecutore: DeepSeek V4 Flash — testo.
- File toccati: `app/frontend/lib/guida.ts`, `prototipo-alternativo/assets/guida.js`
- Dipende da / correlato a: A9-02, D-06, spec 8.59

### A9-02 — LEGGIMI del prototipo: D-06 e prova `flusso.py` non aggiornati
- Gravità: P3
- Dove: `prototipo-alternativo/LEGGIMI.md:47` (avviso evidenziazione) e `:136` (Prove).
- Problema: r. 47 dice che la fattibilità «si misura con la prova F0-A7 … prima di confermarla» (prova già fatta per il cloud); r. 136 dice che `flusso.py` «deve chiudere con 0 KO», mentre CLAUDE.md §4 regola 4 (Ugo 30/10/2026) la rende non obbligatoria.
- Scenario: chi legge il LEGGIMI crede che la prova F0-A7 sia ancora da fare e che `flusso.py` blocchi la consegna.
- Correzione puntuale: r. 47 → «… prova F0-A7 positiva sul connettore cloud; resta da verificare con GLM-OCR locale e sugli scansionati (spec §6.6)». r. 136 → aggiungere «Non è più obbligatoria (Ugo, 30/10/2026): le prove che contano sono quelle dell'app (`strumenti/prove/app_*.py`, `npm test`).»
- Prova che la verifica: rilettura.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `prototipo-alternativo/LEGGIMI.md`
- Dipende da / correlato a: A9-01, D-06

### A9-03 — PRD fermo alla v1.1: accesso «Microsoft 365 o link, nessuna password» (D-30, sostituita da D-39)
- Gravità: P2 (regola di sicurezza descritta in modo sbagliato)
- Dove: `PRD-crm-provvigioni.md:3` (testata, fonti spec v4.9), `:672` («nessuna password (D-30)»), `:674` (invito/link di accesso), `:686` (sezione impostazioni «accesso con Microsoft 365»), `:739`, `:826` (F0-A3), `:1161` (§12 riga D-30); §12 «sintesi del §19» si ferma a **D-32** (mancano D-33…D-94). Codice reale: `app/backend/src/accesso.ts` (password, `TentativiGuard`), `password.ts:7` (`MINIMO = 8`), spec §19 D-39/D-41/D-65 (Impostazioni a 6 sezioni, `accesso` non si usa più).
- Problema: i criteri di accettazione del PRD descrivono un accesso senza password che non esiste più; il PRD dice di sé «vince la spec», ma le storie con criteri sono quelle che un collaudatore spunta.
- Scenario: chi collauda le storie del §7 controlla «nessuna password» e «7 sezioni con Microsoft 365» → segna KO un'app giusta, o peggio chiede di reintrodurre il link d'accesso senza password.
- Correzione puntuale: alzare a v1.2; testata: fonti spec v8.61; righe 672-674 → criteri di D-39/D-41 (nome utente o email + password, password provvisoria da cambiare, limite per persona e per IP, «Credenziali non valide» unico); 686 → 6 sezioni (D-65); 739 e 826 → D-39; §12: segnare D-30 «sostituita da D-39» e aggiungere almeno D-36, D-39, D-41, D-43, D-44, D-59, D-60, D-87; oppure scrivere in testa «sintesi ferma a D-32, il registro vero è spec §19».
- Prova che la verifica: `grep -n "Microsoft 365\|nessuna password" PRD-crm-provvigioni.md` → solo come voce storica.
- Esecutore: DeepSeek V4 Flash — documentazione (un file).
- File toccati: `PRD-crm-provvigioni.md`
- Dipende da / correlato a: A9-04, D-30, D-39, D-41, D-65

### A9-04 — Piano: «tutte approvate» in testa, ma titoli e note ancora «da approvare»; F5-A4 con invito e link
- Gravità: P3
- Dove: `piano-lavoro-crm.md:3` (v2.0: tutte le ore «da approvare» approvate il 04/11) contro `:147` (F0-A7 «FUORI PREVENTIVO, DA APPROVARE»), `:156` (F0-A8), `:174` (F1-A6), `:176` (F1-A4), `:219-220` (F4-A6, F4-A4/A5), `:233-234`, `:242` (F5-A2…A4); `:234` F5-A4 «modo di accesso, invito e link di accesso» (D-30, superata da D-39); `:154` nota F0-A7 «finché la prova non è fatta» (fatta per il cloud).
- Problema: non si capisce quali ore sono davvero ancora da approvare (le uniche nuove sono F7-A0 3 h e F7-A3 4 h, `:277`, `:292`).
- Scenario: Ugo/Matteo sommano le ore «da approvare» del corpo e trovano attività già approvate e consegnate.
- Correzione puntuale: sostituire «da approvare» con «approvata 04/11» nelle righe elencate (lasciarlo solo su F7-A0, F7-A3); `:234` → «utenti con nome utente/email e password provvisoria (D-39)»; `:154` → «prova fatta sul cloud (verde); resta il locale GLM-OCR».
- Prova che la verifica: `grep -n -i "da approvare" piano-lavoro-crm.md` → solo F7-A0, F7-A3 e la testata.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `piano-lavoro-crm.md`
- Dipende da / correlato a: A9-05, D-39

### A9-05 — Piano senza attività/ore per D-87, D-91/D-92, D-93, D-94 e il rettangolo PDF.js
- Gravità: P3
- Dove: `piano-lavoro-crm.md` (nessuna occorrenza di D-87, D-91…D-94, PDF.js); spec versioni 8.55-8.61 e §19 D-87…D-94 (07-08/11/2026).
- Problema: CLAUDE.md §4 regola 2: se una decisione cambia le ore, va l'attività nel piano. Questi lavori (blocco ordine senza agenzia/scaglione, P.IVA cliente, rettangolo PDF.js, layout Documenti con SSE) non hanno attività né ore, né la dicitura «senza ore aggiuntive».
- Scenario: a consuntivo le ore spese non si ritrovano nel piano; non si sa se sono fuori preventivo.
- Correzione puntuale: aggiungere in §10 (F6) o §11 (F7) una riga per gruppo (D-87; D-91+D-92; F0-A7→rettangolo PDF.js; D-93+D-94) con ore **da approvare**, oppure una nota «assorbite nel margine» firmata Ugo.
- Prova che la verifica: rilettura.
- Esecutore: DeepSeek V4 Flash — documentazione (le ore le decide Ugo).
- File toccati: `piano-lavoro-crm.md`
- Dipende da / correlato a: A9-04

### A9-06 — §19: righe D-73 e D-74 senza colonna *Perché*; D-11 con data non valida
- Gravità: P3
- Dove: `specifica-crm-provvigioni.md:4304` (D-73) e `:4305` (D-74): 5 celle invece di 6, il *Perché* è dentro la cella *Decisione* («**Perché:** la prima stesura…»); `:4242` D-11 data «16 e 18/10/2026».
- Problema: il formato del registro (data, decisione, perché, chi, dove) non è rispettato: la tabella si sfasa (la colonna *Perché* mostra «Ugo (prompt OpenCode)», *Chi* mostra i file).
- Scenario: nella pagina generata `specifica.html` le due righe hanno colonne spostate; chi cerca il perché nella sua colonna non lo trova.
- Correzione puntuale: in D-73 e D-74 spezzare la cella al testo «**Perché:**» → `| … | <perché> | Ugo (prompt OpenCode) | <dove> |`; D-11 → «16/10/2026 (rivista 18/10/2026)».
- Prova che la verifica: script che conta 6 celle per ogni riga `| D-nn |` (con `\|` escluso); poi `python3 strumenti/genera-pagine-doc.py`.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`, poi pagine generate
- Dipende da / correlato a: —

### A9-07 — 23 decisioni senza riga *Perché* nella sezione che descrivono (D-94 punta a §7.9 e §16.4.2 che non la citano)
- Gravità: P3
- Dove: spec, fuori dal §19 non compaiono mai: D-02, D-03, D-04, D-06, D-07, D-09, D-10, D-13, D-40, D-63, D-64, D-65, D-75, D-76, D-77, D-78, D-79, D-81, D-84, D-86, **D-92, D-93, D-94**. Casi recenti: D-94 «Dove: §7.9, §16.4.2» ma §7.9 (r. 2279 ss.) e §16.4.2 (r. 3920 ss.) non parlano di layout né di SSE per l'elenco; D-93 non è in §7.3/§7.9; D-92 (regola «P.IVA poi ragione sociale con un solo candidato», codice `app/backend/src/proposta.ts:198-240`) non è descritta in §6.5 (r. ~1450 cita solo `piva_cliente`, D-91). Altre ~40 (es. D-12, D-15…D-24, D-73, D-74, D-80, D-90, D-91) sono citate nel testo ma non in una riga *Perché*.
- Problema: CLAUDE.md §4 regola 2 (una riga *Perché* nella sezione della spec) non rispettata; chi sviluppa leggendo §7.9 non sa che l'elenco deve stare nel layout.
- Scenario: sviluppatore rifà `/documenti` con due `page.tsx` «per semplicità» → torna il ricaricamento a ogni clic (il motivo di D-94 sta solo nel §19).
- Correzione puntuale: aggiungere *Perché (D-nn):* almeno per D-92 in §6.5, D-93 in §7.3 e §7.9, D-94 in §7.9 e §16.4.2, D-63 in §11, D-64 in §16.4.1, D-65 in §7.15, D-81/D-84/D-86 in §3.3; le altre storiche si possono lasciare con una nota in testa al §19 «le decisioni ≤ D-13 hanno il perché solo qui».
- Prova che la verifica: lo script di questo report (cerca `Perch…D-nn` fuori dal §19).
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A9-08, D-92, D-93, D-94

### A9-08 — Documenti: le righe si aggiornano da sole (D-94), ma guida e §16.4.2/D-23 dicono «le tabelle no»
- Gravità: P3
- Dove: `app/frontend/app/(app)/documenti/VistaDocumenti.tsx:78-87` (su ogni evento SSE ricarica `documenti?stato=da_controllare` e fa `setDati`) contro `app/frontend/lib/guida.ts:67` («i contatori si aggiornano da soli; le tabelle no: compare “Ci sono aggiornamenti · Aggiorna”») e spec §16.4.2 r. ~3943 / D-23. Inoltre D-94 dice che il pattern «si estende ai dettagli (Pratica, Bollettino) e alle anagrafiche», ma `useEventi` è usato solo in `VistaOggi`, `VistaDocumenti`, `VistaPratiche`, `VistaBollettini`.
- Problema: due regole opposte per gli elenchi; D-94 annuncia un'estensione non fatta e non pianificata.
- Scenario: un documento arriva via email mentre l'operatore guarda l'elenco → la riga compare da sola senza *Aggiorna*, contro quanto dice la Guida.
- Correzione puntuale: in guida.ts:67 aggiungere «Eccezione: l'elenco *Da controllare* di Documenti si aggiorna da solo (D-94).»; in §16.4.2 la stessa eccezione con *Perché (D-94)*; nella riga D-94 cambiare «si estende» in «si estenderà (non ancora fatto)» oppure aggiungere l'attività nel piano (A9-05).
- Prova che la verifica: `strumenti/prove/app_documenti.py` (arrivo nuovo documento) + rilettura.
- Esecutore: DeepSeek V4 Flash — testo.
- File toccati: `app/frontend/lib/guida.ts`, `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A9-07, D-23, D-94 (vedi *Da decidere*)

### A9-09 — D-87: la spec parla di stato «da configurare» in coda; l'app blocca solo al clic. La guida dell'app non lo dice
- Gravità: P3 (la regola sui soldi è rispettata: niente pratica, niente 0%)
- Dove: spec §6.1 r. 1340-1344 e §19 D-87 («il documento resta in coda come «da configurare»») contro `app/backend/src/documenti.ts:1088-1098` (409 «Il fornitore non ha uno scaglione… configuralo» solo in *Apri la pratica*) e `app/backend/src/proposta.ts` (nessun controllo agenzia/scaglione nella proposta: la parola «configur» non compare). Guida: `app/frontend/lib/guida.ts:110-160` non cita D-87 né il cliente riconosciuto per P.IVA (D-91/D-92), mentre `prototipo-alternativo/assets/guida.js:122` sì. In più §6.1 *Perché* elenca «agenzia e scaglione», il §19 «fornitore, agenzia e scaglione».
- Problema: spec e guida del prototipo descrivono un'etichetta/stato in coda che l'app non mostra; la guida dell'app non spiega perché *Apri la pratica* può rifiutare.
- Scenario: ordine di cliente senza agenzia → in coda appare come un normale «da controllare»; al clic su *Apri la pratica* arriva l'errore, senza che la Guida lo abbia annunciato.
- Correzione puntuale: o (a) spec §6.1 e D-87: «nell'app il blocco è al momento di *Apri la pratica* (409 con il dato mancante); l'etichetta “da configurare” in coda è del prototipo», o (b) chiedere ad A4/A5 di portare `manca` nella proposta. In ogni caso copiare in `guida.ts` (Documenti, *sapere*) la frase di `guida.js:122` e una riga sul cliente riconosciuto per P.IVA/ragione sociale; in §6.1 *Perché* aggiungere «fornitore».
- Prova che la verifica: `strumenti/prove/app_documenti.py` (ordine senza agenzia → messaggio), `app/backend/test` su `apriPratica` 409.
- Esecutore: DeepSeek V4 Flash per i testi; V4 se si sceglie (b).
- File toccati: `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts` (+ `proposta.ts`, `VistaDocumento.tsx` se b)
- Dipende da / correlato a: A4 (proposta), D-87, D-91, D-92

### A9-10 — Guida e spec §7.3: pulsante *Carica un documento* nella pratica, che l'app non ha
- Gravità: P3
- Dove: `app/frontend/lib/guida.ts:193` (Pratiche, «Carica un documento — Nella scheda: carica un documento già destinato a questa pratica») e spec §7.3 r. 1842 e 1869 («*Carica un documento* … arrivano con F6») contro `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (testo assente; c'è solo *Prepara il sollecito*, r. 462). Il prototipo lo ha (`viste-giorno.js:683`).
- Problema: F6 è chiusa ma il pulsante non c'è; la guida lo promette.
- Scenario: l'operatore cerca *Carica un documento* nella testata della pratica e non lo trova.
- Correzione puntuale: o togliere la riga da guida.ts e scrivere in §7.3 r. 1869 «nell'app si carica da *Carica documenti* della barra e si abbina in Documenti», o aggiungere l'azione (frontend, A5).
- Prova che la verifica: `strumenti/prove/app_pratica.py`.
- Esecutore: DeepSeek V4 Flash (testi) — V4 se si aggiunge il pulsante.
- File toccati: `app/frontend/lib/guida.ts`, `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A5

### A9-11 — §8 API: rotte vecchie che non esistono e rotte vere non documentate (agenzie dei clienti)
- Gravità: P3
- Dove: spec §8.1 r. 3011-3013 (`/api/interscambio`, `/api/interscambio/:id`), r. 3017-3022 (`/api/ordini-fornitore/*` crea/aggiorna/elimina/righe/upload), `/api/fornitori-lista`, `/api/integra/stato`, r. 3010 `/clienti/:piva` — nessuna esiste in `app/backend/src`. Rotte vere senza riga in §8: `GET /api/clienti`, `GET /api/clienti/:id`, `GET /api/clienti/:id/pratiche`, `GET|POST /api/clienti/:id/agenzie`, `PUT|DELETE /api/clienti/:id/agenzie/:aid` (`clienti.ts:81-328`), `GET /api/agenti`, `GET /api/agenti/:id` (`subagenti.ts:68-82`), `POST /api/integra/prova`, `POST /api/integra/sincronizza` (`integra.ts:474-481`).
- Problema: le agenzie (sconto → percentuale della provvigione) si modificano da rotte non documentate, mentre la spec documenta quelle vecchie.
- Scenario: chi scrive un client o una prova segue §8 → `POST /api/interscambio` risponde 404.
- Correzione puntuale: sostituire le righe `interscambio` con le 4 di `/api/clienti/:id/agenzie` (permesso `dati.modifica`, corpo e 409 come nel codice); togliere `ordini-fornitore/*`, `fornitori-lista`, `integra/stato` o marcarle «non fatte»; aggiungere `clienti`, `agenti`, `integra/prova|sincronizza`; `/clienti/:piva` → `/clienti/:id`.
- Prova che la verifica: lo script di confronto rotte di questo report (estrae `@Controller/@Get…` e cerca in §8).
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`
- Dipende da / correlato a: D-35, D-60

### A9-12 — app/README: `deploy/` descritto con Caddyfile e script, ma è vuoto
- Gravità: P3
- Dove: `app/README.md:12` («deploy/ Caddyfile, script di avvio e pubblicazione») contro `git ls-files app/deploy` = solo `.gitkeep`; `avvia.bat` sta in `app/`, non in `deploy/`.
- Problema: la struttura annunciata non c'è (F7-A2 non ancora fatto).
- Scenario: chi prepara il server cerca il Caddyfile in `app/deploy/` e non lo trova.
- Correzione puntuale: r. 12 → «deploy/ (vuota: Caddyfile e script arrivano con F7-A2)»; aggiungere `avvia.bat` all'albero.
- Prova che la verifica: rilettura.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `app/README.md`
- Dipende da / correlato a: piano F7-A2

### A9-13 — app/README: lo sparse checkout in modo *cone* porta sul server anche i file della radice
- Gravità: P3
- Dove: `app/README.md` sezione *Pubblicazione* (`git clone --filter=blob:none --sparse …` + `git sparse-checkout set app`, poi «Sul server la radice contiene solo `app/`»); piano F7-A2 r. ~289 («la radice con specifica, prototipo e strumenti non va sul server»).
- Problema: in modo *cone* (predefinito con `--sparse`) git include **sempre** i file al primo livello della radice. Sono tracciati 22 file di radice: `specifica-crm-provvigioni.md`, `preventivo-crm-provvigioni.md`, `PRD-*.md`, `riuso-moduli-luis.xlsx`, `CLAUDE.md`, `AGENTS.md`, `opencode.json`, `index.html`, …
- Scenario: deploy secondo il README → specifica, preventivo con i prezzi e istruzioni per agenti finiscono sul server, contro quanto dichiarato.
- Correzione puntuale: sostituire con `git sparse-checkout set --no-cone '/app/'` (oppure dire esplicitamente che i file di radice restano e sono innocui perché Caddy serve solo le porte 8001/8002). Da verificare con una prova su una cartella vuota prima di cambiare il testo.
- Prova che la verifica: clone di prova in una cartella temporanea + `ls` della radice.
- Esecutore: DeepSeek V4 Flash — documentazione (un comando).
- File toccati: `app/README.md`, `piano-lavoro-crm.md` (F7-A2)
- Dipende da / correlato a: A9-12

### A9-14 — §16.4: componenti dell'app non censiti (fra cui `PdfEvidenziato`, il componente di D-06)
- Gravità: P3
- Dove: spec §16.4 (r. 3832-4005) contro `app/frontend/componenti/`: zero occorrenze in tutta la spec per `PdfEvidenziato`, `InCostruzione` (usato da `app/(app)/[...resto]/page.tsx`), `Aggiornamenti`, `Modale`; non in §16.4 anche `ConsultaDocumenti`, `Solleciti`, `Barra`, `Licenza`, `ScenaAccesso`, `Utente`, `Piccoli`, `Icona`, `ClasseBody`.
- Problema: CLAUDE.md §3: ogni componente nuovo va in §16.4 (e nel catalogo); il componente che decide quando disegnare il rettangolo (D-06) non è documentato.
- Scenario: chi rifà la finestra di correzione non sa che esiste `PdfEvidenziato` (PDF.js, margine 5 px, scorrimento al campo) e ne scrive un secondo.
- Correzione puntuale: in §16.4 una riga ciascuno almeno per `PdfEvidenziato` (props, regola: rettangolo solo con posizione `esatta`, D-06), `ConsultaDocumenti` (D-78/D-93), `Aggiornamenti` (D-23), `InCostruzione`, `Modale`.
- Prova che la verifica: grep dei nomi dei file di `componenti/` nel §16.4.
- Esecutore: DeepSeek V4 Flash — documentazione.
- File toccati: `specifica-crm-provvigioni.md`
- Dipende da / correlato a: A9-01, A8 (eventuali componenti morti)

---

## Riepilogo

| Gravità | Numero | ID |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 1 | A9-03 |
| P3 | 13 | A9-01, 02, 04-14 |

Niente rilievi su: pagine generate (allineate), D-nn del codice mancanti nel §19 (nessuno), comandi di avvio di `app/README.md` (`superutente`, `ponte:prova`, `lettura:prova`, `avvia.bat`, `NODE_ENV`, `.env.example` coincidono).

## Da decidere (Ugo)

- **D-94 contro D-23** (A9-08): l'elenco di Documenti ora aggiorna le **righe** da solo via SSE; D-23 e la Guida dicono che le tabelle aspettano *Aggiorna* «così le righe non si spostano mentre lavori». Va bene l'eccezione per Documenti? E l'estensione a Pratica, Bollettino e anagrafiche annunciata in D-94 si fa (con ore) o si toglie dalla decisione?
- **D-87** (A9-09): la coda deve mostrare lo stato «da configurare» prima del clic (come prototipo e spec), o basta il blocco su *Apri la pratica*?
- **D-06** (A9-01/02): con il cloud verificato, la funzione resta «da verificare» solo per GLM-OCR locale e scansionati: confermare questa formulazione da usare in guida, LEGGIMI, PRD e CLAUDE.md §5.
