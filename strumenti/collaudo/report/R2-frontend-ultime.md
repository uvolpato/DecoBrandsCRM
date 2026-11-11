# R2 — Frontend, ultime modifiche (89a4105..HEAD, 08–11/11/2026)

- **Skill caricate (strumento Skill)**: nextjs-app-router-patterns, vercel-react-best-practices, accessibility.
- **Prove**: `npx tsc --noEmit` in `app/frontend` → **OK** (0 errori). Nessuna prova Playwright, app non avviata (come richiesto).
- **Oggetto**: `git diff 89a4105 HEAD -- app/frontend` (18 file): VistaSoggetti + rotte `soggetti/`, CercaInIntegra, FormAgenzia, VistaDocumento/VistaDocumenti (proposta, agenzia, import), VistaClienti/Fornitori/Subagenti (codice soggetto, scaglioni D-113), FormModal (`azioniExtra`), Barra, Pagina, guida.ts, stile.css.
- **Non controllato**: resa visiva a 1440/768 px (niente schermate); prova da tastiera dal vivo e lettore di schermo; il backend se non per verificare le chiamate fatte da queste pagine (solo `documenti.ts` correggi, `clienti.ts` permessi agenzia, `storico.ts`, `anagrafica-integra.ts`, `soggetti.ts` conteggi); entità di ricerca (`lib/entita`) e `Campo`; FormModal fuori da `azioniExtra`.

Verificato e a posto (niente rilievo): CercaInIntegra non resta bloccata se il ponte non risponde (`api()` non lancia; il server risponde «ponte lento» oltre 3 s); doppio clic su *Importa* in CercaInIntegra coperto da `disabled` (aggiornamento discreto di React) e dal server idempotente (`gia_presente`); lista Soggetti con annullamento (`vivo`, `clearTimeout`), errore con *Riprova*, sagome con `useSagome`, memoria (filtri, ordine, pagina, sel, scheda); conteggi dei segmenti dal server con la ricerca (D-23); chiave `r.tipo` dei ruoli unica (`soggetto_id @unique` sui ruoli); classi CSS nuove (`soggetti-filtri`) non doppie, le altre usate esistono già; Modale con Esc, fuoco al primo campo e ritorno del fuoco.

---

### R2-01 — «Importa da Integra» del fornitore dal Documento cancella tutte le righe lette
- Gravità: **P0** (perdita di dati)
- Dove: app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:301-315 (`importaFornitore`) → app/backend/src/documenti.ts:658-773 (`correggi`, PUT `documenti/:id`)
- Problema: dopo l'import il browser manda `PUT documenti/:id { testata: { tipo, fornitore_id } }` senza `righe`; `correggi` fa sempre `deleteMany` dei campi `righe[*]` e ricrea solo quelle ricevute (`righeInput = []`), quindi tutte le righe OCR (valore letto, affidabilità, posizione) spariscono. In più il tipo viene segnato «verificato/corretto» dall'utente e import + collegamento sono due transazioni (V13).
- Scenario: fattura con 12 righe lette, fornitore non in anagrafica → esito `fornitore_da_integra` → clic «Importa da Integra» → fornitore creato, documento collegato, **0 righe**; l'importo delle righe e i controlli sono persi; se il PUT fallisce (utente con `dati.importa` ma senza `provvigioni.modifica` → 403) il fornitore resta importato e il documento scollegato.
- Correzione puntuale: (1) backend `correggi`: riscrivere le righe solo se il corpo le porta — `if (Array.isArray(b.righe)) { …deleteMany + createMany… }` (righe 732-773); (2) meglio: togliere il PUT dal browser e far collegare il documento al server, dentro la stessa transazione dell'import: `integra/importa` accetta `documento_id` facoltativo e, se il documento è `da_controllare` e la sua P.IVA letta coincide con quella importata, scrive `fornitore_id`/`fornitore_versione_id` sul documento (senza toccare campi e righe), oppure la proposta riconosce il fornitore per P.IVA dopo l'import e il frontend fa solo `carica()`.
- Prova che la verifica: test backend in `app/backend/test/documenti*.spec.ts`: PUT `documenti/:id` con sola `testata` → il numero di campi `righe[` resta invariato; `strumenti/prove/app_documenti*.py` con import fornitore da documento → righe ancora visibili nella scheda Righe.
- Esecutore: DeepSeek V4 — tocca transazione e due moduli backend.
- File toccati: app/backend/src/documenti.ts, app/backend/src/anagrafica-integra.ts (se si sceglie la via 2), app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx, test backend
- Dipende da / correlato a: D-111, D-113, V12/D-28, V13/D-36

