# Resoconto collaudo · Onda 1 · Pacchetto 1-23 — Avvisi live e errori come `alert`

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievo: A7-11 (P3) · Esito: **corretto**.

## Cosa ho fatto

### A7-11 — la regione «live» nasce prima del messaggio; gli errori sono `alert`

File: `app/frontend/componenti/Piccoli.tsx` (righe 20-47). Nessun altro file toccato.

- Il contenitore `.avviso` si crea **una volta sola**, all'avvio del modulo nel browser
  (`if (typeof document !== 'undefined' && document.body) regione()`), vuoto e nascosto
  (`hidden = true`). La funzione `avviso()` non lo elimina più: azzera il testo, imposta il
  ruolo, scrive il messaggio e lo mostra, poi lo svuota e lo nasconde alla scadenza.
- Ruolo: `alert` quando `errore`, altrimenti `status` (prima era sempre `status`).
- Durata: **8 s** per gli errori, 4,2 s per gli altri (prima 4,2 s per tutti).
- «Nascosto» con l'attributo `hidden` (equivalente a `display: none`) invece di una classe in
  `stile.css`: quel file è fra i **vietati** (lo toccano altri pacchetti della stessa onda).
  `hidden` funziona perché `.avviso` non imposta `display`; nessuna modifica al CSS.
- Effetto sulle prove esistenti: `.avviso` resta vuoto e non visibile finché non c'è un
  messaggio, quindi `pg.wait_for_selector('.avviso')` (stato *visible*) continua ad aspettare
  il messaggio vero e non scatta a vuoto; i selettori `.avviso:has-text(...)` non cambiano.

## Prove

| Prova | Esito |
|---|---|
| `cd app/frontend && npx tsc --noEmit` | **0 errori** |
| `python -m py_compile strumenti/prove/app_liquidazioni.py strumenti/prove/app_componenti.py` | **OK** (file non modificati: vedi sotto) |
| `git diff --name-only` / `git status --short` | il mio diff è solo `app/frontend/componenti/Piccoli.tsx` + questo resoconto; gli altri file modificati sono dei pacchetti in parallelo |

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_liquidazioni.py` e `strumenti/prove/app_componenti.py` (indicate nel
  pacchetto), più `app_bollettini.py`, `app_bollettino.py`, `app_documenti.py`,
  `app_eventi.py`, `app_flusso.py`, `app_oggi.py`, `app_pratica.py`, `app_impostazioni.py`,
  `app_f7_ritocchi.py`: usano `.avviso` e restano valide (vedi sopra).
- **Non ho potuto aggiornare i test**: `app_componenti.py` è fra i **vietati** e
  `app_liquidazioni.py` non è fra gli ammessi. Le righe da aggiungere (in `app_componenti.py`,
  dopo il caricamento del catalogo, o in `app_liquidazioni.py` sul percorso che produce un
  avviso rosso) sono queste:

```python
# A7-11: la regione live esiste vuota prima del messaggio e si riusa (un solo contenitore)
vuota = pg.evaluate("() => { const a = document.querySelector('.avviso'); return !!a && a.hidden && a.textContent === ''; }")
ok(vuota, 'A7-11: regione live presente e vuota prima del messaggio')
pg.click('button:has-text("Operazione completata")')  # demo *Avviso* del catalogo
pg.wait_for_selector('.avviso[role=status]:has-text("Operazione completata")')
ok(pg.evaluate("() => document.querySelectorAll('.avviso').length === 1"), 'A7-11: un solo contenitore, riusato')

# A7-11: dopo un rifiuto del server l'avviso è alert e contiene il testo
pg.wait_for_selector('.avviso[role=alert]')
ok(len(pg.locator('.avviso[role=alert]').inner_text().strip()) > 0, 'A7-11: avviso d’errore come role=alert')
```

  La seconda parte ha bisogno di un percorso **dell'interfaccia** che produca un avviso rosso:
  oggi nessuna prova esistente lo fa (in `app_liquidazioni.py` il rifiuto 409 si chiama via
  `chiama()`, senza passare dai pulsanti). Il verificatore di fine onda può agganciarla al
  percorso che preferisce fra quelli reali (es. errore di salvataggio in `VistaDocumento`).

## Da documentare

### §19 — nuova riga `D-nn` (primo numero libero, i pacchetti in parallelo possono aver preso il successivo)

| D-nn | 12/11/2026 | **Gli avvisi hanno una sola regione live, creata all'avvio e lasciata vuota; gli errori sono `alert`.** Il contenitore `.avviso` si crea una volta sola all'avvio (vuoto e nascosto), non a ogni messaggio: `avviso()` azzera il testo, imposta il ruolo, scrive il messaggio e lo mostra; alla scadenza svuota e nasconde, non elimina. Con `errore` il ruolo è `alert` e dura 8 s; altrimenti `status` e 4,2 s. | Una regione live creata insieme al testo spesso non viene annunciata (NVDA): l'utente credeva che un'operazione rifiutata fosse andata a buon fine. Gli errori del server, annunciati come `status`, arrivavano con tono cortese e non venivano riconosciuti come problemi (A7-11). | Ugo (collaudo onda 1) | §16.4; `componenti/Piccoli.tsx` |

### §16.4 Componenti standard — nuova riga in tabella e riga *Perché*

Riga di tabella:

| **Avviso** | messaggio temporaneo in basso a destra (conferme e rifiuti del server) | testo, `errore`: rosso con `role="alert"` e 8 s; senza `errore` verde con `role="status"` e 4,2 s. Una sola regione live, creata all'avvio e svuotata alla scadenza (non eliminata): una regione live creata insieme al testo non viene annunciata dai lettori di schermo (A7-11) |

Riga *Perché* (sotto la tabella, accanto alle altre note di comportamento fisso):

> *Perché* l'avviso è una regione live permanente: i lettori di schermo annunciano solo le
> modifiche di una regione già presente nel documento. Creata insieme al messaggio, spesso non
> si sente nulla; e un errore del server deve arrivare come `alert`, non come cortese `status`
> (A7-11, D-nn).

### Guida (`app/frontend/lib/guida.ts`)

Nulla: il comportamento non cambia per chi vede la schermata (posizione, colore e testo degli
avvisi restano quelli). Nessuna voce nuova.

### Piano (`piano-lavoro-crm.md`)

Nessuna attività nuova e **nessuna ora**: rientra nel collaudo dell'onda 1 (P3).

### README (`app/README.md`)

Nulla.

## Cose aperte

- La prova Playwright per `role=alert` richiede un percorso dell'interfaccia che produca un
  avviso rosso: nessuno dei test attuali lo attraversa. Lasciata al controllo di fine onda
  (snippet sopra); il codice è corretto e verificato dal tipo e dalla lettura.
- Nessuna modifica a `stile.css` (vietato): la regola «nascosto quando è vuoto» è l'attributo
  `hidden`, non una classe.
