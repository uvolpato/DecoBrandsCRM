# Collaudo · Onda 1 · 1-23 — correzioni 1 (prove nel browser di Claude Code, 12/11/2026)

**Esecutore: DeepSeek Flash** · Gravità: **P1**: gli avvisi non si vedono più in nessuna pagina.

Prima rileggi `collaudo-1-23-avvisi-live.md` e `resoconto-collaudo-1-23.md`. Regole di lavoro: `regole-onda-parallela.md`.

## Rilievo

### C1 — La regione degli avvisi si crea all'import e React la stacca dalla pagina
- **Dove**: `app/frontend/componenti/Piccoli.tsx`, `regione()` e la riga `if (typeof document !== 'undefined' && document.body) regione();`.
- **Problema**:
  - la regione si crea quando il modulo viene caricato, prima che React agganci il `<body>` del layout;
  - durante l'aggancio React sostituisce o toglie quel nodo, ma `contenitore` resta in memoria e punta a un elemento staccato;
  - `avviso()` scrive nell'elemento staccato, quindi in pagina non compare niente;
  - le prove nel browser trovano solo un `<div hidden role="status" class="avviso">` che resta nascosto: subagenti, bollettino, profilo, liquidazioni e altre si fermano in timeout sull'avviso.
- **Correzione**, minima:
  - niente creazione all'import;
  - `regione()` riusa `contenitore` solo se `contenitore.isConnected`, altrimenti cerca `.avviso` nel documento e, se non c'è, lo crea e lo aggiunge;
  - per tenere lo scopo di A7-11 (la regione esiste già prima del primo messaggio), crea la regione vuota dopo il montaggio: un `useEffect` in un componente già montato in ogni pagina, per esempio quello del guscio che usa `Piccoli`, oppure un piccolo componente `RegioneAvvisi` esportato da `Piccoli.tsx`;
  - se per montarlo devi toccare un file non ammesso, **non toccarlo**: scrivilo nel resoconto. Basta comunque la correzione di `regione()` con `isConnected`.
- **Prova**: `npx tsc --noEmit` nel frontend; `python -m py_compile strumenti/prove/app_profilo.py`. Le prove nel browser le lancia Claude Code.

## File ammessi
- `app/frontend/componenti/Piccoli.tsx`
- `strumenti/opencode/resoconto-collaudo-1-23-correzioni-1.md`

## Fine
- `tsc` del frontend OK, resoconto breve. Carica davvero `caveman`.
