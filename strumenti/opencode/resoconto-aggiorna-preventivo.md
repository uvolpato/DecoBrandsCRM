# Resoconto — Aggiornare il preventivo al 13/11/2026

Esecutore: DeepSeek Flash. Pacchetto: `strumenti/opencode/aggiorna-preventivo.md`.
File toccati: `preventivo-crm-provvigioni.md`, `prototipo-crm/preventivo.html` (rigenerato), questo resoconto.

## Fonti lette

- `preventivo-crm-provvigioni.md` (versione 19/10/2026)
- `piano-lavoro-crm.md` v2.2 (F0-A3, F7-A0, F7-A3, F7-A5, F7-A6, F7-A7)
- `specifica-crm-provvigioni.md` §19 (D-29, D-30, D-39)
- `app/NOTA-RILASCIO.md` (versione 0.2.0 — 13/11/2026)
- `strumenti/collaudo/piano-correzioni.md` v2 (onde chiuse e da fare)

## Lavoro

1. Testata: «aggiornato il 13/11/2026» con riassunto (0.2.0 consegnata per i documenti veri; collaudo onde 0, 0 bis, 1, 2 e pacchetti scelti).
2. §5: V10 segnata **sostituita da D-39**, ore invariate (2 h) perché il piano F0-A3 resta «3 h + 2 h approvata»: le 2 h di Microsoft 365/link sono state riusate, non tolte.
3. §5 nuove variazioni (tariffa € 55/h, §2): V13 = F7-A0 3 h, V14 = F7-A3 4 h, V15 = F7-A5 10 h, V16 = F7-A6 4 h, V17 = F7-A7 12 h (**non ancora fatta**, righe dei bollettini dal PDF).
4. §5: riga «Collaudo onde 0–2 e correzioni per i documenti veri (13/11/2026) — ore da definire (Ugo)», importo «—», **fuori dai totali**.
5. §6: totali ricalcolati.
6. §1/§7: corrette solo le frasi false per D-29 (database proprio `decobrands_db`, niente autenticazione/clienti/ordini condivisi) e D-39 (niente Microsoft 365).
7. `python3 strumenti/genera-pagine-doc.py`.

## Conti (controllati due volte)

| Voce | Ore | Importo |
|---|---|---|
| Variazioni prima | 59 | € 3.245,00 (59 × 55 = 3.245) |
| Nuove: 3 + 4 + 10 + 4 + 12 | 33 | € 1.815,00 (33 × 55 = 1.815) |
| **Totale variazioni** | **92** | **€ 5.060,00** (92 × 55 = 5.060; 3.245 + 1.815 = 5.060) |
| Margine 25 % variazioni | 23 | € 1.265,00 (92 × 0,25 = 23; 23 × 55 = 1.265) |

- Totale del preventivo (invariato): 105 h, € 6.175,00.
- Totale con tutte le variazioni: 105 + 92 = **197 h**; 6.175 + 5.060 = **€ 11.235,00**.
- Riferimento senza AI (§6) invariato: 228 h × 70 = € 15.960,00; 1.280 + 15.960 = € 17.240,00; risparmio € 11.065,00 (−69 %). Non dipende dalle variazioni.

## Prove

- `python3 strumenti/genera-pagine-doc.py` — prima esecuzione: `ModuleNotFoundError: No module named 'markdown'`; installato `markdown` 3.11.3 con `python3 -m pip install markdown`; seconda esecuzione: «specifica.html: 19 sezioni · preventivo.html aggiornato». `preventivo.html` contiene i nuovi totali (€ 11.235,00).
- Nessuna prova nel browser (non richiesta dal pacchetto).

## Cose aperte

- Ore del **collaudo onde 0–2 e pacchetti scelti**: il piano non ha un'attività con le ore → riga «da definire (Ugo)», importo «—», fuori dai totali.
- F7-A7 (righe dei bollettini dal PDF) è **stimata, non fatta**: il preventivo lo dice.
- F7-A0, F7-A3, F7-A5, F7-A6 hanno ore **da approvare** nel piano: nel preventivo sono variazioni da approvare come le altre.

## Da documentare

- Preventivo aggiornato al 13/11/2026 con le variazioni V13…V17 e la riga del collaudo: da citare nel messaggio a Ugo e, se serve, nel piano lavoro (le attività esistono già).
- V10 nel preventivo è ora marcata «sostituita da D-39»: allineamento con spec §19, nessuna nuova decisione presa.
