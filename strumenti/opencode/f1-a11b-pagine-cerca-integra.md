# F1-A11b — Clienti e Fornitori con «Cerca in Integra» (D-111)

Lavoro da **DeepSeek Flash** (`deepseek/deepseek-flash`), una sessione sola. Leggi `CLAUDE.md` e
`AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nextjs-app-router-patterns`, `vercel-react-best-practices`,
`ui-ux-pro-max`, `accessibility`, `playwright-best-practices`. A fine lavoro carica davvero
`ponytail-review`; applica i rilievi veri.

Dipende da F1-A11 (rotte `/api/integra/cerca` e `/api/integra/importa`).

## Cosa si fa

Le liste di Clienti e Fornitori mostrano solo chi è in anagrafica. Chi manca si cerca **su richiesta
esplicita**, mai a ogni tasto (il ponte è lento).

### 1. Nelle due liste (`clienti/VistaClienti.tsx`, `fornitori/VistaFornitori.tsx`)

- Sotto il campo di ricerca, un pulsante discreto **Cerca in Integra**: apre una finestra (componente
  `Modale` che c'è) con un campo e il pulsante *Cerca* — **niente ricerca automatica mentre si
  digita**.
- Risultati: massimo 10 righe, con ragione sociale, P.IVA e codice (`/api/integra/cerca`), e per
  ognuna il pulsante **Importa**. Se non c'è niente: «Nesuna corrispondenza in Integra: registralo a
  mano» (senza inventare doppioni).
- Dopo l'import (`/api/integra/importa`) la finestra si chiude, la lista si ricarica e il nuovo
  soggetto compare (filtri e ordinamento restano).
- Chi non ha `dati.importa`: pulsante spento con il motivo («serve il livello operatore in Dati»).
- Se il ponte non risponde entro 3 s: messaggio «Il ponte di Integra non risponde, riprova», nessuna
  attesa infinita.

### 2. Guida e catalogo

- `lib/guida.ts`: in *Clienti* e *Fornitori* la frase che spiega perché l'elenco è corto («in
  anagrafica ci sono i soggetti che hanno documenti o legami») e il pulsante *Cerca in Integra*.
- Se estrai un componente condiviso fra le due liste, aggiungilo al catalogo `/componenti` con la
  firma; altrimenti nessuna voce nuova.

## Prove

- Browser: `app_clienti.py` e `app_fornitori.py` — percorso (apri la finestra, cerca, importa, la
  riga compare), caso vuoto, pulsante spento senza permesso. 0 KO a 1440 e 768 px.
- `npx tsc --noEmit` in frontend; nessuna modifica al backend, quindi `jest` solo se tocchi un
  componente con prove.
- Schermate in `%TEMP%\f1-a11b` e **guardale**.

## Regole

- Il browser non decide cosa è uguale: la ricerca e il riconoscimento sono del server (V12).
- Nessun `useEffect` che cerca al cambio di ogni lettera: solo clic su *Cerca*.
- Nessun import massivo, nessun «importa tutti i risultati».
- Niente librerie nuove; codice minimo (ponytail).
- Italiano semplice; commenti con `// D-111`; niente commit, push, `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a11b.md`: file toccati, come si comporta ogni caso, prove
con numeri, schermate, controlli caricati, dubbi, righe per spec/guida/piano (non applicarle).
