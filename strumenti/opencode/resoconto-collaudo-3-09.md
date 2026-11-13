# Resoconto — Collaudo onda 3 · Pacchetto 3-09 · U13 (D-125)

Esecutore: DeepSeek V4 Flash · Data: 13/11/2026 · Gravità: P2

## Rilievo U13 — Connettore di lettura locale non sceglibile (D-125)

Fatto. `glm_ocr_locale` non si salva più e resta in elenco spento col motivo.

- `app/backend/src/impostazioni.ts:305-309` — in `applica`, se la sezione è `lettura` e il valore
  finale di `connettore` è `glm_ocr_locale`, 400 con
  «Il connettore locale non è ancora disponibile: si legge con LlamaCloud UE (D-67)».
  Il controllo sta prima di quello delle soglie e vale anche quando il locale era già salvato
  (uno stato vecchio non si può risalvare). `lettura.ts` non toccato, come chiesto.
- `app/frontend/app/(app)/impostazioni/VistaImpostazioni.tsx` — costante `MOTIVO_LOCALE`
  (riga 25-26); nella sezione `lettura` l'opzione `glm_ocr_locale` resta in elenco ma viene
  disabilitata (`disabled` + `title` col motivo) da un `useEffect`, perché il componente `Campo`
  non spegne le singole voci del select e non è fra i file ammessi (riga 54-60); l'aiuto sotto il
  campo mostra lo stesso motivo (riga 121). Il server resta comunque l'unico che decide (V12).
- `app/backend/test/impostazioni.spec.ts:254-264` — 400 con `glm_ocr_locale` e messaggio, 200 con
  `llamacloud_eu`; la prova del vecchio stato locale si fa scrivendo la riga a mano (niente rete).
- `strumenti/prove/app_impostazioni.py:78-84` — controlli: opzione presente, spenta, aiuto col motivo.

## Prove lanciate

| Prova | Esito |
|---|---|
| `app/backend` `npx jest test/impostazioni.spec.ts` (db `decobrands_test_3_09`, `TMP` separato) | **20/20 passati, 0 KO** |
| `app/backend` `npx tsc --noEmit` | **0 errori** |
| `app/frontend` `npx tsc --noEmit` | **0 errori** |
| `python -m py_compile strumenti/prove/app_impostazioni.py` | ok |
| Database `decobrands_test_3_09` | creato, migrazioni applicate, **cancellato** |

Prova nel browser **da lanciare a fine onda** (non lanciata qui): `strumenti/prove/app_impostazioni.py`.
Verifica che in Impostazioni › Lettura l'opzione «GLM-OCR locale» ci sia, sia spenta e che l'aiuto
porti il motivo. Le altre prove non toccate.

## Note

- `git diff --name-only` mostra anche file di altri pacchetti dell'onda già modificati nella
  cartella di lavoro prima di questo pacchetto; le modifiche fatte qui stanno solo nei quattro file
  ammessi sopra più questo resoconto. Nessun commit.
- Niente migrazioni, niente `schema.prisma`, niente Integra, niente `decobrands_db`.

## Da documentare

### Riga §19 (D-125)

- **D-125** · 08/11/2026 · **Il connettore di lettura locale non si sceglie finché non esiste.**
  In Impostazioni › Lettura `glm_ocr_locale` non si salva (400 «Il connettore locale non è ancora
  disponibile: si legge con LlamaCloud UE (D-67)») e nella pagina resta in elenco spento col motivo;
  i documenti si leggono con LlamaCloud UE (D-67). · Perché: un connettore che non esiste lascerebbe
  i documenti in coda per sempre senza anomalia (A4, *Da decidere* 4). · Ugo · spec §6.5, §7.15;
  `app/backend/src/impostazioni.ts`, `app/frontend/app/(app)/impostazioni/VistaImpostazioni.tsx`.

### Spec

- **§7.15 (Impostazioni › Server di lettura)** — *Perché*: il connettore locale si mostra spento
  finché non c'è la macchina, così nessuno può scegliere un modello che non legge nulla; il
  salvataggio lo rifiuta con 400 (D-125).
- **§6.5 (Ingresso documenti)** — *Perché*: si legge solo con LlamaCloud UE; il locale si accende
  quando arriva il server GPU (D-125).

### Guida (`app/frontend/lib/guida.ts`, voce Impostazioni, riga ~713)

Sostituire con:

> Server di lettura: oggi si legge con LlamaCloud UE. «GLM-OCR locale» resta in elenco ma spento,
> col motivo, finché non arriva la macchina: non si può salvare. La chiave non si rilegge e il file
> si cancella dal cloud dopo la lettura.

### Piano (`piano-lavoro-crm.md`) e README

Nessuna attività o ora nuova: correzione di collaudo (U13) dentro l'onda 3. README invariato.
