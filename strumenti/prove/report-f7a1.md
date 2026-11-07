# F7-A1 — Verifica replicazione ed E2E sull'app vera

Data: 07/11/2026. Codice: commit `7b66c8e` (F7-A0, correzioni di sicurezza). Riferimento: `prototipo-alternativo/` (D-24).
Checklist: specifica §16.1 (6 criteri), rotte §7.10, seed §12, componenti §16.4/§16.4.1; F7-A1 del piano §11.

## Come è stata fatta la prova

- Database di prova `decobrands_e2e` creato da zero (`prisma migrate deploy` + `db:seed` + `utenti_prova.js`),
  poi conservato come template per ripristinare il seed prima di ogni prova distruttiva.
- Backend di prova su **8202** (`NODE_ENV=development`, `DATABASE_URL` su `decobrands_e2e`), frontend su **8204**
  con `BACKEND_URL` su 8202. Il database di sviluppo `decobrands_db` e i server 8001/8002 non sono stati toccati.
- `app_scena.py` gira su 8001 (non entra e non scrive); le altre prove su 8204.
- Le prove sono state lanciate sul **frontend di sviluppo** (lo stesso tipo di processo di 8001): la build di
  produzione ha la CSP senza `'unsafe-eval'` e Playwright non può usare `wait_for_function/evaluate`, quindi non
  è utilizzabile per questa suite.
- `app_liquidazioni.py` è stato lanciato **tre volte di fila** su seed pulito: 73 OK / 0 KO in tutti e tre i giri.
- `app_caricamento.py`: la sagoma vista dal `MutationObserver` è stata identificata (`.n` dei segmenti) e la prova
  è stata corretta per misurare la soglia dei 150 ms, non per assumere che una risposta di 50 ms basti.
- `git diff --check`: pulito (solo avvisi LF/CRLF di Git).

## 1. Checklist §16.1 — una riga per schermata

Legenda: **1** struttura/navigazione, **2** layout, **3** componenti/stile, **4** testi, **5** interazioni,
**6** dati.

| Schermata (rotta §7.10) | 1 | 2 | 3 | 4 | 5 | 6 | Prova |
|---|---|---|---|---|---|---|---|
| Accesso (`/accesso`, `/accesso/cambia`, `/accesso/dimenticata`, `/accesso/password/:codice`) | OK | OK | OK | OK | OK | OK | `app_scena.py` 37/0, `app_accesso.py` 18/0 |
| Oggi (`/`) | OK | OK | OK | OK | OK | OK | `app_oggi.py` 42/0, `app_flusso.py` |
| Documenti (`/documenti`, `/documenti/:id`) | OK | OK | OK | OK | OK | OK | `app_documenti.py` 32/0, `app_flusso.py` |
| Pratiche (`/pratiche`, `/pratiche/:id`) | OK | OK | OK | OK | OK | OK | `app_pratiche.py` 19/0, `app_pratica.py` 85/0, `app_caricamento.py` 43/0 |
| Documenti scartati (`/scartati`) | OK | OK | OK | OK | OK | OK | `app_scartati.py` 30/0 (anche permesso `provvigioni.scartati`) |
| Bollettini (`/bollettini`, `/bollettini/:id`) | OK | OK | OK | OK | OK | OK | `app_bollettini.py` 22/0, `app_bollettino.py` 42/0 |
| Liquidazioni (`/liquidazioni/:anno/:trimestre`) | OK | OK | OK | OK | OK | OK | `app_liquidazioni.py` 73/0 (tre giri) |
| Analisi (`/analisi`) | OK | OK | OK | OK | OK | OK | `app_analisi.py` 37/0, `app_flusso.py` |
| Fornitori (`/fornitori`, `/fornitori/:id`) | OK | OK | OK | OK | OK | OK | `app_fornitori.py` 24/0 |
| Subagenti (`/subagenti`, `/subagenti/:id`) | OK | OK | OK | OK | OK | OK | `app_subagenti.py` 30/0 |
| Clienti (`/clienti`, `/clienti/:piva`) | OK | OK | OK | OK | OK | OK | `app_clienti.py` 33/0 |
| Utenti e ruoli (`/utenti`, `/utenti/:id`) | OK | OK | OK | OK | OK | OK | `app_utenti.py` 28/0 |
| Stato del sistema (`/sistema`) | OK | OK | OK | OK | OK | OK | `app_sistema.py` 24/0 |
| Impostazioni (`/impostazioni/:sezione`) | OK | OK | OK | OK | OK | OK | `app_impostazioni.py` 17/0 |
| Registro (`/registro`) | OK | OK | OK | OK | OK | OK | `app_registro.py` 28/0; il dettaglio non espone `sessione_id` |
| Guida (`/guida/:argomento`) | OK | OK | OK | OK | OK | OK | `app_guida.py` 26/0: 18 argomenti, con Registro |
| Componenti (`/componenti`, solo superutente) | OK | OK | OK | OK | OK | — | `app_componenti.py` 54/0: catalogo |
| Vendita diretta (§17) | — | — | — | — | — | — | Spenta (D-08), fuori da F7-A1 |

