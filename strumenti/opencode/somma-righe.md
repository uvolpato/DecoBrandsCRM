# Correggi i dati letti: somma delle righe accanto all'importo (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1**. Parte dopo `correggi-ordine` (stesso file): leggi prima `resoconto-correggi-ordine.md`.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_somma` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, mai porte 8001/8002, Integra mai. Niente commit.

## Cosa chiede Ugo (D-153, da proporre nel resoconto)
Nella finestra *Correggi i dati letti* (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`) l'**Importo** della testata (letto dal documento) e il **Totale** delle righe (piede della tabella) dovrebbero coincidere.
1. **Accanto al campo Importo** mostra la somma delle righe, in sola lettura, in formato valuta: «Somma righe 2.154,50 €». Si aggiorna da sola quando cambiano quantità, prezzi, importi, righe aggiunte o tolte. Non è un campo modificabile. È lo stesso numero del piede della tabella: usa una sola funzione per tutti e due.
2. **Se i due numeri differiscono** (più di 0,01 €): avviso accanto (stato «attesa», non errore), testo tipo «Diverso dall'importo del documento di 12,30 €: controlla (può essere IVA inclusa)». Se coincidono: spunta verde.
3. **Non è bloccante**: si può salvare lo stesso.
4. **Validazione sul server (V12)**: al salvataggio delle correzioni e nel calcolo dell'affidabilità/punti da controllare il server ricalcola la somma delle righe dal dato salvato e, se differisce dall'importo, aggiunge un **punto da controllare** (nel riepilogo «N punti da controllare») e lo rimanda nella risposta. La somma mostrata nel browser è solo l'anteprima di quello che si sta scrivendo, non si salva mai.
   - Cerca dove si calcolano i punti da controllare (`documenti.ts`, `proposta.ts`, `lettura.ts`) e aggiungi lì il controllo, un codice nuovo con testo semplice.
   - Somme in centesimi interi o `Prisma.Decimal`, mai float.

## File ammessi
`VistaDocumento.tsx`, `app/frontend/app/stile.css` (solo se serve, classi nuove controllate con grep), `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/src/lettura.ts`, `app/backend/test/documenti.spec.ts`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest `documenti.spec.ts` (con un caso uguale e uno diverso) su `decobrands_test_somma`.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti` (timeout 10 min), 0 KO, con controlli nuovi: somma accanto all'importo, cambia al cambio di un prezzo, avviso se diversa.
- Schermata a 1440 px in `strumenti/collaudo/e2e/uscita/somma-1440.png`.
- Resoconto `strumenti/opencode/resoconto-somma-righe.md` con «Da documentare» (§7.9, §19 D-153).
