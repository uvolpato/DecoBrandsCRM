---
name: fase
description: Esegue una fase di avanzamento-app.md con un agente sul modello che scegli tu in base al lavoro (Opus, Sonnet, Haiku), passandogli solo il contesto che serve. Usare SEMPRE, senza aspettare che Ugo lo chieda, quando si comincia o si riprende una fase o un'attività di avanzamento-app.md / piano-lavoro-crm.md ("andiamo avanti", "prossima fase", "fai la 2b", "/fase 2a").
---

# Fase con il modello giusto

Fa eseguire una fase a un agente secondario sul modello segnato in `avanzamento-app.md`
(colonna *Modello*), con un brief mirato al posto di tutta la conversazione. La sessione
principale prepara il brief e poi controlla il risultato.

## Passi

1. **Fase.** Usa quella indicata negli argomenti (es. `2a`, `F2-A1`). Se non ce n'è una, prendi la
   prima con `[ ]` in `avanzamento-app.md`. Se il gruppo ha più attività non fatte, usa il modo
   *Parallelo* qui sotto.
   **Modello: lo scegli tu**, guardando il lavoro, non solo la colonna *Modello* (che è un'indicazione):
   - `opus`: regole, soldi e calcoli delle provvigioni, stati, abbinamenti, accesso e permessi,
     scelte di architettura;
   - `sonnet`: schema e migrazioni seguendo la spec, pagine, elenchi, esportazioni, sincronizzazioni,
     prove;
   - `haiku`: rinomine, ricerche, piccole correzioni.

   Se una fase mescola i due tipi, dividila in due agenti (prima il server, poi le pagine).
   Nel messaggio a Ugo scrivi quale modello hai scelto e perché, in mezza riga.

   **Se giri in OpenCode** (non in Claude Code: niente strumento `Agent` con `model`, ma `task` e
   gli agenti di `opencode.json`):
   - lavoro da `sonnet` o `haiku`: usa il **modello caricato in OpenCode** (quello della sessione),
     senza chiedere;
   - lavoro da `opus`: **fermati e chiedi a Ugo** quale modello usare, con mezza riga sul perché è
     un lavoro da Opus (regole, soldi, stati…). Non cominciare finché non risponde;
   - niente modo *Parallelo* (OpenCode non ha i worktree automatici): una attività alla volta.
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

## Parallelo (`/fase <blocco> parallelo`)

Per i blocchi divisi in attività (`avanzamento-app.md`, tabella *Attività F1–F7*): si lancia
insieme il **primo gruppo non fatto**, un agente per attività, ognuno sul suo modello.

1. Per ogni attività: brief come al passo 3, più i **file che può toccare** (dal piano) e l'elenco
   di quelli che toccano gli altri agenti del gruppo, da non toccare. I file comuni (`app.module`,
   barra, guida, spec, `avanzamento-app.md`) **non li tocca nessun agente**: l'agente scrive nel
   resoconto cosa ci va e lo aggiunge la sessione principale.
2. Database di prova separato per agente, perché le prove svuotano il database: prima del lancio
   la sessione principale crea `decobrands_test_<attività>` (es. `decobrands_test_f2a1`, owner
   `decobrands`) e ci applica le migrazioni. Nel brief scrivi di lanciare le prove con
   `DATABASE_URL_TEST` che punta a quel database (`test/ambiente.ts` lo accetta perché il nome
   contiene `decobrands_test`). Se non si può creare il database, avvisa Ugo e lancia gli agenti
   uno alla volta.
3. Lancio: `Agent` con `isolation: "worktree"`, `model` dell'attività, `description` =
   "Fase <attività>". Tutti nello stesso messaggio. Il worktree non ha `.env`: nel brief scrivi
   di copiarlo da `C:\Progetti\Decobrands_CRM\app\backend\.env` senza modificarlo.
4. Unione **una alla volta**, nell'ordine in cui finiscono: diff, controlli (passo 5), merge in
   `main`, `npm test` su `decobrands_test`, commit. Un conflitto lo risolve la sessione principale.
5. Dopo l'ultimo: file comuni, `avanzamento-app.md`, cancellazione dei database
   `decobrands_test_<attività>`, messaggio a Ugo (passo 6, un punto per attività).

## Limiti

- L'agente parte senza la conversazione: se il brief manca di un vincolo, l'agente non lo conosce.
  Nel dubbio aggiungi una riga al brief, non un file intero.
- Il modello della sessione principale non cambia: le decisioni di architettura le prende la
  sessione principale o un agente `opus`.
