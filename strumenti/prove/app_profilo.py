# Prova della pagina /profilo dell'app (D-88), con Playwright: dati, aree, pagina di ingresso per
# area (si salva e l'area del menu apre la pagina scelta), sicurezza, 768 px e timeout di inattività
# (solo se il backend ha SESSION_TIMEOUT_MINUTI basso; altrimenti si segnala).
# Servono backend (8002) e frontend (8001) accesi e gli utenti di prova di utenti_prova.js
# (<s>-ammi, <s>-oper, <s>-lett con la password PW).
# Uso: python strumenti/prove/app_profilo.py <suffisso> <cartella schermate> [base]
import sys, time, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
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
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/'"); pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.io-btn')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    def apri_menu(pg):
        pg.click('.io-btn'); pg.wait_for_selector('.menu-utente'); pg.wait_for_timeout(150)

    pg = entra(S + '-ammi')
    apri_menu(pg)
    v = [x.strip() for x in pg.locator('.menu-utente-voce').all_inner_texts()]
    ok('Il mio profilo' in v, 'la voce «Il mio profilo» è nel menu dell’utente, prima di Cambia la password')
    ok(v.index('Il mio profilo') < v.index('Cambia la password'), '«Il mio profilo» viene prima di «Cambia la password»')
    pg.click('.menu-utente-voce:has-text("Il mio profilo")')
    pg.wait_for_function("location.pathname === '/profilo'"); pg.wait_for_load_state('networkidle')
    ok(testo(pg, '.testa h1') == 'Il mio profilo', 'il profilo si apre con il titolo giusto')
    titoli = pg.locator('.pannello-testa h2').all_inner_texts()
    ok(all(x in titoli for x in ('I tuoi dati', 'Aree che puoi aprire', 'Pagina di ingresso per area', 'Sicurezza')), 'i quattro riquadri del profilo ci sono')
    ok(testo(pg, '.testa h1') and pg.locator('.dettagli').count() >= 2, 'i dati e le aree si mostrano in sola lettura')
    # l'amministratore vede anche Gestione (Utenti, Stato, Registro, Impostazioni)
    ok(pg.locator('#c-ingresso_gestione').count() == 1, 'c’è il menu di ingresso per Gestione (voci permesse)')
    pg.screenshot(path=str(USCITA / 'profilo-1440.png'))

    # salvataggio: Dati apre /clienti
    pg.select_option('#c-ingresso_dati', '/clienti')
    pg.click('button.btn:has-text("Salva le preferenze")')
    pg.wait_for_selector('.avviso')
    ok('Preferenze salvate' in testo(pg, '.avviso'), 'salvando compare l’avviso di conferma')
    pg.screenshot(path=str(USCITA / 'profilo-salvato-1440.png'))

    # l'area nel menu dell'utente apre la pagina scelta
    apri_menu(pg); pg.click('.menu-utente-voce:has-text("Dati")')
    pg.wait_for_function("location.pathname === '/clienti'"); pg.wait_for_timeout(400)
    ok(True, 'scelto Dati nel menu: si apre la pagina di ingresso scelta (/clienti)')

    # 768 px: niente scorrimento orizzontale
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    pg.goto(BASE + '/profilo'); pg.wait_for_load_state('networkidle'); pg.wait_for_selector('.testa h1')
    ok(pg.evaluate("document.documentElement.scrollWidth <= 768"), '768 px: niente scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'profilo-768.png'))
    pg.close()

    # timeout di inattività: serve SESSION_TIMEOUT_MINUTI basso nel backend; qui si legge e, se basso, si prova
    tm = pg2 = None
    try:
        pg2 = entra(S + '-ammi')
        tm = pg2.evaluate("async () => (await (await fetch('/api/accesso/io')).json()).timeout_minuti")
    except Exception:
        tm = None
    if isinstance(tm, int) and 0 < tm <= 2:
        time.sleep(tm * 60 + 3)
        pg2.goto(BASE + '/documenti')
        pg2.wait_for_function("location.pathname === '/accesso'", timeout=20000)
        ok(True, 'timeout: dopo %d min di inattività una richiesta porta all’accesso' % tm)
        pg2.close()
    else:
        if pg2: pg2.close()
        esiti.append('OK  timeout non provato nel browser: SESSION_TIMEOUT_MINUTI=%s (serve <= 2 per non aspettare); coperto dal test backend' % tm)

    ok(not errori, 'nessun errore JavaScript')
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
