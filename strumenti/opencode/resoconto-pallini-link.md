# Resoconto — I pallini verdi di cliente e fornitore sono link (15/11/2026)

Esecutore: DeepSeek Flash · Pacchetto: `strumenti/opencode/pallini-link.md` · Gravità P2.

## Cosa chiede Ugo

Nella finestra *Correggi i dati letti* il pallino verde accanto alla ricerca Cliente e alla ricerca
Fornitore diventa un link alla scheda della voce scelta, in una nuova scheda del browser, così le
correzioni non salvate non si perdono. Grigio e rosso restano come sono.

## Cosa ho fatto

- `CampoRicerca.tsx`: nuova prop opzionale `link?: (id: string) => string` in `Comuni`. In `Singola`,
  quando c'è la voce trovata (`nota`, quindi pallino verde) e la prop, il pallino è un
  `<a class="pallino-link" target="_blank" rel="noopener">` con `href` dalla prop,
  `title`/`aria-label` «Apri la scheda del cliente <nome>» (o fornitore, dal titolo dell'entità).
  Senza la prop il componente è identico a prima (nessun cambiamento altrove).
- `VistaDocumento.tsx`: `link={(id) => '/clienti/' + id}` sulla ricerca Cliente e
  `link={(id) => '/fornitori/' + id}` sulle ricerche Fornitore della finestra Correggi (anche nel
  ramo bollettino: stessa finestra). Stesse rotte dei link «scheda del cliente/fornitore» già usati.
- `stile.css`: classe nuova `.pallino-link` (area cliccabile 17×17 con il pallino 9×9 dentro,
  `border-radius: 50%`) e fuoco con bordo interno `box-shadow: inset 0 0 0 2px var(--primario)`
  (D-64). `.pallino-link` non esisteva.
- `lib/guida.ts`: nel «da sapere» dei Documenti, una frase: il pallino verde è un link che apre in
  una nuova scheda la scheda del cliente o del fornitore.

## Prove

- `npx tsc --noEmit` frontend: **OK**.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e`: database, build, copia frontend OK.
- `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti`: **147 controlli, 0 KO**
  (3 nuovi: il pallino verde del cliente è `a.pallino-link` con `href="/clienti/1001"`,
  `target="_blank"` e `rel="noopener"`, `aria-label` col nome).
- `python -m py_compile strumenti/prove/app_documenti.py`: OK.

## Controlli (skill caricate davvero)

- `ponytail-review`: una prop opzionale sul componente che già c'era, una classe CSS, nessun
  componente nuovo. `net: 0 linee da tagliare`.
- `caveman`: risposte concise.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9 (Correggi i dati letti): il pallino verde di Cliente e Fornitore è un link alla scheda
  (`/clienti/<id>`, `/fornitori/<id>`), si apre in una nuova scheda, `aria-label` «Apri la scheda
  del cliente/fornitore <nome>»; grigio e rosso non sono link.
- spec §16.4 (componenti): `CampoRicerca` ha la prop opzionale `link` (solo voce singola trovata).
- spec §19 — decisione nuova **da proporre** (D-nn): «il pallino verde della ricerca è un link alla
  scheda della voce, in una nuova scheda» + perché (si guarda l'anagrafica senza perdere le
  correzioni non salvate della finestra).
- `guida.ts` già aggiornato.

## Aperti / da segnalare

- La modale *Apri la pratica* non ha il link: il pacchetto chiedeva solo la finestra *Correggi i
  dati letti*. Si aggiunge con una prop se serve anche lì.
- Riga hover: il link non ha sottolineatura (è un pallino); il `title` e il fuoco col bordo interno
  lo rendono riconoscibile. Se Ugo vuole un segno più esplicito serve una scelta di stile.
