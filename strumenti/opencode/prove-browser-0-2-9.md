# Pacchetto `prove-browser-0-2-9`

## Contesto
Dopo i pacchetti 0.2.9 (`raggruppamento-scaglioni` + correzioni 1–2, `scaglioni-esatti`, `percentuali-fornitore-layout`)
il giro nel browser (Claude Code, 17/11/2026) dà regressioni. Nel giro 0.2.8 (`resoconto-giro-0-2-8-prove.md`) erano tutte
a 0 KO. Esiti attuali in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt` (+ schermate nella cartella omonima):

| Prova | Esito | Primo indizio |
|---|---|---|
| app_pratica | si ferma | `.segmenti-select` ambiguo: c'è anche `select[aria-label=Raggruppamento]` con la stessa classe |
| app_pratiche | si ferma | da leggere in `app_pratiche.txt` |
| app_fornitori | si ferma | clic intercettato da `<th class="cx">` del `thead` (intestazione fissa nuova della tabella scaglioni) |
| app_liquidazioni | si ferma | `wait_for_function` 30 s |
| app_componenti | si ferma | `wait_for_function` 30 s |
| app_soggetti | 62 OK / 1 KO | `app_soggetti.txt` |
| app_bollettino | 44 OK / 2 KO | `app_bollettino.txt` |

## Compito
Per ogni prova: **capisci la causa** (bug dell'app introdotto dalla 0.2.9 oppure prova che va aggiornata al nuovo
comportamento voluto) e correggi **la causa**:
- bug dell'app (es. intestazione che copre i clic, componente che non si carica, errore JS) → correggi l'app;
- prova superata dal nuovo comportamento voluto (es. nota spostata nel pulsante «Informazioni», tendina in più) → aggiorna
  la prova, con selettori precisi (`get_by_label`, `aria-label`), mai cancellando un controllo senza sostituirlo.
- Un KO che c'era già prima della 0.2.9 (verifica con `git stash`? **NO**, vietato: confronta con il resoconto 0.2.8 e
  con `git diff`) → scrivilo nei dubbi, non inseguirlo.

## Come lanciare le prove (solo così)
Dalla radice: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` (una volta, e di nuovo **dopo ogni modifica
all'app**: ricompila il backend in `dist-prove` e ricopia il frontend sulla 8071), poi
`bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_pratica` (una prova alla volta; usa la porta 8012 e il
frontend 8071, che non sono di Ugo). Leggi `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt`. Alla fine tutte e 7 a 0 KO e
senza errori.

## File ammessi
`app/frontend/**` (non `stile.css` globale: solo classi nuove o quelle aggiunte dalla 0.2.9), `app/backend/src/**` solo se
la causa è lì, `strumenti/prove/app_*.py`. Vietati: migrazioni, `decobrands_db`, porte 8001/8002, prototipo.

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` (compresa la regola nuova: **niente script fuori da jest che toccano il
database**) e `CLAUDE.md` §3 (selettori schede `.schede-barra [role=tab]`). Niente commit, `cd`, `/tmp`, `&`, `.env`.
`npx tsc --noEmit` frontend (e backend se toccato) puliti. Skill: `playwright-best-practices`, `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-prove-browser-0-2-9.md`: per prova → causa → correzione (app o prova) → esito finale
(OK/KO). Riepilogo in massimo 10 righe.
