# Prova della pagina Stato del sistema dell'app (F5-A5, §7.14) con Playwright: riquadri dei servizi
# (con i servizi spenti, così *Controlla adesso* non tocca la rete), problemi e «Segna come visto»,
# esecuzioni raggruppate, contatore della barra, pagina riservata, 1440 e 768 px.
# Servono backend e frontend accesi (base: terzo argomento), gli utenti di prova <s>-ammi e <s>-lett
# (utenti_prova.js crea <s>). Lo script spegne le connessioni dei servizi e le riaccende alla fine.
# Uso: python strumenti/prove/app_sistema.py <suffisso> <cartella schermate> [base]
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
RADICE = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RADICE / 'app' / 'backend'
AIUTO = pathlib.Path(__file__).resolve().parent / 'servizi_prova.js'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []


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
        aiuto('spegni')
        aiuto('problema', S)

        def entra(utente, percorso='/sistema', larghezza=1440):
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

        api = lambda pg, q='': pg.evaluate("async (q) => (await (await fetch('/api/sistema' + q)).json())", q)
        contatore = lambda pg: pg.evaluate("async () => (await (await fetch('/api/sistema/contatore')).json())")
        problemi = lambda pg: pg.locator('.colonne .pannello').nth(0).locator('.dt tbody tr')

        pg = entra(S + '-ammi')
        ok(testo(pg, '.testa h1') == 'Stato del sistema', 'titolo della pagina: Stato del sistema')
        # versione visibile (13/11/2026): numero dal package.json del backend, commit se c'è
        versione = pg.evaluate("async () => (await (await fetch('/api/versione')).json())")
        riga_versione = pg.locator('.pila.riempi > .testo-tenue', has_text='Versione')
        ok(riga_versione.count() == 1 and versione['numero'] in riga_versione.first.inner_text(),
           'la pagina mostra «Versione %s»' % versione['numero'])
        ok(('v' + versione['numero']) in testo(pg, '.barra-versione'),
           'la barra mostra «v%s»' % versione['numero'])
        # un controllo con i servizi spenti: i riquadri diventano verdi «Non configurata» e le
        # anomalie di connessione aperte prima si chiudono (§7.14.2)
        pg.evaluate("""async () => {
            const io = await (await fetch('/api/accesso/io')).json();
            await fetch('/api/sistema/controlla', { method: 'POST', headers: { 'x-csrf-token': io.csrf } });
        }""")
        pg.reload()
        pg.wait_for_load_state('networkidle')
        pg.wait_for_timeout(800)
        dati = api(pg)

        # riquadri: quattro servizi, spenti, verdi con la nota «Non configurata» (§7.14.2, D-74)
        kpi = pg.locator('.kpi-riga .kpi')
        ok(kpi.count() == 4, 'quattro riquadri: %d' % kpi.count())
        nomi = [s['nome'] for s in dati['servizi']]
        ok(all(n in testo(pg, '.kpi-riga') for n in nomi), 'i riquadri mostrano i quattro servizi')
        non_configurate = sum(1 for i in range(kpi.count()) if 'Non configurata' in kpi.nth(i).inner_text())
        ok(non_configurate == 4, 'i servizi spenti sono verdi con la nota «Non configurata» (%d/4)' % non_configurate)
        ok(all(s['stato'] == 'ok' for s in dati['servizi']), 'lo stato dei servizi spenti è «Funziona»')

        # problemi: segmenti con i conteggi del server (D-23), tabella con il problema di prova
        seg = pg.locator('.filtri .segmenti button')
        ok(seg.count() == 2, 'due segmenti: Da vedere, Tutti')
        ok(str(dati['conteggi']['da_vedere']) in seg.nth(0).inner_text(), 'Da vedere conta %d' % dati['conteggi']['da_vedere'])
        ok(str(dati['conteggi']['tutti']) in seg.nth(1).inner_text(), 'Tutti conta %d' % dati['conteggi']['tutti'])
        ok(pg.locator('.dt').count() == 2, 'due tabelle: problemi ed esecuzioni')
        testo_problema = 'Problema di prova ' + S
        riga = problemi(pg).filter(has_text=testo_problema)
        ok(riga.count() == 1, 'il problema di prova è nella tabella')
        ok('Cosa fare' in riga.first.inner_text(), 'la riga dice cosa fare')

        # il riquadro del servizio fa da filtro
        kpi.nth(0).click()
        pg.wait_for_timeout(800)
        filtrato = api(pg, '?servizio=' + dati['servizi'][0]['id'])
        ok(all(p['servizio'] == dati['servizi'][0]['id'] for p in filtrato['problemi']), 'il riquadro filtra i problemi per servizio')
        kpi.nth(0).click()
        pg.wait_for_timeout(800)

        # contatore della barra: numero letto dal server (§7.14)
        c1 = contatore(pg)
        ok(c1['problemi'] >= 1, 'il contatore della barra legge i problemi da vedere: %d' % c1['problemi'])
        ok(pg.locator('.barra .voce .conta').count() >= 1, 'il numero compare nella voce della barra')

        # Segna come visto: la riga esce da «Da vedere» e il contatore scende
        riga.locator('button:has-text("Segna come visto")').click()
        pg.wait_for_timeout(1200)
        ok(problemi(pg).filter(has_text=testo_problema).count() == 0, 'il problema segnato come visto esce da «Da vedere»')
        c2 = contatore(pg)
        ok(c2['problemi'] == c1['problemi'] - 1, 'il contatore scende da %d a %d' % (c1['problemi'], c2['problemi']))

        # Controlla adesso: nessun servizio configurato, nessuna rete; quattro controlli riusciti
        with pg.expect_response(lambda r: '/api/sistema/controlla' in r.url) as risposta:
            pg.locator('.testa-azioni button:has-text("Controlla adesso")').click()
        ok(risposta.value.status == 200, 'Controlla adesso risponde 200')
        pg.wait_for_timeout(1500)
        esecuzioni = pg.locator('.colonne .pannello').nth(1)
        ok(esecuzioni.locator('.dt tbody tr').count() >= 4, 'dopo il controllo ci sono i quattro giri')
        ok('controllo riuscito' in esecuzioni.inner_text(), 'i controlli riusciti sono raggruppati («controlli riusciti dalle …»)')
        ok(all(n in esecuzioni.inner_text() for n in nomi), 'i quattro servizi compaiono fra le esecuzioni')

        pg.screenshot(path=str(USCITA / 'app-sistema-1440.png'), full_page=True)

        # 768 px: niente scorrimento orizzontale
        pg.set_viewport_size({'width': 768, 'height': 1024})
        pg.wait_for_timeout(800)
        ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),
           '768 px: nessuno scorrimento orizzontale')
        pg.screenshot(path=str(USCITA / 'app-sistema-768.png'), full_page=True)
        pg.close()

        # chi è in sola lettura non vede la pagina né la voce nel menu
        pg = entra(S + '-lett')
        ok('Pagina riservata' in testo(pg, '.vuoto'), 'lettura: la pagina dice «Pagina riservata»')
        ok(pg.locator('.barra a', has_text='Stato del sistema').count() == 0, 'lettura: la voce non compare nel menu')
        pg.close()
    finally:
        aiuto('pulisci', S)
        aiuto('accendi')
        b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
