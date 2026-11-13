# Resoconto — soglie lettura (D-151)

Pacchetto: `strumenti/opencode/soglie-lettura.md` · esecutore DeepSeek V4 pro · 13/11/2026

## Rilievi e correzioni (tutte fatte)

1. **Valore di partenza 0,80** — `app/backend/src/impostazioni.ts` (`INIZIALI.lettura.soglia_ok` 0.9 → 0.8) e il fallback in `app/backend/src/proposta.ts` (`soglieLettura`, ora esportata, `?? 0.9` → `?? 0.8`). I `soglia_ok: 0.9` nei test (`coda.spec.ts`, `lettura.spec.ts`, `proposta.spec.ts`, `lettore.spec.ts`) sono configurazioni esplicite passate ai servizi, non il default: lasciati.
2. **Niente soglie fisse nel browser (V12)** — `app/backend/src/documenti.ts` (`dettaglioDocumento`) ora manda `soglie: {soglia_ok, soglia_bassa}` col documento; `app/frontend/.../VistaDocumento.tsx` toglie le costanti `SOGLIA_OK`/`SOGLIA_BASSA` e usa `d.soglie` per `punti`, `righeIncerte`, `classeAff`, `CampoLetto`, `restanti`/`bassa` e la cella delle righe. Nessun'altra soglia fissa nel frontend (grep pulito).
3. **Livelli ricalcolati al salvataggio** — `app/backend/src/impostazioni-api.ts`: nuova `riclassificaDocumenti()` che, nella stessa transazione del salvataggio (V13), ricalcola `livello` e `controlli` con `valutaLettura` sui soli documenti `da_controllare`/`errore`; l'evento `crud.update` porta `riclassificati` (il numero). Gli abbinati e gli scartati non si toccano.
4. **Guida** — `app/frontend/lib/guida.ts` (Impostazioni → sapere): frase sulle soglie che valgono anche per i documenti da controllare, riclassificati al salvataggio.
5. **«Aggiungi riga»** — `VistaDocumento.tsx`: la riga nuova si porta in vista (`scrollIntoView({block:'nearest'})`) e il fuoco va sul primo campo (stato `nuovaRiga` + `data-riga` sulla riga). Nessun altro pulsante che aggiunge righe a una tabella nella stessa pagina (grep).

## Prove

- `npx tsc --noEmit` backend: **ok** · frontend: **ok**.
- Jest su `decobrands_test_soglie` (creato e migrato da me, cancellato a fine lavoro):
  - `test/impostazioni.spec.ts` — **22/22** (nuovi test: default 0,80/0,70; riclassificazione dei soli documenti da decidere, abbinato/scartato intatti, un solo evento con `riclassificati`, V13).
  - `test/lettura.spec.ts` — **13/13**.
  - `test/documenti.spec.ts` — **56/56**.
- Prove nel browser: **non lanciate** (regole-onda-parallela.md riga 8: le lancia Claude Code a fine onda). `app_documenti.py` aggiornato (i tre mock del dettaglio ora portano `soglie`); `app_impostazioni.py` non controlla soglie. `python -m py_compile` su entrambi: ok.

## Da documentare (fatto in questo pacchetto)

- §19 riga **D-151** (6 colonne), §6.5 (tabella dei livelli 0,80/0,70 + riga *Perché*), §7.15 (valori iniziali 0,80/0,70 + riclassificazione + riga *Perché*), `GET /api/documenti/:id` con `soglie` nella risposta, versione **8.80 → 8.81**. `python3 strumenti/genera-pagine-doc.py` lanciato.

## Aperto (file non ammessi, per Ugo / Claude Code)

- **Seed vietato**: `app/backend/prisma/seed/dati-prova.json` ha ancora `"soglia_ok": 0.9` (e i nomi vecchi `indirizzo`/`modello`/`attesa_s` senza `connettore`) e `00-base.ts:238` classifica `livello` con `minimo < 0.9`. Specchiano il vecchio 0,90; per D-151 andrebbero 0,80/0,80. Non toccati (vietato dal pacchetto).
- **`strumenti/prove/documenti_prova.js`** (non ammesso): `righe[0].quantita` ha affidabilità **0,80**, esattamente sulla nuova soglia «affidabile»; il controllo di `app_documenti.py:107` («campi bordati giallo e rosso») richiede un campo in [0,70, 0,80): va abbassato (es. 0,75) prima di lanciare la prova nel browser.
- **Lancio delle prove nel browser** (`prepara.sh` + `giro.sh app_documenti app_impostazioni`, due volte): rinviato a Claude Code a fine onda, come da regole comuni.
