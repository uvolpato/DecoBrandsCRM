# Pacchetto `giro-0-2-7-prove`

Il giro nel browser della 0.2.7 (Claude Code, 16/11 notte) dà: `app_oggi` 43/0, `app_fornitori` 39/2, e **si fermano
con un errore** `app_documenti`, `app_pratica`, `app_pratiche`, `app_liquidazioni`, `app_soggetti`, `app_utenti`,
`app_filtri_lampeggio`, `app_componenti`, `app_registro`. Uscite in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt`.
Esempi:
- `app_utenti`: `locator(".segmenti [role=tab]:has-text("Tutti") .n") resolved to 2 elements` → la copia nascosta dei
  segmenti di `FilterBar.tsx` (pacchetti barra-filtri) ha anche lei `role=tab`;
- `app_pratiche`: `invalid literal for int() with base 10: ''`;
- `app_documenti`: `Page.fill: Timeout` (campo cambiato: «Riferimento (facoltativo)» per il pagamento, somma righe, ecc.);
- `app_fornitori` KO: «Torna a Pratiche: il filtro di prima è ancora scelto», «documento: due schede (azione proposta,
  righe lette)», «indietro: stesso fornitore e ricerca ricordata», «indietro: stessa scheda», «ammi: la nota dice che la
  modifica è del solo superutente».

## Compito
1. **`FilterBar.tsx`**: la copia nascosta dei segmenti usata per misurare deve essere invisibile a lettori di schermo e
   selettori: `aria-hidden="true"` sempre, nessun `role` (né `tablist` né `tab`), niente `.n`/classi che le prove usano
   (es. classe propria `segmenti-misura`), non focalizzabile. Se dopo il cambio la tendina viene mostrata, il segmento
   visibile non c'è: le prove devono leggere i numeri da segmenti **o** tendina (aiuto unico nelle prove).
2. **Prove** (`strumenti/prove/app_*.py`): aggiorna i selettori e gli attesi all'interfaccia della 0.2.7 (leggi i
   resoconti dell'onda in `strumenti/opencode/resoconto-*.md` del 15/11). Cambia l'atteso **solo** quando il cambio è
   voluto da un pacchetto dell'onda (scrivi quale); se una prova rivela un difetto vero dell'app, correggi l'app, non
   la prova (esempi da verificare: «Torna a Pratiche: il filtro di prima è ancora scelto», «indietro: stessa scheda» —
   la memoria della schermata §7.12 deve funzionare anche con la tendina).
3. **Giro**: puoi lanciarlo tu (deroga a questa sola onda), solo così:
   `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_giro` una volta, poi
   `bash strumenti/collaudo/e2e/giro.sh decobrands_test_giro <prove…>` (backend di prova 8012, frontend 8071; **mai
   8001/8002**). Se la prima pagina va in timeout, è il frontend che compila: richiama la pagina con `curl -m 180` e
   rilancia. Obiettivo: tutte le prove elencate sopra **0 KO** e senza errori, più `app_pratica` e `app_registro`.
4. `npx tsc --noEmit` frontend.

File ammessi: `strumenti/prove/*.py`, `strumenti/collaudo/e2e/*`, `app/frontend/**` (solo per difetti veri, scrivili),
`app/frontend/app/stile/stile.css`. Backend solo se un difetto vero lo richiede (scrivilo in testa al resoconto).
Regole: `strumenti/opencode/regole-onda-parallela.md`, `CLAUDE.md` (selettori schede: `.schede-barra [role=tab]`).
Niente commit, `cd`, `/tmp`, `&` (il giro usa già `&` dentro lo script: va bene). Skill: `playwright-best-practices`,
`ponytail-review`, `caveman`.
Resoconto: `strumenti/opencode/resoconto-giro-0-2-7-prove.md` (tabella prova → OK/KO prima e dopo, attesi cambiati con
il pacchetto che li giustifica, difetti veri corretti). Riepilogo in 8 righe.
