# Pacchetto `testata-pratica-ordini`

## Contesto
Testata della pratica (`app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`), es. OF/2026/002:
«Ordine fornitore **AU278665** ⧉ · AGRI AGGIO … · ARTE WOHNACCESSORIES … · seguita da Maurizio Bastasin».
La pratica ha **due ordini** (AU278665 e AU278666, come mostra la fase «Ordini» sotto), ma la testata
ne mostra uno solo.

Ugo (15/11/2026):
1. mostra **tutti gli ordini** della pratica, di seguito, ognuno con il suo pulsante «copia»
   («Ordini fornitore AU278665 ⧉ AU278666 ⧉»; «Ordine fornitore» al singolare se è uno solo);
2. la riga con **cliente · fornitore · seguita da (agente)** va **sempre a capo**, su una riga sua sotto
   gli ordini, non più accodata.

## Compito
- Usa i numeri d'ordine che il server già manda alla pagina (quelli della fase «Ordini»); se la testata
  ne riceve uno solo, verifica nel GET della pratica (`app/backend/src/pratiche.ts`) se c'è già l'elenco
  e usalo. Non calcolare nulla nel browser oltre a mostrare (V12). Tocca il backend solo se l'elenco
  manca davvero, aggiungendo il campo senza cambiare gli altri.
- Riusa il pulsante copia già in uso nella testata. Classi esistenti (`grep` su `stile.css`).

## File ammessi
`VistaPratica.tsx`, `app/backend/src/pratiche.ts` (solo se serve), `app/frontend/app/stile/stile.css`
(solo aggiunte in fondo). Non toccare `VistaDocumento.tsx`, `CampoRicerca.tsx`, `proposta.ts`,
`documenti.ts`, `componenti/page.tsx`, `lib/guida.ts` (altro pacchetto in corso). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano, codice minimo.
Niente commit, 8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend (e backend se toccato) pulito.

## Resoconto
`strumenti/opencode/resoconto-testata-pratica-ordini.md`: file toccati, prove, «Da documentare».
