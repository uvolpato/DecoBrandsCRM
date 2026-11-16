# Pacchetto `documenta-d153-d176`

Leggi `strumenti/opencode/resoconto-documenta-onda-15-11.md`, punto «Aperto»: il registro §19 di
`specifica-crm-provvigioni.md` salta da **D-152** a **D-177**; le decisioni **D-153…D-176** (onda del 14/11 e precedenti)
sono citate nel codice (`grep -rn "D-1[5-7][0-9]" app/ prototipo-alternativo/`) e nei resoconti in `strumenti/opencode/`
(«Da documentare»), ma non nel §19.

Compito: aggiungi al §19, al posto giusto (fra D-152 e D-177), una riga per ciascuna D-153…D-176 (data, decisione,
**perché**, chi, dove), ricostruita dai resoconti e dai commenti del codice; se un numero non ha nessuna traccia, scrivi
la riga «numero non usato». Righe *Perché* nelle sezioni della spec che ne sono prive. Allinea nel piano i riferimenti
stantii F7-A13/F7-A14. Alza la versione della spec (8.83 → 8.84) e lancia `python3 strumenti/genera-pagine-doc.py`
(o `python`). Nessun codice. File ammessi: `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`, pagine generate in
`prototipo-crm/`. Regole: `strumenti/opencode/regole-onda-parallela.md`. Niente commit, `cd`, `/tmp`, `&`. Skill: `caveman`.
Resoconto: `strumenti/opencode/resoconto-documenta-d153-d176.md` (tabella numero → fonte). Riepilogo in 5 righe.
