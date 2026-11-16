# Resoconto — `documenta-d153-d176` (registro §19 D-153…D-176)

Esecutore: DeepSeek. Pacchetto `strumenti/opencode/documenta-d153-d176.md`; regole comuni
`strumenti/opencode/regole-onda-parallela.md`. Niente commit, `cd`, `/tmp`, `&`; `.env` mai letto;
niente Integra, `decobrands_db`, porte 8001/8002. Skill caricata davvero: `caveman`.
Nessun codice modificato.

## Cosa è stato fatto

1. **§19**: 24 righe fra D-152 e D-177, una per numero. D-153…D-176 documentate con data, decisione,
   perché, chi (Ugo) e dove; **D-155 e D-160 = «Numero non usato»** (nessuna traccia in `app/`,
   `prototipo-alternativo/`, `strumenti/`).
2. **Righe *Perché*** aggiunte dove mancavano: §4.2.2 (D-166), §5.1 (D-166), §5.11 (D-168),
   §6.5 (D-164, D-165, D-169, D-170, D-176), §7.9 (D-153/D-154, D-157/D-161/D-162,
   D-158/D-159/D-175, D-171/D-172/D-173), §16.4 (D-171/D-172/D-173).
3. **Versione spec** 8.83 → **8.84**, con il riassunto dell'onda e i riferimenti alle *Perché*.
4. **Piano** 2.4 → **2.5**: F7-A13 non cita più D-178/D-179 come se fossero sconto di riga e importo
   calcolato (resta D-179 per «0 = non letto»; sconto di riga e importo calcolato **non hanno numero**
   nel §19: i resoconti proponevano D-178/D-179, già presi); F7-A14 descrive la **tendina nella
   finestra di ricerca**, non i segmenti (D-177).
5. `python3 strumenti/genera-pagine-doc.py`: **OK** (`specifica.html` 19 sezioni, `preventivo.html`
   aggiornato).

## Tabella numero → fonte

| # | Fonte principale | Note / collisioni |
|---|---|---|
| D-153 | `resoconto-somma-righe.md` (13/11); `resoconto-correggi-ordine.md` | **Doppio uso**: la riga documenta la «Somma righe»; i commenti del codice (`anagrafica-integra.ts`, `CampoRicerca.tsx`) usano D-153 anche per la ricerca per parole. Annotato nella riga, da rinumerare |
| D-154 | `resoconto-disposizione-testata.md` + `-correzioni-1.md` (13/11) | testata su tre righe, pulsante ›, P.IVA letta, «Somma righe» sopra l'Importo |
| D-155 | nessuna traccia | **numero non usato** |
| D-156 | `resoconto-vecchio-crm-in-esercizio.md` (14/11) | anagrafica del vecchio CRM in esercizio, `--aggiungi` |
| D-157 | `resoconto-codice-cliente-in-ricerca.md` (14/11) | colonna «Cod. cliente» col fornitore nel contesto |
| D-158 | `resoconto-agenzia-nel-flusso.md` (14/11) | agenzie da sempre + «Aggiungi l'agenzia» nel flusso |
| D-159 | `resoconto-agenzia-da-confermare.md` (14/11) | 1587 agenzie «da confermare» |
| D-160 | nessuna traccia | **numero non usato** |
| D-161 | `resoconto-ricerca-numeri-rossi.md` (14/11); `regole-interfaccia.md` §4 | niente id/pallino rosso finché le voci non arrivano |
| D-162 | `resoconto-scaglione-nel-flusso.md` (14/11) | 409 `scaglione_mancante` → `FormPercentuali` nel flusso |
| D-163 | `resoconto-correggi-percentuali-scaglioni.md` (14/11) | aggiungere/togliere scaglioni in correzione |
| D-164 | `resoconto-riconoscimento-furbo.md`, `resoconto-somiglianza-pr102813.md` (15/11) | `alias_letti` + `pg_trgm` 0,6/0,2, coda dal più vecchio, SSE |
| D-165 | `resoconto-riconoscimento-furbo.md` (15/11) | «Salva la P.IVA», solo CRM, D-100 |
| D-166 | `resoconto-provvigione-non-somma.md` (15/11) | `pct_agente` totale, `pct_subagente ≤ pct_agente` |
| D-167 | `resoconto-link-diretti.md` (15/11); `regole-interfaccia.md` §1 | navigazione in sequenza, stesso stato |
| D-168 | `resoconto-percentuali-riprogetto.md` (15/11) | finestra a uno scaglione |
| D-169 | `resoconto-numero-ordine-fornitore.md` (15/11) | coppia fornitore + numero d'ordine |
| D-170 | `resoconto-numero-ordine-fornitore.md`; `resoconto-pallini-link.md` | **Doppio uso**: riga = `lettura_grezza`/rileggi; commenti (`CampoRicerca`, `Campo`, `FormAgenzia`) usano D-170 anche per pallino-link e conferma all'uscita. Annotato, da rinumerare |
| D-171 | `resoconto-azioni-riga.md` (15/11) | `AzioniRiga`, icone in slot fissi |
| D-172 | `resoconto-conferma-con-spunta.md` (15/11) | `ConfermaGrave` con casella |
| D-173 | `resoconto-affiancati-righe.md` (15/11) | `Copiabile` |
| D-174 | `resoconto-conferme-multiple.md` (15/11) | conferme/proforme parziali o sostitutive |
| D-175 | `resoconto-riconosciuto-coerente.md` (15/11) | riconoscimento salvato all'apertura, spunta codice cliente |
| D-176 | `resoconto-confronto-righe.md`, `resoconto-comandi-servizio.md`, `resoconto-prova-lettura-gruppo.md` (15/11) | righe copiate nella pratica + gruppi `lettura`/`confronto` |

## Prove

- `python3 strumenti/genera-pagine-doc.py`: OK.
- `npx tsc --noEmit`: non eseguito — nessun file di codice toccato.
- Prove nel browser non lanciate (regole dell'onda); riguardano solo documenti, non l'app.

## Aperti

1. D-153 e D-170 hanno due significati nei commenti del codice: le regole secondarie sono annotate
   nella riga di §19 e vanno rinumerate dal lead quando si ripuliranno i commenti.
2. D-155 e D-160 restano liberi (non usati).
3. Sconto di riga e importo calcolato (pacchetti `sconto-riga`, `importo-calcolato`) non hanno un
   numero nel §19: i numeri proposti (D-178/D-179) erano già presi. Il piano F7-A13 lo dice.
4. `specifica.html` e `preventivo.html` rigenerati: nessuna altra pagina dei documenti da allineare.

## Da documentare

Nessuna voce residua: il lavoro era la documentazione stessa.
