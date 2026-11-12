# Resoconto · Onda 0 bis · Pacchetto 0b-06 — Lista Documenti: segno «Cliente in Integra»

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: R2-12 (P3).

## Cosa ho fatto

### R2-12 — Lista Documenti: il cliente da importare non ha il suo segno
- File: `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`, blocco `stato` della voce (righe 156-161).
- `d.cliente_da_integra` aggiunto alla condizione che mostra i segni.
- Nuovo segno `{d.cliente_da_integra ? <Stato v="info">Cliente in Integra</Stato> : null}`.
- Il segno del fornitore passa da «In Integra» a «Fornitore in Integra», per distinguerli.
- Il backend `app/backend/src/documenti.ts:548` calcola già `cliente_da_integra` nell'elenco (D-111): nessun
  cambiamento al server, nessun valore calcolato nel browser (V12).
- Rilievo non già corretto prima del mio intervento.

## Prove

- Backend: `cd app/backend && npx tsc --noEmit` → 0 errori (eseguito; pacchetto solo frontend, nessuna prova jest,
  nessun database di prova creato).
- Frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori.
- `git status --short`: fra i file modificati ci sono solo i miei (`VistaDocumenti.tsx` più questo resoconto); gli
  altri modificati (`VistaClienti.tsx`, `VistaFornitori.tsx`, `stile.css`, `CercaInIntegra.tsx`) sono di altri
  pacchetti dell'onda. `app_documenti.py` non l'ho toccata (è di 0b-01).
- Prove nel browser da lanciare a fine onda: `python strumenti/prove/app_documenti.py <suffisso> <cartella>`
  con un documento di prova il cui cliente non è in anagrafica ma esiste in Integra (ponte simulato): in lista
  deve comparire il segno «Cliente in Integra», accanto a «Fornitore in Integra» quando serve. Controllo visivo
  a 1440 e 768 px della colonna «Da controllare».
- Database di prova `decobrands_test_0b_06`: non creato (nessuna prova jest).
- Nessun commit.

## Da documentare

### §19 — registro decisioni
Non nasce una regola nuova: è l'applicazione di D-111 alla lista (il documento dice in elenco se fornitore o
cliente sono da importare da Integra). Se serve la riga:

> D-nn · 12/11/2026 · Nella lista Documenti i due segni sono distinti: «Fornitore in Integra» e «Cliente in
> Integra» · Perché: un documento con cliente non in anagrafica ma presente in Integra non si vedeva in elenco e
> si scopriva solo aprendo il documento (R2-12) · Ugo · §7.9, `VistaDocumenti.tsx`.

### Spec — riga *Perché* (§7.9, Documenti)
> **Perché** i segni «Fornitore in Integra» e «Cliente in Integra» sono separati: dicono subito quale anagrafica
> manca e si può importare da Integra, senza aprire il documento (D-111).

### Guida (`app/frontend/lib/guida.ts`) — testo pronto
> **Segni in elenco**: accanto a ogni documento puoi vedere *Affidabile*, *Da controllare*, *Affidabilità bassa*,
> *Fornitore in Integra* (il fornitore non è in anagrafica ma esiste in Integra), *Cliente in Integra* (stessa
> cosa per il cliente), *Non rappresentato* e *Manca l'agenzia*. Aprendo il documento i segni diventano i
> pulsanti per importare l'anagrafica mancante.

### Piano (`piano-lavoro-crm.md`)
Nessuna attività nuova né ore: è una correzione del collaudo dentro F6-A4b.

### README
Nessuna modifica.
