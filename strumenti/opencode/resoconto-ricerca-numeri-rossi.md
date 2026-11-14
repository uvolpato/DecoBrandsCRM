# Resoconto — Campo di ricerca: niente id e pallino rosso mentre carica (14/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/ricerca-numeri-rossi.md` · Gravità P1.

## Cosa chiede Ugo

Aprendo *Apri la pratica* (o tornandoci dopo *Configura* / *Aggiungi l'agenzia*) i campi Fornitore e
Cliente mostrano per un attimo **l'id** con il **pallino rosso**, poi il nome giusto e il verde.
Causa: in `CampoRicerca` (`Singola`) `useState(valore)` mette l'id come testo e lo stato
«ko» vale finché le voci (1858 clienti) non arrivano.

## Cosa ho fatto

- **`CampoRicerca.tsx` — `useVoci`**: aggiunto il flag `caricate` (vero quando le voci sono arrivate,
  anche vuote o in errore); prima è falso e `tutte` non è ancora significativo.
- **`CampoRicerca.tsx` — `Singola`**:
  - il testo iniziale non è più l'id ma `nomeIniziale` (se il chiamante lo conosce) o vuoto;
  - l'effetto che allinea il testo al nome (`setTesto(nota ? ent.testo(nota) : valore)`) non parte
    più finché le voci non sono caricate (`if (!caricate) return`), così non riscrive l'id sul primo render;
  - lo stato del pallino: `!caricate && valore → 'vuoto'` (grigio) invece di `'ko'`; il title resta vuoto
    finché non si sa davvero se il valore c'è;
  - rosso solo se, a voci caricate, il valore non è in anagrafica.
- **Prop `nomeIniziale`** (opzionale) plumbata `CampoRicerca` → `Campo` (`Campo.tsx`), usata in:
  - *Apri la pratica* (`VistaDocumento.tsx`): fornitore e cliente col nome che il documento già ha;
  - *Registra il bollettino* (`VistaDocumento.tsx`): fornitore;
  - `FormAgenzia.tsx`: fornitore e subagente.
- **Cache delle voci**: verificato che `caricaVoci` ha già una cache a livello di modulo (5 s per
  contesto, `WeakMap`): tornando nella modale entro 5 s le voci non si ricaricano dal server, il
  secondo ingresso è immediato. Niente da cambiare lì.

## Prove

- `npx tsc --noEmit` frontend: **OK** (backend non toccato).
- `python -m py_compile strumenti/prove/app_documenti.py app_componenti.py app_clienti.py`: **OK**.
- Aggiunto il controllo nuovo in `app_documenti.py` (blocco D-161): rotte `/api/fornitori` e
  `/api/clienti?fornitore_id=5` tenute in attesa 1,5 s (rotta lenta), apertura di *Apri la pratica*
  con `fornitore_id='5'` e `cliente_id='1001'`: i campi mostrano il nome e **mai** un numero né il
  pallino rosso; a voci arrivate entrambi i pallini diventano verdi. Prova browser non lanciata (la
  lancia Claude Code a fine onda, come da regole).
- `app_componenti.py` non cambia (l'entità di esempio usa voci locali sincrone, niente rotta da
  rallentare); i suoi controlli sul pallino verde/rosso restano validi.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `ponytail-review`: un flag booleano e una prop opzionale, nessuna astrazione nuova; `nomeIniziale`
  serve perché `CampoRicerca` è usato sia diretto sia via `Campo`. `net: 0 linee da tagliare`.
- `vercel-react-best-practices`: nessuna nuova richiesta/waterfall (la cache di `caricaVoci` resta);
  `useVoci` continua a non produrre re-render superflui (destrutturato subito). Niente rilievi.

## Da documentare (a cura di chi chiude l'onda)

- spec §16.4 (componenti) e §7.9: il campo di ricerca singola mostra «in caricamento» (pallino grigio)
  finché le voci non arrivano e accetta la prop `nomeIniziale` (nome già noto) per non lasciare vuoto
  il campo in *Apri la pratica* / *Registra il bollettino* / `FormAgenzia`.
- spec §19 — decisione nuova **D-161 (da proporre)**: «finché le voci di un campo di ricerca non sono
  arrivate, il campo non mostra l'id né il pallino rosso: mostra il nome già noto (`nomeIniziale`, dal
  documento o dall'agenzia) o resta vuoto, con pallino grigio; rosso solo quando, a voci caricate, il
  valore davvero non c'è» + il perché (un id con un pallino rosso per un istante sembra un errore e
  disturba a ogni apertura; il nome letto è già disponibile, non c'è motivo di mostrare l'id).

## Aperti / da segnalare

- Il numero di decisione D-161 è **da proporre**: chi chiude l'onda assegna i numeri definitivi.
- La prova browser (blocco D-161 di `app_documenti.py`) va lanciata da Claude Code a fine onda: è
  l'unico punto non eseguito qui (schermate `app-documento-numeri-rossi-attesa.png` e
  `-caricato.png`).
