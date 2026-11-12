# Collaudo · Onda 0 bis · 0b-03 — correzioni 1 (dalle prove nel browser di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 Flash** · Gravità: **P3** · Solo una prova nel browser, nessun codice dell'app.

Regole di lavoro: `regole-onda-parallela.md`.

## Rilievo

### C1 — `app_documenti.py` non sceglie il subagente nella finestra «Configura l'agenzia»
- **Dove**: `strumenti/prove/app_documenti.py` ~139-144 (documento senza agenzia → «Configura l'agenzia» → «Crea»).
- **Problema**: con D-134 (pacchetto 0b-03) `FormAgenzia` non precompila più il subagente con il primo dell'elenco: se lo storico non lo propone, il campo resta vuoto e lo sceglie l'operatore. La prova clicca «Crea» senza sceglierlo: la finestra risponde «Subagente obbligatorio», l'avviso «Agenzia creata» non arriva e la prova si ferma in timeout dopo 30 s.
- **Correzione**:
  - Prima di «Crea» scegli un subagente dal campo di ricerca, come fa `app_clienti.py:105` con il suo aiuto `scegli(pg, 'subagente_id', 'Nis')`. Se `app_documenti.py` non ha `scegli`, copialo da `app_clienti.py` (stesse righe, nessuna modifica).
  - Aggiungi un controllo: prima della scelta il campo del subagente è **vuoto** (D-134: mai il primo dell'elenco).
- **Prova**: `python -m py_compile strumenti/prove/app_documenti.py`. Non lanciare la prova nel browser: la lancia Claude Code.

## File ammessi
- `strumenti/prove/app_documenti.py`
- `strumenti/opencode/resoconto-collaudo-0b-03-correzioni-1.md`

## Fine
- `py_compile` OK.
- Resoconto breve.
- Carica davvero `caveman`.
