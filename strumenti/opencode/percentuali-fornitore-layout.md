# Pacchetto `percentuali-fornitore-layout`

## Contesto
Pagina **Fornitori**, scheda di un fornitore (`app/frontend/app/(app)/fornitori/VistaFornitori.tsx`), scheda
**Percentuali** (tabella scaglioni: Sconto, Dal fornitore, di cui al subagente, Margine Decobrands, Clienti, azioni).
Richiesta di Ugo (16/11/2026), con schermata:
1. il testo lungo sotto la tabella (`<Nota>Dal fornitore = % che il fornitore riconosce …`, circa riga 348) va tolto
   dalla pagina e messo in una **finestra di informazioni** che si apre con un **pulsante a icona «informazioni»** (componente `Informazioni`, vedi sotto) in alto a
   destra della scheda Percentuali (sulla riga delle schede o in testa al pannello, allineato a destra);
2. la tabella **non deve avere la barra di scorrimento orizzontale**: le colonne stanno nella larghezza (testi brevi,
   larghezze in %, numeri allineati a destra); controlla a 1440 e a 768 px;
3. la tabella occupa lo spazio disponibile con **intestazione fissa** e **scorrono solo le righe** (non la pagina né
   l'intero pannello), come le altre DataTable (CLAUDE.md §3).

4. Stessa cosa nella pagina del **soggetto**, scheda **Ruoli** (`app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`): il
   testo sotto la tabella («Il ruolo si chiude nella sua pagina (attivo = false) …») va nella finestra di informazioni,
   con il pulsante a icona in alto a destra **accanto** ad «Aggiungi ruolo».

## Come
- Crea **un solo componente riutilizzabile** `Informazioni` (pulsante a icona «info» che apre una `Modale` col titolo e
  il contenuto passati come figli) in `componenti/Piccoli.tsx` (o file proprio se Piccoli non è adatto), e aggiungilo al
  catalogo `app/frontend/app/(app)/componenti/page.tsx`. Se in `Icona.tsx` manca l'icona «info» (cerchio con la i),
  aggiungila nello stesso stile delle altre. Il pulsante ha `aria-label` e `title` dati dalla prop (es. «Informazioni
  sulle percentuali»). Usalo nei due punti di questo pacchetto; le altre `<Nota>` dell'app **non** toccarle.
- Il testo delle finestre è lo stesso di oggi, diviso in punti brevi (Dal fornitore, di cui al subagente, Margine
  Decobrands, Clienti, Date di validità e chiusure).
- Se il problema della barra orizzontale o dello scorrimento sta nella `DataTable` o in `stile.css` e vale per tutte le
  tabelle, **non** cambiarlo globalmente: scrivilo nei dubbi e correggi solo in questa vista (classe propria; prima
  controlla con grep su `stile.css` che il nome non esista già).
- Aggiorna `strumenti/regole-interfaccia.md` con la regola: «spiegazioni lunghe sotto una tabella → pulsante
  informazioni (icona) in alto a destra che apre una finestra; tabelle senza scorrimento orizzontale, scorrono solo le
  righe» e `app/frontend/lib/guida.ts` (pagina Fornitori) con il pulsante nuovo.

## File ammessi
`app/frontend/app/(app)/fornitori/VistaFornitori.tsx`, `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`,
`app/frontend/componenti/Icona.tsx` (solo l'icona), `app/frontend/componenti/Piccoli.tsx` (o un file nuovo per
`Informazioni`), `app/frontend/app/(app)/componenti/page.tsx`,
`app/frontend/app/stile/stile.css` (solo classi nuove per questa vista), `app/frontend/lib/guida.ts`,
`strumenti/regole-interfaccia.md`. Nient'altro.
Attenzione: `VistaFornitori.tsx` e `guida.ts` sono appena stati toccati dal pacchetto `raggruppamento-scaglioni`
(campo «Raggruppamento»): **non toglierne niente**.

## Prove
`npx tsc --noEmit` nel frontend, 0 errori. Le schermate le fa Claude Code.

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano semplice. Codice minimo. Niente commit,
porte 8001/8002, `cd`, `/tmp`, `&`, `.env`. Skill da caricare con lo strumento `skill`: `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-percentuali-fornitore-layout.md`: file toccati, cosa è cambiato, dubbi. Riepilogo in
massimo 10 righe.
