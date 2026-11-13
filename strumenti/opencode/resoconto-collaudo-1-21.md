# Resoconto collaudo · Onda 1 · Pacchetto 1-21 — Pulizia radice e cartelle di uscita

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Gravità: P3 · Rilievi: A1-10, A8-14.

## Cosa ho fatto

### A1-10 — Credenziali di sviluppo in `body.json` e `cookies.txt`
- `body.json` e `cookies.txt` **non erano presenti** nella radice (`ls` → "No such file or directory"):
  già cancellati prima dell'esecuzione. Nessuna cancellazione eseguita.
- `.gitignore` (righe 6–10): aggiunte le voci
  - `body.json`
  - `cookies.txt`
  - `strumenti/prove/schermate-*/`
  sotto il commento che spiega perché (repo pubblico, GitHub Pages).
- La password `Prova-Decobrands-2026` non è più nel repository. **Segnalazione a Ugo**: se quella
  password è usata anche sul server vero o su un utente reale, va cambiata (non posso verificarlo
  da qui e non devo toccare `decobrands_db`).

### A8-14 — File sporchi e cartelle di uscita non ignorate
- `body.json`, `cookies.txt`: assenti, come sopra.
- `strumenti/prove/schermate-f6a4b|f7-profilo|f7a1|p5/`: presenti su disco, ora coperti da
  `strumenti/prove/schermate-*/`, non compaiono più in `git status`.
- `idee.md`, `specifica-lettura.md`, `app_llm_locale/`: già committati da Ugo (U27), non toccati.
- `ultimo.txt`: non presente, non toccato.

Nessun file toccato fuori dagli ammessi. Unico file modificato: `.gitignore`.

## Prove lanciate

| Prova | Esito |
|---|---|
| `ls body.json cookies.txt` | assenti (0 KO) |
| `git check-ignore -v body.json cookies.txt strumenti/prove/schermate-p5/x.png` | 3/3 corrispondono (`.gitignore:7`, `:8`, `:10`) |
| `git status --short` filtrato su `schermate\|body.json\|cookies` | nessuna riga (0 KO) |
| `git status --short -- .gitignore body.json cookies.txt` | solo ` M .gitignore` |

Nota: `git status --short` globale mostra molte modifiche e file non tracciati **di altri pacchetti
della stessa onda in parallelo** (backend, frontend, spec, prove). Non sono miei e non li ho toccati.
Il criterio "nessun file fuori dagli ammessi" vale per il mio diff: `.gitignore` soltanto.

`npx tsc --noEmit`: non applicabile — nessun file di codice toccato.

## Prove nel browser da lanciare a fine onda
Nessuna: il pacchetto non tocca interfaccia.

## Cose aperte
- Verificare se la password `Prova-Decobrands-2026` è usata fuori dallo sviluppo e cambiarla (Ugo).

## Da documentare
Nulla. La regola «le cartelle di uscita degli strumenti non si committano» è già in `CLAUDE.md`
(§4.6, *Git*) e in `strumenti/opencode/regole-onda-parallela.md`; non nasce né cambia nessuna
decisione del §19, nessuna riga *Perché* di sezione, nessun testo di guida, nessuna attività o ora
del piano. Il `.gitignore` è autodocumentante con i commenti in testa alle voci.
