# Resoconto D-53 — menu delle aree nel menu dell'utente

## File toccati

- `app/frontend/componenti/Barra.tsx`: via il pulsante dell'area in cima; il nome dell'area
  resta come titolo (`.area-titolo`). Il riquadro in fondo è un unico pulsante (`.io-btn`) che
  apre verso l'alto il menu dell'utente: email, aree con spunta, separatore, *Cambia la
  password*, *Guida*, separatore, *Esci*. Esc, clic fuori e scelta chiudono; frecce su/giù
  spostano il fuoco; alla chiusura torna al pulsante. La voce Guida non è più nel menu della
  barra.
- `app/frontend/componenti/Icona.tsx`: icona `giu` (freccia del pulsante).
- `app/frontend/app/stile/stile.css` e `prototipo-alternativo/assets/stile.css`: **identici**
  (`diff` vuoto).
- `prototipo-alternativo/assets/componenti.js`: stessa barra del prototipo (aree per gruppo,
  `AREE_MENU`, menu dell'utente, frecce e Esc, icona `giu`); *Documenti scartati* passa in
  Provvigioni, la Guida passa nel menu dell'utente.
- `prototipo-alternativo/assets/guida.js`: comandi comuni (menu dell'utente), Esci e Cambia la
  password.
- `prototipo-alternativo/LEGGIMI.md`: aree e accesso dal menu dell'utente.
- `specifica-crm-provvigioni.md`: versione 8.13, §7.1 (password/Esci nel menu), §7.10 (titolo
  dell'area in cima, menu dell'utente, tablet), §19 D-53 e nota in D-47.
- `prototipo-crm/specifica.html`: rigenerato.
- `strumenti/prove/app_menu_utente.py` (nuovo), `app_guscio.py`, `app_utenti.py`,
  `app_accesso.py`, `app_pratiche.py`: aggiornati al nuovo menu; in `app_pratiche.py` le attese
  sono portate a 1,2 s per l'elenco SQL (D-52).

## Classi CSS tolte e aggiunte

- **Tolte**: `.aree-barra`, `.aree-barra .area*`, `.area-scelta`, `.area-btn`, `.menu-aree`,
  `.menu-aree-mail`, `.menu-aree-voce`, `.menu-aree-spunta`, `.io-esci`.
- **Aggiunte**: `.area-titolo`, `.barra-piede .io-btn`, `.menu-utente`, `.menu-utente-mail`,
  `.barra-piede .menu-utente-voce`, `.menu-utente-spunta`, `.menu-sep`; regole del tablet
  (footer sticky a destra, menu verso il basso, `.barra` senza taglio quando è aperto).
- `stile.css` dell'app e del prototipo: `diff` vuoto.

## Prove

- `npx tsc --noEmit` e `npm run build` (frontend): 0 errori.
- Browser su 8011/8012, database `decobrands_test_f1a1`, utenti `f1-ammi`, `f1-oper`,
  `f1-lett` (password-di-prova):
  - `app_menu_utente.py`: **19 controlli, 0 KO**;
  - `app_guscio.py`: **20 controlli, 0 KO**;
  - `app_utenti.py`: **28 controlli, 0 KO**;
  - `app_fornitori.py`: **25 controlli, 0 KO**;
  - `app_subagenti.py`: **30 controlli, 0 KO**;
  - `app_clienti.py`: **33 controlli, 0 KO**;
  - `app_pratiche.py`: **19 controlli, 0 KO**;
  - `app_componenti.py`: **54 controlli, 0 KO**.
- `app_accesso.py`: aggiornato (`a.io-esci` → menu dell'utente → Esci), `py_compile` ok; non
  eseguito perché chiede il log del backend e `f1-nuovo` con password provvisoria. Il percorso
  Esci è coperto da `app_menu_utente.py`.
- Prototipo aperto da `prototipo-alternativo/index.html`: area Provvigioni in cima, menu sopra
  il riquadro dell'utente, email e voci giuste, nessun errore JavaScript (prova a mano con
  Playwright, non un file di prova).
- Non ho lanciato `jest` e non ho toccato il backend (come chiesto).
- Per far funzionare l'elenco nella prova ho applicato alla sola `decobrands_test_f1a1` la
  migrazione già presente `20261103090000_pratiche_riepilogo` e `npm run pratiche:ricalcola`
  (l'API diceva `t.importo non esiste`); nessuna modifica al codice del server.

## Schermate (guardate)

`%TEMP%\menu-utente\`:
- `menu-utente-aperto-1440.png`, `menu-utente-chiuso-1440.png`;
- `menu-utente-aperto-768.png`, `menu-utente-chiuso-768.png`;
- `prototipo-menu-utente-1440.png`.

Il menu desktop si apre sopra il riquadro dell'utente; sul tablet si apre sotto la barra,
altrimenti uscirebbe dallo schermo. Le voci sono alte ~36 px, con icona, separatori e ombra.

## Dubbi

- **`f1-super`**: la richiesta dice «superutente, vede tutte le aree», ma nel database di prova
  non ha livelli nelle aree e la regola D-45 dice che anche il superutente entra in un'area
  solo con un livello. Infatti vede solo Gestione. Ho provato tutte e tre le aree con `f1-ammi`
  e la restrizione con `f1-oper`/`f1-lett`. Se `f1-super` deve vederle tutte, vanno dati i
  livelli a quell'utente (dati, non codice) oppure si cambia D-45.
- **Tablet**: il menu si apre verso il basso perché la barra è in cima; verso l'alto sarebbe
  fuori schermo. La decisione è scritta in D-53/spec §7.10.
- **Prototipo**: sotto il pulsante utente restano i comandi della demo (*Prova come*, data
  simulata, *Ripristina*, *Componenti*), che nell'app non esistono. Il menu dell'utente è
  quello vero; i comandi demo non fanno parte dell'interfaccia di produzione.
- Il fuoco torna al pulsante anche quando il menu si chiude con un clic fuori, non solo con
  Esc (come chiesto).
- `app_pratiche.py`: attese portate a 1,2 s perché l'elenco SQL può rispondere dopo 0,8 s sotto
  carico; nessuna modifica alla pagina.
