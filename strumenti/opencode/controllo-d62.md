# Controllo D-62 — la nota dell'incasso in una colonna sua

Data: 04/11/2026. Cambio: `nota_incasso` su `ordini_fornitore_documenti`, scritta da
`PUT /api/documenti/:id/incasso` e restituita dallo stato d'incasso. La nota del documento (`note`)
non si tocca più.

## Cosa fa la modifica

La segnalazione del fornitore (*Segna come non pagata*, con la sua nota) prima finiva in `note`,
la stessa colonna della nota del documento che si modifica dalla pratica: una segnalazione con nota
cancellava la nota del documento. Ora la segnalazione ha la sua colonna e il motore la restituisce
nello stato d'incasso (`nota`), che arriva al dettaglio pratica e alle voci dei solleciti.

## Esito dei controlli (skill caricate davvero)

| Controllo | Esito |
|---|---|
| `postgresql-code-review` | nessun rilievo |
| `owasp-security` | nessun rilievo |
| `ponytail-review` (correttezza + complessità) | un rilievo di copertura, nessun difetto |

### PostgreSQL

- `ADD COLUMN ... TEXT` **nulla e senza default**: in PostgreSQL 11+ è solo metadati, nessuna
  riscrittura della tabella; il lock è un `ACCESS EXCLUSIVE` breve, la tabella è piccola.
- **Nessun indice**: la colonna non si filtra né si ordina, non serve.
- **TEXT** come la `note` che affianca; il limite di 2000 caratteri resta nel DTO, dove sta già.
- **Nessun CHECK**: non c'è un invariante da imporre (una nota senza `fonte_incasso = 'manuale'`
  è innocua e non serve vietarla).
- Migrazione solo aggiunta, nessun backfill: l'endpoint non aveva ancora una pagina, e una vecchia
  nota d'incasso in `note` non si distingue da una nota del documento. Scritto nel commento della
  migrazione.

### Sicurezza

- La nota è testo libero dell'utente: validata (`@IsString()`, `@MaxLength(2000)`), ripulita
  (`trim`, vuota = nessuna nota), scritta con Prisma (parametrizzata, nessun SQL a stringhe).
- Stessa rotta e stesso permesso di prima (`provvigioni.modifica`), nessuna superficie nuova.
- In interfaccia la nota sarà resa da React (escape); se un giorno finisce in un CSV vale la nota
  già scritta in F4-A5 sull'iniezione delle formule.
- La storia resta nel registro (`stato.change_state` con `nota` nel dettaglio): cambiare la nota
  non perde niente.

### Correttezza e complessità

- La nota si **sostituisce** a ogni segno (anche con nessuna nota), come il prototipo; non si
  cancella la nota del documento. La vecchia versione la teneva: era un comportamento scelto a
  caso, non documentato.
- `nota` entra nel tipo di `statoIncasso` come `string | null` e vale `null` per bollettini e
  maturato: nessun ramo nuovo.
- `motore.ts` cambia di una riga per ramo, niente astrazioni.

## Rilievi

**Da correggere: nessuno.**

1. *(should fix, copertura)* `nota` non è asserita in `GET /api/pagamenti/solleciti`: la prova
   controlla lo stato della pratica. Il campo è lo stesso oggetto restituito, quindi il rischio è
   basso; una riga di prova in più chiude il buco quando si fanno le pagine di F3-A3.
2. *(should fix, dati di prova)* Nei database di prova/sviluppo le note scritte prima di D-62
   restano in `note`. Non si spostano: non sono distinguibili. Si rigenera il seed.
3. *(nice to have)* `nota_incasso` accanto a `note`: due lingue nella stessa tabella. Rinomina
   `note` rimandata: la usano la pratica, i documenti e le finestre, e non vale il rischio.

## Prove

- `npx tsc --noEmit` pulito.
- `test/incassi.spec.ts` 7/7: la nota finisce in `nota_incasso`, `note` resta
  «nota del documento», il dettaglio pratica restituisce `nota`, un nuovo segno senza nota la
  sostituisce e il documento non cambia.
- Suite del backend una spec per processo: **310 prove, 0 KO** (due suite interrotte dal crash di
  Jest su Windows sono passate rilanciate da sole: bollettino 19, clienti 16).
- Migrazione applicata a `decobrands_db` e `decobrands_test` (`prisma migrate deploy`), client
  rigenerato.

## Verdetto

**Ship.** Resta aperto solo il rilievo 1 (copertura sui solleciti), da chiudere con le pagine di
F3-A3.

Non controllato: la resa della nota a schermo, perché la pagina che la mostra non esiste ancora
(F3-A3 pagine).
