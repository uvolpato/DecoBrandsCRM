# Pacchetto `righe-nota-credito`

## Contesto
Leggi `resoconto-sconto-medio.md` e `resoconto-valori-congelati.md` («Dubbi e limiti»): il motore **non salva le righe
della nota di credito** (`faseDi('nota_credito') = null`), quindi la nota segue lo scaglione della sua fattura e la sua
base è il suo importo netto. Decisione di Ugo (D-182): con la nota di credito lo sconto medio si **ricalcola sulla
differenza** fattura − nota; se cambia lo scaglione, cambia la provvigione. Ugo (16/11/2026): farlo ora.

## Regola
1. Le righe della nota di credito si **salvano** come quelle della fattura (quantità, prezzo, sconto, importo, `spesa`),
   dalla lettura o a mano, nella stessa tabella delle righe dei documenti fiscali.
2. Per una fattura con note di credito collegate (`fattura_id` dello storno):
   - lordo netto = Σ lordo righe merce fattura − Σ lordo righe merce note; netto = idem sugli importi;
   - **sconto medio della differenza** = 1 − netto/lordo → scaglione (stessa funzione `percentuali()`, primo ≥, oltre
     l'ultimo = anomalia);
   - base = netto della differenza − spese (se il fornitore le esclude), con le spese della nota che riducono quelle della
     fattura;
   - la provvigione della coppia fattura+note si ricalcola su quella base e quello scaglione; la variazione rispetto a
     quanto già calcolato/fissato sulla fattura va sulla **nota** (è il documento che la genera).
3. **Valori fissati** (D-183): se la fattura è già **congelata**, i suoi valori non cambiano; la nota porta la differenza
   (provvigione della coppia ricalcolata − provvigione fissata della fattura), e lo storno va nella liquidazione
   successiva (D-11). Se la fattura è aperta, si ricalcolano fattura e nota insieme.
4. **Nota senza righe** (non leggibili o registrata a mano senza righe): riserva di oggi, cioè scaglione della fattura e
   base = importo netto della nota (nessun cambio di scaglione).
5. Nota che storna **tutta** la fattura (netto differenza = 0): provvigione della coppia 0, niente anomalia di sconto.

## Compito
- Schema: se la tabella delle righe è già usabile per la nota, nessuna migrazione; altrimenti migrazione **scritta, non
  applicata**.
- Lettura/registrazione: le righe della nota lette (lettura già esistente) arrivano fino al salvataggio all'abbinamento
  della nota (a mano, dalla coda, da «Registra la nota di credito»); correzione delle righe come per la fattura.
- Motore: punto unico (`calcoloDocumento`/`percentuali()`), nessun calcolo nel browser (V12); ricalcolo nella stessa
  transazione dell'abbinamento/registrazione/annullamento della nota (V13, `aggiornaPratica` → `salvaCalcolo`).
- Pratica (`VistaPratica.tsx`): sulla riga della nota, in tenue, «sconto medio dopo la nota X% → scaglione Y» solo se
  diverso da quello della fattura; la pratica resta somma dei documenti.
- Comando di servizio: estendi `valori-congelati-ricalcola.ts` per ricalcolare le note esistenti aperte (con `--prova`);
  **non lanciarlo su `decobrands_db`**.
- Guida (`lib/guida.ts`, sezione «Come si sceglie la percentuale», punto «quale documento conta»): spiega con un esempio
  numerico (fattura 1000 lordo / 900 netto al 10%, nota che toglie righe al 0% → nuovo sconto medio e scaglione).
- Spec §19: riga nuova (dal primo numero libero dopo D-196) con il perché; *Perché* in §4.2.7.1; versione spec +0.01.

## Prove (jest, suite completa 0 KO)
- fattura 10% + nota su righe al 10% → scaglione invariato, provvigione proporzionale;
- fattura mista + nota che toglie le righe al 0% → sconto medio della differenza sale, scaglione cambia;
- differenza oltre l'ultimo scaglione → anomalia, pratica non chiudibile;
- fattura congelata + nota → fattura invariata, la nota porta la differenza;
- nota senza righe → riserva (scaglione della fattura);
- storno totale → provvigione 0;
- seed: numeri del prototipo invariati.

## File ammessi
`app/backend/src/**` (motore, documenti, pratiche, proposta, comandi), `app/backend/prisma/**` (migrazione solo scritta),
`app/backend/test/**`, `VistaPratica.tsx`, `VistaDocumento.tsx` (solo se servono le righe della nota nella correzione),
`lib/guida.ts`, `specifica-crm-provvigioni.md`. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, D-11, D-182, D-183. **Ogni comando
prisma/jest con `DATABASE_URL` esplicito nella stessa riga**, puntato a `decobrands_test_righe_nota` (creato e cancellato);
mai `migrate` su `decobrands_db`. `.env` mai letto con cat/readFileSync (URL con grep). Niente commit, 8001/8002, `cd`,
`/tmp`, `&`, Integra. Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-righe-nota-credito.md`: schema, punto unico, esempi numerici, prove, comando da lanciare
con numeri attesi sul db vero (note di credito esistenti), «Da documentare». Riepilogo in 10 righe.