### R2-02 — Scheda del soggetto: risposta vecchia sovrascrive la nuova (manca l'annullamento)
- Gravità: P2
- Dove: app/frontend/app/(app)/soggetti/VistaSoggetti.tsx:148-154 (`caricaDettaglio`)
- Problema: il fetch del dettaglio non ha `vivo`/AbortController: se arrivano fuori ordine, vince l'ultima risposta, non l'ultimo clic.
- Scenario: clic su C000010, subito su C000011; la risposta di C000010 arriva dopo → URL `/soggetti/11`, riga 11 evidenziata, pannello con i dati di C000010; *Modifica identità* o *Nuova sede* scrivono su C000010.
- Correzione puntuale: spostare il fetch nell'effetto con guardia: `useEffect(() => { if (!id) return; let vivo = true; setDetCaricando(true); void api<Dettaglio>('soggetti/' + id).then((r) => { if (!vivo) return; setDetCaricando(false); if (r.ok) setDet(r.dati); else avviso(r.messaggio, true); }); return () => { vivo = false; }; }, [id, versione]);` ed eliminare `caricaDettaglio`.
- Prova che la verifica: Playwright `strumenti/prove/app_soggetti*.py` con `page.route('**/api/soggetti/<id1>', ritardo 800 ms)`, due clic rapidi → il titolo del pannello è quello del secondo.
- Esecutore: DeepSeek V4 Flash — modifica locale di un effetto.
- File toccati: app/frontend/app/(app)/soggetti/VistaSoggetti.tsx
- Dipende da / correlato a: R2-03

### R2-03 — Scheda del soggetto: sagoma a ogni salvataggio e sotto i 150 ms (D-59)
- Gravità: P3
- Dove: VistaSoggetti.tsx:149 (`setDet(null)`), 518 (`detCaricando || caricando ? <SagomaCorpo />`)
- Problema: ogni `ricarica()` dopo un salvataggio azzera `det` → il pannello passa a sagoma e le schede si rimontano (perdono lo scorrimento); la sagoma del dettaglio non passa da `useSagome`, quindi lampeggia anche per risposte da 30 ms; anche un cambio di filtro (`caricando`) senza dettaglio mostra la sagoma del pannello.
- Scenario: salvo un recapito → pannello lampeggia vuoto, la tabella Recapiti torna in cima.
- Correzione puntuale: non azzerare `det` al ricaricamento dello stesso id (`if (det?.id !== id) setDet(null)`), e usare `const sagomaDet = useSagome(detCaricando && !det)` al posto di `detCaricando || caricando` alla riga 518.
- Prova che la verifica: Playwright: dopo «Salva recapito» il titolo del pannello non sparisce (nessun `.sagoma` nel pannello).
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/soggetti/VistaSoggetti.tsx
- Dipende da / correlato a: R2-02, D-59

### R2-04 — Scheda del soggetto: soggetto non trovato mostra «Nessun soggetto: cambia la ricerca»
- Gravità: P3
- Dove: VistaSoggetti.tsx:152 e 518-520
- Problema: se il dettaglio torna 404/500 (id vecchio nella memoria `sel`, URL scritto a mano, server giù) il pannello dice di cambiare la ricerca invece di dire che il soggetto non è stato caricato.
- Scenario: `sel` in memoria punta a un soggetto unito/rimosso → apro Soggetti → elenco pieno, pannello «Nessun soggetto…».
- Correzione puntuale: stato `erroreDet` impostato nel ramo `!r.ok`; nel pannello `erroreDet ? <div className="vuoto"><b>Soggetto non caricato</b>{erroreDet} <button … onClick={ricarica}>Riprova</button></div>`; se lo stato è 404 e l'id viene da `sel`, azzerare `setSel(undefined)`.
- Prova che la verifica: Playwright `/soggetti/999999` → testo «Soggetto non caricato».
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/soggetti/VistaSoggetti.tsx
- Dipende da / correlato a: R2-02

