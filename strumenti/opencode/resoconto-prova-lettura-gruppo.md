# Resoconto — `prova-lettura-gruppo` (campo `gruppo` in lettura.spec.ts)

Esecutore: DeepSeek Flash · Pacchetto: `strumenti/opencode/prova-lettura-gruppo.md`.

## Esito

Nessuna correzione necessaria: prova e codice sono già allineati. Il campo `gruppo: 'lettura'` che
`lettura.spec.ts:206` si aspetta è prodotto da `proposta.ts` (`gruppo: 'lettura' | 'confronto'`, D-176),
e l'attesa della prova è già stata aggiornata di conseguenza. La prova passa: **13/13**.

Lato sbagliato era quindi la **prova vecchia**. L'aggiornamento minimo (`+ , gruppo: 'lettura'` sulla
riga 206) è già presente nella copia di lavoro. Nessun file toccato da questo pacchetto.

## Perché non ho toccato il codice

`lettura.ts`/`lettore.ts` non c'entrano: il controllo `codice_cliente` nasce in `proposta.ts`, che
appartiene a un'altra lavorazione in corso (non è fra i miei file ammessi: 429 righe di diff non mie).
Il caso è chiaro e già risolto; toccarlo avrebbe solo duplicato lavoro.

## Prove

- `npx tsc --noEmit` backend: **OK** (exit 0).
- jest `test/lettura.spec.ts` su `decobrands_test_lett_gruppo` (creato, migrato, cancellato):
  **13/13 pass, 0 KO**.
- Prove browser non lanciate (regole dell'onda).

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `ponytail-review`: nessun codice aggiunto; la modifica minima era già una riga di test.

## Da documentare

- Nulla di nuovo: D-176 è già nel §19 e la prova ora lo segue.
- Nota per Claude Code: `proposta.ts`, già corretto da un altro pacchetto/onda, non è committato;
  il fix di questa prova vive nello stesso working tree. Se `proposta.ts` non entra nel commit
  dell'onda, la prova tornerebbe rossa: vanno committati insieme.
