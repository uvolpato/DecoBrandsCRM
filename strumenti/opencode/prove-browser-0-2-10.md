# Pacchetto `prove-browser-0-2-10`

## Contesto
Pacchetti appena fatti: `bollettini-quota-somma` (D-201: quota pagata; **più righe dello stesso bollettino sulla stessa
fattura si abbinano allo stesso documento e formano un gruppo**; il doppione resta solo fra bollettini diversi) e
`scaglioni-sconto-da` (D-202). Giro di Claude Code (17/11/2026), esiti in `strumenti/collaudo/e2e/uscita/e2e/`:
- `app_bollettino`: si ferma alla riga ~152 di `strumenti/prove/app_bollettino.py`: abbina `F-2026-0891`, «già sul
  bollettino 7/2026», e aspetta l'errore 409 `.modulo-errore`, che non arriva più. Probabile causa: con D-201 abbinare un
  documento già usato **nello stesso bollettino** è ammesso (gruppo); il 409 resta solo se il documento è su **un altro**
  bollettino.
- `app_bollettini`: 22 OK / 1 KO «doppione: errore chiaro nella finestra» (riga ~131 di `app_bollettini.py`).

## Compito
Per ognuna: capisci se è **la prova superata dal comportamento voluto** (D-201) o **un bug dell'app**.
- Prova superata → aggiornala: per il 409 scegli un documento che sta su un **altro** bollettino; aggiungi un controllo
  nuovo che abbinare un documento già su una riga **dello stesso** bollettino crea il gruppo (niente errore). Mai togliere
  un controllo senza sostituirlo.
- Bug dell'app → **non correggerlo** (un altro pacchetto sta lavorando su `app/backend/src`): scrivi nel resoconto dove,
  scenario e correzione proposta.
- Il KO di `app_bollettini` può dipendere da dati sporcati da una prova precedente: verifica con un giro su seed pulito.

## Come lanciare (solo così)
Dalla radice: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` prima di **ogni** prova (sporcano i dati), poi
`bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_bollettino` (e poi `app_bollettini`). Frontend di prova già
acceso sulla 8071. Esiti in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt`. Obiettivo: 0 KO, nessun errore.

## File ammessi
Solo `strumenti/prove/app_bollettino.py` e `strumenti/prove/app_bollettini.py`.

## Regole
`strumenti/opencode/regole-onda-parallela.md` (niente script fuori da jest che toccano il db) e `CLAUDE.md` §3. Niente
commit, `cd`, `/tmp`, `&`, `.env`, porte 8001/8002. Skill: `playwright-best-practices`, `caveman`. Resoconto in
`strumenti/opencode/resoconto-prove-browser-0-2-10.md` (prova → causa → cosa è cambiato → esito). Riepilogo in 6 righe.
