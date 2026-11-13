# Impostazioni: cambiando sezione si aggiorna solo la parte destra (13/11/2026)

**Esecutore: DeepSeek Flash** · segnalazione di Ugo. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002). Altri pacchetti lavorano su documenti, soglie (tocca `impostazioni.ts` lato server), visore PDF e `stile.css`: tocca **solo** i file ammessi. Scrivi subito `strumenti/opencode/resoconto-impostazioni-senza-ricarica.md`. Massimo 45 minuti.

## Problema
`/impostazioni/[sezione]` è una pagina a sé (`app/frontend/app/(app)/impostazioni/[sezione]/page.tsx` → `<VistaImpostazioni />`): cambiando sezione dal menu (`ElencoSelezionabile` con `href`) Next smonta e rimonta la vista, che rifà le sagome e ricarica `GET /api/impostazioni`. Tutta la pagina lampeggia.

## Correzione (minima)
- Sposta `<VistaImpostazioni />` in `app/frontend/app/(app)/impostazioni/layout.tsx` (il layout resta montato fra le sezioni); `page.tsx` e `[sezione]/page.tsx` restituiscono `null` (o il redirect alla prima sezione che `page.tsx` fa oggi). `useParams` continua a dare la sezione: l'indirizzo e il tasto Indietro restano come oggi; i dati si caricano **una volta** e cambiando sezione cambia solo il pannello di destra.
- Dopo *Salva* i dati si ricaricano come oggi (nessun cambio di comportamento).
- Controlla la **memoria della schermata** (`CRM.registra`/`useMemoria`, spec §7.12): deve continuare a funzionare.
- Controlla con `ls app/frontend/app/(app)/*/` se altre pagine con un menu a sinistra e un dettaglio a destra hanno lo stesso schema (`[id]` o `[sezione]` che rimonta tutta la vista): **elencale nel resoconto** senza cambiarle (le guarda Claude Code).

## Prove
- `npx tsc --noEmit` nel frontend.
- Prova nel browser: in `strumenti/prove/app_impostazioni.py` un controllo che, cambiando sezione, il pannello «Sezioni» **resta lo stesso nodo** (es. un attributo messo con `evaluate` prima del clic che c'è ancora dopo) e non compaiono sagome. Lanciala con `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_impostazioni` **solo se nessun altro pacchetto sta lanciando le prove** (guarda se `strumenti/collaudo/e2e/uscita/prepara.log` è cambiato negli ultimi 5 minuti); altrimenti `py_compile` e scrivilo nel resoconto.

## File ammessi
`app/frontend/app/(app)/impostazioni/**`, `strumenti/prove/app_impostazioni.py` (solo il controllo nuovo), il resoconto. Carica davvero `nextjs-app-router-patterns`, `caveman`.
