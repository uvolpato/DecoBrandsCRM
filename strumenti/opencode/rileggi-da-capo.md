# Pacchetto `rileggi-da-capo`

## Contesto
Ugo (15/11/2026): sul documento `Auftrag_AU278666.pdf` (ordine AU278666, stato `da_controllare`) ha fatto
la **rilettura** (`POST /api/documenti/:id/rileggi`, `app/backend/src/documenti.ts` ~1226, pulsante in
`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), ma la scheda mostra ancora gli stessi
fornitore (ARTE WOHNACCESSORIES), cliente (AGRI AGGIO SNC, codice 45172 «codice del cliente associato")
e la stessa proposta («Nuova pratica · Apri la pratica»).

Comportamento atteso: **rileggere = ripartire da capo**. Si rilegge il PDF, si azzerano fornitore,
cliente, tipo, righe, proposta/suggerimento e ogni riconoscimento automatico salvato sul documento,
poi si rifà il riconoscimento sui dati nuovi. L'abbinamento codice cliente → cliente (tabella degli
abbinamenti, non il documento) resta: se ritrova lo stesso cliente va bene, ma deve venire dal nuovo
riconoscimento, non dai valori vecchi del documento.

## Compito
1. **Diagnosi** (solo lettura su `decobrands_db`, URL costruito con grep, mai `.env` letto per intero):
   guarda il documento AU278666 e il registro eventi: la rilettura è davvero partita e finita? Quali campi
   ha lasciato invariati? Anche il frontend: dopo la rilettura ricarica il documento o tiene lo stato vecchio?
2. **Correzione alla radice**, nel punto unico per cui passano rilettura e prima lettura
   (`lettura.ts`/`lettore.ts`/`documenti.ts`): la rilettura svuota i campi riconosciuti e la proposta
   in **una transazione** (V13) prima di rimettere il documento in coda; la pagina, finita la lettura,
   mostra i dati nuovi (la coda si aggiorna già da sola: verifica che aggiorni anche il dettaglio aperto).
3. Se trovi che la rilettura invece **funziona** e i dati coincidono solo perché il riconoscimento ritrova
   le stesse cose, non cambiare il codice: scrivilo nel resoconto con le prove (eventi, date di lettura).

## File ammessi
`app/backend/src/documenti.ts`, `lettura.ts`, `lettore.ts`, `proposta.ts`,
`app/backend/test/documenti-lettura.spec.ts`, `VistaDocumento.tsx`, `app/frontend/lib/guida.ts`.
Aggiungi, non riscrivere: i file hanno modifiche non committate di pacchetti precedenti da conservare.
Vietati: tutto il resto, Integra (192.168.239.49).

## Regole
- Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`.
- V12 tutto sul server; V13 una transazione. Italiano, commenti con rimando. Codice minimo.
- Prove solo su `decobrands_test_rileggi` (crealo, cancellalo alla fine). Su `decobrands_db` solo letture;
  non lanciare la rilettura sul db vero.
- Niente commit, push, porte 8001/8002; niente `cd`, `/tmp`, `&`.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest `documenti-lettura`: un documento con fornitore, cliente e
proposta già impostati → rileggi → campi azzerati e ricalcolati dal nuovo riconoscimento.

## Resoconto
`strumenti/opencode/resoconto-rileggi-da-capo.md`: causa trovata, file toccati, prove, dubbi,
«Da documentare» (testo pronto per spec e §19).
