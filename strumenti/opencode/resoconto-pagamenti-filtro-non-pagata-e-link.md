# Resoconto `pagamenti-filtro-non-pagata-e-link`

Data: 18/11/2026. Pacchetto eseguito alla lettera; nessun commit, nessuna migrazione.

## File toccati (7 ammessi, nessun altro)

| File | Modifica |
|---|---|
| `app/backend/src/pratiche.ts` | `CercaPratiche`: via `senza_pagamento`, lista chiusa dello stato a `['attesa','confermata','fatturata','non_pagata']`. `cerca`: `stato === 'non_pagata'` → `t.stato = 'fatturato' AND NOT EXISTS (… d.tipo = 'pagamento')`; altri valori come prima (`STATO_DB`) |
| `app/backend/src/proposta.ts` | `clientePratica` (cliente certo: codice, scelta a mano, vocabolario) e `clienteTestate` = `clientePratica` più il riconosciuto per P.IVA/nome **solo per il pagamento**; `testate` filtra su `clienteTestate`; filtro finale `.filter((c) => clienteTestate != null \|\| c.punteggio > 0)`; l'esito usa `clientePratica` (correzioni 1 e 2, vedi sotto) |
| `app/backend/test/pratiche.spec.ts` | il caso `senza_pagamento=1` diventa `stato=non_pagata` (stesse attese, su pratiche davvero fatturate); il caso «fuori lista chiusa» diventa «`senza_pagamento` non esiste più: 400» |
| `app/backend/test/proposta.spec.ts` | il caso pagamento esistente diventa «con il cliente certo»; nuovo caso: pagamento senza cliente certo e senza articoli in comune → `candidati: []`, esito `nessuno`; correzione 2: caso di regressione «fattura con cliente riconosciuto per ragione sociale propone anche la pratica di un altro cliente con articoli in comune» |
| `app/frontend/componenti/Flussi.tsx` | `Scelte`: `titolo` ora `ReactNode`, nuova prop di voce `apri?: { href; etichetta }` resa come `<a className="btn-riga" target="_blank" rel="noopener">` accanto al titolo; `key` della voce = indice (il titolo può essere un nodo) |
| `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` | `STATO_DAL_TIPO.pagamento = 'non_pagata'`; `STATI_ABBUNA` + voce «Non pagata» dopo «Fatturata»; via `senza_pagamento` da `PRATICA.voci` e via `tipo:` dal `contesto` del campo di ricerca (non serviva altro); `apri` sulla voce di ogni pratica suggerita (`/pratiche/<id>?vista=sola`) |
| `app/frontend/app/(app)/componenti/page.tsx` | firma di `Scelte` nel catalogo: `titolo: nodo, apri: { href, etichetta }` |

## Esiti

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- `npm test -- pratiche.spec.ts proposta.spec.ts --forceExit`: **2 suite, 107 prove, 0 KO**.
- Dopo le correzioni 1 e 2, `npx tsc --noEmit` in `app/backend`: 0 errori;
  `npm test -- proposta.spec.ts --forceExit`: **83 prove, 0 KO**.

## Correzioni successive

**Correzione 1 (18/11/2026).** `clientePratica` era stato allargato al cliente riconosciuto per
P.IVA/nome e rinominato `clienteDoc`, così anche una fattura o una nota di credito restringevano le
candidate a quel cliente: era un cambio di comportamento non richiesto (per un pagamento, che quasi
mai porta il codice cliente, il riconosciuto per nome serve; per gli altri tipi vale D-60, il confronto
per articoli). Resoconto iniziale non aggiornato: questa è la parte che mancava.

**Correzione 2 (18/11/2026).** Riportato `proposta.ts` alla forma chiesta: `clientePratica` = codice
del fornitore, scelta a mano o vocabolario; `clienteTestate` = `clientePratica`, oppure il riconosciuto
per P.IVA/nome **solo se `l.tipo === 'pagamento'`**. La query `testate` usa `clienteTestate`, il filtro
finale è `clienteTestate != null || punteggio > 0`, l'esito torna a guardare `clientePratica` (un
pagamento con cliente riconosciuto per nome non diventa «certo» da solo). `pool` del pagamento e
`non_pagata` invariati. In `proposta.spec.ts` aggiunto il caso di regressione: una fattura con cliente
riconosciuto per ragione sociale propone ancora la pratica di un altro cliente con articoli in comune.

