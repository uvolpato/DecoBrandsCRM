# Prova della pagina Utenti dell'app (passo 1.13), con Playwright: elenco, ricerca e segmenti,
# schede, nuovo utente, modifica, reimposta, disattiva, elimina, Pagina riservata, telefono.
# Servono backend (8002) e frontend (8001) accesi e gli utenti di prova di app_guscio.sql
# (<s>-ammi, <s>-oper, <s>-lett con la password PW). Il nuovo utente ha email <s>-nuovo@prova-e2e.it.
# Uso: python strumenti/prove/app_utenti.py <suffisso> <cartella schermate>
import sys, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE, PW = 'http://localhost:8001', 'password-di-prova'
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 500 else 844})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/utenti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/utenti'"); pg.wait_for_load_state('networkidle')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')

    pg = entra(S + '-ammi')
    pg.wait_for_selector('.dt tbody tr.cliccabile')
    ok('Utenti e ruoli' in testo(pg, '.testa h1'), 'titolo della pagina')
    pg.fill('.filtri input[type=search]', S + '-'); pg.wait_for_timeout(200)
    ok(righe(pg) == 4, 'ricerca: i quattro utenti di prova')
    ok(pg.locator('.segmenti [role=tab]:has-text("Tutti") .n').inner_text() == '4', 'numeri dei segmenti contano con la ricerca (D-23)')
    ok('(tu)' in testo(pg, '.dt tbody'), 'l’utente corrente è segnato (tu)')
    ok(pg.title() == 'Utenti e ruoli · Decobrands', 'titolo della scheda del browser')
    pg.click('.dt th:has-text("Ruolo")'); pg.wait_for_timeout(200)
    pg.click('.dt tbody tr.cliccabile:has-text("Prova Oper")'); pg.wait_for_function("location.pathname.startsWith('/utenti/')")
    pg.wait_for_timeout(300)
    ok(pg.locator('.dt th.attivo:has-text("Ruolo")').count() == 1 and pg.title() == 'Utenti e ruoli · Decobrands', 'clic su una riga: ordinamento e titolo restano')
    pg.wait_for_selector('.pannello-testa h2:has-text("Prova Oper")')
    ok(pg.locator('.dt tbody tr.selezionata').count() == 1 and pg.input_value('.filtri input[type=search]') == S + '-', 'scheda dell’utente: riga evidenziata, ricerca ricordata')
    ok('Provvigioni' in testo(pg, '.aree-accesso') and 'Operatore' in testo(pg, '.aree-accesso') and pg.locator('.azioni-riga button').count() == 2, 'dati dell’utente: ruolo di Sistema, accesso alle aree, Disattiva ed Elimina')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.schede-barra')).overflowY") == 'hidden', 'barra delle schede senza frecce di scorrimento verticale')
    pg.focus('.filtri input[type=search]')
    ok(pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == 'none' and 'inset' in pg.evaluate("getComputedStyle(document.activeElement).boxShadow"), 'campo di ricerca: contorno dentro il bordo')
    pg.click('.schede-barra [role=tab]:has-text("Permessi")'); pg.wait_for_timeout(200)
    ok(pg.locator('.schede-corpo details.permessi-area').count() == 3 and pg.locator('.schede-corpo details.permessi-area[open]').count() == 2 and pg.locator('.schede-corpo td.col-evidenza').count() == 4 + 3 + 6, 'permessi: una sezione per Sistema e per area, aperte quelle dove ha accesso, evidenziati ruolo e livelli (D-45)')
    pg.screenshot(path=str(USCITA / 'app-utenti-1440.png'))
    pg.click('.schede-barra [role=tab]:has-text("Dati")')

    # nuovo utente: errore del server nella finestra, poi creazione
    pg.click('.testa-azioni button:has-text("Nuovo utente")'); finestra(pg).wait_for()
    ok(pg.evaluate('document.activeElement.id') == 'c-nome', 'nuovo utente: focus sul primo campo')
    pg.fill('#c-nome', 'Prova Creato'); pg.fill('#c-username', S + '-ammi'); pg.fill('#c-email', S + '-creato@prova-e2e.it')
    ok(pg.locator('#c-ruolo option[value=amministratore]').count() == 0, 'l’amministratore non può creare amministratori')
    pg.check('input[name=area_provvigioni][value=responsabile]')
    pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('già' in testo(pg, '.modulo-errore'), 'nome utente doppio: messaggio del server, finestra aperta')
    pg.fill('#c-username', S + '-creato'); pg.click('.modale-piede button[type=submit]')
    pg.wait_for_selector('.pannello-testa h2:has-text("Prova Creato")')
    ok(finestra(pg).count() == 0 and 'Password provvisoria' in testo(pg, '.dettagli') and 'Benvenuto' in testo(pg, '.dettagli') and 'Responsabile' in testo(pg, '.aree-accesso'), 'creato: password provvisoria, email di benvenuto, livello in Provvigioni')

    pg.click('.pannello-testa button:has-text("Modifica")'); finestra(pg).wait_for()
    pg.fill('#c-nome', 'Prova Creato Due'); pg.press('#c-email', 'Enter')
    pg.wait_for_selector('.pannello-testa h2:has-text("Prova Creato Due")')
    ok(True, 'modifica: Invio salva e la scheda si aggiorna')

    pg.click('.pannello-testa button:has-text("Reimposta la password")'); finestra(pg).wait_for()
    pg.click('.modale-piede button:has-text("Manda la password")'); pg.wait_for_selector('.avviso:has-text("Password provvisoria mandata")'); pg.wait_for_selector('.dettagli:has-text("Nuova password provvisoria")')
    ok(finestra(pg).count() == 0 and 'Nuova password provvisoria' in testo(pg, '.dettagli'), 'reimposta la password: conferma, avviso, ultima email aggiornata')

    pg.click('.azioni-riga button:has-text("Disattiva")'); pg.wait_for_selector('.dettagli :text("Disattivato")')
    ok(pg.locator('.dt tbody tr:has-text("Prova Creato Due")').count() == 0, 'disattivato: esce dagli Attivi')
    pg.click('.segmenti [role=tab]:has-text("Disattivati")'); pg.wait_for_timeout(200)
    ok(pg.locator('.dt tbody tr:has-text("Prova Creato Due")').count() == 1, 'segmento Disattivati')
    pg.click('.azioni-riga button:has-text("Elimina")'); finestra(pg).wait_for()
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    ok(finestra(pg).count() == 0 and 'Prova Creato Due' in testo(pg, '.pannello-testa h2'), 'Esc annulla l’eliminazione')
    pg.click('.azioni-riga button:has-text("Elimina")'); pg.click('.modale-piede button:has-text("Elimina")')
    pg.wait_for_function("location.pathname === '/utenti'"); pg.wait_for_timeout(300)
    ok(pg.locator('.dt tbody tr:has-text("Prova Creato Due")').count() == 0, 'eliminato')

    pg.click('.segmenti [role=tab]:has-text("Attivi")'); pg.wait_for_timeout(200)
    pg.click('.dt tbody tr.cliccabile:has-text("Prova Ammi")'); pg.wait_for_selector('.pannello-testa h2:has-text("Prova Ammi")')
    ok(pg.locator('.azioni-riga button:disabled').count() == 2 and pg.locator('.pannello-testa a:has-text("Cambia la tua password")').count() == 1, 'su sé stessi: niente Disattiva/Elimina, sì Cambia la tua password')
    pg.click('.pannello-testa button:has-text("Modifica")'); finestra(pg).wait_for()
    ok(pg.locator('input[name=area_provvigioni]:disabled').count() == 4 and pg.locator('#c-ruolo:disabled').count() == 1, 'i propri ruolo e livelli non si cambiano (D-45)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.close()

    pg = entra(S + '-oper')
    ok('Pagina riservata' in testo(pg, '.principale') and 'amministratori' in testo(pg, '.principale'), 'operatore: Pagina riservata')
    ok(pg.locator('.aree-barra .area.attiva').inner_text() == 'Gestione' and pg.locator('.barra .voce:has-text("Stato del sistema")').count() == 1, 'operatore: area Gestione con Stato del sistema')
    pg.close()

    pg = entra(S + '-ammi', 768)
    pg.wait_for_selector('.dt tbody tr.cliccabile')
    ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: niente scorrimento orizzontale')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.colonne')).gridTemplateColumns.split(' ').length") == 1, '768 px: elenco e scheda impilati')
    ok(pg.evaluate("document.querySelector('.barra').getBoundingClientRect().height") < 120, '768 px: la barra sta in due righe (aree, voci)')
    pg.screenshot(path=str(USCITA / 'app-utenti-768.png'), full_page=True)
    pg.close()
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
