# Prompt per OpenCode — F2-A1 Elenco pratiche

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da Sonnet: usa
il modello caricato nella sessione, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`nextjs-app-router-patterns`, `ui-ux-pro-max`, `javascript-typescript-jest`, `webapp-testing` e
`playwright-best-practices`. Per orientarti usa `graphify query "<domanda>"` prima di cercare nei
file.

## Compito

F2-A1 è l'elenco delle pratiche, come la pagina *Pratiche* del prototipo
(`prototipo-alternativo/assets/viste-giorno.js`). Comprende:
- i segmenti di stato con i conteggi;
- i filtri standard;
- la DataTable;
- il segno delle variazioni.

Da leggere:
- `piano-lavoro-crm.md`, riga **F2-A1**;
- spec `specifica-crm-provvigioni.md`: §7.2 (la pagina), §8.1 (le API), §15.2.4, §16.4.1 (filtri
  standard, D-22 e D-23), §7.12 (memoria della schermata), §5 (stato della pratica);
- motore del server: `app/backend/src/motore/motore.ts`, in particolare `statoPratica` e
  `confronto`, e `motore/dati.ts` (`caricaDati`). **Lo stato si ricava dai documenti con
  `statoPratica`, non si scrive a mano e non si ricalcola nel browser.**

Da consegnare:

1. **Server**: `GET /api/pratiche` in un file nuovo `app/backend/src/pratiche.ts`, registrato in
   `app.module.ts`.
   - **Permesso**: guarda in `src/accesso.ts` quello giusto per le pratiche. Se non c'è, scrivilo
     nei dubbi e usa quello più vicino. Non inventare aree nuove.
   - **Filtri**: fornitore, cliente, subagente (a selezione multipla, come elenco di id), periodo,
     testo e stato.
   - **Paginazione e ordinamento sul server**. Ordinamento, totali e conteggi valgono su **tutto**
     l'elenco filtrato.
   - **Conteggi dei segmenti di stato**: contano con gli altri filtri applicati, senza il filtro di
     stato (D-23).
   - **Calcoli dal database**: stato, importi e segno delle variazioni si calcolano sul server
     (V12), riusando il motore. Niente formule doppie.
   - **Risposta**: `{ righe, totale, conteggi: { <stato>: n }, totali: {...} }`. La forma è tua:
     scrivila nel resoconto.
2. **Pagina** `app/frontend/app/(app)/pratiche/` (`page.tsx`, `layout.tsx` e `VistaPratiche.tsx`,
   come le altre pagine dell'area). Usa solo i componenti che ci sono già:
   - `FilterBar` con `ricerca` + `multipla` per le entità e il `riepilogo`;
   - i segmenti con i numeri dal server;
   - `DataTable`;
   - `PeriodoMesi`, se il prototipo lo usa;
   - la memoria della schermata (`lib/memoria.ts`).

   La voce della barra va dove sta nel prototipo. Il clic su una riga porta al dettaglio
   `/pratiche/<id>`: per ora una pagina vuota con il titolo, perché il dettaglio vero è F2-A2.
3. **Guida** (`prototipo-alternativo/assets/guida.js`) e spec §7.2/§8.1: aggiornale se l'app è
   diversa dal prototipo. Poi lancia `python3 strumenti/genera-pagine-doc.py`.

## Regole

- Tutto sul backend, mai dai dati del frontend (V12). Una lettura non scrive niente.
- Italiano semplice nel codice, nei commenti e nell'interfaccia. Commenti brevi con il rimando
  (`// D-23 §19`).
- Codice minimo (ponytail): riusa gli helper che ci sono già (vedi `src/clienti.ts` e
  `src/fornitori.ts` per filtri, paginazione e permessi).
- I numeri sul seed devono coincidere con il prototipo (stessi conteggi per stato, stessi totali).
- Prove sul database `decobrands_test`, mai su `decobrands_db`. Niente commit, niente push, niente
  `.env`.

## Prove

1. **Server**: crea `app/backend/test/pratiche.spec.ts` con:
   - i conteggi per stato sul seed, uguali al prototipo (vedi `test/prototipo.ts`, che fa girare il
     motore del prototipo);
   - un filtro multiplo;
   - i conteggi che cambiano con gli altri filtri ma non con quello di stato;
   - l'ordinamento e la paginazione su tutto l'elenco;
   - il 403 per chi non ha il permesso.

   Poi, in `app/backend`, lancia `npx tsc --noEmit` e `npx jest --runInBand`, **da solo** (due
   giri insieme danno falsi KO), con 0 KO.
2. **Browser**:
   - avvia il backend: in `app/backend` lancia `npm run build`, poi `node dist/src/main.js` con
     `DATABASE_URL` puntato a `decobrands_test_f1a1`, `PORT=8012`, `TENTATIVI=1000` e
     `TENTATIVI_IP=1000`;
   - avvia il frontend: in `app/frontend`, con `BACKEND_URL=http://127.0.0.1:8012`, lancia
     `npm run build`, poi `node node_modules/next/dist/bin/next start -p 8011 -H 127.0.0.1`;
   - usa gli utenti `f1-ammi` e `f1-oper`, con password `password-di-prova`;
   - scrivi `strumenti/prove/app_pratiche.py` (prendi come modello `app_clienti.py`). Deve
     controllare:
     - segmenti e numeri;
     - filtro multiplo e riepilogo;
     - ordinamento;
     - pagina successiva;
     - ritorno dal dettaglio nello stesso punto;
     - nessun errore JavaScript.

     Le schede si cercano con `.schede-barra [role=tab]`. Chiudi con 0 KO.
   - Schermate a 1440 e 768 px, in `%TEMP%\f2-a1`: **guardale**.
   - Chiudi i processi sulle porte 8011 e 8012.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f2-a1.md` con:
- i file toccati;
- la forma della risposta di `/api/pratiche`;
- l'esito delle prove (numeri e KO);
- il percorso delle schermate;
- i dubbi (permesso, campi che mancano nello schema, differenze con il prototipo).
