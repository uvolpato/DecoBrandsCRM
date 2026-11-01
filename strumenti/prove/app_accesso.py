# Prova dell'accesso nell'app vera (passo 1.10), con Playwright.
# Servono backend (8002, con la posta nel log) e frontend (8001) accesi. Uso (da app/backend):
#   node ../../strumenti/prove/utenti_prova.js crea s1     (fra gli altri, s1-nuovo con password provvisoria)
#   python ../../strumenti/prove/app_accesso.py password-di-prova <file di log del backend> <cartella schermate> s1-nuovo
#   node ../../strumenti/prove/utenti_prova.js togli
import re, sys, time, pathlib
from playwright.sync_api import sync_playwright

PROVVISORIA, LOG, USCITA, U = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), sys.argv[4]
BASE = 'http://localhost:8001'
esiti, errori = [], []
# D-42: su Accedi e Password dimenticata prima c'è il logo; un tasto apre la finestra
def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def link_dal_log(dopo):
    for _ in range(40):
        testo = LOG.read_bytes()[dopo:].decode('utf-8', errors='ignore')
        m = re.findall(r'/accesso/password/([\w-]{43})', testo)
        if m: return m[-1]
        time.sleep(0.25)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: errori.append(str(e)))
    entra = lambda u, pw: (apri(pg), pg.fill('#c-utente', u), pg.fill('#c-password', pw), pg.click('button.btn.largo'))

    pg.goto(BASE + '/'); pg.wait_for_function('f => (location.pathname + location.search).includes(f)', arg='/accesso?dopo=')
    ok(pg.locator('.accesso h1').text_content() == 'Accedi', 'senza sessione: pagina di accesso con ritorno a /')
    ok(pg.locator('.accesso-scena .accesso-logo img').count() == 1 and pg.evaluate("document.body.classList.contains('in-accesso')"), 'pagina scura con il logo (D-42)')
    pg.screenshot(path=str(USCITA / 'app-accesso-1440.png'))
    entra(U, 'sbagliata'); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok(pg.locator('.modulo-errore').inner_text() == 'Credenziali non valide.', 'password sbagliata: messaggio unico')
    pg.screenshot(path=str(USCITA / 'app-accesso-errore-1440.png'))
    entra(U.upper(), PROVVISORIA); pg.wait_for_function('f => (location.pathname + location.search).includes(f)', arg='/accesso/cambia')
    ok(pg.locator('.accesso h1').inner_text() == 'Scegli la tua password', 'password provvisoria: cambio obbligatorio')
    pg.screenshot(path=str(USCITA / 'app-cambia-1440.png'))
    pg.fill('#c-attuale', PROVVISORIA); pg.fill('#c-nuova', 'corta'); pg.fill('#c-ripeti', 'corta'); pg.click('button.btn.largo')
    pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('8 caratteri' in pg.locator('.modulo-errore').inner_text(), 'nuova password corta: messaggio del server')
    pg.fill('#c-nuova', 'nuova-password-1'); pg.fill('#c-ripeti', 'nuova-password-1'); pg.click('button.btn.largo')
    pg.wait_for_function("location.pathname === '/'"); pg.wait_for_selector('.barra-piede .io b')
    ok(pg.locator('.barra-piede .io b').inner_text() == 'Prova Nuovo', 'dopo il cambio si entra')
    pg.click('a.io-esci'); pg.wait_for_function("location.pathname === '/accesso'")
    pg.goto(BASE + '/'); pg.wait_for_function('f => (location.pathname + location.search).includes(f)', arg='/accesso?dopo=')
    ok(True, 'dopo Esci la sessione non vale più')
    entra(U + '@prova-e2e.it', 'nuova-password-1'); pg.wait_for_function("location.pathname === '/'")
    ok(True, 'si entra con l\'email e la nuova password')
    pg.click('a.io-esci'); pg.wait_for_function("location.pathname === '/accesso'")

    # password dimenticata: il link arriva nel log del backend (posta in sviluppo)
    inizio = LOG.stat().st_size
    apri(pg); pg.click('text=Password dimenticata?'); pg.wait_for_function('f => (location.pathname + location.search).includes(f)', arg='/accesso/dimenticata')
    apri(pg); pg.fill('#c-email', U + '@prova-e2e.it'); pg.click('button.btn.largo')
    pg.wait_for_selector('text=Controlla la posta')
    ok(True, 'dimenticata: Controlla la posta')
    codice = link_dal_log(inizio)
    ok(bool(codice), 'link nel log del backend')
    pg.goto(BASE + '/accesso/password/' + codice)
    pg.fill('#c-nuova', 'nuova-password-2'); pg.fill('#c-ripeti', 'diversa'); pg.click('button.btn.largo')
    ok(pg.locator('.modulo-errore').inner_text() == 'Le due password non coincidono.', 'nuova password: le due non coincidono')
    pg.fill('#c-ripeti', 'nuova-password-2'); pg.click('button.btn.largo'); pg.wait_for_function('f => (location.pathname + location.search).includes(f)', arg='/accesso?fatto=password')
    ok('Password salvata' in pg.locator('.accesso').inner_text(), 'password salvata: avviso sulla pagina di accesso')
    pg.screenshot(path=str(USCITA / 'app-fatto-1440.png'))
    pg.goto(BASE + '/accesso/password/' + codice); pg.fill('#c-nuova', 'nuova-password-3'); pg.fill('#c-ripeti', 'nuova-password-3'); pg.click('button.btn.largo')
    pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('non è valido' in pg.locator('.modulo-errore').inner_text(), 'link già usato: rifiutato')
    pg.goto(BASE + '/accesso'); entra(U, 'nuova-password-2'); pg.wait_for_function("location.pathname === '/'")
    ok(True, 'si entra con la password reimpostata')

    # ritorno: solo percorsi interni
    pg.click('a.io-esci'); pg.wait_for_function("location.pathname === '/accesso'")
    pg.goto(BASE + '/accesso?dopo=//esempio.com'); entra(U, 'nuova-password-2'); pg.wait_for_function("location.pathname === '/'")
    ok(pg.url == BASE + '/', 'ritorno verso un altro sito ignorato')
    pg.goto(BASE + '/accesso'); pg.wait_for_function("location.pathname === '/'")
    ok(True, "già dentro: /accesso porta all'app")
    pg.goto(BASE + '/accesso/esci'); pg.wait_for_function("location.pathname === '/accesso'")
    pg.goto(BASE + '/'); pg.wait_for_function("location.pathname === '/accesso'")
    ok(True, 'Esci aperto direttamente (pagina appena caricata): sessione chiusa')

    m = b.new_page(viewport={'width': 768, 'height': 1024})
    m.goto(BASE + '/accesso'); m.wait_for_selector('.accesso-scena')
    ok(m.evaluate("document.documentElement.scrollWidth <= 768"), '768 px: niente scorrimento orizzontale')
    m.screenshot(path=str(USCITA / 'app-accesso-768.png'))
    b.close()

print('\n'.join(esiti)); print('errori della pagina:', errori or 'nessuno')
