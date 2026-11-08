# Collaudo · Onda 4 · Pacchetto 4-03 — Scorrimento ripristinato all'arrivo dei dati; «Torna a…» che non punta a sé

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-11, A6-19 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: —.

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

## Rilievi da correggere (testo dei report del collaudo)

### A5-11 — Scorrimento della pagina ripristinato prima che arrivino i dati
- Gravità: P2
- Dove: `app/frontend/componenti/Pagina.tsx:69` (`useScorrimento('corpo')` senza `pronto`), `lib/memoria.ts:20-27`
- Problema: il corpo si riporta alla posizione salvata al montaggio, quando c'è solo il titolo o le sagome: lo `scrollTop` viene limitato all'altezza corta e non si riprova all'arrivo dei dati; inoltre la chiave è per sezione, quindi `/pratiche/A` e `/pratiche/B` condividono la posizione.
- Scenario: pratica lunga scorsa fino a *Incassi* → apro il cliente → Indietro → la pratica si ridisegna in cima (da confermare con A6 su schermo 768 px, dove il corpo scorre).
- Correzione puntuale: `Pagina` accetta `pronto?: boolean` e lo passa a `useScorrimento('corpo', pronto)`; le pagine di dettaglio passano `pronto={!!d}`; la chiave include il percorso completo (`usePathname()`) per `corpo`.
- Prova che la verifica: `strumenti/prove/app_pratica.py` a 768 px: scorri → naviga → `go_back()` → `scrollTop` uguale ±10 px.
- Esecutore: DeepSeek V4 Flash — due file.
- File toccati: `componenti/Pagina.tsx`, `lib/memoria.ts`, `pratiche/[id]/VistaPratica.tsx`, `bollettini/[id]/VistaBollettino.tsx`, prova citata
- Dipende da / correlato a: §7.12, A5-09

### A6-19 — *Torna a…* che punta alla pagina stessa
- Gravità: P3
- Dove: anagrafiche a due colonne (`fornitori`, `clienti`, `subagenti`), `app/frontend/componenti/Pagina.tsx` (*Torna a…*)
- Problema: aprendo `/fornitori` (o `/clienti`, `/subagenti`) da un'altra pagina, la testata mostra «Torna ai Fornitori» mentre si è già sui Fornitori, con la prima riga scelta.
- Scenario: `/analisi` → `/fornitori` a 1440 px (`fornitori-1440.png`): pulsante «Torna ai Fornitori». Atteso «Torna a Analisi» (la pagina di prima) o niente.
- Correzione puntuale: se la riga scelta è quella aperta di default (non da un clic), *Torna a…* usa la pagina di prima registrata da `CRM.registra`, non l'elenco.
- Prova che la verifica: `app_f7_collaudo.py` con le tre anagrafiche aggiunte alla tabella `atteso` delle righe 103-106.
- Esecutore: DeepSeek V4 Flash — una condizione nel componente.
- File toccati: `app/frontend/componenti/Pagina.tsx`, `strumenti/prove/app_f7_collaudo.py`
- Dipende da / correlato a: §7.12, A5-09

**Nota del pacchetto.** In `lib/memoria.ts` cambia solo la chiave dello scorrimento del corpo (percorso completo). La memoria per passo di cronologia (A5-09) aspetta la decisione U15: non farla qui.

## File ammessi (solo questi)

- `app/frontend/componenti/Pagina.tsx`
- `app/frontend/lib/memoria.ts`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_f7_collaudo.py`
- `strumenti/opencode/resoconto-collaudo-4-03.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/formati.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/scartati/VistaScartati.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_scartati.py`

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
- prove nel browser interessate: `app_pratica.py`, `app_f7_collaudo.py`, `app_bollettino.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-4-03.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
