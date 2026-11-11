# Collaudo · Onda 1 · Pacchetto 1-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 1 hanno finito (e prima del controllo di fine onda).
Raccoglie in un solo passaggio la documentazione di tutti, così spec, guida e piano non si pestano.

## Contesto e regole

- Leggi `CLAUDE.md` (radice) per intero: §4 regole 2 e 3 (il perché accompagna sempre il cosa; ogni modifica si
  documenta: spec, §16.4, §19, guida, LEGGIMI, piano, poi `python3 strumenti/genera-pagine-doc.py`).
- Italiano semplice e conciso; niente parole inglesi inutili.
- Registro §19: una riga per decisione nuova o cambiata, **6 colonne** (D-nn, data, decisione, perché, chi, dove),
  numeri D-114…D-132 già assegnati nel piano (sotto); altre D-nn nuove solo di seguito all'ultima presente. Chi: «Ugo (collaudo
  08/11/2026)» per le regole confermate da Ugo, altrimenti «collaudo A-n» con l'ID del rilievo.
- Versione della spec in testa: alzala di uno (es. 8.61 → 8.62) con il riassunto delle modifiche dell'onda.
- Funzioni incerte segnalate come tali (D-06).
- Non toccare codice (`app/backend/src`, `app/frontend/{app,componenti,lib}` salvo `lib/guida.ts`), né prove, né `CLAUDE.md`
  (solo Ugo).

## Da raccogliere: sezioni *Da documentare* dei resoconti dell'onda

