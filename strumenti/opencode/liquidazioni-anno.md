# Pacchetto `liquidazioni-anno`

## Contesto
Pagina **Liquidazioni** (`app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`): testata con
«Torna alle Liquidazioni · Esporta in Excel · Chiudi il trimestre · Guida» e i quattro riquadri dei
trimestri (1°…4°) dell'anno in corso. Oggi l'anno non si può scegliere.

Ugo (15/11/2026): un **menu a tendina con l'anno**, nella testata **a sinistra di «Esporta in Excel»**
(subito dopo «Torna alle Liquidazioni»). **Predefinito: anno corrente.**

## Compito
1. **Server (V12)**: le rotte delle liquidazioni (cerca in `app/backend/src/`, es. `liquidazioni.ts`)
   accettano `anno` (intero validato, `@IsInt` con limiti ragionevoli); senza `anno` = anno corrente del
   server. Trimestri, stati (da liquidare / in corso / chiuso), righe ed esportazione si calcolano per
   quell'anno sul server. L'elenco degli anni della tendina lo dà il server: dal primo anno con dati
   (documenti/pratiche/liquidazioni) all'anno corrente, sempre almeno l'anno corrente.
   «Chiudi il trimestre» resta possibile solo dove lo è già (controlli invariati, sul server).
2. **Interfaccia**: `<select>` nativo, classi esistenti (`grep` su `stile.css`), fuoco con bordo interno
   (D-64), `aria-label="Anno"`. L'anno scelto entra nella memoria della schermata (si torna nello stesso
   punto, §7.12) e nel link/esportazione. Al cambio, sagome/tabella tenue (D-59).
3. Nota in `app/frontend/lib/guida.ts` (pagina Liquidazioni).

## File ammessi
`VistaLiquidazioni.tsx`, i file backend delle liquidazioni e dell'esportazione della liquidazione, i loro
test in `app/backend/test/`, `lib/guida.ts`. **Non toccare** `motore/*`, `proposta.ts`, `documenti.ts`,
`pratiche.ts`, `lettura.ts`, `lettore.ts`, `VistaSistema.tsx` e il registro (altri pacchetti in corso): se
servono, scrivi la modifica nel resoconto e fermati. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, rimandi `// D-nn §19`.
Prove su `decobrands_test_liq_anno` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`,
Integra. Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest liquidazioni: senza anno = corrente; anno passato → trimestri
di quell'anno; anno non valido → 400; i numeri dell'anno corrente invariati rispetto a prima.

## Resoconto
`strumenti/opencode/resoconto-liquidazioni-anno.md`: file toccati, prove, dubbi, «Da documentare».
