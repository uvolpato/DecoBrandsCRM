# Prompt per OpenCode — caricamento con sagome (D-59)

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM` **dopo** che hai finito i ritocchi del
bollettino. È un lavoro da Sonnet: usa il modello caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `ui-ux-pro-max`, `vercel-react-best-practices`,
`nextjs-app-router-patterns`, `webapp-testing` e `playwright-best-practices`. Prima di cercare nei file
usa `graphify query "<domanda>"`.

## Problema (Ugo, 03/11/2026)

Quando si clicca una voce di menu, il titolo della pagina compare subito, come deve. Subito dopo
però compaiono per un attimo scritte provvisorie: segmenti a 0, «Nessuna pratica», tabelle vuote,
testi senza dati. Solo poi arriva il layout vero. Non va bene.

## Decisione: D-59, sagome (skeleton)

- Il **titolo** e il sottotitolo della `Pagina` si vedono subito.
- Tutto il resto, finché i dati della pagina non sono arrivati, si mostra come **sagome**: blocchi
  grigio chiaro con la stessa forma del contenuto vero (segmenti, filtri, righe della tabella,
  riquadri, numeri dei Kpi) e una luce che scorre da sinistra a destra.
- Quando arrivano i dati, le sagome si sostituiscono **senza spostare il layout**: le sagome hanno
  le stesse altezze del contenuto vero.
- Durante il caricamento non si mostrano mai **0**, «Nessun elemento» o testi vuoti.
- Se il caricamento dura meno di circa 150 ms, le sagome non compaiono, per evitare il lampo, e si
  passa diretti al contenuto.
- Con `prefers-reduced-motion` la luce non scorre: la sagoma resta ferma.
- Accessibilità: il contenitore ha `aria-busy="true"` durante il caricamento, e le sagome hanno
  `aria-hidden`.

**È lo standard di tutta l'app** (Ugo, 03/11/2026; regola già scritta in `CLAUDE.md` §3). Il
componente deve essere riusabile così com'è da ogni pagina futura, con una sola riga, e deve
coprire **tutte** le pagine che caricano dati, non solo quelle dell'elenco qui sotto. Mettilo anche
nella guida per chi sviluppa (spec §16.4: "come si usa in una pagina nuova", con un esempio di 3-5
righe).

## Come

1. **Componenti** in `app/frontend/componenti/`, parametrici e pochi (ponytail):
   - `Sagoma` per un blocco: larghezza, altezza, arrotondato;
   - le varianti già pronte che servono davvero, cioè `SagomaTabella` (righe × colonne, con
     l'intestazione vera se le colonne sono già note), `SagomaSegmenti`, `SagomaRiquadri`.

   Mettile nel catalogo `/componenti` e nella spec §16.4.
2. **Classi CSS**: in `stile.css`, prima con `grep` per non creare doppioni. L'animazione va fatta
   con `@keyframes` e `background-position`, senza librerie. I due `stile.css`, app e prototipo,
   restano **identici**.
3. **Integrazione**: il punto unico migliore è dove la pagina sa che sta caricando. Guarda come
   caricano i dati `VistaPratiche`, `VistaPratica`, `VistaBollettini`, `VistaBollettino`,
   `VistaClienti`, `VistaFornitori`, `VistaSubagenti`, Utenti. Se si ripete lo stesso schema
   (`useEffect` + `setDati`), metti lo stato «sto caricando» in un solo posto. Due esempi:
   - `DataTable` con una prop `caricando`, che mostra `SagomaTabella` invece di «Nessun elemento»;
   - un piccolo hook `useCarica(url)` che restituisce `{dati, caricando, errore}` e gestisce la
     soglia dei 150 ms.

   Scegli il modo più corto che copre tutte le pagine. Non riscrivere le pagine. I filtri e i
   segmenti restano visibili e cliccabili; durante il caricamento cambiano solo i loro **numeri**,
   che diventano piccole sagome.
4. **Cambio di filtro o di pagina dell'elenco**, quando i dati ci sono già: niente sagome, così la
   tabella non sparisce. La tabella resta com'è con una leggera opacità (`.in-aggiornamento`)
   finché arrivano i dati nuovi.
5. **Prototipo**: aggiungi lo stesso componente al catalogo `viste-componenti.js`. Il prototipo
   non carica dal server, quindi basta l'esempio.

## Documenti

- Spec `specifica-crm-provvigioni.md`:
  - §16.4: i componenti nuovi e la regola di D-59, con la riga *Perché*: «la pagina non mostra mai
    zeri o testi vuoti finti; il layout non salta»;
  - D-59 in §19;
  - la versione in testa.
- **Scrivi la spec in UTF-8 senza BOM, con le righe LF.** La volta scorsa una scrittura da
  PowerShell ha rovinato gli accenti. Usa lo strumento di modifica, non `Set-Content` né
  `Out-File`.
- Poi lancia `python strumenti/genera-pagine-doc.py`.

## Regole

- Italiano semplice. Codice minimo. Niente librerie nuove.
- **Non chiudere processi node che non hai avviato tu.** Usa porte libere, non 8001 e 8002.
- Prove sul database `decobrands_test_f3a1`, utenti `f3-*`.
- Niente commit, niente push, niente `.env`.

## Prove

1. In `app/frontend`, lancia `npx tsc --noEmit` e `npm run build`.
2. Nel browser, con il backend **rallentato** (per esempio con `page.route` di Playwright che
   ritarda `/api/*` di 800 ms), scrivi `strumenti/prove/app_caricamento.py`. Per Pratiche, Pratica,
   Bollettini, Bollettino, Clienti e Fornitori controlla:
   - il titolo si vede subito;
   - durante il ritardo ci sono le sagome e `aria-busy` vale `true`;
   - non compaiono «Nessun», «0 elementi» né segmenti a 0;
   - dopo il ritardo il contenuto vero c'è e le sagome non ci sono più;
   - la posizione verticale della prima riga della tabella cambia al massimo di 4 px fra sagoma e
     contenuto;
   - con un ritardo di 50 ms le sagome non compaiono mai;
   - quando si cambia filtro la tabella non sparisce;
   - non ci sono errori JavaScript.
3. Rilancia `app_pratiche.py`, `app_pratica.py`, `app_bollettini.py`, `app_bollettino.py`,
   `app_clienti.py`, `app_fornitori.py` e `app_componenti.py`. Tutte devono chiudere con 0 KO.
4. Fai le schermate a 1440 e a 768 px, durante il caricamento e dopo, in `%TEMP%\sagome`, e
   **guardale**.

## Resoconto

Scrivi `strumenti/opencode/resoconto-caricamento-sagome.md` con:
- i file toccati;
- il punto in cui hai messo lo stato di caricamento;
- l'esito delle prove;
- le schermate;
- i dubbi.
