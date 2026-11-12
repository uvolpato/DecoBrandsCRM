# Resoconto · Collaudo 0b-03 — correzioni 2

Esecutore: DeepSeek Flash · 12/11/2026

## Rilievo corretto

### C1 — `app_documenti.py` conta le letture della scheda come se fossero esatte
- Prima del clic su «Importa da Integra» (import riuscito) salvo `prima = visti['dettaglio']`.
- Dopo l'avviso «Fornitore importato da Integra» controllo `visti['dettaglio'] == prima + 1 and visti['put'] == 0`.
- Dopo l'import non riuscito (`abort`) salvo `prima` prima del clic e controllo `visti['dettaglio'] == prima`: nessuna ricarica quando l'import fallisce.

## Prove
- `python -m py_compile strumenti/prove/app_documenti.py` → OK.
- Prova nel browser non lanciata: la lancia Claude Code a fine onda.

## Da documentare
Nessuna modifica all'app, alla spec o al piano: solo la prova. Niente da registrare in §19.
