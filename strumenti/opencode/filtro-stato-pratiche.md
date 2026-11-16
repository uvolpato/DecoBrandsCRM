# Pacchetto `filtro-stato-pratiche`

## Richiesta di Ugo (15/11/2026)
«Nel cerca pratiche metti un filtro per stato, che dipende da dove arrivo. Se arrivo dalla ricerca degli
abbinamenti e il documento è un ordine, una proforma o una conferma, le pratiche devono avere solo
l'ordine; se è una fattura devono avere la conferma; se è una nota di credito devono avere una fattura.»

## Compito
1. Trova la ricerca delle pratiche usata per abbinare un documento (pagina documento,
   `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` e componenti collegati; endpoint
   `GET /pratiche/cerca` in `app/backend/src/pratiche.ts` ~riga 181, o quello che usa davvero).
   Usa `graphify query` prima di grep.
2. Aggiungi un **filtro per stato** della pratica (filtro standard D-22 §16.4.1: segmenti o selezione
   multipla con i conteggi dal vivo, D-23; niente tendina per le entità). Stati: *solo ordine* (attesa
   conferma), *confermata* (attesa fattura), *fatturata*.
3. **Valore iniziale secondo il tipo del documento** da abbinare:
   - ordine, proforma, conferma → pratiche con solo l'ordine;
   - fattura → pratiche con la conferma;
   - nota di credito → pratiche con una fattura.
   L'operatore può togliere o cambiare il filtro (es. fattura senza conferma arrivata: deve poter vedere
   anche le pratiche con solo l'ordine). Fuori dall'abbinamento (es. *Sposta*) nessun filtro iniziale.
4. V12: il filtro lo applica il **server** (parametro `stato` validato nel DTO, lista chiusa), il browser
   invia solo la scelta. Lo stato si ricava dai documenti come già fa il codice (non scriverlo a mano).
5. Documentazione: nuova decisione per il §19 nel resoconto (testo pronto), nota in `app/frontend/lib/guida.ts`.

## File ammessi
`app/backend/src/pratiche.ts` (e il DTO della ricerca), il suo test in `app/backend/test/`, `VistaDocumento.tsx`
e i componenti del frontend della ricerca pratiche, `app/frontend/lib/guida.ts`, `app/frontend/lib/entita.ts`.
Vietati: tutto il resto, `.env`, `decobrands_db`, Integra (192.168.239.49). `proposta.ts`, `lettura.ts`,
`documenti.ts` hanno modifiche non committate di un altro pacchetto: non toccarle.

## Regole
- Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`.
- V12 tutto sul backend; V13 una transazione. Italiano semplice, commenti con rimando (`// D-nn §19`). Codice minimo.
- Prove solo su `decobrands_test_filtro_stato` (crealo tu come dicono le regole, cancellalo alla fine).
- Niente commit, push, porte 8001/8002; niente `cd`, `/tmp`, `&`.
- Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest della suite pratiche con un caso per ogni stato.

## Resoconto
`strumenti/opencode/resoconto-filtro-stato-pratiche.md`: file toccati, prove, dubbi, «Da documentare».
