# Pacchetto `bollettini-quota-somma`

## Contesto (decisioni di Ugo e Matteo, 17/11/2026)
- Il calcolo del CRM è una **previsione**; il bollettino è il dato certo. Le differenze si vedono come anomalie e una
  persona decide a mano (accettato / contestato / attendere, D-49). **Non** si modella la logica del fornitore.
- **Una sola provvigione per fattura**, sempre (Matteo). Ma alcuni bollettini scrivono più righe per la stessa fattura
  (Arte: una al 10% e una al 15%), e oggi `bollettino.ts:261` le rifiuta come doppioni (`ConflictException`).
- Arte paga sul **pagato**: ogni riga ha una colonna `% bezahlt` (quota pagata, di solito 96,00–96,52%, a volte 100%)
  e `Prov. € = Betrag × % bezahlt × Prov. %`. Senza la quota la nostra previsione (base × 15%) differisce del ~3,6% su
  **ogni** riga e le anomalie diventano rumore.
- Esempi veri: `C:\Users\uvolp\AppData\Local\Temp\claude\1e3dfabdb7c29fc1\2652f049-659e-4fe3-8bf7-2473b661cf6b\scratchpad\*.txt`
  **non leggibile da te** (fuori progetto): usa i PDF in `Documenti Veri/Arte/Rapportini Provvigioni/` (7 bollettini
  gen–set 2026, 46 righe); bollettini di `Documenti Veri/Packara/` e `Documenti Veri/Gasper/` per le prove di non regressione.
  Riga tipo: `RE194149 28.04.2026 Il Bosco di Zan … Betrag 326,00 € · % bezahlt 96,43 · Prov % 15 · Prov € 47,15`.

## Regola
1. **Quota pagata** sulla riga del bollettino: colonna nuova `bollettini_righe.quota_pagata DECIMAL(7,4) NULL` (in %).
   La legge il lettore dove il bollettino la porta (Arte: «% bezahlt»), si può correggere a mano come gli altri campi.
   Vuota = 100% (Packara, Gasper, tutti gli altri: comportamento di oggi invariato).
2. **Nostro atteso** in riconciliazione = provvigione del documento (`provvigioneDocumento`, come oggi) × quota_pagata/100,
   arrotondato al centesimo. Il calcolo sta solo in `riconcilia` (V12). Il valore congelato alla verifica
   (`importo_calcolato`, `pct_calcolata`) è quello con la quota.
3. **Più righe per la stessa fattura**: si abbinano tutte allo stesso documento; la riconciliazione confronta la
   **somma** delle righe (importo riconosciuto) con la nostra unica provvigione. Le righe dello stesso documento formano
   un gruppo: differenza, categoria e decisione valgono per il gruppo (la decisione presa su una riga si applica a tutte;
   nello schermo il gruppo si mostra come una riga con il dettaglio delle righe del bollettino sotto, in tenue). Il
   controllo di `bollettino.ts:261` resta **solo fra bollettini diversi** (la stessa fattura in due mesi è ancora un
   doppione); nello stesso bollettino è ammessa. Per la quota del gruppo: la media pesata sugli importi del bollettino
   (`Σ Betrag × quota / Σ Betrag`); se le quote delle righe differiscono di più di 0,01 punti, anomalia «quote diverse».
4. **Tolleranza**: differenza ≤ 0,01 € per fattura → quadra. Costante nel motore con commento `// D-nn §19`.
5. Nessun cambio a liquidazioni (il subagente prende la sua quota sul documento, come oggi): scrivilo nel resoconto se
   trovi che la quota pagata dovrebbe toccare anche lui, **non** cambiarlo.

## Compito
- Migrazione **scritta, non applicata** a `decobrands_db` (colonna `quota_pagata`, CHECK 0–100).
- Lettura del bollettino: aggiungi il campo `quota_pagata` dove il lettore estrae le righe (schema dei campi, prompt del
  lettore, salvataggio, correzione a mano); per i bollettini che non hanno la colonna resta vuoto.
- Motore (`riconcilia`), `bollettino.ts` (abbinamento, doppioni, decisione di gruppo), pagina del bollettino (gruppo
  con dettaglio e colonna «Quota pagata» mostrata solo se almeno una riga ce l'ha).
- Guida (`lib/guida.ts`, pagina Bollettino) e spec: riga §19 col primo numero libero dopo D-200 (perché: anomalie a
  consuntivo senza rumore; una provvigione per fattura, Matteo 17/11/2026), *Perché* in §6.2 / §5.11, schema, versione
  +0.01; piano: attività con ore **da approvare**.

## Prove (jest con `DATABASE_URL_TEST` su `decobrands_test_bollettini`, crea e cancella; 0 KO; `npx tsc --noEmit` backend e frontend)
- RE194149: base 326,00 × 15% × 96,43% → 47,15 = Arte → quadra;
- RE193071 (Arte): due righe 247,60@10% (23,77) + 1.869,70@15% (269,24) quota 96,00 → somma 293,01; nostro (2.117,30 ×
  15% × 96%) = 304,89 → anomalia di gruppo con differenza −11,88; una sola decisione per il gruppo;
- riga senza quota → come oggi (prove esistenti invariate);
- stessa fattura in due bollettini diversi → ancora rifiutata;
- quote diverse nel gruppo → anomalia «quote diverse»;
- differenza 0,01 → quadra; 0,02 → anomalia.
Prova nel browser: aggiungi controlli a `strumenti/prove/app_bollettino.py` (solo `py_compile`; il giro lo lancia Claude Code).

## File ammessi
`app/backend/src/**`, `app/backend/prisma/schema.prisma` + nuova cartella di migrazione, `app/backend/test/**`,
`app/frontend/app/(app)/bollettini/**`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_bollettino.py`,
`specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`. Vietati: prototipo, `componenti/**`, `stile.css` (solo classi nuove).

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` (**niente script fuori da jest che toccano il database**) e `CLAUDE.md`.
V12, V13 (decisione di gruppo in una transazione, `FOR UPDATE`), D-11, D-49, D-56, D-183, D-199. Italiano semplice, codice
minimo. Ogni comando prisma/jest con `DATABASE_URL` / `DATABASE_URL_TEST` esplicito; mai `decobrands_db`; `.env` mai letto
(URL con grep). Niente commit, `cd`, `/tmp`, `&`, porte 8001/8002, Integra. Skill con lo strumento `skill`:
`owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-bollettini-quota-somma.md`: file toccati, migrazione, esempi numerici, prove ed esito, dubbi,
«Da documentare» (nota di rilascio 0.2.10). Riepilogo in massimo 10 righe.
