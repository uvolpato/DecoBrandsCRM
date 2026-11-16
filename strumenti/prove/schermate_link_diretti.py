# Schermate della finestra dell'agenzia (FormAgenzia) a 1440 e 768 px, per il pacchetto link-diretti.
# Serve backend su 8012 (decobrands_test) e frontend su 8071. Utente <s>-ammi.
# Uso: python strumenti/prove/schermate_link_diretti.py <suffisso> <cartella schermate>
import pathlib, sys, time
from playwright.sync_api import sync_playwright

S = sys.argv[1]
USCITA = pathlib.Path(sys.argv[2])
BASE = 'http://localhost:8071'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count():
            break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for larghezza in (1440, 768):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.goto(BASE + '/clienti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/clienti')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        pg.click('button:has-text("Aggiungi agenzia")'); pg.wait_for_selector('.velo .modale')
        pg.wait_for_selector('.velo .campo-ricerca'); pg.wait_for_timeout(600)
        pg.screenshot(path=str(USCITA / ('agenzia-%d.png' % larghezza)))
        pg.close()
    b.close()
    print('schermate fatte in', USCITA)
