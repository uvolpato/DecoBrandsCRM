# Prova della pagina Analisi dell'app (F4-A5), con Playwright: i 4 numeri e i 4 grafici, il periodo con le
# frecce e la durata, i filtri multipli con il riepilogo, le voci dei campi (D-23), il filtro incrociato da
# una barra e da una riga, i raggruppamenti della tabella, l'esportazione Excel, CSV e PDF, le sagome (D-59), il
# ritorno nello stesso punto (§7.12), la sola lettura e i 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Nel database di prova c'è il seed.
# Uso: python strumenti/prove/app_analisi.py <suffisso> <cartella schermate> [base]
import sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8101'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    def apri(pg):
        pg.wait_for_selector('.accesso-scena')
        if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
        pg.wait_for_selector('.accesso-scena.aperta')

    def entra(utente, larghezza=1440, attese=None):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        if attese: pg.route('**/api/analisi?*', attese)
        pg.goto(BASE + '/analisi'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/analisi')")
        return pg

    testo = lambda pg, s: pg.locator(s).first.inner_text()
    kpi = lambda pg: [x.replace('\xa0', ' ') for x in pg.locator('.kpi .kpi-valore').all_inner_texts()]
    campi = lambda pg: pg.locator('.barra-analisi .filtro-ricerca .ricerca-testo')
    campo_nome = lambda pg, i: campi(pg).nth(i).get_attribute('placeholder') or ''
    periodo = lambda pg: testo(pg, '.periodo-btn')
    seg = lambda pg, t: pg.locator('.barra-analisi .segmenti [role=tab]:has-text("%s")' % t)
    tab = lambda pg, t: pg.locator('.pannello-bi .segmenti [role=tab]:has-text("%s")' % t)
    righe = lambda pg: pg.locator('.pannello-bi .dt tbody tr')
    def quieta(pg):
        pg.wait_for_function("() => document.querySelector('.kpi .kpi-valore') && !document.querySelector('.in-aggiornamento') && !document.querySelector('.dt[aria-busy=true]')")
    def clic_ciambella(pg):
        grafico = pg.locator('.griglia-bi .pannello').nth(1).locator('canvas')
        grafico.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        c = grafico.bounding_box()
        raggio = min(c['width'], c['height'] - 60) / 2 * 0.45
        pg.mouse.click(c['x'] + c['width'] / 2 + raggio, c['y'] + (c['height'] - 60) / 2)
    def scarica(pg, formato):
        pg.click('.testa-azioni button:has-text("Esporta")')
        pg.wait_for_selector('.velo .formato-esporta')
        if formato != 'xlsx': pg.locator('.velo .formato-esporta [role=radio]', has_text=formato.upper()).click()
        with pg.expect_download(timeout=180000) as attesa:  # il PDF passa da LibreOffice
            pg.click('.velo .modale-piede button:has-text("Scarica")')
        return attesa.value

    pg = entra(S + '-ammi')
    pg.wait_for_selector('.kpi .kpi-valore')
    quieta(pg)
    ok('Analisi' in testo(pg, '.testa h1'), 'titolo della pagina')
    ok(len(kpi(pg)) == 4, 'quattro numeri')
    ok(kpi(pg)[:4] == ['79.534,06 €', '12.976,26 €', '4.127,34 €', '8.848,92 €'], 'i 4 numeri del periodo di 12 mesi')
    ok('+333%' in testo(pg, '.kpi-riga'), 'confronto con il periodo precedente')
    ok(pg.locator('.griglia-bi .pannello').count() == 4, 'quattro grafici')
    ok(pg.locator('.griglia-bi canvas').count() == 4, 'i grafici sono disegnati')
    ok(righe(pg).count() == 4, 'tabella per subagente: 4 righe')
    ok(pg.locator('.pannello-bi .segmenti [role=tab]').count() == 5, 'cinque raggruppamenti')
    ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '1440 px: nessuno scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'app-analisi-1440.png'))

    # periodo: frecce di un mese e durata di 3/6/12 mesi, sempre dentro i mesi con dati
    ok(periodo(pg) == 'ott 2025 → set 2026', 'periodo predefinito: ultimi 12 mesi con dati')
    pg.click('.sposta-periodo button[title="Sposta il periodo di un mese indietro"]')
    pg.wait_for_function("document.querySelector('.periodo-btn').textContent.includes('set 2025 → ago 2026')"); quieta(pg)
    ok(periodo(pg) == 'set 2025 → ago 2026', 'freccia indietro: periodo di un mese')
    pg.click('.sposta-periodo button[title="Sposta il periodo di un mese avanti"]')
    pg.wait_for_function("document.querySelector('.periodo-btn').textContent.includes('ott 2025 → set 2026')"); quieta(pg)
    ok(periodo(pg) == 'ott 2025 → set 2026', 'freccia avanti: torna al periodo di prima')

    seg(pg, '6 mesi').click()
    pg.wait_for_function("document.querySelector('.periodo-btn').textContent.includes('apr 2026 → set 2026')"); quieta(pg)
    ok(periodo(pg) == 'apr 2026 → set 2026' and kpi(pg)[0] == '70.081,86 €', 'durata 6 mesi: finisce nello stesso mese')
    seg(pg, '12 mesi').click()
    pg.wait_for_function("document.querySelector('.periodo-btn').textContent.includes('ott 2025 → set 2026')"); quieta(pg)

    # filtri multipli (D-22): due fornitori, il campo mostra "Filtro multiplo (2)"
    campi(pg).nth(0).click()
    pg.locator('.barra-analisi .ricerca-menu li[role=option]', has_text='Gries').first.click()
    pg.locator('.barra-analisi .ricerca-menu li[role=option]', has_text='Gasper').first.click()
    pg.keyboard.press('Escape')
    pg.wait_for_function("document.querySelector('.kpi .kpi-valore').textContent.includes('68.836,26')"); quieta(pg)
    ok(campo_nome(pg, 0) == 'Filtro multiplo (2)' and kpi(pg)[0] == '68.836,26 €', 'filtro multiplo: due fornitori, numeri ricalcolati')

    # voci dei campi (D-23): il menu dei clienti propone solo quelli di Gries e Gasper
    campi(pg).nth(2).click()
    voci = pg.locator('.barra-analisi .ricerca-menu:not([hidden]) li[role=option]')
    testo_voci = pg.locator('.barra-analisi .ricerca-menu:not([hidden])').inner_text()
    ok(voci.count() == 6 and 'Garden Store Brianza' not in testo_voci, 'voci dei clienti: solo quelli dei fornitori scelti (D-23)')
    pg.keyboard.press('Escape')

    # riepilogo dei filtri con il periodo, poi "Togli tutti i filtri"
    pg.locator('.riepilogo-filtri .btn-icona').first.click()
    pop = testo(pg, '.riepilogo-pop')
    ok('Gries' in pop and 'Gasper' in pop and 'ottobre 2025' in pop, 'riepilogo dei filtri: periodo e fornitori')
    pg.keyboard.press('Escape')
    pg.locator('.riepilogo-filtri .btn-icona').nth(1).click()
    pg.wait_for_function("document.querySelector('.kpi .kpi-valore').textContent.includes('79.534,06')"); quieta(pg)
    ok(kpi(pg)[0] == '79.534,06 €' and campo_nome(pg, 0) == 'Tutti i fornitori', 'togli tutti i filtri: tornano i numeri')

    # filtro incrociato da una riga: subagente, poi di nuovo per toglierlo
    prima = righe(pg).first.inner_text().split('\n')[0]
    righe(pg).first.click()
    pg.wait_for_function("() => document.querySelectorAll('.barra-analisi .filtro-ricerca .ricerca-testo')[1].placeholder !== 'Tutti i subagenti'"); quieta(pg)
    ok(campo_nome(pg, 1) != 'Tutti i subagenti' and righe(pg).count() == 1, 'filtro incrociato dalla riga (%s): %s' % (prima, campo_nome(pg, 1)))
    righe(pg).first.click()
    pg.wait_for_function("() => document.querySelectorAll('.barra-analisi .filtro-ricerca .ricerca-testo')[1].placeholder === 'Tutti i subagenti'"); quieta(pg)
    ok(campo_nome(pg, 1) == 'Tutti i subagenti' and righe(pg).count() == 4, 'di nuovo sulla riga: filtro tolto')

    # filtro incrociato da una barra: la ciambella dei fornitori (la fetta più grande è Gries)
    clic_ciambella(pg)
    pg.wait_for_function("document.querySelector('.barra-analisi .filtro-ricerca .ricerca-testo').placeholder === 'Gries GmbH & Co. KG'"); quieta(pg)
    ok(campo_nome(pg, 0) == 'Gries GmbH & Co. KG' and kpi(pg)[0] == '41.093,76 €', 'filtro incrociato dalla barra: Gries')
    clic_ciambella(pg)
    pg.wait_for_function("document.querySelector('.barra-analisi .filtro-ricerca .ricerca-testo').placeholder === 'Tutti i fornitori'"); quieta(pg)
    ok(campo_nome(pg, 0) == 'Tutti i fornitori' and kpi(pg)[0] == '79.534,06 €', 'di nuovo sulla barra: filtro tolto')

    # raggruppamenti della tabella
    tab(pg, 'Per fornitore').click()
    pg.wait_for_function("document.querySelectorAll('.pannello-bi .dt tbody tr').length === 8"); quieta(pg)
    ok('Fornitore' in testo(pg, '.pannello-bi .dt thead'), 'raggruppamento per fornitore: 8 righe')
    tab(pg, 'Per cliente').click()
    pg.wait_for_function("document.querySelectorAll('.pannello-bi .dt tbody tr').length === 7"); quieta(pg)
    ok('Cliente' in testo(pg, '.pannello-bi .dt thead'), 'raggruppamento per cliente: 7 righe')
    tab(pg, 'Per mese').click()
    pg.wait_for_function("document.querySelectorAll('.pannello-bi .dt tbody tr').length === 8"); quieta(pg)
    ok('Mese' in testo(pg, '.pannello-bi .dt thead'), 'raggruppamento per mese: 8 mesi con documenti')
    tab(pg, 'Documenti').click()
    pg.wait_for_function("document.querySelectorAll('.pannello-bi .dt tbody tr').length === 21"); quieta(pg)
    ok(pg.locator('.pannello-bi .dt tbody tr a').count() == 21, 'documenti: 21 righe con il collegamento alla pratica')
    pg.screenshot(path=str(USCITA / 'app-analisi-documenti-1440.png'))

    # esportazione: Excel e CSV, file scaricati
    xlsx = scarica(pg, 'xlsx')
    ok(xlsx.suggested_filename == 'Analisi_2025-10_2026-09.xlsx' and xlsx.path().stat().st_size > 1000, 'Excel scaricato: %s' % xlsx.suggested_filename)
    csv = scarica(pg, 'csv')
    testo_csv = pathlib.Path(csv.path()).read_text(encoding='utf-8-sig')
    ok(csv.suggested_filename == 'Analisi_2025-10_2026-09.csv' and testo_csv.startswith('Data;Documento;Tipo;Fornitore;'),
       'CSV scaricato: intestazioni')
    ok(len([r for r in testo_csv.strip().splitlines() if r]) == 22, 'CSV: 21 documenti e l’intestazione')
    pdf = scarica(pg, 'pdf')
    ok(pdf.suggested_filename == 'Analisi_2025-10_2026-09.pdf' and pathlib.Path(pdf.path()).read_bytes()[:5] == b'%PDF-',
       'PDF scaricato: %s' % pdf.suggested_filename)
    ok(not pg.locator('.velo').count(), 'finestra di esportazione chiusa')

    # ritorno alla pagina nello stesso punto (§7.12): periodo, filtro e raggruppamento ricordati
    tab(pg, 'Per fornitore').click(); quieta(pg)
    campi(pg).nth(0).click()
    pg.locator('.barra-analisi .ricerca-menu li[role=option]', has_text='Gasper').first.click()
    pg.keyboard.press('Escape'); quieta(pg)
    prima_di = (periodo(pg), campo_nome(pg, 0))
    pg.click('.barra a.voce:has-text("Pratiche")'); pg.wait_for_url('**/pratiche')
    pg.click('.barra a.voce:has-text("Analisi")'); pg.wait_for_url('**/analisi'); pg.wait_for_selector('.kpi .kpi-valore'); quieta(pg)
    ok((periodo(pg), campo_nome(pg, 0)) == prima_di and tab(pg, 'Per fornitore').get_attribute('aria-selected') == 'true',
       'ritorno: periodo, filtro e raggruppamento come li avevi lasciati')

    # 768 px: la pagina non scorre di lato
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '768 px: nessuno scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'app-analisi-768.png'), full_page=True)
    pg.close()

    # sagome durante il caricamento (D-59): il server risponde dopo mezzo secondo
    def ritarda(route):
        time.sleep(0.6); route.continue_()
    pg = entra(S + '-oper', attese=ritarda)
    pg.wait_for_selector('.sagoma')
    ok(pg.locator('.sagoma').count() > 0 and pg.locator('.kpi .kpi-valore').count() == 0, 'sagome durante il caricamento')
    pg.wait_for_selector('.kpi .kpi-valore'); quieta(pg)
    ok(pg.locator('.sagoma').count() == 0 and len(kpi(pg)) == 4, 'dati arrivati: sagome sparite')
    pg.close()

    # sola lettura: consulta ed esporta
    pg = entra(S + '-lett')
    pg.wait_for_selector('.kpi .kpi-valore'); quieta(pg)
    ok(len(kpi(pg)) == 4 and pg.locator('.testa-azioni button:has-text("Esporta")').count() == 1, 'sola lettura: analisi e pulsante Esporta')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
