# Resoconto pacchetto 2-10 — Più clienti con la stessa P.IVA: decide la ragione sociale

Data: 13/11/2026 · Esecutore: DeepSeek V4 Flash · Gravità: P2 · Rilievo: A4-07 (U12 → D-124)

Stato: finito.

## Rilievi

### A4-07 — P.IVA condivisa fra più clienti: decide la ragione sociale
Corretto. Il codice attuale aveva **già** la normalizzazione senza prefisso del paese
(`app/backend/src/proposta.ts:245`, lavoro del pacchetto `proposta-piva`): la parte da
correggere era solo la scelta fra più clienti con la stessa P.IVA.

`riconosciClienteDai` (`app/backend/src/proposta.ts:254-271`) ora:
- raccoglie **tutti** i clienti la cui P.IVA normalizzata coincide (`perPiva`);
- un solo cliente → quello, come prima;
- più clienti → tiene solo quelli con ragione sociale normalizzata uguale a quella letta:
  un solo candidato → quello, altrimenti `null` («non riconosciuto»), niente più `find` che
  prende il primo (D-124);
- nessun cliente con quella P.IVA → resta il ripiego sulla sola ragione sociale, invariato.

Nessun'altra parte del flusso toccata: `riconosciCliente` (`:274`), `propostaDocumento`
(`:413`) e `mancaAgenziaRighe` (`:347`) usano già `riconosciClienteDai` e ricevono la
correzione gratis. V12 rispettata: tutto lato server, i clienti arrivano dal database già
letti una volta sola (D-106).

Prova aggiunta in `app/backend/test/proposta.spec.ts:167-178`: due sedi con la stessa P.IVA
(scritta con e senza prefisso), ragione sociale che sceglie la sede giusta, e casi ambigui
(senza nome, nome di un terzo cliente) che danno `null`. Le prove del prefisso (R1-09,
D-124) c'erano già e restano verdi.

## Prove

- `npx jest test/proposta.spec.ts` sul database `decobrands_test_2_10` (creato con
  `prisma migrate deploy`, `TMP` separato): **53 passati, 0 KO**.
- `npx tsc --noEmit` in `app/backend`: **0 errori**.
- Database `decobrands_test_2_10` cancellato (`DROP DATABASE`).
- `git diff --name-only`: toccati solo `app/backend/src/proposta.ts` e
  `app/backend/test/proposta.spec.ts` (più questo resoconto). Gli altri file modificati in
  `git status` sono degli altri pacchetti dell'onda.

Prove nel browser da lanciare a fine onda: **nessuna** legata a questo pacchetto (solo
backend). Nessun file frontend toccato.

## Da documentare

Documentazione della riga §19 a cura del pacchetto documentazione dell'onda; testo pronto:

- **§19, D-124 (già decisa da Ugo l'08/11/2026)**: «Cliente riconosciuto per P.IVA anche
  quando è condivisa. La P.IVA letta si confronta senza prefisso del paese; un solo cliente
  con quella P.IVA → quello; più clienti → decide la ragione sociale normalizzata se il
  candidato è uno solo, altrimenti “non riconosciuto”. Precisa D-92.»
  Dove: `app/backend/src/proposta.ts` (`normalizzaPiva`, `riconosciClienteDai`), prova in
  `app/backend/test/proposta.spec.ts`.
- **Perché** nella sezione della spec sulla proposta/riconoscimento cliente (§6.5, D-92):
  in Integra una catena ha più clienti (sedi, punti vendita) con la stessa P.IVA; senza
  questa regola l'abbinamento cadeva sempre sul primo cliente, o su nessuno se il documento
  portava il prefisso del paese (`IT 012…`, `DE 012…`, caso D-91). Decidere per ragione
  sociale fra soli candidati con quella P.IVA evita di attribuire il documento alla sede
  sbagliata; se resta ambiguo, l'operatore sceglie a mano («non riconosciuto»).
- **Guida in linea (`app/frontend/lib/guida.ts`)**: **nulla da cambiare** (regola interna di
  riconoscimento, non un pulsante o una finestra).
- **Piano lavoro (`piano-lavoro-crm.md`)**: correzione di collaudo P2, nessuna attività
  nuova; eventualmente una riga nella voce di correzione dell'onda 2 (ore 0, dentro il
  collaudo).
- **README**: nulla.