Testi: l'app aggiunge **Registro** alla Guida e ai permessi (18 argomenti, 14 celle di evidenza); il prototipo non
ha la pagina Registro. La voce laterale porta il contatore («Pratiche 9»). Il visualizzatore dei documenti usa
`.affiancata` (come F6-A4b). Sono adattamenti delle prove, non divergenze di testo.

## 2. Numeri del seed §12: prototipo ↔ app

Fonte «prototipo»: `M.*` letto da `prototipo-alternativo/index.html` nella stessa prova. Fonte «app»: API e
schermate con il seed pulito.

| Voce | Prototipo | App | Nota |
|---|---|---|---|
| Pratiche | 52 | **54** | due pratiche in più per i casi §12 (conferma 7/10, fattura in due tranche) |
| 2° trimestre 2026, provvigione liquidabile | 931,80 € | 931,80 € | `app_flusso.py` |
| 3° trimestre 2026, provvigione liquidabile | 1.886,73 € | **1.986,38 €** | +**99,65 €** = FT-S12-2A 61,15 + FT-S12-2B 38,50 (le due pratiche in più) |
| Bollettino Gasper agosto 2026 | 394,80 / 3.349,38 / −2.954,58 € | 394,80 / 3.349,38 / −2.954,58 € | loro / noi / cucitura |
| Analisi ott 2025–set 2026 | 79.534,06 / 12.976,26 / 4.127,34 / 8.848,92 € | 79.534,06 / 12.976,26 / 4.127,34 / 8.848,92 € | fatturato / prese / pagate / margine |
| Tabella Documenti (Analisi) / clienti | 21 / 7 | 21 / 7 | 21 righe con il collegamento alla pratica |
| Fornitori / Subagenti / Clienti | 10 / 4 / 11 | 10 / 4 / 11 | seed |
| Righe per pagina | 25 | 25 | Impostazioni iniziali §15.6 |
| Documenti in arrivo / scartati | 11 / 2 | 11 / 2 | seed §12 |

Il periodo predefinito di Analisi è «ultimi 12 mesi con dati»: con il seed pulito è **ott 2025 → set 2026**, come
il prototipo. Se nel database ci sono documenti con data odierna, il periodo si sposta: le prove dei numeri
vanno lanciate sul seed pulito.

## 3. I 6 KO dell'ultimo giro: causa e chiusura

