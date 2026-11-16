# Pacchetto `sconto-riga`

## Problema
Ordine (Auftrag) di ARTE WOHNACCESSOIRES: ogni riga ha una colonna «EP / Rabatt / Sonderrabatt»
con prezzo unitario e sconto di riga (es. `14,90 €` e sotto `10,00%`). La lettura prende quantità,
prezzo e importo ma **non lo sconto**, così il controllo in `app/backend/src/proposta.ts` (~riga 970)
segnala a torto «Riga 2: quantità × prezzo 29,80 € diverso dall'importo 26,82 €» (2 × 14,90 × 0,9 = 26,82).
Il riquadro *Righe* della pagina documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
e componenti collegati) non mostra lo sconto né permette di correggerlo.

## Compito
1. Riga letta con un campo facoltativo `sconto` (percentuale, es. 10 = 10%): richiesto al lettore
   (prompt/schema di GLM-OCR in `app/backend/src/lettore.ts` / `lettura.ts`), salvato dove si salvano
   le altre parti della riga, accettato nella correzione manuale (*Correggi i dati letti*).
2. Controllo di riga: atteso = round2(quantità × prezzo × (1 − sconto/100)); senza sconto resta come ora.
   Stesso calcolo ovunque si ricava l'importo di una riga (`importoRigaLetta` e simili: cercali tutti).
3. Interfaccia: colonna «Sconto» nel riquadro *Righe* (vuota se assente), modificabile nella correzione.
4. Verifica anche (già scritta, non riscriverla senza motivo) la modifica in `app/backend/src/bollettini.ts`
   (~riga 58): il limite `primo` del selettore dei mesi ora è il mese più vecchio fra bollettini e
   documenti (`ordini_fornitore_documenti.data`), così si può scegliere marzo 2026 anche senza bollettini.
   Aggiungi una prova jest che lo controlli.

## File ammessi
`app/backend/src/proposta.ts`, `lettore.ts`, `lettura.ts`, `documenti.ts`, `bollettini.ts`, i loro test in
`app/backend/test/`, `VistaDocumento.tsx` e i componenti del frontend che disegnano/correggono le righe,
`app/frontend/lib/guida.ts`. Migrazione Prisma **solo se** lo sconto non entra nella struttura JSON già usata
per le righe lette (preferisci il JSON esistente, niente migrazione).
Vietati: tutto il resto, `.env`, `decobrands_db`, Integra (192.168.239.49).

## Regole
- Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`.
- V12: calcoli solo sul backend; il browser invia solo i valori digitati. V13: una transazione.
- Italiano semplice, commenti brevi con rimando (`// D-nn §19` se esiste); codice minimo.
- Prove solo su `decobrands_test_sconto_riga` (`DATABASE_URL_TEST`); niente commit, push, porte 8001/8002.
- Niente `cd`, niente `/tmp`, niente `&`.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman` (+ `postgresql-code-review` se tocchi SQL).

## Prove (0 KO)
`npx tsc --noEmit` in backend e frontend; `npx jest` delle suite toccate (proposta, documenti-lettura,
bollettini) una per volta. Aggiungi un caso: riga 2 × 14,90 con sconto 10 e importo 26,82 → nessun rilievo.

## Resoconto
`strumenti/opencode/resoconto-sconto-riga.md`: file toccati, prove ed esito, dubbi, «Da documentare»
(testo pronto per spec §19 nuova D-nn, guida, piano).
