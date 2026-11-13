# Nota di rilascio — CRM provvigioni Decobrands

Prima versione dell'applicazione (F7-A2, spec §3.2 e §14). Il CRM è il primo modulo del Sistema
Informativo Aziendale: qui ci sono documenti dei fornitori, pratiche, bollettini, liquidazioni ai
subagenti, incassi dei clienti, analisi, anagrafiche (da Integra), gestione di utenti, ruoli,
impostazioni, registro, scarti e guida in linea.

## Versioni

La versione si vede in fondo a *Stato del sistema* (numero e commit) e in fondo alla barra. Ogni
consegna ha un tag di Git (`v0.2.0`); `git describe --tags` dice cosa gira, `git log v0.1.0..v0.2.0`
cosa è cambiato.

### 0.2.0 — 13/11/2026 — primi documenti veri

Collaudo delle onde 0, 0 bis, 1 e 2 e dei pacchetti 3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01
(spec 8.80). In breve:
- **Documenti**: lo stesso file arrivato due volte non crea doppioni; uno scartato torna solo a mano;
  annullare un documento letto lo rimette da controllare con i dati corretti conservati.
- **Fattura su più pratiche**: la stessa fattura su una seconda pratica si accetta solo confermando
  «fattura su più ordini».
- **Soldi**: totali di documenti, bollettini, liquidazioni e Analisi calcolati dal server; somme in
  decimali esatti; il motore prende l'agenzia alla data dell'ordine (D-146).
- **Nota di credito sul maturato** di una fattura già liquidata: va nella liquidazione successiva
  come voce negativa, il trimestre chiuso non si riapre (D-150, Ugo).
- **Rettifiche di un bollettino contestato** nel mese dopo; tipo di provvigione bloccato dopo la
  prima chiusura.
- **Sicurezza**: casella, posta e Integra le cambia solo il superutente (D-115); il flusso degli
  aggiornamenti si chiude quando la sessione scade; segreti d'esempio rifiutati in esercizio.
- **Interfaccia**: avvisi letti dal lettore di schermo, tabelle da tastiera, schede che si
  ricordano, pagina d'avvio scura con indicatore di caricamento, versione visibile.

**Da verificare con i documenti veri**: lettura dei PDF dei fornitori (connettore cloud), abbinamento
alle pratiche, bollettini mensili in tedesco (*Provisionsabrechnung*). Excel ed email `.msg` non
si caricano: vanno convertiti in PDF.

## Cosa serve sul server

| Componente | Versione / nota |
|---|---|
| Node.js | 24 |
| PostgreSQL | database `decobrands_db` (utente proprietario `decobrands`) |
| Caddy | ≥ 2.5, davanti all'app, porte 80/443 (`deploy/Caddyfile`) |
| LibreOffice | per i PDF delle liquidazioni e dell'Analisi (`SOFFICE`) |
| Cartella documenti | `DOCUMENTI_DIR`, fuori dal repository, con backup |

Niente Docker: tre processi (backend 8002, frontend 8001, Caddy). Backend e frontend ascoltano solo
su `127.0.0.1`.

## Passi

1. Scaricare **solo `app/`** (sparse checkout `--no-cone`, vedi `README.md`) e `npm ci` in
   `backend/` e `frontend/`.
2. `backend/.env` da `.env.example`: `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`,
   `SEGRETI_CHIAVE`, `DOCUMENTI_DIR`, `DOCUMENTI_MAX_MB`, `SOFFICE`, e i parametri della casella e di
   Integra quando ci sono.
3. `npx prisma migrate deploy` in `backend/`, poi `npm run build` in `backend/` e `frontend/`.
4. Primo utente: `npm run superutente -- <nome utente> <email> "<nome>"` (da `backend/`).
5. `avvia-esercizio.bat`: backend (`start:prod`), frontend (`start`) e Caddy.
6. Nel `deploy/Caddyfile` sostituire `crm.decobrands.it` con il nome del server: Caddy prende il
   certificato da solo. Il file mette `Strict-Transport-Security` e non dichiara `trusted_proxies`
   (Caddy sostituisce `X-Forwarded-For` con l'IP del client, D-41). Per gli aggiornamenti:
   `deploy/pubblica.bat` (`git pull` di `app/`, `npm ci`, migrazioni, build).

## Controlli dopo l'avvio

- `GET /api/salute` risponde `{ok: true}`; in *Stato del sistema* i quattro servizi sono verdi o
  dicono cosa manca.
- `curl -I https://<server>/` mostra `Strict-Transport-Security`; con
  `curl -H 'X-Forwarded-For: 1.2.3.4' …` il registro salva l'IP vero (D-41).
- Accesso con il superutente, poi creazione degli amministratori e degli utenti; ogni utente cambia
  la password provvisoria al primo accesso.
- In *Impostazioni → Casella dei documenti* e *Server di lettura* i parametri si vedono in sola
  lettura e si provano; i valori veri stanno in `backend/.env` o nel database (cifrati).
- Caricare un PDF di prova: deve entrare in *Documenti*, essere letto e abbinabile.
- Backup: database **e** `DOCUMENTI_DIR` ogni notte; il registro si conserva secondo `eventi_mesi`.

## Limiti noti di questa versione

- **Lettura con GLM-OCR in locale (F6-A5) non ancora attiva**: si usa il connettore LlamaCloud UE.
  Il connettore locale si accende quando arriva la macchina con la GPU.
- **Rettangolo del valore sul PDF**: disegnato con PDF.js sulla posizione letta (D-06); da verificare
  con il connettore locale.
- **`lettura.lenta`** non è ancora un'anomalia dello Stato del sistema (serve il conteggio delle
  pagine dal connettore locale).
- **Solleciti**: il CRM prepara il testo e lo copia; non manda email ai fornitori o ai clienti.
- **Integra**: clienti e fornitori si leggono soltanto (viste sul database ponte).
- Sotto i 744 px l'app non si adatta: è per computer e tablet (D-44).

## Ripristino

Fermare i tre processi, ripristinare l'ultimo backup del database e di `DOCUMENTI_DIR`, rilanciare
`avvia-esercizio.bat`. Le migrazioni sono in avanti soltanto: per tornare a una versione precedente
serve anche il backup.
