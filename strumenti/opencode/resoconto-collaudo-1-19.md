# Resoconto collaudo · Onda 1 · Pacchetto 1-19

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: A5-10, A6-14.

## Cosa ho fatto

### A5-10 — tabelle che ricordano ordinamento, pagina e scorrimento

**Subagenti** — `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- tolti `let filtro` e `let schedaSubagente` (variabili di modulo);
- import `useMemoria` (riga 17) e `type Valori`;
- filtri con `useMemoria<Valori>('filtri', …)` (riga 79), `FilterBar onChange={setValori}`;
- `DataTable … memoria="subagenti"` (riga 411);
- `Schede memoria="subagenti"`, senza `attiva`/`onCambia` (riga 415).

**Utenti** — `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- tolti `let filtro` e `let schedaUtente`;
- import `useMemoria` (riga 15) e `type Valori`;
- filtri con `useMemoria<Valori>('filtri', …)` (riga 53), `FilterBar onChange={setValori}`;
- `DataTable … memoria="utenti"` (riga 256);
- `Schede memoria="utenti"`, senza `attiva`/`onCambia` (riga 260).

**Fornitori** — `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `memoria="fornitori"` su DataTable e Schede e filtri con `useMemoria` **c'erano già** (onda 0 bis);
- rimasta solo la variabile di modulo `let schedaFornitore`: tolta, e tolto `attiva`/`onCambia` da `Schede` (riga 358).

**Clienti** — `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- memoria e filtri con `useMemoria` **c'erano già**;
- rimasta solo `let schedaCliente`: tolta, e tolto `attiva`/`onCambia` da `Schede` (riga 211).

Con `memoria`, `DataTable` ricorda ordinamento, pagina e `scrollTop`; `Schede` ricorda la scheda attiva (§7.12, §16.4). I filtri ora usano lo stesso meccanismo (`useMemoria`) in tutte e quattro le pagine.

### A6-14 — Utenti a 1440 px, colonna «Ultimo accesso» tagliata

`app/frontend/app/(app)/utenti/VistaUtenti.tsx:185`: aggiunto `classe: () => 'avvolgi'` alla colonna «Ruolo e aree». Il testo dei livelli va a capo, la colonna si stringe e «Ultimo accesso»/«Mai entrato» restano interi.

Nota: la correzione indicava in alternativa `larghezza: '9rem'` nella colonna, ma `Colonna` di `DataTable` non ha quel campo e `DataTable.tsx` non è fra i file ammessi. Ho usato la seconda via prevista dalla correzione (testo del ruolo che va a capo), con la classe `.dt td.avvolgi` già in `stile.css`.

## Prove

- `cd app/frontend && npx tsc --noEmit` → **0 errori**.
- Backend non toccato: nessun `tsc` backend.
- `python -m py_compile strumenti/prove/app_utenti.py strumenti/prove/app_subagenti.py strumenti/prove/app_fornitori.py strumenti/prove/app_clienti.py` → **OK**.
- Prove nel browser: **non lanciate** (regole dell'onda). Da lanciare a fine onda: `app_subagenti.py`, `app_utenti.py`, `app_fornitori.py`, `app_clienti.py`.
- Non ho modificato le prove: già coprono la memoria della schermata (`app_subagenti.py` ricerca+segmento+scheda all'indietro, `app_fornitori.py` ricerca+scheda, `app_clienti.py` filtro+scheda Pratiche, `app_utenti.py` ordinamento dopo il clic sulla riga) e `app_utenti.py` rifà la schermata `app-utenti-1440.png`.
- Nessun database usato; nessun file fuori dagli ammessi toccato.

## Cose aperte

- Verifica visiva di A6-14 a 1440 px con la scheda aperta: da fare a fine onda con `app_utenti.py` (`app-utenti-1440.png`). Se «Ultimo accesso» fosse ancora tagliato, la via successiva è dare una `larghezza` alle colonne di `DataTable` (richiede modifica a `DataTable.tsx`, fuori da questo pacchetto).

## Da documentare

Niente di nuovo: A5-10 applica la regola già scritta (§7.12, §16.4 «Schede» e «DataTable» ricordano scheda, ordinamento, pagina e scorrimento) e A6-14 è solo una correzione di stile. Nessuna riga D-nn, nessun *Perché*, nessun testo di guida, nessuna attività/ore da aggiungere.
