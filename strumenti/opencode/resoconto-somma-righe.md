# Resoconto — Correggi i dati letti: somma delle righe accanto all'importo (13/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/somma-righe.md` · Gravità P1.
Parte dopo `correggi-ordine` (stesso file `VistaDocumento.tsx`): letto prima `resoconto-correggi-ordine.md`.

## Cosa chiede Ugo (D-153, da proporre)

Nella finestra *Correggi i dati letti* l'**Importo** della testata e il **Totale** delle righe devono
coincidere. Accanto all'Importo si mostra la somma delle righe in sola lettura, con spunta verde se
coincide o avviso (attesa) se differisce; non è bloccante. Il server, al salvataggio, ricalcola la somma
e se differisce aggiunge un punto da controllare.

## Il controllo sul server esisteva già

`controlliFissi` (`proposta.ts`, §6.5 D-71) ha già il controllo `totale` (grave): «totale letto ≠ somma
delle righe, tolleranza 0,01». Si ricalcola al salvataggio (`PUT /documenti/:id` → `valutaLettura` →
`controlliFissi`) e torna nel dettaglio fra i punti da controllare. **Non ne aggiungo uno doppione**: il
punto 4 della richiesta è già coperto. Ho aggiunto due prove in `documenti.spec.ts` (caso uguale e caso
diverso) che lo confermano.

## File toccati

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`:
  - `importoRiga` + `sommaRighe` (modulo): importo di una riga come il server (`importoRigaLetta`:
    l'importo, altrimenti quantità × prezzo), somma in centesimi interi;
  - `CampoLetto` accetta `sotto` (elemento sotto il campo);
  - campo Importo con `sotto` = «Somma righe …» + spunta verde se uguale / avviso attesa se diversa
    («Diverso dall'importo del documento di …: controlla (può essere IVA inclusa)»); solo anteprima,
    mai salvata;
  - il piede della tabella (`tfoot`) usa la stessa `sommaRighe` (prima sommava solo gli importi);
  - il `totali` del server non si tocca (riga «Righe lette» invariata).
- `app/frontend/app/stile/stile.css`: classi `.somma-righe`, `.somma-riga`, `.spunta-ok`,
  `.somma-righe-avviso` (controllate con grep: nessun doppione).
- `app/frontend/lib/guida.ts`: «da sapere» dei Documenti con la Somma righe.
- `app/backend/test/documenti.spec.ts`: describe «somma delle righe accanto all'importo (D-153)» con due
  prove (importo uguale → niente `totale`; importo diverso → `totale` grave).
- `strumenti/prove/app_documenti.py`: blocco D-153 con scheda simulata (righe senza importo, solo
  quantità×prezzo): etichetta «Somma righe», 250,00 € all'apertura, spunta verde, si aggiorna al cambio
  del prezzo (290,00 €), avviso con la differenza (40,00 €), stesso numero del piede; schermata
  `somma-1440.png`.

## Prove

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest `test/documenti.spec.ts` su `decobrands_test_somma` (creato, migrato, poi cancellato): **62/62**
  (2 nuove: uguale e diversa).
- `python -m py_compile strumenti/prove/app_documenti.py`: **OK** (prova browser non lanciata, come da
  regole).
- DB `decobrands_test_somma` cancellato a fine prova.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: la somma non si salva mai (il PUT manda solo testata e righe); il calcolo del punto
  resta sul server (V12). Niente rilievi.
- `ponytail-review`: una sola funzione `sommaRighe` per il campo e il piede (nessun doppione); `sotto`
  opzionale minimo su `CampoLetto`. Niente da tagliare.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9 (Correggi i dati letti): «Somma righe» in sola lettura accanto all'Importo, spunta verde se
  coincide con l'importo, avviso (attesa) se differisce; non bloccante; stesso numero del piede della
  tabella (che ora somma importo, altrimenti quantità × prezzo).
- spec §16.4.2 (tabelle) o §16.4 componenti: il piede della tabella della correzione usa `sommaRighe`
  (importo ?? quantità × prezzo), non più solo gli importi.
- spec §19: decisione nuova **D-153** «somma delle righe accanto all'importo» + il perché (l'importo del
  documento e la somma delle righe possono non coincidere, per es. IVA inclusa; il controllo esiste già
  lato server come punto `totale`, qui si rende visibile in anteprima mentre si corregge).

## Aperti / da segnalare

- Il controllo server `totale` resta **grave** (marca il documento «bassa», spec §6.5 D-71), mentre
  l'avviso della finestra è «attesa». Non l'ho cambiato: porterebbe a toccare `proposta.spec.ts` e
  `documenti-lettura.spec.ts` (fuori dai file ammessi) e contraddirebbe la spec. Se Ugo vuole che un
  importo diverso non faccia scendere il livello a «bassa», è una decisione a parte.
- Il controllo esistente usa `round2` (float), la richiesta dice «mai float»: non l'ho rifattorizzato
  perché è codice già impegnato e provato; il risultato su importi a 2 decimali è identico. Da decidere
  se vale la pena il passaggio ai centesimi anche lì.
- La prova browser (app_documenti) va lanciata da Claude Code a fine onda: è l'unico punto non verificato
  qui (il blocco D-153 e la schermata `somma-1440.png`).