Nessun altro file toccato, nessun commit, `.env` e database non toccati.

## Test esistenti adeguati (e perché)

1. `pratiche.spec.ts` — «senza_pagamento=1: esclude le pratiche che hanno già un pagamento»: riscritto come
   `stato=non_pagata` sullo stesso seed. Cambio necessario anche nella sostanza: ora il filtro impone
   `stato = 'fatturato'`, quindi il test parte dall'elenco `stato=fatturata` (prima usava `tutte[0]`, che
   può essere una pratica non fatturata) e verifica in più che «Fatturata» la comprenda ancora.
2. `pratiche.spec.ts` — «senza_pagamento fuori lista chiusa: 400»: il campo non esiste più e con
   `forbidNonWhitelisted` il parametro sconosciuto dà 400; il caso ora documenta proprio questo.
3. `proposta.spec.ts` — «pagamento: si propongono solo le fatturate senza un pagamento»: non ha cambiato
   attese, solo titolo («con il cliente certo»: il codice cliente `K-100` rende certo il cliente, quindi la
   regola nuova non tocca le candidate). Nessun altro test è stato toccato: le altre prove usano un cliente
   certo (codice cliente) oppure articoli in comune.

## Dubbi / da sapere

- **Icona del link «apri»**: il pacchetto indicava `<Icona nome="occhio" />`, ma l'azione identica nel campo
  di ricerca (`CampoRicerca`, riga 351, «stessa forma») usa `apri-scheda`, che è anche il nome coerente con
  «apri in una nuova scheda». Ho usato **`apri-scheda`**; `occhio` non è usata da nessun'altra parte del
  frontend. Se Ugo preferisce l'occhio è una parola da cambiare.
- **`punteggio > 0` include la penalità −0,5 delle pratiche già fatturate**: per una pratica **non**
  fatturata `punteggio` è esattamente la quota di articoli in comune, quindi la regola è «almeno un articolo
  in comune»; per una pratica già fatturata servono articoli in comune per più della metà (quota > 0,5) per
  restare fra le candidate. Sui pagamenti (che non hanno articoli) valgono solo il cliente certo o, dopo le
  correzioni 1–2, il cliente riconosciuto per P.IVA/nome: senz'altro non si propone nulla. Se si volesse la regola pura «almeno un articolo in comune» anche per
  le già fatturate, servirebbe esporre la quota in `Candidato` (cambia un contratto: non fatto).
- Il filtro «Non pagata» è un valore in più dei segmenti della ricerca: nessun CSS nuovo (segmenti e
  `btn-riga` esistevano). Nessuna rotta nuova, nessuna colonna, nessuna migrazione.
- Non ho lanciato Playwright (come da pacchetto): la prova visiva (link nella scheda, segmento «Non pagata»,
  pagamento che non elenca più tutte le fatturate) la fa l'orchestratore.

## Da documentare (fuori dai file ammessi, non toccati)

- §19: una riga D-nn «Ugo 18/11/2026 — un pagamento senza cliente certo **né riconosciuto per P.IVA/nome**
  non propone tutte le fatturate (il riconosciuto per nome vale solo per il pagamento: fatture e note di
  credito restano al confronto per articoli, D-60); il filtro nascosto `senza_pagamento` diventa il visibile
  «Non pagata» (`stato=non_pagata`)».
- §7.9/§8.1 (Documenti, ricerca della pratica): il filtro per stato della ricerca ha il valore «Non pagata»
  = fatturata senza documento di pagamento, ed è il predefinito quando il documento è un pagamento; il
  parametro nascosto `senza_pagamento` non esiste più.
- §16.4 (catalogo componenti): `Scelte` — `titolo` è un nodo e la voce può portare `apri { href, etichetta }`.
- Guida (`guida.js`, voce Documenti): «Non pagata» e «apri la pratica in una nuova scheda» accanto al titolo.
