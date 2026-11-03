# Prompt per OpenCode: menu delle aree nel menu dell'utente (D-53)

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da Sonnet: si fa
con il modello caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `ui-ux-pro-max`, `nextjs-app-router-patterns`,
`webapp-testing` e `playwright-best-practices`. Per orientarti usa `graphify query "<domanda>"`
prima di cercare nei file.

## Decisione di Ugo (03/11/2026), da registrare come D-53

Il menu delle aree si sposta: non si apre più dal pulsante in cima alla barra laterale, ma
**cliccando sull'utente in fondo alla barra**, come il menu del profilo di claude.ai. Si apre
**verso l'alto**, appoggiato sopra il riquadro dell'utente, e contiene nell'ordine:

1. l'**email** dell'utente (testo tenue, non cliccabile);
2. le **aree** che l'utente può aprire (Provvigioni, Dati, Gestione), ognuna con la sua icona;
   l'area attuale ha la spunta a destra;
3. una riga di separazione;
4. **Cambia la password** e **Guida**, con le loro icone;
5. una riga di separazione;
6. **Esci**, con la sua icona.

Il riquadro dell'utente in fondo alla barra diventa un unico pulsante: sigla, nome, ruolo e la
freccia `giu` a destra (`aria-haspopup="menu"`, `aria-expanded`). Spariscono dalla barra:
- il pulsante dell'area in cima (`.area-btn`);
- l'icona Esci accanto al nome;
- il link *Cambia la password* sotto il nome;
- la voce Guida nel menu della barra, perché passa nel menu dell'utente.

In cima alla barra resta il **nome dell'area attuale** (icona e testo), solo come titolo, senza
menu. Se l'utente ha una sola area, il menu dell'utente si apre lo stesso, senza la parte delle
aree.

Come si comporta il menu:
- si chiude con Esc, con un clic fuori o scegliendo una voce;
- si naviga con le frecce su e giù, con `role="menu"` e `role="menuitem"`;
- quando si apre, il fuoco va sulla prima voce;
- quando si chiude, il fuoco torna al pulsante.

Questa logica c'è già oggi in `app/frontend/componenti/Barra.tsx`, righe ~64–110: spostala e
riusala, non riscriverla.

**Stile**, come nell'immagine di riferimento:
- pannello bianco con angoli arrotondati e un'ombra morbida;
- voci alte circa 36 px, icona a sinistra e testo;
- passaggio del mouse con sfondo tenue;
- separatori sottili;
- larghezza uguale a quella della barra meno i margini.

Usa le variabili e le classi di `stile.css`. Prima di creare una classe nuova, controlla con `grep`
che non esista già (CLAUDE.md, punto 3). Riusa e rinomina `.menu-aree*` dove ha senso, senza
lasciare classi morte. I due `stile.css` (app e prototipo) devono restare **identici**, con `diff`
vuoto.

## Dove

- **App:**
  - `app/frontend/componenti/Barra.tsx`;
  - `app/frontend/app/stile/stile.css`;
  - le icone in `componenti/Icona` (usa quelle che ci sono: `spunta`, `giu`, `esci`, la chiave o
    il lucchetto per la password, `guida`; se ne manca una, aggiungila come le altre).
