# Collaudo · Onda 0 bis · Pacchetto 0b-04 — Soggetti: nuova versione dei ruoli quando cambia la P.IVA, codice di Integra solo dall'import, scheda senza risposte fuori ordine

Data: 11/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: R0-D6, R1-08, R2-02, R2-03, R2-04, R1-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** la chiusura dell'onda 0 (migrazioni 0-01 → 0-05) e **prima** dell'onda 1. Fonte: `strumenti/collaudo/report/R0-ultime-modifiche.md`, `R1-backend-ultime.md`, `R2-frontend-ultime.md` (commit 89a4105..e879c62). I pacchetti dell'onda 0 bis lavorano in parallelo e non hanno file in comune. Dipende da: —.

## Contesto e regole del progetto

- **Stack**: frontend Next.js 16 + React 19 + TypeScript (`app/frontend`), backend NestJS 11 + Prisma 7 +
  PostgreSQL (`app/backend`, database proprio `decobrands_db`), stile `app/frontend/app/stile/stile.css` copiato dal
  prototipo ufficiale `prototipo-alternativo/` (D-24), Public Sans, niente Bootstrap. Node 24.
- **Leggi prima `CLAUDE.md`** (radice) per intero, poi le righe di `specifica-crm-provvigioni.md` sulle decisioni
  citate nei rilievi (§19, registro D-nn).
- **Prima di leggere codice**: `graphify query "<domanda>"` (grafo in `graphify-out/`), poi solo le righe trovate.
  **Non** lanciare `graphify update .`: altri pacchetti lavorano in parallelo, il grafo lo aggiorna il controllo di fine onda.
- ⚠ **V12 — tutto sul backend**: ogni calcolo (provvigioni, totali, differenze, stati) e ogni operazione sensibile si
  fa sul server dal database; il browser manda solo scelte (id, valori digitati, motivo); il server ricarica,
  ricontrolla, ricalcola e non salva mai un valore calcolato arrivato dal browser.
- ⚠ **V13 — una operazione, una transazione**: se scrivi su più tabelle o più righe legate, una sola
  `prisma.$transaction(async (tx) => …)`, tutto da `tx` (registro compreso); chiusure, verifiche e abbinamenti
  bloccano la riga con `SELECT … FOR UPDATE`; email e lettura dei documenti dopo il commit, il file su disco prima.
- **Italiano** semplice in codice, commenti, messaggi e interfaccia (niente parole inglesi inutili). Nei punti non
  ovvi un commento breve che rimanda alla decisione: `// D-51 §19`, `// V13`.
- Le prove nel browser cercano le schede con `.schede-barra [role=tab]` (anche i segmenti hanno `role=tab`).
- Non c'è telefono (D-44): si prova a 1440 e 768 px.
- I numeri di riga dei report R1/R2 sono dell'11/11 (commit `e879c62`); prima di te passano le migrazioni dell'onda 0.
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.
- **Integra (192.168.239.49) non si contatta mai**: nelle prove il ponte è sempre simulato (pool finto o `jest.spyOn`), nessun `PONTE_URL` vero.

## Decisioni di Ugo per questo pacchetto (11/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda (0b-doc).

- **D-138** (Ugo, 12/11/2026): **la verità è su Integra: ciò che arriva da Integra non si tocca nel CRM.**
  - Soggetto con almeno un ruolo da Integra (codice `integra` in `codici_esterni` o versione corrente con `fonte = 'integra'`): **il master è tutto in sola lettura** (per ora, Ugo 12/11: «poi vedremo») e mostra solo i valori arrivati da Integra. Qualsiasi modifica del master (`PUT` del soggetto, attiva/disattiva compresi) → il server risponde 409 «Dati di Integra: si correggono in Integra», senza scrivere nulla. Il frontend non mostra il pulsante di modifica e presenta i campi in sola lettura con la nota «Da Integra», ma il controllo vale sul server (V12). I ruoli e le agenzie restano gestibili come oggi.
  - Soggetto solo del CRM (nessun ruolo da Integra): cambiare la P.IVA crea una nuova versione (D-46) di ogni suo ruolo (`clienti_versioni`, `fornitori_versioni`) nella stessa transazione della modifica.
  - Il codice di Integra non si scrive mai a mano: il legame nasce solo da *Importa* (`POST /integra/importa`), che rilegge la riga dal ponte (R1-08, prima opzione).

