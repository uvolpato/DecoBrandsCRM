# Campo di ricerca: niente id e pallino rosso mentre carica (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P1 (fastidio visibile a ogni *Apri la pratica*).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, mai 8001/8002, Integra mai. Niente commit.

## Problema (Ugo)
Aprendo *Apri la pratica* (o tornando lì dopo *Configura* / *Aggiungi l'agenzia*) i campi Fornitore e Cliente mostrano per un attimo **numeri (gli id)** con il **pallino rosso**, poi dopo qualche istante il nome giusto e il pallino verde.
Causa probabile in `app/frontend/componenti/CampoRicerca.tsx`, `Singola`: `useState(valore)` mette l'id come testo e `stato = nota ? 'ok' : valore ? 'ko' : 'vuoto'` vale «ko» finché le voci (`useVoci`, 1858 clienti) non sono arrivate. Verifica.

## Cosa fare (una correzione nel componente condiviso, vale per tutte le ricerche)
- Finché le voci non sono caricate e c'è un valore: **niente id nel campo** e **niente pallino rosso**. Stato «in caricamento» (pallino grigio o sagoma nel campo, come D-59), oppure il nome se il chiamante lo conosce già (prop opzionale `nomeIniziale`, usata in *Apri la pratica* con i nomi che il documento già ha, e in `FormAgenzia`).
- Quando le voci arrivano: nome e pallino verde se trovato, rosso solo se davvero non c'è.
- Il testo del campo si allinea al nome quando arrivano le voci senza che l'utente abbia scritto (oggi resta l'id se `testo` è inizializzato una volta sola: controlla).
- Valuta se la cache delle voci (`useVoci`) si ricarica a ogni apertura della modale: se sì, tienila fra un'apertura e l'altra (stesso contesto) così il secondo ingresso è immediato.

## File ammessi
`app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/componenti/Campo.tsx`, `app/frontend/componenti/FormModal.tsx`, `app/frontend/componenti/FormAgenzia.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `strumenti/prove/app_documenti.py`, `strumenti/prove/app_componenti.py`, il resoconto `strumenti/opencode/resoconto-ricerca-numeri-rossi.md`.

## Fine
- `npx tsc --noEmit` nel frontend.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_componenti app_clienti` (timeout 10 min), 0 KO. Controllo nuovo: con la rotta delle voci rallentata (`page.route` con ritardo 1,5 s) il campo non mostra mai un numero né il pallino rosso. Limite di 10 accessi per utente (D-41).
- Carica davvero `ponytail-review`, `vercel-react-best-practices`, `caveman`.
