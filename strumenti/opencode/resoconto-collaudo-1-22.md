# Resoconto collaudo · Onda 1 · Pacchetto 1-22 — Prove nel browser vecchie o fragili

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Gravità: P3
Rilievi: A6-07, A6-08, A6-09, O0-B, R0-01

## Regole seguite

- Letto `strumenti/opencode/regole-onda-parallela.md` e il pacchetto per intero.
- Caricata la skill `caveman` (le altre skill non erano richieste dal pacchetto: solo prove, niente codice sensibile).
- Nessuna prova nel browser lanciata (regola del pacchetto: porte e `.next` condivisi). Solo `python -m py_compile`.
- Nessun `git` di scrittura, nessuna migrazione, nessun accesso a Integra o ai database condivisi.
- Non lanciato `graphify update` (lo fa il controllo di fine onda).
- Toccali solo i 6 file ammessi + questo resoconto.

## Rilievo per rilievo

### A6-07 / O0-B / R0-01 — Bollettini (seed cresciuto: 12 fornitori)

Il seed ha **11 fornitori nel JSON + MCL creata da `00-base.ts` (D-101) = 12**, confermato da
`app/backend/test/seed.spec.ts:27`. Non serve più la costante (prima 10, poi 11, poi 12).

- `strumenti/prove/app_bollettini.py:63-68,76-78,94-95,143`: `n_tot` letto da
  `GET /api/bollettini?al=2026-09` (`len(fornitori)`), come chiede il rilievo. La matrice, le celle
  (`n_tot * 6`), il segmento *Tutti*, il ritorno da *Da fare* e la vista di sola lettura usano `n_tot`.
  Il confronto UI ↔ API resta: se la matrice non mostra tutti i fornitori del server, la prova è KO.
- `strumenti/prove/app_flusso.py:273,291-292`: `n_bol` letto da `/api/bollettini`; attesa e controllo
  dopo *Togli tutti i filtri* usano `n_bol` (era `length === 11`, R0-01 riga 289).
- `strumenti/prove/app_flusso.py:490`: fornitori della pagina confrontati con `GET /api/fornitori`
  (prima 11 fissi; ora 12 con MCL). Stessa classe di R0-01, sarebbe fallito subito dopo la 289.
- `strumenti/prove/app_flusso.py:503`: clienti confrontati con `GET /api/clienti` (prima 11 fissi;
  ora 13 con MCL e Consorzio, `seed.spec.ts:29`). Stessa classe, stesso motivo.

Nessun numero fisso di fornitori/clienti resta in questi file (`grep` su `11`/`undici` vuoto).

### A6-08 — `app_analisi.py`, due KO che a mano non si riproducono

- `strumenti/prove/app_analisi.py:83-84`: dopo il clic su *6 mesi* si aspetta con
  `wait_for_function` che il segmento abbia `aria-selected="true"` prima di leggere l'attributo.
- `strumenti/prove/app_analisi.py:172-173`: al ritorno su Analisi (§7.12) si aspetta
  `document.querySelectorAll('.sagoma').length === 0` prima di leggere periodo e filtro (D-59).

Nessun'altra attesa cambiata. La prova va lanciata 3 volte di fila a fine onda.

### A6-09 — `app_clienti.py` (409 alla prima agenzia) e `app_subagenti.py` (attesa fissa)

- `strumenti/prove/app_clienti.py:24-27`: registrate le richieste `POST …/agenzie` con
  `pg.on('request')` (lista `post_agenzie`, listener agganciato in `entra`, riga 40).
- `strumenti/prove/app_clienti.py:116-124`: sulla prima creazione si contano i POST rispetto a
  `prima_post`; se la creazione fallisce il messaggio riporta il numero di POST, e un controllo
  esplicito segnala il doppio invio (`!= 1`) dopo che la riga compare in tabella.
- `strumenti/prove/app_subagenti.py:85`: sostituito `wait_for_timeout(800)` con
  `wait_for_function` che aspetta la sparizione di *Gasper* da `.elenco li`.

**Doppio invio:** non riprodotto (prove nel browser non lanciate). Se a fine onda il controllo
segnala più di un POST, è un bug del modulo (`Modale`, pulsante `submit` non disattivato durante
l'invio) e va aperto un pacchetto V4: qui non ho toccato il frontend, come chiede il pacchetto.

### O0-B — `app_utenti.py`, permessi evidenziati

- `strumenti/prove/app_utenti.py:57`: da `4 + 3 + 6 + 1` (14) a `4 + 4 + 6 + 1` (15), con commento
  `dati.importa` (F1-A11). Conteggio verificato sul codice: Sistema 5 righe (colonna ruolo del
  `utente`), Dati 4 (consulta, modifica, importa, condizioni), Provvigioni 6; le aree mostrate sono
  Sistema + Provvigioni + Dati (D-47), quindi 15 evidenziati.

## Prove

- `python -m py_compile` su tutti e sei i file: **OK**.
- Prove nel browser: **non lanciate** (regola del pacchetto). Da lanciare a fine onda:
  - `app_bollettini.py` — 0 KO atteso (12 fornitori, letti dall'API);
  - `app_flusso.py` — 0 KO atteso (matrice, Fornitori 12, Clienti 13);
  - `app_analisi.py` — **3 volte di fila**, 0 KO;
  - `app_clienti.py` — **5 volte di fila**, 0 KO (e nessun doppio POST);
  - `app_subagenti.py` — **5 volte di fila**, 0 KO;
  - `app_utenti.py` — 0 KO (15 evidenziati).
- `npx tsc --noEmit`: non applicabile, nessun file backend/frontend toccato.

## File toccati

- `strumenti/prove/app_bollettini.py`
- `strumenti/prove/app_flusso.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_subagenti.py`
- `strumenti/prove/app_utenti.py`
- `strumenti/opencode/resoconto-collaudo-1-22.md`

Nessun file fuori dagli ammessi. Nessun commit.

## Cose aperte

1. A6-08: se dopo le attese resta KO, è il ritorno §7.12 vero (A5-09/A5-11), non la prova.
2. A6-09: il doppio invio del modulo agenzia non è confermato; va verificato col lancio delle 5 prove.
3. Le prove non sono state eseguite qui: l'esito reale (0 KO) lo dà il controllo di fine onda.

## Da documentare

Nulla. Il pacchetto cambia solo prove nel browser, non regole, interfaccia o API: nessuna riga
D-nn del §19, nessuna riga *Perché*, nessun testo di `lib/guida.ts`, nessuna attività o ora nel
piano, nessuna modifica al README. D-101 e F1-A11 sono già documentate; qui si adeguano solo le
prove ai numeri che ne derivano.
