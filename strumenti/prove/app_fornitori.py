# Prova della pagina Fornitori dell'app (F1-A1), con Playwright: elenco, ricerca, scheda, modifica delle regole
# (responsabile), Percentuali in sola lettura, operatore e lettura senza modifica, memoria della schermata, 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Le regole modificate vengono rimesse come prima.
# Uso: python strumenti/prove/app_fornitori.py <suffisso> <cartella schermate> [base]
import sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW, RUN = 'password-di-prova', str(int(time.time()))[-6:]
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/fornitori'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/fornitori')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')
    scheda = lambda pg, t: pg.click('.schede-barra [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    def vai(pg, voce):  # voce del menu: navigazione dentro l'app, senza ricaricare
        pg.click('.barra a.voce:has-text("%s")' % voce); pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower()); pg.wait_for_load_state('networkidle')

    pg = entra(S + '-ammi')
    ok('Fornitori' in testo(pg, '.testa h1'), 'titolo della pagina')
    n0 = righe(pg)
    ok(n0 >= 3, 'elenco: %d fornitori' % n0)
    pg.fill('.filtri input[type=search]', 'zzzz-nessuno'); pg.wait_for_timeout(250)
    ok(righe(pg) == 0, 'ricerca senza risultati: elenco vuoto')
    pg.fill('.filtri input[type=search]', 'Gries'); pg.wait_for_timeout(250)
    ok(righe(pg) == 1 and 'Gries' in testo(pg, '.dt tbody'), 'ricerca per nome: Gries')
    pg.click('.dt tbody tr.cliccabile'); pg.wait_for_function("/^\\/fornitori\\/\\d+/.test(location.pathname)"); pg.wait_for_timeout(500)
    ok('Gries' in testo(pg, '.pannello-testa h2') and pg.locator('.dt tbody tr.selezionata').count() == 1, 'scheda del fornitore aperta, riga evidenziata')
    ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'due schede: Percentuali e Clienti seguiti')
    # Percentuali: sola lettura
    scheda(pg, 'Percentuali'); pg.wait_for_timeout(200)
    corpo = pg.locator('.schede-corpo')
    ok(corpo.locator('.dt tbody tr').count() >= 1 and corpo.locator('button').count() == 0, 'Percentuali: scaglioni in tabella, nessun pulsante')
    pagina = pg.locator('body').inner_text()
    ok(not any(t in pagina for t in ['Nuovo scaglione', 'Aggiungi scaglione', 'Elimina']), 'nessun comando per creare, modificare o eliminare scaglioni')
    pg.screenshot(path=str(USCITA / 'app-fornitori-1440.png'))
    scheda(pg, 'Clienti seguiti'); pg.wait_for_timeout(200)
    ok(pg.locator('.schede-corpo .dt').count() == 1, 'scheda Clienti seguiti: tabella')
    # filtro multiplo per subagente (D-22): restringe i clienti seguiti
    n_seg0 = pg.locator('.schede-corpo .dt tbody tr.cliccabile, .schede-corpo .dt tbody tr').count()
    fs = pg.locator('.schede-corpo .filtri').first; cs = fs.locator('.ricerca.multipla .ricerca-testo').first
    cs.click(); fs.locator('.ricerca-menu li[role=option]').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    n_seg1 = pg.locator('.schede-corpo .dt tbody tr').count()
    ok(cs.get_attribute('placeholder') not in ('', 'Tutti i subagenti') and 0 <= n_seg1 <= n_seg0, 'Clienti seguiti: filtro per subagente (%d su %d righe)' % (n_seg1, n_seg0))
    pg.screenshot(path=str(USCITA / 'app-fornitori-filtro-1440.png'))
    cs.click(); fs.locator('.ricerca-menu .link-azzera').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # modifica delle regole
    gi = str(40 + int(RUN) % 50)
    pg.click('button:has-text("Modifica le regole")'); finestra(pg).wait_for()
    vecchio = pg.input_value('#c-giorni_incasso')
    pg.fill('#c-giorni_incasso', gi); pg.click('.modale-piede button[type=submit]')
    finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(500)
    ok(gi in testo(pg, '.dettagli'), 'regole salvate: giorni d’incasso aggiornati nella scheda')
    pg.reload(); pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(400)
    ok(gi in testo(pg, '.dettagli'), 'dopo il ricaricamento il valore resta (%s)' % gi)
    pg.click('button:has-text("Modifica le regole")'); finestra(pg).wait_for()
    pg.fill('#c-giorni_incasso', 'abc'); pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])', timeout=5000)
    ok(finestra(pg).count() == 1, 'valore non numerico: rifiutato dal server, finestra aperta')
    pg.fill('#c-giorni_incasso', vecchio); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached')  # ripristino
    # memoria della schermata: fornitore, ricerca e scheda si ritrovano tornando indietro
    pg.fill('.filtri input[type=search]', 'Gries'); scheda(pg, 'Clienti seguiti'); pg.wait_for_timeout(300)  # il ricaricamento azzera la memoria: si riscrive
    url = pg.url
    vai(pg, "Subagenti"); ok('/subagenti' in pg.url, 'vado a Subagenti')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(500)
    ok(pg.url == url and pg.input_value('.filtri input[type=search]') == 'Gries', 'indietro: stesso fornitore e ricerca ricordata')
    ok(pg.locator('.schede-barra [role=tab][aria-selected=true]:has-text("Clienti seguiti")').count() == 1, 'indietro: stessa scheda')
    # 768 px
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    pg.screenshot(path=str(USCITA / 'app-fornitori-768.png'), full_page=True)
    pg.close()
    # operatore e lettura: niente modifica
    for u in ('oper', 'lett'):
        pg = entra(S + '-' + u); pg.wait_for_timeout(600)
        ok(pg.locator('button:has-text("Modifica le regole")').count() == 0, '%s: Modifica le regole assente' % u)
        pg.close()
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
ok(not errori, 'nessun errore JavaScript')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
