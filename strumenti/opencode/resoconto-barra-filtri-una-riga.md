# Resoconto `barra-filtri-una-riga`

## Fatto
- `FilterBar.tsx`: segmenti → tendina (`<select class="filtro-select">`, `aria-label` = etichetta o
  «Stato», voci con i numeri) quando la barra va a capo; misura con `ResizeObserver` sulle righe,
  ritorno ai segmenti solo con spazio vero (isteresi +12 px). I segmenti restano nel DOM
  (`segmenti-nascosti`) per misurarne la larghezza naturale. Parametrico: vale per tutte le pagine.
- `stile.css`: ricerca più stretta (`.filtri .cerca` `flex: 0 1 260px; min-width: 180px`), entità
  compatte (`.filtri .filtro-ricerca` `max-width: 220px`), classe `.segmenti-nascosti`. Le regole
  più specifiche (soggetti, clienti, analisi) restano.
- `componenti/page.tsx`: testo del catalogo FilterBar aggiornato.
- `strumenti/regole-interfaccia.md`: nuova regola «Barra filtri su una riga; segmenti in tendina
  quando non ci stanno».

## Prove
- `npx tsc --noEmit` frontend: passa.

## Pagine che cambiano comportamento
Tutte quelle con una `FilterBar` che ha segmenti (Pratiche, Bollettini, Incassi, Analisi, …):
quando la barra non sta su una riga, i segmenti diventano una tendina invece di andare a capo.

## Da documentare
- Regola d'interfaccia nuova (già aggiunta a `strumenti/regole-interfaccia.md`); se Ugo la conferma,
  va in §16.4.1 della spec e nel §19 come decisione D-nn.

## Lampeggio (pacchetto `barra-filtri-lampeggio`, 15/11/2026)
- Causa: la decisione segmenti↔tendina dipendeva dal layout corrente (numero di righe, posizioni dei
  figli), che cambiava proprio per effetto dello scambio, e il `ResizeObserver` leggeva la barra visibile
  dopo lo scambio.
- Correzione alla radice in `FilterBar.tsx`: la decisione dipende SOLO da due grandezze che non cambiano
  con lo scambio:
  1. larghezza del contenitore: si osserva solo `.filtri` (mai i figli), si legge `clientWidth`;
  2. larghezza necessaria = segmenti a larghezza naturale (clone sempre nel DOM) + gli altri controlli a
     larghezza naturale + spazi, misurata UNA volta (in `useLayoutEffect`, impostando `width: max-content`
     sul contenitore: gli elementi stanno alla flex-basis, niente crescita né ritiro) e rimisurata solo
     quando cambiano voci e numeri (`chiaveMisura` = nome + `opzioni` + `valori`), non a ogni resize.
  `stretta = contenitore < necessaria`; si torna ai segmenti solo con `contenitore >= necessaria + 24`
  (isteresi). Nessun `setState` se il valore non cambia (`decidi`).
- `stile.css`: `.segmenti-nascosti` ora ha `width: max-content; flex-wrap: nowrap` (misura stabile del clone).
- Prova: `strumenti/prove/app_filtri_lampeggio.py` (0 cambi in 2 s su Utenti e Pratiche a 1440/1100/768 px).
  **Non lanciata qui**: richiede backend (8002) e frontend (8001), che sono i server di Ugo (vietati), e un
  processo dev in background (vietato dalle regole dell'onda). `python -m py_compile` passa; la lancia
  Claude Code a fine onda.

## Soggetti (pacchetto `barra-filtri-soggetti`, 15/11/2026)
- Causa: nei Soggetti (e Clienti, Analisi) il campo cerca/ricerca aveva `flex-grow: 1` (es.
  `.soggetti-filtri .filtri .cerca { flex: 1 1 320px; max-width: 480px }`). La misura della larghezza
  necessaria leggeva `scrollWidth` con `width: max-content`, che per i campi con `width:100%` e
  `flex-shrink/grow` attivi misura il contenuto dell'input (o il flex-basis) e non la larghezza reale:
  la barra andava a capo (ricerca cresciuta sulla prima riga, segmenti sotto) ma il componente credeva
  che tutto stesse su una riga, quindi niente tendina.
- Correzione alla radice in `FilterBar.tsx`: durante la misura si azzerano `flex-grow` e `flex-shrink`
  dei figli (flessi) e si leggono `scrollWidth`, `slot` e `clone` nello stesso istante `max-content`; la
  larghezza necessaria diventa la somma dei flex-basis, uguale alla larghezza reale. Niente ritorno del
  lampeggio (grandezze ancora stabili).
- `stile.css`: tolto `flex-grow` ai controlli (Soggetti, Clienti, `.filtro-ricerca` base) così la larghezza
  reale = flex-basis = larghezza misurata; tenute le larghezze utili (cerca Soggetti 320 px, Clienti 140 px,
  ricerca entità 170 px) che si riducono con `flex-shrink`.
- Prova: `strumenti/prove/app_filtri_lampeggio.py` allargato ai Soggetti e con un controllo «una riga»
  (i segmenti o la tendina sulla stessa riga della ricerca, mai a capo). **Non lanciata qui** (server di
  Ugo + processo in background vietati); `python -m py_compile` passa, la lancia Claude Code a fine onda.

## Da documentare
- (già in cima) Regola d'interfaccia nuova; se Ugo conferma, §16.4.1 della spec + §19 D-nn.
