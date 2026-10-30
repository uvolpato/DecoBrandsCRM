# Prova del guscio dell'app (passo 1.11), con Playwright: barra per ruolo, sola lettura,
# Pagina riservata, ritorno alla pagina chiesta, Esci, telefono.
# Servono backend (8002) e frontend (8001) accesi e tre utenti di prova con la password PW,
# nomi utente <s>-ammi, <s>-oper, <s>-lett (vedi app_guscio.sql). Uso:
#   python strumenti/prove/app_guscio.py <suffisso> <cartella schermate>
import sys, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE, PW = 'http://localhost:8001', 'password-di-prova'
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
voci = lambda pg: [x.strip() for x in pg.locator('.barra .voce span').all_text_contents()]  # anche nel gruppo chiuso

# D-42: su Accedi e Password dimenticata prima c'è il logo; un tasto apre la finestra
def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    def entra(utente, percorso='/', larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 500 else 844})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + percorso)
        pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function('p => location.pathname === p', arg=percorso)
        pg.wait_for_selector('.barra .voce')
        return pg

    pg = entra(f'{S}-ammi', '/pratiche')
    ok(True, 'senza sessione: accesso e ritorno alla pagina chiesta (/pratiche)')
    ok('Utenti e ruoli' in voci(pg) and 'Stato del sistema' in voci(pg), 'amministratore: voci di Gestione')
    ok(pg.locator('.voce.attiva').inner_text() == 'Pratiche', 'voce attiva = pagina corrente')
    ok(not pg.locator('details.richiudibile').get_attribute('open') is not None, 'Gestione chiusa fuori dalle sue pagine')
    ok(pg.locator('.barra-piede .io b').inner_text() == 'Prova Ammi' and 'Amministratore' in pg.locator('.barra-piede .io').inner_text(), 'utente e ruolo in fondo alla barra')
    ok(not pg.evaluate("document.body.classList.contains('sola-lettura')"), 'amministratore: niente fascia di sola lettura')
    pg.click('.voce:has-text("Fornitori")'); pg.wait_for_function("location.pathname === '/fornitori'")
    ok(pg.locator('.testa h1').inner_text() == 'Fornitori' and 'In costruzione' in pg.locator('.principale').inner_text(), 'pagina non ancora fatta: In costruzione dentro il guscio')
    pg.goto(BASE + '/utenti'); pg.wait_for_selector('.testa h1')
    ok(pg.locator('details.richiudibile').get_attribute('open') is not None, 'Gestione aperta nelle sue pagine')
    pg.screenshot(path=str(USCITA / 'guscio-ammi-1440.png'))
    pg.click('.io-esci'); pg.wait_for_function("location.pathname === '/accesso'")
    pg.goto(BASE + '/pratiche'); pg.wait_for_function("location.pathname === '/accesso'")
    ok(True, 'Esci dalla barra: sessione chiusa')
    pg.close()

    pg = entra(f'{S}-oper')
    ok('Utenti e ruoli' not in voci(pg) and 'Stato del sistema' in voci(pg) and 'Documenti scartati' in voci(pg), 'operatore: niente Utenti e Impostazioni, sì Stato del sistema e Scartati')
    pg.goto(BASE + '/utenti'); pg.wait_for_selector('.vuoto b')
    ok(pg.locator('.vuoto b').inner_text() == 'Pagina riservata' and 'operatore' in pg.locator('.vuoto').inner_text(), 'operatore su /utenti: Pagina riservata')
    pg.close()

    pg = entra(f'{S}-lett', '/oggi-non-esiste')
    ok(pg.evaluate("document.body.classList.contains('sola-lettura')"), 'sola lettura: classe sul body')
    fascia = pg.evaluate("getComputedStyle(document.querySelector('.principale'), '::before').content")
    ok('sola lettura' in fascia, 'sola lettura: fascia "Profilo in sola lettura"')
    ok(not pg.locator('#carica-barra').is_visible(), 'sola lettura: Carica documenti nascosto')
    ok(not any(x in voci(pg) for x in ('Utenti e ruoli', 'Stato del sistema', 'Documenti scartati', 'Impostazioni')) and 'Guida' in voci(pg), 'sola lettura: in Gestione solo la Guida')
    pg.screenshot(path=str(USCITA / 'guscio-lettura-1440.png'))
    pg.close()

    pg = entra(f'{S}-ammi', '/', 390)
    ok(pg.evaluate('document.documentElement.scrollWidth <= 390'), '390 px: niente scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'guscio-390.png'))
    b.close()

print('\n'.join(esiti)); print('errori della pagina:', errori or 'nessuno')
