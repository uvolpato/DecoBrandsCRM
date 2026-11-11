# Collaudo · Onda 3 · Pacchetto 3-doc — Documentazione dell'onda

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità: P3 (P2 se c'è A9-03) · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** che tutti i pacchetti di codice dell'onda 3 hanno finito (e prima del controllo di fine onda).
Raccoglie in un solo passaggio la documentazione di tutti, così spec, guida e piano non si pestano.

## Contesto e regole

- Leggi `CLAUDE.md` (radice) per intero: §4 regole 2 e 3 (il perché accompagna sempre il cosa; ogni modifica si
  documenta: spec, §16.4, §19, guida, LEGGIMI, piano, poi `python3 strumenti/genera-pagine-doc.py`).
- Italiano semplice e conciso; niente parole inglesi inutili.
- Registro §19: una riga per decisione nuova o cambiata, **6 colonne** (D-nn, data, decisione, perché, chi, dove),
  numeri D-114…D-132 già assegnati nel piano (sotto); altre D-nn nuove solo di seguito all'ultima presente. Chi: «Ugo (collaudo
  08/11/2026)» per le regole confermate da Ugo, altrimenti «collaudo A-n» con l'ID del rilievo.
- Versione della spec in testa: alzala di uno (es. 8.61 → 8.62) con il riassunto delle modifiche dell'onda.
- Funzioni incerte segnalate come tali (D-06).
- Non toccare codice (`app/backend/src`, `app/frontend/{app,componenti,lib}` salvo `lib/guida.ts`), né prove, né `CLAUDE.md`
  (solo Ugo).

## Da raccogliere: sezioni *Da documentare* dei resoconti dell'onda

- `strumenti/opencode/resoconto-collaudo-3-01.md` (Arrivo dello stesso file, scartati che tornano solo a mano, annullo di un documento letto)
- `strumenti/opencode/resoconto-collaudo-3-02.md` (Finestre: Esc e velo non perdono le correzioni, fuoco e trappola, nomi dei campi letti)
- `strumenti/opencode/resoconto-collaudo-3-03.md` (Sagome D-59 senza lampo di «Nessun elemento» — parte 1: componenti, catalogo, Pratiche, Documenti, Registro)
- `strumenti/opencode/resoconto-collaudo-3-04.md` (Data di oggi a Roma in tutti i campi «Valido dal»; anno doppio nei Bollettini)
- `strumenti/opencode/resoconto-collaudo-3-05.md` (I due stile.css uguali; evidenziazione con «riduci movimento»)
- `strumenti/opencode/resoconto-collaudo-3-06.md` (Meno caricamenti completi: conteggi della barra in SQL, Oggi raggruppato, report nella stessa richiesta)
- `strumenti/opencode/resoconto-collaudo-3-07.md` (Nota di credito sul maturato che segue la sua fattura)
- `strumenti/opencode/resoconto-collaudo-3-08.md` (Tentativi d'accesso per IP + persona, tetto largo per persona)
- `strumenti/opencode/resoconto-collaudo-3-09.md` (Connettore di lettura locale non sceglibile)
- `strumenti/opencode/resoconto-collaudo-3-10.md` («Pagina non trovata» al posto di «In costruzione»)

Applica ogni voce dove dice il resoconto. Se una voce va contro il §19 o non è chiara, non scriverla: elencala nel tuo
resoconto per Claude Code.

## Righe del §19 da aggiungere (pronte, in fondo al registro, in ordine di numero)

Numeri già assegnati nel piano (D-114…D-132): usa **esattamente** questi, una volta sola. Se il resoconto del pacchetto dice che la decisione non è stata attuata, non scrivere la riga e segnalalo. Per ognuna aggiungi anche una riga *Perché (D-nn)* nella sezione della spec indicata in *Dove* e, se cambia ciò che vede l'utente, il testo in `guida.ts`.

| D-122 | 08/11/2026 | **Uno scartato torna in coda solo se lo si ricarica a mano.** Lo stesso file (stessa impronta) di un documento scartato lo rimette in coda solo con `origine = caricamento`; se arriva dalla casella il giro lo conta fra gli ignorati e lo scarto resta. Precisa D-54. | Un promemoria del fornitore con lo stesso PDF riapriva scarti voluti («Non riguarda Decobrands», «Doppione») (collaudo A4). | Ugo (collaudo 08/11/2026, U10) | §6.5, §7.9; `documenti.ts` (`riceviDocumento`), `casella.ts` |
| D-118 | 08/11/2026 | **Sul maturato la nota di credito segue la sua fattura.** Una nota di credito di un fornitore sul maturato entra in liquidazione con il riconoscimento della sua fattura (`riconosciutoIn` della fattura `fattura_id`); il motivo «in attesa di incasso» vale solo per le fatture. | Il fornitore spesso non elenca la nota nel bollettino: restava non liquidabile per sempre e il subagente teneva la provvigione intera (collaudo A2-06). | Ugo (collaudo 08/11/2026, U5) | §5.5, §5.14; `motore.ts` (`righeLiquidazione`) |
| D-116 | 08/11/2026 | **Tentativi d'accesso contati per IP + persona, con un tetto largo per persona.** Il contatore stretto `persona` usa la chiave IP + persona (10 in 15 minuti, come D-41); un secondo contatore per sola persona ha un tetto largo (`TENTATIVI_PERSONA`, 50 in 15 minuti); il tetto per IP (100) resta. Modifica D-81. | Con il contatore per sola persona (D-81) chiunque da Internet bloccava l'accesso di Ugo con 10 errori ogni 15 minuti; con F7-A2 il CRM è raggiungibile dall'esterno (collaudo A1). | Ugo (collaudo 08/11/2026, U3) | §3.3; `app.module.ts` (`limiti`), `accesso.ts` (`TentativiGuard`) |
| D-125 | 08/11/2026 | **Il connettore di lettura locale non si sceglie finché non esiste.** In Impostazioni › Lettura `glm_ocr_locale` non si salva (400 «non ancora disponibile») e nella pagina è spento con il motivo; si legge con LlamaCloud UE (D-67). | Scegliendolo i documenti restavano in coda per sempre, senza anomalia (collaudo A4). | Ugo (collaudo 08/11/2026, U13) | §6.5, §7.15; `impostazioni.ts` |

## Rilievi di documentazione assegnati a questa onda

_Nessun rilievo A9 assegnato a questa onda._

## File ammessi

- `specifica-crm-provvigioni.md`, `app/frontend/lib/guida.ts`, `piano-lavoro-crm.md`, `PRD-crm-provvigioni.md`,
  `prototipo-alternativo/LEGGIMI.md`, `prototipo-alternativo/assets/guida.js`, `app/README.md`
- `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` (solo rigenerati da `genera-pagine-doc.py`)
- `strumenti/opencode/resoconto-collaudo-3-doc.md`

## Prove

- `python3 strumenti/genera-pagine-doc.py` senza errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori (se tocchi `guida.ts`).
- Controllo delle righe del §19: ogni riga `| D-nn |` ha 6 celle (script breve, contando `|` non preceduti da `\`).
- `app_guida.py` la lancia il controllo di fine onda: scrivilo nel resoconto.

## Criteri di fine

Ogni voce *Da documentare* applicata o motivata; rilievi A9 dell'onda chiusi; pagine rigenerate; resoconto in
`strumenti/opencode/resoconto-collaudo-3-doc.md`; nessun commit.

## Cosa NON fare

- Non inventare decisioni: si scrive solo ciò che i resoconti e i rilievi dicono.
- Non cambiare il senso delle decisioni del §19 esistenti.
- Niente commit, niente push.
