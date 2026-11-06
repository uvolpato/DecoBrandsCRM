# Ritocchi prima del collaudo: menu, Torna a, ✓ per campo, consulta affiancati, pillola

Data: 07/11/2026 · ramo `main` · nessuna migrazione.

## Cosa è cambiato

- **Numeri del menu (D-75).** `GET /api/oggi/conteggi` (`provvigioni.consulta`) restituisce `oggi`,
  `documenti`, `pratiche`, `bollettini` calcolati dal database con le funzioni della pagina Oggi.
  `componenti/Barra.tsx` li legge a ogni cambio pagina: Documenti e Pratiche in giallo quando c'è
  qualcosa da fare, gli altri in grigio; a zero non compaiono.
- **Torna a … (D-76).** `componenti/Pagina.tsx` ricorda l'ultimo percorso aperto e mostra un pulsante
  secondario con la voce di destinazione e l'articolo giusto; usa `router.back()` (memoria di §7.12),
  non compare dopo un accesso diretto, resta attivo in sola lettura. Tolti i pulsanti scritti a mano
  *Torna alle pratiche* e *Torna ai bollettini*.
- **✓ per campo (D-77).** Nella finestra di correzione ogni campo incerto ha il segno di conferma:
  diventa verde e il riepilogo si aggiorna subito. `PUT /api/documenti/:id` riceve `verificati` e
  segna verificati solo i campi cambiati, confermati o già verificati (sostituisce il "tutto
  verificato" di D-72).
- **Consulta affiancati (D-78).** `GET /api/pratiche/:id/documenti` restituisce anche `righe` e
  `riferimento` (nota di credito). `componenti/ConsultaDocumenti.tsx` apre il confronto: schede dei
  documenti, file a sinistra, dati e confronto riga per riga a destra, *Confrontato con*, differenza,
  segmenti *Solo righe che cambiano / Tutte*, ← → per cambiare documento, riga selezionata. Il
  pulsante *Consulta affiancati* e il clic su un documento o su una riga a confronto aprono la stessa
  finestra. Il rettangolo sul PDF resta rinviato (D-06).
- **Pillola del titolo (D-79).** `.testa .testa-badge` ha 10 px di spazio dal numero.
- **PDF riapribile.** Nel pannello del documento di `/documenti` il pulsante *PDF* riapre il file
  originale accanto ai dati letti.

## Prove

- `npx tsc --noEmit` backend e frontend puliti.
- Backend: `documenti`, `documenti-lettura`, `documenti-pratica`, `oggi` 71/71; `bollettino`,
  `pratiche`, `incassi` 41/41.
- Browser (frontend in `next dev`, backend `start:dev`): `app_documenti.py` 32 OK,
  `app_pratica.py` 85 OK, `app_liquidazioni.py` 74 OK, `app_menu_utente.py` 19 OK.
- Controllo manuale: menu con 30/11/9/7 (Oggi/Documenti/Pratiche/Bollettini a oggi), *Torna alle
  Pratiche* a 10 px dalla pillola, ✓ che porta il riepilogo a "tutti i campi sono controllati",
  confronto sulla pratica OF/2026/029 con 4 schede e riga `ANFO-448` selezionata, nessun errore JS.
