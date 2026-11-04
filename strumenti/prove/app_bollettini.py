# Prova della pagina Bollettini dell'app (F3-A1), con Playwright: matrice fornitore × 6 mesi, periodo,
# filtro multiplo con riepilogo, conteggi dei segmenti, caricamento del PDF, doppione, clic sulla cella
# che porta al dettaglio, ritorno nello stesso punto, sola lettura e 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper,
# <s>-lett (password-di-prova, da utenti_prova.js crea <s>). Nel database di prova c'è il seed.
# Uso: python strumenti/prove/app_bollettini.py <suffisso> <cartella schermate> [base]
import sys, pathlib, re
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8021'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/bollettini'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/bollettini')")
        pg.wait_for_selector('.matrice .m-cella')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    seg = lambda pg, t: pg.locator('.segmenti [role=tab]:has-text("%s")' % t)
    nseg = lambda pg, t: int(seg(pg, t).locator('.n').inner_text())
    righe_m = lambda pg: pg.locator('.matrice .m-riga').count()
    celle_max = lambda pg: pg.locator('.matrice .m-cella').count()
    righe_f = lambda pg: pg.locator('.matrice a.m-cella, .matrice .m-cella').count()
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    def periodo(pg): return testo(pg, '.periodo-btn')
    def indice_riga(pg, nome):
        righe = pg.locator('.matrice .m-riga')
        for i in range(righe.count()):
            if nome in righe.nth(i).inner_text(): return i
        return -1
    def cella(pg, riga, colonna):
        return pg.locator('.matrice .m-cella').nth(riga * 6 + colonna)
    def carica(pg, fornitore, mese, anno, pdf, conferma=True):
        pg.click('button:has-text("Carica un bollettino")')
        pg.wait_for_selector('.velo form#carica-bollettino')
        pg.locator('.velo .ricerca .ricerca-testo').first.fill(fornitore)
        pg.wait_for_timeout(700)
        pg.locator('.velo .ricerca .ricerca-testo').first.press('Enter')
        pg.wait_for_timeout(200)
        pg.select_option('#c-mese', str(mese)); pg.select_option('#c-anno', str(anno))
        pg.set_input_files('.velo input[type=file]', {'name': 'bollettino.pdf', 'mimeType': 'application/pdf', 'buffer': pdf})
        if conferma: pg.click('.velo .modale-piede button:has-text("Carica")')

    pg = entra(S + '-ammi')
    ok('Bollettini' in testo(pg, '.testa h1'), 'titolo della pagina')
    ok(righe_m(pg) == 10 and celle_max(pg) == 60, 'matrice: 10 fornitori x 6 mesi')
    ok(pg.locator('.matrice .m-intest').count() == 7, 'intestazione: fornitore + 6 mesi')
    ok('Tutti' in testo(pg, '.segmenti') and nseg(pg, 'Tutti') == 10, 'segmento Tutti: 10 fornitori')
    ok(cella(pg, indice_riga(pg, 'Gasper'), 3).inner_text().startswith('Non arrivato'), 'cella senza bollettino passato il giorno: Non arrivato')
    pg.screenshot(path=str(USCITA / 'app-bollettini-1440.png'))

    # segmento "Con qualcosa da fare": le righe sono quelle del numero sul segmento (D-23)
    da_fare = nseg(pg, 'Con qualcosa da fare')
    seg(pg, 'Con qualcosa da fare').click()
    pg.wait_for_function("n => document.querySelectorAll('.matrice .m-riga').length === n", arg=da_fare)
    ok(righe_m(pg) == da_fare and nseg(pg, 'Tutti') == 10, 'vista Da fare: %d fornitori, i numeri non cambiano' % da_fare)
    seg(pg, 'Tutti').click(); pg.wait_for_function("document.querySelectorAll('.matrice .m-riga').length === 10")
    ok(righe_m(pg) == 10, 'vista Tutti: tornano 10 fornitori')

    # filtro multiplo (D-22), riepilogo dei filtri e conteggi che seguono
    fb = pg.locator('.barra-periodo')
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click()
    fb.locator('.ricerca-menu li[role=option]', has_text='Gries').first.click()
    fb.locator('.ricerca-menu li[role=option]', has_text='Gasper').first.click()
    pg.keyboard.press('Escape')
    pg.wait_for_function("document.querySelectorAll('.matrice .m-riga').length === 2")
    ok(righe_m(pg) == 2 and nseg(pg, 'Tutti') == 2 and 'Filtro multiplo (2)' in (campo.get_attribute('placeholder') or ''), 'filtro multiplo: 2 fornitori, numeri aggiornati')
    pg.locator('.riepilogo-filtri .btn-icona').first.click(); pg.wait_for_timeout(200)
    ok('Gries' in testo(pg, '.riepilogo-pop') and 'Gasper' in testo(pg, '.riepilogo-pop'), 'riepilogo dei filtri: Gries e Gasper')
    pg.screenshot(path=str(USCITA / 'app-bollettini-filtro-1440.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('.riepilogo-filtri .btn-icona').nth(1).click()
    pg.wait_for_function("document.querySelectorAll('.matrice .m-riga').length === 10")
    ok(righe_m(pg) == 10, 'tolti i filtri dal riepilogo: tornano 10 fornitori')

    # periodo: selettore a mesi (D-16), sempre 6 colonne; le frecce spostano di un mese
    pg.click('.periodo-btn'); pg.wait_for_selector('.pm-mesi')
    ok(pg.locator('.pm-mesi button').count() == 12, 'selettore del periodo: 12 mesi')
    pg.locator('.pm-mesi button', has_text='mag').first.click(); pg.wait_for_timeout(900)
    ok(periodo(pg) == 'mag 2026 → ott 2026' and pg.locator('.matrice .m-intest').count() == 7, 'periodo scelto: ancora 6 mesi')
    pg.click('.sposta-periodo button[title="Sposta il periodo di un mese avanti"]'); pg.wait_for_timeout(900)
    ok(periodo(pg) == 'giu 2026 → nov 2026', 'freccia avanti: periodo spostato di un mese')

    # cella con il bollettino → dettaglio (segnaposto F3-A2) e ritorno nello stesso punto
    campo.click(); fb.locator('.ricerca-menu li[role=option]', has_text='Gries').first.click(); pg.keyboard.press('Escape')
    pg.wait_for_function("document.querySelectorAll('.matrice .m-riga').length === 1")
    prima_di = (periodo(pg), righe_m(pg))
    href = pg.locator('.matrice a.m-cella').first.get_attribute('href')
    pg.locator('.matrice a.m-cella').first.click()
    pg.wait_for_function("/^\\/bollettini\\/\\d+/.test(location.pathname)")
    pg.wait_for_selector('.cerniera')
    ok(pg.locator('.cerniera').count() == 1 and pg.locator('.barra-decisione').count() == 1, 'cella con bollettino: pagina del dettaglio (F3-A2)')
    pg.go_back(); pg.wait_for_selector('.matrice .m-cella')
    pg.wait_for_function("document.querySelectorAll('.matrice .m-riga').length === 1")
    ok((periodo(pg), righe_m(pg)) == prima_di, 'indietro: stesso periodo e filtro Gries')
    pg.locator('.riepilogo-filtri .btn-icona').nth(1).click(); pg.wait_for_timeout(900)

    # caricamento del bollettino con PDF, poi doppione come errore nella finestra
    riga_ing = indice_riga(pg, "Ing's")
    ok('Nessuna fattura' in cella(pg, riga_ing, 3).inner_text(), 'prima del caricamento: settembre senza bollettino')
    carica(pg, "Ing's", 9, 2026, b'%PDF-1.4\n% bollettino di prova\n%%EOF\n')
    pg.wait_for_selector('.avviso'); pg.wait_for_timeout(1200)
    ok('caricato' in testo(pg, '.avviso'), 'caricamento: avviso di conferma')
    riga_ing = indice_riga(pg, "Ing's")
    ok('Arrivato' in cella(pg, riga_ing, 3).inner_text(), 'dopo il caricamento: cella Arrivato con il totale')
    pg.screenshot(path=str(USCITA / 'app-bollettini-caricato-1440.png'))

    carica(pg, "Ing's", 9, 2026, b'%PDF-1.4\n% un altro bollettino\n%%EOF\n')
    pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok("c'è già" in testo(pg, '.modulo-errore'), 'doppione: errore chiaro nella finestra')
    pg.click('.velo .modale-piede button:has-text("Annulla")'); pg.wait_for_timeout(400)

    # 768 px: la pagina non scorre, la matrice sì (le 6 colonne restano raggiungibili)
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(500)
    scorre = pg.evaluate("(() => { const m = document.querySelector('.matrice'); return m.scrollWidth > m.clientWidth; })()")
    ok(not sovr(pg) and scorre, '768 px: la matrice scorre di lato, la pagina no')
    pg.screenshot(path=str(USCITA / 'app-bollettini-768.png'), full_page=True)
    pg.close()

    # sola lettura: consulta la matrice, niente pulsante di caricamento
    pg = entra(S + '-lett'); pg.wait_for_timeout(500)
    ok(righe_m(pg) == 10 and pg.locator('button:has-text("Carica un bollettino")').count() == 0, 'sola lettura: matrice senza pulsanti di modifica')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
