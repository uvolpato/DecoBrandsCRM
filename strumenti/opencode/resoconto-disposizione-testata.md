# Resoconto — Correggi i dati letti: disposizione della testata (13/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/disposizione-testata.md` · Gravità P1.
Parte dopo `correggi-ordine` e `somma-righe` (stesso file `VistaDocumento.tsx`): letti prima i due resoconti.

## Cosa chiede Ugo (ultima versione: tre righe)

Testata di *Correggi i dati letti* su tre righe:

| Riga | Campi |
|---|---|
| 1 | Tipo · Numero · Data · Importo, con «Somma righe X €» (spunta o avviso) **sopra** l'Importo, sulla riga dell'etichetta, allineata a destra |
| 2 | Cliente letto · **›** · Cliente (ricerca CRM+Integra) · Codice cliente · P.IVA cliente |
| 3 | Fornitore letto · **›** · Fornitore (ricerca) · P.IVA fornitore |

(La riga «Somma righe» che era sotto l'Importo — resoconto `somma-righe` — ora sta sopra, sulla riga dell'etichetta.)

## File toccati

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`:
  - `CampoLetto`: il prop `sotto` diventa `sopra` (elemento nella riga dell'etichetta, spinto a destra);
  - testata non-bollettino su tre `div.riga-letti` (tipo / cliente / fornitore); il bollettino resta com'è;
  - pulsante `›` fra il campo letto e la ricerca, `aria-label`/`title` «Cerca il cliente/fornitore letto»,
    disattivato se il letto è vuoto (e, per il fornitore, se `fornitore_id` è già scelto); usa il valore
    attuale del campo letto (anche corretto a mano) e apre la ricerca col comando `cerca`;
  - rimosso `testoIniziale`/«Cerca questo» dai due campi di ricerca in questa finestra (resta nei moduli);
  - «Somma righe» sopra l'Importo (`sommaSopra`), spunta verde se uguale, avviso compatto con la differenza;
  - `piva_fornitore` in `Testata`, `Bozza`, stato iniziale e salvataggio (`PUT`);
  - `NOME_CAMPO` con `piva_fornitore`.
- `app/frontend/componenti/CampoRicerca.tsx`: prop `cerca?: { q; n }` su `Singola` (e `Comuni`): al cambio di
  `n` fa quello che fa `cercaLetto` (imposta il testo, apre il menu), senza ref imperativi.
- `app/frontend/app/stile/stile.css`: classi `.riga-letti` (+ `tipo`/`cliente`/`fornitore`), `.btn-arrow`,
  `.sopra-riga`; tolte `.somma-righe`/`.somma-riga` (non più usate), tenuta `.somma-righe-avviso`; media query
  a 768 px per il ritorno a capo ordinato. Classi nuove controllate con grep: nessun doppione.
- `app/frontend/lib/guida.ts`: «da sapere» aggiornato (pulsante › al posto di «Cerca questo», somma sopra l'Importo).
- `app/backend/src/lettura.ts`: campo letto `piva_fornitore` nello schema (`SCHEMA_DOCUMENTO`) e nel prompt.
- `app/backend/src/proposta.ts`: `piva_fornitore` in `Letto` (opzionale) e in `componiLetto`.
- `app/backend/src/documenti.ts`: `piva_fornitore` in `TESTATA_CAMPI` (salvataggio fra i campi ammessi) e nella
  testata del dettaglio. **I campi letti sono righe di `documenti_campi` (JSON), niente schema né migrazioni.**
- `app/backend/test/documenti.spec.ts`: la prova della testata ora corregge e verifica anche `piva_fornitore`.
- `strumenti/prove/app_documenti.py`: blocco «Fornitore/Cliente letto» riscritto (tre righe, due `›`, niente
  «Cerca questo», P.IVA fornitore, il › riempie la ricerca del cliente); blocco somma con `.sopra-riga`.

## Prove

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest `test/documenti.spec.ts` su `decobrands_test_dispo` (creato, migrato, poi cancellato): **62/62**.
- jest `test/lettura.spec.ts` su `decobrands_test_dispo`: **13/13**.
- `python -m py_compile strumenti/prove/app_documenti.py`: **OK** (prova browser non lanciata, come da regole).
- DB `decobrands_test_dispo` cancellato a fine prova.

## Controlli (skill caricate davvero)

- `owasp-security`: `piva_fornitore` passa dalla stessa validazione `valoreCampo(… 'testo')` di `piva_cliente`
  (V12: il server valida e scrive, il browser manda solo la scelta); il comando `cerca` è solo frontend, nessun
  dato nuovo di cui fidarsi. Niente rilievi.
- `ponytail-review`: `cerca` minimo (un contatore `n` + un effect, niente ref imperativi); `sopra` sostituisce
  `sotto` (nessun doppione); le classi `.somma-righe`/`.somma-riga` orfane sono state tolte. Niente da tagliare.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9 (Correggi i dati letti): testata su tre righe (Tipo·Numero·Data·Importo con «Somma righe» sopra
  l'Importo, allineata a destra / Cliente letto › Cliente · Codice · P.IVA / Fornitore letto › Fornitore · P.IVA
  fornitore); il pulsante › sostituisce «Cerca questo» in questa finestra (resta nei moduli Apri la pratica e
  Registra il bollettino).
- spec §6.5 (campi letti): nuovo campo letto `piva_fornitore` accanto a `piva_cliente` (schema, prompt,
  affidabilità, correzione nei campi ammessi).
- spec §16.4.1: `CampoRicerca`/`Singola` accetta il comando esterno `cerca: { q, n }`.
- spec §19: decisione nuova **D-154** «disposizione della testata di Correggi su tre righe con il pulsante ›»
  + il perché (il «Cerca questo» sotto la ricerca spariva fra i campi; la freccia fra campo letto e ricerca è
  più chiara, e la somma delle righe accanto all'importo non entrava nella riga).
- `strumenti/opencode/disposizione-testata.md` (riga 27, sezione «Fine») dice ancora «quattro righe»: vale la
  tabella a tre righe di Ugo del 13/11 (non ho toccato il file: non è fra gli ammessi).

## Aperti / da segnalare

- `piva_fornitore` **non** è usata dal riconoscimento del fornitore (`risolviFornitore` in `proposta.ts` resta
  per nome): usarla «come per il cliente» non è una riga (servirebbe il match per P.IVA con ambiguità). Da
  decidere se vale una decisione a parte.
- `proposta.spec.ts` **non rilanciato**: il blocco consultivo di prova (`test/blocco.ts`, chiave unica 424242) è
  occupato da un pacchetto parallelo dell'onda. La modifica a `proposta.ts` è additiva (`piva_fornitore`
  opzionale) e `tsc` passa; se serve, lo rilancio a fine onda quando il blocco è libero.
- La prova browser (`app_documenti.py`) va lanciata da Claude Code a fine onda: è l'unico punto non verificato
  qui (tre righe, pulsante ›, P.IVA fornitore, somma sopra l'Importo, schermata `somma-1440.png`).