### R2-05 — FormAgenzia: subagente proposto deciso nel browser e con priorità sbagliata
- Gravità: P2
- Dove: app/frontend/componenti/FormAgenzia.tsx:51-58 (`normalizza`, `trovaSubagente`), 130 e 133
- Problema: il legame «nome del vecchio CRM → subagente» si decide nel browser (V12) e l'abbinamento per nome **vince** sul `subagente_id` già risolto dal server (`storico.ts:124`); se nessuno dei due c'è si ricade su `subagenti[0]`, cioè il primo subagente dell'elenco.
- Scenario: storico «Rossi Mario», `subagente_id` = 7 risolto dal server, in anagrafica esistono due «Mario Rossi» (omonimi) → si propone il primo trovato, non il 7. Storico «Bianchi Luca» non presente in anagrafica → il testo in testa dice «Dal vecchio CRM: subagente Bianchi Luca» ma il campo mostra il primo subagente in ordine alfabetico; con due Invio si crea l'agenzia sbagliata (provvigioni al subagente sbagliato).
- Correzione puntuale: il server risolve il subagente in `GET interscambio/storico` (campo `subagente_id` già c'è: riempirlo lì anche dal nome, unico o niente); nel frontend `const subPro = pro?.subagente_id ? { id: pro.subagente_id } : undefined;` togliere `normalizza`/`trovaSubagente`; per una agenzia nuova con storico senza subagente risolto, valore vuoto (`''`) invece di `subagenti[0]?.id`, così il campo obbligatorio va scelto.
- Prova che la verifica: test backend su `storico.ts` (nome → id unico, omonimi → null); Playwright: documento con storico non risolto → campo Subagente vuoto.
- Esecutore: DeepSeek V4 — backend + frontend, regola di riconoscimento.
- File toccati: app/backend/src/storico.ts, app/frontend/componenti/FormAgenzia.tsx, test
- Dipende da / correlato a: D-112, V12/D-28

### R2-06 — FormAgenzia: scaglioni in memoria di modulo, mai aggiornati, N letture
- Gravità: P3
- Dove: FormAgenzia.tsx:61 (`const scaglioni = new Map`), 109-116
- Problema: gli scaglioni di ogni fornitore si leggono con una chiamata `fornitori/:id` per fornitore e restano in una `Map` globale fino al ricaricamento della pagina; l'aiuto «Scaglioni in vigore» è quindi vecchio dopo una modifica e la scelta «in vigore» si calcola nel browser (`scontiInVigore`, V12). Il calcolo era già in VistaClienti, qui è solo spostato.
- Scenario: fornitore importato da Integra senza scaglioni (D-113) → apro un'agenzia (cache vuota per lui) → configuro gli scaglioni in Fornitori → riapro l'agenzia: l'aiuto non li mostra fino al ricaricamento; con 40 fornitori la prima apertura fa 40 richieste.
- Correzione puntuale: un endpoint `GET fornitori/sconti-in-vigore` (server: per fornitore la lista degli `sconto_min` della versione in vigore) letto a ogni apertura; togliere la `Map` di modulo e `scontiInVigore`.
- Prova che la verifica: test backend dell'endpoint; Playwright: dopo «Nuove percentuali» l'aiuto dell'agenzia mostra i nuovi sconti.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/backend/src/fornitori.ts, app/frontend/componenti/FormAgenzia.tsx
- Dipende da / correlato a: D-113, V12

### R2-07 — Documento: «Configura l'agenzia» attivo anche senza il permesso di salvarla
- Gravità: P3
- Dove: VistaDocumento.tsx:354 e 373
- Problema: il pulsante non controlla `dati.modifica`, richiesto da `POST clienti/:id/agenzie` (`clienti.ts:206`); in Clienti lo stesso pulsante è nascosto senza permesso.
- Scenario: utente con `provvigioni.modifica` ma solo lettura in Dati → compila il form → «Crea» → 403 «permesso negato» dopo aver scritto tutto.
- Correzione puntuale: `const puoAgenzia = puo('dati.modifica');` e sui due pulsanti `disabled={!puoAgenzia} title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined}`.
- Prova che la verifica: Playwright con un utente lettura-Dati → pulsante disabilitato.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx
- Dipende da / correlato a: D-106, D-50

### R2-08 — Documento: «Importa da Integra» senza stato di attesa (doppio clic)
- Gravità: P3
- Dove: VistaDocumento.tsx:347 e 365 (`importaFornitore`, `importaCliente`)
- Problema: il pulsante resta attivo durante le chiamate (import + PUT + ricarica): un secondo clic rifà tutto (il server non crea doppioni, ma rifà il PUT di R2-01 e mostra due avvisi).
- Scenario: ponte lento, l'utente clicca due volte → due import (`gia_presente` al secondo), due PUT, due «Fornitore importato».
- Correzione puntuale: `const [importo, setImporto] = useState(false)`; nelle due funzioni `if (importo) return; setImporto(true); try { … } finally { setImporto(false); }`; `disabled={!puoImporta || importo}` e testo «Importo…».
- Prova che la verifica: Playwright con risposta ritardata → il secondo clic non parte (una sola richiesta `integra/importa`).
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx
- Dipende da / correlato a: R2-01

### R2-09 — Guida: Cerca in Integra promette «apre il nuovo» e mancano le azioni nuove del Documento
- Gravità: P3
- Dove: app/frontend/lib/guida.ts (voci Clienti e Fornitori, finestra «Cerca in Integra», azione Importa; argomento Documenti)
- Problema: la guida dice che *Importa* «chiude la finestra, ricarica l'elenco e **apre il nuovo** cliente/fornitore», ma `CercaInIntegra.importa` chiama solo `onImportato` (= `carica`) e non naviga; nel Documento mancano «Importa da Integra» (fornitore e cliente), «Importa dal vecchio CRM» (spento), il caso «Non rappresentato» e i badge della lista Documenti («In Integra», «Non rappresentato», «Manca l'agenzia»); in Fornitori manca «Configura gli scaglioni».
- Scenario: l'utente importa e cerca la scheda aperta che la guida promette.
- Correzione puntuale: o `onImportato(id)` con `router.push('/clienti/' + id)` (l'id arriva nella risposta di `integra/importa`) — più utile —, o togliere «e apre il nuovo …» dalla guida; aggiungere in `guida.ts` (Documenti: pulsanti e «da sapere»; Fornitori: pulsante «Configura gli scaglioni»).
- Prova che la verifica: lettura; se si naviga, Playwright: dopo Importa l'URL è `/clienti/<id>`.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/lib/guida.ts, app/frontend/componenti/CercaInIntegra.tsx (se si naviga), VistaClienti.tsx, VistaFornitori.tsx
- Dipende da / correlato a: D-111, D-113, regola 3 di CLAUDE.md

### R2-10 — Clienti: barra filtri del prototipo («su una riga») non riportata nell'app
- Gravità: P3
- Dove: prototipo-alternativo/assets/stile.css:238-243 (`.clienti-filtri …`) e viste-anagrafiche.js:271; app/frontend/app/stile/stile.css e app/(app)/clienti/VistaClienti.tsx (nessun `clienti-filtri`)
- Problema: i commit f4f0d84/5d820ee mettono ricerca e segmenti di Clienti su una riga nel prototipo; nell'app le regole CSS e la classe sul contenitore mancano, quindi i due `stile.css` divergono e l'app non segue il prototipo.
- Scenario: Clienti a 1440 px nell'app: segmenti a capo sotto la ricerca, nel prototipo sulla stessa riga.
- Correzione puntuale: copiare le 6 righe `.clienti-filtri …` nello `stile.css` dell'app (dopo `.soggetti-filtri`) e aggiungere `clienti-filtri` al `div.pila.riempi` della colonna sinistra di VistaClienti (riga ~192).
- Prova che la verifica: schermata Playwright 1440/768 di `/clienti`.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/stile/stile.css, app/frontend/app/(app)/clienti/VistaClienti.tsx
- Dipende da / correlato a: D-22, D-24

### R2-11 — Cerca in Integra: tutti i pulsanti si chiamano «Importa»
- Gravità: P3
- Dove: app/frontend/componenti/CercaInIntegra.tsx:90-91
- Problema: fino a 10 pulsanti con lo stesso nome accessibile; col lettore di schermo o nell'elenco dei controlli non si sa quale riga importano.
- Scenario: NVDA, elenco pulsanti: «Importa, Importa, Importa…».
- Correzione puntuale: `aria-label={'Importa ' + (x.ragione_sociale || x.codice)}` sul `<button>`.
- Prova che la verifica: Playwright `get_by_role('button', name='Importa <ragione sociale>')`.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/componenti/CercaInIntegra.tsx
- Dipende da / correlato a: —

### R2-12 — Lista Documenti: il cliente da importare non ha il suo segno
- Gravità: P3
- Dove: app/frontend/app/(app)/documenti/VistaDocumenti.tsx:20-25 (blocco `stato`)
- Problema: l'interfaccia riceve `cliente_da_integra` ma mostra solo «In Integra» per il fornitore; un documento con esito `cliente_da_integra` in lista non dice che c'è un cliente da importare.
- Scenario: fattura con cliente non in anagrafica ma presente in Integra → in lista nessun segno; si scopre solo aprendo il documento.
- Correzione puntuale: aggiungere `d.cliente_da_integra` alla condizione e `{d.cliente_da_integra ? <Stato v="info">Cliente in Integra</Stato> : null}` (e il testo «In Integra» del fornitore diventa «Fornitore in Integra» per distinguerli).
- Prova che la verifica: Playwright sulla lista Documenti con il seed del caso.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/documenti/VistaDocumenti.tsx, guida.ts
- Dipende da / correlato a: R2-09, D-111

### R2-13 — FormAgenzia: caricamento con testo «Caricamento…» invece della sagoma
- Gravità: P3
- Dove: app/frontend/componenti/FormAgenzia.tsx:149
- Problema: in attesa di fornitori, subagenti, scaglioni (fino a N+2 richieste) la finestra mostra solo «Caricamento…», contro D-59 (sagome) e senza soglia dei 150 ms; se `fornitori`/`subagenti` falliscono il form si apre con le liste vuote senza messaggio.
- Scenario: rete lenta → finestra vuota con «Caricamento…»; server 500 su `subagenti` → campo Subagente vuoto senza spiegazione.
- Correzione puntuale: dentro la Modale `<SagomaCorpo />` (con `useSagome`); se `!f.ok || !s.ok` mostrare `r.messaggio` nella Modale con «Chiudi».
- Prova che la verifica: Playwright con `page.route('**/api/subagenti', 500)` → messaggio d'errore nella finestra.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/componenti/FormAgenzia.tsx
- Dipende da / correlato a: D-59, R2-06

---

## Da decidere (Ugo)
- R2-01: collegare il documento al fornitore importato è una decisione del server (V12/V13): via 1 (correggi non tocca le righe se non arrivano) basta a fermare la perdita, via 2 (import e collegamento in una transazione) toglie anche la doppia scrittura. Serve scegliere.
- R2-05: quando il nome del vecchio CRM non corrisponde a nessun subagente, il campo resta vuoto (proposta) o si propone comunque qualcuno?
- R2-09: dopo *Importa* si apre la scheda del nuovo (come dice la guida) o si resta sull'elenco?
- Cerca in Integra non ha un corrispettivo nel prototipo (è solo nell'app): va aggiunto al prototipo per la regola «prototipo sorgente di verità» o basta la spec?
