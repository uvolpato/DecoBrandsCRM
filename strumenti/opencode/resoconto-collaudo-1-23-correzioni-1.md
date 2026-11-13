# Resoconto collaudo · Onda 1 · Pacchetto 1-23 correzioni 1

Data: 12/11/2026 · Esecutore: DeepSeek Flash · Rilievo: C1 (P1) · Esito: **corretto** (con un passo rimandato, vedi sotto).

## Cosa ho fatto

### C1 — la regione degli avvisi si stacca dalla pagina

File: `app/frontend/componenti/Piccoli.tsx` (righe 20-36). Nessun altro file toccato.

- Tolta la creazione all'import (`if (typeof document !== 'undefined' && document.body) regione();`):
  era quella che creava il nodo prima che React agganciasse il `<body>`, poi React lo staccava.
- `regione()` ora:
  - riusa `contenitore` solo se `contenitore.isConnected`;
  - altrimenti cerca `.avviso` nel documento (`document.querySelector`);
  - se non c'è, lo crea (vuoto, `hidden`, `role="status"`) e lo aggiunge a `body`.
- `avviso()` non cambia: riusa la regione, azzera il testo, imposta `role=alert` se `errore`,
  mostra il messaggio, e alla scadenza svuota e nasconde (8 s errori, 4,2 s gli altri).
- Commento aggiornato su `regione()` con il rimando ad A7-11.

### Passo non fatto: regione vuota già al montaggio

Il pacchetto chiede un `useEffect` in un componente montato in ogni pagina (il guscio). Il guscio è
`app/frontend/app/(app)/layout.tsx`, **non ammesso** in questo pacchetto (e `app/frontend/app/layout.tsx`
è fra i vietati). Per la regola del pacchetto («se per montarlo devi toccare un file non ammesso, non
toccarlo: basta comunque la correzione di `regione()` con `isConnected`») mi sono fermato qui.

Conseguenza: la regione nasce al **primo** `avviso()` della pagina, non al montaggio. Il difetto P1 è
risolto (i messaggi si vedono e si riusano), ma il primo messaggio di una pagina appena caricata può
ancora non essere annunciato da alcuni lettori di schermo (A7-11). Rimedio consigliato al controllo di
fine onda o a un pacchetto con quel file ammesso: esportare da `Piccoli.tsx` un componente vuoto

```tsx
/** A7-11: monta la regione «live» vuota prima del primo messaggio (si mette nel guscio). */
export function RegioneAvvisi() {
  useEffect(() => { regione(); }, []);
  return null;
}
```

e renderizzarlo in `app/frontend/app/(app)/layout.tsx` dentro il guscio (`<Barra />` accanto).

## Prove

| Prova | Esito |
|---|---|
| `cd app/frontend && npx tsc --noEmit` | **0 errori** |
| `python -m py_compile strumenti/prove/app_profilo.py` | **OK** |
| `git status --short` | il mio diff è solo `app/frontend/componenti/Piccoli.tsx` + questo resoconto; il resto è dei pacchetti in parallelo |

Prove nel browser da lanciare a fine onda: `app_profilo.py` (indicata nel pacchetto), più
`app_liquidazioni.py`, `app_componenti.py` e tutte quelle che usano `.avviso`
(`app_bollettini.py`, `app_bollettino.py`, `app_documenti.py`, `app_eventi.py`, `app_flusso.py`,
`app_oggi.py`, `app_subagenti.py`, `app_utenti.py`). I selettori non cambiano: `.avviso` resta vuoto
e `hidden` finché non c'è un messaggio, quindi `wait_for_selector('.avviso')` (visible) aspetta il
messaggio vero.

## Da documentare

### §19 — riga `D-nn` da unire alla decisione A7-11 già registrata dal pacchetto 1-23

Nessuna regola nuova: si corregge l'implementazione, la decisione resta quella dell'A7-11. Se il
documentatore vuole annotare il perché tecnico, basta aggiungere alla riga esistente:

> La regione si riusa solo se è ancora nel documento (`isConnected`), altrimenti si ricrea: creata
> all'import, React la stacca dal `<body>` e i messaggi finiscono in un nodo invisibile (C1, P1).

### §16.4 — riga *Perché* dell'*Avviso*

Nessun cambiamento di testo: la riga esistente («una regione live creata insieme al testo non viene
annunciata») resta valida.

### Guida (`app/frontend/lib/guida.ts`), piano, README

Nulla: comportamento visibile invariato, nessuna ora, rientra nel collaudo dell'onda 1.

## Cose aperte

- Regione vuota al montaggio: richiede `app/frontend/app/(app)/layout.tsx` (non ammesso). Snippet
  pronto sopra.
- Prova Playwright `role=alert` dopo un rifiuto: resta da agganciare a un percorso dell'interfaccia
  (come già scritto nel resoconto 1-23); le prove nel browser non le ho lanciate.
