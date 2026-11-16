# Resoconto — Preventivo 0.2.7

Esecutore: DeepSeek Flash · Pacchetto: `strumenti/opencode/preventivo-0-2-7.md`.
Fonti: `git log` e `git show --stat` dopo il 13/11/2026 (commit `a1b43dc` → `06694b7`),
`app/NOTA-RILASCIO.md` (0.2.1 → 0.2.6), i resoconti `sconto-riga`, `sconto-da-grezza`,
`filtro-stato-pratiche`, `importo-calcolato`, `giro-0-2-7`, il diff di `bollettini.ts` e
`Modale.tsx`. Niente commit, niente spec, `.env` mai letto.

## Righe aggiunte in §5 (tutte fuori preventivo, da approvare)

| # | Argomento | Versioni | Ore | Importo |
|---|---|---|---|---|
| V19 | Documenti in coda e lettura (coda, ordine di lettura, PDF tutte le pagine, soglie D-151) | 0.2.1, 0.2.6 | 8 | € 440,00 |
| V20 | Riconoscimento di fornitore e cliente (D-152, D-164, D-165, ricerca per parole, codice cliente) | 0.2.1–0.2.6 | 10 | € 550,00 |
| V21 | Anagrafica del vecchio CRM e agenzie (D-156, D-158, D-159, agenzia nel flusso) | 0.2.3, 0.2.4 | 7 | € 385,00 |
| V22 | Percentuali e scaglioni dal flusso, campi di ricerca (D-161, D-162, D-163) | 0.2.5 | 5 | € 275,00 |
| V23 | Correzione dei dati letti (testata, somma righe, cliente scelto, riepilogo) | 0.2.2 | 5 | € 275,00 |
| V24 | Sconto di riga e importo calcolato o letto (D-178, D-179) | 0.2.7 | 6 | € 330,00 |
| V25 | Filtro per stato nella ricerca delle pratiche per l'abbinamento (D-177) | 0.2.7 | 4 | € 220,00 |
| | **Totale** | | **45** | **€ 2.475,00** |

Ore stimate dalla dimensione dei commit (`--stat`: 600–1.700 righe ciascuno) e dei resoconti,
con la stessa prudenza delle righe esistenti (V15 = 10 h, V7 = 13 h).

## Totali prima → dopo

| Voce | Prima | Dopo |
|---|---|---|
| Ore variazioni §5 | 92 | 137 |
| Importo variazioni §5 | € 5.060,00 | € 7.535,00 |
| Totale con tutte le variazioni | 197 h / € 11.235,00 | 242 h / € 13.710,00 |
| Margine 25 % sulle variazioni | 23 h / € 1.265,00 | 34 h / € 1.870,00 |

Somme ricontrollate: 92 + 45 = 137 h; € 5.060 + € 2.475 = € 7.535 (137 × 55 = 7.535);
105 + 137 = 242 h; € 6.175 + € 7.535 = € 13.710. Il margine è arrotondato in difetto
(137 × 25 % = 34,25 h → 34 h).

## Messo nel collaudo (V18), non in una variazione

- **Sconto non recuperabile dalla lettura grezza**: solo diagnosi, nessun codice (`sconto-da-grezza`). La premessa di D-170 vale solo per i campi già estratti; lo sconto si ottiene solo rileggendo.
- **Limite del selettore dei mesi dei Bollettini**: `primo` ora è il mese più vecchio fra bollettini e documenti (`bollettini.ts`), così si raggiunge un mese con fatture e senza bollettino. Correzione di un difetto nostro.
- **Correzione della `Modale`** (`<p>` → `<div>` nel testo della testata): HTML non valido con contenuto a blocchi. Difetto nostro.

V18 resta «ore da definire (Ugo)», fuori dai totali.

## Piano e pagine

- `piano-lavoro-crm.md`: versione 2.3; aggiunte **F7-A8…F7-A14** (stesse ore di V19…V25, da approvare) e **F7-A15** (collaudo V18, ore da definire).
- `python3 strumenti/genera-pagine-doc.py`: `prototipo-crm/preventivo.html` aggiornato (`specifica.html` rigenerata identica).

## Dubbi / aperti

1. **Altro lavoro non committato del 15/11 non è in questo pacchetto** (es. `azioni-riga` D-171, `conferme-multiple`, `confronto-righe`, `oggi-dettagli`, `numero-ordine-fornitore`, `percentuali-riprogetto`). Il pacchetto indicava solo i quattro resoconti: se sono variazioni, vanno aggiunte in un passaggio successivo, altrimenti restano nel collaudo.
2. **D-177/D-178/D-179 non sono ancora nel §19** (la spec non è modificata nel working tree): le ho citate come proposte dei resoconti. Se Ugo le rinomina, le righe V24/V25 vanno riallineate.
3. **V18**: le tre voci messe nel collaudo non hanno ore; la riga resta «—» come prima.
