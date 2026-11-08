# Verifica del numero dell'Analisi con due fornitori (app_analisi.py riga 95): legge pagina e API.
# Uso: python <questo> <suffisso> [base]
import json, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8001'
PW = 'password-di-prova'
def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.goto(BASE + '/analisi?dal=2025-10&al=2026-09'); pg.wait_for_function("location.pathname === '/accesso'")
    apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
    pg.wait_for_selector('.kpi .kpi-valore'); pg.wait_for_timeout(1500)
    print('periodo', pg.locator('.periodo-btn').inner_text())
    print('kpi', [x.replace('\xa0', ' ') for x in pg.locator('.kpi .kpi-valore').all_inner_texts()])
    print('api 12m', json.dumps(pg.evaluate("async () => (await (await fetch('/api/analisi?dal=2025-10&al=2026-09')).json()).numeri")))
    campi = pg.locator('.barra-analisi .filtro-ricerca .ricerca-testo')
    campi.nth(0).click()
    for nome in ('Gries', 'Gasper'):
        pg.locator('.barra-analisi .ricerca-menu li[role=option]', has_text=nome).first.click()
    pg.keyboard.press('Escape'); pg.wait_for_timeout(2000)
    print('campi', campi.nth(0).get_attribute('placeholder'))
    print('kpi 2 fornitori', [x.replace('\xa0', ' ') for x in pg.locator('.kpi .kpi-valore').all_inner_texts()])
    print('url', pg.evaluate('location.search'))
    print('api 2 fornitori', json.dumps(pg.evaluate("async () => (await (await fetch('/api/analisi?dal=2025-10&al=2026-09&fornitori=1,2')).json()).numeri")))
    pg.screenshot(path='C:/Users/uvolp/AppData/Local/Temp/opencode/f7/schermate/analisi-due-fornitori.png')
    b.close()
