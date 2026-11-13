# Prova della pagina Oggi dell'app (F5-A1, §7.1) con Playwright: riquadri che filtrano, gruppi
# richiudibili, scadenze, ultime operazioni, trimestre in corso, finestra dei solleciti di
# pagamento con copia, avviso *Ci sono aggiornamenti*, 1440 e 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi,
# <s>-lett (password-di-prova, da utenti_prova.js crea <s>).
# Uso: python strumenti/prove/app_oggi.py <suffisso> <cartella schermate> [base]
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
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/')
        pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/'")
        pg.wait_for_selector('.kpi-riga button.kpi')
        pg.wait_for_load_state('networkidle')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    def gruppo(pg, titolo):
        return pg.locator('.gruppo-fare').filter(has=pg.locator('summary', has_text=titolo)).first
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')

    pg = entra(S + '-ammi')
    api = pg.evaluate("async () => (await (await fetch('/api/oggi')).json())")
    ok(testo(pg, '.testa h1') == 'Oggi', 'titolo della pagina: Oggi')
    ok(api['sottotitolo'] in testo(pg, '.testa .sotto'), 'sottotitolo dal server: «%s»' % testo(pg, '.testa .sotto'))
    # §7.9: lettura non configurata → avviso fisso in Oggi, con il collegamento alle Impostazioni
    if not api['lettura_configurata']:
        ok(pg.locator('.avviso-variazioni:has-text("lettura dei documenti non è configurata")').count() == 1,
           'avviso fisso in Oggi: lettura non configurata')
        ok(pg.locator('.avviso-variazioni a[href="/impostazioni"]').count() == 1, 'avviso: collegamento alle Impostazioni')

    kpi = pg.locator('.kpi-riga button.kpi')
    ok(kpi.count() == 4, 'quattro riquadri in testa, cliccabili')
    for i, r in enumerate(api['riquadri']):
        ok(r['valore'] in kpi.nth(i).inner_text(), 'riquadro %s: %s' % (r['etichetta'], r['valore']))

    # gruppi: quelli con contenuto (i documenti ci sono, F6/D-75)
    gruppi = pg.locator('.gruppo-fare')
    ok(gruppi.count() >= 3, 'gruppi Da fare: %d' % gruppi.count())
    gdoc = gruppo(pg, 'Documenti da decidere')
    ok(gdoc.count() == 1 and gdoc.locator('a[href^="/documenti/"]').count() >= 1, 'gruppo Documenti da decidere: le voci aprono il documento')
    gconf = gruppo(pg, 'Conferme in ritardo')
    ok(gconf.count() == 1 and gconf.locator('.giorni').count() >= 1, 'conferme in ritardo con i giorni in evidenza')

    # un clic sul riquadro filtra un solo gruppo; il secondo clic torna a tutti
    pg.locator('.kpi', has_text='Pagamenti dei clienti').click(); pg.wait_for_timeout(300)
    ok(pg.locator('.gruppo-fare:visible').count() == 1, 'clic sul riquadro: resta un solo gruppo')
    ok(pg.locator('.gruppo-fare:visible').first.inner_text().startswith('Pagamenti da sollecitare'), 'è il gruppo Pagamenti da sollecitare')
    pg.locator('.kpi', has_text='Pagamenti dei clienti').click(); pg.wait_for_timeout(300)
    ok(pg.locator('.gruppo-fare:visible').count() == gruppi.count(), 'secondo clic: tornano tutti i gruppi')

    # i gruppi si richiudono
    prima = gconf.get_attribute('open') is not None
    gconf.locator('summary').click(); pg.wait_for_timeout(200)
    ok(prima and gconf.get_attribute('open') is None, 'clic sul gruppo: si richiude')
    gconf.locator('summary').click(); pg.wait_for_timeout(200)

    # colonna destra: scadenze e ultime operazioni
    pg.locator('.schede-barra [role=tab]', has_text='Prossime scadenze').click(); pg.wait_for_timeout(200)
    if api['scadenze']:
        ok(pg.locator('.scadenze li').count() == len(api['scadenze']), 'scadenze: %d voci' % len(api['scadenze']))
        ok('Prossimi 15 giorni' in testo(pg, '.schede-corpo'), 'nota delle scadenze')
    else:
        ok('Nessuna scadenza nei prossimi 15 giorni' in testo(pg, '.schede-corpo'), 'nessuna scadenza nei 15 giorni')
    pg.locator('.schede-barra [role=tab]', has_text='Ultime operazioni').click(); pg.wait_for_timeout(200)
    ok(pg.locator('.schede-corpo .elenco li').count() == len(api['operazioni']), 'ultime operazioni: %d' % len(api['operazioni']))
    if api['operazioni']:
        ok(api['operazioni'][0]['chi'] in testo(pg, '.schede-corpo .elenco'), 'ogni operazione dice chi e quando')

    # trimestre in corso
    trim = pg.locator('.pannello').filter(has=pg.locator('h2', has_text='trimestre')).last
    ok(trim.count() == 1 and ('%d° trimestre %d' % (api['trimestre']['trimestre'], api['trimestre']['anno'])) in trim.inner_text(), 'riquadro del trimestre in corso')
    ok(trim.locator('.cifre div').count() == 4, 'trimestre: i quattro numeri')
    ok(trim.locator('a:has-text("Apri liquidazione")').count() == 1, 'trimestre: Apri liquidazione')

    # §15.6: il contatore Errori di oggi c'è per l'amministratore e porta al registro filtrato
    err = api.get('errori_oggi')
    ok(bool(err), 'amministratore: Oggi riporta errori_oggi')
    riq = pg.locator('.pannello').filter(has=pg.locator('h2', has_text='Errori di oggi'))
    if err:
        ok(riq.count() == 1, 'riquadro Errori di oggi')
        ok(str(err['conteggio']) in riq.inner_text(), 'conteggio errori di oggi: %d' % err['conteggio'])
        ok(riq.locator('a:has-text("Apri il registro")').get_attribute('href') == '/registro?da=oggi', 'il collegamento apre /registro?da=oggi')

    pg.screenshot(path=str(USCITA / 'app-oggi-1440.png'), full_page=True)

    # finestra dei solleciti di pagamento, aperta dal gruppo
    gp = gruppo(pg, 'Pagamenti da sollecitare')
    gp.locator('button:has-text("Prepara i solleciti")').click()
    pg.wait_for_selector('.modale')
    ok(testo(pg, '.modale h2') == 'Solleciti di pagamento', 'si apre la finestra Solleciti di pagamento')
    pag = pg.evaluate("async () => (await (await fetch('/api/pagamenti/solleciti')).json())")
    ok(pg.locator('.solleciti-schede [role=tab]').count() == len(pag['per_cliente']), 'una scheda per cliente: %d' % len(pag['per_cliente']))
    primo = pag['voci'][0]['numero']
    ok(primo in pg.locator('.testo-email').input_value(), 'il testo contiene la fattura %s' % primo)
    pg.screenshot(path=str(USCITA / 'app-oggi-solleciti-1440.png'))
    pg.locator('.modale-piede button:has-text("Copia il testo")').click(); pg.wait_for_timeout(700)
    ok('copiato' in testo(pg, '.avviso'), 'Copia il testo: avviso di conferma')
    ok(pg.locator('.solleciti-schede [role=tab]:has-text("✓")').count() >= 1, 'la scheda copiata prende la spunta')
    pg.locator('.modale-piede button:has-text("Chiudi")').click(); pg.wait_for_timeout(300)

    # D-23: la copia scrive un evento; i contatori si aggiornano da soli, i gruppi restano e compare Aggiorna
    pg.wait_for_selector('.aggiornamenti', timeout=15000)
    ok(pg.locator('.aggiornamenti').count() == 1, 'dopo un evento compare «Ci sono aggiornamenti · Aggiorna»')
    pg.locator('.aggiornamenti button').click(); pg.wait_for_timeout(500)
    ok(pg.locator('.aggiornamenti').count() == 0, 'Aggiorna applica i dati e toglie la barra')

    # 768 px: niente scorrimento orizzontale
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    ok(pg.locator('.kpi-riga button.kpi').count() == 4, '768 px: i quattro riquadri restano leggibili')
    ok(pg.locator('.gruppo-fare').first.is_visible(), '768 px: i gruppi restano visibili')
    pg.screenshot(path=str(USCITA / 'app-oggi-768.png'), full_page=True)
    gruppo(pg, 'Pagamenti da sollecitare').locator('button:has-text("Prepara i solleciti")').click()
    pg.wait_for_selector('.solleciti-schede'); pg.wait_for_timeout(300)
    ok(not pg.evaluate("document.querySelector('.modale').scrollWidth > document.querySelector('.modale').clientWidth"), '768 px: la finestra dei solleciti non scorre di lato')
    pg.screenshot(path=str(USCITA / 'app-oggi-solleciti-768.png'))
    pg.locator('.modale-piede button:has-text("Chiudi")').click(); pg.wait_for_timeout(200)
    pg.close()

    # lettura: consulta la pagina; i solleciti di conferma (copia) restano, quelli dei pagamenti no
    pg = entra(S + '-lett')
    ok(pg.locator('.kpi-riga button.kpi').count() == 4, 'lettura: la pagina Oggi si consulta')
    ok(pg.evaluate("async () => (await (await fetch('/api/oggi')).json()).errori_oggi") is None, 'lettura: il server non manda errori_oggi')
    ok(pg.locator('.pannello').filter(has=pg.locator('h2', has_text='Errori di oggi')).count() == 0, 'lettura: niente riquadro Errori di oggi')
    gp = gruppo(pg, 'Pagamenti da sollecitare')
    ok(gp.locator('button:has-text("Prepara i solleciti")').count() == 0, 'lettura: niente solleciti di pagamento (scrivono)')
    gconf = gruppo(pg, 'Conferme in ritardo')
    if gconf.count():
        ok(gconf.locator('button:has-text("Prepara i solleciti")').count() == 1, 'lettura: i solleciti di conferma (sola copia) restano')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
