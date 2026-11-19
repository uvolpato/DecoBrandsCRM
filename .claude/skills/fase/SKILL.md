---
name: fase
description: Esegue una fase o un pacchetto (avanzamento-app.md, piano-lavoro-crm.md, collaudo) facendolo scrivere a OpenCode con il modello giusto (DeepSeek V4 pro per il lavoro da Opus, DeepSeek Flash per il resto), lanciato da Claude Code con `opencode run`; Claude Code scrive il prompt, supervisiona e controlla. Usare SEMPRE, senza aspettare che Ugo lo chieda, quando si comincia o si riprende una fase, un'attività o un'onda ("andiamo avanti", "prossima fase", "fai la 2b", "/fase 2a", "lancia l'onda 1").
---

# Fase con OpenCode e il modello giusto

**Il codice lo scrive OpenCode, sempre** (Ugo, 12/11/2026). Claude Code (Opus) non scrive
codice: prepara il prompt, lancia OpenCode, supervisiona, controlla e fa il commit. Lavora sul
codice da sé solo se lo decide Ugo.

## Modelli (si scelgono guardando il lavoro, la colonna *Modello* è solo un'indicazione)

| Lavoro | Esempi | Modello OpenCode |
|---|---|---|
| da **Opus** | regole, soldi e calcoli delle provvigioni, stati, abbinamenti, accesso e permessi, Integra, SQL e migrazioni delicate, architettura | `deepseek/deepseek-v4-pro` |
| da **Sonnet** | schema e migrazioni seguendo la spec, pagine, elenchi, esportazioni, prove | `deepseek/deepseek-flash` |
| da **Haiku** | rinomine, spostamenti, documentazione, piccole correzioni | `deepseek/deepseek-flash` |

Una fase che mescola i due tipi si divide in due pacchetti (prima il server, poi le pagine).
A Ugo si scrive in mezza riga quale modello e perché.

## Passi

1. **Fase.** Quella degli argomenti (es. `2a`, `F2-A1`, `onda 1`); se manca, la prima con `[ ]` in
   `avanzamento-app.md` (o la prima onda non chiusa in `strumenti/collaudo/piano-correzioni.md`).
2. **Contesto minimo.** Solo quello che serve: riga del piano (*Riferimenti*, *Sorgente prototipo*,
   *Output*, *DoD*), numeri di sezione della spec, file dell'app toccati (`graphify query`, poi
   `Grep`/`Glob`, non letture intere).
3. **Prompt.** Se il pacchetto non esiste già, scrivilo in `strumenti/opencode/<pacchetto>.md`,
   autosufficiente:
   - **compito** e DoD in punti; **file ammessi** (solo quelli) e file vietati;
   - sezioni della spec e del piano da leggere (con numero), file del prototipo da replicare;
   - **regole del progetto** (OpenCode non ha questa conversazione): V12 tutto sul backend, V13 una
     transazione; italiano semplice, commenti con rimando alla decisione (`// D-11 §19`); codice
     minimo (ponytail); prove solo su `decobrands_test_<pacchetto>`, mai su `decobrands_db`; niente
     commit, push, `.env`, porte 8001/8002; Integra (192.168.239.49) mai;
   - **skill da caricare davvero**: `owasp-security`, `postgresql-code-review` (SQL), `ponytail-review`,
     `caveman`, secondo il rischio (CLAUDE.md §4 punto 6);
   - **prove** da lanciare con 0 KO (`npx jest <suite>` con `DATABASE_URL_TEST`, `npx tsc --noEmit`;
     le prove nel browser solo `py_compile`, le lancia Claude Code);
   - **resoconto** in `strumenti/opencode/resoconto-<pacchetto>.md`: file toccati, prove ed esito,
     dubbi, sezione «Da documentare» con il testo pronto per spec, guida e piano.
   Per i pacchetti in parallelo il prompt rimanda a `strumenti/opencode/regole-onda-parallela.md`.
4. **Prima del lancio.**
   - Controlla che Ugo non abbia già lo stesso pacchetto in corso in OpenCode desktop: `git status`
     con modifiche ai file ammessi che non sono tue, oppure chiedi in una riga. Il 12/11 due
     sessioni sullo stesso pacchetto hanno scritto gli stessi file.
   - Database di prova per pacchetto: crea `decobrands_test_<pacchetto>` (owner `decobrands`) e
     applica le migrazioni (`npx prisma migrate deploy`); `test/ambiente.ts` accetta i nomi con
     `decobrands_test`.