- **Prototipo** (resta la sorgente dell'idea, CLAUDE.md §3): `prototipo-alternativo/assets/componenti.js`
  (la barra), `assets/stile.css` (copia identica di quello dell'app), `viste-gestione.js` se ci
  sono riferimenti al vecchio menu.
- **Documenti:**
  - spec `specifica-crm-provvigioni.md`:
    - §7.1, dove si parla della barra e del *Menu per area* (righe ~1947 e ~1983): descrivi il
      menu dell'utente, con una riga *Perché*: "un solo posto per tutto quello che riguarda chi
      sei e dove lavori, come nelle app che gli utenti usano già; la barra resta per le voci
      dell'area";
    - §19: aggiungi D-53, con data, decisione, perché, chi (Ugo) e dove; nella riga di D-47
      aggiungi "menu spostato da D-53";
    - in testa, alza la versione e scrivi il riassunto del cambio;
  - `prototipo-alternativo/assets/guida.js`: le frasi che dicono dove si cambia area, dove si
    cambia la password e dove si esce;
  - `prototipo-alternativo/LEGGIMI.md`, se ne parla;
  - poi lancia `python3 strumenti/genera-pagine-doc.py`.

## Regole

- Italiano semplice nel codice, nei commenti e nell'interfaccia. Commenti brevi con il rimando
  alla decisione (`// D-53 §19`).
- Codice minimo (ponytail): niente componenti nuovi, se basta spostare il markup che c'è già.
- Niente telefono (D-44): prova a 1440 px e a 768 px.
- Niente commit, niente push, niente `.env`.
- **Non toccare il backend.** In questo momento un altro lavoro sta cambiando
  `app/backend/src/pratiche.ts` e il database di prova `decobrands_test`. Non lanciare `jest` e non
  usare `decobrands_test` per le prove nel browser: usa `decobrands_test_f1a1`.
- Ugo ha i server di sviluppo accesi sulle porte 8001 e 8002: non toccarli. Per le prove usa le
  porte 8011 e 8012.

## Prove

1. In `app/frontend`, lancia `npx tsc --noEmit` e `npm run build`.
2. Avvia i server di prova:
   - backend, in `app/backend`: `npm run build`, poi `node dist/src/main.js` con:
     - `DATABASE_URL` che punta a `decobrands_test_f1a1`;
     - `PORT=8012`;
     - `TENTATIVI=1000` e `TENTATIVI_IP=1000`;
   - frontend, in `app/frontend`, con `BACKEND_URL=http://127.0.0.1:8012`: `npm run build`, poi
     `node node_modules/next/dist/bin/next start -p 8011 -H 127.0.0.1`.

   Utenti di prova:
   - `f1-super`: superutente, vede tutte le aree;
   - `f1-ammi`;
   - `f1-oper`: deve vedere solo le sue aree.

   Per tutti la password è `password-di-prova`.
3. Aggiorna le prove nel browser che usano il vecchio menu: cerca in `strumenti/prove/app_*.py`
   `area-btn`, `menu-aree`, `Cambia la password` e `io-esci`. Poi aggiungi a `app_componenti.py`
   (o a una prova nuova, `app_menu_utente.py`) questi controlli:
   - un clic sull'utente apre il menu verso l'alto: il bordo basso del menu sta sopra il riquadro
     dell'utente;
   - nel menu ci sono l'email, le aree con la spunta su quella attuale, Cambia la password, Guida
     ed Esci;
   - scegliendo un'area si va alla sua prima pagina, e il titolo in cima alla barra cambia;
   - Esc chiude il menu e il fuoco torna al pulsante; anche un clic fuori lo chiude;
   - le frecce spostano il fuoco fra le voci;
   - `f1-oper` vede solo le aree che può aprire;
   - Esci porta alla pagina d'accesso;
   - nessun errore JavaScript.

   Lancia anche `app_fornitori.py`, `app_subagenti.py`, `app_clienti.py`, `app_pratiche.py` e
   `app_componenti.py`. Tutte devono chiudere con 0 KO.
4. Fai le schermate a 1440 px e a 768 px della barra con il menu aperto e con il menu chiuso,
   e mettile in `%TEMP%\menu-utente`. **Guardale**.
5. Chiudi i processi sulle porte 8011 e 8012.

## Resoconto

Scrivi `strumenti/opencode/resoconto-menu-utente.md` con:
- i file toccati;
- le classi CSS cambiate o tolte;
- l'esito di ogni prova (numero di controlli e KO);
- il percorso delle schermate;
- i dubbi.
