# Pacchetto `riferimenti-email`

## Contesto
Ugo (15/11/2026): nelle email ai fornitori (solleciti, e **tutte le altre** email che il CRM manda) devono
esserci soprattutto i **riferimenti che servono a chi riceve** per trovare e lavorare la richiesta.
Il numero della nostra pratica (OF/2026/003) al fornitore **non serve**: a lui servono i codici dei **suoi**
documenti (numero d'ordine che lui conosce, sue conferme/proforma, sue fatture, suo codice cliente), che noi
poi raggruppiamo nella pratica. Così il fornitore può rispondere citando i suoi riferimenti.

Esempio di oggi (da correggere):
```
Gentili colleghi di ARTE WOHNACCESSORIES GMBH & CO.KG,
non abbiamo ancora ricevuto la conferma del seguente ordine:
- OF/2026/003 del 11/03/2026 · Florovivaistica Manente Soc. Agr. Semplice (vostro codice 44464) · 963,78 € · attesa entro il 10/04/2026
Vi chiediamo di inviarcele appena possibile, indicando eventuali articoli non disponibili.
```

## Compito
1. **Censimento**: trova tutte le email generate (cerca in `app/backend/src/` testi «Gentili», «sollecit»,
   invio posta, modelli). Elenca nel resoconto: email, a chi, quando parte, riferimenti oggi presenti.
2. Per ognuna, metti in evidenza **i riferimenti del destinatario**:
   - sollecito conferma: numero/i d'ordine come li conosce il fornitore (es. AU278665; se la pratica ha più
     ordini, tutti), data dell'ordine, cliente con **suo** codice cliente, importo, attesa entro;
   - sollecito fattura: i suoi numeri di conferma/proforma (es. PR102920) e d'ordine, date, importi;
   - sollecito bollettino: mese e fornitore, come oggi, più eventuali suoi riferimenti;
   - pagamenti/incassi o altre: stesso criterio (numeri di fattura del fornitore, date, importi).
   Il nostro numero di pratica: al massimo in fondo alla riga come «nostro rif. OF/2026/003», mai come primo
   riferimento. Se il numero del fornitore manca (documento non ancora letto o ordine nostro senza suo
   numero), usa il nostro numero d'ordine con data e cliente, senza inventare.
3. Correggi anche la grammatica: singolare/plurale coerente col numero di voci («inviarcela» / «inviarcele»).
4. Tutto sul server (V12), dai dati del db.

Esempio atteso (indicativo):
```
- Ordine AU278665 del 11/03/2026 · Florovivaistica Manente Soc. Agr. Semplice (vostro codice cliente 44464) · 963,78 € · conferma attesa entro il 10/04/2026 · nostro rif. OF/2026/003
Vi chiediamo di inviarcela appena possibile, indicando eventuali articoli non disponibili.
```

## File ammessi
I file backend che compongono e mandano le email (e i loro test). **Non toccare** `motore/*`, `proposta.ts`,
`pratiche.ts`, `bollettini.ts`, `liquidazioni*` (pacchetto `sconto-medio` in corso): se un'email sta lì
dentro, scrivi la modifica nel resoconto e fermati. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12. Italiano corretto e cortese.
URL del db **solo con grep**, `.env` mai letto con readFileSync o cat. Prove su `decobrands_test_email_rif`
(creato e cancellato). **Nessuna email vera inviata.** Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra.
Skill: `owasp-security` (testi nelle email: niente dati di altri clienti), `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend; jest: sollecito conferma con un ordine e con due ordini (numeri del fornitore,
singolare/plurale, nostro rif. in fondo); ordine senza numero del fornitore → nostro numero con data.

## Resoconto
`strumenti/opencode/resoconto-riferimenti-email.md`: censimento, esempio prima/dopo per ogni email, file,
prove, email lasciate ad altri pacchetti, «Da documentare».
