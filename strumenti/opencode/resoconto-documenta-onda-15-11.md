# Resoconto — `documenta-onda-15-11` (documentazione dell'onda del 15/11/2026)

Esecutore: DeepSeek. Pacchetto `strumenti/opencode/documenta-onda-15-11.md`. Regole comuni rispettate: niente commit, niente `cd`/`/tmp`/`&`, `.env` mai letto, niente porte 8001/8002, niente Integra. Skill caricate davvero: `caveman`.

## Cosa è stato fatto

1. **§19**: 20 righe nuove (D-177…D-196) aggiunte in fondo al registro, una per decisione dell'onda del 15/11, con perché, chi (Ugo) e dove.
2. **Righe *Perché***: §4.2.7.1 (`calcolo`/`congelato_il` + base provvigione), §4.2.8 (colonna `spesa`), §5.3 (sconto medio, base netto−spese, congelamento), §5.7 (sconto dell'agenzia non è più la fonte), §6.5 (importo 0 = non letto, righe spesa, «mai esatta»), §7.1 (Oggi dettagli D-191, riferimenti email D-184), §7.3 (testata D-180, prendi dalla coda D-186, sconto medio/base D-182/D-183), §7.8 (tendina anno D-195, base provvigione D-183), §7.9 (filtro/tendina/vincoli D-177/D-185, pagamento D-188, importi blocco D-192, somma righe D-196, posizione/visualizzatore D-189/D-190/D-193), §16.4 (Schede `azioni`, CampoRicerca `segmenti`/`vincoli`, Intestazione `testa`), §16.4.1 (barra su una riga D-187).
3. **Versione spec** 8.82 → **8.83** con il riassunto dell'onda.
4. **Piano** 2.3 → 2.4: attività nuove F7-A16…F7-A20 (36 h **da approvare**).
5. **NOTA-RILASCIO** sezione 0.2.7 (testo per Matteo/utenti) e corretta la riga «Somma righe» che descriveva ancora il vecchio avviso.
6. **Versione** 0.2.6 → **0.2.7** nei due `package.json`.
7. **LEGGIMI** nota sullo scaglione (`M.scaglione` «primo ≥ sconto», regola completa non portata al prototipo).
8. **guida.ts** corretta la sola contraddizione trovata (riga 184: «i segmenti in cima» e i predefiniti sbagliati → «la tendina accanto al campo» con «Aperte»/«Fatturata» dal tipo).
9. **Commenti nel codice**: risolti i segnaposto `D-… §19` → `D-186 §19` (`documenti.ts`, `VistaPratica.tsx`) e `D-nn` → `D-182` (`sconto-medio-ricalcola.ts`).
10. Lanciato `python strumenti/genera-pagine-doc.py` (OK).

## Tabella vecchio numero → nuovo numero

| Decisione | Numero proposto nei resoconti | Numero finale |
|---|---|---|
| Filtro per stato nella ricerca (tendina) | D-177 | **D-177** |
| Filtro pratiche suggerite «Aperte» | D-178 | **D-178** |
| Importo 0 del lettore = non letto | D-180 | **D-179** |
| Testata pratica: tutti gli ordini | D-180 | **D-180** |
| Sessione del database in UTC | D-181 | **D-181** |
| Sconto medio → scaglione | D-182 | **D-182** |
| Spese escluse + valori congelati | D-183 | **D-183** |
| Riferimenti del destinatario nelle email | (da assegnare) | **D-184** |
| Ricerca pratiche vincolata a cliente+fornitore | (da assegnare) | **D-185** |
| Prendi dalla coda | (da proporre) | **D-186** |
| Barra filtri su una riga, segmenti in tendina | (da assegnare) | **D-187** |
| Pagamento senza numero | (da numerare) | **D-188** |
| Posizione «indicativa», mai «esatta» | (—) | **D-189** |
| Visualizzatore PDF: errore visibile | (da registrare) | **D-190** |
| Oggi: voci «Documenti da decidere» esplicite | (da assegnare) | **D-191** |
| Usa importi calcolati in blocco | (da assegnare) | **D-192** |
| Visualizzatore: riquadro foto + zoom | (da registrare) | **D-193** |
| Righe di spesa lette con `spesa: true` | (da confermare) | **D-194** |
| Tendina dell'anno nelle Liquidazioni | (da assegnare) | **D-195** |
| Somma righe in rosso, senza «diversa di» | (—) | **D-196** |

Il conflitto reale era `D-180` usato sia da `testata-pratica-ordini` sia da `importo-riga-zero`: risolto assegnando **D-179** a `importo-riga-zero` (il codice già usava D-179 per quella regola) e **D-180** a `testata-pratica-ordini`.

## Prove

- `npx tsc --noEmit` backend: **0 errori**.
- `npx tsc --noEmit` frontend: **0 errori** (il cambio in `guida.ts` è una stringa).
- `python strumenti/genera-pagine-doc.py`: **OK** (specifica.html 19 sezioni, preventivo aggiornato).
- Prove nel browser non lanciate (regole dell'onda).

## Cose aperte (per Ugo / chi chiude l'onda)

1. **§19 si ferma a D-152**: le decisioni **D-153…D-176** (onda del 14/11: percentuali riprogettate, sconto di riga, importo calcolato, agenzie da confermare, numero ordine fornitore, vocabolario+somiglianza D-164, …) sono nei commenti del codice ma **non** nel §19. Sono fuori dall'elenco dei resoconti di questo pacchetto e vanno documentate a parte (non le ho inventate né rinumerate). Ho documentato solo D-177…D-196.
2. **Piano, riferimenti stantii**: `F7-A13` cita «D-178, D-179» per sconto di riga/importo calcolato e `F7-A14` descrive «segmenti» invece della tendina (D-177); sono attività dell'onda 14/11 e vanno allineate quando si documenta D-153…D-176.
3. **`versione.spec.ts`** ora legge la versione dal `package.json` (correzione già applicata da un altro pacchetto): con il bump a 0.2.7 la prova passa senza altri interventi.
4. **Comandi di servizio** `npm run sconto:medio` e `npm run valori:congelati` (con `--prova`) vanno lanciati da Claude Code su `decobrands_db`, dopo copia di sicurezza (v. `resoconto-sconto-medio.md`, `resoconto-valori-congelati.md`).
5. **Migrazione applicata per errore**: `resoconto-valori-congelati.md` segnala che `20261115210000_valori_congelati` è stata applicata a `decobrands_db` senza reindirizzare `DATABASE_URL` (additiva, non distruttiva): da decidere se lasciarla o toglierla.

## Da documentare (già portato in spec/piano/guida/NOTA-RILASCIO)

Tutto quanto sopra è già scritto nei documenti: nessuna voce residua.
