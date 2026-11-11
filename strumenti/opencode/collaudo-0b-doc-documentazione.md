# Collaudo · Onda 0 bis · Pacchetto 0b-doc — Documentazione dell'onda

Data: 11/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 · Rilievi: parti di guida di R2-09 e R2-12, D-133…D-138 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 0 bis (0b-01 … 0b-06) hanno finito (e prima del controllo di fine onda).
Raccoglie in un solo passaggio la documentazione di tutti, così spec, guida e piano non si pestano.

## Contesto e regole

- Leggi `CLAUDE.md` (radice) per intero: §4 regole 2 e 3 (il perché accompagna sempre il cosa; ogni modifica si
  documenta: spec, §16.4, §19, guida, LEGGIMI, piano, poi `python3 strumenti/genera-pagine-doc.py`).
- Italiano semplice e conciso; niente parole inglesi inutili.
- Registro §19: una riga per decisione nuova o cambiata, **6 colonne** (D-nn, data, decisione, perché, chi, dove).
  Numeri di questa onda: **D-133…D-138** (sotto). D-139 la scrive 0-doc; D-114…D-132 li scrivono i pacchetti
  documentazione delle onde 1–8: non usarli. Attenzione: D-109 e D-110 non esistono nel §19 e D-106 c'è due volte
  (lo segnala il piano): non toccarli. Chi: «Ugo (collaudo 11/11/2026, R0 domanda n)».
- Versione della spec in testa: alzala di uno (es. 8.75 → 8.76) con il riassunto delle modifiche dell'onda.
- Funzioni incerte segnalate come tali (D-06).
- Non toccare codice (`app/backend/src`, `app/frontend/{app,componenti,lib}` salvo `lib/guida.ts`), né prove, né `CLAUDE.md`
  (solo Ugo). **Integra (192.168.239.49) non si contatta.**

## Da raccogliere: sezioni *Da documentare* dei resoconti dell'onda

- `strumenti/opencode/resoconto-collaudo-0b-01.md` (Import da Integra dal documento)
- `strumenti/opencode/resoconto-collaudo-0b-02.md` (Documenti: righe salve, storico, scaglioni, agenzia alla data dell'ordine)
- `strumenti/opencode/resoconto-collaudo-0b-03.md` (Storico del vecchio CRM e agenzia dal documento)
- `strumenti/opencode/resoconto-collaudo-0b-04.md` (Soggetti: P.IVA, codice di Integra, scheda)
- `strumenti/opencode/resoconto-collaudo-0b-05.md` (Cerca in Integra e Clienti)
- `strumenti/opencode/resoconto-collaudo-0b-06.md` (Lista Documenti)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro)

Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna
aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede
l'utente, il testo in `guida.ts`.

