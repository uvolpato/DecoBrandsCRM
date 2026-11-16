# Pacchetto `pdf-pagamento-non-visto` (solo diagnosi)

## Contesto
Ugo (15/11/2026): nella coda «Da controllare» è rimasto un solo documento, un **pagamento** (PDF). Aprendolo,
**il PDF non si vedeva**; poco dopo, ricaricando/riprovando, si è visto. Vuole sapere perché e se può
ricapitare.

## Compito (sola lettura, nessuna modifica al codice)
1. Trova il documento (`decobrands_db`, sola lettura, URL costruito con grep, `.env` mai letto per intero):
   tipo, stato, nome file, data arrivo, `letto_il`, eventi del registro con orari.
2. Ricostruisci come la pagina del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`)
   ottiene e mostra il PDF (rotta del backend in `app/backend/src/documenti.ts`, percorso del file su disco)
   e trova le cause possibili del PDF non visibile la prima volta. Ipotesi da verificare: file scritto su
   disco dopo la riga nel db (V13 vuole il file prima), anteprima chiesta mentre il documento è ancora
   in lettura, tipo «pagamento» trattato diversamente, cache del browser, errore 404/500 nel log del
   backend (cerca nei log di `app/backend` se esistono nel progetto), visualizzatore che non si ricarica
   quando cambia documento selezionato nella coda.
3. Se trovi una causa certa, scrivi la correzione proposta (file, righe, codice minimo) ma **non applicarla**:
   altri pacchetti stanno modificando `VistaDocumento.tsx` e `documenti.ts`.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Nessuna scrittura su db né sui
file del codice. Niente 8001/8002 (solo lettura di log se già su disco), `cd`, `/tmp`, `&`, Integra.
Skill: `caveman`.

## Resoconto
`strumenti/opencode/resoconto-pdf-pagamento-non-visto.md`: documento trovato, cronologia, causa (certa o
probabile, con prove), correzione proposta, come riprodurlo.
