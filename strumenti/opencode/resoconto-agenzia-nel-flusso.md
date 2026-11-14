# Resoconto — Agenzia mancante: prima dal vecchio CRM, poi creata senza uscire dal flusso (P1, 14/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/agenzia-nel-flusso.md`.

## Cosa è stato fatto

1. **Import (`app/backend/prisma/import-vecchio-crm.ts`)**: le agenzie del vecchio CRM (`interscambio`)
   valgono **da sempre** (`valido_dal = 2000-01-01`, costante `DAL_SEMPRE` con commento). Solo per
   `interscambio`; il resto (sedi, recapiti, versioni) resta com'era.
2. **Nuova opzione `--correggi-date`** (con `--db decobrands_db --aggiungi`, anche `--prova`): porta a
   `2000-01-01` il `valido_dal` delle agenzie già importate che hanno ancora `valido_dal = 2026-11-08`
   (data dell'estratto), **solo** se non hanno righe successive per la stessa coppia, nessun periodo
   chiuso/liquidazione che le usi (`ultimaChiusura`) e nessuna modifica dopo l'import (nessun evento
   `registro` per `entita='interscambio'`: l'import non ne scrive di singoli). Una transazione, un evento
   nel registro con il numero di righe (`date_corrette`). Idempotente. Richiede `--aggiungi`.
3. **Proposta della coppia**: non serve una rotta nuova per sconto/subagente — `FormAgenzia` li propone già
   dal vecchio CRM (D-112, `interscambio/storico`) quando fornitore e codice sono fissi. Aggiunta solo la
   rotta di sola lettura `GET clienti/:id/agenzia-nuova?fornitore_id=` con i nomi della coppia (D-158).
4. **Flusso (`VistaDocumento.tsx`, `ApriPratica`)**: se `abbina` risponde 409 «non ha un'agenzia», compare
   il pulsante **«Aggiungi l'agenzia»** (spento senza `dati.modifica`, motivo nel `title`); apre `FormAgenzia`
   con cliente, fornitore e codice bloccati (`bloccati: ['cliente','fornitore','codice']`) e «Valido dal» =
   data dell'ordine. Alla chiusura la modale *Apri la pratica* ricontrolla e si può aprire senza uscire.
5. **`FormAgenzia`**: nuova prop `bloccati`; il codice bloccato (disabilitato, non è nel form) si riprende
   dal valore iniziale. **`FormModal`**: nuova prop facoltativa `erroreExtra` (contenuto accanto all'errore).

## Comando esatto su `decobrands_db` (lo lancia Claude Code dopo il controllo)

```bash
npm run import:vecchio-crm -- --db decobrands_db --aggiungi --correggi-date
```

`--prova` facoltativo (fa tutto e poi rollback). Un secondo giro con `--correggi-date` non tocca nulla (0 righe).

## Prove (su `decobrands_test_agenzia`, poi cancellato)

Preparazione: migrazioni; import `--aggiungi` su database vuoto; poi 3 agenzie riportate a `2026-11-08` a
mano per provare `--correggi-date`.

| Giros | soggetti | clienti | fornitori | subagenti | interscambio | date corrette |
|---|---|---|---|---|---|---|
| `--aggiungi` | 1884 nuovi | 1858 nuovi | 20 nuovi | 23 nuovi | 1587 nuovi | — |
| `--aggiungi --correggi-date --prova` | 0 | 0 | 0 | 0 | 0 | **3** (rollback) |
| `--aggiungi --correggi-date` | 0 | 0 | 0 | 0 | 0 | **3** |
| `--aggiungi --correggi-date` (2ª) | 0 | 0 | 0 | 0 | 0 | **0** |

Verifiche puntuali: dopo l'import tutte le 1587 agenzie hanno `valido_dal = 2000-01-01`; dopo `--correggi-date`
le 3 riportate a mano tornano a `2000-01-01`; `--correggi-date` senza `--aggiungi` è rifiutato; l'evento nel
registro porta `date_corrette`.

- `npx tsc --noEmit`: pulito nel backend e nel frontend.
- jest (su `decobrands_test_agenzia`): `clienti.spec.ts` 37/37, `documenti.spec.ts` 63/63,
  `documenti-pratica.spec.ts` + `proposta.spec.ts` 82/82. Aggiunta una prova per `agenzia-nuova`.
- Prove nel browser **non lanciate** (regola onda): aggiornato `strumenti/prove/app_documenti.py` con il
  controllo nuovo («Aggiungi l'agenzia» → campi bloccati → Crea fa sparire l'avviso → apre la pratica),
  `python -m py_compile` pulito. Le lancia Claude Code (`giro.sh decobrands_test_e2e app_documenti app_clienti`).

## Review

Skill caricate davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Rilievi
veri: nessuno. La nuova rotta è in sola lettura (`dati.consulta`) e restituisce solo i nomi; `correggiDate`
usa query parametriche/Prisma (l'unica `$queryRaw` è quella già esistente di `ultimaChiusura`, parametrizzata);
nessun input utente nei nuovi punti. Scelta "lazy" segnalata: la proposta sconto/subagente riusa il D-112
già presente invece di una rotta nuova.

## Da documentare

- **§19 — D-158** (da proporre): le agenzie del vecchio CRM valgono **da sempre** (`valido_dal = 2000-01-01`,
  il vecchio CRM non ha la data d'inizio dell'agenzia). L'import le crea così; `--correggi-date` riporta a
  `2000-01-01` quelle già importate con la data dell'estratto, solo se non toccate né usate in un periodo
  chiuso. In *Apri la pratica* il pulsante **«Aggiungi l'agenzia»** apre `FormAgenzia` con cliente, fornitore
  e codice bloccati e «Valido dal» = data dell'ordine, così si configura senza uscire dal documento.
- **§7.9 (Documenti)** — nuova rotta `GET clienti/:id/agenzia-nuova`, pulsante «Aggiungi l'agenzia» nel
  flusso *Apri la pratica*, prop `bloccati` di `FormAgenzia`, prop `erroreExtra` di `FormModal`.
- **§5 (agenzie)** — `valido_dal = 2000-01-01` per le agenzie importate dal vecchio CRM.

## File fuori dall'elenco ammesso

- `app/frontend/componenti/FormModal.tsx`: aggiunta la prop **facoltativa** `erroreExtra` (contenuto accanto
  all'errore). Serviva per rendere il pulsante «Aggiungi l'agenzia» dentro la finestra d'errore, con il
  pulsante spento per chi non ha `dati.modifica` (cosa che `azioniExtra`, già esistente, non permette: non
  supporta `disabled`). È retrocompatibile: nessuna delle finestre esistenti la usa.

## Aperto

- Il giro del browser (`app_documenti`) con il controllo nuovo non è stato eseguito qui: lo lancia Claude
  Code a fine onda. La prova nuova usa route simulate (`abbina` 409 → `agenzia-nuova` → `agenzie` POST).
- La data «mai dopo l'ordine» non è un controllo server dedicato: se l'operatore la sposta oltre la data
  dell'ordine, l'apertura della pratica fallisce di nuovo (l'agenzia non copre l'ordine). Non blocca il flusso.
