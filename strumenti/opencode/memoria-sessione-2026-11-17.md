# Memoria della sessione 16–17/11/2026 (per un altro agente: OpenCode o Claude)

Leggila insieme a `CLAUDE.md`, `strumenti/opencode/regole-onda-parallela.md` e `specifica-crm-provvigioni.md` §19.
Qui c'è solo quello che **non** si ricava dal codice o dalla spec: decisioni prese a voce, incidenti, cose aperte.

## 1. Versioni fatte (tag Git, niente push)
| Tag | Contenuto | Decisioni |
|---|---|---|
| v0.2.9 | raggruppamento documento/riga sul fornitore con deroga sulla pratica; scaglioni «solo esatti» ±0,05; componente `Informazioni` («i»); servizio `provvigioni` ammesso nel registro | D-199, D-200 |
| v0.2.10 | quota pagata letta dal bollettino; più righe dello stesso bollettino sulla stessa fattura = gruppo; tolleranza 0,01 €/fattura; scaglioni **«Sconto da %»** (ultima soglia ≤ sconto, come il vecchio CRM); Documenti più veloce (Integra: tempo 500 ms + interruttore 60 s) | D-201, D-202, D-203 |
| v0.2.11 | «Sostituisci …» per ordine/conferma/proforma aggiornati (stesso numero e fornitore); cliente proposto dal codice anche sul doppione | D-204 |
| v0.2.12 | agenzia **senza subagente** → provvigione tutta a Decobrands, quota sub 0, fuori dalle liquidazioni, «Senza subagente» in Analisi | D-205 |

**Non ancora committato** (verificato a pezzi, manca il giro finale): `agenzia-togli-subagente` (togliere il subagente da
una data), `note-informazioni` (17 note fisse nel pulsante «i»), `layout-due-colonne` (dettaglio min 560 px, impilamento
sotto 1250 px, scheda Agenzie a 2 colonne). Diventeranno **v0.2.13** insieme ai pacchetti in corso (§5).

## 2. Regole di dominio decise a voce (Ugo e Matteo)
- **Il calcolo del CRM è una previsione; il bollettino del fornitore è il dato certo.** Le differenze si vedono come
  anomalie a consuntivo e una persona decide (accettato / contestato / attendere). **Non** si modella la logica del
  fornitore (niente formule per fornitore, niente raggruppamenti manuali, niente bonifico come prova, niente lettura dello
  Skonto). Il nuovo fornitore si configura con la pagina Fornitori che c'è, senza procedure guidate.
- **Una sola provvigione per fattura**, sempre (Matteo): il raggruppamento «per riga» resta disponibile ma spento.
- **Scaglioni come nel vecchio CRM**: la soglia è «Sconto da %», vale da quello sconto in su fino alla successiva.
  «A fascia»: ultima soglia ≤ sconto; sotto la prima soglia = anomalia; sopra l'ultima vale l'ultima. «Solo esatti»: lo
  sconto deve coincidere con una soglia (±0,05), altrimenti anomalia.
- Fornitori (dettagli in memoria di Claude `fornitori-regole-matteo`):
  - **Arte** (id 31): sul maturato, spese **escluse**, sconto medio del documento, **solo esatti**, tabella del vecchio
    CRM (0→15/8, 1→7/7 fiera, 5→15/8, 10→15/8, 15→12/6, 20→10/5, 25→8/4, 30→5/3). Il bollettino ha `% bezahlt`
    (quota pagata, ~96,4% per Skonto 4% sulla merce) e a volte righe al 10%: si guardano a mano.
  - **Packara**: sul maturato, 16% / 8%, spese escluse.
  - **Gasper**: sul fatturato, a fascia: 0→20/10, 30→15/8, 40→10/6; differenze per promozioni non comunicate.
- **Documenti veri** 2026: `Documenti Veri/Arte`, `Documenti Veri/Gasper`, `Documenti Veri/Packara` (ordini, fatture,
  bollettini). Non vanno analizzati se non richiesto.

## 3. Incidente da non ripetere (17/11)
Uno script `ripro-deroga.ts` lanciato con `ts-node` **fuori da jest** ha chiamato `svuota()`+`seed()` e ha **svuotato
`decobrands_db`** (fuori da jest `DATABASE_URL` è il db vero). Ripristinato dalla copia delle 13:20 (perse le modifiche
dopo, poi reinserite da Ugo). Ora `svuota()` e `seed()` rifiutano i database che non iniziano con `decobrands_test`, e
`regole-onda-parallela.md` vieta gli script fuori da jest che toccano il db. **Per riprodurre un errore: una prova jest
(`-t "nome"`), mai uno script.** Copie di sicurezza in `C:\Progetti\copie-decobrands\` (pg_dump `-Fc`, PostgreSQL 18;
il server è 16: per ripristinare i dati si estrae SQL con pg_restore 18 e si toglie `transaction_timeout`).

## 4. Ambiente e trappole note
- App di Ugo: frontend **8001** (`next dev`), backend **8002**. In questo momento il backend gira da `node dist/src/main.js`
  (non in watch): dopo modifiche al backend serve `npx nest build` e riavvio. `avvia.bat` riavvia tutto in watch.
- **La 8002 (e una volta la 8001) si è fermata due volte senza errori** mentre giravano le prove nel browser. Sospetto:
  `strumenti/collaudo/e2e/giro.sh` chiude il backend di prova con `taskkill //F //PID $(netstat … ':8012' …)` senza
  controllare il PID trovato. **Da correggere**: chiudere solo il processo avviato dallo script (`$PID`), mai per porta.