## Rilievi da correggere (testo dei report R1/R2; i rilievi R0-D* nascono dalle domande dell'R0 decise da Ugo)

### R0-D6 — Cambiare la P.IVA del soggetto non cambia le versioni dei suoi ruoli
- Gravità: P2
- Dove: app/backend/src/soggetti.ts:450-484 (modifica dell'identità del soggetto)
- Problema: la modifica cambia il master (`soggetti.piva`, `piva_norm`) ma non `clienti_versioni`/`fornitori_versioni` dei ruoli, che restano con la P.IVA vecchia; la proposta del documento riconosce il cliente su quella (report R1, *Da decidere* 2).
- Scenario: soggetto «Rossi SRL» con ruolo cliente, P.IVA corretta da 01234567890 a 01234567891 → la scheda Soggetti mostra la nuova, il cliente ha ancora la vecchia; una fattura con la P.IVA nuova non riconosce il cliente.
- Correzione puntuale (decisione di Ugo, D-138): **prima** controllare se il soggetto ha un ruolo da Integra → 409 su qualsiasi modifica del master (nessuna scrittura). Altrimenti, nella stessa `prisma.$transaction` della modifica, per ogni ruolo del soggetto (cliente, fornitore) chiudere la versione corrente e crearne una nuova con la P.IVA nuova e gli altri campi uguali, come le altre modifiche datate (D-46: le versioni non si riscrivono sul posto); evento nel registro da `tx`. Se la P.IVA non cambia, nessuna versione nuova.
- Prova che la verifica: test/soggetti.spec.ts: soggetto con ruolo cliente importato da Integra, PUT con P.IVA nuova e PUT con le sole note → 409 e nulla cambia (master e versioni); prova nel browser `app_soggetti.py`: soggetto da Integra senza pulsante di modifica; soggetto solo CRM con ruolo cliente, PUT con P.IVA nuova → `clienti_versioni` ha una versione in più con la P.IVA nuova e la vecchia chiusa; stessa cosa per il fornitore; un errore a metà non lascia il master cambiato.
- Esecutore: DeepSeek V4 — più tabelle in una transazione (V13), versioni D-46.
- File toccati: app/backend/src/soggetti.ts, app/backend/test/soggetti.spec.ts
- Dipende da / correlato a: D-46, D-102, D-138

> **Per questo pacchetto:** `normalizzaPiva` e `datiFiscali` di `soggetti.ts` li usano anche 0b-01, 0b-02 e 0b-03: **non cambiarne nome né firma**.

### R1-08 — Ruolo cliente/fornitore creato dal soggetto con un `codice_integra` scritto dal browser, senza verifica sul ponte
- Gravità: P2
- Dove: app/backend/src/soggetti.ts:731, :745, :760 (`creaRuolo`)
- Problema: il codice di Integra digitato diventa `codici_esterni(integra, …)` senza controllare che quel codice esista nella vista né che la sua P.IVA sia quella del soggetto. Da quel momento la sincronizzazione (integra.ts `applicaCliente`, che riconosce solo per codice) scrive su questo ruolo i dati della riga di Integra con quel codice (V12; D-111 vuole che il legame con Integra nasca dall'import, che rilegge dal ponte).
- Scenario: l'operatore crea il ruolo cliente di «Verdi SNC» (P.IVA A) scrivendo per sbaglio `C0124`, che in Integra è «Neri SRL» (P.IVA B) → al giro successivo la versione corrente del cliente Verdi diventa ragione sociale «Neri SRL», P.IVA B: documenti, agenzie e liquidazioni di Verdi mostrano Neri.
- Correzione puntuale (D-138, decisa: niente codice a mano): togliere `codice_integra` da `NuovoRuolo` (il codice si collega solo con `POST /integra/importa`); campo in più → 400 (`forbidNonWhitelisted`). ~~Alternativa scartata:~~ se restasse, leggere la riga dal ponte per codice dentro la rotta e rifiutare (409) se la P.IVA normalizzata non coincide con `s.piva_norm`.
- Prova che la verifica: test/soggetti.spec.ts: `POST /soggetti/:id/ruoli` con `codice_integra` → 400 (campo non ammesso), oppure 409 con P.IVA diversa dalla vista simulata.
- Esecutore: DeepSeek V4 — tocca l'identità verso Integra.
- File toccati: app/backend/src/soggetti.ts, app/backend/test/soggetti.spec.ts (e il form del frontend se manda il campo)
- Dipende da / correlato a: D-100, D-111, V12

> **Per questo pacchetto:** Scegli la **prima** via: togli `codice_integra` da `NuovoRuolo` (con `forbidNonWhitelisted` diventa 400) e il campo «Codice Integra» dalla finestra del ruolo in `VistaSoggetti.tsx`. Il legame con Integra nasce solo da *Cerca in Integra → Importa*, che dopo 0b-01 (R1-04) registra il codice anche sul ruolo già presente. Se D-102 o la guida chiedono di scrivere il codice a mano, fermati e scrivilo nel resoconto.

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

> **Per questo pacchetto:** R2-02, R2-03 e R2-04 stanno nello stesso effetto di `VistaSoggetti.tsx`: falli insieme. Aggiorna `app_soggetti.py` con i casi delle tre prove (risposta ritardata, nessuna sagoma dopo il salvataggio, `/soggetti/999999`).

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

### R1-13 — Prove mancanti sui percorsi critici nuovi
- Gravità: P2
- Dove: app/backend/test/anagrafica-integra.spec.ts, documenti.spec.ts, soggetti.spec.ts, clienti.spec.ts
- Problema: le prove coprono i casi felici (creazione, idempotenza per codice e per P.IVA, 404, LIMIT 10, 409 senza agenzia). Mancano: ponte che lancia un errore non di timeout (R1-01); ponte appeso per `importa` (R1-02); P.IVA estera e paese (R1-03); ruolo già presente senza codice integra (R1-04); import concorrente (R1-05); storico senza `fornitore_id` nell'elenco (R1-06); `storico_id` di un altro cliente con P.IVA cliente vuota e riga già usata (R1-07); `creaRuolo` con `codice_integra` (R1-08); `GET /integra/cerca` e `POST /integra/importa` con un utente senza `dati.importa` (403) e con `id_integra` non intero o campo in più (400).
- Scenario: le regressioni descritte sopra passano tutte la suite attuale.
- Correzione puntuale: aggiungere le prove indicate in ciascun rilievo; per i permessi, due `it` in anagrafica-integra.spec.ts con l'utente in sola lettura (403) e con body `{ tipo: 'cliente', id_integra: 'x', extra: 1 }` (400).
- Prova che la verifica: `npm test` sui file elencati, 0 KO.
- Esecutore: DeepSeek V4 Flash — prove su logica da correggere nei rilievi collegati.
- File toccati: i quattro spec elencati
- Dipende da / correlato a: R1-01…R1-08

> **Per questo pacchetto:** In questo pacchetto **solo** la prova di `creaRuolo` con `codice_integra` (→ 400) e quelle di R0-D6.

**Pacchetto sensibile (transazioni (V13), versioni D-46, identità verso Integra).** Prima di consegnare carica davvero (strumento `skill` di OpenCode) `owasp-security` e `ponytail-review`, e `postgresql-code-review` se scrivi SQL; rileggi il tuo diff con quelle regole e scrivi nel resoconto cosa hanno trovato. A fine onda Claude Code fa comunque la **review completa** (`owasp-security`, `/code-review`, `/ponytail:ponytail-review`).

## File ammessi (solo questi)

- `app/backend/src/soggetti.ts`
- `app/backend/test/soggetti.spec.ts`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `strumenti/prove/app_soggetti.py`
- `strumenti/opencode/resoconto-collaudo-0b-04.md`

## File vietati

Li modificano altri pacchetti della **stessa onda** (0 bis), in parallelo:

- `app/backend/prisma/import-storico.ts`
- `app/backend/src/anagrafica-integra.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/integra.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/storico.ts`
- `app/backend/test/anagrafica-integra.spec.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/integra.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/storico.spec.ts`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CercaInIntegra.tsx`
- `app/frontend/componenti/FormAgenzia.tsx`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_fornitori.py`

Documentazione (la scrive il **pacchetto documentazione** dell'onda, 0b-doc, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

- `specifica-crm-provvigioni.md`
- `app/frontend/lib/guida.ts`
- `piano-lavoro-crm.md`
- `PRD-crm-provvigioni.md`
- `prototipo-alternativo/LEGGIMI.md`
- `prototipo-alternativo/assets/guida.js`
- `app/README.md`
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Lavora **solo** sul tuo database di prova `decobrands_test_0b_04` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0b_04#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0b_04','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0b_04 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0b-04"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0b_04`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/soggetti.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_soggetti.py` (aggiungi i casi di R2-02, R2-03, R2-04). **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0b-04.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
