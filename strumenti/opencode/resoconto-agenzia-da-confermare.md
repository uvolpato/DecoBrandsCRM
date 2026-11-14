# Resoconto — Agenzie del vecchio CRM «da confermare» nel flusso (P1, 14/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/agenzia-da-confermare.md`. Riletti prima
`agenzia-nel-flusso.md` e `resoconto-agenzia-nel-flusso.md` (modifiche non committate presenti nell'albero).

## Cosa è stato fatto

1. **Schema** (`schema.prisma` + migrazione `20261114090000_agenzie_da_confermare`): colonna
   `interscambio.da_confermare boolean NOT NULL DEFAULT false`. La migrazione marca `true` le agenzie del
   vecchio CRM non ancora usate, riconoscendole come fa `--correggi-date` (leggilo): `valido_dal` =
   `'2026-11-08'` (data dell'estratto) oppure `'2000-01-01'` (dopo la correzione), mai quelle create a mano
   né quelle usate in un periodo chiuso (niente righe successive per la stessa coppia, niente evento
   `registro` per quell'agenzia, nessun bollettino chiuso del fornitore, nessuna liquidazione).
2. **Import** (`import-vecchio-crm.ts`): l'import `--aggiungi` crea le agenzie con `da_confermare: true`.
3. **Server**:
   - `documenti.ts` `nuovaPratica`: un'agenzia `da_confermare` non apre da sola la pratica; risponde 409 con
     `code: 'agenzia_da_confermare'` e i dati dell'agenzia (id, subagente, fornitore, codice, sconto, valido
     dal/al). Il motore delle provvigioni **non** è stato toccato: la marcatura è solo sulle mai usate, quindi
     le pratiche e i calcoli già esistenti non cambiano.
   - `clienti.ts`: rotta `POST clienti/:id/agenzie/:aid/conferma` (permesso `dati.modifica`, come `FormAgenzia`;
     una transazione con `FOR UPDATE`; verifica che l'agenzia sia del cliente; registro). Modificare un'agenzia
     `da_confermare` con la rotta di `FormAgenzia` la conferma (`da_confermare = false`).
4. **Frontend**:
   - `ApriPratica` (`VistaDocumento.tsx`): al 409 `agenzia_da_confermare` un riquadro «Agenzia dal vecchio CRM,
     da confermare: codice … · sconto … % · subagente … · dal …» con **«Usa questa»** (conferma e riprova ad
     aprire) e **«Configura»** (apre `FormAgenzia` in modifica con cliente/fornitore/codice bloccati; al
     salvataggio conferma e riprova). Senza permesso i pulsanti sono spenti col motivo nel `title`.
   - `VistaClienti.tsx`, scheda Agenzie: segno «da confermare» (stato in attesa), azione **«Conferma»**, e un
     filtro a segmenti «Da confermare» che compare solo se c'è almeno una riga.
   - `FormAgenzia.tsx`: `da_confermare` nell'interfaccia `Agenzia`. `guida.ts`: testo del flusso.

## Come si riconoscono le agenzie da marcare (e quante su `decobrands_db`)

Riconoscimento = come `--correggi-date`: `valido_dal = '2026-11-08'` (data dell'estratto) oppure
`'2000-01-01'` (dopo che `--correggi-date` le ha portate a «da sempre»), escludendo chi ha righe
successive per la stessa coppia, chi è stato toccato dopo l'import e chi sta in un periodo chiuso.

> ⚠ **Ordine**: con il riconoscimento su entrambe le date non importa più se `--correggi-date` è già
> passato o no. (Prima della correzione: 2026-11-08; dopo: 2000-01-01.)

Query di sola lettura (da lanciare tu su `decobrands_db`):

```sql
SELECT count(*)
FROM interscambio i
WHERE i.valido_dal IN (DATE '2026-11-08', DATE '2000-01-01')
  AND NOT EXISTS (SELECT 1 FROM interscambio x WHERE x.cliente_id = i.cliente_id AND x.fornitore_id = i.fornitore_id AND x.id <> i.id)
  AND NOT EXISTS (SELECT 1 FROM registro r WHERE r.entita = 'interscambio' AND r.entita_id = i.id)
  AND NOT EXISTS (SELECT 1 FROM bollettini_testata b WHERE b.fornitore_id = i.fornitore_id AND b.chiuso_il IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM liquidazioni);
```

## Prove

Su `decobrands_test_confermare` (creato, migrazioni, poi da cancellare): `npx prisma migrate deploy` applica
anche la nuova migrazione; `npx prisma generate` pulito.

- `npx tsc --noEmit`: pulito nel backend e nel frontend.
- jest: `clienti.spec.ts` **40/40**, `documenti.spec.ts` **65/65**, `documenti-pratica.spec.ts` + `proposta.spec.ts`
  **82/82**. Aggiunte prove: conferma dell'agenzia (rotta + registro), modifica che conferma, conferma di un'altra
  agenzia (404), `nuovaPratica` che risponde 409 `agenzia_da_confermare` e dopo la conferma apre la pratica.
- Prove nel browser **non lanciate** (regola onda): `python -m py_compile` pulito su `app_documenti.py`,
  `app_pratica.py`, `app_clienti.py`. Le lancia Claude Code (`giro.sh decobrands_test_e2e app_documenti app_clienti app_pratica`).

## Prove nel browser rotte dal pacchetto precedente

- `app_documenti.py`: corretto il `NameError: name 'scheda_errore' is not defined`. Il blocco D-158 usava
  `scheda_errore` (definita più avanti) e `risposta` (definita più avanti): l'ho **spostato in fondo**, prima di
  `b.close()`. Aggiunto anche un blocco D-159 («Usa questa») con l'utente `-oper`, per non superare i 10 accessi
  di `-ammi` (D-41).
- `app_pratica.py` riga ~189: **non è rotta**. La nota di credito oltre il residuo passa da `registra` →
  `importoValido` («supera la fattura», 400), un percorso che né D-158 né D-159 toccano (`documenti.ts` cambiava
  solo il messaggio di `nuovaPratica`, e la finestra della nota di credito non usa `erroreExtra`). Nessuna
  correzione; da ricontrollare nel giro.

## Review

Skill caricate davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Rilievi veri:
nessuno. `conferma` ha il permesso giusto (`dati.modifica`) e verifica che l'agenzia sia del cliente (niente
IDOR); `nuovaPratica` usa Prisma/query parametriche; la migrazione è un `ADD COLUMN` + `UPDATE` con `NOT EXISTS`
(anti-join corretto), idempotente per Prisma. Scelta "lazy": il 409 di `agenzia_da_confermare` porta l'agenzia
completa (non solo i quattro campi del riquadro), così «Configura» apre `FormAgenzia` senza una rotta GET in più.

## Da documentare

- **§19 — D-159** (da proporre): le 1587 agenzie importate dal vecchio CRM restano nel database ma sono «dal
  vecchio CRM, da confermare». Quando servono a un documento l'operatore sceglie: «Usa questa» (così come sono)
  o «Configura»; alla prima conferma diventano agenzie normali. L'import le crea già `da_confermare`; la
  migrazione marca quelle già importate (riconoscimento sulle date, vedi sopra).
- **§7.9 (Documenti)** — `Apri la pratica` risponde 409 `agenzia_da_confermare` col riquadro «Usa questa /
  Configura»; rotta `POST clienti/:id/agenzie/:aid/conferma`.
- **§5 (agenzie)** — `interscambio.da_confermare`, segno «da confermare» e azione «Conferma» nella scheda
  Agenzie dei Clienti.

## Aperto

- Il giro del browser non è stato eseguito qui (regola onda): lo lancia Claude Code. Il blocco D-159 della
  prova usa rotte simulate (abbina 409 → conferma → abbina 200) e l'utente `-oper`.
