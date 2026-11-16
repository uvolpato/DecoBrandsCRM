# Pacchetto `riga-codice-testo-prova-vera`

Leggi `strumenti/opencode/resoconto-riga-codice-testo.md`. Il pacchetto ha cambiato prompt e schema della lettura
(`lettura.ts`: righe con codice testo come «Fracht» tenute, campo `spesa`), ma **non ha riletto il PDF vero**:
ha scritto «server di lettura non risponde (`fetch failed`)».

Ugo (15/11/2026): **la lettura dei PDF va su LlamaIndex** (servizio in cloud, `extract_result`), non sul server
GPU. Quindi il `fetch failed` viene da altro: indirizzo sbagliato nel comando di prova, chiave di LlamaIndex non
caricata perché le variabili d'ambiente non sono state lette, o il comando ha preso il percorso del server locale.

## Compito
1. Capisci come la lettura vera sceglie il servizio (LlamaIndex / server locale) e come carica chiave e indirizzi
   (cerca in `lettore.ts`, `lettura.ts`, `lettura-prova.ts`, la configurazione). Lancia il comando di prova
   **nello stesso modo in cui il backend carica la configurazione** (es. lo stesso caricamento di `.env` che usa
   l'app, `node -r dotenv/config` o lo script npm esistente): **non leggere né stampare** `.env` e la chiave.
2. Rileggi **solo** `Documenti Veri/ORDINI 2026/BASTASIN/FLOROVIVAISTICA MANENTE/Ordine del 26.03.11/Proforma_PR102829.pdf`:
   atteso 27 righe, riga 27 «Fracht» 87,50 € con `spesa: true`, somma righe 963,78 €.
3. Rileggi anche gli altri due documenti dello stesso ordine AU276950 (ordine e fattura, stessa cartella) e 3 PDF
   ARTE di altre cartelle già letti bene: confronta righe e importi con la `lettura_grezza` salvata su
   `decobrands_db` (solo lettura). Nessun peggioramento ammesso; se uno peggiora, correggi il prompt e riprova.
4. Il comando **non scrive** su `decobrands_db`. Se serve un'opzione `--solo-stampa`, aggiungila.

File ammessi: `lettura.ts`, `lettore.ts`, `lettura-prova.ts`, `app/backend/test/lettura.spec.ts`.
Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md`. URL del db solo con grep; `.env` mai letto con
cat/readFileSync/grep della chiave (l'URL del db con grep va bene). Niente commit, 8001/8002, `cd`, `/tmp`, `&`,
Integra. Skill: `owasp-security`, `ponytail-review`, `caveman`.
Aggiorna il resoconto (sezione «Prova sul PDF vero»: tabella documento / righe prima / righe dopo / somma).
Riepilogo in 6 righe.
