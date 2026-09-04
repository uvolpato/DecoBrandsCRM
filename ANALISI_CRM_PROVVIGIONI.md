# Ordini a fornitore e provvigioni — analisi

## Gli obiettivi

Il progetto ha tre gambe:

1. **Tracciare in automatico** il percorso ordine → conferma d'ordine → fattura
2. **Controllare i bollettini trimestrali** che vi mandano i fornitori, verificando
   che le provvigioni riconosciute siano quelle giuste
3. **Liquidare le provvigioni ai subagenti** ogni trimestre

Il CRM che usate oggi copre **solo la terza**. La prima vive negli Excel che tieni tu,
la seconda si fa a mano o non si fa.

L'idea è di farle stare tutte e tre nello stesso posto, perché in realtà sono lo stesso
dato guardato da tre angolazioni.

---

## Le provvigioni vanno in due direzioni

Questa è la cosa che ho messo a fuoco solo alla fine, ed è quella che tiene insieme
tutto il progetto:

```
FORNITORE  ──provvigione agente──►  DECOBRANDS  ──provvigione subagente──►  SUBAGENTE
           (obiettivo 2: da controllare)        (obiettivo 3: da liquidare)
```

Sono **due flussi separati**, uno in entrata e uno in uscita. La bella notizia è che la
tabella delle provvigioni del CRM contiene già tutte e due le percentuali: quella
dell'agente è **quello che incassate**, quella del subagente è **quello che pagate**.

Quindi non serve inventare niente: lo stesso dato alimenta il controllo dei bollettini
e la liquidazione ai subagenti.

---

## Come funzionano le percentuali

Ogni fornitore ha una tabella a scaglioni: **più sconto fate al cliente, meno
provvigione prendete**. Per esempio, su Gries:

| Sconto | Provvigione agente | Provvigione subagenti | Eccezioni per singolo subagente |
|---|---|---|---|
| 0 % | 18 % | 10 % | Nista `0`, gli altri `–` |
| 1 % | 18 % | 0 % | Bastasin `3`, gli altri `0` |
| 5 % | 13 % | 7 % | `–` |
| 10 % | 5 % | 2 % | `–` |
| 100 % | 0 % | 0 % | `–` |

Ogni subagente ha una colonna tutta sua: dove c'è un valore, quello vince sulla
percentuale standard dello scaglione.

Le due percentuali sono **indipendenti**: il subagente non prende una fetta di quella
dell'agente, sono due conti separati sullo stesso importo merce. Ho verificato sul
rendiconto e torna sempre:

```
Importo merce 253,83 €          Importo merce 210,00 €
  Totale       11 %  = 27,92 €    Totale       20 %  = 42,00 €
  Agente        5 %  = 12,69 €    Agente        8 %  = 16,80 €
  Subagente     6 %  = 15,23 €    Subagente    12 %  = 25,20 €
  12,69 + 15,23 = 27,92 ✓         16,80 + 25,20 = 42,00 ✓
```

---

## Obiettivo 1 — Il tracciamento

### Come lo fai oggi

Tieni **un Excel per ogni fornitore** e lo aggiorni in tre momenti: scrivi l'ordine
appena arriva (numero, data, importo, agente), ci aggiungi la conferma quando torna dal
fornitore, poi il numero della fattura. Quando la riga è completa la porti nel CRM.

Funziona, ma sono gli stessi dati scritti due volte, e il processo vive in un file
fuori dal sistema.

### Come lo faremmo

Quella riga di Excel diventa una **pratica dentro l'applicazione**, che si completa da
sé man mano che arrivano i documenti:

1. Arriva l'**ordine** → carichi il documento, il sistema legge numero, data, importo,
   cliente e agente, e apre la pratica
2. Arriva la **conferma d'ordine** → la agganci alla pratica, che passa a *confermata*
3. Arriva la **fattura** → la pratica diventa *fatturata* ed entra nel calcolo delle
   provvigioni

La lettura automatica è la stessa che già usiamo per gli ordini cliente: il sistema
propone quello che ha letto, tu controlli e confermi. **Ogni documento resta allegato
alla pratica**, quindi lo storico è sempre lì.

Sono tutti PDF o Excel, e gli Excel si stampano comunque in PDF: la pipeline che li
legge esiste già, non partiamo da zero.

### Le conferme che non arrivano

