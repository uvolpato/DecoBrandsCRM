# Resoconto — Conferma sul pulsante «Abbina» nel dettaglio del documento (15/11/2026)

P2, DeepSeek Flash. Regole comuni: `regole-onda-parallela.md`.

## Cosa è stato fatto

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`: nuova finestra di riepilogo prima
  dell'abbinamento, in un punto solo (`inviaAbbina`, dove passano tutte le chiamate
  `documenti/:id/abbina` del dettaglio: candidati proposti, «Oppure abbina a un'altra pratica»,
  nota di credito con la fattura stornata). Il ritentativo multi-ordine (D-123) non richiede la
  conferma una seconda volta.
- Contenuto, con i dati veri dal server (`GET /pratiche/:id`): documento (tipo, numero, data,
  importo), pratica (numero, cliente, fornitore, numero d'ordine del fornitore), ruolo scelto per
  conferma/proforma (Parziale / Sostituisce, D-174) e suo effetto, «Confermato X di Y» e importo
  che arriva (§5.3, D-174), cambio di stato (fattura → Fatturata, conferma/proforma → Confermata),
  righe lette copiate nella pratica (D-176), controlli del confronto ancora aperti (primi 3) e
  righe incerte. Nessun calcolo nel browser: X e Y sono `progresso` del dettaglio pratica (V12).
- Pulsanti «Abbina» / «Annulla».

## Conferma semplice o con la casella

**Entrambe, in base al tipo.** Verificato che l'abbinamento si può togliere: dalla pratica il
pulsante **Annulla** (`DELETE pratiche/:id/documenti/:did`, `VistaPratica.tsx:235`) esiste solo per
**fattura e nota di credito** (poi il file torna in coda). Per ordine, conferma, proforma,
pagamento e altro c'è solo **Sposta** fra pratiche: l'abbinamento non si toglie.
Quindi: fattura e nota di credito → `Conferma` semplice; gli altri tipi → `ConfermaGrave` con la
casella da spuntare (D-172, «Ho capito: l'abbinamento non si toglie dalla pratica»).
`ConfermaGrave.tsx` non è stato toccato (non serviva un parametro nuovo).

- `app/frontend/lib/guida.ts`: «Abbina a …» aggiornato e nuova finestra «Abbinare il documento
  alla pratica» (campi, azioni, quando compare la casella).
- `strumenti/prove/app_documenti.py`: il caso D-174 (proforma → sostituisce) ora spunta la casella
  e conferma; mock di `pratiche/1` con `progresso`; controlli sul testo della finestra (ruolo,
  «2.117,30 di 2.154,50», ordine del fornitore, casella presente).

## Prove

- `npx tsc --noEmit` nel frontend: passa.
- `python -m py_compile strumenti/prove/app_documenti.py`: passa.
- Prove nel browser non lanciate (regola dell'onda: le lancia Claude Code).

## Cose aperte

1. **File non ammesso**: `strumenti/prove/app_flusso.py:246-252` clicca «Abbina a …» e aspetta che
   la finestra sparisca; ora resta la conferma. Serve una riga:
   `pg.click('.velo .modale-piede button:has-text("Abbina")')` dopo il clic sul candidato (fattura →
   conferma semplice). Non l'ho toccato perché fuori dai file ammessi.
   Idem `strumenti/prove/flusso.py:21` (prototipo, archivio).
2. `design:ux-copy` non è installata in questo host (`skill` risponde «not found»): caricati
   `ponytail-review` e `caveman`; i testi seguono quelli già in uso (guida + modali).
3. Controllo visivo a 1440/768 px non fatto (le prove le gira Claude Code): la finestra usa
   `Conferma`/`ConfermaGrave` esistenti, senza stile nuovo.

## Da documentare

- **Spec §7.9 / §16.4**: prima di abbinare dal dettaglio documento il CRM mostra la finestra di
  riepilogo (documento → pratica, ruolo D-174, «Confermato X di Y», stato che cambia, righe D-176,
  avvisi); casella da spuntare solo per i tipi che non si annullano dalla pratica.
- **§19**: nuova decisione da numerare dal lead (D-177 proposta): conferma dell'abbinamento con
  riepilogo; semplice per fattura/nota di credito (annullabili), `ConfermaGrave` per gli altri.
  Perché: l'abbinamento sposta righe e stato della pratica e prima non si vedeva cosa cambiava.
- **Guida in linea**: già aggiornata (`lib/guida.ts`).
- **Piano**: nessuna ora nuova stimata; il lavoro ricade nel collaudo del dettaglio documento.
- **Da verificare col cliente**: la frase «Confermato X di Y» per il ruolo «Sostituisce» mostra i
  valori di oggi (le conferme superate si escludono solo dopo l'abbinamento, sul server).
