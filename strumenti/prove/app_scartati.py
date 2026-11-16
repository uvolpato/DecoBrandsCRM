# Prova della pagina Documenti scartati dell'app (F5-A7, §7.16) con Playwright: elenco con motivo e
# data di eliminazione automatica, ricerca e conteggi dei segmenti (D-23), recupero (torna fra i
# documenti da controllare), eliminazione definitiva solo dell'amministratore, link «N scartati» in
# Documenti, pagina riservata, 1440 e 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper
# e <s>-lett (utenti_prova.js crea <s>). I due documenti scartati li crea e li toglie lo script.
# Uso: python strumenti/prove/app_scartati.py <suffisso> <cartella schermate> [base]
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
RADICE = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RADICE / 'app' / 'backend'
AIUTO = pathlib.Path(__file__).resolve().parent / 'scartati_prova.js'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
NUMERO = 'PROVA-' + S.upper()


def ok(c, t):
    esiti.append(('OK ' if c else 'KO ') + t)


def aiuto(*args):
    subprocess.run(['node', str(AIUTO), *args], cwd=BACKEND, check=True, capture_output=True)


def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')


def testo(pg, s):
    return pg.locator(s).first.inner_text()


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    try:
        aiuto('crea', S)

        def entra(utente, percorso='/scartati', larghezza=1440):
            pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
            pg.on('pageerror', lambda e: errori.append(str(e)))
            pg.goto(BASE + percorso)
            pg.wait_for_function("location.pathname === '/accesso'")
            apri(pg)
            pg.fill('#c-utente', utente)
            pg.fill('#c-password', PW)
            pg.click('button.btn.largo')
            pg.wait_for_function("location.pathname === '%s'" % percorso)
            pg.wait_for_load_state('networkidle')
            return pg

        api = lambda pg, q='': pg.evaluate("async (q) => (await (await fetch('/api/scartati' + q)).json())", q)
        cerca = lambda pg: pg.locator('.filtri .cerca input')

        def filtra(pg, n=None):
            cerca(pg).fill(NUMERO)
            pg.wait_for_timeout(900)  # la ricerca parte a ogni tasto: si aspetta la risposta
            if n is not None:  # la tabella mostra solo le righe del documento di prova
                pg.wait_for_function("(n) => document.querySelectorAll('.dt tbody tr').length === n", arg=n)

        def righe(pg):
            return pg.locator('.dt tbody tr').filter(has_text=NUMERO)

        pg = entra(S + '-ammi')
        pg.wait_for_selector('.testa .sotto:has-text("90 giorni")')
        ok(testo(pg, '.testa h1') == 'Documenti scartati', 'titolo della pagina: Documenti scartati')
        ok('90 giorni' in testo(pg, '.testa .sotto'), 'il sottotitolo dice i giorni di conservazione')

        dati = api(pg, '?q=' + NUMERO)
        ok(dati['totale'] == 2, 'il server trova i due documenti di prova: %d' % dati['totale'])
        ok(dati['giorni'] == 90, 'la conservazione è di 90 giorni')
        eliminazione = dati['scartati'][0]['elimina_il']
        ok(len(eliminazione) == 10 and eliminazione[4] == '-', 'l’eliminazione automatica è una data: %s' % eliminazione)

        filtra(pg, 2)
        ok(righe(pg).count() == 2, 'la ricerca mostra i due documenti (%d)' % righe(pg).count())
        ok(pg.locator('.dt thead th').count() == 5, 'cinque colonne: scartato il, documento, motivo, eliminato il, azioni')
        corpo = pg.locator('.dt tbody').inner_text()
        ok('Doppione' in corpo and 'Altro' in corpo, 'i motivi sono nella tabella')
        ok(NUMERO + '-1' in corpo and NUMERO + '-2' in corpo, 'numero del documento nella tabella')
        ok('arrivato due volte' in corpo, 'la nota dello scarto è nella tabella')

        # i segmenti per motivo contano gli altri filtri (D-23)
        segmented = pg.locator('.filtri .segmenti button')
        ok(segmented.count() == 3, 'tre segmenti: Tutti e i due motivi presenti (%d)' % segmented.count())
        ok(str(dati['conteggi']['tutti']) in segmented.nth(0).inner_text(), 'Tutti conta %d' % dati['conteggi']['tutti'])
        per_motivo = {m['motivo']: m['n'] for m in dati['conteggi']['per_motivo']}
        ok(str(per_motivo.get('Doppione')) in segmented.nth(1).inner_text(), 'Doppione conta %d' % per_motivo.get('Doppione'))

        # il link «N scartati» accanto al contatore di Documenti (§7.16)
        pg.goto(BASE + '/documenti')
        pg.wait_for_load_state('networkidle')
        link = pg.locator('.pannello-nota a[href="/scartati"]')
        link.first.wait_for()  # il numero degli scartati arriva dal server, dopo la pagina
        ok(link.count() == 1, 'in Documenti c’è il link «N scartati»')
        ok('scartati' in link.first.inner_text(), 'il link dice quanti sono: %s' % link.first.inner_text())
        pg.goto(BASE + '/scartati')
        pg.wait_for_load_state('networkidle')
        filtra(pg, 2)

        pg.screenshot(path=str(USCITA / 'app-scartati-1440.png'), full_page=True)

        # 768 px con le righe: niente scorrimento orizzontale
        pg.set_viewport_size({'width': 768, 'height': 1024})
        pg.wait_for_timeout(700)
        ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),
           '768 px: nessuno scorrimento orizzontale')
        pg.screenshot(path=str(USCITA / 'app-scartati-768.png'), full_page=True)
        pg.set_viewport_size({'width': 1440, 'height': 900})
        pg.wait_for_timeout(400)

        # Recupera: torna fra i documenti da controllare e lo apre
        righe(pg).first.locator('button[aria-label^="Recupera"]').click()
        pg.wait_for_url('**/documenti/**')
        pg.wait_for_load_state('networkidle')
        ok('/documenti/' in pg.url, 'Recupera apre il documento: %s' % pg.url.split(BASE)[-1])
        ok('Da controllare' in testo(pg, '.pannello'), 'il documento è fra quelli da controllare')

        pg.goto(BASE + '/scartati')
        pg.wait_for_load_state('networkidle')
        filtra(pg, 1)
        ok(righe(pg).count() == 1, 'dopo il recupero ne resta uno (%d)' % righe(pg).count())

        # Elimina (amministratore): conferma con la casella, poi la riga sparisce
        righe(pg).first.locator('button[aria-label^="Elimina"]').click()
        pg.wait_for_selector('.modale')
        ok('non si possono più recuperare' in testo(pg, '.modale'), 'la conferma dice che non si recupera più')
        ok(pg.locator('.modale-piede button:has-text("Elimina")').is_disabled(), 'Elimina: pulsante spento finché non si spunta (D-172)')
        pg.click('.modale .casella-grave input')
        with pg.expect_response(lambda r: r.request.method == 'DELETE' and '/api/scartati/' in r.url) as risposta:
            pg.locator('.modale-piede button:has-text("Elimina")').click()
        ok(risposta.value.status == 204, 'l’eliminazione risponde 204')
        pg.wait_for_function("() => !document.querySelector('.dt tbody').innerText.includes('%s')" % NUMERO)
        ok(righe(pg).count() == 0, 'dopo l’eliminazione non c’è più')
        ok(api(pg, '?q=' + NUMERO)['totale'] == 0, 'il server non ha più i documenti di prova')
        pg.close()

        # l'operatore recupera ma non elimina
        aiuto('crea', S)
        pg = entra(S + '-oper')
        filtra(pg, 2)
        ok(righe(pg).count() == 2, 'operatore: vede i documenti')
        ok(pg.locator('.dt button[aria-label^="Recupera"]').count() == pg.locator('.dt tbody tr').count(),
           'operatore: ogni riga ha «Recupera»')
        ok(pg.locator('.dt button[aria-label^="Elimina"]').count() == 0, 'operatore: nessun pulsante Elimina')
        ok(pg.evaluate("async (q) => (await fetch('/api/scartati?q=' + q)).status", NUMERO) == 200, 'operatore: l’elenco risponde 200')
        pg.close()

        # la sola lettura non vede la pagina
        pg = entra(S + '-lett')
        ok('Pagina riservata' in testo(pg, '.vuoto'), 'lettura: la pagina dice «Pagina riservata»')
        ok(pg.locator('.barra a', has_text='Documenti scartati').count() == 0, 'lettura: la voce non compare nel menu')
        pg.close()
    finally:
        aiuto('togli', S)
        b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
