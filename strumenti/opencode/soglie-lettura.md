# Soglie di affidabilità: dal server, 0,80 di partenza, livelli ricalcolati (13/11/2026)

**Esecutore: DeepSeek V4 pro** · decisione di Ugo sui documenti veri. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto**; mai `decobrands_db`, mai le porte 8001/8002). Scrivi subito `strumenti/opencode/resoconto-soglie-lettura.md`. Massimo 1 ora e mezza.

## Decisione di Ugo (13/11/2026) — D-151
Sui documenti veri i campi sopra l'80 % sono risultati tutti giusti: la soglia «Affidabile da» parte da **0,80** (era 0,90); «Affidabilità bassa sotto» resta **0,70**. Le soglie sono una regolazione delle Impostazioni (§7.15, superutente/amministratore come oggi) e valgono **ovunque** dal valore salvato.

## Da fare
1. **Valore di partenza 0,80**: `app/backend/src/impostazioni.ts` (~riga 129, `soglia_ok: 0.9` → `0.8`) e ovunque il default sia ripetuto (grep `soglia_ok`, `0.9` nel backend, nelle prove e nel seed solo se è il default delle impostazioni: il seed è vietato, se serve cambiarlo **fermati e scrivilo**).
2. **Niente soglie fisse nel browser (V12)**: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` ha `SOGLIA_OK = 0.9` e `SOGLIA_BASSA = 0.7` fisse. Il server deve mandare con il documento le soglie in vigore (o direttamente il livello di ogni campo: scegli la via più corta e coerente con §6.5) e la pagina le usa per colori, «%» e conteggio dei punti da controllare. Cerca con grep altre soglie fisse nel frontend.
3. **Livelli ricalcolati quando cambiano le soglie**: al salvataggio della sezione *Lettura* delle Impostazioni, se cambiano `soglia_ok` o `soglia_bassa`, si ricalcola `livello` dei documenti **non ancora abbinati né scartati** (`da_controllare`, `errore`) con le stesse funzioni di `salva` in `app/backend/src/lettura.ts`, **nella stessa transazione** del salvataggio (V13), con l'evento nel registro. I documenti già abbinati non si toccano.
4. **Guida** (`app/frontend/lib/guida.ts`, Impostazioni → Lettura, «da sapere»): una frase: le soglie valgono anche per i documenti ancora da controllare, che si riclassificano al salvataggio.

5. **«Aggiungi riga» in *Correggi i dati letti*** (`VistaDocumento.tsx` ~riga 836, richiesta di Ugo): dopo il clic la riga nuova si porta **in vista** (`scrollIntoView({ block: 'nearest' })`) e il **fuoco va sul suo primo campo**. Controlla con grep gli altri pulsanti che aggiungono una riga **dentro una tabella o un elenco modificabile** nella stessa pagina e fai lo stesso; quelli che aprono una finestra (Aggiungi agenzia, sede, recapito…) no, lì il fuoco va già nella finestra.

## Prove
- jest: `test/impostazioni.spec.ts` (default 0,80; ricalcolo dei livelli dei soli documenti da controllare; transazione), `test/lettura.spec.ts`, `test/documenti.spec.ts`, una per volta, su `decobrands_test_soglie` (creato e cancellato da te).
- `npx tsc --noEmit` backend e frontend.
- Prova nel browser: aggiorna `strumenti/prove/app_documenti.py` se controlla i colori o le soglie; lancia `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_impostazioni`, due volte, 0 KO.

## Documentazione (in questo pacchetto)
- `specifica-crm-provvigioni.md`: riga **D-151** nel §19 (6 colonne: D-151 | 13/11/2026 | decisione | perché: taratura sui documenti veri, sopra 0,80 tutti giusti; soglie solo dal server | Ugo (collaudo 13/11/2026) | §6.5, §7.15; `impostazioni.ts`, `VistaDocumento.tsx`, `lettura.ts`); in §6.5 e §7.15 i valori 0,80/0,70 e una riga *Perché (D-151)*; versione 8.80 → **8.81**. Controlla prima che D-151 sia libero (grep `| D-151 |`); se no, il primo libero.
- `python3 strumenti/genera-pagine-doc.py`.

## File ammessi
`app/backend/src/impostazioni.ts`, `app/backend/src/impostazioni-api.ts`, `app/backend/src/lettura.ts`, `app/backend/src/documenti.ts`, `app/backend/test/**`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (anche per il punto 5), `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, `strumenti/prove/app_impostazioni.py`, `specifica-crm-provvigioni.md`, `prototipo-crm/specifica.html` (solo rigenerata), il resoconto. Carica davvero `owasp-security` (impostazioni), `ponytail-review`, `caveman`.
