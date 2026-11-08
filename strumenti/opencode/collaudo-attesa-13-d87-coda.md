# Collaudo · Onda in attesa · Pacchetto attesa-13 — D-87: stato «da configurare» in coda o solo blocco su Apri la pratica

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A9-09 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U22 — D-87: la coda mostra «da configurare» prima del clic o basta il blocco su *Apri la pratica*?** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a). Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo la decisione in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

**Nota del pacchetto.** Con l'opzione (b) diventa un pacchetto V4 su `proposta.ts` e `VistaDocumento.tsx`: Claude Code lo riscrive prima del lancio.

## File ammessi (solo questi)

- `specifica-crm-provvigioni.md`
- `app/frontend/lib/guida.ts`
- `strumenti/opencode/resoconto-collaudo-attesa-13.md`

## File vietati

Da completare da Claude Code al lancio (file degli altri pacchetti della stessa onda).

Documentazione (la scrive il **pacchetto documentazione** dell'onda, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

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
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-13.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
