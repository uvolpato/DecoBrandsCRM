# Correggi i dati letti: il cliente scelto si salva (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo è nel giro con i documenti veri).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_cliente` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, mai porte 8001/8002, Integra mai. Niente commit.

## Problema (Ugo)
In *Correggi i dati letti* scelgo il cliente nella ricerca «Cliente» e il pallino non diventa verde.
Causa in `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` ~riga 931: `<CampoRicerca entita={entitaCliente} valore="" onChange={() => {}} … onScelto={…}>` — il valore è fisso vuoto, la scelta non si tiene; in più `onScelto` **sovrascrive «Cliente letto»** con il nome del CRM e la P.IVA, perdendo il dato letto.

## Cosa fare (come per il fornitore, che ha `fornitore_id`)
1. La testata delle correzioni ha un campo **`cliente_id`** come `fornitore_id`: la ricerca è controllata (`valore={b.testata.cliente_id}`, `onChange={(v) => t('cliente_id', v)}`), il pallino diventa verde alla scelta. Il pulsante › è disattivato se `cliente_id` è già scelto (come per il fornitore).
2. **Non sovrascrivere «Cliente letto»**: il letto resta il dato del documento. La P.IVA cliente si riempie dal cliente scelto **solo se è vuota**. Togli `onScelto` se non serve più (e la prop da `CampoRicerca` se nessuno la usa).
3. **Server (V12, V13)**: `cliente_id` entra fra i campi ammessi delle correzioni (`documenti.ts`, `TESTATA_CAMPI` o equivalente), dove sta `fornitore_id`. Il server controlla che il cliente esista (e non sia archiviato/eliminato se c'è questo stato), altrimenti 400. Si salva nei campi letti JSON del documento come `fornitore_id` (verifica dove sta `fornitore_id`; niente schema né migrazioni — se servono fermati e scrivilo).
4. **Riconoscimento** (`proposta.ts`): se il documento ha `cliente_id` scelto a mano, la proposta lo usa come cliente certo (prima del riconoscimento per codice/P.IVA/nome), come succede per il fornitore scelto. Così *Apri la pratica* parte con il cliente già scelto e non lo richiede.
5. All'apertura della finestra, se il documento ha già `cliente_id` (o il riconoscimento ne ha uno certo), il campo parte con quel cliente e il pallino verde.

## File ammessi
`VistaDocumento.tsx`, `app/frontend/componenti/CampoRicerca.tsx`, `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/test/documenti.spec.ts`, `app/backend/test/proposta.spec.ts`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest `documenti.spec.ts` e `proposta.spec.ts`, una per volta, su `decobrands_test_cliente`, con casi: cliente scelto salvato; id inesistente → 400; proposta usa il cliente scelto.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti` (timeout 10 min), 0 KO; aggiungi: scelta cliente → pallino verde, «Cliente letto» invariato.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-cliente-scelto.md` con «Da documentare» (§7.9, §19).
