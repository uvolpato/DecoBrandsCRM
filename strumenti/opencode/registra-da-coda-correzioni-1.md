# `registra-da-coda` — correzioni 1

Ugo (15/11/2026): «idem per la nota di credito». In `VistaPratica.tsx` fattura e nota di credito si
registrano con la loro finestra (~righe 205–240, 535–610, «Registra la fattura» / «Registra la nota di
credito», F2-A3 §4.2.7.1). Aggiungi anche lì la stessa scelta «Prendi dalla coda» / «Inserisci a mano»,
riusando **lo stesso pezzo** fatto per «Registra un documento» (un solo componente/blocco, parametrico sul
tipo), con l'elenco della coda filtrato per fornitore e cliente della pratica **e per tipo** (fattura → solo
fatture; nota di credito → solo note di credito; se il tipo letto è incerto, mostrali in fondo come «tipo da
verificare»). Per la nota di credito valgono i controlli già esistenti (serve una fattura nella pratica; la
fattura a cui si riferisce se il flusso a mano la chiede). Abbinamento con la stessa operazione del server.

Stessi file ammessi e vietati del pacchetto. Prove: `tsc --noEmit` backend e frontend; jest: nota di credito
dalla coda abbinata alla pratica; fattura in coda non compare nella scelta della nota. Aggiorna il resoconto
e la guida. Riepilogo in 6 righe.
