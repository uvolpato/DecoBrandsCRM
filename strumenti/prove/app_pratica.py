# Prova del dettaglio pratica dell'app (F2-A2, D-60), con Playwright: binario delle fasi, schede
# Riepilogo e Righe a confronto con l'avviso delle variazioni, documenti fiscali e altri documenti
# (ordini, conferme, proforma, pagamenti, allegati) con PDF affiancato, segno Pagato, registrazione
# a mano con la tendina del tipo, spostamento in un'altra pratica dello stesso fornitore, sola
# lettura per chi è in lettura, ritorno all'elenco nello stesso punto.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Nel database di prova c'è il seed con 54 pratiche:
# una è "Con variazioni"; una è "Attesa fattura" senza documenti fiscali.
# Uso: python strumenti/prove/app_pratica.py <suffisso> <cartella schermate> [base]
import sys, pathlib, re, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

# un PDF diverso a ogni giro e per ogni caricamento: il server rifiuta un file già arrivato (impronta)
marca = str(int(time.time() * 1000))
PDF = USCITA / ('prova-' + marca + '.pdf')
PDF.write_bytes(b'%PDF-1.4\n% prova ' + marca.encode() + b'\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')
PDF2 = USCITA / ('prova-2-' + marca + '.pdf')
PDF2.write_bytes(b'%PDF-1.4\n% prova ordine ' + marca.encode() + b'\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/pratiche'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/pratiche')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    seg = lambda pg, t: pg.locator('.segmenti [role=tab]:has-text("%s")' % t)
    scheda = lambda pg, t: pg.locator('.schede-barra [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    def apri_pratica(pg, riga=0):
        pg.locator('.dt tbody tr.cliccabile').nth(riga).click()
        pg.wait_for_function("/^\\/pratiche\\/\\d+/.test(location.pathname)")
        pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.binario')
    def pannello(pg, titolo):
        return pg.locator('.pannello').filter(has=pg.locator('h2', has_text=titolo)).first
    def pannello_esatto(pg, titolo):
        return pg.locator('.pannello').filter(has=pg.locator('h2', has_text=re.compile('^' + re.escape(titolo) + '$'))).first
    def cerca_e_apri(pg, numero):
        pg.goto(BASE + '/pratiche'); pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.dt tbody tr.cliccabile')
        pg.fill('.filtri input[aria-label="Cerca"]', numero)
        # la ricerca passa dal server: si aspetta che la prima riga sia quella cercata
        pg.wait_for_function("(n) => { const r = document.querySelector('.dt tbody tr.cliccabile'); return !!r && r.innerText.includes(n) }", arg=numero)
        pg.locator('.dt tbody tr.cliccabile').first.click()
        pg.wait_for_function("/^\\/pratiche\\/\\d+/.test(location.pathname)")
        pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.binario')
    def scegli_pratica(pg, numero):
        campo = pg.locator('.modale .campo-ricerca input.ricerca-testo')
        campo.fill(numero); pg.wait_for_timeout(600)
        pg.locator('.modale .ricerca-menu li[role=option]').filter(has_text=numero).first.click()
        pg.wait_for_timeout(300)
    def filtra(pg, etichetta, attesa):
        seg(pg, etichetta).click()
        # la lista arriva dal server: si aspetta la prima riga con lo stato che il filtro promette
        pg.wait_for_function("(t) => { const r = document.querySelector('.dt tbody tr.cliccabile'); return !!r && r.innerText.includes(t) }", arg=attesa)

    # --- amministratore: dettaglio di una pratica con variazioni ---
    pg = entra(S + '-ammi', 1440)
    filtra(pg, 'Con variazioni', 'variazioni fra le fasi')
    apri_pratica(pg)
    ok('/pratiche/' in pg.url and testo(pg, '.testa h1'), 'clic sulla riga: si apre la pratica')
    ok('Confermata' in testo(pg, '.testa .stato') or 'Fatturata' in testo(pg, '.testa .stato')
       or 'in ritardo' in testo(pg, '.testa .stato') or 'Attesa' in testo(pg, '.testa .stato'), 'testata: stato della pratica')
    fasi = pg.locator('.binario .tappa h3').all_inner_texts()
    ok(fasi == ['Ordine', 'Conferma', 'Fattura', 'Nota di credito'], 'binario: %s' % ' > '.join(fasi))
    ok(pg.locator('.binario .tappa.fatta').count() >= 2, 'binario: le fasi fatte hanno la spunta e il documento')
    ok(scheda(pg, 'Righe a confronto').get_attribute('aria-selected') == 'true', 'dall’elenco con Con variazioni si apre Righe a confronto (D-12)')
    tab_righe = scheda(pg, 'Righe a confronto').inner_text()
    n_var = int(re.search(r'(\d+) variazion', tab_righe).group(1))
    ok(n_var >= 1, 'titolo della scheda: «%s»' % tab_righe.replace('\n', ' '))
    righe_var = pg.locator('.dt tbody tr').count()
    ok(righe_var == n_var and pg.locator('.dt tbody tr.evidenzia').count() == n_var, 'solo le %d righe che cambiano, evidenziate' % n_var)
    ok(pg.locator('.dt thead th').count() >= 4, 'colonne del confronto: articolo, fasi e differenza')
    opz = pg.locator('.filtri .segmenti [role=tab]').all_inner_texts()
    ok(len(opz) == 2 and 'Solo righe che cambiano' in opz[0] and 'Tutte le righe' in opz[1], 'segmenti: %s' % ' · '.join(opz))
    pg.screenshot(path=str(USCITA / 'app-pratica-righe-1440.png'), full_page=True)
    pg.locator('.filtri .segmenti [role=tab]:has-text("Tutte le righe")').click(); pg.wait_for_timeout(400)
    tutte = pg.locator('.dt tbody tr').count()
    ok(tutte > righe_var, 'Tutte le righe: %d righe' % tutte)

    # Riepilogo: prima l'informazione aggregata, con l'avviso delle variazioni
    scheda(pg, 'Riepilogo').click(); pg.wait_for_timeout(400)
    ok(scheda(pg, 'Riepilogo').get_attribute('aria-selected') == 'true', 'si apre la scheda Riepilogo')
    ok('righe cambian' in testo(pg, '.avviso-variazioni') and 'totale' in testo(pg, '.avviso-variazioni'), 'avviso delle variazioni nel Riepilogo')
    ok(pannello(pg, 'Provvigione').locator('.cifre').count() == 1, 'Riepilogo: la provvigione calcolata dal server')
    ok('Da ' in testo(pg, '.cifre') and '%' in testo(pg, '.cifre'), 'provvigione: percentuali e quota a Decobrands')
    ok(pannello(pg, 'Documenti fiscali').locator('.elenco').count() == 1, 'Riepilogo: la card Documenti fiscali')
    pg.screenshot(path=str(USCITA / 'app-pratica-1440.png'), full_page=True)

    # "Vedi le righe" porta alla scheda del confronto
    pg.click('.avviso-variazioni button'); pg.wait_for_timeout(400)
    ok(scheda(pg, 'Righe a confronto').get_attribute('aria-selected') == 'true', 'Vedi le righe: si apre Righe a confronto')

    # F5-A1: testata con Prepara il sollecito quando la conferma è attesa o in ritardo
    pg.goto(BASE + '/pratiche'); pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.dt tbody tr.cliccabile')
    filtra(pg, 'Conferma in ritardo', 'in ritardo')
    apri_pratica(pg)
    ok(pg.locator('.testa-azioni button:has-text("Prepara il sollecito")').count() == 1, 'testata: Prepara il sollecito con la conferma in ritardo')
    pg.click('.testa-azioni button:has-text("Prepara il sollecito")'); pg.wait_for_selector('.modale')
    ok(testo(pg, '.modale h2') == 'Solleciti di conferma', 'si apre la finestra Solleciti di conferma')
    testo_conf = pg.locator('.testo-email').input_value()
    ok('Gentili colleghi di' in testo_conf and 'vostro codice' in testo_conf and 'attesa entro il' in testo_conf, 'testo per fornitore con codice e data attesa')
    pg.locator('.modale-piede button:has-text("Chiudi")').click(); pg.wait_for_timeout(300)

    # --- ritorno all'elenco nello stesso punto (filtro, ordinamento) ---
    pg.goto(BASE + '/pratiche'); pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.dt tbody tr.cliccabile')
    seg(pg, 'Con variazioni').click(); pg.wait_for_timeout(1200)
    pg.click('.dt th:has-text("Importo")'); pg.wait_for_timeout(1200)
    elenco_url = pg.url
    apri_pratica(pg); pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(900)
    ok(pg.url == elenco_url and seg(pg, 'Con variazioni').get_attribute('aria-selected') == 'true', 'indietro: stesso filtro di stato')
    ok(pg.locator('.dt th.attivo:has-text("Importo")').get_attribute('aria-sort') in ('ascending', 'descending'), 'indietro: stesso ordinamento')

    # --- fattura con PDF, nota di credito, annullamento ---
    filtra(pg, 'Attesa fattura', 'in attesa di fattura')
    apri_pratica(pg)
    ok('Confermata' in testo(pg, '.testa .stato'), 'pratica confermata: attesa la fattura')
    ok('Nessun documento fiscale' in pannello(pg, 'Documenti fiscali').inner_text(), 'nessun documento fiscale')
    numero_ft = 'FT-' + marca
    pg.click('button:has-text("Registra fattura")'); pg.wait_for_selector('.modale')
    ok(pg.locator('.modale h2').inner_text() == 'Registra la fattura', 'si apre la finestra della fattura')
    pg.fill('#c-numero', numero_ft); pg.fill('#c-importo', '1000')
    pg.set_input_files('.modale .caricamento input[type=file]', str(PDF)); pg.wait_for_timeout(300)
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1800)
    ok('Fatturata' in testo(pg, '.testa .stato'), 'registrata la fattura: la pratica passa a Fatturata')
    riga_ft = pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text=numero_ft)
    ok(riga_ft.count() == 1, 'la fattura %s è nella card' % numero_ft)
    ok('Netto 1.000,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'il netto è fatture - note di credito')
    ok(riga_ft.locator('button:has-text("PDF")').count() == 0, 'la riga non ha il pulsante PDF: si apre con il clic')

    # il PDF si apre dal clic sulla riga: stessa origine, application/pdf, byte del file caricato
    riga_ft.click(); pg.wait_for_selector('.affiancata object')
    src = pg.locator('.affiancata object').get_attribute('data')
    stato, tipo, inizio = pg.evaluate("async u => { const r = await fetch(u); const t = await r.text(); return [r.status, r.headers.get('content-type'), t.slice(0, 5)] }", src)
    ok(stato == 200 and tipo == 'application/pdf' and inizio == '%PDF-', 'PDF affiancato: %s, %s, inizia con %s' % (stato, tipo, inizio))
    ok(numero_ft in testo(pg, '.affiancata') and 'Importo' in testo(pg, '.affiancata'), 'accanto al PDF i dati del documento')
    pg.screenshot(path=str(USCITA / 'app-pratica-pdf-1440.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # --- F3-A3: riquadro Incasso del cliente, segnalazione e sollecito ---
    inc = pannello_esatto(pg, 'Incasso del cliente')
    ok(inc.count() == 1, 'Riepilogo: il riquadro Incasso del cliente')
    riga_inc = inc.locator('.incasso-riga', has_text=numero_ft)
    ok(riga_inc.count() == 1 and 'In attesa di incasso' in riga_inc.inner_text(), 'la fattura appena registrata è In attesa di incasso')
    riga_inc.locator('button:has-text("Segna come non pagata")').click(); pg.wait_for_selector('.modale')
    ok('non pagata' in testo(pg, '.modale h2'), 'si apre la finestra della segnalazione con la nota')
    pg.fill('#c-nota', 'email di prova del fornitore')
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1500)
    riga_inc = pannello_esatto(pg, 'Incasso del cliente').locator('.incasso-riga', has_text=numero_ft)
    ok('Non pagata' in riga_inc.inner_text() and 'email di prova del fornitore' in riga_inc.inner_text(), 'segnalazione: Non pagata con la nota')
    ok(riga_inc.locator('button:has-text("Segna come pagata")').count() == 1, 'con una segnalazione si può segnare come pagata')
    riga_inc.locator('button:has-text("Sollecita il cliente")').click(); pg.wait_for_selector('.modale')
    ok(testo(pg, '.modale h2') == 'Solleciti di pagamento', 'si apre la finestra dei solleciti su quel cliente')
    ok(numero_ft in pg.locator('.testo-email').input_value(), 'il testo del sollecito contiene la fattura')
    pg.locator('.modale-piede button:has-text("Copia il testo")').click(); pg.wait_for_timeout(1200)
    ok('copiato' in testo(pg, '.avviso'), 'copia del sollecito')
    pg.locator('.modale-piede button:has-text("Chiudi")').click(); pg.wait_for_timeout(2200)
    riga_inc = pannello_esatto(pg, 'Incasso del cliente').locator('.incasso-riga', has_text=numero_ft)
    ok('sollecitata 1 volta' in riga_inc.inner_text(), 'il sollecito resta sulla fattura (quante volte)')
    riga_inc.locator('button:has-text("Segna come pagata")').click(); pg.wait_for_timeout(1500)
    riga_inc = pannello_esatto(pg, 'Incasso del cliente').locator('.incasso-riga', has_text=numero_ft)
    ok('Pagata' in riga_inc.inner_text(), 'segna come pagata: la fattura passa a Pagata')
    pg.screenshot(path=str(USCITA / 'app-pratica-incasso-1440.png'), full_page=True)

    # nota di credito oltre il residuo: errore del server nella finestra, che resta aperta
    pg.click('button:has-text("Nota di credito")'); pg.wait_for_selector('.modale')
    ok(pg.locator('.modale h2').inner_text() == 'Registra la nota di credito', 'si apre la finestra della nota di credito')
    pg.fill('#c-numero', 'NC-' + marca); pg.fill('#c-importo', '5000')
    pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('supera la fattura' in testo(pg, '.modulo-errore'), 'nota oltre il residuo: errore visibile «%s»' % testo(pg, '.modulo-errore')[:60])
    ok(pg.locator('.velo').count() == 1, 'la finestra resta aperta per correggere')
    pg.fill('#c-importo', '100'); pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1500)
    riga_nc = pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='NC-' + marca)
    ok(riga_nc.count() == 1 and '-100,00' in riga_nc.inner_text(), 'nota di credito: importo negativo nella card')
    ok('Netto 900,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'netto aggiornato: 900,00')

    # annullamento: prima la nota di credito, poi la fattura (che rimette il file in coda)
    riga_nc.locator('button:has-text("Annulla")').click(); pg.wait_for_selector('.velo')
    ok('Annullare la nota di credito' in testo(pg, '.modale h2'), 'conferma dell’annullamento')
    pg.click('.modale-piede button.pericolo')
    pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='NC-' + marca).wait_for(state='detached', timeout=20000)
    ok(pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='NC-' + marca).count() == 0, 'annullata la nota di credito')
    ok('Netto 1.000,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'netto tornato a 1.000,00')
    pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text=numero_ft).locator('button:has-text("Annulla")').click()
    pg.wait_for_selector('.velo'); pg.click('.modale-piede button.pericolo')
    pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text=numero_ft).wait_for(state='detached', timeout=20000)
    pg.wait_for_timeout(600)
    ok('Confermata' in testo(pg, '.testa .stato'), 'annullata la fattura: la pratica torna Confermata')
    ok('Nessun documento fiscale' in pannello(pg, 'Documenti fiscali').inner_text(), 'nessun documento fiscale dopo l’annullamento')

    # --- D-60: il segno Pagato con i documenti di pagamento (nessun effetto sul netto) ---
    ok(pannello_esatto(pg, 'Pagamento del cliente').count() == 0, 'senza pagamenti: nessun segno Pagato')
    pg.click('button:has-text("Registra un documento")'); pg.wait_for_selector('.modale')
    ok(testo(pg, '.modale h2') == 'Registra un documento', 'si apre la finestra del documento con la tendina del tipo')
    pg.select_option('#c-tipo', 'pagamento')
    pg.fill('#c-numero', 'PROVA-PAG-' + marca); pg.fill('#c-importo', '250')
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1800)
    pagato = pannello_esatto(pg, 'Pagamento del cliente')
    ok(pagato.count() == 1 and 'Pagato' in pagato.inner_text(), 'registrato il pagamento: compare il segno Pagato')
    ok(pagato.locator('.stato.s-ok').count() == 1, 'il segno Pagato è verde')
    ok(pagato.locator('.elenco li', has_text='PROVA-PAG-' + marca).count() == 1, 'accanto al segno il documento di pagamento (numero e data)')
    ok('Netto 0,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'il pagamento non cambia il netto')
    ok(pannello_esatto(pg, 'Documenti').locator('.elenco li', has_text='PROVA-PAG-' + marca).count() == 1, 'il pagamento è fra i Documenti')
    pg.screenshot(path=str(USCITA / 'app-pratica-d60-1440.png'), full_page=True)

    # 768 px: niente scorrimento orizzontale, binario e pannelli leggibili
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    ok(pg.locator('.binario .tappa').count() == 4, '768 px: il binario resta leggibile')
    ok(pannello_esatto(pg, 'Pagamento del cliente').count() == 1, '768 px: il segno Pagato resta visibile')
    pg.screenshot(path=str(USCITA / 'app-pratica-d60-768.png'), full_page=True)
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(400)

    # --- A5-02 (D-78, V12): il confronto della finestra è quello calcolato dal server ---
    # una pratica senza variazioni (ordine = conferma = fattura): la finestra mostra tutte le righe,
    # che coincidono con la risposta di GET /documenti/:did/confronto (il browser non ricalcola nulla)
    cerca_e_apri(pg, 'OF/2026/038')
    pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='F-2026-0907').click()
    pg.wait_for_selector('.affiancata .dt tbody tr')
    n_server = pg.evaluate("""async () => {
      const pid = location.pathname.split('/').pop();
      const d = await (await fetch('/api/pratiche/' + pid + '/documenti')).json();
      const docs = [...d.altri, ...d.documenti];
      const cur = docs.find((x) => x.numero === 'F-2026-0907');
      const rif = docs.find((x) => x.numero === 'C-2026/0981');
      const c = await (await fetch('/api/pratiche/' + pid + '/documenti/' + cur.id + '/confronto?rif=' + rif.id)).json();
      return c.righe.length;
    }""")
    ok(pg.locator('.affiancata .dt tbody tr').count() == n_server,
       'finestra: le righe a confronto sono quelle del server (%d)' % n_server)
    ok('nessuna' in testo(pg, '.affiancata'), 'nessuna variazione: la differenza della finestra è quella del server')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # --- D-60: proforma al posto della conferma e più ordini nello stesso binario ---
    cerca_e_apri(pg, 'OF/2026/041')
    ok(pg.locator('.binario .tappa').nth(1).locator('h3').inner_text() == 'Conferma', 'prima della proforma: la fase è Conferma')
    pg.click('button:has-text("Registra un documento")'); pg.wait_for_selector('.modale')
    pg.select_option('#c-tipo', 'proforma')
    pg.fill('#c-numero', 'PROVA-PRO-' + marca); pg.fill('#c-importo', '500')
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1800)
    ok(pg.locator('.binario .tappa').nth(1).locator('h3').inner_text() == 'Proforma', 'senza conferma il binario mostra la Proforma')
    ok('fatta' in (pg.locator('.binario .tappa').nth(1).get_attribute('class') or ''), 'la fase Proforma è fra quelle fatte')
    ok(pannello_esatto(pg, 'Documenti').locator('.elenco li', has_text='PROVA-PRO-' + marca).count() == 1, 'la proforma è fra i Documenti')

    pg.click('button:has-text("Registra un documento")'); pg.wait_for_selector('.modale')
    pg.select_option('#c-tipo', 'ordine')
    pg.fill('#c-numero', 'PROVA-OF-' + marca)
    pg.set_input_files('.modale .caricamento input[type=file]', str(PDF2)); pg.wait_for_timeout(300)
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(2000)
    ok(pg.locator('.binario .tappa').first.locator('h3').inner_text() == 'Ordini', 'con più ordini la fase diventa Ordini')
    numeri = pg.locator('.binario .tappa').first.locator('.numeri span').all_inner_texts()
    ok(len(numeri) == 2, 'più ordini: i due numeri affiancati (%s)' % ' + '.join(numeri))
    riga_ord = pannello_esatto(pg, 'Documenti').locator('.elenco li', has_text='PROVA-OF-' + marca)
    ok(riga_ord.count() == 1 and riga_ord.locator('button:has-text("PDF")').count() == 0, 'il secondo ordine non ha il pulsante PDF: si apre con il clic')
    riga_ord.click(); pg.wait_for_selector('.affiancata object')
    ok('Ordine' in testo(pg, '.affiancata .aff-schede'), 'il visualizzatore mostra la scheda del documento ordine')
    src_ord = pg.locator('.affiancata object').get_attribute('data')
    stato_o, tipo_o = pg.evaluate("async u => { const r = await fetch(u); return [r.status, r.headers.get('content-type')] }", src_ord)
    ok(stato_o == 200 and tipo_o == 'application/pdf', 'PDF di un ordine nel visualizzatore: %s, %s' % (stato_o, tipo_o))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # --- D-60: fatturata senza conferma: Conferma — Non arrivata ---
    cerca_e_apri(pg, 'OF/2026/047')
    pg.click('button:has-text("Registra fattura")'); pg.wait_for_selector('.modale')
    pg.fill('#c-numero', 'PROVA-FT-' + marca); pg.fill('#c-importo', '800')
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1800)
    tappa_conf = pg.locator('.binario .tappa').nth(1)
    ok('Non arrivata' in tappa_conf.inner_text() and 'assente' in (tappa_conf.get_attribute('class') or ''),
       'fatturata senza conferma: la fase dice Non arrivata')
    pg.evaluate("document.querySelector('.corpo').scrollTop = 9999"); pg.wait_for_timeout(400)
    pg.screenshot(path=str(USCITA / 'app-pratica-documenti-1440.png'))
    pg.evaluate("document.querySelector('.corpo').scrollTop = 0"); pg.wait_for_timeout(200)

    # --- D-60: spostamento di un documento in un'altra pratica dello stesso fornitore ---
    riga_ft2 = pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='PROVA-FT-' + marca)
    riga_ft2.locator('button:has-text("Sposta")').click(); pg.wait_for_selector('.modale')
    ok(testo(pg, '.modale h2').startswith('Sposta'), 'si apre la finestra Sposta')
    campo = pg.locator('.modale .campo-ricerca input.ricerca-testo')
    campo.fill('OF/2026/042'); pg.wait_for_timeout(500)
    ok(pg.locator('.modale .ricerca-menu .nessuna').count() == 1, 'il campo dello Sposta non offre pratiche di un altro fornitore')
    scegli_pratica(pg, 'OF/2026/041')
    ok(pg.locator('.modale-piede button[type=submit]').is_enabled(), 'scelta la pratica di arrivo, Sposta si abilita')
    pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null")
    pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='PROVA-FT-' + marca).wait_for(state='detached', timeout=20000)
    pg.wait_for_timeout(600)
    ok(pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='PROVA-FT-' + marca).count() == 0, 'la fattura è uscita da questa pratica')
    ok('Fatturata' not in testo(pg, '.testa .stato'), 'tolta la fattura, la pratica torna alla fase prima («%s»)' % testo(pg, '.testa .stato'))
    cerca_e_apri(pg, 'OF/2026/041')
    ok(pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='PROVA-FT-' + marca).count() == 1, 'la fattura è nella pratica di arrivo')

    # --- D-60: il 409 del server (l'unico ordine della pratica) si legge nella finestra ---
    cerca_e_apri(pg, 'OF/2026/047')
    pannello_esatto(pg, 'Documenti').locator('.elenco li', has_text='OF/2026/047').first.locator('button:has-text("Sposta")').click()
    pg.wait_for_selector('.modale')
    scegli_pratica(pg, 'OF/2026/041')
    pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('unico ordine' in testo(pg, '.modulo-errore'), 'il 409 del server resta nella finestra: «%s»' % testo(pg, '.modulo-errore')[:70])
    ok(pg.locator('.velo').count() == 1, 'la finestra resta aperta dopo il rifiuto')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # il server rifiuta anche la pratica di un altro fornitore (oggi 400, non 409: vedi resoconto)
    pid = pg.url.rstrip('/').split('/')[-1]
    stato_a, msg_a = pg.evaluate("""async (pid) => {
      const io = await (await fetch('/api/accesso/io')).json();
      const d = await (await fetch('/api/pratiche/' + pid + '/documenti')).json();
      const ord = d.altri.find((x) => x.tipo === 'ordine');
      const altre = await (await fetch('/api/pratiche?fornitori=2&perPagina=1')).json();
      const r = await fetch('/api/pratiche/' + pid + '/documenti/' + ord.id + '/sposta', { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': io.csrf }, body: JSON.stringify({ pratica_id: Number(altre.righe[0].id) }) });
      return [r.status, (await r.json()).message];
    }""", pid)
    ok(stato_a == 400 and 'altro fornitore' in msg_a, 'pratica di un altro fornitore rifiutata dal server (%s: %s)' % (stato_a, msg_a))

    # la fattura spostata si annulla dalla pratica di arrivo (pulizia del giro di prova)
    cerca_e_apri(pg, 'OF/2026/041')
    pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='PROVA-FT-' + marca).locator('button:has-text("Annulla")').click()
    pg.wait_for_selector('.velo'); pg.click('.modale-piede button.pericolo')
    riga_ann = pannello(pg, 'Documenti fiscali').locator('.elenco li', has_text='PROVA-FT-' + marca)
    riga_ann.wait_for(state='detached', timeout=20000)
    ok(riga_ann.count() == 0, 'annullata la fattura spostata')

    # pulizia: i documenti creati dal giro di prova si tolgono dalle pratiche (stesse regole dell’annullamento)
    tolti = pg.evaluate("""async () => {
      const io = await (await fetch('/api/accesso/io')).json();
      const el = await (await fetch('/api/pratiche?q=PROVA-&perPagina=200')).json();
      const fatti = [];
      for (const p of el.righe) {
        const d = await (await fetch('/api/pratiche/' + p.id + '/documenti')).json();
        for (const x of [...d.altri, ...d.documenti]) {
          if (!String(x.numero).startsWith('PROVA-')) continue;
          const r = await fetch('/api/pratiche/' + p.id + '/documenti/' + x.id, { method: 'DELETE',
            headers: { 'content-type': 'application/json', 'x-csrf-token': io.csrf }, body: JSON.stringify({ note: null }) });
          fatti.push([x.tipo, x.numero, r.status]);
        }
      }
      return fatti;
    }""")
    ok(all(t[2] == 204 for t in tolti), 'pulizia dei documenti di prova: %s' % tolti)
    pg.close()

    # lettura: consulta la pratica, nessun comando di scrittura (l'operatore invece modifica, D-45)
    pg = entra(S + '-lett', 1440)
    filtra(pg, 'Con variazioni', 'variazioni fra le fasi')
    apri_pratica(pg)
    testi = ' '.join(pg.locator('button, a.btn').all_inner_texts())
    ok('Registra fattura' not in testi and 'Nota di credito' not in testi and 'Correggi' not in testi and 'Annulla' not in testi,
       'lettura: nessun pulsante di scrittura')
    ok(pg.locator('.incasso-riga button:has-text("Segna come")').count() == 0 and pg.locator('.incasso-riga button:has-text("Sollecita")').count() == 0,
       'lettura: nessun comando nel riquadro Incasso del cliente')
    ok(pg.locator('.binario .tappa').count() == 4 and scheda(pg, 'Riepilogo').count() == 1, 'lettura: binario, schede e provvigione in consultazione')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
