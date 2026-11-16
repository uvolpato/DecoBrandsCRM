# Pacchetto `documenta-onda-15-11` (documentazione dell'onda del 15/11/2026)

Raccogli le sezioni «Da documentare» di questi resoconti in `strumenti/opencode/` e portale nei documenti:
`resoconto-filtro-stato-in-modale.md`, `resoconto-filtro-modale-tendina.md`, `resoconto-filtro-pratiche-suggerite.md`,
`resoconto-testata-pratica-ordini.md`, `resoconto-pdf-pagamento-non-visto.md`, `resoconto-pdf-errore-visibile.md`,
`resoconto-ora-registro.md`, `resoconto-liquidazioni-anno.md`, `resoconto-oggi-dettagli.md`,
`resoconto-usa-importi-calcolati.md`, `resoconto-importo-riga-zero.md`, `resoconto-visualizzatore-zoom.md`,
`resoconto-sconto-pratica-002.md`, `resoconto-sconto-cliente-002.md`, `resoconto-sconto-medio.md`,
`resoconto-riferimenti-email.md`, `resoconto-pagamento-senza-numero.md`, `resoconto-cerca-pratica-vincoli.md`,
`resoconto-registra-da-coda.md`, `resoconto-barra-filtri-una-riga.md` (con «Lampeggio» e «Soggetti»),
`resoconto-riga-codice-testo.md`, `resoconto-valori-congelati.md`, `resoconto-prova-lettura-gruppo.md`,
più i pacchetti senza resoconto: `diciture-posizione.md`, `somma-righe-rossa.md`.

## Compito
1. **Registro §19** di `specifica-crm-provvigioni.md`: una riga per ogni decisione nuova (data 15/11/2026, decisione,
   **perché**, chi = Ugo, dove). I resoconti propongono numeri (D-178…D-183) presi in parallelo: **rinumera tu** in
   ordine dal primo numero libero dopo l'ultimo del §19, senza buchi né doppioni, e aggiorna i rimandi `// D-nn §19`
   nel codice (`grep -rn "D-17[89]\|D-18[0-9]" app/`) perché puntino alla riga giusta. Decisioni chiave da non perdere:
   sconto medio → scaglione (primo ≥; oltre l'ultimo = anomalia e pratica non chiudibile; documento che comanda;
   riserva sull'agenzia); spese escluse dalla base salvo parametro del fornitore; valori calcolati salvati sul
   documento e congelati alla chiusura, pratica = somma, niente controllo notturno; ora unica del server; riferimenti
   del destinatario nelle email; ricerca pratiche vincolata a cliente+fornitore; registrazione dalla coda; barra filtri
   su una riga con segmenti in tendina; pagamento senza numero; filtro pratiche suggerite «Aperte»; posizione
   indicativa (mai «esatta»).
2. **Righe «Perché»** nelle sezioni della spec che descrivono le pagine e le regole toccate (§5.3, §4.2.7.1, §6.5, §7.x
   pagine, §16.4 componenti e §16.4.1 filtri standard, scheda Fornitori). Alza la **versione in testa** della spec
   con il riassunto.
3. **Piano** `piano-lavoro-crm.md`: attività nuove o cambiate con le ore, segnate **da approvare**.
4. `prototipo-alternativo/LEGGIMI.md`: solo se cambia qualcosa del prototipo (sconto medio `M.scaglione`).
5. `app/NOTA-RILASCIO.md`: sezione nuova per la **versione 0.2.7** con le novità per Matteo/utenti (italiano semplice,
   niente nomi tecnici); correggi la riga che parla ancora dell'avviso «diversa di» (riga ~57).
6. Versione: `app/backend/package.json` e `app/frontend/package.json` a **0.2.7**.
7. Controlla che `app/frontend/lib/guida.ts` non abbia testi in contraddizione fra loro (sconto medio, spese, valori
   fissati, posizione indicativa, filtri): correggi le contraddizioni, non riscrivere.
8. Lancia `python3 strumenti/genera-pagine-doc.py` (o `python` se `python3` non c'è).

## File ammessi
`specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`, `prototipo-alternativo/LEGGIMI.md`, `app/NOTA-RILASCIO.md`,
i due `package.json` (solo la versione), `app/frontend/lib/guida.ts`, i commenti `// D-nn` nel codice (solo il numero),
le pagine generate in `prototipo-crm/`. Nessun altro codice. Regole: `strumenti/opencode/regole-onda-parallela.md`.
Niente commit, `cd`, `/tmp`, `&`. Skill: `caveman`. Prove: `npx tsc --noEmit` backend e frontend (solo per i commenti).
Resoconto: `strumenti/opencode/resoconto-documenta-onda-15-11.md` con la tabella vecchio numero → nuovo numero.
Riepilogo in 8 righe.
