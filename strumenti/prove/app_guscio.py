# Prova del guscio dell'app (passo 1.11), con Playwright: barra per ruolo e per area (D-47), sola lettura,
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
voci = lambda pg: [x.strip() for x in pg.locator('.barra .voce span').all_text_contents()]  # le voci dell'area aperta
aree = lambda pg: [x.strip() for x in pg.locator('.aree-barra .area').all_inner_texts()]

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
    ok(aree(pg) == ['Provvigioni', 'Dati', 'Gestione'] and pg.locator('.aree-barra .area.attiva').inner_text() == 'Provvigioni', 'amministratore: tre aree, aperta quella della pagina')
    ok('Bollettini' in voci(pg) and 'Fornitori' not in voci(pg) and 'Utenti e ruoli' not in voci(pg) and 'Guida' in voci(pg), 'si vedono solo le voci dell’area aperta, più la Guida')
    ok(pg.locator('.voce.attiva').inner_text() == 'Pratiche', 'voce attiva = pagina corrente')
    ok(pg.locator('.barra-piede .io b').inner_text() == 'Prova Ammi' and 'Amministratore' in pg.locator('.barra-piede .io').inner_text(), 'utente e ruolo in fondo alla barra')
    ok(not pg.evaluate("document.body.classList.contains('sola-lettura')"), 'amministratore: niente fascia di sola lettura')
    pg.click('.aree-barra .area:has-text("Dati")'); pg.wait_for_function("location.pathname === '/fornitori'")
    ok(voci(pg) == ['Fornitori', 'Subagenti', 'Clienti', 'Guida'] and not pg.locator('#carica-barra').count(), 'area Dati: le sue voci, niente Carica documenti')
    ok(pg.locator('.testa h1').inner_text() == 'Fornitori' and 'In costruzione' in pg.locator('.principale').inner_text(), 'pagina non ancora fatta: In costruzione dentro il guscio')
    pg.goto(BASE + '/utenti'); pg.wait_for_selector('.testa h1')
    ok(pg.locator('.aree-barra .area.attiva').inner_text() == 'Gestione' and 'Impostazioni' in voci(pg), 'su /utenti è aperta Gestione')
    pg.click('.voce:has-text("Guida")'); pg.wait_for_function("location.pathname === '/guida'")
    ok(pg.locator('.aree-barra .area.attiva').inner_text() == 'Gestione', 'la Guida lascia aperta l’ultima area')
    pg.go_back(); pg.wait_for_selector('.testa h1')
    pg.screenshot(path=str(USCITA / 'guscio-ammi-1440.png'))
    pg.click('.io-esci'); pg.wait_for_function("location.pathname === '/accesso'")
    pg.goto(BASE + '/pratiche'); pg.wait_for_function("location.pathname === '/accesso'")
    ok(True, 'Esci dalla barra: sessione chiusa')
    pg.close()

    pg = entra(f'{S}-oper')
    ok('Documenti scartati' in voci(pg) and aree(pg) == ['Provvigioni', 'Dati', 'Gestione'], 'operatore: Scartati in Provvigioni, tre aree')
    pg.click('.aree-barra .area:has-text("Gestione")'); pg.wait_for_function("location.pathname === '/sistema'")
    ok(voci(pg) == ['Stato del sistema', 'Guida'], 'operatore: in Gestione solo Stato del sistema')
    pg.goto(BASE + '/utenti'); pg.wait_for_selector('.vuoto b')
    ok(pg.locator('.vuoto b').inner_text() == 'Pagina riservata' and 'amministratori' in pg.locator('.vuoto').inner_text(), 'operatore su /utenti: Pagina riservata')
    pg.close()

    pg = entra(f'{S}-lett', '/pratiche')  # D-45: la sola lettura vale nelle pagine di un'area dove si ha "lettura"
    ok(pg.evaluate("document.body.classList.contains('sola-lettura')"), 'sola lettura: classe sul body')
    fascia = pg.evaluate("getComputedStyle(document.querySelector('.principale'), '::before').content")
    ok('sola lettura' in fascia, 'sola lettura: fascia "Profilo in sola lettura"')
    ok(not pg.locator('#carica-barra').is_visible(), 'sola lettura: Carica documenti nascosto')
    ok(aree(pg) == ['Provvigioni', 'Dati'] and 'Documenti scartati' not in voci(pg), 'sola lettura: niente Gestione né Scartati')
    pg.screenshot(path=str(USCITA / 'guscio-lettura-1440.png'))
    pg.close()

    pg = entra(f'{S}-ammi', '/', 768)
    ok(pg.evaluate('document.documentElement.scrollWidth <= 768'), '768 px: niente scorrimento orizzontale')
    ok(pg.evaluate("document.querySelector('.aree-barra').getBoundingClientRect().bottom <= document.querySelector('.barra-menu').getBoundingClientRect().top"), '768 px: aree sopra, voci sotto')
    pg.screenshot(path=str(USCITA / 'guscio-768.png'))
    b.close()

print('\n'.join(esiti)); print('errori della pagina:', errori or 'nessuno')
