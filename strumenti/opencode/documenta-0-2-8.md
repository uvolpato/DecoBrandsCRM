# Pacchetto `documenta-0-2-8`

Raccogli «Da documentare» di `resoconto-righe-nota-credito.md` (con «Correzioni 1») e `resoconto-pratica-da-ricerca.md`.

## Compito
1. Spec `specifica-crm-provvigioni.md`: D-197 c'è già (verifica che dica righe della nota salvate, sconto medio sulla
   differenza, fattura congelata → la nota porta la differenza, nota senza righe = riserva, storno totale = 0).
   Riga nuova §19 (primo numero libero) per la **ricerca pratica**: colonna «Importo» (valore della pratica salvato,
   ultima fase) e pulsante icona per aprire la pratica in una **scheda nuova senza navigazione** (`?vista=sola`, «Chiudi
   la scheda»); perché: Ugo 16/11, controllare la pratica giusta senza perdere il documento in lavorazione. Riga
   *Perché* nella sezione della pagina Documento/modale e §16.4 (`RicercaEntita` opzione `apriVoce`). Versione in testa
   +0.01 con il riassunto.
2. `app/frontend/lib/guida.ts`: pagina Documento, la modale «Cerca pratica» (colonna Importo, pulsante nuova scheda).
   Controlla che non contraddica la sezione sulla nota di credito.
3. `piano-lavoro-crm.md`: attività nuove con ore **da approvare** (righe nota di credito, apertura pratica dalla ricerca).
4. `app/NOTA-RILASCIO.md`: sezione **0.2.8** per Matteo/utenti, italiano semplice, niente nomi tecnici.
5. Versione `app/backend/package.json` e `app/frontend/package.json` a **0.2.8** (solo la riga version).
6. `python strumenti/genera-pagine-doc.py`.

File ammessi: `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`, `app/NOTA-RILASCIO.md`, i due `package.json`
(solo version), `app/frontend/lib/guida.ts`, pagine generate in `prototipo-crm/`. Nessun altro codice. Regole:
`strumenti/opencode/regole-onda-parallela.md`. Niente commit, `cd`, `/tmp`, `&`. Skill: `caveman`.
Resoconto: `strumenti/opencode/resoconto-documenta-0-2-8.md`. Riepilogo in 6 righe.