Sull'anagrafica di ogni fornitore mettiamo i **giorni di attesa** (ognuno ha i suoi
tempi): passata la scadenza senza conferma, la pratica finisce in un elenco di
segnalazioni. Il sistema sa già quali sono ferme al passo 1, quindi l'avviso viene da sé.

---

## Obiettivo 2 — Il controllo dei bollettini

Questa è la parte che oggi non esiste da nessuna parte.

Ogni trimestre il fornitore vi manda un **bollettino** con le provvigioni che vi
riconosce. Voi dovete poter verificare che siano quelle giuste — cioè confrontarle con
quello che il sistema ha calcolato dalle fatture di quel periodo.

Il meccanismo che ho in mente:

1. **Importi il bollettino** del fornitore (stesso trattamento degli altri documenti:
   PDF o Excel, dati letti in automatico)
2. Il sistema **appaia riga per riga** quello che il fornitore riconosce con quello che
   ha calcolato lui
3. Tira fuori **l'elenco delle differenze**: fatture che il fornitore non ha
   conteggiato, importi diversi, percentuali applicate male

Il risultato è che invece di ricontrollare tutto a mano, guardi solo le righe che non
tornano.

Perché questo funzioni serve che la pratica dell'obiettivo 1 sia completa: è da lì che
esce il "quanto mi aspetto". I due obiettivi si reggono a vicenda.

---

## Obiettivo 3 — La liquidazione ai subagenti

Questa è la parte che il CRM già fa. Ogni trimestre si tira fuori, per subagente,
l'elenco delle fatture di competenza con la relativa provvigione, e si liquida.

Nel CRM il rendiconto si filtra per fornitore, subagente e periodo, e produce una riga
per fattura:

```
Fornitore · N° fattura · N° ordine · Data fattura · Data ordine · Cliente ·
Data pagamento · Importo merce · Competenze totale · Competenze agente ·
Competenze subagente
```

Questa parte la replichiamo così com'è, con una differenza: il **rendiconto lo
calcoliamo al volo dai dati** invece di congelarlo. Se correggi un importo o sistemi
una percentuale, i conti si riallineano da soli.

---

## Le conferme (risposte del cliente)

Fonte: Matteo Caironi (Sales Assistant). Le 12 domande aperte sono state chiuse.

**1. `–` e `0` nelle provvigioni.** La provvigione lavora in automatico anche in
negativo: `-120,00 €` è una **nota di credito** (importo negativo del documento) e la
provvigione è calcolata allo stesso modo in negativo (es. 10 % di -120,00 € = -12,00 €).
`0,00 €` sta ad indicare che **non c'è nessuna provvigione** per l'agente. Le eccezioni
per singolo subagente sono rarissime: tutti hanno la stessa provvigione, le eccezioni
si gestiscono a mano.

**2. Lo sconto / il riferimento cliente→fornitore.** Sul CRM di Woodoo ogni cliente
nella sua sezione fornitore viene collegato al **fornitore di riferimento** tramite un
**codice cliente** e lo **sconto**, se accordato. Sulla base di questo si crea la pagina
del cliente dove si possono inserire tutti i dati e avere tutti i riferimenti. Gli sconti
salvati nel CRM sono **fittizi**, usati solo per gestire una provvigione diversa: per
es. `1 %` indica un'eccezione del `3 %` su alcuni ordini di un cliente del subagente
Bastasin. Per quel determinato cliente le provvigioni non vengono riconosciute per ogni
ordine, ma **solo una fattura al mese**; poi lo si vede e lo si gestisce direttamente.

**3. Provvigione sul maturato o sul fatturato.** Ci sono fornitori che pagano sul
**maturato** (quando ricevono i pagamenti) e altri sul **fatturato** (sulle emissioni
delle fatture). Riconosciamo ai subagenti allo stesso modo: quelli sul maturato sul
maturato, quelli sul fatturato sul fatturato. **Si setta per fornitore** (informazione
del fornitore, con default) nella gestione.

**4. Dettaglio dei bollettini.** Si intendeva quello che riceviamo **dai fornitori**.
A volte un fornitore mette sulla stessa riga un solo cliente con il totale, ma **più
spesso riporta ogni documento del cliente su più linee**, come facciamo noi ai subagenti
per renderci più chiari su quello che riconosciamo loro.

