# Resoconto — Prove nel browser 0.2.9

Giro del 17/11/2026. Database `decobrands_test_e2e`, backend `dist-prove` sulla 8012, frontend 8071.
Ogni prova è stata rilanciata su seed pulito (`prepara.sh` prima della prova): `app_liquidazioni` chiude il
3° trimestre e `app_bollettino` verifica un bollettino, quindi i dati di una prova sporcano la successiva
(`prep.js` azzera solo utenti e ingressi, non le pratiche).

## Per prova

| Prova | Causa | Correzione | Esito |
|---|---|---|---|
| `app_pratica` | il filtro nuovo **Raggruppamento** è un secondo campo a segmenti: `segmenti.py` cercava `.segmenti-select` senza scopo e Playwright trovava due tendine (Stato e Raggruppamento) | prova: lo stato è il primo campo della barra, `SEG = '.filtri > .filtro-slot:nth-child(1) '` passato a `scegli`/`scelta`/`numero` (elenco pratiche); la scheda pratica tiene `.filtri ` (una sola tendina) | 103 OK, 0 KO |
| `app_pratiche` | stesso doppio filtro a segmenti: `segm.quanti` contava 8 voci (6 stati + 2 raggruppamenti) | prova: tutti i `segm.*` di stato usano `SEG` (primo campo). L'ordinamento al ritorno era già a posto | 24 OK, 0 KO |
| `app_fornitori` | bug dell'app: nella scheda Percentuali ogni versione era `flex: 1 1 0; min-height: 9rem`, quindi il riquadro della tabella era più basso del contenuto; la prima riga scorreva sotto l'`th` fisso, che intercettava il clic (`.btn-riga` della versione 2050) | app (`stile.css`, solo classi `.scaglioni-*` della 0.2.9): la versione e la sua tabella restano alte quanto le righe (`flex: none`); scorre l'elenco, non la pagina né il pannello; intestazione fissa in cima alla sua tabella | 41 OK, 0 KO |
| `app_liquidazioni` | bug dell'app: dal 0.2.9 `quotaSub` su un documento congelato restituisce il valore fissato **anche con base esplicita**; `differenzaNotaCongelata` ricalcolava la coppia sulla nota già congelata e sottraeva di nuovo la quota della fattura (−67,68 € invece di 960,00 € nel report di Marco Nista) | app (`motore.ts`): una nota già congelata non ricalcola la coppia, vale il suo `calcolo` (D-183). Con la nota aperta la differenza D-197 resta com'era | 77 OK, 0 KO |
| `app_componenti` | nessun bug dell'app: il primo giro dopo la copia del frontend va in timeout sul `go_back` a `/componenti` perché `next dev` compila la rotta a freddo (> 30 s) | niente da correggere: rilanciata con la rotta compilata | 59 OK, 0 KO |
| `app_soggetti` | `R2-02` (due clic rapidi) non riproducibile: passata al secondo giro, nessun errore JS; il codice della corsa non è stato toccato dalla 0.2.9 | niente | 63 OK, 0 KO |
| `app_bollettino` | i 2 KO del giro (periodo/filtro al ritorno, due pagine PDF) erano dati sporchi: `app_liquidazioni` aveva già verificato il bollettino Gries di luglio e chiuso il trimestre; con il seed pulito la pagina ha di nuovo «Vai alla prima» | niente: la prova va lanciata su seed pulito, come dice la sua intestazione | 46 OK, 0 KO |

## Controlli
- `npx tsc --noEmit` backend e frontend: 0 errori.
- Jest backend sui percorsi toccati (`liquidazioni`, `valori-congelati`, `scaglioni-esatti` e `-db`,
  `raggruppamento-scaglioni` e `-db`, `motore`, `analisi`): 106 prove, tutte passate.
- `python -m py_compile` su `app_pratica.py` e `app_pratiche.py`: OK.

## Dubbi
- Le prove che tornano indietro con `go_back` (`app_componenti`, `app_pratiche`, `app_fornitori`,
  `app_pratica`, `app_bollettino`) possono scadere al primo giro dopo `prepara.sh` mentre `next dev` compila
  la rotta: non è un difetto dell'app. Se Claude Code rifà il giro a freddo, lanciare una volta la prova o
  alzare l'attesa; a caldo sono 0 KO.
- `app_liquidazioni` e `app_bollettino` richiedono il seed pulito: vanno eseguite dopo `prepara.sh`, non in
  coda a una prova che scrive.

## Da documentare
- Nessuna decisione nuova: le due correzioni ripristinano D-183 (un documento congelato non si ricalcola) e
  la regola della scheda Percentuali (intestazione fissa senza rubare i clic). Nessuna modifica a
  `specifica-crm-provvigioni.md` né al piano.
- Per la Guida non cambia niente: il comportamento visibile torna quello voluto.
