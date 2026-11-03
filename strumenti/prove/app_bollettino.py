# Prova della pagina Bollettino (F3-A2), con Playwright: cerniera e gruppi, totali e azione, decisioni
# accettato/contestato, documento mancante con attesa e annullamento, abbinamento a mano con doppione,
# chiusura e sola lettura, PDF affiancato, ritorno alla matrice nello stesso punto.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti f3-ammi, f3-oper, f3-lett
# (password-di-prova). Il seed deve essere pulito: la prova chiude Gasper agosto e carica un bollettino,
# quindi va rilanciato il seed dopo.
# Uso: python strumenti/prove/app_bollettino.py <suffisso> <cartella schermate> [base]
import sys, pathlib, re
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8031'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def numero(testo):
    return float(re.sub(r'[^\d,-]', '', testo).replace('.', '').replace(',', '.'))

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/bollettini'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/bollettini'")
        pg.wait_for_selector('.matrice')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    tot = lambda pg, s: numero(testo(pg, s))
    riga_testo = lambda pg, t: pg.locator('.c-riga', has_text=t).first
    gruppo = lambda pg, t: pg.locator('.c-gruppo', has_text=t).first
    n_gruppo = lambda pg, t: int(gruppo(pg, t).locator('.stato').inner_text()) if gruppo(pg, t).count() else 0
    attesa = lambda pg: pg.wait_for_timeout(900)

    def id_bollettino(pg, fornitore, mese):
        r = pg.request.get(BASE + '/api/bollettini?al=' + mese)
        for f in r.json()['fornitori']:
            if fornitore.lower() in f['fornitore'].lower():
                c = next((x for x in f['celle'] if x['mese'] == mese), None)
                return c and c['bollettino_id']
        return None

    def decidi(pg, riga, azione, conferma):
        riga.locator('button', has_text=azione).first.click()
        pg.wait_for_selector('.velo .modale-piede button:has-text("%s")' % conferma)
        pg.click('.velo .modale-piede button:has-text("%s")' % conferma)
        pg.wait_for_function("!document.querySelector('.velo')")
        pg.wait_for_timeout(400)

    def abbina(pg, riga, documento, conferma=True):
        riga.locator('button', has_text='Abbina il documento').first.click()
        pg.wait_for_selector('.velo form')
        campo = pg.locator('.velo .ricerca .ricerca-testo').first
        campo.fill(documento); pg.wait_for_timeout(300); campo.press('Enter'); pg.wait_for_timeout(200)
        if conferma: pg.click('.velo .modale-piede button:has-text("Abbina")')
    def apri_gruppo(pg, titolo):
        det = gruppo(pg, titolo).locator('xpath=ancestor::details[1]')
        if det.count() and not det.get_attribute('open'):
            gruppo(pg, titolo).click(); pg.wait_for_timeout(200)

    # --- ritorno alla matrice nello stesso punto (§7.12) ---
    pg = entra(S + '-ammi')
    fb = pg.locator('.barra-periodo')
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click(); fb.locator('.ricerca-menu li[role=option]', has_text='Gasper').first.click()
    pg.keyboard.press('Escape'); pg.wait_for_timeout(900)
    periodo = testo(pg, '.periodo-btn')
    cella = pg.locator('.matrice a.m-cella').first
    cella.click(); pg.wait_for_selector('.cerniera')
    ok('Gasper' in testo(pg, '.testa h1'), 'clic sulla cella: si apre il bollettino')
    pg.go_back(); pg.wait_for_selector('.matrice'); pg.wait_for_timeout(900)
    ok(periodo == testo(pg, '.periodo-btn') and 'Gasper' in (campo.get_attribute('placeholder') or ''),
       'indietro: periodo e filtro Gasper come prima')
    pg.close()

    # --- Gries luglio: doppione nell\'abbinamento e decisione accettato su una differenza ---
    pg = entra(S + '-ammi')
    gries = id_bollettino(pg, 'Gries', '2026-07')
    pg.goto(BASE + '/bollettini/' + gries); pg.wait_for_selector('.cerniera')
    ok(tot(pg, '.cerniera-riepilogo .lato b') == 2228.10 and tot(pg, '.cerniera-riepilogo .lato.destro b') == 2260.80
       and tot(pg, '.cerniera-riepilogo .cucitura b') == -32.70, 'Gries luglio: totali 2.228,10 / 2.260,80 / -32,70')
    ok(n_gruppo(pg, 'Da decidere') == 1 and n_gruppo(pg, 'Quadrano') == 1, 'Gries luglio: 1 da decidere, 1 che quadra')
    ok('1 riga da decidere' in testo(pg, '.barra-decisione') and pg.locator('.barra-decisione button').first.is_disabled(),
       'azione proposta: riga da decidere e chiusura spenta')
    diff = riga_testo(pg, 'importo diverso')
    abbina(pg, diff, 'F-2026-0891')
    pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('già sulla riga' in testo(pg, '.modulo-errore'), 'abbinamento a un documento già usato: errore visibile')
    pg.click('.velo .modale-piede button:has-text("Annulla")'); pg.wait_for_timeout(300)
    decidi(pg, diff, 'Accetta il loro importo', 'Conferma')
    ok(n_gruppo(pg, 'Decise') == 1 and n_gruppo(pg, 'Da decidere') == 0, 'accettato: la riga passa fra le decise')
    ok('Tutte le righe sono quadrate o decise' in testo(pg, '.barra-decisione')
       and not pg.locator('.barra-decisione button').first.is_disabled(), 'dopo la decisione la verifica è attiva')
    pg.close()

    # --- Gasper agosto: mancante, abbinamento D→E, chiusura verificato ---
    pg = entra(S + '-ammi')
    gasper = id_bollettino(pg, 'Gasper', '2026-08')
    pg.goto(BASE + '/bollettini/' + gasper); pg.wait_for_selector('.cerniera')
    ok('Gasper' in testo(pg, '.testa h1') and 'agosto 2026' in testo(pg, '.testa h1') and 'Da verificare' in testo(pg, '.testa h1'),
       'testata: fornitore, mese e badge Da verificare')
    ok(tot(pg, '.cerniera-riepilogo .lato b') == 394.80 and tot(pg, '.cerniera-riepilogo .lato.destro b') == 3349.38
       and tot(pg, '.cerniera-riepilogo .cucitura b') == -2954.58, 'Gasper agosto: totali 394,80 / 3.349,38 / -2.954,58')
    ok(n_gruppo(pg, 'Da decidere') == 1 and n_gruppo(pg, 'Quadrano') == 1 and n_gruppo(pg, 'Incassi') == 1,
       'gruppi: 1 da decidere, 1 che quadra, 1 incasso')
    ok(pg.locator('object[type="application/pdf"]').count() == 0 and 'nessun file allegato' in testo(pg, '.testa'),
       'senza PDF: la pagina lo dice e non mostra il riquadro')
    pg.screenshot(path=str(USCITA / 'app-bollettino-1440.png'))
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(500)
    pg.screenshot(path=str(USCITA / 'app-bollettino-cerniera-768.png'), full_page=True)
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(300)

    # documento mancante: Attendi il prossimo, poi annullamento
    mancante = riga_testo(pg, 'F-2026-0933')
    decidi(pg, mancante, 'Attendi il prossimo', 'Conferma')
    ok(n_gruppo(pg, 'Da decidere') == 0 and n_gruppo(pg, 'Decise') == 1, 'attesa sul mancante: passa fra le decise')
    riga_testo(pg, 'F-2026-0933').locator('button', has_text='Annulla').first.click(); attesa(pg)
    ok(n_gruppo(pg, 'Da decidere') == 1 and n_gruppo(pg, 'Decise') == 0, 'annullata la decisione: torna da decidere')

    # abbinamento a mano: la riga F-2026-0921 va sul documento F-2026-0933 che mancava (D-56)
    apri_gruppo(pg, 'Quadrano')
    abbina(pg, riga_testo(pg, 'F-2026-0921'), 'F-2026-0933')
    attesa(pg)
    ok(n_gruppo(pg, 'Da decidere') == 2 and riga_testo(pg, 'importo diverso').count() == 1
       and riga_testo(pg, 'manca nel bollettino').count() == 1, 'abbinata: la vecchia riga torna mancante, la nuova è a confronto')

    # chiudere con righe aperte: la chiusura è spenta (il server rifiuterebbe)
    ok('2 righe da decidere' in testo(pg, '.barra-decisione') and pg.locator('.barra-decisione button').first.is_disabled(),
       'con righe aperte la chiusura è spenta')

    # decide entrambe, poi verifica
    decidi(pg, riga_testo(pg, 'importo diverso'), 'Accetta il loro importo', 'Conferma')
    decidi(pg, riga_testo(pg, 'manca nel bollettino'), 'Attendi il prossimo', 'Conferma')
    ok(n_gruppo(pg, 'Da decidere') == 0 and not pg.locator('.barra-decisione button').first.is_disabled(),
       'tutte decise: la verifica torna attiva')
    pg.click('.barra-decisione button:has-text("Segna come verificato")')
    pg.wait_for_selector('.velo .modale-piede button:has-text("Segna come verificato")')
    ok('mese diventa chiuso' in testo(pg, '.velo'), 'la conferma spiega che il mese diventa chiuso')
    pg.click('.velo .modale-piede button:has-text("Segna come verificato")')
    pg.wait_for_function("document.querySelector('.testa .stato') && document.querySelector('.testa .stato').innerText === 'Verificato'")
    attesa(pg)
    ok('Bollettino verificato' in testo(pg, '.barra-decisione') and pg.locator('.barra-decisione button').count() == 0,
       'verificato: pagina in sola lettura, senza pulsanti di chiusura')
    ok(pg.locator('.c-azioni button').count() == 0, 'verificato: nessun pulsante sulle righe')
    pg.screenshot(path=str(USCITA / 'app-bollettino-verificato-1440.png'))

    # PDF affiancato: bollettino nuovo caricato dalla matrice
    pg.goto(BASE + '/bollettini'); pg.wait_for_selector('.matrice')
    pg.click('button:has-text("Carica un bollettino")')
    pg.wait_for_selector('.velo form#carica-bollettino')
    campo = pg.locator('.velo .ricerca .ricerca-testo').first
    campo.fill("Ing's"); pg.wait_for_timeout(300); campo.press('Enter'); pg.wait_for_timeout(200)
    pg.select_option('#c-mese', '9'); pg.select_option('#c-anno', '2026')
    pg.set_input_files('.velo input[type=file]', {'name': 'bollettino-pdf-prova.pdf', 'mimeType': 'application/pdf',
                                                 'buffer': b'%PDF-1.4\n% bollettino per la prova del PDF\n%%EOF\n'})
    pg.click('.velo .modale-piede button:has-text("Carica")')
    pg.wait_for_selector('.avviso'); pg.wait_for_timeout(600)
    nuovo = id_bollettino(pg, "Ing's", '2026-09')
    ok(nuovo is not None, 'bollettino nuovo caricato: presente nella matrice')
    pg.goto(BASE + '/bollettini/' + str(nuovo)); pg.wait_for_selector('.cerniera')
    ok('bollettino-pdf-prova.pdf' in testo(pg, '.testa') and pg.locator('object[type="application/pdf"]').count() == 1,
       'PDF del bollettino affiancato alla cerniera')
    ok(pg.locator('object[type="application/pdf"]').count() == 1
       and re.match(r'^/api/documenti/\d+/file$', pg.locator('object').first.get_attribute('data') or '') is not None,
       'il PDF passa da /api/documenti/<arrivo>/file')
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(500)
    ok(pg.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),
       '768 px: la pagina non scorre di lato (la cerniera sì)')
    pg.screenshot(path=str(USCITA / 'app-bollettino-768.png'), full_page=True)
    pg.close()

    # --- sola lettura: nessun pulsante di scrittura ---
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: errori.append(str(e)))
    pg.goto(BASE + '/bollettini'); pg.wait_for_function("location.pathname === '/accesso'")
    apri(pg); pg.fill('#c-utente', S + '-lett'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
    pg.wait_for_function("location.pathname === '/bollettini'")
    ing = id_bollettino(pg, "Ing's", '2026-08')
    pg.goto(BASE + '/bollettini/' + str(ing)); pg.wait_for_selector('.cerniera')
    ok(pg.locator('.barra-decisione button').count() == 0 and pg.locator('.c-azioni button').count() == 0,
       'sola lettura: cerniera senza pulsanti')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
