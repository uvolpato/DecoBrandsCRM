# Resoconto — «Usa importi calcolati» nelle righe dei documenti (15/11/2026)

Pacchetto: `strumenti/opencode/usa-importi-calcolati.md`. Richiesta di Ugo: un pulsante che metta il
calcolato su tutte le righe che oggi hanno il pulsantino «Usa … €», invece di cliccarli uno per uno.

## Cosa ho fatto

1. **`discordeDaCalcolato(r)`** (`VistaDocumento.tsx`): funzione nuova, piccola, accanto a
   `importoCalcolato`; dice se l'importo letto differisce dal calcolato (≥ 0,01 €). La usa la cella
   (al posto del calcolo duplicato) e il nuovo pulsante: una regola, un posto.
2. **Pulsante «Usa importi calcolati (N)»** nel `.righe-testa`, a sinistra di «+ Aggiungi riga»
   (i due pulsanti sono in un contenitore `display:flex; gap:8px`, così restano vicini col
   `space-between` della testa). Stile `.btn sec piccolo`, come «Aggiungi riga».
   - Visibile solo se `nDiscordi > 0` (solo per i documenti, non per il bollettino: lì l'importo non
     è mai «calcolato»).
   - Al clic: per ogni riga discorde l'importo diventa `''`, cioè calcolato — esattamente quello che
     fa il pulsantino «Usa … €». La lista si ricostruisce e il pulsante sparisce (nessuna riga
     discorde resta).
   - Segna la bozza come sporca (`setSporco(true)`), così la conferma di uscita D-170 vale anche qui.
3. **Nessun salvataggio**: si salva con «Salva e ricalcola l'abbinamento». Il server riceve l'importo
   vuoto e ricalcola (V12), come per il pulsantino singolo.
4. **Guida** (`lib/guida.ts`): una riga nelle azioni di *Correggi i dati letti*.

## Causa degli 0,00 € nello screenshot

Non è un difetto della tabella: è una **lettura vera a 0**. Sola lettura su `decobrands_db`
(documento con 26 righe, il caso del pacchetto): `documenti_campi` ha `righe[i].importo = "0"` per
tutte e 26 le righe, mentre `quantita`, `prezzo` e `sconto` sono letti bene (es. `righe[0]`: 54 × 0,5,
sconto 5). `componiLetto` (`proposta.ts`) trasforma `"0"` in `0`, quindi la cella mostra 0,00 €,
arancio, con il pulsantino: comportamento corretto. Il difetto è a monte, nella **lettura del
documento** (il modello scrive 0 nella colonna importo): fuori dai file di questo pacchetto. Qui non
toccato; su quel documento il pulsante nuovo mette a posto tutte le 26 righe in un clic.

## File toccati

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (`discordeDaCalcolato`, `nDiscordi`,
  pulsante nel `.righe-testa`; la cella usa la funzione nuova).
- `app/frontend/lib/guida.ts` (una riga).

## Prove

- `tsc -p app/frontend/tsconfig.json --noEmit`: **pulito** (EXIT 0).
- Prove nel browser non lanciate (regole dell'onda): le lancia Claude Code a fine onda. Nessun
  selettore esistente cambiato (il pulsantino «Usa … €» e la tabella restano identici), quindi non
  servono aggiornamenti a `app_*.py`.
- `py_compile`: niente file Python toccati.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `ponytail-review`: una funzione condivisa, nessuna astrazione nuova, nessuno stato nuovo; il
  contenitore `div` è l'unico markup aggiunto. Niente da tagliare.

## Da documentare

- **spec §7.9** (correzione dei dati letti): nella tabella *Righe*, accanto ad «+ Aggiungi riga»,
  compare **«Usa importi calcolati (N)»** solo se almeno una riga ha l'importo letto diverso dal
  calcolato; un clic porta tutte quelle righe al calcolato (fa per ognuna quello che fa il pulsantino
  «Usa … €»). Non salva: si salva con «Salva e ricalcola l'abbinamento»; il server ricalcola il vuoto
  (V12). Nel bollettino non c'è.
- **spec §19**: decisione nuova (numero **da assegnare**: i resoconti dell'onda arrivano a D-179)
  «importi calcolati in blocco» + il perché (con molte righe lette a 0 i pulsantini uno per uno sono
  26 clic; stessa regola del pulsantino singolo, quindi stessa funzione).
- **piano**: attività F6 (ingresso documenti) — correzione in blocco degli importi di riga; ore
  marginali da approvare se serve.
