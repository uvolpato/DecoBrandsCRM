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

def pdf_prova(marca):
    """PDF valido di due pagine vuote: PDF.js le disegna tutte, una sotto l'altra (13/11/2026)."""
    oggetti = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << >> >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << >> >>',
    ]
    fuori, posizioni = b'%PDF-1.4\n% bollettino ' + marca.encode() + b'\n', []
    for i, o in enumerate(oggetti, 1):
        posizioni.append(len(fuori))
        fuori += b'%d 0 obj\n' % i + o + b'\nendobj\n'
    inizio_xref = len(fuori)
    fuori += b'xref\n0 %d\n0000000000 65535 f \n' % (len(oggetti) + 1)
    fuori += b''.join(b'%010d 00000 n \n' % p for p in posizioni)
    fuori += b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(oggetti) + 1, inizio_xref)
    return fuori

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

    def decidi(pg, riga, azione, conferma, motivo=None):
        riga.locator('button', has_text=azione).first.click()
        pg.wait_for_selector('.velo .modale-piede button:has-text("%s")' % conferma)
        if motivo is not None:
            pg.fill('.velo #c-motivo', motivo)
        pg.click('.velo .modale-piede button:has-text("%s")' % conferma)
        pg.wait_for_function("!document.querySelector('.velo')")
        pg.wait_for_timeout(400)

    def apri_abbina(pg, riga):
        riga.locator('button', has_text='Abbina il documento').first.click()
        pg.wait_for_selector('.velo form')
        pg.wait_for_timeout(900)  # le voci dei documenti arrivano dal server
        campo = pg.locator('.velo .ricerca .ricerca-testo').first
        campo.click()
        pg.wait_for_selector('.velo .ricerca-menu li[role=option]', state='attached', timeout=10000)
        return campo

    def scegli(pg, documento):
        pg.wait_for_timeout(300)
        pg.locator('.velo .ricerca-menu li[role=option]', has_text=documento).first.click()
        pg.wait_for_timeout(200)

    def abbina(pg, riga, documento, conferma=True):
        campo = apri_abbina(pg, riga)
        campo.fill(documento); scegli(pg, documento)
        if conferma:
            pg.click('.velo .modale-piede button:has-text("Abbina")')
            pg.wait_for_function("!document.querySelector('.velo')", timeout=15000)
            pg.wait_for_timeout(600)
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
    # 15/11/2026: il fornitore nel sottotitolo e il cliente della riga sono link alle loro schede
    ok(pg.locator('.testa .sotto a[href^="/fornitori/"]').count() == 1, 'bollettino: il fornitore è un link alla sua scheda')
    ok(pg.locator('.cerniera .c-riga a[href^="/clienti/"]').count() >= 1, 'bollettino: il cliente della riga è un link alla sua scheda')
    ok(tot(pg, '.cerniera-riepilogo .lato b') == 1918.50 and tot(pg, '.cerniera-riepilogo .lato.destro b') == 1951.20
       and tot(pg, '.cerniera-riepilogo .cucitura b') == -32.70, 'Gries luglio: totali 1.918,50 / 1.951,20 / -32,70')
    ok(n_gruppo(pg, 'Da decidere') == 1 and n_gruppo(pg, 'Quadrano') == 1, 'Gries luglio: 1 da decidere, 1 che quadra')
    ok('Manca 1 riga da decidere' in testo(pg, '.barra-decisione')
       and pg.locator('.barra-decisione button:has-text("Segna come verificato")').first.is_disabled(),
       'azione proposta: riga da decidere, chiusura spenta e righe mancanti indicate')
    # Vai alla prima: porta alla riga del gruppo Da decidere e la evidenzia un attimo
    pg.click('.barra-decisione button:has-text("Vai alla prima")')
    pg.wait_for_selector('.cerniera [data-gruppo="Da decidere"] .c-riga.evidenzia')
    pg.wait_for_timeout(700)
    a_schermo = pg.evaluate("""() => { const r = document.querySelector('.cerniera [data-gruppo="Da decidere"] .c-riga');
      const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight; }""")
    ok(a_schermo, 'Vai alla prima: la riga da decidere è a schermo e in evidenza')

    diff = riga_testo(pg, 'importo diverso')
    campo = apri_abbina(pg, diff)
    ok(pg.locator('.velo .ricerca-menu li[role=option]').count() >= 3,
       'abbinamento: l\'elenco arriva dal server con i documenti del fornitore di ogni mese')
    campo.fill('F-2026-0891'); pg.wait_for_timeout(300)
    ok('già sul bollettino 7/2026' in testo(pg, '.velo .ricerca-menu'), 'il documento già usato lo dice nell\'elenco')
    scegli(pg, 'F-2026-0891')
    pg.click('.velo .modale-piede button:has-text("Abbina")')
    pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok('già sulla riga' in testo(pg, '.modulo-errore'), 'abbinamento a un documento già usato: il 409 del server si vede')
    pg.click('.velo .modale-piede button:has-text("Annulla")'); pg.wait_for_timeout(300)

    # contesta con motivo, poi prepara la contestazione (testo dal server, copia e .txt)
    decidi(pg, diff, 'Contesta', 'Contesta', 'Sconto diverso da quello concordato')
    ok(n_gruppo(pg, 'Decise') == 1 and n_gruppo(pg, 'Da decidere') == 0, 'contestata: la riga passa fra le decise')
    ok(pg.locator('.barra-decisione button:has-text("Prepara la contestazione")').count() == 1,
       'con una riga contestata compare Prepara la contestazione')
    pg.click('.barra-decisione button:has-text("Prepara la contestazione")')
    pg.wait_for_selector('.velo #contestazione-testo')
    testo_contestazione = pg.input_value('.velo #contestazione-testo')
    ok('F-2026-0912' in testo_contestazione and 'Sconto diverso da quello concordato' in testo_contestazione
       and '1.144,50 €' in testo_contestazione and 'F-2026-0891' not in testo_contestazione,
       'la contestazione ha le righe contestate con i numeri, la differenza e il motivo')
    ok(pg.input_value('.velo #contestazione-oggetto').startswith('Contestazione bollettino provvigioni luglio 2026'),
       'l\'oggetto dice fornitore e mese')
    pg.click('.velo .modale-piede button:has-text("Copia")')
    pg.wait_for_selector('.avviso')
    ok('Testo copiato' in testo(pg, '.avviso'), 'Copia: il testo va negli appunti')
    with pg.expect_download() as scaricato:
        pg.click('.velo .modale-piede button:has-text("Scarica .txt")')
    download = scaricato.value
    contenuto = pathlib.Path(download.path()).read_text(encoding='utf-8')
    ok(download.suggested_filename == 'contestazione-2026-07.txt' and 'F-2026-0912' in contenuto,
       'Scarica .txt: il file ha il nome del mese e le righe contestate')
    pg.click('.velo .modale-piede button:has-text("Chiudi")'); pg.wait_for_timeout(300)

    # annulla la contestazione e accetta, come prima
    riga_testo(pg, 'F-2026-0912').locator('button', has_text='Annulla').first.click(); attesa(pg)
    decidi(pg, diff, 'Accetta il loro importo', 'Conferma')
    ok(n_gruppo(pg, 'Decise') == 1 and n_gruppo(pg, 'Da decidere') == 0, 'accettato: la riga passa fra le decise')
    ok('Tutte le righe sono quadrate o decise' in testo(pg, '.barra-decisione')
       and not pg.locator('.barra-decisione button:has-text("Segna come verificato")').first.is_disabled()
       and pg.locator('.barra-decisione button:has-text("Prepara la contestazione")').count() == 0,
       'dopo la decisione la verifica è attiva e non c\'è nulla da contestare')
    pg.close()

    # --- Gasper agosto: mancante, abbinamento D→E, chiusura verificato ---
    pg = entra(S + '-ammi')
    gasper = id_bollettino(pg, 'Gasper', '2026-08')
    pg.goto(BASE + '/bollettini/' + gasper); pg.wait_for_selector('.cerniera')
    ok('Gasper' in testo(pg, '.testa h1') and 'agosto 2026' in testo(pg, '.testa h1') and 'Da verificare' in testo(pg, '.testa h1'),
       'testata: fornitore, mese e badge Da verificare')
    ok(tot(pg, '.cerniera-riepilogo .lato b') == 263.20 and tot(pg, '.cerniera-riepilogo .lato.destro b') == 2190.10
       and tot(pg, '.cerniera-riepilogo .cucitura b') == -1926.90, 'Gasper agosto: totali 263,20 / 2.190,10 / -1.926,90')
    ok(n_gruppo(pg, 'Da decidere') == 1 and n_gruppo(pg, 'Quadrano') == 1 and n_gruppo(pg, 'Incassi') == 1,
       'gruppi: 1 da decidere, 1 che quadra, 1 incasso')
    ok(pg.locator('.pannello canvas').count() == 0 and 'nessun file allegato' in testo(pg, '.testa'),
       'senza PDF: la pagina lo dice e non mostra il riquadro')
    pg.screenshot(path=str(USCITA / 'app-bollettino-1440.png'))
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(500)
    ok(pg.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),
       '768 px: la pagina non scorre di lato')
    ok(pg.evaluate("""() => { const c = document.querySelector('.cerniera'); return c.scrollWidth <= c.clientWidth + 1; }"""),
       '768 px: la cerniera impilata non scorre di lato')
    ok(not pg.locator('.c-intest').first.is_visible(), '768 px: le intestazioni delle colonne spariscono')
    etichetta = pg.eval_on_selector('.c-riga .c-sx', "e => getComputedStyle(e, '::before').content")
    ok('riconosce' in etichetta, '768 px: ogni valore porta la sua etichetta')
    dentro = pg.evaluate("""() => { const c = document.querySelector('.cerniera'), a = document.querySelector('.c-riga .c-azioni');
      const b = a.getBoundingClientRect(), d = c.getBoundingClientRect();
      return b.top >= d.top && b.bottom <= d.bottom && b.left >= d.left && b.right <= d.right; }""")
    ok(dentro, '768 px: i pulsanti della riga stanno dentro la cerniera, a tutta larghezza')
    pg.screenshot(path=str(USCITA / 'app-bollettino-cerniera-768.png'), full_page=True)
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(300)

    # documento mancante: Attendi il prossimo, poi annullamento
    mancante = riga_testo(pg, 'F-2026-0933')
    decidi(pg, mancante, 'Attendi il prossimo', 'Conferma')
    ok(n_gruppo(pg, 'Da decidere') == 0 and n_gruppo(pg, 'Decise') == 1, 'attesa sul mancante: passa fra le decise')
    riga_testo(pg, 'F-2026-0933').locator('button', has_text='Annulla').first.click()
    riga_testo(pg, 'F-2026-0933').locator('button', has_text='Attendi il prossimo').first.wait_for(timeout=10000)
    dopo_annulla = (n_gruppo(pg, 'Da decidere'), n_gruppo(pg, 'Decise'))
    ok(dopo_annulla == (1, 0), 'annullata la decisione: torna da decidere (%d da decidere, %d decise)' % dopo_annulla)

    # abbinamento a un documento di un altro mese (settembre), poi ritorno: il vecchio torna mancante
    apri_gruppo(pg, 'Quadrano')
    abbina(pg, riga_testo(pg, 'F-2026-0921'), 'NC-2026-007')
    attesa(pg)
    ok(pg.locator('.c-riga', has_text='F-2026-0921').filter(has_text='manca nel bollettino').count() == 1,
       'abbinamento a un documento di un altro mese: funziona e il vecchio torna mancante')
    con_abbina = pg.locator('.c-riga', has_text='F-2026-0921').filter(
        has=pg.locator('button', has_text='Abbina il documento')).first
    abbina(pg, con_abbina, 'F-2026-0921')
    attesa(pg)
    ok(n_gruppo(pg, 'Da decidere') == 1 and n_gruppo(pg, 'Quadrano') == 1,
       'tornando al documento giusto la riga quadra di nuovo')

    # abbinamento a mano: la riga F-2026-0921 va sul documento F-2026-0933 che mancava (D-56)
    apri_gruppo(pg, 'Quadrano')
    abbina(pg, riga_testo(pg, 'F-2026-0921'), 'F-2026-0933')
    attesa(pg)
    ok(n_gruppo(pg, 'Da decidere') == 2 and riga_testo(pg, 'importo diverso').count() == 1
       and riga_testo(pg, 'manca nel bollettino').count() == 1, 'abbinata: la vecchia riga torna mancante, la nuova è a confronto')

    # chiudere con righe aperte: la chiusura è spenta (il server rifiuterebbe)
    ok('2 righe da decidere' in testo(pg, '.barra-decisione')
       and pg.locator('.barra-decisione button:has-text("Segna come verificato")').first.is_disabled(),
       'con righe aperte la chiusura è spenta')

    # decide entrambe, poi verifica
    decidi(pg, riga_testo(pg, 'importo diverso'), 'Accetta il loro importo', 'Conferma')
    decidi(pg, riga_testo(pg, 'manca nel bollettino'), 'Attendi il prossimo', 'Conferma')
    ok(n_gruppo(pg, 'Da decidere') == 0
       and not pg.locator('.barra-decisione button:has-text("Segna come verificato")').first.is_disabled(),
       'tutte decise: la verifica torna attiva')
    pg.click('.barra-decisione button:has-text("Segna come verificato")')
    pg.wait_for_selector('.velo .modale-piede button:has-text("Segna come verificato")')
    ok('mese diventa chiuso' in testo(pg, '.velo'), 'la conferma spiega che il mese diventa chiuso')
    ok(pg.locator('.velo .modale-piede button:has-text("Segna come verificato")').is_disabled(), 'verifica: pulsante spento finché non si spunta (D-172)')
    pg.click('.velo .casella-grave input')
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
    # nel giro app_bollettini carica già Ing's 9/2026: si prende il primo mese del 2026 libero, letto dal
    # server (cella del fornitore presente e senza bollettino), così il 409 non fa fallire la prova (c)
    mese_libero = None
    for m in range(1, 13):
        mm = '2026-%02d' % m
        rr = pg.request.get(BASE + '/api/bollettini?al=' + mm).json()
        f = next((x for x in rr['fornitori'] if "ing's" in x['fornitore'].lower()), None)
        if f and any(c['mese'] == mm and not c['bollettino_id'] for c in f['celle']):
            mese_libero = mm
            break
    ok(mese_libero is not None, 'un mese del 2026 libero per Ing\'s (nessuno: bollettini tutti caricati)')
    nuovo = None
    if mese_libero:
        campo = pg.locator('.velo .ricerca .ricerca-testo').first
        campo.fill("Ing's"); pg.wait_for_timeout(300); campo.press('Enter'); pg.wait_for_timeout(200)
        pg.select_option('#c-mese', str(int(mese_libero[5:])))
        pg.select_option('#c-anno', '2026')
        pg.set_input_files('.velo input[type=file]', {'name': 'bollettino-pdf-prova.pdf', 'mimeType': 'application/pdf',
                                                     'buffer': pdf_prova('prova PDF')})
        pg.click('.velo .modale-piede button:has-text("Carica")')
        # avviso oppure errore nel modulo, appena esce: un errore fa fallire subito, non dopo 30 s
        pg.wait_for_selector('.avviso:not([hidden]), .velo .modulo-errore:not([hidden])')
        errore_modulo = pg.locator('.velo .modulo-errore:not([hidden])')
        if errore_modulo.count():
            ok(False, 'carica un bollettino: errore nel modulo «%s»' % errore_modulo.first.inner_text())
        else:
            pg.wait_for_timeout(600)
        nuovo = id_bollettino(pg, "Ing's", mese_libero)
        ok(nuovo is not None, 'bollettino nuovo caricato: presente nella matrice (%s)' % mese_libero)
    else:
        ok(False, 'bollettino nuovo: non caricato, nessun mese libero per Ing\'s')
    if nuovo is None:
        ok(False, 'PDF affiancato: non provato, il bollettino nuovo non c\'è')
    else:
        # PDF.js disegna il PDF su un canvas: niente <object> (bloccato dal CSP sandbox, A4-10)
        with pg.expect_response(lambda r: re.search(r'/api/documenti/\d+/file$', r.url)) as risposta:
            pg.goto(BASE + '/bollettini/' + str(nuovo))
        pg.wait_for_selector('.cerniera')
        ok('bollettino-pdf-prova.pdf' in testo(pg, '.testa')
           and pg.locator('.pannello canvas[aria-label="Pagina 1 di 2"]').count() == 1
           and pg.locator('.pannello canvas[aria-label="Pagina 2 di 2"]').count() == 1
           and pg.locator('object[type="application/pdf"]').count() == 0,
           'PDF del bollettino affiancato alla cerniera: tutte e due le pagine disegnate con PDF.js')
        try:
            pg.wait_for_function("""() => { const c = [...document.querySelectorAll('.pannello canvas')];
              return c.length == 2 && c.every(x => x.width > 0 && x.height > 0); }""", timeout=20000)
            canvas_pieno = True
        except Exception:
            canvas_pieno = False
        ok(risposta.value.status == 200 and canvas_pieno,
           'il PDF passa da /api/documenti/<arrivo>/file e i canvas hanno dimensioni > 0')
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
    ok(pg.locator('.barra-decisione button:has-text("Segna come")').count() == 0 and pg.locator('.c-azioni button').count() == 0,
       'sola lettura: nessun pulsante di scrittura')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
