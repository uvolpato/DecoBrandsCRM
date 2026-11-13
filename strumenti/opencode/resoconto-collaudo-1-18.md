# Resoconto · Onda 1 · Pacchetto 1-18 — Campo di ricerca: voce attiva e nome dell'input

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: A7-08, A7-12 (solo parte `CampoRicerca.tsx`)

## Cosa ho fatto

### A7-08 — la voce attiva non viene annunciata
File: `app/frontend/componenti/CampoRicerca.tsx`
- import di `useId` (`:2`).
- `Multipla`: `const lid = useId()` (`:55`); ogni `li` ha `id={lid + '-' + i}` (`:90`); `<ul id={lid}>` (`:106`); sull'input `aria-controls={lid}` e `aria-activedescendant={aperto && chiavi[attiva] ? lid + '-' + attiva : undefined}` (`:101`).
- `Singola`: `const lid = useId()` (`:124`); `li` con `id={lid + '-' + i}` (`:172`); `<ul id={lid}>` (`:170`); input con `aria-controls` e `aria-activedescendant` (`:166`).

Gli indici coincidono con quelli usati per `.attiva`, quindi l'id annunciato è sempre quello evidenziato.

### A7-12 — nome accessibile della ricerca singola
File: `app/frontend/componenti/CampoRicerca.tsx`
- `Singola` ora destruttura `etichetta` (`:120`) e passa `aria-label={etichetta ?? 'Cerca ' + ent.titolo.toLowerCase()}` (`:167`), come fa `Multipla`.
- Le spunte di `VistaDocumento.tsx` **non** sono state toccate: come dice il pacchetto, sono di un altro pacchetto.

### Prove aggiornate
File: `strumenti/prove/app_componenti.py`
- ricerca multipla: dopo due ↓ controlla che `aria-activedescendant` punti a un `li[role=option]` e che `aria-controls` punti al menu (`:85-90`).
- campo singolo: dopo ↓ controlla `aria-activedescendant`, `aria-controls` e `get_by_role('combobox', name='Cerca fornitore')` (`:112-119`).

## Prove lanciate
- `python -m py_compile strumenti/prove/app_componenti.py` → OK.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (exit 0).
- `git status --short` → modificati solo i miei file ammessi; gli altri file modificati sono dei pacchetti in parallelo.
- Prove nel browser **non lanciate** (regola dell'onda). Da lanciare a fine onda: `app_componenti.py`, `app_pratiche.py`.

## Cose aperte
Nessuna. Nessun file vietato toccato, nessuna decisione del §19 messa in discussione.

## Da documentare
- §19 (D-nn): nessuna decisione nuova. È una correzione di accessibilità che applica WCAG 4.1.2 e la regola già esistente che i componenti standard hanno nomi accessibili; non cambia regole di business né ore. **Niente da aggiungere al registro.**
- Riga *Perché* nella sezione della spec dei componenti (`CampoRicerca`, §16.4): proposta — «Il campo di ricerca è un `combobox` con `aria-controls` e `aria-activedescendant`; la voce attiva (frecce ↑ ↓) è annunciata dal lettore di schermo. L'input ha sempre un nome (`aria-label`, dall'etichetta o dal titolo dell'entità).»
- Guida (`app/frontend/lib/guida.ts`) e prototipo `assets/guida.js`: nessun testo nuovo per l'utente, solo comportamento del lettore di schermo. **Niente da aggiungere.**
- Piano (`piano-lavoro-crm.md`): correzione dentro le ore di collaudo già previste. **Nessuna attività nuova.**
- README: nessuna modifica necessaria.
