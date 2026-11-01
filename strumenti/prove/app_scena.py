# Prova della pagina di accesso dell'app (D-42, D-43), con Playwright: logo, apertura con un tasto o
# un clic, Esc e clic fuori, Password dimenticata nella stessa finestra, licenza, nessun lampo.
# Non entra e non scrive nel database. Serve il frontend (8001) acceso, con il backend.
# Uso: python strumenti/prove/app_scena.py <cartella schermate>
import sys, pathlib, urllib.request
from playwright.sync_api import sync_playwright

USCITA = pathlib.Path(sys.argv[1])
BASE = 'http://localhost:8001'
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

html = urllib.request.urlopen(BASE + '/accesso').read().decode('utf-8')
ok('accesso-scena' in html and 'Sistema Informativo Aziendale' in html, 'la scena arriva già nell’HTML del server (niente lampo)')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for w, h in ((1440, 900), (768, 1024)):
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        aperta = lambda: pg.locator('.accesso-scena.aperta').count() == 1
        pg.goto(BASE + '/accesso'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1000)
        sfondo = pg.evaluate("getComputedStyle(document.body).backgroundColor")
        ok(not aperta() and sfondo == 'rgb(33, 37, 41)', f'{w}: pagina scura, logo, finestra chiusa')
        pg.screenshot(path=str(USCITA / f'app-scena-{w}-logo.png'))
        pg.keyboard.press('F5'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(500)
        ok(not aperta(), f'{w}: F5 resta al browser')
        pg.keyboard.press('u'); pg.wait_for_timeout(300)
        ok(aperta() and pg.input_value('#c-utente') == 'u' and pg.evaluate('document.activeElement.id') == 'c-utente', f'{w}: un tasto apre, la lettera è nel primo campo')
        ok(pg.locator('.accesso .accesso-marchio').count() == 1, f'{w}: logo scuro in testa alla finestra')
        pg.screenshot(path=str(USCITA / f'app-scena-{w}-accedi.png'))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        ok(not aperta(), f'{w}: Esc torna al logo')
        pg.keyboard.press('b'); pg.wait_for_timeout(300)
        ok(pg.input_value('#c-utente') == 'b', f'{w}: riaperto, il modulo riparte vuoto (solo la nuova lettera)')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        pg.mouse.click(w // 2, 60); pg.wait_for_timeout(300)
        ok(aperta() and pg.evaluate('document.activeElement.id') == 'c-utente', f'{w}: un clic apre col focus nel primo campo')
        ok(pg.evaluate("(() => { const b = document.querySelector('.accesso button.btn.largo').getBoundingClientRect(); return !!document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2).closest('.accesso'); })()"), f'{w}: il pulsante si clicca (il logo non lo copre)')
        pg.mouse.click(5, 5); pg.wait_for_timeout(300)
        ok(not aperta(), f'{w}: un clic fuori torna al logo')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        pg.click('text=Password dimenticata?'); pg.wait_for_url('**/accesso/dimenticata'); pg.wait_for_timeout(300)
        ok(aperta() and pg.evaluate('document.activeElement.id') == 'c-email', f'{w}: Password dimenticata nella stessa finestra, già aperta')
        pg.keyboard.press('Escape'); pg.wait_for_function("location.pathname === '/accesso'"); pg.wait_for_timeout(300)
        ok(not aperta(), f'{w}: da Password dimenticata Esc torna al logo')
        pg.click('.accesso-licenza'); pg.wait_for_timeout(300)
        ok(pg.locator('.velo .licenza').count() == 1 and not aperta(), f'{w}: la licenza si apre, il modulo resta chiuso')
        pg.screenshot(path=str(USCITA / f'app-scena-{w}-licenza.png'))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        ok(pg.locator('.velo').count() == 0 and not aperta(), f'{w}: Esc chiude solo la licenza')
        pg.clock.install(); pg.goto(BASE + '/accesso'); pg.wait_for_load_state('networkidle')
        pg.keyboard.press('x'); pg.wait_for_timeout(300); pg.clock.run_for(60_000); pg.keyboard.press('y'); pg.clock.run_for(90_000)
        ok(aperta() and pg.input_value('#c-utente') == 'xy', f'{w}: chi scrive non viene chiuso (2 minuti senza toccare nulla)')
        pg.clock.run_for(31_000); pg.wait_for_timeout(300)
        ok(not aperta(), f'{w}: dopo 2 minuti fermi torna al logo')
        pg.keyboard.press('z'); pg.wait_for_timeout(300)
        ok(pg.input_value('#c-utente') == 'z', f'{w}: dopo i 2 minuti il modulo riparte vuoto')
        pg.goto(BASE + '/accesso/password/codice-di-prova'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(300)
        ok(aperta() and pg.evaluate('document.activeElement.id') == 'c-nuova', f'{w}: dal link dell’email la finestra è subito aperta')
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), f'{w}: niente scorrimento orizzontale')
        pg.close()
    b.close()

print('\n'.join(esiti))
if errori: print('errori nella pagina:', errori)
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