- Prove nel browser: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` **prima di ogni prova** (le prove
  sporcano i dati), poi `giro.sh decobrands_test_e2e <prova>`; backend di prova 8012, frontend di prova 8071 (copia in
  una cartella temporanea di Claude). Il frontend 8071 con Turbopack non parte (link a `node_modules`): avviarlo con
  `next dev --webpack -p 8071`. Le prime aperture compilano a freddo (>30 s): prima del giro aprire le pagine con curl.
- Jest su Windows: mai tutte le suite insieme; a gruppi di ~9, `node node_modules/jest/bin/jest.js …` (con `npx` a volte
  esce 127 senza uscita). `liquidazioni.spec` può uscire 127 per LibreOffice anche con tutte le prove OK: leggere «Tests:».
- `opencode run --attach … ` a volte non crea la sessione (log vuoto) **oppure la crea in ritardo**: prima di rilanciare
  controllare di nuovo `/session`; dopo un rilancio controllare `/session/status` e fermare l'eventuale doppione con
  `POST /session/<id>/abort` (17/11: due sessioni sullo stesso pacchetto, fermata in tempo). Con `-s` il
  messaggio a volte si perde: controllare `/session/status` (busy) dopo l'invio.
- **Un pacchetto con migrazione rigenera il client Prisma in `app/backend/node_modules`, condiviso con la 8002**: finché
  la migrazione non è applicata a `decobrands_db`, il backend di Ugo fallisce («column (not available) does not exist»)
  e si ferma. Dopo un pacchetto con migrazione: copia di sicurezza, `migrate deploy` su `decobrands_db`, `nest build`,
  riavvio. Da risolvere stabilmente (client di prova separato o build dell'app isolata).
- Il ponte di Integra dalla macchina di sviluppo spesso non risponde (D-203): non è un errore del CRM.
- La migrazione deve avere un timestamp **unico** (una volta due migrazioni con lo stesso orario: rinominata).

## 5. In corso e in coda (17/11 sera)
1. **`pratica-elimina-annulla`** (v4-pro, in corso): Elimina definitiva solo se non contabilizzata, solo
   amministratore, PDF negli **scartati**, fotografia nel registro (D-206); Annulla **sempre** con motivo obbligatorio e
   data, reversibile con Ripristina, documenti già contabilizzati invariati (D-207).
2. **`documenti-sostituiti-visibili`** (in coda, dopo il 1): versioni precedenti di ordine/conferma/proforma sostituiti
   visibili nella pratica con PDF e righe lette, fuori dai calcoli; recupero delle sostituzioni già fatte.
3. **Correzione di `giro.sh`** (due righe, §4).
4. Poi: giro nel browser di tutte le pagine toccate (1440 / 1200 / 768), migrazioni su `decobrands_db` con copia prima,
   commit **v0.2.13**.

## 6. Aperti minori
- Testo della contestazione di un gruppo nel bollettino con % diverse mostra «(0 %)».
- Riepilogo pratica in modalità riga: % singole e avviso dello scaglione ancora pensati per lo sconto medio (solo testo).
- `componenti/Sagoma.tsx`: default `minmax(0,1fr)` da allineare alla larghezza minima del dettaglio (560 px).
- A 1200 px le pagine a due colonne vanno una sopra l'altra: Ugo non ha ancora detto se gli va bene.
- Il ponte Integra cerca con `regexp_replace`/`ILIKE` senza indice: da segnalare a chi gestisce Integra.
- Ricalcoli fatti a mano su `decobrands_db` (SQL diretto) non compaiono nel registro: Arte raggruppamento → documento,
  Arte spese → escluse (17/11).

## 7. Skill condivise (18/11)
`opencode.json` → `skills.paths` aggiunge a OpenCode le skill di Claude Code: `.claude/skills` (`fase`, `orchestratore`,
`graphify`), i plugin `ponytail` (ponytail, ponytail-review, -audit, -debt…), `engineering` (code-review, debug,
testing-strategy, architecture…), `design` (ux-copy, accessibility-review…). `~/.claude/skills` (owasp-security,
caveman, playwright…) OpenCode lo legge già da solo. Verifica: `opencode debug skill` (61 skill il 18/11). I percorsi dei
plugin contengono identificativi di versione (`engineering~g7`, `afe29730…~g5`): se un aggiornamento dei plugin li cambia,
vanno riallineati. Il server `opencode serve` sulla 4097 legge la configurazione solo all'avvio: va riavviato.
