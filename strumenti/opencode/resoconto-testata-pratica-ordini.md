# Resoconto — Testata della pratica: tutti gli ordini e riga a capo (15/11/2026)

Esecutore: DeepSeek Flash · Pacchetto: `strumenti/opencode/testata-pratica-ordini.md`.
Problema: la pratica OF/2026/002 ha due ordini (AU278665, AU278666) ma la testata ne mostrava uno solo,
accodato a cliente · fornitore · subagente.

## Cosa ho fatto

Solo frontend, `VistaPratica.tsx` (backend non toccato): il GET `pratiche/:id` manda già l'elenco
nella prima fase del binario, `fasi[0].numeri` (tutti i documenti d'ordine, D-90). La testata ora:

1. ricava l'elenco con `d.numero_ordine_fornitore` (se c'è) più `fasi[0].numeri`, togliendo i doppioni
   e il numero della pratica (che il server usa come ripiego quando non ci sono documenti d'ordine);
2. mostra «Ordine fornitore» al singolare, «Ordini fornitore» al plurale, ogni numero con il
   `Copiabile` già in uso (nessun componente nuovo, nessuna classe CSS nuova);
3. mette la riga cliente · fornitore · seguita da in un `div` suo, sotto: `.testa .sotto` è già un
   blocco, quindi i due `div` vanno a capo senza toccare `stile.css`.

## File toccati

- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (calcolo `ordini` e `sottotitolo`).

## Prove

- `npx --prefix app/frontend tsc --noEmit -p app/frontend/tsconfig.json`: **pulito** (0 errori).
- Backend non toccato: nessun tsc backend.
- Prove browser non lanciate (regole dell'onda): le lancia Claude Code a fine onda.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `ponytail-review`: niente da tagliare dopo lo snellimento del calcolo (una riga con `Set` + `filter`);
  nessun componente nuovo, nessuna astrazione.

## Da documentare (a cura di chi chiude l'onda)

- **spec §7.3** (dettaglio pratica): la testata mostra **tutti** gli ordini della pratica, ognuno con
  l'icona «Copia» («Ordine fornitore» se uno solo, «Ordini fornitore» se più); cliente, fornitore e
  «seguita da» stanno su una riga sotto.
- **spec §19**: decisione nuova **D-180** «testata della pratica: tutti gli ordini e riga dei soggetti a
  capo» + il perché (con più ordini la testata ne nascondeva uno e la riga unica diventava illeggibile).
  D-178 e D-179 sono già presi dai pacchetti paralleli `sconto-riga` e `importo-calcolato`.
- **guida** (`lib/guida.ts` è di un altro pacchetto in corso, non l'ho toccato): nota della pagina
  Pratica sulla testata con più ordini.

## Aperti / da segnalare

- Nessuno. Il calcolo sfrutta `fasi[0].numeri`, che è l'elenco già calcolato dal server (V12): nel
  browser si compone solo il testo.
