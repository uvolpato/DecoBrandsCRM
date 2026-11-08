# Prova della pagina Registro dell'app (F5-A2, §7.11, §15.6) con Playwright: filtri standard e
# conteggi dei segmenti (D-23), dettaglio in finestra, *Stessa operazione*, esporta CSV, pagina
# riservata a chi non è amministratore, 1440 e 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi e <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>).
# Uso: python strumenti/prove/app_registro.py <suffisso> <cartella schermate> [base]
import sys, pathlib
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
    def entra(utente, percorso='/registro', larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + percorso)
        pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '%s'" % percorso)
        pg.wait_for_load_state('networkidle')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    api = lambda pg, q='': pg.evaluate("async (q) => (await (await fetch('/api/registro' + q)).json())", q)
    piede = lambda pg: testo(pg, '.dt-piede')

    pg = entra(S + '-ammi')
    dati = api(pg)
    ok(testo(pg, '.testa h1') == 'Registro', 'titolo della pagina: Registro')

    seg = pg.locator('.filtri .segmenti button')
    ok(seg.count() == 3, 'tre segmenti: Tutto, Anomalie aperte, Errori')
    ok(str(dati['conteggi']['tutto']) in seg.nth(0).inner_text(), 'Tutto conta %d' % dati['conteggi']['tutto'])
    ok(str(dati['conteggi']['aperte']) in seg.nth(1).inner_text(), 'Anomalie aperte conta %d' % dati['conteggi']['aperte'])
    ok(str(dati['conteggi']['errori']) in seg.nth(2).inner_text(), 'Errori conta %d' % dati['conteggi']['errori'])
    ok(pg.locator('.dt thead th').count() == 6, 'sei colonne: quando, livello, messaggio, utente, riferimento, volte')
    ok(str(dati['totale']) in piede(pg), 'la tabella mostra il totale del server: %d' % dati['totale'])
    per_pagina = dati.get('per_pagina', 25)  # Impostazioni · righe per pagina (iniziale 25)
    ok(pg.locator('.dt tbody tr').count() == min(per_pagina, dati['totale']), 'righe della prima pagina: %d' % min(per_pagina, dati['totale']))

    # D-64: il fuoco dei filtri è un bordo INTERNO, così il menu aperto non lo copre
    for nome, sel in [('tendina', '.filtri select'), ('data', '.filtri input[type=date]'),
                      ('ricerca', '.filtri .filtro-ricerca .ricerca-testo'), ('ricerca libera', '.filtri .cerca input')]:
        e = pg.locator(sel).first
        e.focus()
        stile = e.evaluate("e => ({ outline: getComputedStyle(e).outlineStyle, ombra: getComputedStyle(e).boxShadow })")
        ok(stile['outline'] == 'none' and 'inset' in stile['ombra'], 'fuoco della %s: bordo interno, non outline' % nome)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)  # chiude il menu della ricerca aperto dal fuoco

    # segmento Errori: righe e totale dal server (D-23)
    errori_api = api(pg, '?vista=errori')
    seg.nth(2).click()
    pg.wait_for_function("(n) => { const t = document.querySelector('.dt-piede')?.textContent || ''; return t.includes(n + ' elementi') || t.includes('di ' + n + ' elementi'); }", arg=str(errori_api['totale']))
    ok(str(errori_api['totale']) in piede(pg), 'segmento Errori: %d righe (piede: %s)' % (errori_api['totale'], piede(pg)))
    ok(pg.locator('.dt tbody tr').count() == min(dati.get('per_pagina', 25), errori_api['totale']), 'il segmento restringe davvero le righe')

    # filtro Codice con una tendina (i valori vengono dal server)
    seg.nth(0).click(); pg.wait_for_timeout(500)
    codici = dati['opzioni']['codici']
    if codici:
        cod = codici[0]['valore']
        # la tendina del Codice è la quarta (Genere, Livello, Servizio, Codice)
        pg.locator('.filtri select').nth(3).select_option(cod)
        pg.wait_for_timeout(1200)
        per_codice = api(pg, '?codice=%s' % cod)
        ok(str(per_codice['totale']) in piede(pg), 'filtro Codice %s: %d righe (piede: %s)' % (cod, per_codice['totale'], piede(pg)))
        pg.locator('.riepilogo-filtri [title="Togli tutti i filtri"]').click(); pg.wait_for_timeout(1500)
        tutto = api(pg)
        ok(pg.locator('.filtri select').nth(3).input_value() == '', 'Togli tutti i filtri azzera il codice')
        ok(str(tutto['totale']) in piede(pg), 'Togli tutti i filtri riporta al totale %d (piede: %s)' % (tutto['totale'], piede(pg)))

    pg.screenshot(path=str(USCITA / 'app-registro-1440.png'), full_page=True)

    # dettaglio in finestra: campi comuni e dettaglio leggibile
    righe = dati['righe']
    if righe:
        idx = next((i for i, r in enumerate(righe) if r['operazione_id']), 0)
        r = righe[idx]
        pg.locator('.dt tbody tr').nth(idx).click()
        pg.wait_for_selector('.modale')
        corpo = testo(pg, '.modale')
        ok(r['codice'] in corpo, 'la finestra mostra il codice %s' % r['codice'])
        ok('Quando' in corpo and 'Utente' in corpo, 'la finestra mostra i campi comuni')
        if r['operazione_id']:
            ok(pg.locator('.modale-piede button:has-text("Stessa operazione")').count() == 1, 'c’è il pulsante Stessa operazione')
            stessa = api(pg, '?operazione=%s' % r['operazione_id'])
            pg.locator('.modale-piede button:has-text("Stessa operazione")').click()
            pg.wait_for_timeout(800)
            ok(str(stessa['totale']) in piede(pg), 'Stessa operazione: %d righe' % stessa['totale'])
            pg.locator('.riepilogo-filtri button[title="Riepilogo dei filtri"]').click(); pg.wait_for_timeout(200)
            ok('Stessa operazione' in testo(pg, '.riepilogo-pop'), 'il riepilogo dei filtri mostra l’operazione')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        else:
            pg.locator('.modale-piede button:has-text("Chiudi")').click(); pg.wait_for_timeout(300)
    ok(pg.locator('.dt tbody tr.cliccabile').count() > 0, 'le righe sono cliccabili')

    # esporta: il server prepara il CSV delle righe filtrate
    if dati['totale']:
        with pg.expect_download() as d:
            pg.locator('.testa-azioni button:has-text("Esporta")').click()
        nome = d.value.suggested_filename
        ok(nome.startswith('Registro_') and nome.endswith('.csv'), 'Esporta scarica %s' % nome)
        pg.wait_for_timeout(500)
        ok('Scaricato' in testo(pg, '.avviso'), 'avviso di file scaricato')

    # 768 px: niente scorrimento orizzontale, filtri e tabella leggibili
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(700)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    ok(pg.locator('.filtri').count() >= 1, '768 px: i filtri restano visibili')
    if dati['righe']:
        pg.locator('.dt tbody tr').first.click(); pg.wait_for_selector('.modale'); pg.wait_for_timeout(300)
        ok(not pg.evaluate("document.querySelector('.modale').scrollWidth > document.querySelector('.modale').clientWidth"), '768 px: la finestra del dettaglio non scorre di lato')
        pg.screenshot(path=str(USCITA / 'app-registro-dettaglio-768.png'))
        pg.locator('.modale-piede button:has-text("Chiudi")').click(); pg.wait_for_timeout(200)
    pg.screenshot(path=str(USCITA / 'app-registro-768.png'), full_page=True)
    pg.close()

    # chi non è amministratore vede «Pagina riservata» e nel menu non c'è Registro
    pg = entra(S + '-lett')
    ok('Pagina riservata' in testo(pg, '.vuoto'), 'lettura: la pagina dice «Pagina riservata»')
    ok(pg.locator('.barra a', has_text='Registro').count() == 0, 'lettura: la voce Registro non compare nel menu')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
