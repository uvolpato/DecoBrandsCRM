# Resoconto — caricamento con sagome (D-59)

Data: 03/11/2026. Lavoro sul frontend (Next.js) e sul prototipo; nessuna modifica al backend.

## File toccati

**App** (`app/frontend/`)
- `componenti/Sagoma.tsx` (nuovo): `Sagoma`, `SagomaTabella`, `SagomaSegmenti`, `SagomaRiquadri`,
  `SagomaMatrice`, `SagomaCorpo`, `SagomaScheda`, `SagomaElenco` e l'hook `useSagome`.
- `componenti/DataTable.tsx`: prop `caricando` (sagome al primo caricamento, `.in-aggiornamento`
  con righe già a schermo, piede con sagoma, `aria-busy`).
- `componenti/FilterBar.tsx`: prop `caricando`, numeri dei segmenti come piccole sagome.
- `app/(app)/pratiche/VistaPratiche.tsx`, `pratiche/[id]/VistaPratica.tsx`,
  `bollettini/VistaBollettini.tsx`, `bollettini/[id]/VistaBollettino.tsx`,
  `clienti/VistaClienti.tsx`, `fornitori/VistaFornitori.tsx`,
  `subagenti/VistaSubagenti.tsx`, `utenti/VistaUtenti.tsx`.
- `app/(app)/componenti/page.tsx`: voce *Sagoma* nel catalogo con esempio.
- `app/stile/stile.css`: `.sagoma`, animazione, `.in-aggiornamento`, `.colonne > * { min-width: 0 }`.

**Prototipo** (`prototipo-alternativo/`)
- `assets/componenti.js`: `CRM.Sagoma`.
- `assets/viste-componenti.js`: voce *Sagoma* nel catalogo.
- `assets/stile.css`: identico all'app (`.sagoma`, animazione, `.in-aggiornamento`, `min-width`).
- `LEGGIMI.md`: componente e regola D-59.

**Documenti**
- `specifica-crm-provvigioni.md`: versione 8.23, riga *Sagoma* in §16.4, nuova §16.4.3 (regole e
  esempio d'uso di 3 righe), D-59 in §19.
- `piano-lavoro-crm.md`: F0-A4, 1 h **da approvare** per le sagome.
- `prototipo-crm/specifica.html` rigenerata con `python strumenti/genera-pagine-doc.py`.

**Prove**
- `strumenti/prove/app_caricamento.py` (nuovo).

## Dove sta lo stato di caricamento

- **Pratiche**: stato `caricando` nella vista, `useSagome(caricando)`; il primo caricamento parte
  subito (niente debounce di 250 ms), i cambi di filtro/ordine/pagina mantengono i 250 ms. La
  DataTable riceve `caricando={sagome}`, la FilterBar `caricando={sagome && !dati}` (i numeri
  diventano sagome solo al primo caricamento, non a ogni filtro).
- **Bollettini**: stesso schema; `SagomaMatrice` al posto della matrice e `Sagoma` al posto del
  selettore dei mesi.
- **Pratica, Bollettino**: `useSagome(!d)` / `useSagome(!d || !fiscali)`; il ramo "prima dei dati"
  compone `Sagoma`, `SagomaCorpo`, pannelli con la stessa struttura della pagina.
- **Clienti, Fornitori, Subagenti, Utenti**: `useSagome(!dati)`; il ramo senza dati compone
  `SagomaElenco`, che usa la **stessa FilterBar** della pagina (stesso numero di righe, stesse
  larghezze `--colonne`) e `SagomaTabella`; la scheda di destra è `SagomaCorpo` finché il dettaglio
  non arriva. La tabella Pratiche del cliente e le percentuali del fornitore hanno `caricando`.

## Prove

Database di prova `decobrands_test_f3a1` ricreato da zero (migrazioni + seed) per le prove che
consumano i dati (bollettini, clienti). Gli utenti `f3-*` che c'erano non avevano le aree: le prove
sono state fatte con `<s>-ammi` = `car-*` da `utenti_prova.js` (più `car-super` per il catalogo).
Alla fine il database è stato ripulito e lasciato con `f3-ammi`, `f3-oper`, `f3-lett`, `f3-nuovo` e
`f3-super`; `app_caricamento.py` è stato rilanciato con `f3-ammi`: **43 controlli, 0 KO**. Backend
su **8014**, frontend su **8013** (le porte 8001/8002 non sono state toccate).

| Prova | Esito |
|---|---|
| `app_caricamento.py car … http://127.0.0.1:8013` | **43 controlli, 0 KO** |
| `app_pratiche.py` | **19 controlli, 0 KO** |
| `app_pratica.py` | **42 controlli, 0 KO** |
| `app_bollettini.py` | **22 controlli, 0 KO** |
| `app_bollettino.py` | **42 controlli, 0 KO** |
| `app_clienti.py` | **33 controlli, 0 KO** |
| `app_fornitori.py` | **25 controlli, 0 KO** |
| `app_componenti.py` | **54 controlli, 0 KO** |

`app_caricamento.py` rallenta la rete con il CDP (`Network.emulateNetworkConditions`, 800 ms) senza
bloccare il test e controlla, per Bollettini, Pratiche, Pratica, Bollettino, Clienti, Fornitori:
titolo subito; sagome e `aria-busy` durante il caricamento; niente «Nessun…», «0 elementi» o
segmenti a 0; sagome sparite a dati arrivati; prima riga della tabella entro 4 px fra sagoma e
contenuto (Pratiche 232,0 → 232,0; Clienti 280,3 → 280,3; Fornitori 203,4 → 203,4); cambio filtro con
la tabella che resta e si attenua; nessun errore JavaScript. Il caso "sotto i 150 ms" usa una
risposta dell'elenco servita in 50 ms (le query vere del server locale durano 250–570 ms: con una
latenza di rete di 50 ms le sagome comparirebbero legittimamente).

