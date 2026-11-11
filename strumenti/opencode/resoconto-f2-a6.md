# Resoconto F2-A6 — Proposta del documento con l'import da Integra (D-111, D-112)

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/proposta.ts` | Tipi `RigaIntegra`, `RigaStorico`, `Contesto`; esiti `manca_rappresentanza`/`fornitore_da_integra`/`cliente_da_integra`; `propostaDocumento(db, letto, contesto = {})` resta pura; helper `mancaRappresentanzaRighe` per la lista |
| `app/backend/src/documenti.ts` | `DocumentiController` inietta `IntegraService`; `contestoDocumento` e `esitiImportazione` (ricerca Integra per chiave distinta, non per riga); `dettaglioDocumento` arricchisce la proposta e porta `scaglioni_mancanti`; lista con i tre booleani |
| `app/frontend/app/(app)/documenti/VistaDocumenti.tsx` | Pillole *In Integra* e *Non rappresentato* accanto al livello |
| `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` | Card *Azione proposta* per i tre esiti, pulsante *Importa da Integra*, riquadro *Dal vecchio CRM*, nota *Mancano gli scaglioni* |
| `app/backend/test/proposta.spec.ts` | 7 prove nuove (esiti con contesto iniettato; contesto vuoto invariato) |
| `app/backend/test/documenti.spec.ts` | 4 prove nuove (lista tre campi, cliente_da_integra da storico, dettaglio con candidati, nessuna query per riga) |

## Forma del contesto e degli esiti

`propostaDocumento(db, letto, contesto)` riceve il contesto già preparato da `documenti.ts` (niente ponte né storico dentro: resta pura, prove veloci, nessuna query nascosta):

```ts
interface RigaIntegra { id_integra: number; ragione_sociale: string|null; piva: string|null }
interface RigaStorico { cliente_codice_fornitore: string|null; cliente_ragione_sociale: string|null;
  cliente_piva: string|null; subagente_nome: string|null; sconto: number; rappresentato: boolean }
