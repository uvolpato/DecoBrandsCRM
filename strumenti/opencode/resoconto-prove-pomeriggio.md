# Resoconto prove nel browser dopo i pacchetti del pomeriggio (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Pacchetto: `strumenti/opencode/prove-pomeriggio.md`

## Stato

Finito. Le 4 prove KO del giro di Claude Code sono spiegate e risolte; giro completo a 0 KO.

## KO del giro di Claude Code — causa e correzione

1. **`app_documenti` riga 135** — causa **(b, prova superata)**: il livello dopo la correzione è
   giusto (`bassa`), non è un errore dell'app. `campi-euro` ha cambiato il prezzo/importo della riga
   aggiunta da `10` a `10.5` ma ha lasciato l'importo totale a `260`: totale `260` ≠ somma righe
   `260,50` → controllo grave «Totale diverso dalla somma» → livello `bassa`. In più `fill` su
   `CampoEuro` precompilato accodava invece di sostituire (valore salvato `250260,50`). Correzione
   nella prova: importo → `260.5` (totale = somma) e campo svuotato prima di scrivere.
2. **`app_flusso` riga 234** — causa **(b)**: il visore ora disegna tutte le pagine in modo
   asincrono (PDF.js). `== 1` → `>= 1` + `wait_for_selector('.aff-sx canvas')`.
3. **`app_bollettino` riga 72** — causa **(c, ordine)**: passa da sola (43/0). Nel giro completo
   `app_flusso` (prima di `app_bollettino`) chiude Gasper agosto (id 6) e la riga `F-2026-0933` non
   ha più «Attendi il prossimo». `app_flusso` è già scritto per saltare la verifica se un'altra prova
   l'ha già chiusa → **ordine corretto: `app_bollettino` prima di `app_flusso`**.
4. **`app_clienti` riga 89** — causa **(c, transitorio)**: passa da sola (46/0) e nel giro completo
   (46/0); il «Togli tutti i filtri» non era un errore vero (lente/FilterBar/riepilogo). Nessuna
   correzione.

### Altre correzioni a prove scritte ma mai lanciate (pacchetti del pomeriggio)

- **`app_documenti` «campo in euro»**: `euro()` usa lo spazio unificatore (`\u00a0`), il confronto
  con `'10,50 €'` (spazio normale) non passava → `.replace('\u00a0', ' ')`.
- **`app_documenti` D-152**: `button:has-text("Scegli")` prendeva 4 elementi (anche «Fornitore da
  scegliere» della scheda e «Nessuno di questi: scegli a mano») e il `.first` era la scheda, non il
  candidato → selettore preciso `button[aria-label^="Scegli "]` (2 candidati); il clic ora chiama la
  rotta `scegli`.

## Prove (esito)

Prove corrette, 2 volte su database appena preparato:

- `app_documenti` → **73/0** e **73/0**.
- `app_flusso` → **192/0** e **192/0**.

Giro completo (database appena preparato, ordine corretto — `app_bollettino` prima di `app_flusso`):

```
app_documenti 73/0 · app_pratica 87/0 · app_bollettino 43/0 · app_flusso 188/0 · app_clienti 46/0 · app_oggi 43/0
```

(`app_flusso` fa 188 nel giro: salta le 4 asserzioni della verifica del bollettino, già chiuso da
`app_bollettino`, come previsto dal suo commento.)

`python -m py_compile` su `app_documenti.py` e `app_flusso.py`: ok. Nessun file TypeScript toccato.

## Da documentare

- Niente di nuovo sul codice dell'app: i rilievi erano nelle prove (dati incoerenti, selettori, attese
  sul visore) e nell'ordine del giro. I comportamenti dell'app (livello `bassa` sul totale incoerente,
  visore a pagine asincrone, D-152 con due candidati) sono corretti.

## Aperto (per Ugo / Claude Code)

- **Ordine del giro completo**: la sequenza scritta nel pacchetto (`… app_flusso app_bollettino …`)
  mette `app_flusso` prima di `app_bollettino` e fa fallire `app_bollettino` (causa c). L'ordine
  giusto è `app_bollettino` prima di `app_flusso`; va corretto nel pacchetto/nei comandi di Claude Code.
- **Flakiness osservata**: rilanciando `app_flusso` due volte nello stesso giro (stesso database,
  senza ri-seed) il secondo passaggio è caduto su «scheda A: le righe restano ferme finché non si
  clicca Aggiorna» (sezione aggiornamenti fra due schede, 187/1). Su database appena preparato passa
  sempre (192/0 × 2). Non legato alle correzioni di oggi; da guardare solo se ricompare.