| KO | Causa | Cosa è cambiato | Esito |
|---|---|---|---|
| `app_liquidazioni`: «chiusura spenta: il motivo è nei documenti in attesa» | **prova**: dopo `goto` la prova guardava il pulsante prima che la pagina avesse caricato i dati; il pulsante non era ancora presente | `app_liquidazioni.py`: `wait_for_selector('.testa-azioni button:has-text("Chiudi il trimestre")')` prima del controllo | chiuso |
| `app_liquidazioni`: «report del subagente: fatturato, provvigione e margine» | **prova**: la scheda Report veniva aperta prima che arrivasse il report del subagente ricordato; a volte mostrava l'elenco | `app_liquidazioni.py`: attesa su `.report-sub .kpi .kpi-valore` = 3, non su `.kpi-riga` | chiuso |
| `app_liquidazioni`: «confronto con il trimestre prima: nessun importo» | stessa corsa del report | come sopra | chiuso |
| `app_liquidazioni`: «margine sulle provvigioni calcolato dal server» | stessa corsa del report | come sopra | chiuso |
| `app_liquidazioni`: «trimestri dell'anno e primi clienti» | stessa corsa del report | come sopra | chiuso |
| `app_caricamento`: «caricamento di 50 ms: nessuna sagoma» | **prova**: la sagoma è quella del contatore dei segmenti (`.n`, `FilterBar.tsx:113`), comparsa a **~1022 ms** dal via: la pagina ha rispettato la soglia `useSagome` di 150 ms, ma il caricamento in sviluppo non dura 50 ms | `app_caricamento.py`: il `MutationObserver` registra l'istante della prima sagoma; si controlla che non compaia **prima di 140 ms** (tolleranza sulla soglia di 150), non che non compaia affatto | chiuso |

Altri KO visti durante i tre giri e chiusi come corse della prova:

- «Analisi completa: il subagente scelto è nel filtro»: si aspettava il filtro prima che la pagina Analisi
  applicasse i parametri dell'indirizzo — aggiunta l'attesa sul segnaposto che contiene «Nista».
- «sagome anche nella scheda report» (traceback): il report viene chiesto già al montaggio della pagina, quindi
  non è detto che sia ancora in caricamento quando si apre la scheda. Il controllo della sagoma del report è
  stato tolto; resta il controllo delle sagome del trimestre e quello che i dati arrivino.

**Nessuno dei 6 KO era un difetto della pagina.** Non è stato modificato codice dell'app.

## 4. Esito delle prove eseguite (seed pulito)

| Prova | OK | KO | Tempo | Note |
|---|---:|---:|---:|---|
| `app_accesso.py` | 18 | 0 | 29 s | accesso, cambio password, password dimenticata, link, Esci |
| `app_analisi.py` | 37 | 0 | 81 s | numeri, periodo, filtri, export Excel/CSV/PDF, sagome, sola lettura |
| `app_bollettini.py` | 22 | 0 | 21 s | matrice, periodo, filtro multiplo, caricamento, 768 px |
| `app_bollettino.py` | 42 | 0 | 50 s | cerniera, decisioni, abbinamento, chiusura, PDF, 768 px |
| `app_caricamento.py` | 43 | 0 | 48 s | sagome: soglia 150 ms misurata (prima sagoma a ~1022 ms) |
| `app_clienti.py` | 33 | 0 | 35 s | elenco, agenzie, pratiche, memoria, 768 px |
| `app_componenti.py` | 54 | 0 | 20 s | catalogo, solo superutente |
| `app_documenti.py` | 32 | 0 | 16 s | elenco, correzione, scarto, sola lettura |
| `app_eventi.py` | 15 | 0 | 16 s | barra «Ci sono aggiornamenti · Aggiorna» fra due schede |
| `app_flusso.py` | **192** | **0** | 169 s | prova continua F7-A1 |
| `app_fornitori.py` | 24 | 0 | 30 s | elenco, scheda, regole, 768 px |
| `app_guida.py` | 26 | 0 | 21 s | 18 argomenti, ricerca, permessi |
| `app_guscio.py` | 20 | 0 | 27 s | barra per area, Esci, sola lettura, 768 px |
| `app_impostazioni.py` | 17 | 0 | 28 s | sei sezioni, salvataggio, password mai nel DOM |
| `app_liquidazioni.py` | 73 | 0 | 101–108 s | **tre giri consecutivi 73/0** |
| `app_menu_utente.py` | 19 | 0 | 26 s | menu dell'utente, aree, password, Guida, Esci |
| `app_oggi.py` | 42 | 0 | 20 s | gruppi, solleciti, scadenze, aggiornamenti |
| `app_pratica.py` | 85 | 0 | 84 s | binario, righe a confronto, documenti, PDF, incasso, D-60 |
| `app_pratiche.py` | 19 | 0 | 26 s | filtri, conteggi, ordinamento, pagine, ritorno |
| `app_registro.py` | 28 | 0 | 19 s | filtri, dettaglio, export CSV, permessi; niente `sessione_id` |
| `app_scartati.py` | 30 | 0 | 30 s | recupero, eliminazione, sola lettura, permesso scartati |
| `app_scena.py` | 37 | 0 | ~20 s | scena di accesso, logo, licenza, 768 px |
| `app_sistema.py` | 24 | 0 | 18 s | servizi, problemi, giri, sola lettura |
| `app_subagenti.py` | 30 | 0 | 34 s | elenco, scheda, CRUD, 768 px |
| `app_utenti.py` | 28 | 0 | 22 s | elenco, schede, permessi, CRUD, 768 px |
| **Totale app_*.py** | **990** | **0** | | 25 file, tutti verdi |

