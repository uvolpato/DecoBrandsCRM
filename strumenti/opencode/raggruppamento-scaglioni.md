# Pacchetto `raggruppamento-scaglioni`

## Contesto
Oggi (D-182, D-197) lo scaglione di un documento si sceglie dallo **sconto medio** del documento che comanda:
uno scaglione solo, base × %. Alcuni fornitori (es. Arte: bollettini 2026 verificati da Ugo) applicano invece la
percentuale **riga per riga**, secondo lo sconto della riga, e poi sommano: sulla stessa fattura righe al 5% → 15%
e righe al 20% → 10%. Decisione di Ugo (16/11/2026): non buttare lo sconto medio, ma aggiungere una
**impostazione «Raggruppamento»** sul fornitore, con **deroga sulla singola pratica**. Il calcolo del CRM è una
**previsione**: il bollettino resta il dato certo (niente raggruppamenti manuali, niente regole in più).

## Regola
1. `raggruppamento` ∈ { `documento`, `riga` }:
   - **documento** (predefinito, comportamento di oggi invariato al centesimo): sconto medio → uno scaglione.
   - **riga**: le righe merce del documento si raggruppano per **sconto di riga** (1 − importo/(quantità × prezzo),
     in %, 2 decimali, stessa funzione dello sconto medio); ogni gruppo → `scaglione()` (primo ≥, come oggi) →
     provvigione del gruppo arrotondata al centesimo; provvigione del documento = **somma dei gruppi**. Stessa cosa
     per la quota del subagente (eccezione del subagente sulla soglia del gruppo, D-51).
2. Precedenza: **pratica** (`ordini_fornitore_testata.raggruppamento`, null = eredita) > **fornitore**
   (`fornitori.raggruppamento`, default `documento`).
3. In modalità riga:
   - righe `spesa`: fuori dai gruppi se il fornitore esclude le spese (D-183, come oggi); se le include
     (`spese_base_provvigione`) entrano come riga con il loro sconto (di norma 0);
   - riga non utilizzabile (quantità o prezzo mancanti, lordo 0) → **tutto il documento** torna in modalità
     documento, e `calcolo.regola` lo dice («riga senza prezzo: sconto medio»);
   - un gruppo con sconto oltre l'ultimo scaglione → stessa anomalia di oggi (provvigione «da decidere»);
   - note di credito: la nota con righe si calcola per gruppi sulle **sue** righe (col segno); in modalità riga il
     calcolo è lineare e la coppia fattura+nota di D-197 non serve. Nota senza righe → riserva di oggi;
   - correzione del documento (`provvigioni_correzioni`), regola mensile, `pct_subagente` dell'agenzia: precedenza
     **invariata** rispetto a oggi (la correzione vince sempre).
4. **Valori fissati** (D-183): un documento già congelato **non cambia** quando si cambia il raggruppamento (né sul
   fornitore né sulla pratica). Cambiano solo i documenti aperti.
5. `calcolo` (JSONB del documento) aggiunge: `raggruppamento`, `raggruppamento_da` (`fornitore` | `pratica`) e, in
   modalità riga, `gruppi: [{ sconto, base, scaglione, pct_agente, pct_sub, provvigione_agente, provvigione_sub }]`
   (importi come testo al centesimo, come gli altri campi). `pct_agente`/`pct_subagente` del documento in modalità riga
   = percentuale effettiva (provvigione ÷ base, 2 decimali), così riconciliazione bollettini ed esportazioni
   continuano a funzionare; segnala nel resoconto dove una pct unica è usata in modo che non regge.

## Compito
- **Schema**: migrazione **scritta, non applicata** a `decobrands_db`:
  `fornitori.raggruppamento VARCHAR(10) NOT NULL DEFAULT 'documento'` e
  `ordini_fornitore_testata.raggruppamento VARCHAR(10) NULL`, con CHECK sui due valori.
- **Motore** (`app/backend/src/motore/motore.ts`): punto unico, accanto a `percentuali()`/`quotaSub()`; nessun calcolo
  nel browser (V12). Riusa `scontoDa`, `utilePerSconto`, `scaglione()`, `speseEscluse`. Codice minimo.
- **Fornitore** (`src/fornitori.ts` + `VistaFornitori.tsx`): campo «Raggruppamento» (tendina: «Sconto medio del
  documento» / «Per sconto di riga») nella stessa finestra dove sta `spese_base_provvigione`; il server valida il valore.
  Cambiarlo registra un evento nel registro (D-31) e ricalcola i documenti **aperti** dei soli ordini di quel fornitore,
  nella stessa transazione (V13).