- `strumenti/opencode/resoconto-collaudo-1-01.md` (Motore: storni dalla fotografia, una fattura al mese, correzioni su NC, numero riusato)
- `strumenti/opencode/resoconto-collaudo-1-02.md` (Agenzie bloccate nel periodo chiuso (D-51 esteso))
- `strumenti/opencode/resoconto-collaudo-1-03.md` (Documenti: D-87 sulla fattura, documento in errore recuperabile, corpo non valido)
- `strumenti/opencode/resoconto-collaudo-1-04.md` (Impostazioni: il segreto vecchio non parte verso un server nuovo)
- `strumenti/opencode/resoconto-collaudo-1-05.md` (Sessione: timeout di inattività vero, durata massima, area sconosciuta)
- `strumenti/opencode/resoconto-collaudo-1-06.md` (Oggi: bollettini dell'anno prima e gruppo «Documenti da decidere»)
- `strumenti/opencode/resoconto-collaudo-1-07.md` (Blocco sotto i 744 px (D-44))
- `strumenti/opencode/resoconto-collaudo-1-08.md` (Due giri di jest sullo stesso database: il secondo si ferma subito)
- `strumenti/opencode/resoconto-collaudo-1-09.md` (Pulizia degli scartati senza cancellare un documento recuperato)
- `strumenti/opencode/resoconto-collaudo-1-10.md` (Casella: STARTTLS obbligatorio, email malformata, limite per allegato)
- `strumenti/opencode/resoconto-collaudo-1-11.md` (Proposta: P.IVA con prefisso del paese; «Affidabile» su un documento senza fornitore)
- `strumenti/opencode/resoconto-collaudo-1-12.md` (Canale SSE che si riapre dopo un errore HTTP)
- `strumenti/opencode/resoconto-collaudo-1-13.md` (Registro: 4xx registrati, dettaglio non valido in anomalia, anomalia atomica, filtri per giorno)
- `strumenti/opencode/resoconto-collaudo-1-14.md` (Segreti d'esempio rifiutati in esercizio)
- `strumenti/opencode/resoconto-collaudo-1-15.md` (Messa in esercizio: Caddyfile, HSTS, script, README)
- `strumenti/opencode/resoconto-collaudo-1-16.md` (Sollecito di pagamento: tempo limite e fatture già pagate)
- `strumenti/opencode/resoconto-collaudo-1-17.md` (PDF del bollettino con PDF.js invece di <object>)
- `strumenti/opencode/resoconto-collaudo-1-18.md` (Campo di ricerca: voce attiva annunciata e nome dell'input)
- `strumenti/opencode/resoconto-collaudo-1-19.md` (Tabelle che ricordano lo stato: Subagenti, Utenti, Fornitori, Clienti; colonna di Utenti)
- `strumenti/opencode/resoconto-collaudo-1-20.md` (Avviso al vecchio indirizzo quando cambia l'email di un utente)
- `strumenti/opencode/resoconto-collaudo-1-21.md` (Pulizia della radice e cartelle di uscita ignorate)
- `strumenti/opencode/resoconto-collaudo-1-22.md` (Prove nel browser vecchie o fragili)
- `strumenti/opencode/resoconto-collaudo-1-23.md` (Avvisi annunciati dal lettore di schermo; errori come alert)
- `strumenti/opencode/resoconto-collaudo-1-24.md` (Prova a matrice dei permessi su tutte le rotte)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro, in ordine di numero)

Numeri già assegnati nel piano (D-114…D-132): usa **esattamente** questi, una volta sola. Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede l'utente, il testo in `guida.ts`.

| D-114 | 08/11/2026 | **Agenzie bloccate nel periodo chiuso (D-51 esteso a `interscambio`).** Creazione, eliminazione e modifica di subagente, fornitore, sconto, % dell'agenzia, regola mensile o `valido_dal` di un'agenzia con `valido_dal` ≤ ultima chiusura del fornitore → 409 «chiudi l'agenzia e aprine una nuova da una data successiva»; `valido_al` si sposta solo dopo la chiusura; la riga del fornitore si blocca `FOR UPDATE` nella stessa transazione. | L'agenzia decide subagente, sconto e percentuale di ogni documento alla sua data (D-35): cambiarla sul posto spostava provvigioni di trimestri liquidati e mandava gli storni al subagente sbagliato (collaudo A2-01, A3-01). | Ugo (collaudo 08/11/2026, U1) | §4.2.6, §7.6; `clienti.ts`, `fornitori.ts` |
| D-127 | 08/11/2026 | **Il blocco sotto i 744 px vale sulla larghezza della finestra, anche con lo zoom.** `@media (max-width: 743px)`: chi ingrandisce al 200 % su uno schermo da 1440 px vede la pagina «usa un computer o un tablet». Eccezione voluta a WCAG 1.4.10. Precisa D-44. | Il CRM si usa da computer e tablet (D-44); bloccare su `screen.width` lascerebbe passare finestre davvero strette. | Ugo (collaudo 08/11/2026, U17) | §16.6; `app/layout.tsx`, `stile.css` |
| D-117 | 08/11/2026 | **Avviso al vecchio indirizzo quando cambia l'email di un utente.** Se un amministratore o il superutente cambia l'email di un utente, dopo il commit il server manda al vecchio indirizzo un'email con chi ha fatto il cambio e quando; un invio fallito apre un'anomalia ma non annulla la modifica. | Un amministratore poteva cambiare l'email di un operatore e reimpostarne la password per entrare al suo posto: l'avviso lo rende visibile alla persona (collaudo A1, D-39). | Ugo (collaudo 08/11/2026, U4) | §7.13; `utenti.ts` |
| D-129 | 08/11/2026 | **La pagina d'accesso si svuota dopo 2 minuti senza tasti.** È voluto: sulla postazione lasciata aperta i campi scritti non restano a vista. Eccezione voluta a WCAG 2.2.1. | Sicurezza della postazione, come il timeout di inattività (D-89) (collaudo A7). | Ugo (collaudo 08/11/2026, U19) | §7.0; `ScenaAccesso.tsx` |
| D-131 | 08/11/2026 | **D-87 nell'app: blocco su *Apri la pratica*.** Un ordine senza fornitore, agenzia o scaglione resta in coda come «da controllare»; *Apri la pratica* risponde 409 con il dato mancante. L'etichetta «da configurare» in coda è solo del prototipo. Precisa D-87. | Il blocco sui soldi c'è già (niente pratica, niente 0 %); lo stato in coda costava un pacchetto in più senza cambiare il risultato (collaudo A9-09). | Ugo (collaudo 08/11/2026, U22) | §6.1; `documenti.ts` |

## Righe *Perché* senza numero nuovo (confermano una regola esistente)

- §6.6 e guida — *Perché (U23, D-06 confermata):* il rettangolo sul valore è verificato con il server di lettura cloud; con GLM-OCR locale e con i documenti scansionati è ancora da verificare.

### Decisioni di Ugo da applicare in questa onda (senza codice)

- **U22 → D-131** (A9-09, opzione a): spec §6.1 e riga D-87 dicono «nell'app il blocco è su *Apri la pratica* (409 con il dato mancante); l'etichetta “da configurare” in coda è del prototipo»; in §6.1 *Perché* aggiungi «fornitore»; in `guida.ts` (Documenti, *sapere*) copia la frase di `prototipo-alternativo/assets/guida.js:122` e una riga sul cliente riconosciuto per P.IVA o ragione sociale (D-91, D-124).
- **U23** (A9-01, A9-02): formula unica per il rettangolo nel PDF: «verificato con il server di lettura cloud; con GLM-OCR locale e con documenti scansionati o fotografati è ancora da verificare». Usala in `guida.ts`, `guida.js`, `LEGGIMI.md` e nel PRD.
- **U19 → D-129**: solo la riga del §19 e il *Perché* in §7.0.
- **U26** (A9-05): in `piano-lavoro-crm.md` aggiungi in §11 (F7) quattro attività già fatte, **da approvare**: D-87 blocco dell'ordine senza fornitore, agenzia o scaglione — **2 h**; D-91/D-92 riconoscimento del cliente per P.IVA e ragione sociale — **2 h**; rettangolo sul valore con PDF.js (`PdfEvidenziato`, spunta verde) — **3 h**; D-93/D-94 elenco Documenti nel layout con aggiornamento via SSE — **3 h**. Totale **10 h da approvare** (stime dell'orchestratore dai commit `f1039f9`, `89d31cd` e dalla spec 8.55–8.61).
- **U9**: in `piano-lavoro-crm.md` §12 aggiungi l'attività nuova **«Righe dei bollettini dal PDF»** — **12 h da approvare**: lettura del PDF del bollettino con uno schema di estrazione proprio (3 h), rotta che crea le righe in transazione con abbinamento ai documenti per `documento_id` o numero + data (D-34) (3 h), finestra di controllo e correzione delle righe come per i documenti (4 h), prove backend e browser (2 h). Perché la stima: è un flusso completo come la lettura dei documenti (lettura, controllo, abbinamento), ridotto perché riusa connettore e finestra di correzione. Dipende da: F6 (lettura), D-119.
- **U25**: non è per te. La regola «chi cambia il seed lancia `app_flusso.py` e `app_bollettini.py`» la scrive Ugo in `CLAUDE.md` §4.

## Rilievi di documentazione assegnati a questa onda

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

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-1-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-1-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