Screenshots: `strumenti/prove/schermate-f7a1/` (1440 e 768 px; la prova continua produce
`app-flusso-pratiche-768.png`, `app-flusso-documenti-1440/768.png`, `app-flusso-bollettino-1440/768.png`,
`app-flusso-analisi-768.png`, `app-flusso-aggiornamenti-1440.png`).

## 5. Correzioni di sicurezza F7-A0: effetto sulle prove

- **Scartati con `provvigioni.scartati`**: `app_scartati.py` 30/0 e `app_documenti.py` 32/0; la sola lettura
  continua a non vedere i pulsanti di scarto.
- **`POST /api/solleciti/conferme` con `provvigioni.modifica`**: coperto da `app_oggi.py`/`app_pratica.py` (solleciti).
- **Registro senza `sessione_id`**: `app_registro.py` 28/0; il dettaglio non mostra il campo.
- **429 in italiano**: non è stato raggiunto (il backend di prova ha `TENTATIVI=1000` per la suite); il messaggio
  è nel codice e non è verificato da una prova browser.
- **Tetto caricamenti 100/15 min**: la suite carica meno di 100 file; non è stato raggiunto.
- **Backend senza `NODE_ENV`**: il backend di prova è stato avviato con `NODE_ENV=development` esplicito, da
  `app/backend` (dove c'è il `.env`).
- **CSP**: il frontend di prova è in sviluppo, dove `'unsafe-eval'` è ammesso; la build di produzione non è
  utilizzabile con Playwright perché la CSP (correttamente) non lo consente. Non è un difetto dell'app.

## 6. Cosa non ho potuto verificare (e perché)

- **Invio reale delle email** (password provvisoria, solleciti, reimpostazione): in sviluppo la posta va nel
  registro; la prova legge il link dal log, non consegna SMTP.
- **Sincronizzazione da Integra**: serve il database ponte (`PONTE_URL`) e le viste vere.
- **Lettura GLM-OCR / LlamaCloud**: servono il server dei modelli e le chiavi.
- **Build di produzione, Caddy, pubblicazione**: F7-A2. La CSP di produzione non è compatibile con le prove
  Playwright (`unsafe-eval` assente), quindi non è stata usata.
- **Telefono sotto i 744 px**: D-44, l'app non si adatta; schermate a 1440 e 768 px.
- **Dati reali di Integra**: non disponibili; tutto sul seed §12.
- **Prove Jest**: non concluse in questo giro; un tentativo con `NODE_ENV=test` termina con un crash di Node
  (`0xC0000409`) prima del riepilogo. L'ultimo giro F7-A1 dava 476/476; va rieseguito a parte.
- **429 e tetto caricamenti**: non raggiunti dalla suite (limiti alzati per le prove); verificati solo nel codice.

## 7. Conclusione F7-A1

- **990 controlli OK, 0 KO** su 25 file `app_*.py`; `app_flusso.py` 192/0; `app_liquidazioni.py` 73/0 in tre
  giri consecutivi.
- La replicazione §16.1 è OK su tutte le schermate; i numeri del seed coincidono al centesimo (Q3 differisce solo
  per le due pratiche aggiunte, +99,65 €, spiegato).
- **Nessun difetto dell'app da assegnare alle slice**: i 6 KO erano corse o assunzioni delle prove e sono stati
  chiusi in `strumenti/prove/**`. Le correzioni di sicurezza F7-A0 non hanno rotto le prove.