- **Deroga sulla pratica** (`src/pratiche.ts` + `VistaPratica.tsx`):
  - endpoint che imposta `raggruppamento` (o null = come il fornitore) con **motivo obbligatorio**; transazione,
    `SELECT … FOR UPDATE` sulla pratica, evento nel registro con valore prima/dopo e motivo, ricalcolo dei documenti
    aperti della pratica; stessi permessi della correzione della provvigione;
  - nel Riepilogo della pratica: «Raggruppamento: Per sconto di riga (dal fornitore)» o «… (deroga: motivo)» con un
    pulsante «Cambia» che apre una `Modale` (tendina con «Come il fornitore» + i due valori, campo motivo);
  - in modalità riga, nel dettaglio del documento, i gruppi in una piccola tabella (sconto, base, scaglione, %,
    provvigione) in tenue sotto la provvigione.
- **Elenco pratiche**: segno «deroga» sulle pratiche con `raggruppamento` non null e un segmento/filtro per trovarle
  (componenti esistenti, filtri standard D-22).
- **Guida** (`app/frontend/lib/guida.ts`, sezione «Come si sceglie la percentuale»): i due raggruppamenti con un esempio
  numerico (fattura con righe al 5% e al 20%; sconto medio → uno scaglione; per riga → due scaglioni e somma) e la deroga.
- **Spec**: riga §19 col primo numero libero dopo D-198 (data 16/11/2026, chi: Ugo, perché: fornitori che applicano la %
  per riga, es. Arte; calcolo = previsione, il bollettino resta il dato certo); *Perché* nella sezione dello sconto medio
  (§4.2.7.1 o dove sta D-182); schema in §… delle tabelle; versione spec +0.01. Piano: attività nuova con ore
  **da approvare**.

## Prove (jest con `DATABASE_URL` esplicito su `decobrands_test_raggruppamento`, suite toccate 0 KO, poi `npx tsc --noEmit` backend e frontend)
- fornitore `documento`: tutti i numeri di oggi invariati (le suite esistenti passano senza ritocchi ai valori attesi);
- fornitore `riga`, fattura con righe a sconto 5% (merce 600) e 20% (merce 400), scaglioni 0–10 → 15/8, 20 → 10/5:
  agente 600×15% + 400×10% = 130,00; subagente 48,00 + 20,00 = 68,00; `calcolo.gruppi` con 2 voci;
- stesso documento in modalità `documento`: sconto medio 11,xx% → un solo scaglione, numero diverso;
- deroga `riga` su una pratica di fornitore `documento` → la pratica usa i gruppi, le altre no; motivo vuoto → 400;
- documento congelato + cambio raggruppamento → valori invariati; documento aperto → ricalcolato;
- riga senza prezzo → ritorno allo sconto medio con la regola scritta;
- gruppo oltre l'ultimo scaglione → anomalia;
- nota di credito con righe in modalità riga → provvigione negativa per gruppi;
- evento nel registro per cambio sul fornitore e deroga sulla pratica.
Le prove nel browser (`strumenti/prove/app_pratica.py`, `app_soggetti.py` o la prova dei fornitori): aggiungi i controlli
e verifica solo con `python -m py_compile`; le lancia Claude Code.

## File ammessi
`app/backend/src/**` (motore, fornitori, pratiche, documenti, registro), `app/backend/prisma/schema.prisma` e la nuova
cartella di migrazione, `app/backend/test/**`, `app/frontend/app/(app)/fornitori/**`, `app/frontend/app/(app)/pratiche/**`,
`app/frontend/lib/guida.ts`, `app/frontend/lib/entita.ts` (solo se serve per il filtro), `strumenti/prove/app_*.py`,
`specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`. Aggiungi, non riscrivere. Vietati: prototipo, `componenti/**`
(usa quelli che ci sono; se ne serve uno nuovo, fermati e scrivilo nei dubbi), `stile.css`.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12 (tutto sul server, il frontend manda solo
la scelta e il motivo), V13 (una transazione), D-11, D-31, D-182, D-183, D-197. Italiano semplice, commenti brevi con
rimando (`// D-nn §19`). Codice minimo. **Ogni comando prisma/jest con `DATABASE_URL` esplicito nella stessa riga**,
puntato a `decobrands_test_raggruppamento` (crealo con owner `decobrands`, applica le migrazioni, cancellalo alla fine);
mai `migrate` su `decobrands_db`. `.env` mai letto con cat/readFileSync (l'URL si costruisce con grep). Niente commit,
porte 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill da caricare **davvero** con lo strumento `skill`: `owasp-security`,
`postgresql-code-review`, `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-raggruppamento-scaglioni.md`: file toccati, schema e migrazione, esempio numerico, prove ed
esito, punti dove serve ancora una pct unica (riconciliazione, esportazioni), dubbi, «Da documentare» (nota di rilascio
0.2.9). Riepilogo finale in massimo 10 righe.
