# Resoconto — `documenta-0-2-8` (16/11/2026)

Esito: fatto. File toccati solo quelli ammessi, più questo resoconto.

## 1. Spec `specifica-crm-provvigioni.md`

- **D-197 verificato**: dice righe della nota salvate (`fase = nota_credito`, stessa tabella), sconto
  medio della differenza fattura − nota (e cambio scaglione), fattura congelata → la nota porta la
  differenza, nota senza righe = riserva, storno totale = 0. Nessuna modifica alla riga.
- **D-198 aggiunto** in §19 (primo numero libero dopo D-197): colonna **Importo** nella finestra
  «Cerca pratica» (valore salvato da `aggiornaPratica`, ultima fase, dal server) e pulsante a icona
  che apre `/pratiche/<id>?vista=sola` in nuova scheda senza selezionare la riga (`apriVoce`); vista
  sola senza barra, avvisi e intestazione, con «Chiudi la scheda»; permessi invariati. Perché: Ugo
  16/11, controllare la pratica giusta senza perdere il documento in lavorazione.
- **§7.9**: frase nella descrizione della ricerca di un'altra pratica + riga *Perché (D-198)*.
- **§16.4**: nella riga `CampoRicerca` + `RicercaEntita` la prop opzionale `apriVoce`; paragrafo
  **Pagina in vista sola** prima del comportamento fisso della DataTable.
- **Versione in testa**: 8.87 con il riassunto della modifica (era 8.86).

## 2. `app/frontend/lib/guida.ts`

Già aggiornato dal pacchetto `pratica-da-ricerca`: alla pagina Documento, finestra «Oppure abbina a
un'altra pratica», ci sono la colonna Importo (fatture − note, altrimenti conferme, altrimenti
ordini), il pulsante che apre in nuova scheda e «Chiudi la scheda». Non contraddice la sezione sulla
nota di credito (la tendina parte da «Fatturata» per nota e pagamento). Nessuna modifica necessaria.

## 3. `piano-lavoro-crm.md`

- **F7-A21 · righe della nota di credito — 8 h da approvare** (motore 4, migrazione e registrazione
  2, frontend e guida 1, prove 1).
- **F7-A22 · apertura della pratica dalla ricerca — 4 h da approvare** (server e query 1, componente
  e layout 2, prove 1).
- Versione in testa 2.6 con il riassunto.

## 4. `app/NOTA-RILASCIO.md`

Sezione **0.2.8 — 16/11/2026 — note di credito più precise e pratica in una scheda a parte**, in
italiano semplice e senza nomi tecnici: righe della nota e sconto medio sulla differenza, fattura già
chiusa con la differenza, nota senza righe e storno totale; colonna Importo e nuova scheda con
«Chiudi la scheda».

## 5. Versioni

`app/backend/package.json` e `app/frontend/package.json`: solo la riga `version` a **0.2.8**.

## 6. Pagine generate

`python strumenti/genera-pagine-doc.py`: `specifica.html` rigenerata (19 sezioni), `preventivo.html`
aggiornato.

## Non fatto

- Nessuna prova di codice: pacchetto di sola documentazione, nessun file `.ts`/`.tsx` toccato.
- Nessun commit.

## Riepilogo (6 righe)

1. D-197 verificato (righe, differenza, fattura congelata, riserva, storno 0) e **D-198** aggiunto in §19.
2. §7.9 e §16.4 con la ricerca pratica: colonna Importo, `apriVoce`, pagina in vista sola.
3. Versione spec **8.87** con il riassunto.
4. `guida.ts` già allineato, nessuna contraddizione con la nota di credito.
5. Piano **2.6**: F7-A21 (8 h) e F7-A22 (4 h) **da approvare**; NOTA-RILASCIO **0.2.8**.
6. `package.json` a 0.2.8 e pagine generate; nessun commit.
