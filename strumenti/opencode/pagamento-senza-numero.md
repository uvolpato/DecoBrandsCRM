# Pacchetto `pagamento-senza-numero`

## Contesto
Finestra di correzione del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), tipo
**Pagamento** (es. distinta di bonifico, foto dello schermo della banca): il salvataggio è bloccato con
«Il numero del documento è obbligatorio.». Ugo (15/11/2026): **un pagamento non ha un numero di documento.**

## Compito
1. Per il tipo `pagamento` il numero è **facoltativo**, sul server (V12: la validazione in
   `app/backend/src/documenti.ts` e dove si controlla l'obbligo) e nell'interfaccia (niente messaggio rosso;
   etichetta «Riferimento (facoltativo)» al posto di «Numero» per il pagamento). Per gli altri tipi resta
   obbligatorio come oggi.
2. Controlla che tutto ciò che usa il numero del documento regga un pagamento senza numero: titolo della
   scheda del documento, elenco della coda, registro eventi, pagina Oggi, abbinamento a pratica/incasso,
   doppioni (se il controllo dei doppioni usa il numero, per il pagamento usa fornitore + data + importo,
   senza bloccare). Mostra al posto del numero «Pagamento del <data> · <importo>» o il nome del file.
3. Se per il pagamento la tabella **Righe** non serve (nessuna riga), non deve bloccare il salvataggio né
   mostrare errori; lasciala vuota.
4. In più (piccolo): `strumenti/prove/app_documenti.py:649-654` cerca ancora `.somma-righe-avviso` e il testo
   «diversa di»: aggiornalo alla nuova resa (`.sopra-riga.diversa`, rosso, testo «Somma righe …»).

## File ammessi
`documenti.ts`, `VistaDocumento.tsx`, `app/frontend/lib/guida.ts`, test in `app/backend/test/`
(`documenti-*.spec.ts`), `strumenti/prove/app_documenti.py`; `oggi.ts` solo se il titolo si rompe senza numero.
**Non toccare** `motore/*`, `proposta.ts`, `pratiche.ts`, `bollettini.ts`, `liquidazioni*` (`sconto-medio` in
corso) né i file delle email (`riferimenti-email` in corso): se servono, scrivi la modifica nel resoconto.
Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13. URL del db **solo con
grep**, `.env` mai letto con readFileSync o cat. Prove su `decobrands_test_pag_num` (creato e cancellato).
Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest: pagamento senza numero si salva; fattura senza numero → 400 come
oggi.

## Resoconto
`strumenti/opencode/resoconto-pagamento-senza-numero.md`: file, prove, punti dove il numero mancava,
«Da documentare».
