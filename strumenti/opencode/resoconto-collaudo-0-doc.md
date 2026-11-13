# Resoconto pacchetto 0-doc — Documentazione dell'onda 0

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Nessun rilievo A9 assegnato all'onda.

## Cosa ho fatto

Ho raccolto le sezioni *Da documentare* dei cinque resoconti (0-01…0-05) e le ho applicate
in un solo passaggio, senza toccare codice né prove.

### Specifica (`specifica-crm-provvigioni.md`)

- **Versione 8.77 → 8.78** con il riassunto dell'onda (D-139…D-143).
- **Registro §19**, cinque righe nuove in coda a D-138:
  - **D-139** `sconti` → `interscambio` `ON DELETE RESTRICT` (riga fornita dal pacchetto,
    resoconto 0-05: migrazione applicata, 25 migrazioni).
  - **D-140** il PDF di un bollettino non si scarta e non si abbina a una pratica (0-01, A3-02).
  - **D-141** una decisione in un bollettino ferma annullamento e spostamento (0-02, A3-03).
  - **D-142** numero pratica UNIQUE e indici delle FK (0-03, A3-10/A3-11).
  - **D-143** indici trigram della ricerca Pratiche (0-04, A7-24).
- **Righe *Perché***:
  - §4.2.6, in coda al *Perché (D-35)*: `sconti.interscambio_id` RESTRICT (D-139).
  - §4.2.7: indice UNIQUE su `numero_ordine` e indice `agente_id` nella riga «Indici» +
    *Perché (D-142)*.
  - §7.2 (elenco Pratiche): *Perché (D-143)* sulla ricerca `ILIKE` e gli indici trigram.
  - §7.3: bullet «Decisione in un bollettino» + *Perché (D-141)*.
  - §7.9: paragrafo «Il PDF di un bollettino resta del bollettino» + *Perché (D-140)*.

### Guida (`app/frontend/lib/guida.ts`)

- *Documenti* → *Da sapere*: il PDF di un bollettino non si scarta e non si abbina (D-140).
- *Pratiche* → *Da sapere*: la decisione in un bollettino blocca annullamento e spostamento (D-141).
- *Clienti* → il testo D-139 (agenzia con sconti storici, 409) era **già presente** dalla
  documentazione dell'onda 0 bis: non l'ho duplicato.

### Piano (`piano-lavoro-crm.md`)

- Versione 2.1 con il riepilogo della documentazione dell'onda 0.
- Attività nuove, tutte **da approvare**: F1 FK `sconti` RESTRICT 0,5 h (D-139) e 409 chiaro
  eliminando un'agenzia con sconti 0,25 h (aperta); F2 unique/indici FK 0,5 h (D-142) e indici
  trigram 1 h (D-143); F3 decisione del bollettino protetta 0,5 h (D-141); F6 vincoli del file
  di un bollettino 0,5 h (D-140).

### Altro

- `app/README.md`: nota che la migrazione `ricerca_trgm` crea `pg_trgm` (trusted, nessun
  amministratore).
- `prototipo-crm/specifica.html` rigenerato con `python strumenti/genera-pagine-doc.py`
  (`preventivo.html` non aveva differenze).

## Prove

| Prova | Esito |
|---|---|
| `python strumenti/genera-pagine-doc.py` | 19 sezioni, nessun errore |
| `cd app/frontend && npx tsc --noEmit` | 0 errori |
| Controllo §19: ogni riga `| D-nn |` ha 6 celle (script su `\|` non preceduti da `\`) | 124 righe, 0 fuori formato |
| `app_guida.py` | la lancia il controllo di fine onda (non l'ho eseguita, come da regole) |

## Cose aperte / note per Claude Code

1. **D-139: 409 promesso ma non ancora nel codice.** Spec §7.6 e guida dicono che eliminare
   un'agenzia con sconti risponde 409, ma il resoconto 0-05 ha trovato che `clienti.ts`
   (`eliminaAgenzia`) non passa da `unico()` e risponde 500. Testo ed esempi già c'erano (onda
   0 bis): non li ho cambiati. La correzione è l'attività aperta di 0,25 h messa nel piano.
2. **Resoconto 0-04 diceva §7.5 «Pratiche, ricerca e filtri»**, ma in spec §7.5 è *Subagenti*:
   il *Perché (D-143)* l'ho messo in **§7.2 Elenco pratiche**, dove sta la ricerca. Segnalato
   qui invece di seguire il numero sbagliato.
3. **Riga D-139 del resoconto 0-05 diversa** da quella fornita dal pacchetto (chi «Ugo (collaudo
   11/11/2026, R0 domanda 7)», §4.2.6, migrazione `20261113140000_sconti_restrict`): ho usato
   quella del pacchetto, come chiede la sezione «Righe del §19 da aggiungere».
4. **File modificati non miei** già in working copy (altri pacchetti in parallelo o lavoro
   preesistente): `app/backend/src/accesso.ts`, `app/backend/src/impostazioni.ts`,
   `app/backend/test/impostazioni.spec.ts`, `app/backend/test/profilo.spec.ts`,
   `app/frontend/app/(app)/{bollettini/VistaBollettini,documenti/VistaDocumenti,oggi/VistaOggi,pratiche/VistaPratiche,sistema/VistaSistema}.tsx`,
   `app/frontend/lib/api.ts`. Non li ho toccati. Restano anche i due file non tracciati
   `doppioni-anagrafica-integra.xlsx` e `prototipo-alternativo/.tmp-soggetti.png`.
5. **Niente commit** (come da regole).

## Da documentare

Nessun'altra voce: tutte quelle dei resoconti 0-01…0-05 sono applicate o motivate sopra.
Le uniche decisioni nuove sono D-139…D-143, già scritte in §19.
