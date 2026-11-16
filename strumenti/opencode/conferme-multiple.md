# Più conferme o proforme per la stessa pratica: parziali o sostitutive (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (caso vero: due proforme parziali dello stesso ordine). Stati della pratica e abbinamenti: lavoro sensibile.

Prima leggi `resoconto-proposta-pr102848.md`, `resoconto-somiglianza-pr102813.md` (se c'è), `resoconto-numero-ordine-fornitore.md`. Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Su `decobrands_db` solo letture; prove su `decobrands_test_conferme` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra. Niente commit. Se gira in parallelo un pacchetto solo frontend, non toccare i suoi file (scrivilo).

## Caso vero
Ordine ARTE **AU276839** = 2.154,50 € (pratica OF/2026/001). Proforma **PR102813** = 2.117,30 € e **PR102848** = 37,20 €: insieme 2.154,50 €, cioè due proforme **parziali** dello stesso ordine. Oggi `proposta.ts` (correzione PR102848) esclude dalle candidate le pratiche che hanno già una conferma/proforma: la seconda proforma non troverebbe più OF/2026/001.

## Decisione di Ugo (D-174)
- Proforma = conferma se la pratica non ne ha già una (D-60 esteso alla proforma).
- **Una pratica può avere più conferme/proforme**:
  1. la **prima** fa passare la pratica ad «attesa fattura» (come oggi);
  2. le **successive si agganciano** alla stessa pratica (non sono escluse) e all'abbinamento l'operatore sceglie **«parziale»** (si somma alle altre) o **«sostituisce»** (revisione: quella vecchia resta in archivio come superata, non conta);
  3. il CRM **propone** la scelta più probabile, non decide: «parziale» se la somma delle conferme resta entro l'importo dell'ordine (tolleranza 1 %, costante con commento), «sostituisce» se l'importo è ≈ al totale dell'ordine o ≈ a quello di una conferma già presente;
  4. nella pratica il **progresso**: «Confermato X € di Y €» (somma delle conferme valide, non superate); se X < Y la fase Conferma dice «confermato in parte» (lo stato resta quello che dà il motore; verifica come il motore ricava lo stato dai documenti, D-52, e non cambiarlo senza scriverlo);
  5. **fatture**: verifica che più fatture parziali della stessa pratica siano già gestite come somma (§5, motore) e che il ragionamento sia coerente; se no, scrivilo negli aperti (non cambiare il motore delle provvigioni in questo pacchetto).

## Da fare
- **Schema** (consentito, una migrazione): sul documento della pratica (`ordini_fornitore_documenti`) il modo dell'abbinamento per conferme/proforme: `ruolo` (`parziale` | `sostituisce`) e `superato_da` (id del documento che lo sostituisce, nullable). Verifica prima se qualcosa di simile esiste già.
- **Server**: `proposta.ts` non esclude più le pratiche con conferma già presente per una conferma/proforma; propone la pratica con il suggerimento del ruolo e i numeri (somma attuale, importo ordine). L'abbinamento (`documenti.ts`, rotta di abbina) riceve il ruolo scelto, controlla (V12) e salva in una transazione (V13) con `FOR UPDATE` sulla pratica; «sostituisce» marca il vecchio come superato. Il confronto delle righe e i controlli della pratica usano solo i documenti non superati. Registro con prima/dopo.
- **Interfaccia** (solo i punti necessari: `VistaDocumento.tsx` scelta del ruolo nell'abbinamento con il suggerimento preselezionato e la spiegazione in una riga; `VistaPratica.tsx` progresso «Confermato X di Y» e i documenti superati in grigio con «superato da …»). Se un pacchetto frontend sta girando sugli stessi file, fermati e scrivilo.

## File ammessi
`app/backend/prisma/schema.prisma` e una migrazione nuova, `app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/src/pratiche.ts`, `app/backend/src/motore/**` (solo lettura dei documenti non superati nello stato/confronto; scrivilo), `app/backend/test/**`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/app/(app)/pratiche/**`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, `strumenti/prove/app_pratica.py`, il resoconto. Vietati: spec, piano, seed.

## Fine
- `npx tsc --noEmit` backend e frontend; jest delle suite toccate, una per volta, su `decobrands_test_conferme`: due proforme parziali sulla stessa pratica (somma = ordine → «Confermato 2.154,50 di 2.154,50»); una conferma che sostituisce (la vecchia superata, non conta); suggerimento del ruolo; prima conferma → attesa fattura come oggi; più fatture parziali (verifica).
- Sola lettura su `decobrands_db`: cosa propone ora per PR102813 e PR102848 (scrivilo nel resoconto).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_pratica` (timeout 10 min), 0 KO.
- Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-conferme-multiple.md` con il comando della migrazione e «Da documentare» (§4 tabella, §5 stati, §6.5 abbinamento, §7.3/§7.9, §19 D-174).
