# Pacchetto `prova-documenti-d204`

Giro di Claude Code (17/11/2026): `strumenti/prove/app_documenti.py` 178 OK / 2 KO alle righe ~1171–1172
(«D-204: il doppio dice "Questo ordine c'è già nella pratica"» e «… porta il numero della pratica»). La pagina è giusta:
`VistaDocumento.tsx` ~riga 772 mostra «Questo ordine c’è già nella pratica <Link>OF/…</Link>…» (con l'apostrofo tipografico ’).
La prova cerca il testo dentro `.dettagli`, probabilmente il contenitore sbagliato, e con l'apostrofo diritto.

Compito: correggi **solo la prova** (selettore del contenitore dove sta davvero la nota, testo senza dipendere dall'apostrofo,
es. `'c' in … and 'già nella pratica' in …`), e controlla anche che il numero sia un link a `/pratiche/1`. Non toccare l'app.
Lancio: dalla radice `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` poi
`bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti`; esito in `strumenti/collaudo/e2e/uscita/e2e/app_documenti.txt`:
0 KO. File ammesso: `strumenti/prove/app_documenti.py`. Regole: `strumenti/opencode/regole-onda-parallela.md`; niente commit, `cd`,
`/tmp`, `&`, `.env`, porte 8001/8002. Riepilogo in 3 righe.
