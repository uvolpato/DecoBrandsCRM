# Resoconto collaudo · Onda 2 · Pacchetto 2-12 — Cliente › Pratiche: importo e stato

Data: 13/11/2026 · Esecutore: DeepSeek V4 Flash · Sessione OpenCode · Gravità P3 · Rilievo A5-18

## A5-18 — Cliente › Pratiche: importo non formattato e stato col codice interno

Rilievo ancora aperto nel codice attuale (riletto dopo f7). Corretto come da *Correzione puntuale*:

- `app/frontend/lib/stati.ts` (nuovo): spostata la mappa `ETICHETTA_PRATICA` (prima `ETICHETTA` locale di
  `VistaPratiche.tsx`) con il tipo `StatoPratica = 'scaduta' | 'attesa' | 'confermata' | 'fatturata'`.
  Testi e varianti identici: Conferma in ritardo/errore, Attesa conferma/attesa, Confermata/info, Fatturata/ok.
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx:54-56, 129-130`: rimossa la mappa locale, si importa
  `ETICHETTA_PRATICA` da `@/lib/stati`; il tipo `Pratica['stato']` è ora `StatoPratica`. Nessun cambio di resa.
- `app/frontend/app/(app)/clienti/VistaClienti.tsx:147-155` (`colonnePratiche`):
  - `importo_merce`: `tipo: 'euro'` (allineamento a destra e ordinamento numerico dal DataTable) e cella
    `euro(p.importo_merce)`; `null` → `'—'` invece di `0,00 €` / `-`;
  - `stato`: badge `<Stato v={s.v}>{s.testo}</Stato>` con la mappa comune, non più il codice interno;
  - fornitore vuoto: `'—'` invece di `'-'`.
  - Il tipo `Pratica.stato` è ora `StatoPratica` (`VistaClienti.tsx:42`).
- `strumenti/prove/app_clienti.py:175-176`: aggiunto il controllo «la cella importo contiene €»
  (`'€' in testo(pg, '.schede-corpo .dt tbody')`) nella scheda Pratiche del cliente.

Nessun calcolo nuovo nel browser: il server manda già `importo_merce` e `stato` (V12); qui si formatta soltanto.
Nessun file vietato toccato, nessuna modifica a `schema.prisma` o alle migrazioni.

## Prove

- `npx tsc --noEmit` in `app/frontend` → 0 errori.
- `npx tsc --noEmit` in `app/backend` → 0 errori (backend non toccato).
- `python -m py_compile strumenti/prove/app_clienti.py` → OK.
- `git status --short` / `git diff --name-only`: i file di questo pacchetto sono solo quelli ammessi
  (`clienti/VistaClienti.tsx`, `pratiche/VistaPratiche.tsx`, `lib/stati.ts`, `strumenti/prove/app_clienti.py`,
  questo resoconto). Gli altri file modificati/untracked sono dei pacchetti paralleli dell'onda.

Prove nel browser da lanciare a fine onda (non lanciate qui: porte e `.next` condivisi):

- `strumenti/prove/app_clienti.py` (aggiornata: nuovo controllo sull'importo in euro);
- `strumenti/prove/app_pratiche.py` (non modificata: verifica che lo spostamento di `ETICHETTA` non abbia
  cambiato i badge dell'elenco Pratiche).

Database di prova: non usato, nulla da cancellare.

## Da documentare

Nulla: non nasce né cambia una regola. È un allineamento al prototipo (D-24) di una pagina già descritta
(Cliente › scheda Pratiche). Nessuna riga nuova nel §19, nessun testo nuovo per la guida, nessuna attività o
ora nuova nel piano, nessuna modifica al README.
