# Pacchetto `riga-codice-testo` — riga «Fracht» (spesa) scartata dalla lettura

Data: 15/11/2026 · ramo `main` · nessun commit, nessun push.

## Causa

La riga 27 (`Fracht / Verpackung und Versand`, 87,50 €) **manca già nella risposta del modello**,
non viene scartata dal nostro codice. Su `decobrands_db` (sola lettura) la `lettura_grezza` della
PR102829 ha `extract_result.righe` con **26 righe**, nessuna «Fracht»; somma righe 876,28 € contro
`importo_totale` 963,78 € (differenza esattamente 87,50 €).

Non c'è un filtro nel codice: `componiLetto` (proposta.ts) tiene ogni riga con almeno un campo non
nullo e lo schema dichiara `codice` come `string`, senza vincolo numerico. È il **prompt** che la
scarta: la frase «Nelle righe metti solo le righe articolo…» spinge il modello a saltare la riga
dove la colonna articolo contiene un testo («Fracht») invece di un numero.

## Modifica

- `app/backend/src/lettura.ts`: nello schema delle righe il campo `spesa` (boolean, solo per le righe
  non articolo); il prompt ora dice di mettere **ogni** riga con posizione, quantità, prezzo e importo,
  anche con codice testo o mancante, copiando il codice com'è e segnando `spesa: true`.
- `app/backend/src/proposta.ts`: helper `bool`, campo `spesa` su `RigaLetta`, letto in `componiLetto`
  da `righe[i].spesa`. Nessun cambio ai calcoli delle provvigioni (V12, domanda aperta sotto).
- `app/backend/test/lettura.spec.ts`: una prova nuova (schema/prompt contengono `spesa` e «Fracht»;
  una riga con codice «Fracht» e `spesa=true` si salva come campo `righe[0].spesa`).

## Prova sul PDF vero (pacchetto `riga-codice-testo-prova-vera`, 15/11/2026)

Diagnosi del `fetch failed`: non è l'indirizzo (fisso `https://api.cloud.eu.llamaindex.ai`), né la
chiave (decifrata dalle Impostazioni), né il percorso del server locale: la configurazione si carica
bene (`connettore: llamacloud_eu`). È un errore di rete **transitorio** (`TypeError: fetch failed`):
lo stesso `npm run lettura:prova`, rilanciato, legge correttamente. Nessuna modifica al codice per
questo.

Tabella (righe = imponibile delle righe lette; «prima» = `lettura_grezza`/`documenti_campi` già su
`decobrands_db`, sola lettura):

| Documento | righe prima | righe dopo | somma prima | somma dopo | esito |
|---|---|---|---|---|---|
| Proforma_PR102829 | 26 | 27 | 876,28 | 963,78 | riga «Fracht» 87,50 `spesa:true` ✓ |
| Auftrag_AU276950 | 26 | 27 | 0 | 963,78 | Fracht presente ✓ |
| Rechnung_RE193612 | 26 | 27 | 876,28 | 963,78 | Fracht presente ✓ |
| Proforma_PR102813 | 49 | 49 | 2117,30 | 2117,30 | identica ✓ |
| Proforma_PR102848 | 1 | 1 | 37,20 | 37,20 | identica ✓ |
| Proforma_PR102920 | 46 | 46 | 1840,23 | 1840,23 | identica ✓ |

Nessun peggioramento: i tre documenti dello stesso ordine ora includono la riga spesa (27 righe,
somma = 963,78 € = importo_totale); i tre PDF ARTE restano identici. Il comando non scrive su
`decobrands_db` (`lettura-prova.ts` stampa soltanto; nessuna opzione `--solo-stampa` necessaria).

Note di collaudo: `npx tsc --noEmit` passa (dopo `prisma generate`, il client era rimasto indietro
rispetto allo schema). La prova `test/lettura.spec.ts` **non gira a 0 KO**: il database
`decobrands_test` non ha la tabella `alias_letti` (migrazione di un altro pacchetto non ancora
applicata al db di prova); non dipende dai file di questo pacchetto.

## Righe saltate in altri documenti

Stesso ordine AU276950 → **stessa riga «Fracht» (87,50 €) manca in tutti e tre** i documenti letti:
- `Auftrag_AU276950.pdf` (ordine, id 10): 26 righe, nessuna Fracht; tutte con `importo=0` (già
  gestito da D-179, importo calcolato);
- `Proforma_PR102829.pdf` (id 11): 26 righe, nessuna Fracht;
- `Rechnung_RE193612.pdf` (fattura, id 12): 26 righe, nessuna Fracht.

Nessun altro documento ha una differenza tra totale e somma righe né codici non numerici (i
`pagamento` con 0 righe non sono articolati, è giusto). Quindi nessun altro punto da correggere.

## Domanda aperta — risposta tecnica (decisione di Ugo/Matteo)

**Oggi il motore include la spesa.** L'imponibile del documento (`ordini_fornitore_documenti.importo`)
viene dall'`importo_totale` letto (963,78 €), che **comprende** i 87,50 € della riga Fracht: la base
della provvigione la include. La somma delle righe è usata solo come controllo («totale diverso dalla
somma delle righe»): ora che la riga spesa viene letta, il controllo torna a tornare.

**Escludendola** la base scenderebbe a 876,28 € (− 87,50 €) per ciascun documento di questo ordine, e
la provvigione calerebbe in proporzione. Il flag `spesa: true` permette già di escluderla dalla base
senza toccare altro, ma oggi `importoRigaLetta`/`importoDocumento` la sommano ancora: decidere se le
spese entrano o no nella base è la scelta da fare (e dove agire: sul totale letto o sulla somma righe).

## Da documentare

Proposta per il §19 (da confermare numero e testo con Ugo):
- **D-…**: le righe di spesa (trasporto/imballo, codice testo come «Fracht», «Porto», «Versand») si
  leggono come righe e si segnano `spesa: true`; se la spesa entri nella base della provvigione resta
  aperto. Perché: la colonna articolo di queste righe contiene testo, il prompt le scartava e il
  totale non tornava con la somma righe.
- *Perché* in spec §6.5 (lettura): la riga non articolo si tiene, con flag `spesa`, senza cambiare
  ancora i calcoli.
- Nota per Ugo: premere «Rileggi il documento» sulla PR102829 (e su Auftrag/Rechnung dello stesso
  ordine) per salvare la lettura a 27 righe nel database, visto che la lettura ora funziona.
