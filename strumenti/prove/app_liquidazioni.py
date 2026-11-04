# Prova della pagina Liquidazioni dell'app (F4-A1), con Playwright: la rotta corta, i quattro trimestri,
# l'elenco dei subagenti che fa da filtro, i documenti con lo stato deciso dal server (compresa una riga in
# attesa), il rifiuto della chiusura, la verifica del bollettino che la sblocca, la chiusura con la fotografia,
# il ritorno nello stesso punto (§7.12), le sagome (D-59), la sola lettura e i 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti <s>-ammi, <s>-oper, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>), sul database di prova con il seed.
# Il seed deve essere pulito: la prova verifica il bollettino di luglio di Gries e chiude il 3° trimestre 2026,
# quindi va rilanciato il seed dopo.
# Uso: python strumenti/prove/app_liquidazioni.py <suffisso> <cartella schermate> [base]
import re
import sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8101'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def numero(testo):
    return float(re.sub(r'[^\d,-]', '', testo).replace('.', '').replace(',', '.'))
def piatto(t):
    return ' '.join(t.replace(chr(160), ' ').split())

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def apri(pg):
        pg.wait_for_selector('.accesso-scena')
        if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
        pg.wait_for_selector('.accesso-scena.aperta')

    def entra(utente, larghezza=1440, attese=None):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        if attese: pg.route('**/api/liquidazioni?*', attese)
        pg.goto(BASE + '/liquidazioni'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/liquidazioni')")
        return pg

    testo = lambda pg, s: pg.locator(s).first.inner_text()
    periodi = lambda pg: pg.locator('.periodi a')
    pannelli = lambda pg: pg.locator('.colonne .pannello')
    subagenti = lambda pg: pannelli(pg).first.locator('.dt tbody tr')
    destra = '.colonne > div > .pannello '
    documenti = lambda pg: pg.locator(destra + '.schede-corpo .dt tbody tr')
    scheda_documenti = lambda pg: pg.locator(destra + '.schede-barra [role=tab]').first

    def attesa(pg):
        pg.wait_for_timeout(500)

    def quieta(pg):
        pg.wait_for_function("() => document.querySelector('.periodi a.attivo') && !document.querySelector('.colonne .dt[aria-busy=true]')")

    def chiama(pg, metodo, percorso, corpo=None):
        csrf = pg.request.get(BASE + '/api/accesso/io').json()['csrf']
        return pg.request.fetch(BASE + '/api/' + percorso, method=metodo, headers={'x-csrf-token': csrf}, data=corpo or {})

    pg = entra(S + '-ammi')
    # la rotta corta porta al trimestre di oggi (§7.8)
    pg.wait_for_function("() => /^\\/liquidazioni\\/\\d{4}\\/[1-4]$/.test(location.pathname)")
    ok(True, 'la rotta /liquidazioni rimanda a /liquidazioni/<anno>/<trimestre>: %s' % pg.evaluate('location.pathname'))

    pg.goto(BASE + '/liquidazioni/2026/3'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    ok('Liquidazioni' in testo(pg, '.testa h1'), 'titolo della pagina')
    ok(periodi(pg).count() == 4, 'quattro riquadri dei trimestri')
    ok(periodi(pg).nth(2).get_attribute('aria-current') == 'page', 'il 3° trimestre è quello attivo')
    ok('Da liquidare' in testo(pg, '.periodi a.attivo'), 'stato del trimestre: da liquidare')
    ok('Liquidata il 10/04/2026' in testo(pg, '.periodi'), '1° trimestre: liquidato (fotografia)')
    pg.screenshot(path=str(USCITA / 'app-liquidazioni-1440.png'))

    # elenco subagenti: fa da filtro, riga totale e nota con i conteggi
    ok(subagenti(pg).count() == 4, 'subagenti con documenti: 4 righe')
    ok('4 con documenti' in testo(pg, '.colonne > .pannello .pannello-nota'), 'testata dei subagenti: quanti con documenti e quanti senza')
    ok(numero(testo(pg, '.colonne > .pannello tfoot td.dx')) == 1986.38, 'totale da liquidare: 1.986,38 €')
    ok('Totale da liquidare' in testo(pg, destra + '.pannello-nota'), 'pannello: totale da liquidare e documenti in attesa')

    # documenti: numero nella scheda, giallo con una riga in attesa, stato deciso dal server
    ok(scheda_documenti(pg).inner_text().split('\n')[0] == 'Documenti' and scheda_documenti(pg).locator('.schede-conta').inner_text() == '10',
       'scheda Documenti: 10 documenti')
    ok('c-attesa' in (scheda_documenti(pg).locator('.schede-conta').get_attribute('class') or ''), 'documenti in attesa: numero giallo')
    ok(documenti(pg).count() == 10, 'tabella documenti: 10 righe')
    riga = pg.locator(destra + '.schede-corpo .dt tbody tr', has_text='F-2026-0891')
    ok('In attesa' in riga.inner_text() and 'Il bollettino di luglio di Gries GmbH & Co. KG non è ancora verificato' in piatto(riga.inner_text()),
       'riga in attesa con il motivo')
    ok(pg.locator(destra + '.schede-corpo .dt tbody tr', has_text='Liquidabile').count() == 8, 'righe liquidabili: 8')
    ok(pg.locator(destra + '.schede-corpo .dt tbody a').count() == 10, 'ogni documento porta alla pratica')

    # clic su un subagente: filtra; di nuovo: tutti (D-18)
    marco = subagenti(pg).filter(has_text='Marco Nista').first
    marco.click(); attesa(pg)
    ok('selezionata' in (marco.get_attribute('class') or '') and documenti(pg).count() == 2 and scheda_documenti(pg).locator('.schede-conta').inner_text() == '2',
       'clic su un subagente: solo i suoi documenti')
    ok('Tutti i subagenti' not in testo(pg, destra + '.pannello-testa h2'), 'il pannello prende il nome del subagente scelto')
    analisi = pg.locator(destra + '.pannello-destra a', has_text='Analisi completa')
    href = analisi.get_attribute('href')
    ok(analisi.count() == 1 and href.startswith('/analisi?dal=2026-07&al=2026-09&subagenti='),
       'Analisi completa: trimestre e subagente scelto (%s)' % href)
    marco.click(); attesa(pg)
    ok(documenti(pg).count() == 10 and scheda_documenti(pg).locator('.schede-conta').inner_text() == '10', 'di nuovo sul subagente: tornano tutti')

    # il link arriva all'Analisi con il trimestre e il subagente (F4-A5 legge i parametri dall'indirizzo)
    pg.goto(BASE + href)
    pg.wait_for_function("document.querySelector('.periodo-btn') && document.querySelector('.periodo-btn').textContent.includes('lug 2026')")
    ok('lug 2026' in testo(pg, '.periodo-btn') and 'set 2026' in testo(pg, '.periodo-btn'),
       'Analisi completa: il trimestre diventa il periodo')
    ok('Nista' in (pg.locator('.barra-analisi .filtro-ricerca .ricerca-testo').nth(1).get_attribute('placeholder') or ''),
       'Analisi completa: il subagente scelto è nel filtro')
    ok('dal=' not in pg.url, 'i parametri spariscono dall’indirizzo')
    pg.goto(BASE + '/liquidazioni/2026/3'); attesa(pg)

    # chiusura rifiutata: pulsante spento con il motivo e 409 dal server
    chiudi = pg.locator('.testa-azioni button:has-text("Chiudi il trimestre")')
    ok(chiudi.count() == 1 and chiudi.is_disabled() and 'in attesa dei bollettini' in (chiudi.get_attribute('title') or ''),
       'chiusura spenta: il motivo è nei documenti in attesa')
    rifiuto = chiama(pg, 'POST', 'liquidazioni/2026/3/chiudi')
    ok(rifiuto.status == 409 and 'in attesa dei bollettini' in rifiuto.json()['message'],
       'il server rifiuta la chiusura: 409 (%s)' % rifiuto.json()['message'])

    # la riga in attesa si sblocca verificando il bollettino di luglio di Gries: qui si passa dagli stessi pulsanti
    celle = pg.request.get(BASE + '/api/bollettini?al=2026-07').json()['fornitori']
    gries = next(f for f in celle if 'Gries' in f['fornitore'])
    bocca = next(c for c in gries['celle'] if c['mese'] == '2026-07')['bollettino_id']
    ok(bocca is not None, 'bollettino di luglio di Gries da verificare')
    pg.goto(BASE + '/bollettini/' + str(bocca)); pg.wait_for_selector('.cerniera')
    decidi = pg.locator('.c-riga', has_text='importo diverso').first
    decidi.locator('button', has_text='Accetta il loro importo').first.click()
    pg.wait_for_selector('.velo .modale-piede button:has-text("Conferma")')
    pg.click('.velo .modale-piede button:has-text("Conferma")')
    pg.wait_for_function("!document.querySelector('.velo')"); attesa(pg)
    pg.click('.barra-decisione button:has-text("Segna come verificato")')
    pg.wait_for_selector('.velo .modale-piede button:has-text("Segna come verificato")')
    pg.click('.velo .modale-piede button:has-text("Segna come verificato")')
    pg.wait_for_function("document.querySelector('.testa .stato') && document.querySelector('.testa .stato').innerText === 'Verificato'")
    attesa(pg)

    # tornati sulla liquidazione: niente più righe in attesa e la chiusura è possibile
    pg.goto(BASE + '/liquidazioni/2026/3'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    ok(numero(testo(pg, '.colonne > .pannello tfoot td.dx')) == 2492.18, 'dopo la verifica il totale liquidabile è 2.492,18 €')
    ok(pg.locator('.stato.s-attesa').count() == 0 and not pg.locator('.testa-azioni button:has-text("Chiudi il trimestre")').is_disabled(),
       'nessun documento in attesa: Chiudi il trimestre è attivo')
    pg.screenshot(path=str(USCITA / 'app-liquidazioni-pronta-1440.png'))

    # chiusura: conferma con importo e subagenti, poi la pagina legge la fotografia
    pg.click('.testa-azioni button:has-text("Chiudi il trimestre")')
    pg.wait_for_selector('.velo .modale-piede button:has-text("Chiudi il trimestre")')
    conferma = piatto(testo(pg, '.velo .modale-testa'))
    ok('Chiudere la liquidazione del 3° trimestre?' in conferma and '2.492,18 €' in conferma and '4 subagenti' in conferma,
       'conferma con importo e numero di subagenti')
    pg.click('.velo .modale-piede button:has-text("Chiudi il trimestre")')
    pg.wait_for_function("!document.querySelector('.velo')")
    pg.wait_for_function("document.querySelector('.testa-azioni button') && document.querySelector('.testa-azioni button').innerText === 'Liquidazione chiusa'")
    attesa(pg)
    ok('Liquidazione chiusa' in testo(pg, '.testa-azioni') and pg.locator('.testa-azioni button').is_disabled(), 'dopo la chiusura il pulsante dice Liquidazione chiusa ed è spento')
    ok(re.search(r'Liquidazione chiusa il \d{2}/\d{2}/\d{4} da Prova Ammi', testo(pg, '.nota')) is not None, 'la pagina dice chi l’ha chiusa e quando')
    ok('Liquidata il' in testo(pg, '.periodi a.attivo'), 'il riquadro del trimestre passa a Liquidata')
    ok(pg.locator(destra + '.schede-corpo .dt tbody .stato.s-ok', has_text='Liquidata').count() == 10, 'i documenti sono tutti Liquidata')
    ok(documenti(pg).count() == 10, 'la fotografia ha le sue 10 righe')

    # trimestre chiuso da prima (2° 2026): si legge dalla fotografia, niente riapertura
    periodi(pg).nth(1).click(); pg.wait_for_function("location.pathname === '/liquidazioni/2026/2'"); quieta(pg)
    ok('Liquidata il 10/07/2026' in testo(pg, '.periodi a.attivo') and pg.locator('.testa-azioni button').is_disabled(),
       '2° trimestre: chiuso, si legge dalla fotografia')

    # ritorno allo stesso punto (§7.12): subagente scelto, si va via e si torna
    pg.goto(BASE + '/liquidazioni/2026/3'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    subagenti(pg).filter(has_text='Marco Nista').first.click(); attesa(pg)
    pg.click('.barra a.voce:has-text("Pratiche")'); pg.wait_for_url('**/pratiche')
    pg.click('.barra a.voce:has-text("Liquidazioni")')
    pg.wait_for_function("() => /^\\/liquidazioni\\/\\d{4}\\/[1-4]/.test(location.pathname)"); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    periodi(pg).nth(2).click(); pg.wait_for_function("location.pathname === '/liquidazioni/2026/3'"); quieta(pg)
    ok('selezionata' in (subagenti(pg).filter(has_text='Marco Nista').first.get_attribute('class') or '')
       and scheda_documenti(pg).locator('.schede-conta').inner_text() == '2',
       'ritorno: il subagente scelto è ancora quello')

    # 768 px: niente scorrimento di lato
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '768 px: nessuno scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'app-liquidazioni-768.png'), full_page=True)
    pg.close()

    # sagome durante il caricamento (D-59): il server risponde dopo mezzo secondo
    def ritarda(route):
        time.sleep(0.6); route.continue_()
    pg = entra(S + '-oper', attese=ritarda)
    pg.goto(BASE + '/liquidazioni/2026/3')
    pg.wait_for_selector('.sagoma')
    ok(pg.locator('.sagoma').count() > 0 and pg.locator('.periodi a').count() == 0, 'sagome durante il caricamento')
    pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    ok(pg.locator('.sagoma').count() == 0 and periodi(pg).count() == 4, 'dati arrivati: sagome sparite')
    pg.close()

    # sola lettura: consulta, ma non chiude
    pg = entra(S + '-lett')
    pg.goto(BASE + '/liquidazioni/2026/3'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    chiudi = pg.locator('.testa-azioni button')
    ok(pg.evaluate("document.body.classList.contains('sola-lettura')") and chiudi.is_disabled()
       and 'Serve il livello responsabile' in (chiudi.get_attribute('title') or ''),
       'sola lettura: i documenti si vedono, la chiusura no')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
