# Prompt per OpenCode — ritocchi del campo di ricerca (stile comune)

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. Lavoro da Sonnet: una sola
sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `ui-ux-pro-max`, `webapp-testing` e
`playwright-best-practices`. Per orientarti usa `graphify query "<domanda>"` prima di cercare nei
file.

Ci sono due difetti di stile del campo di ricerca (`app/frontend/componenti/CampoRicerca.tsx`).
Valgono per tutte le pagine, quindi si correggono **solo** in `app/frontend/app/stile/stile.css`
e, uguale, in `prototipo-alternativo/assets/stile.css`: i due file devono restare identici
(`diff` vuoto).

## 1. Nella maschera di ricerca la lente sta sotto il testo

**Dove si vede:** in una finestra (es. scheda del subagente → campo *Agente*; agenzia del cliente
→ *Fornitore*), con la lente si apre la maschera *Cerca agente*. Nella casella *Cerca* della
maschera il testo comincia sopra l'icona della lente.

**Causa:** la maschera è dentro il `.campo` della finestra, quindi la regola
`.campo input { padding: 7px 10px; … }` (circa riga 226) batte `.cerca input { padding: 7px 12px
7px 34px }` (circa riga 178) e toglie lo spazio a sinistra.

**Correzione minima:**
- rendi la regola della casella *Cerca* più forte, per esempio `.cerca input, .campo .cerca input
  { … }`, oppure solo `padding-left`;
- niente `!important`;
- non cambiare il markup.

Controlla che la casella *Cerca* della FilterBar nelle pagine (fuori dalle finestre) resti uguale.

## 2. Tasto lente: alto quanto il campo, quadrato, lente al centro

**Ora:** `.ricerca-lente` (circa riga 508) è fisso a 30 × 30 px, mentre il campo accanto
(`.campo-ricerca .ricerca-testo`, circa riga 856) è alto circa 36 px.

**Vuoi:**
- il tasto **alto quanto il campo**, in ogni posto in cui compare (finestre, FilterBar, catalogo
  `/componenti`);
- **quadrato** (larghezza = altezza);
- icona **centrata**.

Strada consigliata:
- il contenitore riga del campo con `align-items: stretch`;
- il tasto con `align-self: stretch; aspect-ratio: 1; height: auto; width: auto`;
- `display: grid; place-items: center` (c'è già).

Senza numeri fissi, così segue l'altezza del campo anche dove il campo è più basso. Prima di
cambiare, guarda come è fatto il markup del campo singolo e di quello multiplo in
`CampoRicerca.tsx`, e cerca in `stile.css` le classi che usa: non creare classi nuove se non
serve.

## Prove

1. `npx tsc --noEmit` e `npm run build` in `app/frontend`.
2. Avvio dell'app (non usare le porte 8001/8002 né il database `decobrands_db`):
   - backend: in `app/backend`, `npm run build`, poi `node dist/src/main.js` con `DATABASE_URL`
     = quella del `.env` con `decobrands_db` → `decobrands_test_f1a1`, `PORT=8012`,
     `TENTATIVI_IP=1000` e `TENTATIVI=1000`;
   - frontend: in `app/frontend`, `BACKEND_URL=http://127.0.0.1:8012`, `npm run build`, poi
     `node node_modules/next/dist/bin/next start -p 8011 -H 127.0.0.1`;
   - utente amministratore `f1-ammi`, password `password-di-prova`.
3. Aggiungi a `strumenti/prove/app_componenti.py` (o in una prova nuova
   `strumenti/prove/app_campo_ricerca.py`) i controlli con `boundingBox` e stile calcolato:
   - nella maschera aperta da una finestra (Subagenti → modifica → lente *Agente*), il
     `padding-left` della casella *Cerca* è ≥ larghezza dell'icona + 8 px;
   - in almeno tre posti (finestra del subagente, finestra dell'agenzia, FilterBar dei Clienti),
     l'altezza del tasto lente è uguale a quella del campo (±1 px) e larghezza = altezza (±1 px);
   - il centro dell'icona coincide con il centro del tasto (±1 px).

   Lanciala con 0 KO.
4. Schermate a 1440 e 768 px dei tre posti e della maschera, in `%TEMP%\campo-ricerca`:
   **guardale**.
5. Chiudi i processi su 8011 e 8012.

Niente commit, niente push, niente `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-ritocchi-campo-ricerca.md`:
- le regole CSS cambiate, prima e dopo;
- l'esito delle prove (OK/KO);
- il percorso delle schermate;
- i dubbi.
