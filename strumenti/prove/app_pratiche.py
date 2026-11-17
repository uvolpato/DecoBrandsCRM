# Prova della pagina Pratiche dell'app (F2-A1), con Playwright: segmenti di stato con i numeri dal
# server, ricerca, filtro multiplo con riepilogo, ordinamento e paginazione sul server, ritorno dal
# dettaglio nello stesso punto, 768 px, operatore in sola consultazione.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper
# (password-di-prova, da utenti_prova.js crea <s>). Nel database di prova c'è il seed con 54 pratiche.
# Uso: python strumenti/prove/app_pratiche.py <suffisso> <cartella schermate> [base]
import sys, pathlib, re, time
from playwright.sync_api import sync_playwright
import segmenti as segm

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def numero(testo):
    return float(re.sub(r'[^\d,-]', '', testo).replace('.', '').replace(',', '.'))

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

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
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    def cerca(pg, t):
        pg.fill('.filtri input[type=search]', t); pg.wait_for_timeout(600)
        pg.wait_for_function("() => !document.querySelector('.dt[aria-busy=true]')"); pg.wait_for_timeout(600)
    def vai(pg, voce):
        pg.click('.barra a.voce:has-text("%s")' % voce); pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower()); pg.wait_for_load_state('networkidle')
    def totali_piede(pg):
        m = re.search(r'di (\d+) element', testo(pg, '.dt-piede > span:first-child'))
        return int(m.group(1)) if m else righe(pg)
    def importi(pg):
        return [numero(pg.locator('.dt tbody tr.cliccabile').nth(i).locator('td').nth(5).inner_text()) for i in range(righe(pg))]

    pg = entra(S + '-ammi')
    # 0.2.9: oltre allo Stato c'è il filtro Raggruppamento: i segmenti di stato sono il primo campo
    SEG = '.filtri > .filtro-slot:nth-child(1) '
    ok('Pratiche' in testo(pg, '.testa h1'), 'titolo della pagina')
    ok(segm.quanti(pg, SEG) == 6, 'sei segmenti di stato')
    n = segm.numero(pg, 'Tutte', SEG)
    stati = sum(segm.numero(pg, t, SEG) for t in ('Conferma in ritardo', 'Attesa conferma', 'Attesa fattura', 'Fatturate'))
    ok(n >= 40 and stati == n and segm.numero(pg, 'Con variazioni', SEG) <= n and totali_piede(pg) == n,
       'numeri dal server: %d pratiche = somma degli stati, %d con variazioni' % (n, segm.numero(pg, 'Con variazioni', SEG)))
    ok(righe(pg) == min(25, n) and 'di %d elementi' % n in testo(pg, '.dt-piede'), 'prima pagina: %d righe di %d' % (righe(pg), n))
    ok(pg.locator('.dt th:has-text("Ordine fornitore")').count() == 1, 'colonna «Ordine fornitore» (D-169)')
    pg.screenshot(path=str(USCITA / 'app-pratiche-1440.png'))

    # ricerca libera (numero, cliente, fornitore, documenti)
    numero0 = pg.locator('.dt tbody tr.cliccabile b').first.inner_text()
    cerca(pg, numero0)
    ok(1 <= righe(pg) <= n and numero0 in testo(pg, '.dt tbody'), 'ricerca «%s»: la pratica si trova' % numero0)
    cerca(pg, 'zzzz-nessuno'); ok(righe(pg) == 0 and totali_piede(pg) == 0, 'ricerca senza risultati: elenco vuoto')
    cerca(pg, '')

    # filtro multiplo per fornitore (D-22), riepilogo dei filtri e conteggi che seguono (D-23)
    fb = pg.locator('.filtri').first
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click(); fb.locator('.ricerca-menu li[role=option]', has_text='Gries').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(1200)
    n_g = segm.numero(pg, 'Tutte', SEG)
    ok(1 <= n_g < n and righe(pg) == min(25, n_g) and totali_piede(pg) == n_g and 'Gries' in (campo.get_attribute('placeholder') or ''),
       'filtro Gries: %d pratiche, numeri dei segmenti aggiornati' % n_g)
    pg.locator('.riepilogo-filtri .btn-icona').first.click(); pg.wait_for_timeout(200)
    ok('Gries' in testo(pg, '.riepilogo-pop'), 'riepilogo dei filtri: mostra Gries')
    pg.screenshot(path=str(USCITA / 'app-pratiche-filtro-1440.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('.riepilogo-filtri .btn-icona').nth(1).click()
    pg.wait_for_function("n => (document.querySelector('.dt-piede > span:first-child')?.textContent || '').includes('di ' + n + ' element')", arg=n, timeout=20000)
    ok(totali_piede(pg) == n, 'tolti i filtri dal riepilogo: tornano %d pratiche' % n)

    # ordinamento sul server: clic su Importo = crescente, secondo clic = decrescente
    pg.click('.dt th:has-text("Importo")')
    pg.wait_for_function("() => document.querySelector('.dt th.attivo')?.getAttribute('aria-sort') === 'ascending'")
    pg.wait_for_function("""() => { const v = [...document.querySelectorAll('.dt tbody tr.cliccabile')].map(r => Number((r.children[5]?.textContent || '').replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.'))); return v.length && v.every((x, i) => i === 0 || v[i-1] <= x); }""")
    ok(pg.locator('.dt th.attivo:has-text("Importo")').count() == 1 and importi(pg) == sorted(importi(pg)), 'ordinamento per importo crescente')
    pg.click('.dt th:has-text("Importo")')
    pg.wait_for_function("() => document.querySelector('.dt th.attivo')?.getAttribute('aria-sort') === 'descending'")
    pg.wait_for_function("""() => { const v = [...document.querySelectorAll('.dt tbody tr.cliccabile')].map(r => Number((r.children[5]?.textContent || '').replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.'))); return v.length && v.every((x, i) => i === 0 || v[i-1] >= x); }""")
    ok(importi(pg) == sorted(importi(pg), reverse=True), 'secondo clic: importo decrescente')

    # A7-04: intestazione ordinabile da tastiera (WCAG 2.1.1): fuoco sul pulsante, Invio ordina
    testa = pg.locator('.dt th:has-text("Importo") .dt-ordina')
    with pg.expect_request(lambda r: '/api/pratiche?' in r.url and 'ordina=importo' in r.url):
        testa.focus(); pg.keyboard.press('Enter')
    pg.wait_for_function("() => document.querySelector('.dt th.attivo')?.getAttribute('aria-sort') === 'ascending'")
    ok(pg.locator('.dt th.attivo:has-text("Importo")').count() == 1, 'intestazione da tastiera: Invio ordina per importo crescente')
    pg.keyboard.press('Enter')
    pg.wait_for_function("() => document.querySelector('.dt th.attivo')?.getAttribute('aria-sort') === 'descending'")
    ok(pg.locator('.dt th.attivo:has-text("Importo")').get_attribute('aria-sort') == 'descending',
       'intestazione da tastiera: secondo Invio, decrescente')
    prima_dec = pg.locator('.dt tbody tr.cliccabile b').first.inner_text()

    # pagina successiva, sempre sull'ordinamento scelto
    pg.click('.dt-pagine button[title="Pagina successiva"]')
    pg.wait_for_function("() => document.querySelector('.dt-piede > span')?.textContent.startsWith('26–')")
    inizio = testo(pg, '.dt-piede > span:first-child')
    ok(inizio.startswith('26–') and 'di %d elementi' % n in inizio and pg.locator('.dt tbody tr.cliccabile b').first.inner_text() != prima_dec,
       'pagina successiva: «%s»' % inizio)
    ok(pg.locator('.dt th.attivo:has-text("Importo")').get_attribute('aria-sort') == 'descending', 'la pagina successiva tiene l’ordinamento per importo')
    pg.screenshot(path=str(USCITA / 'app-pratiche-pagina-1440.png'))

    # ritorno dal dettaglio nello stesso punto: stessa pagina e stesso ordinamento
    url = pg.url
    pg.locator('.dt tbody tr.cliccabile').first.click(); pg.wait_for_function("/^\\/pratiche\\/\\d+/.test(location.pathname)"); pg.wait_for_selector('.binario')
    ok('/pratiche/' in pg.url and pg.locator('.binario .tappa').count() == 4, 'clic sulla riga: pagina della pratica (F2-A2)')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(900)
    ok(pg.url == url and testo(pg, '.dt-piede > span:first-child').startswith('26–'), 'indietro: stessa pagina dell’elenco')
    ok(pg.locator('.dt th.attivo:has-text("Importo")').get_attribute('aria-sort') == 'descending', 'indietro: stesso ordinamento')

    # A7-05: le righe si aprono da tastiera (WCAG 2.1.1): Tab fino a una riga, Invio apre la pratica
    pg.locator('.testa h1').click()  # il fuoco riparte dal principio della pagina
    raggiunta = False
    for _ in range(80):
        pg.keyboard.press('Tab')
        if pg.evaluate("() => !!document.activeElement?.matches('tr.cliccabile')"):
            raggiunta = True; break
    ok(raggiunta, 'Tab raggiunge una riga dell’elenco')
    pg.keyboard.press('Enter')
    pg.wait_for_function("/^\\/pratiche\\/\\d+/.test(location.pathname)"); pg.wait_for_selector('.binario')
    ok(re.search(r'/pratiche/\d+', pg.url) is not None, 'Invio su una riga: si apre la pratica')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(900)

    # 768 px
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(500)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    pg.screenshot(path=str(USCITA / 'app-pratiche-768.png'), full_page=True)
    pg.close()

    # operatore: legge l'elenco (provvigioni.consulta), nessun comando di modifica
    pg = entra(S + '-oper'); pg.wait_for_timeout(600)
    ok(righe(pg) >= 1 and segm.numero(pg, 'Tutte', SEG) == n, 'operatore: consulta l’elenco')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