**5. Quando un bollettino non torna.** Lo si **contesta al fornitore** e si attende il
suo riscontro. Se mancano provvigioni lo si comunica e si attende quello rettificato. Se
ci sono importi differenti, bisogna verificare se sono dovuti a **promozioni e/o
condizioni particolari** di determinati articoli. Finora si è sempre riconosciuto ai
subagenti la provvigione calcolata sull'**imponibile della fattura**. Va prevista la
possibilità di **modificare manualmente l'importo** una volta fatto il controllo, senza
che blocchi il tutto: se l'importo che ci è stato mandato è corretto, diamo noi l'ok e lo
confermiamo (stessa modalità di alert del portale quando ci sono articoli con cambio
codice: un alert, e noi confermiamo o modifichiamo).

**6. Trimestri / cadenze.** I trimestri per i **subagenti sono sempre uguali**: Gen-Mar;
Apr-Giu; Lug-Set; Ott-Dic. I **fornitori invece inviano i bollettini mensilmente**. Solo
uno fa come vuole ma a breve verrà rimosso e non collaboreremo più.

**7. La conferma d'ordine può cambiare.** Sì: il fornitore può confermare un totale
diverso rispetto a quello dell'ordine. Se un cliente ordina 10 articoli e solo 7 sono
disponibili e 3 sold out, verranno confermati **solo i 7 articoli disponibili**.

**8. Fattura multi-ordine / ordine multi-fattura.** Sì, può capitare che **una fattura
copra più ordini** e che **un ordine venga fatturato in più tranche** (capita spesso con
gli importatori: Gasper GmbH e Ing's Christmas Decor GmbH; ma anche direttamente se i
clienti tengono in back order gli articoli non disponibili e vengono poi spediti in un
secondo momento).

**9. Un cliente con più subagenti.** Un cliente **non può essere seguito da più subagenti
sullo stesso fornitore**, ma ci sono casi di clienti che hanno più subagenti **su diversi
fornitori**. Queste situazioni dovrà risolverle Marco per non avere incomprensioni interne.

**10. Gli agenti.** L'agente è **uno solo: Decobrands SRL**. Erano salvati tre perché
prima Marco aveva un socio, venuto a mancare 5 anni fa, e per differenziare i clienti su
determinate aziende erano stati inseriti sia Marco (Monzani) sia il suo socio
(Schwarzmeier). Ora hanno solo valore storico.

**11. Le percentuali cambiano nel tempo.** Sì, ma **raramente**. Se un fornitore rivede
le condizioni, le nuove valgono **dal periodo in cui vengono riviste**, mentre quelle
precedenti vanno rilette con le percentuali di allora. Le variazioni possono esserci
perché un cliente aumenta il fatturato e lo si vuole "premiare", o perché un cliente
non compra come deve e con sconti più alti viene ribassato, quindi cambia la provvigione
del subagente.

**12. Le segnalazioni.** Basta un **alert all'interno dell'applicazione** in modo che chi
ci lavora possa vederlo e correggere la situazione. **No all'invio di mail.**

---

### Dati di esportazione della liquidazione

Per la liquidazione ai subagenti i dati che devono venir esportati e apparire sono:

```
Fornitore · N° documento (fattura) · Data documento (fattura) ·
Codice cliente · Ragione sociale · Importo documento ·
Percentuale provvigione · Importo provvigionale
```

---

## Come lo mettiamo insieme

La base c'è già: clienti, articoli, giacenze, ordini e lettura automatica dei documenti
sono in piedi e funzionanti nella Gestione Ordini.

Si aggiungono i **fornitori** (con i loro giorni di attesa conferma e i loro scaglioni
di provvigione), gli **agenti** e i **subagenti**, e soprattutto la **pratica
dell'ordine a fornitore**: un'unica scheda che si porta dietro i tre documenti e
attraversa gli stati *inviato → confermato → fatturato*.

Sopra quella base stanno le due verifiche trimestrali: il **controllo dei bollettini**
in entrata e la **liquidazione ai subagenti** in uscita. Entrambe leggono gli stessi
dati, quindi non possono divergere.

Per ora **non replico la parte di CRM commerciale** — contatti, attività, gruppi,
settori. Non serve ai tre obiettivi e possiamo aggiungerla dopo con calma, se vi fa
comodo averla nello stesso posto.

---

Le risposte di Matteo sono integrate qui sopra: tutti i punti aperti ora hanno una
direzione chiara e possiamo partire.
