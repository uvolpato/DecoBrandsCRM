# Prova delle ultime modifiche (89a4105..e879c62, 08–11/11/2026)

Oggetto: 13 commit, ~5.400 righe in `app/`: anagrafica a soggetti (F1-A8a/b), import vecchio CRM (F1-A9a),
ponte vero verso Integra e D-100…D-113, storico legami (F1-A12), anagrafica su richiesta (F1-A11/A11b),
agenzia dal documento (F2-A5), proposta del documento (F2-A6), scaglioni obbligatori (F1-A13).
Nessuna correzione applicata. Integra mai contattata (ponte finto in locale `decobrands_ponte_prova`).

## Prove

| Prova | Esito |
|---|---|
| `npm test` (backend, `decobrands_test`) | **39/39 file, 579/579 OK** |
| `npx tsc --noEmit` (frontend) | OK |
| `app_soggetti` | 56 OK, 0 KO |
| `app_clienti` (con Cerca in Integra) | 42 OK, 0 KO |
| `app_fornitori` (con Cerca in Integra) | 35 OK, 0 KO |
| `app_documenti` | 40 OK, 0 KO |
| `app_subagenti` | 30 OK, 0 KO |
| `app_pratiche` | 19 OK, 0 KO |
| `app_pratica` | 85 OK, 0 KO |
| `app_guida` | 26 OK, 0 KO |
| `app_flusso` | **si ferma** (riga 289): prova vecchia, vedi R0-01 |

Ambiente: backend `dist/` sulla 8012, frontend `next dev` sulla 8071, database `decobrands_e2e`/`decobrands_e2e2`
(nuovi) e `decobrands_test` (per Clienti/Fornitori: `integra_prova.js pulisci` gira solo lì).

Note sull'ambiente (non errori dell'app):
- in serie, le prove superano il limite ai tentativi di accesso per IP (D-41, in memoria) → 429 «Troppi
  tentativi»: si riavvia il backend fra una prova e l'altra;
- le prove lasciano soggetti/fornitori nel database (es. `app_soggetti`), e `app_flusso` poi conta righe in più.

## Rilievi

Dettaglio completo in `R1-backend-ultime.md` (13) e `R2-frontend-ultime.md` (13). Qui l'elenco per gravità.

### P0
- **R2-01 — «Importa da Integra» (fornitore) dal documento cancella tutte le righe lette.** Verificato sul codice:
  `VistaDocumento.tsx:359-373` manda `PUT documenti/:id` con la sola testata; `documenti.ts:670` mette
  `righeInput = []` e `:742` cancella sempre tutti i campi `righe[*]` → valori letti, affidabilità e posizioni
  persi. In più import e collegamento sono due transazioni (V13): se il PUT dà 403 il fornitore resta importato
  e il documento scollegato. Correzione: in `correggi` riscrivere le righe solo se `Array.isArray(b.righe)`;
  meglio ancora collegare il documento sul server nella stessa transazione dell'import. **V4.**

### P1
- **R1-01 — Ponte di Integra giù (VPN, connessione rifiutata, vista mancante) → `GET /documenti` e
  `/documenti/:id` rispondono 500.** `cerca` rilancia gli errori diversi dal timeout (anagrafica-integra.ts:60-65)
  e `contestoDocumento`/`esitiImportazione` non li intercettano. La pagina Documenti si rompe quando Integra
  non risponde. **V4.**

### P2
- R1-02 pool del ponte `max: 2` senza timeout sulle query; `importa` senza limite di 3 s.
- R1-03 `importa` crea il soggetto sempre con paese IT: fornitore estero già importato → secondo soggetto.
- R1-04 ruolo già presente per P.IVA: «già presente» ma il codice di Integra non si registra (non si sincronizza mai).
- R1-06 `cliente_da_integra` dallo storico usa `fornitori_id`, NULL nei dati veri (la prova passa perché lo imposta).
- R1-07 `stessaCoppia` accetta una riga dello storico con un solo lato uguale; riga riusabile, nessun lock.
- R1-08 `creaRuolo` accetta `codice_integra` dal browser senza verificarlo sul ponte (V12).
- R1-09 tre `normalizzaPiva` diverse; quella di `proposta.ts` tiene il prefisso `IT`.
- R1-10 `import:storico --sostituisci` svuota fuori transazione con `RESTART IDENTITY`.
- R1-13 prove mancanti sui percorsi sopra (403 senza `dati.importa`, 400 su `/integra/*`).
- R2-02 dettaglio Soggetti senza annullamento: risposte fuori ordine → modifiche sul soggetto sbagliato.
- R2-05 `FormAgenzia` sceglie il subagente nel browser abbinando nomi (V12) e scavalca il `subagente_id` del server.

### P3
- R0-01 `app_flusso.py:289` aspetta 11 righe nella matrice Bollettini; il seed ora ha 12 fornitori (MCL, D-101).
- R1-05, R1-11, R1-12; R2-03/04 e R2-06…13 (sagome, cache scaglioni, permessi del pulsante «Configura
  l'agenzia», guida non aggiornata, `.clienti-filtri` mancante nello stile dell'app, nomi dei pulsanti «Importa»).

## Da decidere (Ugo)
1. R2-01: correzione minima (`correggi` non tocca le righe se non arrivano) o collegamento sul server nella
   stessa transazione dell'import? Raccomandata: tutte e due (la prima protegge anche altri chiamanti).
2. R2-05: subagente non trovato → campo vuoto (raccomandato) o primo dell'elenco?
3. Dopo *Importa* si apre la scheda del nuovo cliente/fornitore (come dice la guida) o si resta nell'elenco?
4. Cerca in Integra va aggiunto al prototipo?
5. R1: fatture datate dopo la chiusura dell'agenzia non entrano più nella pratica: va bene?
6. R1: cambiare la P.IVA del soggetto aggiorna anche le versioni dei ruoli?
7. R1: `sconti` con `ON DELETE CASCADE` da `interscambio`: resta o diventa `RESTRICT` (collegato ad A3-03)?
