# Pacchetto `importo-calcolato`

## Contesto
Pacchetti `sconto-riga` e `filtro-stato-pratiche` già fatti, non committati (vedi i loro resoconti in
`strumenti/opencode/`): le righe lette hanno `sconto`, il controllo di riga è
quantità × prezzo × (1 − sconto/100). Ugo ha approvato (15/11/2026) questo comportamento di
*Correggi i dati letti* (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`).

## Compito
1. **Importo calcolato o letto.** Una riga ha l'importo *letto* se il lettore (o l'operatore) l'ha scritto;
   altrimenti è *calcolato* = round2(q × p × (1 − s/100)).
   - Calcolato: cella grigia con la scritta «calcolato», **non modificabile**, si aggiorna subito quando
     cambiano quantità, prezzo o sconto.
   - Letto: cella normale, modificabile. Se diverso dal calcolato (≥ 0,01): cella in arancio con l'avviso già
     esistente («quantità × prezzo … diverso dall'importo») e un pulsantino «Usa 26,82 €» che mette il
     calcolato al posto del letto (l'importo diventa calcolato, cioè vuoto).
   - Il letto non si sovrascrive mai da solo; se l'operatore lo svuota, la riga torna calcolata.
   - Sconto vuoto = 0. Nessuna finestra nuova, una sola tabella.
2. **Server (V12)**: al salvataggio della correzione il browser manda solo quantità, prezzo, sconto e
   l'importo **solo se letto/digitato** (vuoto se calcolato); il server ricalcola l'importo mancante con
   `importoRigaLetta`/`fattoreSconto` (`proposta.ts`) e non salva mai un importo calcolato dal browser.
   Verifica che sia già così; correggi se no.
3. **Rilettura dei documenti 5–9** (stato `da_controllare`, ordini ARTE): esiste
   `POST /api/documenti/:id/rileggi` (`documenti.ts` ~1226). Non lanciarla tu sul database vero: scrivi nel
   resoconto il comando o il pulsante con cui Ugo la fa dall'interfaccia (se il pulsante *Rileggi* è visibile
   per `da_controllare`, basta dirlo; se non c'è, segnalalo, non aggiungerlo).
4. Guida (`app/frontend/lib/guida.ts`): due righe su calcolato/letto e sul pulsante «Usa».

## File ammessi
`VistaDocumento.tsx`, `app/frontend/app/stile/stile.css` (controlla con grep che le classi nuove non esistano
già), `app/frontend/lib/guida.ts`, `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`,
`app/backend/test/documenti-lettura.spec.ts`, `app/backend/test/proposta.spec.ts`.
Aggiungi, non riscrivere: questi file hanno modifiche dei due pacchetti precedenti da conservare.
Vietati: tutto il resto, `.env`, Integra (192.168.239.49).

## Regole
- Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`.
- V12 calcoli sul server; V13 una transazione. Italiano semplice, commenti con rimando (`// D-nn §19`). Codice minimo.
- Prove solo su `decobrands_test_importo_calc` (crealo, cancellalo alla fine). Su `decobrands_db` nessuna scrittura.
- Niente commit, push, porte 8001/8002; niente `cd`, `/tmp`, `&`.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest `documenti-lettura` e `proposta`: un caso con importo vuoto e sconto
(il server lo calcola), uno con importo letto discorde (resta, con rilievo).

## Resoconto
`strumenti/opencode/resoconto-importo-calcolato.md`: file toccati, prove, come rileggere i doc 5–9, dubbi,
«Da documentare» (testo pronto per spec e §19).
