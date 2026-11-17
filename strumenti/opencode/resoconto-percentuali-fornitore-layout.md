# Resoconto — percentuali-fornitore-layout (16/11/2026)

## File toccati
- `app/frontend/componenti/Icona.tsx` (icona `info`)
- `app/frontend/componenti/Piccoli.tsx` (componente `Informazioni`)
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `app/frontend/app/stile/stile.css` (solo classi nuove `.scaglioni-*`)
- `app/frontend/app/(app)/componenti/page.tsx` (voce di catalogo)
- `app/frontend/lib/guida.ts` (pagina Fornitori)
- `strumenti/regole-interfaccia.md` (regola 26b)

## Cosa è cambiato
1. `Informazioni`: pulsante a icona «i» (`aria-label` e `title` dal titolo) che apre una `Modale` con i figli. Usato nelle due schede di questo pacchetto; le altre `<Nota>` non sono state toccate.
2. Fornitori · Percentuali: la nota lunga sotto la tabella è sparita; il pulsante è nella riga degli strumenti in alto a destra, accanto ad «Aggiungi scaglione». Testo diviso in punti (Dal fornitore, di cui al subagente, Margine Decobrands, Clienti, Date di validità e chiusure).
3. Soggetti · Ruoli: stessa finestra, pulsante accanto ad «Aggiungi ruolo»; nota rimossa.
4. Tabella scaglioni: `naturale` tolto; le versioni stanno in `.scaglioni-elenco` (flex, scorre solo se non ci stanno) e ogni versione in `.scaglioni-versione` (flex, min 9rem). La DataTable riempie la versione, intestazione sticky, scorrono solo le righe.
5. Niente scorrimento orizzontale: `table-layout: fixed` + larghezze in % (14/17/28/20/11/10) + testo che va a capo, solo sotto `.scaglioni-tabella`; numeri allineati a destra.
6. Catalogo Componenti: voce `Informazioni`. Guida Fornitori: pulsante nuovo. Regole d'interfaccia: 26b.

## Prove
`npx --prefix app/frontend tsc --noEmit -p app/frontend/tsconfig.json` → 0 errori. Schermate non fatte (le fa Claude Code).

## Dubbi
- Barra orizzontale: la causa è nella `DataTable` condivisa (`th`/`td` con `white-space: nowrap`) insieme alle colonne senza larghezza. Non ho toccato il componente né lo stile globale: solo classi `.scaglioni-*` per questa vista, come da pacchetto.
- Con più versioni l'area si divide fra i blocchi (ognuno col suo scorrimento); se non ci stanno, scorre `.scaglioni-elenco`, non la pagina. Da guardare a schermo se è l'effetto voluto.

## Da documentare
- Spec §16.4: componente `Informazioni` (pulsante icona + finestra) e regola delle tabelle strette.
- Spec/§19 se Ugo conferma la regola come decisione ripetibile (la regola 26b è già in `strumenti/regole-interfaccia.md`).
- Guida e catalogo già allineati.

# Correzioni 1 (17/11/2026)

## File toccati
- `app/frontend/app/stile/stile.css` (solo classi `.scaglioni-*`)
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx` (una sola etichetta di colonna)
- `strumenti/prove/app_fornitori.py`
- `strumenti/prove/app_soggetti.py`

## Cosa è cambiato
1. Intestazioni della tabella scaglioni: non si spezzano più dentro le parole (`overflow-wrap: normal; word-break: normal; hyphens: none`; solo le celle vanno a capo ovunque, per i nomi dei subagenti con l'eccezione). Margini delle celle a 10 px (6 px nell'ultima, quella delle icone) e larghezze 15/17/20/16/14/18 %: a 1440 la colonna destra è ~490 px e «Sconto», «Dal fornitore», «di cui al subagente», «Margine», «Clienti» e le due icone ci stanno. L'etichetta «Margine Decobrands» diventa «Margine» (il nome lungo sta nella finestra Informazioni): era l'unica parola che non entrava quando la colonna delle icone è presente.
2. Finestra «Nuovo scaglione» vuota a 1440: **non è un difetto dell'app**, è l'istante della schermata. La finestra si apre subito col titolo; i campi arrivano con le percentuali dal server e sotto i 150 ms le sagome non compaiono (D-59), quindi nel primo fotogramma il corpo è vuoto. La prova ora aspetta il campo «Valide dal» prima di controllare e di fare la schermata: era anche il motivo per cui i `fill` successivi potevano correre.
3. Scheda Ruoli del soggetto: il pulsante «Informazioni» c'è, a destra accanto ad «Aggiungi ruolo»; nessuna correzione all'app. Aggiunte alla prova `app_soggetti.py` le schermate `ruoli-1440.png` e `ruoli-768.png` e due controlli sulla presenza del pulsante.

## Prove
- `npx --prefix app/frontend tsc --noEmit -p app/frontend/tsconfig.json`: 0 errori.
- `python -m py_compile strumenti/prove/app_fornitori.py strumenti/prove/app_soggetti.py`: OK.
- Giro nel browser **non lanciato qui**: la 8071 (copia del frontend per le prove) non è accesa e le regole dell'onda lo lasciano a Claude Code. Da lanciare: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_fornitori app_soggetti app_componenti`; guardare `percentuali-1440.png`, `percentuali-768.png`, `ruoli-1440.png`, `ruoli-768.png`.

## Dubbi
- Fra ~1101 e ~1250 px di larghezza la scheda resta a due colonne e quella destra scende a ~300 px: sei colonne non ci stanno con parole intere. Restano leggibili solo spezzandole o lasciando traboccare l'intestazione. Non ho toccato il layout globale (vietato dal pacchetto): se Ugo usa spesso quelle larghezze, va data più larghezza alla colonna destra o si impila prima (soglia dei 1100 px).
- L'etichetta «Margine» invece di «Margine Decobrands»: il significato lungo è nella finestra Informazioni, come chiedeva il pacchetto. Se Ugo preferisce il nome intero, serve togliere o spostare la colonna delle icone.

## Da documentare
- Spec §16.4 (tabella scaglioni): intestazioni mai spezzate dentro le parole, larghezze delle colonne, etichetta «Margine».
- `app/frontend/lib/guida.ts` pagina Fornitori: nessun testo nuovo, ma la finestra Informazioni dice già «Margine Decobrands» mentre la colonna ora dice «Margine» — valutare se aggiungere mezza riga.
- Nessuna decisione nuova: restano valide D-59 (sagome sotto i 150 ms) e la regola 26b (`strumenti/regole-interfaccia.md`).
