# Disposizione testata — correzioni 1 (13/11/2026)

**Esecutore: DeepSeek Flash.** Prima leggi `disposizione-testata.md` e `resoconto-disposizione-testata.md`. Regole: `regole-onda-parallela.md`; **niente `cd`, `/tmp`, `&`, `.env`**; mai 8001/8002, `decobrands_db`, Integra. Niente commit.

Schermate attuali: `strumenti/collaudo/e2e/uscita/correggi-1440.png` e `correggi-768.png` (guardale). Difetti:
1. **«Somma righe 250,00 €» tagliata a destra** (a 1440 e a 768 il «€» esce dal riquadro). Deve stare tutta dentro la colonna dell'Importo: etichetta «Importo» a sinistra, «✓ Somma righe 250,00 €» a destra sulla stessa riga, testo piccolo; se non ci sta, va a capo sotto l'etichetta, mai fuori.
2. **Etichette e campi non allineati**: nella riga 1 «Tipo» è più in basso di «Numero» e «Data»; nella riga 2 «Cliente» è più in alto di «Cliente letto»; il pulsante **›** è più basso e più piccolo dei campi. Tutte le etichette di una riga sulla stessa linea, tutti i campi (input, select, ricerca, ›, lente) della stessa altezza e sulla stessa linea. Il pallino di stato della ricerca non deve spostare l'etichetta.
3. **Larghezze**: a 1440 la riga 3 ha il campo Fornitore più stretto di Cliente e buchi fra le colonne. Usa una griglia comune alle righe 2 e 3 con le stesse colonne (letto · › · ricerca · altri), così Cliente e Fornitore hanno la stessa larghezza e sono uno sopra l'altro. Riga 3 senza codice: la P.IVA fornitore sta nella colonna della P.IVA cliente (colonna del codice vuota).
4. **768 px**: la spunta accanto a Importo esce a destra; riga 2 e 3 vanno a capo in modo ordinato (letto + › + ricerca su una riga, codice e P.IVA sotto), niente campi tagliati.

## File ammessi
`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, il foglio di stile dell'app (classi di questa testata, controlla con grep che non esistano), `app/frontend/componenti/CampoRicerca.tsx` solo se serve per il pallino, `strumenti/prove/app_documenti.py`, il resoconto `resoconto-disposizione-testata-correzioni-1.md`.

## Fine
- `npx tsc --noEmit` nel frontend.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti` (timeout 10 min), 0 KO; rifai le due schermate e **guardale** prima di chiudere. Aggiungi un controllo: stessa `top` (±2 px) per i campi di ogni riga e «Somma righe» dentro il riquadro della testata.
- Carica davvero `ponytail-review` e `caveman`.
