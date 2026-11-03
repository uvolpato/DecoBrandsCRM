# Prova del dettaglio pratica dell'app (F2-A2), con Playwright: binario delle fasi, schede Riepilogo
# e Righe a confronto con l'avviso delle variazioni, card Documenti fiscali con fattura, nota di
# credito e PDF affiancato, sola lettura per chi è in lettura, ritorno all'elenco nello stesso punto.
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
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

# un PDF diverso a ogni giro: il server rifiuta un file già arrivato (impronta)
marca = str(int(time.time() * 1000))
PDF = USCITA / ('prova-' + marca + '.pdf')
PDF.write_bytes(b'%PDF-1.4\n% prova ' + marca.encode() + b'\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')

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

    # --- amministratore: dettaglio di una pratica con variazioni ---
    pg = entra(S + '-ammi', 1440)
    seg(pg, 'Con variazioni').click(); pg.wait_for_timeout(1200)
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
    ok(pannello(pg, 'Documenti fiscali').locator('.dt').count() == 1, 'Riepilogo: la card Documenti fiscali')
    pg.screenshot(path=str(USCITA / 'app-pratica-1440.png'), full_page=True)

    # "Vedi le righe" porta alla scheda del confronto
    pg.click('.avviso-variazioni button'); pg.wait_for_timeout(400)
    ok(scheda(pg, 'Righe a confronto').get_attribute('aria-selected') == 'true', 'Vedi le righe: si apre Righe a confronto')

    # --- ritorno all'elenco nello stesso punto (filtro, ordinamento) ---
    pg.goto(BASE + '/pratiche'); pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.dt tbody tr.cliccabile')
    seg(pg, 'Con variazioni').click(); pg.wait_for_timeout(1200)
    pg.click('.dt th:has-text("Importo")'); pg.wait_for_timeout(1200)
    elenco_url = pg.url
    apri_pratica(pg); pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(900)
    ok(pg.url == elenco_url and seg(pg, 'Con variazioni').get_attribute('aria-selected') == 'true', 'indietro: stesso filtro di stato')
    ok(pg.locator('.dt th.attivo:has-text("Importo")').get_attribute('aria-sort') in ('ascending', 'descending'), 'indietro: stesso ordinamento')

    # --- fattura con PDF, nota di credito, annullamento ---
    seg(pg, 'Attesa fattura').click(); pg.wait_for_timeout(1200)
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
    riga_ft = pannello(pg, 'Documenti fiscali').locator('.dt tbody tr', has_text=numero_ft)
    ok(riga_ft.count() == 1, 'la fattura %s è nella card' % numero_ft)
    ok('Netto 1.000,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'il netto è fatture - note di credito')
    ok(riga_ft.locator('button:has-text("PDF")').count() == 1, 'la fattura ha il PDF')

    # il PDF si apre: stessa origine, application/pdf, byte del file caricato
    riga_ft.locator('button:has-text("PDF")').click(); pg.wait_for_selector('.modale object')
    src = pg.locator('.modale object').get_attribute('data')
    stato, tipo, inizio = pg.evaluate("async u => { const r = await fetch(u); const t = await r.text(); return [r.status, r.headers.get('content-type'), t.slice(0, 5)] }", src)
    ok(stato == 200 and tipo == 'application/pdf' and inizio == '%PDF-', 'PDF affiancato: %s, %s, inizia con %s' % (stato, tipo, inizio))
    ok(numero_ft in testo(pg, '.modale') and 'Importo' in testo(pg, '.modale'), 'accanto al PDF i dati del documento')
    pg.screenshot(path=str(USCITA / 'app-pratica-pdf-1440.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # nota di credito oltre il residuo: errore del server nella finestra, che resta aperta
    pg.click('button:has-text("Nota di credito")'); pg.wait_for_selector('.modale')
    ok(pg.locator('.modale h2').inner_text() == 'Registra la nota di credito', 'si apre la finestra della nota di credito')
    pg.fill('#c-numero', 'NC-' + marca); pg.fill('#c-importo', '5000')
    pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('supera la fattura' in testo(pg, '.modulo-errore'), 'nota oltre il residuo: errore visibile «%s»' % testo(pg, '.modulo-errore')[:60])
    ok(pg.locator('.velo').count() == 1, 'la finestra resta aperta per correggere')
    pg.fill('#c-importo', '100'); pg.click('.modale-piede button[type=submit]')
    pg.wait_for_function("document.querySelector('.velo') === null"); pg.wait_for_timeout(1500)
    riga_nc = pannello(pg, 'Documenti fiscali').locator('.dt tbody tr', has_text='NC-' + marca)
    ok(riga_nc.count() == 1 and '-100,00' in riga_nc.inner_text(), 'nota di credito: importo negativo nella card')
    ok('Netto 900,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'netto aggiornato: 900,00')

    # annullamento: prima la nota di credito, poi la fattura (che rimette il file in coda)
    riga_nc.locator('button:has-text("Annulla")').click(); pg.wait_for_selector('.velo')
    ok('Annullare la nota di credito' in testo(pg, '.modale h2'), 'conferma dell’annullamento')
    pg.click('.modale-piede button.pericolo'); pg.wait_for_timeout(1500)
    ok(pannello(pg, 'Documenti fiscali').locator('.dt tbody tr', has_text='NC-' + marca).count() == 0, 'annullata la nota di credito')
    ok('Netto 1.000,00' in pannello(pg, 'Documenti fiscali').inner_text(), 'netto tornato a 1.000,00')
    pannello(pg, 'Documenti fiscali').locator('.dt tbody tr', has_text=numero_ft).locator('button:has-text("Annulla")').click()
    pg.wait_for_selector('.velo'); pg.click('.modale-piede button.pericolo'); pg.wait_for_timeout(1800)
    ok('Confermata' in testo(pg, '.testa .stato'), 'annullata la fattura: la pratica torna Confermata')
    ok('Nessun documento fiscale' in pannello(pg, 'Documenti fiscali').inner_text(), 'nessun documento fiscale dopo l’annullamento')

    # 768 px: niente scorrimento orizzontale, binario leggibile
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    ok(pg.locator('.binario .tappa').count() == 4, '768 px: il binario resta leggibile')
    pg.screenshot(path=str(USCITA / 'app-pratica-768.png'), full_page=True)
    pg.close()

    # lettura: consulta la pratica, nessun comando di scrittura (l'operatore invece modifica, D-45)
    pg = entra(S + '-lett', 1440)
    seg(pg, 'Con variazioni').click(); pg.wait_for_timeout(1200)
    apri_pratica(pg)
    testi = ' '.join(pg.locator('button, a.btn').all_inner_texts())
    ok('Registra fattura' not in testi and 'Nota di credito' not in testi and 'Correggi' not in testi and 'Annulla' not in testi,
       'lettura: nessun pulsante di scrittura')
    ok(pg.locator('.binario .tappa').count() == 4 and scheda(pg, 'Riepilogo').count() == 1, 'lettura: binario, schede e provvigione in consultazione')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
