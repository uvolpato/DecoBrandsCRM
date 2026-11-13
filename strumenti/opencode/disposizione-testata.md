# Correggi i dati letti: disposizione della testata (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1**. Prima leggi `resoconto-correggi-ordine.md` e `resoconto-somma-righe.md` (stesso file, appena modificato).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_dispo` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, mai porte 8001/8002, Integra mai. Niente commit.

## Cosa vuole Ugo
Testata di *Correggi i dati letti* (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), tre righe:

| Riga | Campi, da sinistra |
|---|---|
| 1 | Tipo · Numero · Data · **Importo**, con «Somma righe X €» (spunta o avviso) **sopra** il campo, sulla riga dell etichetta, **allineata a destra** — Ugo 13/11 |
| 2 | **Cliente letto** · pulsante **›** · **Cliente** (ricerca CRM + Integra) · Codice cliente · P.IVA cliente |
| 3 | **Fornitore letto** · pulsante **›** · **Fornitore** (ricerca) · P.IVA fornitore |

- Il pulsante **›** (freccia) **sostituisce «Cerca questo»**: porta il testo del campo letto nella ricerca accanto e apre il menu (stesso comportamento di `cercaLetto` in `CampoRicerca.tsx`). Togli la riga «Letto: … · Cerca questo» sotto le ricerche **in questa finestra** (in *Apri la pratica* e *Registra il bollettino* resta com'è). `aria-label` «Cerca il cliente letto» / «Cerca il fornitore letto», `title` uguale. Si attiva anche se il letto è stato corretto a mano (usa il valore attuale del campo letto). Disattivato se il campo letto è vuoto o se la ricerca ha già un valore scelto.
- Per far partire la ricerca da fuori: `CampoRicerca`/`Singola` accetta un comando dall'esterno nel modo più semplice (es. prop `cerca?: { q: string; n: number }` che al cambio di `n` fa quello che fa `cercaLetto`). Niente ref imperativi se non serve.
- **P.IVA fornitore**: oggi `piva_fornitore` non esiste fra i campi letti (`app/backend/src/lettura.ts`). Aggiungila come campo letto della testata accanto a `piva_cliente` (stesso trattamento: nome, affidabilità, salvataggio fra i campi ammessi delle correzioni in `documenti.ts`). Il riconoscimento del fornitore (`proposta.ts`) può usarla come per il cliente, se è una riga: altrimenti scrivilo negli aperti. Niente schema né migrazioni (i campi letti sono JSON: verificalo; se serve lo schema fermati e scrivilo).
- Larghezze: griglia a colonne con campi allineati in alto, stessa altezza, niente buchi; il pulsante › è stretto (solo icona) fra i due campi. A 768 px le righe vanno a capo in modo ordinato.
- Il riepilogo dell'affidabilità sopra resta com'è (chiuso, con freccia).

## File ammessi
`VistaDocumento.tsx`, `app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/componenti/Campo.tsx`, il foglio di stile dell'app (solo classi nuove, controllate con grep), `app/backend/src/lettura.ts`, `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/test/documenti.spec.ts`, `app/backend/test/lettura*.spec.ts`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest delle suite toccate, una per volta, su `decobrands_test_dispo`.
- `py_compile` della prova (il browser lo lancia Claude Code); aggiorna i controlli che usavano «Cerca questo» in Correggi e aggiungi: quattro righe nell'ordine, pulsante › che riempie la ricerca.
- Skill da caricare davvero: `ponytail-review`, `caveman`; `owasp-security` per lettura/documenti.
- Resoconto `strumenti/opencode/resoconto-disposizione-testata.md` con «Da documentare» (§7.9, §6.5 campi letti, §19).