interface Contesto { fornitore_su_integra?: RigaIntegra[]; cliente_su_integra?: RigaIntegra[]; storico?: RigaStorico[] }
```

Nuovi esiti (in ordine di priorità, mai una scelta a caso):
- `fornitore_da_integra`: `fornitore_id == null` e **una sola** riga in `fornitore_su_integra` → porta `{ id_integra, ragione_sociale, piva }`.
- `cliente_da_integra`: fornitore riconosciuto, cliente non riconosciuto, coppia nello storico **con** subagente (porta `id_integra: null` + subagente/sconto) oppure **una sola** riga in `cliente_su_integra` (porta `id_integra`, subagente/sconto null).
- `manca_rappresentanza`: cliente e fornitore riconosciuti, **nessuna** agenzia valida alla data, coppia nello storico **senza** subagente → porta anche `agenzia_mancante` (per il form *Configura l'agenzia*).

Gli esiti di oggi (`doppio`, `bollettino`, `nuova`, `certo`, `probabile`, `ambiguo`, `nessuno`, `manca_agenzia`) restano identici quando il contesto è vuoto.

## Come si comporta ogni caso a schermo

- **`fornitore_da_integra`** → scheda *Fornitore da importare*: «Il fornitore non è in anagrafica. In Integra c'è: *nome, P.IVA*» + pulsante **Importa da Integra** (spento senza `dati.importa`). Alla conferma fa `POST /api/integra/importa` e collega il documento al fornitore (`PUT /api/documenti/:id` con il solo `fornitore_id`); al ricalcolo compare **Mancano gli scaglioni** con il link alla scheda del fornitore (D-113, non blocca).
- **`cliente_da_integra`** → scheda *Cliente da importare*: «Il cliente *nome* non è in anagrafica» + riquadro «Dal vecchio CRM: subagente X, sconto Y%» (solo se lo storico ha subagente) + **Importa da Integra**; se il candidato è solo nel vecchio CRM (`id_integra == null`) il pulsante *Importa dal vecchio CRM* è spento con la nota che arriva con l'anagrafica (F1-A13). Dopo l'import la proposta riconosce il cliente e chiede l'agenzia.
- **`manca_rappresentanza`** → scheda *Configura l'agenzia*: «Questo fornitore non è rappresentato per questo cliente: senza agenzia il documento non entra in una pratica» + **Configura l'agenzia** (stesso `FormAgenzia` di `manca_agenzia`, cliente e fornitore fissi).
- **Lista** → pillola *In Integra* (`fornitore_da_integra`) e *Non rappresentato* (`manca_rappresentanza`); `manca_agenzia` resta solo quando non è `manca_rappresentanza`.

## Prove (numeri)

- `npx tsc --noEmit` backend e frontend: **0 errori**.
- `npx jest --runInBand test/proposta.spec.ts`: **50 passati, 0 KO** (43 + 7 nuovi).
- `npx jest --runInBand test/documenti.spec.ts`: **40 passati, 0 KO** (36 + 4 nuovi).
- `npx jest --runInBand test/lettura.spec.ts` (verifica di non aver rotto `valutaLettura`): **11 passati, 0 KO**.
- La prova "un fornitore sconosciuto non fa query per riga" spia `cerca`: con 10 documenti dallo stesso nome il chiamante fa **1** ricerca di Integra (per nome distinto), non 10.

## Schermate

Non eseguite. La prova browser nuova (`app_documenti.py` → *Importa da Integra* → scaglioni → agenzia) richiede il ponte di Integra configurato e i server 8001/8002: il percorso completo con dati veri è F2-A7, e senza ponte non si può esercitare l'import. I controlli di resa (1440/768 px) dei due file toccati non sono stati verificati visivamente.

## Dubbi / decisioni prese

1. **Più candidati = mai una scelta a caso, ma niente `ambiguo` dedicato**: con 0 o più righe di Integra l'esito resta quello di oggi (`nessuno`, «Fornitore non trovato» / «Cliente non riconosciuto»). Il "ambiguo con i motivi" citato dal brief per i candidati multipli è inteso come *nessuna scelta automatica*; un elenco di candidati da scegliere a mano è un possibile raffinamento successivo (non serve al giro di F2-A6).
2. **Storico per codice cliente**: `cercaLegame` (non modificato) cerca per `codice_cliente` e, solo con `clienteId`, per P.IVA/ragione. Nel documento il cliente non è ancora riconosciuto, quindi la coppia si trova per **codice**; il riconoscimento per sola P.IVA nello storico resta fuori (il codice è "la chiave che portano i documenti", §4.7.2).
3. **`scaglioni_mancanti`**: dopo l'import il fornitore nasce senza scaglioni; il collegamento al documento avviene con il `PUT /api/documenti/:id` esistente (solo `tipo` + `fornitore_id`). Se il tipo letto è null il collegamento si salta (solo import + ricarica).
4. **Candidato di Integra visibile a chi ha `provvigioni.consulta`**: il dettaglio/lista mostra nome e P.IVA del candidato Integra (dati che il documento già riporta); l'**azione** di import resta dietro `dati.importa` (server + pulsante spento). Non l'ho considerato un problema, ma se si vuole la ricerca Integra solo per chi ha `dati.importa` va passato il permesso dentro `contestoDocumento`/`esitiImportazione`.
5. **"Una ricerca per pagina"**: implementata come *una ricerca per chiave distinta* (nome fornitore, codice/P.IVA cliente), non per riga; di norma 0–1 per tipo per pagina.

## Righe da applicare (NON applicate qui)

- **spec §7.9** ("Riconoscimento e import"): aggiungere i testi precisi delle tre card e delle pillole *In Integra* / *Non rappresentato* come sopra.
- **spec §4.7.4**: confermare che *manca_rappresentanza* richiede cliente e fornitore riconosciuti (come da brief), non la sola coppia nello storico.
- **spec §19**: nessuna decisione nuova (D-111/D-112/D-113 già esistenti); eventualmente una riga per il punto 1 (candidati multipli senza scelta a caso, niente `ambiguo` dedicato).
- **piano §12**: F2-A6 completata; eventuali ore fuori preventivo da segnare *da approvare* (non stimate qui).
- **`avanzamento-app.md`**: spuntare F2-A6 con il riepilogo di cui sopra.
