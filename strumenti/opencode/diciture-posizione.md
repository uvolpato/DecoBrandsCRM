# Pacchetto `diciture-posizione`

Ugo (15/11/2026): le scritte sulla posizione del campo promettono troppo; il riquadro non è sempre preciso.
In `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (~1302–1311):

| Oggi | Diventa |
|---|---|
| «Seleziona un campo per evidenziarlo sul documento.» | «Seleziona un campo per vedere dove è stato letto sul documento (indicativo).» |
| PDF: «Posizione: pagina N (esatta)» | «Pagina N · posizione indicativa» |
| PDF: «Posizione: pagina N (approssimata)» | «Pagina N · posizione approssimativa, controlla sul documento» |
| foto: «Posizione evidenziata (esatta)» | «Posizione indicativa» |
| foto: «Posizione evidenziata (approssimata)» | «Posizione approssimativa, controlla sul documento» |

Mai più la parola «esatta» nell'interfaccia. Il valore `precisione` del backend resta com'è (non toccarlo).
Allinea la riga «Posizione» in `app/frontend/lib/guida.ts:145`: il riquadro mostra dove la lettura ha trovato
il campo; è indicativo, può spostarsi di qualche riga; «approssimativa» quando la lettura è meno sicura.

File ammessi: solo questi due. Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md`. Niente
commit, `cd`, `/tmp`, `&`. Prove: `npx tsc --noEmit` frontend. Riepilogo in 4 righe, niente resoconto a parte.
