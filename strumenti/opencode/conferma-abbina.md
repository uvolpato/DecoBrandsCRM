# Conferma sul pulsante «Abbina» nel dettaglio del documento (15/11/2026)

**Esecutore: DeepSeek Flash** · Gravità: P2.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit. **Non lanciare `prepara.sh`/`giro.sh`**: Claude Code sta facendo il giro completo; tu solo `py_compile`.

## Cosa vuole Ugo
In *Documenti* → dettaglio del documento → scheda «Pratica proposta», il pulsante **«Abbina a OF/2026/001»** (e ogni pulsante «Abbina» del dettaglio, anche nelle altre schede/candidati) apre prima una **finestra di conferma** che riassume cosa succede, con i dati veri dal server già nella proposta:
- documento (tipo e numero) → pratica (numero, cliente, fornitore, numero d'ordine del fornitore);
- per conferme/proforme il **ruolo** scelto (Parziale / Sostituisce, D-174) e l'effetto («Confermato X € di Y € dopo l'abbinamento», o «PR… verrà segnata come superata»);
- cosa cambia: lo stato della pratica se cambia (es. «la pratica passa ad attesa fattura»), le righe copiate nella pratica (D-176), gli avvisi ancora aperti (es. «1 articolo non è nell'ordine»).
- Pulsanti «Abbina» / «Annulla».
Se l'abbinamento **si può annullare** nell'app (cerca «annulla abbinamento»/«togli dalla pratica» in `documenti.ts` e nelle pagine): conferma semplice. Se **non si può annullare**: usa `ConfermaGrave` con la casella da spuntare (D-172). Scrivi nel resoconto quale dei due e perché.

## File ammessi
`app/frontend/app/(app)/documenti/**`, `app/frontend/componenti/ConfermaGrave.tsx` (solo se serve un parametro), `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py` (le prove che cliccano «Abbina» devono confermare), il resoconto `strumenti/opencode/resoconto-conferma-abbina.md`.

## Fine
- `npx tsc --noEmit` nel frontend; `py_compile` della prova.
- Carica davvero `ponytail-review`, `design:ux-copy`, `caveman`.
