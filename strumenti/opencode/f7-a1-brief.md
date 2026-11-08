# Brief F7-A1 — Collaudo (agente `crm-collaudo`)

Sei l'agente di collaudo della fase **F7-A1** del CRM Decobrands. **Verifichi e segnali, non correggi.**
Non fare commit, non fare push, non toccare `.env`, non modificare il codice dell'app, della spec o del piano.

## Contesto
- Progetto: `C:\Progetti\Decobrands_CRM`. App in `app/` (Next.js 16 + React 19 in `app/frontend`, NestJS 11 + Prisma 7 in `app/backend`), PostgreSQL `decobrands_db` (sviluppo) e `decobrands_test` (prove backend).
- Prototipo ufficiale: `prototipo-alternativo/` (D-24). Spec: `specifica-crm-provvigioni.md` v8.53, §16.1 (checklist a 6 criteri), §12 (seed), §7 (pagine), §8.1 (API), §19 (decisioni).
- Server da usare: backend `http://127.0.0.1:8002`, frontend **next dev** `http://localhost:8001`. Se non rispondono, avvisa e fermati; non usare `next start`.
- Utenti di prova: da `app/backend` `node ../../strumenti/prove/utenti_prova.js crea f7` (password `password-di-prova`), alla fine `... togli`.
- Prove backend solo su `decobrands_test`; prove browser sul database di sviluppo. Nessun reset distruttivo.

## Compito
1. **Backend**: `npm test` in `app/backend`. Se la suite intera si blocca, eseguila in gruppi alfabetici (3–4 file) e riporta suite/test/KO di ogni gruppo. Devono chiudersi con 0 KO.
2. **Browser E2E**: tutti gli script `strumenti/prove/app_*.py` (non `flusso.py`). Uso: `python strumenti/prove/app_x.py f7 <cartella> http://localhost:8001`, cartella `C:\Users\uvolp\AppData\Local\Temp\opencode\f7`. Riporta controlli e KO per ognuno; 0 KO. Alla fine controlla che non restino documenti/utenti di prova.
3. **Checklist §16.1** per ogni schermata (Oggi, Documenti, Pratiche, dettaglio pratica, Bollettini, dettaglio bollettino, Liquidazioni, Analisi, Fornitori, Subagenti, Clienti, Registro, Stato del sistema, Scartati, Impostazioni, Utenti, Guida, Componenti): 6 criteri (struttura, stile/testi, numeri, stati/azioni, permessi/sola lettura, ritorno alla schermata precedente). Schermate 1440×900 e 768×900 per le pagine principali; niente scorrimento orizzontale; nessun errore JavaScript.
4. **Numeri del seed §12** confrontati con il prototipo allo stesso giorno: riporta i valori chiave (Oggi, bollettini, liquidazioni, analisi, pratiche).
5. **Ritocchi recenti** (verifica esplicita):
   - numeri del menu (Oggi, Documenti giallo, Pratiche giallo, Bollettini) da `GET /api/oggi/conteggi`;
   - *Torna a …* a destra accanto a Guida, voce giusta, in tutte le pagine, attivo in sola lettura; nessun pulsante *Torna alle pratiche/Torna ai bollettini* a mano;
   - nella finestra *Correggi i dati letti* il segno di conferma rende verde il campo, aggiorna il riepilogo e il server salva solo i campi confermati/cambiati;
   - *Consulta affiancati* e clic su un documento o su una riga a confronto aprono la finestra a tutto schermo con schede, file o anteprima costruita dai dati, *Confrontato con*, differenza, segmenti, tabella, ← →;
   - pillola dello stato a 10 px dal titolo.
6. **Responsive** 1440 e 768 px su tutte le pagine principali; colonne impilate; nessun overflow.

## Regole
- Calcoli e permessi devono venire dal server (V12); segnala qualunque calcolo nel browser.
- Non correggere i KO.
- L'unico file che scrivi è il resoconto.

## Resoconto `strumenti/opencode/resoconto-f7-a1.md`
Data e versione spec; backend (gruppi, suite, test, KO, comandi); browser (script, controlli, KO, comandi); checklist §16.1 una riga per schermata con i 6 criteri; numeri seed; elenco KO/divergenze con file, pagina, passi, gravità (bloccante/da correggere/cosmetico); cosa non verificato. Riassunto finale: totale prove, KO bloccanti, file del report.
