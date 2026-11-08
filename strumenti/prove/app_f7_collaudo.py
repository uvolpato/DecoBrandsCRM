# Collaudo F7-A1: schermate di controllo a 1440x900 e 768x900 di tutte le pagine dell'app,
# scorrimento orizzontale, errori JavaScript, testata (titolo, Guida, Torna a...), numeri del menu
# dal server, pillola dello stato a 10 px, due colonne impilate sul tablet.
# Uso: python strumenti/prove/app_f7_collaudo.py <suffisso> <cartella schermate> [base]
import pathlib, sys
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti = []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

def entra(b, utente, larghezza, altezza=900):
    pg = b.new_page(viewport={'width': larghezza, 'height': altezza})
    errori = []
    pg.on('pageerror', lambda e: errori.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errori.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(BASE + '/'); pg.wait_for_function("location.pathname.indexOf('/accesso') === 0")
    apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
    pg.wait_for_selector('.testa h1', timeout=45000)
    # i 401 di /api/accesso/io prima dell'accesso sono il modo normale di sapere se c'è una sessione
    errori.clear()
    return pg, errori

def attesa(pg, sel='.testa h1', ms=45000):
    pg.wait_for_selector(sel, timeout=ms)
    try: pg.wait_for_load_state('networkidle', timeout=2500)
    except Exception: pass
    # D-59: le sagome spariscono quando i dati arrivano; la schermata di controllo le aspetta
    try: pg.wait_for_function("document.querySelectorAll('.sagoma').length === 0", timeout=15000)
    except Exception: pass
    pg.wait_for_timeout(300)

def scorrimento(pg):
    return pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 1')

def visita(pg, errori, percorso, nome, w):
    errori.clear()
    pg.goto(BASE + percorso); attesa(pg)
    ok(True, '%s %d px: pagina aperta' % (nome, w))
    ok(not scorrimento(pg), '%s %d px: nessuno scorrimento orizzontale' % (nome, w))
    # la Guida non mette il collegamento a sé stessa, come il prototipo (CRM.Pagina: voce !== 'guida')
    if nome != 'Guida':
        ok(pg.locator('.testa a[href^="/guida/"]').count() == 1, '%s %d px: collegamento Guida nella testata' % (nome, w))
    nome_file = nome.lower().replace(' ', '-').replace('/', '-')
    pg.screenshot(path=str(USCITA / ('collaudo-%s-%d.png' % (nome_file, w))))
    ok(not errori, '%s %d px: nessun errore JavaScript%s' % (nome, w, (' (' + errori[0] + ')') if errori else ''))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # --- 1. numeri del menu dal server, pillola dello stato, Torna a... (amministratore, 1440) ---
    pg, errori = entra(b, S + '-ammi', 1440)
    pg.goto(BASE + '/'); attesa(pg, '.kpi')
    numeri = pg.evaluate("async () => (await (await fetch('/api/oggi/conteggi')).json())")
    def conta(nome):
        t = pg.locator('.barra .voce', has_text=nome).first.inner_text().replace('\n', ' ')
        resto = t.replace(nome, ' ').strip().split(' ')[0].strip()
        return resto
    for voce in ('Oggi', 'Documenti', 'Pratiche', 'Bollettini'):
        atteso = str(numeri[voce.lower()]) if numeri[voce.lower()] else ''
        ok(conta(voce) == atteso, 'menu: numero di %s = %s (da /api/oggi/conteggi)' % (voce, atteso))
    urgenti = pg.locator('.barra .voce .conta.urgente').count()
    ok(urgenti == (1 if numeri['documenti'] else 0) + (1 if numeri['pratiche'] else 0),
       'menu: Documenti e Pratiche in giallo quando c’è da fare (%d contatori urgenti)' % urgenti)
    ok(len(errori) == 0, 'Oggi 1440 px: nessun errore JavaScript')

    # pillola dello stato a 10 px dal titolo (dettaglio pratica)
    pg.goto(BASE + '/pratiche'); attesa(pg, '.dt tbody tr.cliccabile')
    pg.locator('.dt tbody tr.cliccabile').first.click()
    pg.wait_for_selector('.testa h1 .testa-badge', timeout=20000)
    attesa(pg, '.testa h1 .testa-badge')
    via_p = pg.evaluate('location.pathname')
    if pg.locator('.testa h1 .testa-badge').count():
        m = pg.evaluate("() => getComputedStyle(document.querySelector('.testa h1 .testa-badge')).marginLeft")
        ok(m == '10px', 'pillola dello stato: margine dal titolo %s' % m)
    else:
        ok(False, 'pillola dello stato: nessun badge nella testata della pratica')
    t = pg.locator('.testa-azioni button:has-text("Torna")')
    ok(t.count() == 1, 'dettaglio pratica: pulsante Torna a... nella testata (accanto a Guida)')
    ok(t.first.evaluate("el => el.parentElement.lastElementChild.textContent.includes('Guida')"),
       'dettaglio pratica: Torna a... sta accanto a Guida, a destra')
    pg.click('.testa-azioni button:has-text("Torna")')
    pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(500)
    ok('Pratiche' in pg.locator('.testa h1').inner_text(), 'Torna a... riporta alla schermata prima')
    ok(len(errori) == 0, 'navigazione: nessun errore JavaScript')
    pg.close()

    # --- 1b. Torna a... in tutte le pagine aperte dal menu (voce giusta, accanto a Guida) ---
    pg, errori = entra(b, S + '-ammi', 1440)
    pg.wait_for_selector('.kpi', timeout=45000)
    pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(400)
    atteso = {
        '/documenti': 'Torna a Oggi', '/pratiche': 'Torna ai Documenti', '/bollettini': 'Torna alle Pratiche',
        '/liquidazioni': 'Torna ai Bollettini', '/analisi': 'Torna alle Liquidazioni',
    }
    for href, testo in atteso.items():
        pg.locator('.barra a[href="%s"]' % href).first.click()
        # la pagina precedente deve essere davvero aperta: /liquidazioni reindirizza al trimestre
        pg.wait_for_function("h => location.pathname === h || location.pathname.startsWith(h + '/')", arg=href, timeout=30000)
        attesa(pg, '.testa h1')
        t = pg.locator('.testa-azioni button:has-text("Torna")').first
        ok(t.count() == 1 and testo in t.inner_text(), '%s: %s' % (href, testo))
        ok(t.count() == 0 or t.is_enabled(), '%s: Torna a... attivo' % href)
        ok(pg.evaluate("() => { const a = document.querySelectorAll('.testa-azioni > *'); return a.length && a[a.length-1].textContent.trim() === 'Guida' && a[0].textContent.trim().startsWith('Torna'); }"), '%s: Torna a... a sinistra di Guida' % href)
    ok(len(errori) == 0, 'giri dal menu: nessun errore JavaScript')
    pg.close()

    # --- 2. in sola lettura il Torna a... resta attivo ---
    pg, errori = entra(b, S + '-lett', 1440)
    pg.goto(BASE + '/pratiche'); attesa(pg, '.dt tbody tr.cliccabile')
    pg.locator('.dt tbody tr.cliccabile').first.click(); attesa(pg)
    t = pg.locator('.testa-azioni button:has-text("Torna")').first
    ok(t.count() == 1 and t.is_enabled(), 'sola lettura: Torna a... presente e attivo')
    pg.click('.testa-azioni button:has-text("Torna")'); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(400)
    ok('Pratiche' in pg.locator('.testa h1').inner_text(), 'sola lettura: Torna a... funziona')
    pg.close()

    # --- 3. tutte le pagine a 1440 e 768 ---
    pg, errori = entra(b, S + '-ammi', 1440)
    pg.goto(BASE + '/pratiche'); attesa(pg, '.dt tbody tr.cliccabile')
    pg.locator('.dt tbody tr.cliccabile').first.click(); attesa(pg)
    via_p = pg.evaluate('location.pathname')
    pg.goto(BASE + '/bollettini'); attesa(pg, '.matrice')
    pg.locator('a.m-cella').first.click(); attesa(pg, '.cerniera')
    via_b = pg.evaluate('location.pathname')
    pg.close()

    pagine = [
        ('/', 'Oggi'), ('/documenti', 'Documenti'), ('/pratiche', 'Pratiche'), ('/bollettini', 'Bollettini'),
        ('/liquidazioni', 'Liquidazioni'), ('/analisi', 'Analisi'), ('/fornitori', 'Fornitori'),
        ('/subagenti', 'Subagenti'), ('/clienti', 'Clienti'), ('/registro', 'Registro'),
        ('/sistema', 'Sistema'), ('/scartati', 'Scartati'), ('/impostazioni', 'Impostazioni'),
        ('/utenti', 'Utenti'), ('/guida', 'Guida'), ('/componenti', 'Componenti'),
        (via_p, 'Pratica'), (via_b, 'Bollettino'), ('/liquidazioni/2026/3', 'Liquidazione'),
    ]
    for w in (1440, 768):
        pg, errori = entra(b, S + '-ammi', w)
        for percorso, nome in pagine:
            visita(pg, errori, percorso, nome, w)
        pg.close()

    # --- 4. due colonne: a 768 px si impilano ---
    pg, errori = entra(b, S + '-ammi', 768)
    def colonne(pg, sel):
        return pg.evaluate("sel => { const c = document.querySelector(sel); return c ? getComputedStyle(c).gridTemplateColumns.split(' ').length : 'assente'; }", sel)
    pg.goto(BASE + '/documenti'); attesa(pg, '.caricamento')
    a = colonne(pg, '.colonne')
    ok(a == 1, 'Documenti 768 px: le due colonne si impilano (%s)' % a)
    pg.goto(BASE + '/liquidazioni/2026/3'); attesa(pg, '.colonne')
    a = colonne(pg, '.colonne')
    ok(a == 1, 'Liquidazione 768 px: le due colonne si impilano (%s)' % a)
    pg.goto(BASE + '/pratiche'); attesa(pg, '.dt tbody tr.cliccabile')
    pg.locator('.dt tbody tr.cliccabile').first.click(); attesa(pg)
    a = colonne(pg, '.colonne.riepilogo-pratica')
    ok(a == 1, 'Pratica 768 px: le due colonne del riepilogo si impilano (%s)' % a)
    ok(not errori, '768 px: nessun errore JavaScript')
    pg.close()
    b.close()

ko = [x for x in esiti if x.startswith('KO')]
for e in esiti: print(e)
print('\nTOTALE %d controlli, %d OK, %d KO' % (len(esiti), len(esiti) - len(ko), len(ko)))
pathlib.Path(str(USCITA / 'collaudo-esiti.txt')).write_text('\n'.join(esiti), encoding='utf-8')
sys.exit(1 if ko else 0)
