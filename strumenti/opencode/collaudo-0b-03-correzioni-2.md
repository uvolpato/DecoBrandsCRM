# Collaudo · Onda 0 bis · 0b-03 — correzioni 2 (prove nel browser di Claude Code, 12/11/2026)

**Esecutore: DeepSeek Flash** · Gravità: **P3** · Solo una prova nel browser, nessun codice dell'app.

Regole di lavoro: `regole-onda-parallela.md`.

## Rilievo

### C1 — `app_documenti.py` conta le letture della scheda come se fossero esatte
- **Dove**: `strumenti/prove/app_documenti.py`, blocco D-133 (import del fornitore dal documento simulato), controllo `visti['dettaglio'] == 2 and visti['put'] == 0` con il testo «dopo l'import la scheda si ricarica, senza PUT».
- **Problema**: in `next dev` React (Strict Mode) monta due volte gli effetti, quindi all'apertura la scheda si legge 1 o 2 volte. La prova ha visto 3 letture e dà KO, anche se l'app è corretta: `VistaDocumento.importaFornitore` ricarica una volta sola, e solo se l'import riesce.
- **Correzione**:
  - Salva `prima = visti['dettaglio']` subito prima del clic su «Importa da Integra» che riesce.
  - Dopo l'avviso «Fornitore importato da Integra» controlla `visti['dettaglio'] == prima + 1 and visti['put'] == 0`.
  - Dopo l'import non riuscito (`abort`) aggiungi il controllo che le letture **non** aumentano, cioè nessuna ricarica quando l'import fallisce.
- **Prova**: `python -m py_compile strumenti/prove/app_documenti.py`. La prova nel browser la lancia Claude Code.

## File ammessi
- `strumenti/prove/app_documenti.py`
- `strumenti/opencode/resoconto-collaudo-0b-03-correzioni-2.md`

## Fine
- `py_compile` OK, resoconto breve. Carica davvero `caveman`.
