# Collaudo · Onda 5 · Pacchetto 5-03 — Pratiche: righe ferme fino ad Aggiorna (o eccezione D-94 scritta)

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A6-04, A9-08 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 1-05 (`collaudo-1-05-sessione-inattivita.md`), 3-03 (`collaudo-3-03-sagome-1.md`), 4-02 (`collaudo-4-02-memoria-liste.md`).

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
- I numeri di riga dei report sono del 08/11 mattina: dopo il collaudo è stato committato altro lavoro (f7).
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.

## Decisioni di Ugo per questo pacchetto (08/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda.

- **U21 → D-130**: **Solo l'elenco Documenti aggiorna le righe da solo.** Eccezione a D-23: l'elenco *Da controllare* di Documenti aggiorna le righe via SSE (D-94); tutte le altre tabelle, Pratiche compresa, aggiornano subito i conteggi e le righe solo con *Aggiorna*. Il pattern di D-94 per ora non si estende a Pratica, Bollettino e anagrafiche.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A6-04 — Pratiche: le righe non restano ferme fino ad *Aggiorna* (D-23)
- Gravità: P2
- Dove: `app/frontend/app/(app)/pratiche/VistaPratiche.tsx` (modificato, non committato; spec 8.61 D-94 in corso)
- Problema: con un evento da un'altra scheda la tabella delle Pratiche cambia da sola, invece di aspettare *Aggiorna*.
- Scenario: scheda A su `/pratiche` filtrata «Attesa fattura»; scheda B registra la fattura `EV-…` sulla prima pratica → in A compare «Ci sono aggiornamenti» e il numero del segmento cambia (giusto), ma le righe non sono più quelle di prima (`app_flusso.py:469`, «le righe restano ferme finché non si clicca Aggiorna» KO). Con la build delle 11:29 (HEAD) `app_eventi.py` e questo punto passavano.
- Correzione puntuale: in `VistaPratiche.tsx` le righe si ricaricano solo in `applica()` (clic su *Aggiorna*); all'arrivo dell'evento si aggiornano soltanto i conteggi dei segmenti (`conta`) e si mostra la barra. Controllare che il nuovo pattern D-94 non abbia messo il ricaricamento delle righe nell'effetto che ascolta `useEventi()`.
- Prova che la verifica: `strumenti/prove/app_flusso.py` (sezione aggiornamenti fra due schede) e `app_eventi.py`.
- Esecutore: DeepSeek V4 Flash — un file, effetto React.
- File toccati: `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- Dipende da / correlato a: D-23, D-94 (lavoro in corso), A5-13

> **Per questo pacchetto:** Decisione U21 → D-130: le righe delle Pratiche restano ferme fino ad *Aggiorna*; si aggiornano subito solo i conteggi dei segmenti e la barra «Ci sono aggiornamenti».

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

> **Per questo pacchetto:** Parte documentale (eccezione di Documenti in guida e §16.4.2, «si estende» tolto da D-94): la fa il pacchetto documentazione dell'onda.

## File ammessi (solo questi)

- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `strumenti/opencode/resoconto-collaudo-5-03.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/analisi.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/liquidazioni.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/test/analisi.spec.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/Flussi.tsx`
- `app/frontend/lib/memoria.ts`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratiche.py`

Documentazione (la scrive il **pacchetto documentazione** dell'onda, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

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

Prove da far passare:

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_flusso.py`, `app_eventi.py`, `app_pratiche.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-5-03.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
