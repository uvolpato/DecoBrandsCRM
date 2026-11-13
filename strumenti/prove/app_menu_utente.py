# Prova del menu dell'utente (D-53), con Playwright: si apre dal riquadro in fondo alla barra,
# contiene email, aree, Cambia la password, Guida ed Esci; verso l'alto sul computer e verso il
# basso sul tablet; frecce, Esc, clic fuori e ritorno del fuoco; aree per ruolo.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi e
# <s>-oper (password-di-prova, da utenti_prova.js crea <s>).
# Uso: python strumenti/prove/app_menu_utente.py <suffisso> <cartella schermate> [base]
import sys, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, percorso='/pratiche', larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + percorso); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function('p => location.pathname.startsWith(p)', arg=percorso)
        pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.io-btn')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    def apri_menu(pg):
        pg.click('.io-btn'); pg.wait_for_selector('.menu-utente'); pg.wait_for_timeout(150)
    def voci(pg):
        return [x.strip() for x in pg.locator('.menu-utente-voce').all_inner_texts()]
    def attiva(pg):
        return pg.locator('.menu-utente-voce.attiva').inner_text().strip()

    pg = entra(S + '-ammi')
    apri_menu(pg)
    m, puls = pg.locator('.menu-utente').bounding_box(), pg.locator('.io-btn').bounding_box()
    ok(m['y'] + m['height'] <= puls['y'] + 1, 'il menu si apre verso l’alto, sopra il riquadro dell’utente')
    v = voci(pg)
    ok(pg.locator('.menu-utente-mail').inner_text().strip() == S + '-ammi@prova-e2e.it', 'in cima l’email dell’utente')
    ok(all(x in v for x in ('Provvigioni', 'Dati', 'Gestione', 'Cambia la password', 'Guida', 'Esci')), 'aree, password, Guida ed Esci nel menu')
    ok(attiva(pg) == 'Provvigioni', 'la spunta è sull’area della pagina (Provvigioni)')
    ok(pg.evaluate("document.activeElement.getAttribute('role')") == 'menuitem' and 'Provvigioni' in pg.evaluate('document.activeElement.innerText'),
       'all’apertura il fuoco va sulla prima voce')
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(100)
    ok('Dati' in pg.evaluate('document.activeElement.innerText'), 'freccia giù: il fuoco passa a Dati')
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(100)
    ok('Provvigioni' in pg.evaluate('document.activeElement.innerText'), 'freccia su: torna a Provvigioni')
    pg.screenshot(path=str(USCITA / 'menu-utente-aperto-1440.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    ok(pg.locator('.menu-utente').count() == 0 and pg.evaluate("document.activeElement.classList.contains('io-btn')"), 'Esc chiude e il fuoco torna al pulsante')
    apri_menu(pg); pg.click('.testa h1'); pg.wait_for_timeout(200)
    ok(pg.locator('.menu-utente').count() == 0, 'un clic fuori chiude il menu')
    pg.screenshot(path=str(USCITA / 'menu-utente-chiuso-1440.png'))

    # scelta di un'area: va alla sua prima pagina e il titolo in cima cambia
    apri_menu(pg); pg.click('.menu-utente-voce:has-text("Dati")')
    pg.wait_for_function("location.pathname === '/soggetti'"); pg.wait_for_timeout(500)
    ok('Dati' in testo(pg, '.area-titolo') and testo(pg, '.testa h1') == 'Soggetti', 'scelto Dati: prima pagina e titolo dell’area aggiornati')
    apri_menu(pg)
    ok(attiva(pg) == 'Dati', 'dopo la scelta la spunta è su Dati')
    pg.keyboard.press('Escape')

    # 768 px: menu verso il basso, dentro lo schermo
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(500)
    ok(pg.locator('.area-titolo').is_visible() and pg.locator('.io-btn').is_visible(), '768 px: nome dell’area e pulsante utente visibili')
    apri_menu(pg)
    m, puls = pg.locator('.menu-utente').bounding_box(), pg.locator('.io-btn').bounding_box()
    ok(m['y'] >= puls['y'] + puls['height'] - 1, '768 px: il menu si apre verso il basso')
    ok(m['x'] >= 0 and m['x'] + m['width'] <= 768 and m['y'] + m['height'] <= 1024, '768 px: il menu resta dentro lo schermo')
    pg.screenshot(path=str(USCITA / 'menu-utente-aperto-768.png'))
    pg.keyboard.press('Escape')
    pg.screenshot(path=str(USCITA / 'menu-utente-chiuso-768.png'))
    pg.close()

    # operatore: solo le aree che può aprire (Gestione c'è per Stato del sistema, che vede l'operatore)
    pg = entra(S + '-oper'); pg.wait_for_timeout(500)
    apri_menu(pg)
    v = [x for x in voci(pg) if x in ('Provvigioni', 'Dati', 'Gestione')]
    ok(v == ['Provvigioni', 'Dati', 'Gestione'], 'operatore: le aree che può aprire (Gestione per Stato del sistema)')
    apri_menu(pg) if pg.locator('.menu-utente').count() == 0 else None
    pg.click('.menu-utente-voce:has-text("Esci")'); pg.wait_for_function("location.pathname === '/accesso'")
    ok(True, 'Esci dal menu porta alla pagina di accesso')
    pg.close()

    # sola lettura: niente Gestione (Stato del sistema richiede almeno operatore in un'area)
    pg = entra(S + '-lett'); pg.wait_for_timeout(500)
    apri_menu(pg)
    v = [x for x in voci(pg) if x in ('Provvigioni', 'Dati', 'Gestione')]
    ok(v == ['Provvigioni', 'Dati'], 'lettura: solo le aree che può aprire, niente Gestione')
    pg.close()

    # le voci di password e Guida portano alle loro pagine
    pg = entra(S + '-ammi'); apri_menu(pg); pg.click('.menu-utente-voce:has-text("Guida")')
    pg.wait_for_function("location.pathname === '/guida'"); pg.wait_for_timeout(300)
    ok(True, 'la voce Guida apre la Guida')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
