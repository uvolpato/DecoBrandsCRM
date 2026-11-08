# Screenshot delle pagine Soggetti e Clienti dell'app (verifica F1-A9) a 1440 px.
# Serve il frontend su http://127.0.0.1:8014 (BACKEND_URL=8013, decobrands_import) e l'utente import-ammi.
# next start (produzione) non ammette wait_for_function (CSP senza unsafe-eval): solo wait_for_url/selector.
import pathlib, sys
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8014'
USCITA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent
USCITA.mkdir(parents=True, exist_ok=True)
PW, UTENTE = 'Prova-Decobrands-2026', 'import-ammi'

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count():
            break
        pg.keyboard.press('Enter')
        pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(BASE + '/accesso')
    apri(pg)
    pg.fill('#c-utente', UTENTE)
    pg.fill('#c-password', PW)
    pg.click('button.btn.largo')
    pg.wait_for_selector('.barra', timeout=30000)  # dentro l'app (barra di navigazione)
    pg.wait_for_load_state('networkidle')
    # Soggetti
    pg.goto(BASE + '/soggetti')
    pg.wait_for_url('**/soggetti', timeout=30000)
    pg.wait_for_selector('.soggetti-filtri .dt tbody tr.cliccabile', timeout=30000)
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(USCITA / 'soggetti-1440.png'))
    # Clienti
    pg.goto(BASE + '/clienti')
    pg.wait_for_url('**/clienti', timeout=30000)
    pg.wait_for_selector('.dt tbody tr.cliccabile', timeout=30000)
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(USCITA / 'clienti-1440.png'))
    print('schermate:', [str(x) for x in (USCITA / 'soggetti-1440.png', USCITA / 'clienti-1440.png')])
    print('errori pagina:', err if err else 'nessuno')
    b.close()
