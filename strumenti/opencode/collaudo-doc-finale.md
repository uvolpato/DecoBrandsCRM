# Collaudo · documentazione dell'onda 2 e dei pacchetti 3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01 (13/11/2026)

**Esecutore: DeepSeek Flash** · Gravità P3.

Regole comuni: `regole-onda-parallela.md`: **niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto**. Scrivi **subito** `strumenti/opencode/resoconto-collaudo-doc-finale.md` e aggiornalo strada facendo.

Segui `strumenti/opencode/collaudo-2-doc-documentazione.md` (contesto, regole, formato del §19, file ammessi, prove), con queste differenze:
- **Resoconti da raccogliere**: tutti i `resoconto-collaudo-2-*.md` (anche `2-fine-correzioni-1/2`), più `resoconto-collaudo-3-01.md`, `3-07`, `3-09`, `5-01`, `5-04`, `5-05`, `6-01` e `resoconto-collaudo-finale-correzioni-1.md` se c'è. Applica ogni «Da documentare».
- **Numeri del §19**: l'ultima riga è D-149. I resoconti usano i numeri già assegnati nel piano (D-115, D-118, D-119, D-121, D-122, D-123, D-125, D-126): controlla con grep che non esistano già come riga `| D-nn |` e aggiungili **nel loro ordine numerico** (fra D-114 e D-131 dove già ci sono righe vicine). Se un resoconto propone un numero già usato, prendi D-150, D-151 … e scrivilo nel resoconto, allineando anche il commento nel codice (`// D-nn §19`, solo quel numero).
- **3-doc, 5-doc, 6-doc**: le parti di quei prompt che riguardano i soli pacchetti sopra valgono anche qui; gli altri pacchetti delle onde 3–8 **non sono stati fatti**: non documentarli.
- **Piano**: in `strumenti/collaudo/piano-correzioni.md` non toccare nulla (lo aggiorna Claude Code).
- Versione della spec: 8.79 → **8.80**, riassunto in testa.
- File ammessi in più: i commenti `// D-nn` nel codice solo per allineare un numero.

## Fine
`python3 strumenti/genera-pagine-doc.py`; `npx tsc --noEmit` in `app/frontend` (se tocchi `guida.ts`); controllo delle 6 celle del §19. Carica davvero `caveman`.

## Decisione di Ugo (13/11/2026) da registrare
- **Nota di credito sul maturato di una fattura già liquidata in un trimestre chiuso**: la provvigione tolta va nella **liquidazione successiva** (trimestre dopo per il subagente, mese dopo per Decobrands), come voce negativa, come lo storno sul fatturato (D-11). Il trimestre chiuso non si riapre e la sua fotografia resta (D-33). Riga nuova nel §19 (numero libero dopo l'ultimo), *Perché*: una sola regola per gli storni, nessun trimestre riaperto; Chi: «Ugo (collaudo 13/11/2026)»; Dove: §5.14, `motore.ts`. Riga *Perché* nella §5.14 e frase nella guida (Liquidazioni, «da sapere»).
- **Attenzione**: le correzioni finali hanno messo nel codice il commento `D-127` per questa regola, ma D-127 è già il blocco sotto i 744 px. Dai alla regola il primo numero libero dopo l'ultimo del §19 e correggi i commenti `D-127` che parlano della nota di credito in `app/backend/src/motore/motore.ts`, `prototipo-alternativo/assets/motore.js` e nelle prove (`grep -rn "D-127"`), lasciando quelli dello schermo stretto.
