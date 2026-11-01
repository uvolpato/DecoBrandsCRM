---
name: fase
description: Esegue una fase di avanzamento-app.md con un agente sul modello segnato per quella fase (Sonnet, Opus, Haiku), passandogli solo il contesto che serve. Usare quando Ugo dice "/fase", "/fase 2a", "fai la prossima fase con il modello giusto" o "manda la fase all'agente".
---

# Fase con il modello giusto

Fa eseguire una fase a un agente secondario sul modello segnato in `avanzamento-app.md`
(colonna *Modello*), con un brief mirato al posto di tutta la conversazione. La sessione
principale prepara il brief e poi controlla il risultato.

## Passi

1. **Fase.** Usa quella indicata negli argomenti (es. `2a`). Se non ce n'è una, prendi la prima
   con `[ ]` nella tabella dei blocchi di `avanzamento-app.md`. Leggi il suo *Modello*:
   `Sonnet` → `sonnet`, `Opus` → `opus`, `Haiku` → `haiku`.
2. **Contesto minimo.** Leggi solo quello che serve alla fase:
   - la riga della fase nel piano (`piano-lavoro-crm.md`, attività F…): *Riferimenti*, *Sorgente
     prototipo*, *Output*, *DoD*;
   - le sezioni della spec citate (solo i numeri di sezione, l'agente le legge da sé);
   - i file dell'app che la fase tocca (`Grep`/`Glob`, non letture intere).
3. **Brief.** Scrivi il prompt dell'agente, autosufficiente, con:
   - **compito**: cosa consegnare e la DoD, in punti;
   - **dove**: percorsi dei file da creare o modificare, sezioni della spec e del piano da leggere
     (con numero), file del prototipo da replicare;
   - **regole del progetto** (riportale, l'agente non ha questa conversazione):
     - tutto sul backend, mai dai dati del frontend (V12); una operazione, una transazione (V13);
     - italiano semplice nel codice, nei commenti e nell'interfaccia; commenti brevi con rimando
       alla decisione (`// D-11 §19`);
     - codice minimo (ponytail): niente astrazioni non richieste, riusa quello che c'è;
     - prove sul database `decobrands_test`, mai su `decobrands_db`; nessun reset distruttivo;
     - niente commit, niente push, niente modifiche a `.env`;
   - **verifica**: quali prove lanciare (`npm test` in `app/backend`, `strumenti/prove/app_*.py`)
     e che devono chiudersi con 0 KO;
   - **resoconto finale**: file toccati, prove e loro esito, dubbi e cose lasciate aperte.
4. **Lancio.** `Agent` con `model` = il modello della fase, `description` = "Fase <n>",
   `prompt` = il brief. Non usare `subagent_type: "fork"` (ignora il modello e porta tutto il
   contesto). Aspetta la notifica: non inventare il risultato.
5. **Controllo nella sessione principale.**
   - Leggi il resoconto e il `git diff`.
   - Rilancia le prove indicate.
   - Fai i controlli prima del commit (CLAUDE.md §4 punto 6: completi sul codice sensibile, leggeri
     sul resto, completi nel dubbio).
   - Se qualcosa non va, correggi o rimanda all'agente con `SendMessage` (stesso contesto, stesso
     modello).
6. **Chiusura.** Aggiorna `avanzamento-app.md` (`[x]` e una riga su cosa è stato fatto), fai il
   commit in italiano e scrivi a Ugo in breve:
   - fase e modello usato;
   - cosa è stato fatto;
   - esito delle prove e dei controlli;
   - cosa resta aperto.

## Limiti

- L'agente parte senza la conversazione: se il brief manca di un vincolo, l'agente non lo conosce.
  Nel dubbio aggiungi una riga al brief, non un file intero.
- Il modello della sessione principale non cambia: per le decisioni di architettura vale
  ancora CLAUDE.md §4 punto 6b (chiedere a Ugo di cambiare modello con `/model`).
