# Resoconto pacchetto 2-02 — Schede controllate, dettaglio documento che si azzera, testi «non riconosciuto»

Data: 13/11/2026 · Esecutore: DeepSeek V4 Flash · Gravità: P1 · Rilievi: A5-01, A5-04, A6-16, A5-10.

Esito: **4 rilievi corretti**. `npx tsc --noEmit` (frontend) 0 errori. `python -m py_compile strumenti/prove/app_documenti.py` OK. Prove nel browser **non lanciate** (regole dell'onda): le lancia il controllo di fine onda.

## Rilievi

### A5-01 — «Vedi le righe» non cambiava scheda
- `app/frontend/componenti/Schede.tsx:24-29`: aggiunto l'effetto che, quando il genitore cambia `attiva`, riporta la scheda aperta su quel valore (scheda controllata). Il primo disegno è saltato (`primo` ref) così `memoria` continua a ritrovare la scheda di prima (§7.12): senza questo, l'effetto avrebbe sovrascritto la memoria con la scheda predefinita a ogni apertura.
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx:128,272,475`: tolto il clic simulato nel DOM (`document.querySelector(...).click()`); aggiunto lo stato `scheda`, passato in `attiva` (`daVariazioni && !scheda ? 'righe' : scheda || undefined`) e in `onCambia`. Con `daVariazioni` si parte da «Righe a confronto» solo finché l'utente non cambia scheda, così «Vedi le righe» funziona anche dopo essere passati a *Riepilogo*.
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:583`: nessuna modifica necessaria al chiamante (`attiva={scheda}` già controllato); ora il componente lo segue.
- Prova `strumenti/prove/app_documenti.py:89-92`: clic su «Vedi le righe» e controllo `aria-selected=true` su `.schede-barra [role=tab]:has-text("Righe lette")`.

### A5-04 — Il dettaglio non si azzerava cambiando documento
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx:174`: `<VistaDocumento key={selezionato} … />` (l'elenco resta montato, si rimonta solo il dettaglio).
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:146`: tolto l'effetto che azzerava `d`/`errore` al cambio di `id`, ora inutile (il rimontaggio riparte da `d=null`, sagome comprese). Restano azzerati per costruzione `bollettinoId`, `scheda`, `altra`, `finestra`, `importando`.
- Prova `strumenti/prove/app_documenti.py:78-87`: sul primo documento si scrive una pratica nel campo «Oppure abbina…», si passa al secondo (scheda «azioni») e si torna al primo (campo di abbinamento vuoto, campo ancora presente).

### A6-16 — Testi «di non riconosciuto»
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:481`: con fornitore assente, «Fornitore e codice cliente non letti: correggi i dati letti oppure scegli cliente e fornitore qui sotto.» (era «…nessun cliente di non riconosciuto»).
- `VistaDocumento.tsx:521`: «Oppure abbina a un’altra pratica:» (senza «di non riconosciuto»).
- Stessa correzione, per coerenza nello stesso file (la frase compariva in altri due punti con fornitore assente): `:501` «Fornitore e codice cliente non letti: scegli la pratica a mano oppure correggi il codice.» e `:504` «Nessuna pratica aperta a cui abbinarlo.». Con il fornitore riconosciuto i testi restano identici a prima.
- `app/frontend/lib/guida.ts` **non cita** la frase «di non riconosciuto»: alla riga 163 parla di «resta “non riconosciuto”» per il riconoscimento cliente (D-91/D-124), testo diverso e non toccato. Niente da cambiare nella guida.
- Prove `app_documenti.py:93,276,279-290`: nessun «di non riconosciuto» nel corpo, avviso e riga «Oppure abbina…» corretti su una scheda simulata di ordine senza fornitore.

### A5-10 — Schede di VistaDocumento senza `memoria`
- Solo la parte di questo pacchetto: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:585`, `memoria={'documento-' + id}` (una memoria per documento, così cambiando documento non si eredita la scheda; coerente con `pratica-<id>` di `VistaPratica`). Le altre tabelle del rilievo restano ai pacchetti che le possiedono.

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` in `app/frontend` | 0 errori |
| `python -m py_compile strumenti/prove/app_documenti.py` | OK |
| `app_documenti.py` (browser) | **da lanciare a fine onda** |
| `app_pratica.py` (browser, riga 108) | **da lanciare a fine onda** (A5-01 tocca `VistaPratica`) |

Database di prova: non usato (nessuna prova di backend in questo pacchetto); niente da cancellare.
File toccati (solo ammessi): `componenti/Schede.tsx`, `app/(app)/pratiche/[id]/VistaPratica.tsx`, `app/(app)/documenti/VistaDocumenti.tsx`, `app/(app)/documenti/[id]/VistaDocumento.tsx`, `strumenti/prove/app_documenti.py`, questo resoconto. Nessun file vietato.

## Da documentare

**Registro §19 — nessuna decisione nuova.** Sono correzioni dentro decisioni esistenti (§7.12 memoria della schermata, D-94 elenco nel layout, §16.4 Schede). Se il pacchetto documentazione vuole comunque una riga di traccia, il testo pronto è:
> D-… (13/11/2026) — *Schede: `attiva` è controllata.* Il genitore può cambiare scheda (`Vedi le righe`); il componente segue il valore, il primo disegno no (così `memoria` ritrova la scheda). Il dettaglio del documento si rimonta cambiando documento (`key`), niente azzeramenti a mano. Perché: «Vedi le righe» non apriva la scheda e il dettaglio ereditava bollettino e pratica scelta dal documento prima. Chi: Ugo/DeepSeek V4 Flash. Dove: `componenti/Schede.tsx`, `documenti/VistaDocumenti.tsx`, `documenti/[id]/VistaDocumento.tsx`, `pratiche/[id]/VistaPratica.tsx`.

**Spec §16.4 (componente Schede) — riga *Perché* pronta:**
> `attiva` è la scheda richiesta dal genitore e può cambiare dopo il primo disegno: il componente la segue (§7.12). Con `memoria` il primo disegno non forza `attiva`, così tornando alla pagina si riapre la scheda di prima.

**Spec §7.9 / D-94 (pagina Documenti) — nota pronta:**
> Il dettaglio del documento si rimonta quando cambia il documento scelto (`key`); così non conserva la scheda, il bollettino registrato e la pratica scelta sul documento precedente.

**Guida (`lib/guida.ts`)**: niente da cambiare (non cita «di non riconosciuto»; il testo di D-91/D-124 è altro).

**Piano (`piano-lavoro-crm.md`)**: nessuna attività nuova, 0 ore da approvare (correzioni dentro le attività F6-A4b e F2-A3 già previste).

**README**: niente da cambiare.
