# Resoconto — Link diretti e finestra dell'agenzia (15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/link-diretti.md` · Gravità P2.
Parte dopo `provvigione-non-somma` (D-166: `pct_agente` = totale dal fornitore, `pct_subagente` ≤ `pct_agente`).

## Cosa chiede Ugo

1. Allineare la finestra dell'agenzia (etichette su una riga, campi della stessa riga alla stessa altezza).
2. L'aiuto dello sconto mostrava gli scaglioni di TUTTI i fornitori (errato): deve mostrare quelli del
   fornitore scelto e aggiornarsi al cambio, e diventare un link alle percentuali.
3. Campi data con selettore e gg/mm/aaaa.
4. Link diretti ovunque un'entità ne cita un'altra, con la catena navigabile senza vicoli ciechi.

## Cosa ho fatto

**FormAgenzia (punti 1-4)**
- L'aiuto dello sconto ora mostra gli scaglioni del **fornitore scelto** (prima elencava tutti), si
  aggiorna con `onCambia`, ed è un link alle percentuali (`/fornitori/<id>?scheda=percentuali`,
  `target="_blank" rel="noopener"`, il testo è «Scaglioni in vigore: 0 · 1 · 5 · 10 · 100 %»).
- `valido_dal` e `valido_al` passano da `tipo:'testo'` a `tipo:'data'` (selettore nativo, gg/mm/aaaa).
- Etichetta «Al subagente per questo cliente %» su una riga (il «vuoto = scaglione» è nell'aiuto sotto).
- Il pallino verde di Fornitore e Subagente è un link alla loro scheda (prop `link` di `CampoRicerca`).
- La griglia torna uniforme: prima la riga dello sconto era alta 228 px (aiuto su 2 righe), ora tutte le
  righe sono 60–83 px con etichette su una riga e input della stessa riga alla stessa altezza.

**Componente `Campo`**: `aiuto` accetta `ReactNode`; nuova prop `link` inoltrata a `CampoRicerca`.

**Pagina Fornitori / Clienti**: capiscono `?scheda=percentuali` / `?scheda=agenzie` per aprire la scheda
giusta (senza memoria, così il link vince su una scheda ricordata).

## Fatti (dove → verso cosa)

| Dove | Verso cosa |
|---|---|
| FormAgenzia, aiuto dello sconto | link alle percentuali del fornitore (nuova scheda) |
| FormAgenzia, pallino verde Fornitore / Subagente | `/fornitori/<id>` / `/subagenti/<id>` |
| Modale «Apri la pratica», pallino Fornitore / Cliente | `/fornitori/<id>` / `/clienti/<id>` (prop `link`) |
| VistaPratica, testata | cliente → `/clienti/<id>`, fornitore → `/fornitori/<id>`, subagente → `/subagenti/<id>` |
| VistaPratica, riepilogo provvigione | «percentuali del fornitore» → `/fornitori/<id>?scheda=percentuali` |
| VistaBollettino, riga | cliente → `/clienti/<cliente_id>` (prima andava alla pratica) |
| VistaBollettino, sottotitolo | fornitore → `/fornitori/<id>` |
| VistaDocumento, testata | fornitore riconosciuto → `/fornitori/<id>`; cliente abbinato → `/clienti/<id>` |
| VistaScartati, riga | fornitore → `/fornitori/<id>` (quando riconosciuto) |
| VistaSubagenti, eccezione | fornitore → `/fornitori/<id>` |
| VistaClienti, scheda Agenzie | fornitore della riga → `/fornitori/<id>` |

## Proposti, non fatti (da far decidere a Ugo)

| Caso | Motivo |
|---|---|
| Analisi, tabella «Documenti»: cliente/fornitore/subagente come link | il payload `Riga` non porta gli id (solo i nomi): serve esporli dal server |
| Liquidazioni, riga documento: cliente e fornitore come link | `Documento` ha `pratica_id` e `subagente_id`, non `cliente_id`/`fornitore_id` |
| Agenzia usata da una pratica → scheda Agenzie con l'agenzia selezionata | la pratica non espone l'id dell'agenzia (è implicita da cliente × fornitore); il link del cliente apre la scheda Agenzie ma non evidenzia la riga |
| Documento/PDF citato nel bollettino → il documento | la riga ha `documento_id`, ma il numero porta già alla pratica che mostra il documento; aprire direttamente il documento cambierebbe il flusso |

## Catene coperte

- **documento → pratica → cliente → agenzia (fornitore link) → fornitore → percentuali** e ritorno con
  Indietro (prova nuova in `app_pratica.py`).
- pratica → fornitore → percentuali; bollettino → pratica, bollettino → cliente, bollettino → fornitore.

Interrotte: solo i «proposti» sopra (mancano id nel payload di Analisi/Liquidazioni).

## Campi data cambiati

- FormAgenzia: `valido_dal`, `valido_al` → `tipo:'data'`.
- VistaClienti / VistaFornitori, colonna «Periodo»: date mostrate con `data()` (gg/mm/aaaa, prima `aaaa-mm-gg`).
- VistaDocumento, nota «agenzia da confermare»: «dal 01/01/2000» (prima «dal 2000-01-01»).

## Prove

- `npx tsc --noEmit` frontend: pulito.
- `python -m py_compile` su app_clienti/app_pratica/app_documenti/app_fornitori/app_bollettino: OK.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` + `giro.sh decobrands_test_e2e app_clienti
  app_pratica app_documenti app_fornitori app_bollettino`: **0 KO** (49 + 93 + 148 + 41 + 45 = 376 controlli).
- Prove nuove: link agli scaglioni dalla finestra agenzia (href, `target=_blank`, `rel=noopener`), pallino
  verde fornitore/subagente come link, campi data, testata pratica con link cliente/fornitore, link
  percentuali nel riepilogo, catena pratica→fornitore→percentuali e pratica→cliente→agenzie con Indietro,
  bollettino con link fornitore/cliente.
- Correzioni a prove esistenti rotte da pacchetti precedenti (non mie): `app_fornitori.py` «Illegal return
  statement» (evaluate senza arrow), `app_clienti.py` `pct_subagente=33` rifiutato da D-166 (ora 12 ≤ 13) e
  «Periodo» ora formattato (30/06/2031).
- Schermate della finestra a 1440 e 768 px, prima e dopo: `strumenti/collaudo/e2e/uscita/agenzia-*-PRIMA.png`
  e `agenzia-*.png` (generata con `strumenti/prove/schermate_link_diretti.py`).

## Controlli (skill caricate davvero)

- `ponytail-review`: nessun componente nuovo, si riusano `Link`/`CampoRicerca`/`data()`; le due letture di
  `?scheda` (Fornitori/Clienti) sono 2 righe ciascuna, non merita un helper. `net: 0 linee da tagliare`.
- `accessibility`: i link nuovi sono `<a>`/`<Link>` nativi con testo descrittivo; i link in nuova scheda hanno
  `rel="noopener"`; i pallini link hanno già `aria-label`. Niente fuochi rimossi.
- `caveman`: risposte concise.

## Aperti / note

- Le etichette «Dal fornitore / di cui al subagente» (D-166) restano come dal pacchetto precedente.
- Il link alle percentuali apre la scheda (versione in vigore in evidenza), non una versione specifica.
- `app_documenti.py` è risultato instabile in un giro (`.abbina-altra input` in timeout, poi 148 OK): non è
  legato a questo pacchetto, nel giro finale è a 0 KO.

## Da documentare (spec)

- §7.3 (pratica): la testata ha link a cliente, fornitore, subagente; nel riepilogo «percentuali del fornitore».
- §7.7 (bollettino): fornitore nel sottotitolo e cliente della riga sono link.
- §7.9 (documento): fornitore della testata e cliente abbinato sono link; «Apri la pratica» ha i pallini link.
- §7.16 (scartati) e §5.2 (eccezioni): fornitore link.
- §16.4 (componenti): `Campo.aiuto` accetta `ReactNode`; `Campo`/`CampoRicerca` hanno la prop `link`;
  Fornitori e Clienti capiscono `?scheda=`.
- §19 — decisioni nuove **da proporre**:
  - D-nn: i dati interconnessi sono navigabili in sequenza (catena documento → pratica → cliente → agenzia →
    fornitore → percentuali); ogni pagina di dettaglio ha link verso le entità che mostra.
  - D-nn: l'aiuto dello sconto della finestra agenzia mostra gli scaglioni del fornitore scelto (non di tutti)
    ed è un link alle percentuali, in una nuova scheda.
  - D-nn: i campi data usano il selettore nativo (`type="date"`) e le date mostrate sono in gg/mm/aaaa.
