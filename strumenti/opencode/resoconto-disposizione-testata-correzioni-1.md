# Resoconto — Disposizione testata: correzioni 1 (13/11/2026)

Esecutore: DeepSeek Flash · Pacchetto: `strumenti/opencode/disposizione-testata-correzioni-1.md`.
Parte da `resoconto-disposizione-testata.md` (D-154), file `VistaDocumento.tsx` lasciato com'era: corretti solo
stile e prove.

## Rilievi corretti

1. **«Somma righe» tagliata a destra** — `.campo-letto label` ora va a capo (`flex-wrap: wrap`), la somma resta
   un blocco a sé allineato a destra dentro la colonna dell'Importo; colonna Importo più larga (`1.5fr`). A 1440
   e a 768 sta tutta dentro, verificato anche dalla prova.
2. **Etichette e campi disallineati** — campi, ricerca, lente e › hanno tutti `height: 32px`; con altezze uguali
   l'allineamento in basso porta le etichette sulla stessa linea. Il pallino della ricerca non cambia l'altezza.
3. **Larghezze** — righe 2 e 3 usano la stessa griglia `letto · › · ricerca · codice · piva`: Cliente e Fornitore
   hanno la stessa larghezza e stanno uno sopra l'altro; la riga 3 lascia vuota la colonna del codice e mette la
   P.IVA fornitore sotto la P.IVA cliente. La ricerca riempie la sua colonna (niente buchi).
4. **768 px** — riga 2 `letto+›+ricerca` / `codice+piva` sotto, riga 3 `letto+›+ricerca` / `piva` sotto; somma
   dentro il riquadro; nessun campo tagliato.

## File toccati

- `app/frontend/app/stile/stile.css`: blocco D-154 (griglia righe 2/3, altezza comune dei campi, ricerca che
  riempie, `flex-wrap` dell'etichetta, media query 768). Solo classi già esistenti di questa testata, nessuna
  classe nuova aggiunta (grep fatto): `.riga-letti`, `.btn-arrow`, `.campo-letto`, `.sopra-riga`.
- `strumenti/prove/app_documenti.py`: tre controlli nuovi (campi di ogni riga sulla stessa top ±2 px a 1440;
  «Somma righe» dentro la colonna dell'Importo a 1440 e a 768) e 400 ms di attesa prima della schermata 1440,
  perché le voci delle anagrafiche arrivano dal server e la ricerca mostrava l'id invece del nome.

Nessuna modifica a `VistaDocumento.tsx`, `CampoRicerca.tsx`, `Campo.tsx`, backend, schema o migrazioni.

## Prove

- `npx tsc --noEmit` nel frontend: **OK**.
- `python -m py_compile strumenti/prove/app_documenti.py`: **OK**.
- `prepara.sh decobrands_test_e2e` + `giro.sh decobrands_test_e2e app_documenti`: **101 OK / 0 KO** (tre giri,
  sempre 0 KO). Database `decobrands_test_e2e` di prova, non toccato `decobrands_db`; porte 8001/8002 mai usate.
- Schermate rifatte e guardate: `uscita/correggi-1440.png`, `uscita/correggi-768.png` (somma dentro, campi
  allineati, righe 2/3 con colonne condivise, 768 con ritorno a capo ordinato).

## Controlli (skill caricate davvero)

- `ponytail-review`: nessun taglio. Le regole sono minime (una griglia condivisa, un'altezza comune, un
  `flex-wrap`); niente classi o regole duplicate; nessuna astrazione nuova. **Lean already. Ship.**
- `caveman`: usata per il riepilogo.

## Da documentare

- spec §7.9 (Correggi i dati letti): nella testata i campi di ogni riga hanno la stessa altezza (32 px) e le
  etichette stanno sulla stessa linea; le righe Cliente e Fornitore usano le stesse colonne
  (`letto · › · ricerca · codice · piva`), la riga Fornitore lascia vuota la colonna del codice e mette la P.IVA
  fornitore sotto la P.IVA cliente; a 768 px le due righe vanno a capo (`letto+›+ricerca`, poi codice e P.IVA).
- spec §19, D-154: aggiungere il perché dell'allineamento — «Somma righe» sulla riga dell'etichetta con a capo
  dentro la colonna (non più fuori dal riquadro) e colonne condivise fra le due righe di ricerca, così i campi
  non ballano di altezza né lasciano buchi.
- `strumenti/opencode/disposizione-testata.md` riga 27 dice ancora «quattro righe»: vale la tabella a tre righe
  di Ugo del 13/11 (non toccato, non era fra gli ammessi).

## Aperti

- Nessuno nuovo. Restano validi gli aperti del resoconto `disposizione-testata.md` (P.IVA fornitore non usata da
  `risolviFornitore`; `proposta.spec.ts` da rilanciare a fine onda).
