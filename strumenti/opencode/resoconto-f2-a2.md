# Resoconto F2-A2 — Dettaglio pratica (con le pagine dei documenti di F2-A3)

Modello: quello caricato in OpenCode (DeepSeek), come da prompt. Lavoro in una sola sessione.
Niente commit: il prompt lo vieta.

## Cosa è stato fatto

- `GET /api/pratiche/:id` (permesso `provvigioni.consulta`): testata, stato e nota dal motore,
  binario delle fasi (con differenza rispetto alla fase prima o attesa), righe a confronto con le
  variazioni, provvigione (percentuali alla data, quota del subagente per documento con le regole
  di D-27, maturato/fatturato) e azione proposta. Tutto calcolato dal server (V12, D-28).
- `GET /api/documenti/:id/file` (`provvigioni.consulta`): PDF in linea dal percorso salvato in
  `documenti_in_arrivo.file_percorso` (D-55), solo dentro `DOCUMENTI_DIR`; `application/pdf`,
  `Content-Disposition: inline; filename*=UTF-8''…`, `nosniff`, `Content-Security-Policy: sandbox`;
  404 se il file manca. Il percorso non arriva mai dal browser.
- Pagina `/pratiche/[id]` (`VistaPratica.tsx`): binario, schede *Riepilogo* (avviso delle
  variazioni con *Vedi le righe*, provvigione, card *Documenti fiscali* con netto) e *Righe a
  confronto* (segmenti, righe evidenziate, differenza); arrivando dal filtro *Con variazioni*
  dell'elenco la pratica si apre già sul confronto (D-12). Finestre *Registra la fattura* e
  *Registra la nota di credito* con PDF facoltativo, *Correggi* e *Annulla*; documenti affiancati
  con il PDF in `<object>`.
- L'elenco ora resta montato solo su `/pratiche` (il dettaglio è una pagina sua) e la memoria di
  filtro, ordinamento e pagina si ritrova tornando indietro (§7.12).
- Server invariato rispetto alle modifiche già presenti nel working tree: le rotte dei documenti
  fiscali (F2-A3, D-54) erano già fatte. Aggiunte le prove di dettaglio e del file.

## File toccati

- `app/backend/src/pratiche.ts` (dettaglio), `app/backend/src/documenti.ts` (file)
- `app/backend/test/pratiche.spec.ts`, `app/backend/test/documenti.spec.ts`
- `app/frontend/app/(app)/pratiche/[id]/page.tsx`, `.../[id]/VistaPratica.tsx` (nuovo)
- `app/frontend/app/(app)/pratiche/layout.tsx`, `.../VistaPratiche.tsx`, `app/frontend/lib/api.ts`
  (`caricaPdf`)
- `app/frontend/app/stile/stile.css` (classi del binario, avviso delle variazioni, riepilogo)
- `strumenti/prove/app_pratica.py` (nuovo), `strumenti/prove/app_pratiche.py` (il dettaglio non è
  più "in arrivo")
- `specifica-crm-provvigioni.md` (§7.3, §8.1, §16.4, versione 8.16), `prototipo-alternativo/assets/guida.js`
- `avanzamento-app.md`

## Rotte nuove

```
GET /api/pratiche/:id →
{ id, numero, cliente_id, cliente, fornitore_id, fornitore, subagente_id, subagente,
  data, importo, stato, nota, scadenza,
  fasi: [{titolo, fatta?, ritardo?, numero?, data?, importo?, delta?, testo?, assente?}],
  confronto: { fasi: [{tipo, etichetta, numero, data}],
               righe: [{codice, descrizione, varia, delta, per: [{qta, prezzo, importo}|null]}],
               variazioni: {numero, totale} },
  provvigione: {imponibile, sconto, valido_dal, agente, sub_standard, sub, eccezione,
                da_fornitore, a_decobrands, a_subagente, maturazione, regole} | null,
  azione: {tipo, testo} }

GET /api/documenti/:id/file → il PDF (application/pdf, in linea, sandbox); 404 se manca
```

## Prove

- `app/backend`: `npx tsc --noEmit` pulito; `npx jest --runInBand` → **226 OK, 0 KO**
  (su `decobrands_test`).
- Browser (backend 8012→8013 e frontend 8011→8014, perché le porte previste erano occupate da
  processi non miei):
  - `app_pratica.py` → **42 controlli, 0 KO**
  - `app_pratiche.py` → **19 OK, 0 KO**
  - `app_componenti.py` → **54 OK, 0 KO**
- Schermate in `%TEMP%\f2-a2`: `app-pratica-1440.png`, `app-pratica-righe-1440.png`,
  `app-pratica-pdf-1440.png`, `app-pratica-768.png` (+ quelle dell'elenco). Guardate.

## Controlli prima della consegna

- `owasp-security` sul canale dei file: percorso solo dal database e dentro `DOCUMENTI_DIR`,
  intestazioni codificate (niente virgolette né a capo), sandbox sul PDF, permesso su entrambe le
  rotte, prove su 403 e 404. Nessun rilievo.
- `ponytail-review`: nessun bug bloccante. Due cose da sapere (sotto).

## Dubbi e cose aperte

- **f1-oper non è di sola lettura**: con D-45 il livello *operatore* ha `provvigioni.modifica`, quindi
  vede i pulsanti di scrittura. La prova del "senza pulsanti di scrittura" usa `f1-lett` (livello
  *lettura*); il prompt diceva `f1-oper` ma il modello dei permessi dice il contrario.
- **Dettaglio lento con molti dati**: `GET /api/pratiche/:id` usa `caricaDati`, che carica tutto il
  dataset (con 10.000 pratiche ~1,5 s, come misurato per D-52). L'elenco è in SQL, il dettaglio no:
  da riprendere se cresce il numero di pratiche (attività futura, non richiesta qui).
- **Differenze dal prototipo, volute o da fare dopo**: nella testata mancano *Carica un documento* e
  *Prepara il sollecito* (F6 e F3); nel Riepilogo manca *Incasso del cliente* (F3-A3); la finestra
  affiancata per ora mostra il PDF e i dati, non il confronto riga per riga con un altro documento
  (F6). Segnate in §7.3.
- **Test in sola lettura**: la prova nel browser registra una fattura e poi la annulla (per lasciare
  la pratica com'era); il PDF caricato resta in `documenti_in_arrivo` come `in_coda`. È il canale
  vero, non un difetto.
- **Barra a 768 px**: il menu dell'utente è tagliato a destra. È della shell (D-53), si vede su tutte
  le pagine, non di questa attività.