5. **Lancio**, dalla radice del progetto, in background, un processo per pacchetto, **sul server `opencode serve --port 4097`** (Ugo segue le sessioni dal vivo su http://127.0.0.1:4097, progetto `C:\Progetti\Decobrands_CRM`; senza server `opencode run` a volte si blocca prima di creare la sessione). Se il server non risponde, avvialo con `opencode serve --port 4097 --hostname 127.0.0.1` in background:
   ```bash
   opencode run --attach http://127.0.0.1:4097 --dir "c:\Progetti\Decobrands_CRM" -m <modello> --title "<pacchetto>" \
     "Sei l'esecutore del Decobrands CRM (c:\Progetti\Decobrands_CRM). Leggi strumenti/opencode/regole-onda-parallela.md e poi esegui strumenti/opencode/<pacchetto>.md. Rispondi con il riepilogo di massimo 10 righe chiesto dalle regole." \
     > "<scratchpad>/oc-<pacchetto>.log" 2>&1
   ```
   - Dopo pochi secondi prendi l'id della sessione (`curl -s http://127.0.0.1:4097/session`, la prima con il titolo del pacchetto) e **scrivi sempre a Ugo il link**: `http://127.0.0.1:4097/QzpcUHJvZ2V0dGlcRGVjb2JyYW5kc19DUk0/session/<id>`.
   - Bash con `run_in_background: true`; la notifica arriva quando il processo esce. Non inventare
     il risultato, non leggere il log a ogni minuto.
   - Più pacchetti insieme solo se i **file ammessi non si toccano** (stesso albero, niente worktree);
     altrimenti uno dopo l'altro. I file comuni (spec, guida, piano, `avanzamento-app.md`,
     `app.module`) li tocca solo il pacchetto di documentazione dell'onda.
   - Se un processo va fermato, `TaskStop` più `Stop-Process` sugli `opencode.exe run` rimasti.
6. **Controllo** (questo è il lavoro di Claude Code):
   - fine del log e resoconto; `git diff` dei soli file ammessi (un file fuori elenco è un rilievo);
   - prove rilanciate da te: `npx tsc --noEmit` (backend e frontend), jest delle suite toccate (a
     metà o una per volta, il giro completo in un colpo va in crash su Windows), prove nel browser
     delle pagine toccate (1440 e 768 px);
   - review: completa sul codice sensibile (`owasp-security`, `/code-review`, `postgresql-code-review`
     su SQL), leggera sul resto, completa nel dubbio.
   - **Se qualcosa non va non correggi tu**: scrivi `strumenti/opencode/<pacchetto>-correzioni-N.md`
     (rilievi con dove, scenario, correzione, prova, file ammessi) e lo rilanci con lo stesso modello
     (passo 5), finché è tutto ok.
7. **Chiusura.** Commit in italiano (con la riga Co-Authored-By), aggiorna `avanzamento-app.md` o
   `piano-correzioni.md`, cancella i database `decobrands_test_<pacchetto>`, e scrivi a Ugo in breve:
   pacchetto e modello, cosa è stato fatto, prove e controlli, cosa resta aperto.

## Se giri dentro OpenCode (non in Claude Code)

Niente `opencode run`: usa lo strumento `task` con gli agenti di `opencode.json`, stessi modelli della
tabella (`deepseek/deepseek-v4-pro` per il lavoro da Opus, `deepseek/deepseek-flash` per il resto),
un sottoagente per pacchetto, in parallelo solo con file ammessi separati.

Se sostituisci Claude Code come orchestratore: leggi prima la skill `orchestratore` e l'ultima
`strumenti/opencode/memoria-sessione-*.md`; i controlli che faceva Claude li fai tu, caricando davvero
`code-review`, `ponytail-review`, `owasp-security` (e `postgresql-code-review` su SQL); le operazioni su
`decobrands_db` (copia `pg_dump`, `--prova`, comando vero), il riavvio della 8002 e i commit li fai **solo se Ugo
te lo chiede** in quella sessione.

## Limiti

- OpenCode parte senza la conversazione: un vincolo che manca nel prompt non lo conosce. Nel dubbio
  una riga in più nel prompt.
- Le decisioni di architettura e quelle che vanno contro il §19 le prende Ugo (o Claude Code
  chiedendo a Ugo), non OpenCode.
- `opencode run` rifiuta da solo ogni permesso chiesto (cartelle esterne, `/tmp`) e **la sessione
  si chiude senza resoconto**: nel prompt vanno sempre «niente `cd`, niente `/tmp`, niente `&`»
  (sono anche in `regole-onda-parallela.md`). Lanciare con `timeout` (2 h) per fermare una
  sessione appesa.
- Le prove nel browser lunghe (giro completo ~40 min) le lancia Claude Code con
  `strumenti/collaudo/e2e/prepara.sh` e `giro.sh`; OpenCode lancia solo prove singole.
