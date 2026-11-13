# Resoconto — Correggi i dati letti: ordine, cliente, Integra (13/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/correggi-ordine.md` · Gravità P1.

## Causa vera del punto 3 (ricerca su Integra vuota)

`sqlRicerca` (anagrafica-integra.ts) cercava `ragione_sociale ILIKE '%<testo intero>%'`. Con «Cerca
questo» il testo è il nome letto per intero («ARTE WOHNACCESSOIRES GMBH & CO.KG») che in Integra è
scritto diverso (punti, spazi, «Co. KG», maiuscole). La ricerca per testo intero non lo ritrovava.
**Correzione**: la ragione sociale si cerca **per parole** (ogni parola significativa ≥ 3 lettere,
senza sigle societarie SRL/SNC/SPA/GMBH/CO/KG/… né punteggiatura, al massimo 5), tutte in `AND` con
`ILIKE` parametrizzato (`$n`), ordine invariato (codice esatto → P.IVA → nome). Stesso ripiego nel
filtro del CRM (`corrisponde`/`punti`/`righe` di CampoRicerca.tsx). Gli accenti restano (l'`ILIKE`
non li piega: senza accenti si perdeva «Già Importato» nel flusso D-133, visto con la prova jest).
Non era né un permesso né il filtro degli importati né il 403: il permesso `dati.consulta` c'è e il
riquadro Integra compare col menu aperto.

## File toccati

- `app/backend/src/anagrafica-integra.ts`: `paroleDi` + `sqlRicerca` per parole (punto 3).
- `app/frontend/componenti/CampoRicerca.tsx`: ricerca per parole nei tre punti; `Singola` ristrutturata
  (pallino+lente sempre sulla stessa riga, riga «Cerca questo» sotto il campo, fuori dal flex, ellissi
  + `title`); `testoIniziale.mostra` opzionale; nuovo `onScelto` (record intero) per riempire i campi.
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`: griglia riordinata (Tipo·Numero·Data·
  Fornitore / Fornitore letto·Codice cliente·Cliente·Cliente letto / P.IVA cliente·Importo); ricerca
  «Cliente» nuova con «Cerca questo» che, alla scelta, riempie `cliente` e `piva_cliente` (meccanismo
  D-152: il documento non ha `cliente_id`); `testoIniziale` del cliente in *Apri la pratica*; riepilogo
  affidabilità chiuso di default, freccia ▸/▾, `aria-expanded`, senza area vuota a 0 punti.
- `app/frontend/app/stile/stile.css`: classi `.ricerca-riga` e `.ricerca-letto` (nuove); `.riep-freccia`
  semplificata (testo, niente rotazione).
- `app/frontend/lib/guida.ts`: «da sapere» dei Documenti aggiornato.
- `app/backend/test/anagrafica-integra.spec.ts`: prova nuova «ritrova per parole anche se scritta in modo diverso».
- `strumenti/prove/app_documenti.py`: controlli nuovi (lente sulla stessa riga ±4 px, fornitore+cliente
  con «Cerca questo», riepilogo chiuso senza area vuota), diagnosi errori di pagina all'apertura,
  schermata `correggi-1440.png`.

## Prove

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest `test/anagrafica-integra.spec.ts` su `decobrands_test_ordine` (creato, migrato, poi cancellato): **25/25** (1 nuova).
- jest `test/documenti.spec.ts`: **60/60**.
- `python -m py_compile strumenti/prove/app_documenti.py`: **OK** (prova browser non lanciata, come da regole).
- DB `decobrands_test_ordine` lasciato da cancellare a fine onda (come da regole).

## Controlli (skill caricate davvero)

- `owasp-security`: la SQL resta parametrica (`$n`); `%` e `_` dell'input cadono in `paroleDi` (split su
  non alfanumerico), niente jolly né injection. `onScelto` riempie lo stato del browser ma il PUT
  rivalida tutto sul server (V12). Niente rilievi.
- `postgresql-code-review`: niente indici nuovi (le viste sono sul ponte, in sola lettura); le condizioni
  `ILIKE` con `%` iniziale restano limitate dal `LIMIT 10` e dai timeout `conTempo`/`query_timeout`. OK.
- `ponytail-review`: helper per-parole condiviso nei tre punti del frontend; `onScelto` minimo; nessun
  doppione. Niente da tagliare.

## Punto 5 (prova bloccata su `.selezionabile a`)

Non riproducibile da qui (prove browser non lanciabili; il frontend di prova è una copia fuori progetto).
Il codice dell'elenco (VistaDocumenti.tsx, `elenco`, `esitiImportazione`) è intatto e le modifiche non
committate non lo toccano. Ho aggiunto una diagnosi: se la pagina ha errori JS all'apertura ora si dice
subito (KO col messaggio) invece del timeout muto. **Da verificare** con il giro e2e di Claude Code: se
è un errore di pagina, il messaggio lo dirà; se l'elenco resta vuoto, il colpevole è l'ambiente (DB di
prova/seed), non il pacchetto.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9 (Correggi i dati letti): ricerca «Cliente» con «Cerca questo», griglia riordinata, riepilogo
  chiuso con freccia; scegliere il cliente riempie nome e P.IVA (niente `cliente_id`).
- spec §16.4.1: `CampoRicerca` cerca per parole (CRM e Integra); `testoIniziale.mostra` opzionale; `onScelto`.
- spec §19: decisione nuova **D-153** «i nomi si cercano per parole (sigle societarie e punteggiatura
  escluse)» + il perché (i nomi di Integra sono scritti diverso dal PDF; «Cerca questo» manda il nome
  intero e va spezzato).
- Catalogo componenti (`componenti/page.tsx`) da aggiornare: firma di CampoRicerca (fuori dai file ammessi).

## Aperti

- La prova browser (app_documenti) va lanciata da Claude Code a fine onda: è l'unico punto non verificato
  qui (punto 5 + nuovi controlli).
- Il catalogo componenti è leggermente arretrato (non è nei file ammessi).
