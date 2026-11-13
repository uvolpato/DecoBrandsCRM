# Resoconto — prova app_documenti bloccata (13/11/2026)

## Causa

Non era `pg6` (blocco «Scegli»), che usa solo rotte simulate e non tocca il database.

La causa è il blocco sul documento vero, righe 163-170: `pg.click('Scarta il documento')` chiama la rotta vera `/api/documenti/<id>/scarta` e il documento `PROVA-R1` esce dall'elenco (la prova stessa lo verifica con `ok(pg.locator(voce).count() == 0, ...)`). La lista `/documenti` filtra `stato=aperte` (`VistaDocumenti.tsx:72`), quindi `pg7.wait_for_selector('.selezionabile a:has-text("PROVA-R1")')` non trova più nulla e va in timeout: la prova esce prima di stampare OK/KO.

## Modifica (solo `strumenti/prove/app_documenti.py`)

- Blocco D-152 «ricerca del fornitore guarda anche Integra» reso indipendente: scheda simulata `999993` (foto `jpg`, così non serve il visore PDF né il file vero), aperta direttamente con `/documenti/999993`, rotta `/api/documenti/999993` intercettata. Tolto `wait_for_selector(voce)` sul documento scartato.
- Aggiunte le schermate della finestra *Correggi i dati letti*: `correggi-1440.png` (già presente) e `correggi-768.png` (nuova, a 768 px dopo il visore).

Nessuna modifica all'app: l'errore era della prova.

## Prove

```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti   # 2 volte
```

- giro 1: `exit=0 OK=98 KO=0`
- giro 2: `exit=0 OK=98 KO=0` (avviso «utenti di prova NON creati» perché già presenti: non blocca)
- `python -m py_compile strumenti/prove/app_documenti.py` ok
- Schermate: `strumenti/collaudo/e2e/uscita/correggi-1440.png`, `strumenti/collaudo/e2e/uscita/correggi-768.png` (finestra impilata a 768 px, nessuno scorrimento orizzontale)

## Da documentare

- Niente: cambia solo la prova, non un comportamento dell'app né una decisione.
