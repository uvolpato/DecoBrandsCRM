# Prova della pagina Subagenti dell'app (F1-A2), con Playwright: elenco, ricerca e segmenti, scheda, nuovo subagente,
# codice doppio, modifica, disattiva e riattiva, eliminazione (rifiutata se ha agenzie), memoria della schermata, 768 px,
# operatore senza comandi. Il subagente creato (codice P<numero>) viene eliminato alla fine.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Nel database di prova c'è SUB01 Bastasin con agenzie.
# Uso: python strumenti/prove/app_subagenti.py <suffisso> <cartella schermate> [base]
import sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW, RUN = 'password-di-prova', str(int(time.time()))[-6:]
COD = 'P' + RUN
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
        pg.goto(BASE + '/subagenti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/subagenti')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')
    seg = lambda pg, t: pg.locator('.segmenti [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    cerca = lambda pg, t: (pg.fill('.filtri input[type=search]', t), pg.wait_for_timeout(300))
    def vai(pg, voce):  # voce del menu: navigazione dentro l'app, senza ricaricare
        pg.click('.barra a.voce:has-text("%s")' % voce); pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower()); pg.wait_for_load_state('networkidle')
    def modulo(pg, **v):
        for k, x in v.items(): pg.fill('#c-' + k, x)
    def invia(pg): pg.click('.modale-piede button[type=submit]')
    def avviso(pg): pg.evaluate("document.querySelector('.avviso')?.remove()"); pg.wait_for_selector('.avviso'); return pg.locator('.avviso').inner_text()

    pg = entra(S + '-ammi')
    ok('Subagenti' in testo(pg, '.testa h1'), 'titolo della pagina')
    n_tutti = int(seg(pg, 'Tutti').locator('.n').inner_text())
    ok(n_tutti >= 4, 'elenco: %d subagenti' % n_tutti)
    seg(pg, 'Tutti').click(); pg.wait_for_timeout(200)
    cerca(pg, 'Nista')
    ok(righe(pg) == 1 and seg(pg, 'Tutti').locator('.n').inner_text() == '1', 'ricerca per cognome: una riga, il numero del segmento segue (D-23)')
    cerca(pg, 'zzzz-nessuno'); ok(righe(pg) == 0, 'ricerca senza risultati: elenco vuoto')
    cerca(pg, '')
    pg.click('.dt tbody tr.cliccabile:has-text("Bastasin")'); pg.wait_for_function("/^\\/subagenti\\/\\d+/.test(location.pathname)"); pg.wait_for_timeout(400)
    ok('Bastasin' in testo(pg, '.pannello-testa h2') and 'SUB01' in testo(pg, '.dettagli') and pg.locator('.dt tbody tr.selezionata').count() == 1, 'scheda Dati del subagente: codice, riga evidenziata')
    pg.screenshot(path=str(USCITA / 'app-subagenti-1440.png'))

    # Eccezioni personali (D-51): elenco con periodo, aggiunta, periodo sovrapposto, modifica, eliminazione
    pg.click('.schede-barra [role=tab]:has-text("Eccezioni personali")'); pg.wait_for_timeout(400)
    ok(pg.locator('.elenco li:has-text("Gries")').count() >= 1 and 'invece di' in testo(pg, '.elenco') and 'dal 01/01/2025' in testo(pg, '.elenco'),
       'eccezioni: fornitore, sconto, percentuale standard e periodo')
    def nuova_eccezione(pct, dal):
        pg.click('button:has-text("Aggiungi eccezione")'); finestra(pg).wait_for()
        pg.fill('.velo .modale .campo-ricerca input.ricerca-testo', 'Gasper')
        pg.locator('.velo .modale .ricerca-menu li[role=option]:has-text("Gasper")').first.click()
        pg.wait_for_function("document.querySelectorAll('.velo .modale select[name=sconto] option').length > 1")
        pg.select_option('#c-sconto', index=1); pg.fill('#c-pct_personale', pct); pg.fill('#c-valido_dal', dal)
        pg.click('.modale-piede button[type=submit]')
    nuova_eccezione('8', '2050-01-01'); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(700)
    riga = pg.locator('.elenco li:has-text("Gasper")')
    ok(riga.count() == 1 and '2050' in riga.inner_text(), 'eccezione aggiunta: compare con il suo periodo')
    nuova_eccezione('7', '2051-01-01'); pg.wait_for_selector('.modulo-errore:not([hidden])', timeout=5000)
    ok('sovrapposto' in testo(pg, '.modulo-errore'), 'periodo sovrapposto: il 409 del server si vede nella finestra')
    pg.click('.velo .modale-piede button:has-text("Annulla")'); finestra(pg).wait_for(state='detached')
    pg.click('.elenco li:has-text("Gasper")'); pg.wait_for_selector('.velo .modale')
    pg.click('.velo .modale button:has-text("Modifica")'); pg.wait_for_selector('.velo .modale #c-pct_personale')
    pg.fill('#c-pct_personale', '6.5'); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(700)
    ok('6,5%' in pg.locator('.elenco li:has-text("Gasper")').inner_text(), 'eccezione modificata: nuova percentuale')
    pg.click('.elenco li:has-text("Gasper")'); pg.wait_for_selector('.velo .modale')
    pg.click('.velo .modale button.pericolo'); pg.wait_for_selector('.velo .modale h2:has-text("Eliminare l’eccezione")')
    pg.click('.velo .casella-grave input')
    pg.click('.velo .modale-piede button.pericolo'); pg.wait_for_function("() => ![...document.querySelectorAll('.elenco li')].some(l => l.textContent.includes('Gasper'))")
    ok(pg.locator('.elenco li:has-text("Gasper")').count() == 0, 'eccezione eliminata')
    pg.click('.schede-barra [role=tab]:has-text("Dati")'); pg.wait_for_timeout(300)

    # eliminare chi ha agenzie: rifiutato
    pg.click('.testa-azioni button:has-text("Elimina"), .pannello-testa button:has-text("Elimina")'); pg.wait_for_selector('.velo .modale')
    pg.click('.velo .casella-grave input')
    pg.click('.velo .modale button.pericolo, .velo .modale button:has-text("Elimina")')
    m = avviso(pg)
    ok('abbinamenti' in m and righe(pg) >= 4 and 'Bastasin' in testo(pg, '.pannello-testa h2'), 'elimina chi ha agenzie: rifiutato col messaggio («%s»)' % m)

    # nuovo subagente: campi mancanti, codice doppio, poi creazione
    pg.click('.testa-azioni button:has-text("Nuovo subagente")'); finestra(pg).wait_for()
    # il campo mostra il nome dell'agente quando le voci arrivano dal server (D-161: mai l'id)
    pg.wait_for_function("document.querySelector('#c-agente_id') && document.querySelector('#c-agente_id').value !== ''", timeout=5000)
    ok(pg.input_value('#c-agente_id') != '', 'nuovo: l’agente è già proposto')
    invia(pg); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok(finestra(pg).count() == 1 and 'Scrivi' in testo(pg, '.modulo-errore'), 'nuovo senza dati: messaggio del server, finestra aperta')
    modulo(pg, codice='SUB01', nome='Prova', cognome='Creato' + RUN, email=S + '-sub' + RUN + '@prova-e2e.it'); invia(pg)
    pg.wait_for_function("document.querySelector('.modulo-errore') && !document.querySelector('.modulo-errore').hidden && document.querySelector('.modulo-errore').textContent.includes('già')")
    ok(finestra(pg).count() == 1, 'codice già usato: messaggio «%s»' % testo(pg, '.modulo-errore'))
    modulo(pg, codice=COD); invia(pg); finestra(pg).wait_for(state='detached')
    pg.wait_for_selector('.pannello-testa h2:has-text("Creato%s")' % RUN)
    ok(COD in testo(pg, '.dettagli') and 'non attivo' not in testo(pg, '.dettagli').lower() and ('/subagenti/' in pg.url), 'creato: scheda aperta, codice %s, attivo' % COD)
    # modifica
    pg.click('.testa-azioni button:has-text("Modifica"), .pannello-testa button:has-text("Modifica")'); finestra(pg).wait_for()
    ok(pg.input_value('#c-codice') == COD, 'modifica: il modulo parte dai valori attuali')
    modulo(pg, nome='Modificato'); invia(pg); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(500)
    ok('Modificato' in testo(pg, '.pannello-testa h2'), 'modificato: nome aggiornato')
    pg.reload(); pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(300)
    ok('Modificato' in testo(pg, '.dettagli'), 'dopo il ricaricamento la modifica resta')
    # disattiva e riattiva
    pg.click('.pannello-testa button:has-text("Disattiva")'); pg.wait_for_selector('.pannello-testa button:has-text("Riattiva")')
    ok('non attivo' in testo(pg, '.dettagli').lower(), 'disattivato: stato Non attivo')
    seg(pg, 'Disattivati').click(); pg.wait_for_selector('.dt tbody tr.cliccabile:has-text("%s")' % COD)
    ok(pg.locator('.dt tbody tr.cliccabile:has-text("%s")' % COD).count() == 1, 'segmento Disattivati: compare il subagente')
    pg.click('.pannello-testa button:has-text("Riattiva")'); pg.wait_for_selector('.pannello-testa button:has-text("Disattiva")')
    ok('non attivo' not in testo(pg, '.dettagli').lower(), 'riattivato')

    # memoria della schermata: subagente e ricerca si ritrovano tornando indietro
    seg(pg, 'Tutti').click(); cerca(pg, COD)
    pg.click('.dt tbody tr.cliccabile'); pg.wait_for_timeout(300)
    url = pg.url
    vai(pg, 'Fornitori'); ok('/fornitori' in pg.url, 'vado a Fornitori')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(500)
    ok(pg.url == url and pg.input_value('.filtri input[type=search]') == COD and seg(pg, 'Tutti').get_attribute('aria-selected') == 'true',
       'indietro: stesso subagente, ricerca e segmento ricordati')
    # elimina quello creato (non ha agenzie)
    pg.click('.pannello-testa button:has-text("Elimina")'); pg.wait_for_selector('.velo .modale')
    pg.click('.velo .casella-grave input')
    pg.click('.velo .modale button.pericolo, .velo .modale button:has-text("Elimina")')
    pg.wait_for_function("!document.body.innerText.includes('%s')" % COD, timeout=8000)
    ok(True, 'eliminato il subagente di prova')
    # 768 px
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    cerca(pg, ''); pg.click('.dt tbody tr.cliccabile:has-text("Nista")'); pg.wait_for_timeout(400)
    pg.screenshot(path=str(USCITA / 'app-subagenti-768.png'), full_page=True)
    pg.close()
    for u, atteso in (('oper', 1), ('lett', 0)):  # l'operatore può modificare i subagenti (dati.modifica), la lettura no
        pg = entra(S + '-' + u); pg.wait_for_timeout(600)
        ok(pg.locator('.testa-azioni button:has-text("Nuovo subagente")').count() == atteso and pg.locator('.pannello-testa button:has-text("Elimina")').count() == atteso,
           '%s: comandi di modifica %s' % (u, 'presenti' if atteso else 'assenti'))
        pg.click('.schede-barra [role=tab]:has-text("Eccezioni personali")'); pg.wait_for_timeout(400)
        ok(pg.locator('button:has-text("Aggiungi eccezione")').count() == 0, '%s: Aggiungi eccezione assente (serve dati.condizioni)' % u)
        pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
