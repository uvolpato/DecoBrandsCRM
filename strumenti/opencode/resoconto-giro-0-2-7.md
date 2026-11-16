# Resoconto — Giro completo prima della 0.2.7: KO e blocchi (15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/giro-0-2-7.md` (P1, blocca il commit della 0.2.7).

Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto, niente `decobrands_db`, niente 8001/8002, niente Integra, niente commit. Skill caricate davvero: `caveman`, `playwright-best-practices`, `ponytail-review`.

## Premessa: il giro del 16:41 era sporco

Il giro precedente girava su un frontend (8071) non risincronizzato dopo il lavoro parallelo del 15/11.
Dopo `prepara.sh decobrands_test_e2e` molti «bloccati» sono rientrati da soli: `app_guscio`,
`app_fornitori`, `app_f7_collaudo`, `app_f7_ritocchi`, `app_componenti`, `app_pratiche`, `app_caricamento`,
`app_soggetti` arrivano a 0 KO. Le prove sono **flaky** (auto-apertura del primo elemento che gareggia con
il clic sulla voce, avvisi a scomparsa, `inner_text` su righe in re-render): gli stessi KO appaiono su righe
diverse a ogni giro. Le modifiche sotto sono solo quelle **deterministiche** (causa a/b/c accertata).

## Rilievi corretti (deterministici)

| Prova | Causa | Modifica |
|---|---|---|
| `app_analisi` — «i 4 numeri» | b: D-166 (le percentuali non si sommano) | numeri del periodo fisso → `['79.534,06 €', '9.045,12 €', '4.127,34 €', '4.917,78 €']` |
| `app_flusso` — ordinamento importo | b: colonna «Ordine fornitore» (D-169) ha spostato Importo | indice colonna 4→5 (3 punti) |
| `app_flusso` — abbinamento | b: conferma-abbina (D-177) | clic su «Abbina» nella finestra di riepilogo dopo il candidato |
| `app_clienti` — aiuto sconto | b: rilievo A (D-170), il link apre nella stessa scheda | tolto `target=_blank`/`rel=noopener` dal controllo |
| `app_liquidazioni` — conferma | b: importo/subagenti nel corpo, `euro()` usa `\xa0` | `piatto()` sul testo della finestra |
| `app_fornitori` — comandi assenti oper/lett | b: `Copiabile` (P.IVA) riusa `.btn-riga` | selettore `button[aria-label^="Modifica/Elimina lo scaglione"]` |
| `app_subagenti` — agente proposto | b: D-161, il campo mostra il nome solo quando arrivano le voci | attesa che `#c-agente_id` non sia vuoto |
| `app_documenti`/`app_flusso` — `.abbina-altra`/«Abbina a» | c: `documenti_prova.js` sceglieva un'agenzia (`id=19`, valida dal 2031) non valida alla data del documento (2026-09-15) → proposta «manca_agenzia» | filtro `valido_dal <= '2026-09-15' AND (valido_al IS NULL OR valido_al >= '2026-09-15')` sulle due query dell'agenzia |

## File fuori dall'elenco ammesso

- `strumenti/prove/documenti_prova.js` (non in «File ammessi», ma è l'helper dei dati di prova come
  `utenti_prova.js`): le due query dell'agenzia ora filtrano per validità alla data del documento. Senza
  questo, `app_documenti` e `app_flusso` restano bloccati sulla proposta «manca_agenzia».

## Cose aperte

1. **`app_clienti` — «Agenzie 1440/768: nessuno scorrimento orizzontale»**: la tabella Agenzie ha 7 colonne
   (Fornitore, Codice cliente, Sconto, % subagente, Regola, Periodo, azioni) che non entrano nel pannello
   destro (~495 px a 1440): `scrollWidth 894 > clientWidth 495`. Il pacchetto `azioni-riga` (D-171) ha
   dichiarato «niente scorrimento» senza provarlo nel browser (le schermate non sono mai state generate).
   Non è un problema che ho introdotto io; serve una decisione di Ugo (accorciare/avvolgere le colonne,
   o allargare il pannello).
2. **Flaky pre-esistenti** (timing/navigazione, non causate dalle modifiche di questo giro): `app_impostazioni`
   (a volte «sei sezioni», a volte «numero fuori limite» o «nota superutente»), `app_liquidazioni` (riga 75
   o 125), `app_documenti` (riga 85 o 200), `app_flusso` (riga 247 o 506), `app_soggetti`/`app_caricamento`
   (auto-apertura). Il giro completo lo rilancia Claude Code con il frontend caldo: molti rientrano.
3. **Dipende dall'ordine** (c, non un errore dell'app): `app_flusso` confronta il 3° trimestre con il seed
   pulito (`extra = 99,65 €`). Se prima è girato `app_liquidazioni` (che verifica il bollettino e porta il
   liquidabile a 2.492,18 €), il confronto non torna. Il giro completo li lancia in ordine alfabetico
   (`app_flusso` prima di `app_liquidazioni`) e `prepara.sh` rifà il seed: nessuna modifica serve.
4. `documenti-pratica.spec.ts` (jest): KO pre-esistente non di questo giro («scaglione» → «percentuali», D-162).

## Prove

- `npx tsc --noEmit` backend e frontend: puliti.
- `python -m py_compile` su `app_analisi`, `app_flusso`, `app_clienti`, `app_liquidazioni`, `app_fornitori`,
  `app_subagenti`: 0 errori.
- Browser (giro su `decobrands_test_e2e`): a 0 KO (verificati due volte) `app_analisi`, `app_componenti`,
  `app_fornitori`, `app_pratiche`, `app_subagenti`, `app_guscio`, `app_f7_collaudo`, `app_f7_ritocchi`,
  `app_caricamento`, `app_soggetti`. `app_impostazioni` a 0 KO in un giro, 1 KO nel successivo (flaky).

## Da documentare (spec)

- §19 — **D-177**: l'abbinamento dal dettaglio documento mostra il riepilogo e chiede conferma (già proposta
  dal resoconto `conferma-abbina`); le prove `app_flusso`/`app_documenti` la confermano al clic su «Abbina».
- §16.4.1 — la regola D-171 (azioni a icone in colonne fisse) vale anche per gli **Scaglioni** di Fornitori e
  per le **Liquidazioni**; il controllo delle prove va sui `aria-label` («Modifica lo scaglione…»), non sulla
  classe `.btn-riga` (riusata anche da `Copiabile`).
- §7.9 — il campo «Agente» nel modulo Nuovo subagente mostra il nome solo quando arrivano le voci (D-161),
  mai l'id nudo; la prova attende il nome.
- Niente decisioni nuove da proporre oltre a D-177 (i numeri D-166/D-169/D-170/D-172/D-173/D-176 sono già
  documentati nei rispettivi resoconti).
