# Prove nel browser bloccate dopo cliente-scelto e codice-cliente-in-ricerca (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P1 (blocca il commit 0.2.3).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, mai 8001/8002, Integra mai. Niente commit.

Nell'albero ci sono le modifiche non committate dei pacchetti `cliente-scelto` e `codice-cliente-in-ricerca` (leggi i due resoconti) e lo script `prisma/import-vecchio-crm.ts` (non c'entra).

## Blocchi (giro `app_documenti app_clienti app_pratica`, database nuovo; `app_pratica` 87/0)
1. `strumenti/prove/app_documenti.py` riga ~566 (blocco D-154 «Somma righe», scheda simulata 999994): `wait_for_function` va in timeout dopo `goto('/documenti/999994')`. Probabile: la scheda simulata non ha i campi nuovi (`cliente_id`, `piva_fornitore`, ecc.) o la ricerca cliente ora chiede `clienti?fornitore_id=` non intercettata. Verifica cosa aspetta e cosa succede (errori della pagina, `page.on('pageerror')`).
2. `strumenti/prove/app_clienti.py` riga ~166: dopo la scheda Pratiche, tornando alla scheda **Agenzie**, la riga dell'agenzia `T<RUN>` non compare (timeout). Prima del pacchetto `codice-cliente-in-ricerca` passava (46/0). Controlla se `GET /api/clienti` con o senza `fornitore_id` è cambiato per la pagina Clienti (stessa rotta), o se è la cache delle voci/scheda.

Per ognuno: causa (a) app / (b) prova superata / (c) dati di prova; se è (a) correggi l'app (file ammessi sotto), non la prova.

## Come lanciare
```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_clienti
```
Uscite in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt`, log del backend in `uscita/backend-<prova>.log`. Timeout 10 min per comando. Dopo una modifica all'app rilancia `prepara.sh`. Chiudi con **due giri** a 0 KO di tutte e due.

## File ammessi
`strumenti/prove/app_documenti.py`, `strumenti/prove/app_clienti.py`, `app/backend/src/clienti.ts`, `app/frontend/lib/entita.ts`, `app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/app/(app)/clienti/**`, il resoconto `strumenti/opencode/resoconto-prove-14-11.md`. Carica davvero `playwright-best-practices`, `ponytail-review`, `caveman`. Se tocchi l'app: `tsc --noEmit` e jest della suite toccata.
