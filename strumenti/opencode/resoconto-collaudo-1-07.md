# Resoconto collaudo · Onda 1 · Pacchetto 1-07 — Blocco sotto i 744 px (D-44, D-127)

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: **A5-03**, **A6-01** (stessa correzione).

## Esito

Entrambi i rilievi **corretti**. Nessun file fuori dagli ammessi toccato, nessun commit.

## Cosa ho fatto

### A5-03 e A6-01 — blocco sotto i 744 px (V6, §16.6, D-44, D-127)

Implementata una sola volta la regola letta nei due rilievi (stesso difetto), come da *Correzione
puntuale*:

- `app/frontend/app/layout.tsx:14-25`: dentro `<body>` un `<div className="schermo-stretto">` con il
  logo (`/logo-decobrands.png`, stesso del prototipo) e il testo della spec §16.6 («Il Sistema
  Informativo Aziendale si usa da computer o tablet. Apri questa pagina da uno schermo più grande, o
  allarga la finestra.»), poi `{children}` avvolto in `<div className="app-tutta">`. Nessun
  `matchMedia`, nessuna logica: solo markup, il resto è CSS.
- `app/frontend/app/stile/stile.css:1044-1059` (copia) e `prototipo-alternativo/assets/stile.css:1043-1058`
  (sorgente, D-24): `.app-tutta { display: contents }` (il guscio resta trasparente alla griglia del
  body, così barra e area principale non cambiano), `.schermo-stretto { display: none }` e
  `@media (max-width: 743px)` che porta il body a una colonna, nasconde `.app-tutta` e mostra il
  blocco scuro con logo e testo (stile da `.accesso`). Solo larghezza CSS della finestra: nessuna
  lettura dello user agent, quindi vale anche per una finestra stretta. È l'eccezione voluta a
  WCAG 1.4.10 decisa con U17/D-127 (blocco anche con lo zoom).
- `prototipo-alternativo/index.html:13-21`: lo stesso blocco e lo stesso avvolgimento
  (`.schermo-stretto` + `.app-tutta` intorno a `#barra` e `#principale`), così il prototipo ufficiale
  si comporta uguale (D-24).
- `strumenti/prove/app_guscio.py:92-117`: prove del blocco. A 768 px l'app resta com'era e il testo
  del blocco non è visibile; a 743 px (dopo l'accesso) il blocco compare e `.barra`/`.principale`
  sono nascosti; a 744 px l'app torna; a 743 px prima dell'accesso (`/accesso`) c'è il blocco e non
  barra né finestra; a 700 px c'è il blocco e nessun `.principale`.

Nomi delle classi controllati prima con `grep` su tutti e due gli `stile.css`: `.schermo-stretto` e
`.app-tutta` non esistevano.

## Prove eseguite

- `cd app/frontend && npx tsc --noEmit` → **0 errori**.
- `python -m py_compile strumenti/prove/app_guscio.py` → **OK** (sintassi).
- Controllo visivo sul prototipo ufficiale (Playwright, `file://`), schermate in
  `%TEMP%\opencode\schermo-1440.png`, `schermo-768.png`, `schermo-700.png`, `accesso-700.png`:
  - 1440 px: app identica a prima (barra 240 px + Pratiche), testo del blocco assente;
  - 768 px: app visibile, testo del blocco assente;
  - 700 px lettura: pagina scura centrata con logo bianco e testo, barra e `.principale` assenti;
  - 700 px accesso: il blocco prevale sulla scena d'accesso.
- `git status --short` / `git diff --name-only`: fra i miei file ho toccato solo
  `app/frontend/app/layout.tsx`, `app/frontend/app/stile/stile.css`,
  `prototipo-alternativo/assets/stile.css`, `prototipo-alternativo/index.html`,
  `strumenti/prove/app_guscio.py` e questo resoconto. Gli altri file che risultano modificati o non
  tracciati sono lavoro di altri pacchetti in parallelo: **non li ho toccati**.

## Prove nel browser da lanciare a fine onda

Con backend (8002) e frontend (8001) accesi e gli utenti di prova:

- `python strumenti/prove/app_guscio.py <suffisso> <cartella schermate>` — nuova sezione schermo
  stretto (700/743/744/768 px) oltre alle prove esistenti;
- `python strumenti/prove/app_f7_collaudo.py <suffisso> <cartella schermate>` — verifica che a 768 px
  non sia cambiato nulla (atteso: uguale).

## Cose aperte

- Nessuna correzione contro il §19; D-127 applicata come scritta.
- Il blocco è sulla larghezza della finestra: lo zoom al 200 % su 1440 px (finestra logica ~720 px)
  mostra il blocco, come deciso (U17/D-127). Da non «semplificare» con `matchMedia` o con lo user
  agent.

## Da documentare (per il pacchetto documentazione dell'onda)

### §19 — riga D-127

| D-127 | 08/11/2026 | Il blocco sotto i 744 px vale sulla **larghezza della finestra**, anche con lo zoom: `@media (max-width: 743px)`; chi ingrandisce al 200 % su uno schermo da 1440 px vede la pagina «Il Sistema Informativo Aziendale si usa da computer o tablet». Eccezione **voluta** a WCAG 1.4.10. Precisa D-44. | coerenza con D-44 (controllo sulla larghezza CSS, non sul tipo di dispositivo): chi usa lo zoom non deve ritrovarsi l'app tagliata; fermare a monte è meglio che mostrare schermate illeggibili | Ugo | V6, §16.6, CLAUDE.md regola 5 |

### Spec §16.6 — riga *Perché*

Aggiungere dopo il *Perché (D-44)*: «*Perché (D-127):* il blocco guarda la larghezza della
finestra, quindi vale anche con lo zoom; è un'eccezione voluta a WCAG 1.4.10, perché l'alternativa
sarebbe un'app che si può ingrandire ma non si può usare.»

### Guida in linea (`app/frontend/lib/guida.ts`, argomento `accesso`, voci `sapere`)

«Il CRM è per computer e tablet. Sotto i 744 px di larghezza la pagina si ferma, anche prima
dell'accesso, e chiede uno schermo più grande (vale anche ingrandendo con lo zoom).» Stesso testo in
`prototipo-alternativo/assets/guida.js` (argomento `accesso`, `sapere`).

### Piano (`piano-lavoro-crm.md`, §12 riga 128)

La voce «blocco sotto i 744 px» (0,5 h, *da approvare*) è **svolta nel pacchetto 1-07**: 0,5 h da
approvare, fatte (layout + CSS + prova `app_guscio.py`).

### README

`app/README.md` non ha una sezione su schermi e misure: **nessuna modifica necessaria** (la regola
sta in spec V6/§16.6). `prototipo-alternativo/LEGGIMI.md`: aggiungere una riga fra le regole del
prototipo — «Sotto i 744 px di larghezza il prototipo si ferma con la pagina scura *computer o
tablet* (V6, §16.6, D-44, D-127).»