| D-133 | 11/11/2026 | **Correggere un documento non tocca le righe che non arrivano; l'import da Integra lanciato dal documento collega il fornitore sul server, nella stessa transazione.** In `correggi` le righe si riscrivono solo se il corpo le porta; `POST integra/importa` con `documento_id` importa e collega (`fornitore_id`, `fornitore_versione_id`, registro) in una sola transazione; il browser non manda più il secondo PUT. | *Importa da Integra* dal documento cancellava tutte le righe lette (valori, affidabilità, posizioni), e import e collegamento erano due transazioni: con un 403 sul secondo il fornitore restava importato e il documento scollegato (collaudo R2-01, V12, V13). | Ugo (collaudo 11/11/2026, R0 domanda 1) | §6, §4.7; `documenti.ts`, `anagrafica-integra.ts`, `VistaDocumento.tsx` |
| D-134 | 11/11/2026 | **Il subagente proposto per l'agenzia lo decide il server.** Dallo storico arriva `subagente_id` (dal codice o dal nome, solo se il subagente è uno solo); se non si trova il campo Subagente resta vuoto e va scelto: mai l'abbinamento dei nomi nel browser, mai il primo dell'elenco. | Con omonimi o nomi assenti il browser proponeva il subagente sbagliato e due Invio creavano un'agenzia che paga la persona sbagliata (collaudo R2-05, V12). | Ugo (collaudo 11/11/2026, R0 domanda 2) | §4.7; `storico.ts`, `FormAgenzia.tsx` |
| D-135 | 11/11/2026 | **Dopo *Importa* in Cerca in Integra si apre la scheda del nuovo cliente o fornitore.** | È quello che la guida prometteva; chi importa vuole subito completare la scheda (scaglioni, agenzie) (collaudo R2-09). | Ugo (collaudo 11/11/2026, R0 domanda 3) | §7 Clienti e Fornitori; `CercaInIntegra.tsx` |
| D-136 | 11/11/2026 | **Cerca in Integra non entra nel prototipo**: è descritta in spec e guida dell'app, e una nota in `prototipo-alternativo/LEGGIMI.md` lo dice. | Il prototipo serve a mostrare l'idea, non deve funzionare in ogni dettaglio (Ugo, 30/10/2026); la ricerca sulle viste di Integra non ha senso senza ponte. Eccezione voluta a D-24 per questa sola funzione. | Ugo (collaudo 11/11/2026, R0 domanda 4) | §16.1; `prototipo-alternativo/LEGGIMI.md` |
| D-137 | 11/11/2026 | **Un documento che entra in una pratica già aperta ha bisogno solo dell'agenzia valida alla data dell'ordine** (D-35/D-60); l'agenzia alla data del documento si chiede solo quando il documento apre una pratica nuova. Precisa D-106 («L'agenzia mancante si configura dal documento»). | Una fattura datata dopo la chiusura dell'agenzia non entrava più nella sua pratica e la provvigione dell'ordine restava fuori; subagente e percentuali seguono l'ordine, non la fattura (collaudo R1, domanda 1). | Ugo (collaudo 11/11/2026, R0 domanda 5) | §6.1, §4.2.6; `documenti.ts` |
| D-138 | 12/11/2026 | **La verità è su Integra: ciò che arriva da Integra non si tocca nel CRM.** Soggetto con un ruolo da Integra: il master è tutto in sola lettura e mostra solo i dati di Integra (409, si correggono in Integra); per ora, da rivedere più avanti. Il codice di Integra nasce solo da *Importa*, mai scritto a mano. Soggetto solo del CRM: cambiare la P.IVA crea una nuova versione (D-46) di ogni ruolo nella stessa transazione. Precisa D-102: il CRM è il centro per ciò che nasce nel CRM. | Il master cambiava ma i ruoli restavano con la P.IVA vecchia; un codice scritto a mano poteva far copiare i dati di un'altra azienda (collaudo R1-08, R1 domanda 2; V12, V13). | Ugo (12/11/2026) | §4.7, §7.4; `soggetti.ts` |

## Guida in linea (`app/frontend/lib/guida.ts`)

- **R2-09** (parte guida): Clienti e Fornitori, finestra *Cerca in Integra*: *Importa* chiude la finestra e apre la scheda
  del nuovo (D-135, vero dopo 0b-05). Documento: pulsanti «Importa da Integra» (fornitore e cliente), «Importa dal vecchio
  CRM» (spento), caso «Non rappresentato» e i segni della lista Documenti («Fornitore in Integra», «Cliente in Integra»,
  «Non rappresentato», «Manca l'agenzia»); «Configura l'agenzia» richiede il livello operatore in Dati (R2-07).
  Fornitori: pulsante «Configura gli scaglioni».
- **R2-12** (parte guida): il segno «Cliente in Integra» della lista Documenti.
- Agenzia dal documento: il subagente proposto viene dal server; se il vecchio CRM non lo riconosce il campo resta
  vuoto (D-134).
- Usa i testi pronti dei resoconti 0b-05 e 0b-06; se mancano, scrivi tu le frasi, brevi, con lo stile delle voci vicine.

## Prototipo e piano

- `prototipo-alternativo/LEGGIMI.md`: una nota breve «Cerca in Integra (Clienti, Fornitori, Documento) è solo nell'app:
  il prototipo non la mostra (D-136)».
- `piano-lavoro-crm.md`: nessuna attività nuova (le correzioni del collaudo non hanno ore proprie), salvo che un resoconto
  chieda ore: in quel caso attività con ore **da approvare**.
- `PRD-crm-provvigioni.md`: solo se un resoconto lo chiede.

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-0b-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`);
  D-133…D-138 compaiono una volta sola.
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; righe D-133…D-138 scritte (o motivate); pagine rigenerate; resoconto
in `strumenti/opencode/resoconto-collaudo-0b-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e le righe sopra dicono.
- Non cambiare il senso delle decisioni del §19 esistenti; non rinumerare D-106, D-109, D-110.
- Niente commit, niente push.
