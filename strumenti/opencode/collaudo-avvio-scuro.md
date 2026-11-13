# Pagina d'avvio scura con indicatore di caricamento (13/11/2026)

**Esecutore: DeepSeek Flash** · richiesta di Ugo.

Regole comuni: `regole-onda-parallela.md`: **niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto**. Lavoro piccolo: massimo 20 minuti. Resoconto breve in `strumenti/opencode/resoconto-collaudo-avvio-scuro.md`.

## Problema
Aprendo `http://localhost:8001/` la pagina è **chiara e vuota** finché il guscio non sa chi è entrato: in `app/frontend/app/(app)/layout.tsx` c'è `if (!io) return null;`. Poi passa alla scena scura dell'accesso: un lampo chiaro.

## Correzione (minima)
1. In `layout.tsx`, al posto di `return null`, la stessa scena scura già usata per l'errore A5-14 (`body:has(.accesso-scena)` rende scuro il fondo), con un indicatore che gira:
   ```tsx
   if (!io) return (
     <main className="principale">
       <div className="accesso-scena aperta">
         <div className="avvio-gira" role="status" aria-label="Caricamento" />
       </div>
     </main>
   );
   ```
2. In `app/frontend/app/stile/stile.css`, vicino alle regole `.accesso-scena` (~riga 965), controllato prima con grep che `avvio-gira` non esista:
   ```css
   /* attesa del guscio: stesso fondo scuro della scena d'accesso, un cerchio che gira */
   .avvio-gira { width: 36px; height: 36px; border-radius: 50%; border: 3px solid rgba(255,255,255,.18); border-top-color: rgba(255,255,255,.75); animation: avvio-gira .8s linear infinite; }
   @keyframes avvio-gira { to { transform: rotate(360deg); } }
   @media (prefers-reduced-motion: reduce) { .avvio-gira { animation-duration: 2.4s; } }
   ```
   Niente sotto i 150 ms? Non serve: qui il fondo scuro conta più del lampo (D-59 vale per i dati delle pagine, non per l'avvio).
3. Stessa regola CSS in `prototipo-alternativo/assets/stile.css` (i due fogli restano uguali, D-24), anche se il prototipo non la usa.

## File ammessi
`app/frontend/app/(app)/layout.tsx`, `app/frontend/app/stile/stile.css`, `prototipo-alternativo/assets/stile.css`, il resoconto.

## Fine
`npx tsc --noEmit` nel frontend. Carica davvero `caveman`.