`npx tsc --noEmit` e `npm run build` chiudono senza errori.

Alcune prove esistenti hanno avuto un KO isolato per i loro tempi fissi (1,2 s) sotto carico
(ordinamento Pratiche, un modale di Clienti, un annulla di Bollettino): rilanciate, chiudono 0 KO.
Non dipendono dalle sagome.

## Schermate

In `%TEMP%\sagome`, guardate:
- `sagome-pratiche-1440.png` / `pratiche-1440.png`
- `sagome-pratiche-768.png` / `pratiche-768.png`
- `sagome-clienti-1440.png` / `clienti-1440.png`
- `sagome-clienti-768.png` / `clienti-768.png`
- `sagome-fornitori-1440.png` / `fornitori-1440.png`
- `sagome-pratica-1440.png`, `sagome-bollettini-1440.png`, `sagome-bollettino-1440.png`.

## Dubbi

- Il filtro dei 150 ms non si può provare con la latenza di rete reale su questo server: le query
  dell'elenco durano più di 150 ms. La prova usa una risposta servita in 50 ms; è lo stesso caso
  d'uso (caricamento veloce) senza dipendere dalla velocità del database.
- Per non far saltare la colonna sinistra ho aggiunto `min-width: 0` a `.colonne > *`: le due
  colonne tengono le proporzioni anche quando il pannello di destra ha tabelle larghe (era il caso
  di Clienti, che spostava la prima riga di 48 px). Le tabelle continuano a scorrere dentro il
  pannello. Va guardato sulle altre pagine a due colonne (Liquidazioni quando arriverà).
- `SagomaElenco` riceve la FilterBar già costruita dalla pagina: chi cambia i campi deve cambiare
  anche là (è lo stesso elemento, quindi non si duplica).
- La matrice in caricamento non usa più le classi `.m-cella`/`.m-riga`: così i selettori delle prove
  esistenti continuano a trovare solo le celle vere.
- Il prototipo ha solo il componente nel catalogo, come chiesto: non carica dal server, quindi non
  ha le sagome nelle viste.

## Aggiunta — colonna *Differenza* della cerniera

Segnalazione di Ugo: nel riepilogo del bollettino ci deve stare `999.999.999,99 €`. La colonna era
fissa a 140 px e il valore andava a capo. Ora è `minmax(230px, 1fr)` (a capo vietato sul valore):
ci sta, e riepilogo e righe hanno la stessa larghezza, quindi la cucitura resta in asse. CSS in
`stile.css` (uguale nel prototipo); spec §16.4, versione 8.24. Provato nell'app con il valore
inserito a mano: cella 230 px, valore su una riga (`cerniera-differenza-999-1440.png`).
