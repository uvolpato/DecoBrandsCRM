# Resoconto F3-A2 — Pagine del dettaglio del bollettino (a cerniera)

## File toccati

**Frontend**
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx` (nuovo): la pagina del bollettino.
  - testata con fornitore, mese, badge, ricevuto, file e maturazione;
  - azione proposta in alto (`barra-decisione`) e totali nella cerniera;
  - `Cerniera` (componente già esistente) con i gruppi *Da decidere · Decise · Quadrano ·
    Incassi*; ogni riga ha cliente (collegato alla pratica), data, categoria, motivo e autore
    della decisione, i due lati e la differenza;
  - decisioni: *Accetta il loro importo* (motivo facoltativo), *Contesta* (motivo obbligatorio:
    il messaggio del server resta nella finestra), *Attendi il prossimo* sui documenti mancanti,
    *Annulla* per togliere una decisione (D-49, D-56);
  - *Abbina il documento*: si sceglie fra i documenti del mese che compaiono nel dettaglio
    (righe del fornitore e documenti mancanti), quindi senza una rotta in più; il 409 del
    server (documento già su un'altra riga) si vede nella finestra;
  - chiusura *Segna come verificato / contestato* solo quando l'azione è *verifica/contesta*,
    con conferma che il mese diventa chiuso; dopo la pagina è in sola lettura;
  - PDF del bollettino affiancato a sinistra (`/api/documenti/<arrivo>/file`), sul tablet sopra
    la cerniera;
  - chi non ha `provvigioni.modifica` non vede i pulsanti di scrittura; il periodo e il filtro
    della matrice si ritrovano tornando indietro (§7.12).
- `app/frontend/app/(app)/bollettini/[id]/page.tsx`: non è più il segnaposto, monta `VistaBollettino`.
- `app/frontend/lib/entita.ts`: entità `documentoMese` (voci dal `contesto.documenti` del
  dettaglio, nessuna chiamata al server).

**Prove e documenti**
- `strumenti/prove/app_bollettino.py` (nuovo): 26 controlli.
- `strumenti/prove/app_bollettini.py`: aggiornato il controllo della cella della matrice: il
  dettaglio non è più un segnaposto, si aspetta la cerniera.
- `specifica-crm-provvigioni.md`: versione **8.20**, §7.7 (pagina nell'app: PDF, decisioni,
  abbinamento fra i documenti del dettaglio, chiusura spenta con righe aperte, sola lettura).
- `prototipo-alternativo/assets/guida.js`: pagina Bollettini (abbinamento, chiusura, PDF,
  regole su motivo, attesa e mese chiuso).
- `prototipo-crm/specifica.html` rigenerato con `python strumenti/genera-pagine-doc.py`.

## Prove

- **Server**: non toccato (F3-A2 server è del commit `d14e8c7`). `test/bollettini.spec.ts`
  (F3-A1) usato per svuotare e riseminare il database di prova: **12/12 OK**.
- **Frontend**:
  - `npx tsc --noEmit` in `app/frontend`: restano solo i due errori noti dei tipi
    `.next/dev` rimasti dal server di sviluppo acceso sulla 8001 (il percorso `/bollettini`
    non era nella sua build); nessun errore nei file miei.
  - `next build --webpack` su una copia isolata della stessa cartella (per non riscrivere il
    `.next` servito sulla 8011): build e TypeScript **OK**.
- **Browser** (backend su 8032, frontend su 8031; 8011/8012 erano occupate dai processi della
  sessione F3-A1/F3-A2, non miei):
  - `app_bollettino.py f3`: **26 controlli, 0 KO**. Coprono: cerniera, gruppi e totali del seed
    contro il prototipo (Gries luglio 2.228,10 / 2.260,80 / −32,70; Gasper agosto 394,80 /
    3.349,38 / −2.954,58), azione proposta e chiusura spenta, abbinamento a un documento già
    usato con errore visibile, *Accetta* su una differenza, *Attendi il prossimo* e annullamento
    sul mancante, abbinamento D→E con la vecchia riga che torna mancante, chiusura *verificato*
    con conferma e pagina in sola lettura, PDF affiancato (bollettino nuovo caricato dalla
    matrice), ritorno alla matrice con periodo e filtro, sola lettura senza pulsanti, 768 px,
    nessun errore JavaScript.
  - `app_bollettini.py f3`: **22 controlli, 0 KO** (aggiornato il controllo del dettaglio).
  - `app_componenti.py f3`: **54 controlli, 0 KO**.
- La prova chiude Gasper agosto e carica un bollettino: alla fine il database `decobrands_test_f3a1`
  è stato riseminato (seed + utenti `f3-*`).

## Schermate

In `%TEMP%\f3-a2` (guardate):
- `app-bollettino-1440.png` (Gasper agosto, cerniera e azione);
- `app-bollettino-cerniera-768.png` (tablet, cerniera);
- `app-bollettino-verificato-1440.png` (dopo la chiusura, sola lettura);
- `app-bollettino-768.png` (bollettino con PDF, tablet).

A 768 px la pagina non scorre di lato: la cerniera scorre dentro di sé (le colonne restano
960 px, come nel prototipo), quindi i pulsanti a destra si raggiungono scorrendo la cerniera.

## Dubbi

1. **Chiusura con righe aperte**: il prompt chiedeva "errore visibile", ma la pagina dice anche
   che il pulsante è attivo solo con azione *verifica/contesta*. Con righe aperte il pulsante è
   quindi spento (e il testo dice quante righe mancano); il 409 del server resta come rete di
   sicurezza. Se si vuole vedere il messaggio anche da qui, va deciso di lasciare il pulsante
   attivo con le righe aperte.
2. **Documenti per l'abbinamento**: non c'è una rotta per cercare i documenti di un fornitore e
   il server non andava toccato. Uso i documenti del mese che il dettaglio già restituisce
   (righe del fornitore + documenti mancanti): coprono tutti i documenti del bollettino, ma non
   un documento fuori dal mese o che la riconciliazione non tocca.
3. **768 px**: la cerniera ha una larghezza minima di 960 px (stile condiviso con il prototipo)
   e scorre di lato; i pulsanti non sono subito visibili. Se Ugo preferisce, sul tablet si può
   trasformare in schede a due righe (cambiamento di `stile.css` in entrambi i file).
4. **Incassi**: il gruppo c'è, ma i dettagli (storno/riaccredito con *Prepara il sollecito al
   cliente*, giorni d'incasso del fornitore) sono F3-A3. Ora mostra lo stato essenziale.
5. **PDF**: il seed non ha bollettini con file; la prova ne carica uno con la finestra di F3-A1.
   In Chromium headless l'`<object>` mostra il testo alternativo con il link; in Chrome il PDF
   si vede. La pagina dice "nessun file allegato" quando manca.
6. **Doppia riga con lo stesso numero** dopo un abbinamento D→E (F-2026-0921 del fornitore e
   F-2026-0921 mancante): è previsto da D-56; la categoria ("importo diverso" / "manca nel
   bollettino") le distingue.
7. **Niente "Prepara la contestazione"**: il testo da inviare al fornitore non è in questa
   pagina (non richiesto dal prompt; il server non lo fornisce).
