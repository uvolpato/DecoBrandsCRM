# Resoconto `note-informazioni` (17/11/2026)

## File toccati
Frontend (solo interfaccia, nessun backend, database o porta):
- `app/frontend/app/(app)/profilo/page.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
Prove e regole:
- `strumenti/prove/app_documenti.py`, `strumenti/prove/app_oggi.py` (leggono la nota spostata: ora aprono la finestra «i»)
- `strumenti/regole-interfaccia.md` (regola 26c: criterio sposta/resta)

Nessun file di `componenti/**` né `stile.css`. Nessun file di `clienti/**`.

## Cosa è cambiato
17 note spostate nella finestra «i» (`Informazioni`), un pulsante per punto: un pulsante per
pannello o scheda, in alto a destra (riga `strumenti-scheda` con `spazio`) o nella riga di testa
già esistente accanto alle azioni, come in Fornitori → Percentuali e Soggetti → Ruoli. Testi
invariati, al massimo divisi in punti. Le note della situazione restano in pagina.

## Tabella: ogni `<Nota>`, scelta e perché

| File | Nota | Scelta | Perché |
|---|---|---|---|
| profilo/page.tsx L45 | «Nome, nome utente, email, ruolo e livelli li cambia chi amministra…» | **spostata** | Spiegazione fissa del pannello «Aree che puoi aprire» |
| profilo/page.tsx L61 | «Senza scelta si apre la prima pagina dell'area…» | **spostata** | Spiegazione fissa del pannello «Pagina di ingresso per area» |
| profilo/page.tsx L65 | «Cambiare la password chiude le sessioni aperte…» | **spostata** | Spiegazione fissa del pannello «Sicurezza» |
| documenti/VistaDocumenti.tsx L135 | «Si legge un documento ogni 15 secondi.» | **spostata** | Regola fissa della coda «Da controllare» |
| documenti/VistaDocumenti.tsx L137 | «Integra non raggiungibile…» | restata | Avviso della situazione |
| documenti/VistaDocumenti.tsx L140 | «N documenti non letti dopo 3 tentativi…» | restata | Avviso che chiede di agire |
| documenti/VistaDocumenti.tsx L172 | «Nessun documento da controllare.» | restata | Stato vuoto |
| documenti/VistaDocumenti.tsx L175 | «Mostrati i primi N documenti…» | restata | Dipende dalla situazione |
| documenti/VistaDocumenti.tsx L189 | «Le foto dei documenti arrivano come JPEG o PNG…» | **spostata** | Spiegazione fissa del pannello «Come entrano i documenti» |
| bollettini/VistaBollettini.tsx L161 | «Un bollettino è atteso per ogni mese chiuso…» | **spostata** | Spiegazione fissa della matrice (3 punti) |
| bollettini/[id]/VistaBollettino.tsx L283 | `d.note` del bollettino | restata | È il dato del bollettino, non una spiegazione |
| analisi/VistaAnalisi.tsx L279 | «Importi per data del documento (competenza)…» | **spostata** | Spiegazione fissa del pannello «Dettaglio» (2 punti) |
| utenti/VistaUtenti.tsx L195-197 | utente dei servizi / superutente / livello più alto | restata | Dipende da chi si guarda (permessi) |
| utenti/VistaUtenti.tsx L248 | «Evidenziati il ruolo e i livelli di N…» | **spostata** | Spiegazione fissa della scheda «Permessi» (3 punti) |
| oggi/VistaOggi.tsx L168 | «Prossimi 15 giorni.» | **spostata** | Orizzonte fisso della lista «Prossime scadenze» |
| liquidazioni/VistaLiquidazioni.tsx L202 | «Liquidazione chiusa il … da …» | restata | Dipende dalla situazione |
| liquidazioni/VistaLiquidazioni.tsx L345 | «Numeri del trimestre di liquidazione…» (elenco) | **spostata** | Spiegazione fissa del report (2 punti) |
| liquidazioni/VistaLiquidazioni.tsx L380 | «Numeri del trimestre di liquidazione…» (un subagente) | **spostata** | Idem, ramo con un subagente scelto |
| pratiche/[id]/VistaPratica.tsx L432 | `div.nota` raggruppamento + «Cambia» | restata | Dipende dalla pratica e offre un'azione |
| pratiche/[id]/VistaPratica.tsx L449 | «Provvigione da decidere… / Nessun abbinamento…» | restata | Spiega lo stato vuoto del calcolo |
| pratiche/[id]/VistaPratica.tsx L471 | «{fornitore} paga sul maturato / sul fatturato…» | **spostata** | Regola fissa del pannello «Provvigione» |
| pratiche/[id]/VistaPratica.tsx L532 | «Il netto è fatture − note di credito…» | **spostata** | Spiegazione fissa di «Documenti fiscali» (2 punti) |
| pratiche/[id]/VistaPratica.tsx L540 | «Ordini, conferme, proforma… restano fuori dal netto» | **spostata** | Spiegazione fissa del pannello «Documenti» |
| pratiche/[id]/VistaPratica.tsx L551 | «Le righe evidenziate cambiano…» | restata | Dipende dal confronto fra le fasi |
| pratiche/[id]/VistaPratica.tsx L769/771/776/782 | caricamento coda, coda vuota, cliente non riconosciuto, tipo da verificare | restate | Stati vuoti e avvisi dentro una finestra di modifica |
| soggetti/VistaSoggetti.tsx L424 | «Una catena = un soggetto con N punti vendita…» | **spostata** | Spiegazione fissa della scheda «Sedi» (2 punti) |
| soggetti/VistaSoggetti.tsx L469 | Split payment / reverse charge | restata | Dipende dai dati del soggetto |
| soggetti/VistaSoggetti.tsx L471 | «Dati dell'amministrazione che cambiano nel tempo…» | **spostata** | Spiegazione fissa della scheda «Fatturazione» |
| soggetti/VistaSoggetti.tsx L524 | «Da Integra: i dati del soggetto si correggono in Integra…» | restata | Dipende dalla sorgente del soggetto |
| soggetti/VistaSoggetti.tsx L525 | `det.note` | restata | È un dato del soggetto |
| soggetti/VistaSoggetti.tsx L537 | «Nessun soggetto: cambia la ricerca…» | restata | Stato vuoto |
| subagenti/VistaSubagenti.tsx L260 | «Questa eccezione è già usata in un periodo chiuso…» | restata | Dipende dall'eccezione (finestra di modifica) |
| subagenti/VistaSubagenti.tsx L338 | «La percentuale personale vale al posto di quella dello scaglione…» | **spostata** | Spiegazione fissa della scheda «Eccezioni personali» (3 punti) |
| subagenti/VistaSubagenti.tsx L404 | «Non hai il permesso per modificare i subagenti.» | restata | Permesso mancante |
| documenti/[id]/VistaDocumento.tsx L684-685, 706, 716, 720, 727, 734, 746, 753, 772, 781-784, 802-806, 809, 815 | candidati, Integra non raggiungibile, scaglioni mancanti, fornitore/cliente non in anagrafica, agenzia mancante, bollettino già registrato, doppio documento, codice cliente | restate | Tutte avvisi o richieste di agire sulla situazione |
| documenti/[id]/VistaDocumento.tsx L736 `div.nota` | «Dal vecchio CRM: subagente…, sconto…» | restata | Dipende dai dati letti |
| documenti/[id]/VistaDocumento.tsx L866 | righe incerte / «Righe come lette dal documento…» | restata | La prima variante è un avviso e chiede di correggere |
| documenti/[id]/VistaDocumento.tsx L1126 | «Agenzia dal vecchio CRM, da confermare…» | restata | Dipende dai dati |
| impostazioni/VistaImpostazioni.tsx L128 | «Solo il superutente può modificare le connessioni…» | restata | Permesso mancante |
| impostazioni/VistaImpostazioni.tsx L137 | «La prova usa i valori salvati.» | restata | Istruzione legata al pulsante lì accanto (nel dubbio resta) |
| impostazioni/VistaImpostazioni.tsx L144 `div.nota` | «Parametri del server (file .env)» | restata | È la testa del blocco con l'elenco dei parametri |
| layout.tsx L86 | errore di caricamento del guscio | restata | Avviso |
| clienti/VistaClienti.tsx, guida/VistaGuida.tsx, componenti/page.tsx | — | fuori ambito | Clienti: altro pacchetto; Guida e catalogo: le note sono il contenuto |

## Prove
- `npx tsc --noEmit` nel frontend: **pulito**.
- `python -m py_compile strumenti/prove/app_documenti.py strumenti/prove/app_oggi.py`: **ok**.
- Prove nel browser **non lanciate** (le lancia Claude Code a fine onda, regole dell'onda).
  Aggiornate due prove che leggevano il testo di una nota spostata: ora aprono il pulsante «i»
  e leggono `.velo .modale`, poi chiudono con «Chiudi».
- Controllo visivo (1440 e 768) non fatto: senza server di prova non si può; **da fare a fine onda**.
  Punti da guardare: la riga del pulsante «i» nei pannelli senza azioni (Profilo, Documenti,
  Documento fiscale/Documenti nella pratica) e la barra periodo dei Bollettini a 768 px.

## Controlli caricati
`ui-ux-pro-max`, `ponytail-review`, `caveman` (caricate con lo strumento `skill`).
`ponytail-review` sul diff: nessun rilievo (solo sostituzioni di `<Nota>` con `Informazioni`, un
titolo per finestra, nessuna astrazione nuova); net: 0 righe tagliabili.

## Da documentare
- `strumenti/regole-interfaccia.md`: fatta la regola **26c** con il criterio sposta/resta.
- Spec §16.4 (componente `Informazioni`): ora è usato in 10 punti dell'app, non solo in due; se
  Ugo conferma il criterio, va alzata la versione della spec con il riassunto e la riga *Perché*
  nella sezione delle pagine toccate (Profilo, Documenti, Bollettini, Analisi, Utenti, Oggi,
  Liquidazioni, Pratica, Soggetti, Subagenti). **Non toccata** in questo pacchetto (fuori dai file ammessi).
- `prototipo-alternativo/assets/guida.js` e `LEGGIMI.md`: le voci delle pagine toccate possono
  citare i pulsanti «i» nuovi. **Non toccati** (fuori dai file ammessi).
- Titoli delle finestre: «Informazioni su…» + nome del pannello. Se Ugo vuole un titolo unico per
  pagina, si cambiano i titoli, non i testi.
- Nessuna decisione nuova: vale D-59 e la regola 26b/26c.
