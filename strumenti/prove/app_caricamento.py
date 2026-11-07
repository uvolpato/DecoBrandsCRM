# Prova del caricamento con sagome (D-59), con Playwright: rallentando la rete (CDP, senza bloccare
# la prova) si controlla che la pagina mostri subito il titolo e, al posto di zeri e «Nessun
# elemento», sagome con la forma del contenuto; che le sagome non spostino il layout (prima riga
# entro 4 px); che sotto i 150 ms non compaiano; che cambiando filtro la tabella resti.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi
# (password-di-prova, da utenti_prova.js crea <s>), con le aree Provvigioni e Dati.
# Nel database di prova c'è il seed.
# Uso: python strumenti/prove/app_caricamento.py <suffisso> <cartella schermate> [base]
import sys, pathlib, re, json, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori, sessioni = [], [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

VIETATI = ('Nessun elemento', 'Nessuna pratica', 'Nessun cliente', 'Nessun fornitore', 'Nessun subagente',
           'Nessun utente', 'Nessun documento fiscale', '0 elementi', 'Caricamento…')

def vietati(pg):
    t = pg.locator('.corpo').inner_text()
    v = [x for x in VIETATI if x in t]
    v += ['segmento a 0'] if any(x.strip() == '0' for x in pg.locator('.segmenti .n').all_inner_texts()) else []
    return v

def primo_y(pg):
    _tr = pg.locator('.dt tbody tr')
    return _tr.first.bounding_box()['y'] if _tr.count() else None

def controlla(pg, nome, contenuto, scatti=()):
    """Titolo subito, sagome durante il caricamento, contenuto vero dopo (e le stesse posizioni)."""
    ok(pg.locator('.testa h1').first.inner_text().strip() != '', nome + ': titolo visibile subito')
    pg.wait_for_timeout(300)  # le sagome compaiono dopo 150 ms
    y0 = primo_y(pg)
    sagome = pg.locator('.sagoma').count()
    ok(sagome > 0, '%s: sagome durante il caricamento (%d blocchi)' % (nome, sagome))
    ok(pg.locator('[aria-busy="true"]').count() > 0, nome + ': aria-busy durante il caricamento')
    v = vietati(pg)
    ok(not v, '%s: niente testi finti durante il caricamento%s' % (nome, ' — ' + ', '.join(v) if v else ''))
    for f in scatti: pg.screenshot(path=str(USCITA / f))
    pg.wait_for_selector(contenuto, timeout=20000)
    pg.wait_for_timeout(300)
    ok(pg.locator('.sagoma').count() == 0, nome + ': le sagome spariscono quando arrivano i dati')
    ok(pg.locator('[aria-busy="true"]').count() == 0, nome + ': aria-busy tolto a dati arrivati')
    y1 = primo_y(pg)
    if y0 is not None and y1 is not None:
        ok(abs(y1 - y0) <= 4, '%s: la prima riga resta ferma (%.1f → %.1f px)' % (nome, y0, y1))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    def entra(percorso):
        pg = b.new_page(viewport={'width': 1440, 'height': 900})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + percorso); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('%s')" % percorso); pg.wait_for_load_state('networkidle')
        return pg

    def rete(pg, ms):
        """Ritardo di rete su ogni richiesta, senza fermare la prova (come un server lento)."""
        cdp = pg.context.new_cdp_session(pg)
        cdp.send('Network.enable')
        cdp.send('Network.emulateNetworkConditions', {
            'offline': False, 'latency': ms, 'downloadThroughput': -1, 'uploadThroughput': -1, 'connectionType': 'wifi'})
        sessioni.append(cdp)  # la sessione deve restare viva

    def vai(pg, voce):
        pg.click('.barra a.voce:has-text("%s")' % voce)
        pg.wait_for_selector('.testa h1:has-text("%s")' % voce, timeout=20000)

    # --- area Provvigioni: Pratiche, Pratica, Bollettini, Bollettino ---
    pg = entra('/pratiche'); pg.wait_for_selector('.dt tbody tr.cliccabile')
    rete(pg, 800)

    vai(pg, 'Bollettini')
    controlla(pg, 'Bollettini', '.matrice:not([data-sagoma]) .m-cella', ('sagome-bollettini-1440.png',))

    vai(pg, 'Pratiche')
    controlla(pg, 'Pratiche', '.dt tbody tr.cliccabile', ('sagome-pratiche-1440.png',))
    pg.screenshot(path=str(USCITA / 'pratiche-1440.png'))

    # cambio di filtro con i dati già a schermo: la tabella resta (più tenue), non sparisce
    n0 = pg.locator('.dt tbody tr.cliccabile').count()
    pg.locator('.segmenti [role=tab]:has-text("Fatturate")').first.click(); pg.wait_for_timeout(300)
    ok(pg.locator('.dt tbody tr').count() > 0 and pg.locator('.dt.in-aggiornamento').count() == 1,
       'cambio di filtro: la tabella resta e si attenua (%d righe prima)' % n0)
    pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(1400)

    # Pratica: binario, provvigione e documenti
    pg.locator('.dt tbody tr.cliccabile').first.click()
    pg.wait_for_function("document.querySelector('.testa h1').innerText !== 'Pratiche'")
    ok(pg.locator('.testa h1').first.inner_text().strip() != '', 'Pratica: titolo visibile subito')
    pg.wait_for_timeout(300)
    ok(pg.locator('.sagoma').count() > 0, 'Pratica: sagome durante il caricamento')
    ok(pg.locator('[aria-busy="true"]').count() > 0, 'Pratica: aria-busy durante il caricamento')
    v = vietati(pg)
    ok(not v, 'Pratica: niente testi finti durante il caricamento' + (' — ' + ', '.join(v) if v else ''))
    pg.screenshot(path=str(USCITA / 'sagome-pratica-1440.png'))
    pg.wait_for_selector('.binario', timeout=20000); pg.wait_for_timeout(300)
    ok(pg.locator('.sagoma').count() == 0, 'Pratica: le sagome spariscono quando arrivano i dati')
    pg.screenshot(path=str(USCITA / 'pratica-1440.png'))

    # Bollettino: barra, PDF e cerniera
    vai(pg, 'Bollettini'); pg.wait_for_selector('.matrice:not([data-sagoma]) .m-cella', timeout=20000)
    link = pg.locator('.matrice a.m-cella')
    if link.count():
        link.first.click()
        pg.wait_for_function("document.querySelector('.testa h1').innerText !== 'Bollettini'")
        ok(pg.locator('.testa h1').first.inner_text().strip() != '', 'Bollettino: titolo visibile subito')
        pg.wait_for_timeout(300)
        ok(pg.locator('.sagoma').count() > 0, 'Bollettino: sagome durante il caricamento')
        ok(pg.locator('[aria-busy="true"]').count() > 0, 'Bollettino: aria-busy durante il caricamento')
        v = vietati(pg)
        ok(not v, 'Bollettino: niente testi finti durante il caricamento' + (' — ' + ', '.join(v) if v else ''))
        pg.screenshot(path=str(USCITA / 'sagome-bollettino-1440.png'))
        pg.wait_for_selector('.cerniera', timeout=20000); pg.wait_for_timeout(300)
        ok(pg.locator('.sagoma').count() == 0, 'Bollettino: le sagome spariscono quando arrivano i dati')
        pg.screenshot(path=str(USCITA / 'bollettino-1440.png'))
    else:
        esiti.append('-- Bollettino: nessun bollettino collegato nella matrice, prova saltata')

    # 768 px: la stessa pagina durante e dopo il caricamento
    pg.set_viewport_size({'width': 768, 'height': 1024})
    vai(pg, 'Pratiche'); pg.wait_for_timeout(300)
    ok(pg.locator('.sagoma').count() > 0, 'Pratiche a 768 px: sagome durante il caricamento')
    pg.screenshot(path=str(USCITA / 'sagome-pratiche-768.png'), full_page=True)
    pg.wait_for_selector('.dt tbody tr.cliccabile', timeout=20000); pg.wait_for_timeout(300)
    pg.screenshot(path=str(USCITA / 'pratiche-768.png'), full_page=True)
    pg.set_viewport_size({'width': 1440, 'height': 900})

    # sotto i 150 ms le sagome non compaiono mai: la richiesta dell'elenco risponde in 50 ms
    corpo = pg.evaluate("async () => (await (await fetch('/api/pratiche?stato=tutte&ordina=stato&dir=asc&pagina=0')).json())")
    vai(pg, 'Bollettini'); pg.wait_for_selector('.matrice:not([data-sagoma]) .m-cella', timeout=20000)
    pg.route(re.compile(r'.*/api/pratiche\?.*'), lambda r: (time.sleep(0.05), r.fulfill(status=200, content_type='application/json', body=json.dumps(corpo))))
    pg.evaluate("""() => {
      window.__sagomeViste = 0;
      window.__t0 = performance.now();
      window.__primaSagoma = 0;
      window.__sagomeVisto = '';
      new MutationObserver(() => {
        const s = document.querySelector('.sagoma');
        if (s) {
          window.__sagomeViste++;
          if (!window.__primaSagoma) window.__primaSagoma = performance.now() - window.__t0;
          if (!window.__sagomeVisto) window.__sagomeVisto = (s.parentElement?.outerHTML || s.outerHTML).slice(0, 300);
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    }""")
    vai(pg, 'Pratiche'); pg.wait_for_selector('.dt tbody tr.cliccabile', timeout=20000); pg.wait_for_timeout(800)
    prima = pg.evaluate('window.__primaSagoma')
    # la richiesta è forzata a 50 ms; la soglia è 150 ms: se la sagoma compare, deve comparire dopo
    ok(prima == 0 or prima >= 140, 'sagoma non prima di 150 ms (risposta 50 ms; prima sagoma a %.0f ms: %s)' % (prima, pg.evaluate('window.__sagomeVisto')))
    pg.close()

    # --- area Dati: Clienti e Fornitori ---
    pg = entra('/subagenti'); pg.wait_for_selector('.dt tbody tr.cliccabile')
    rete(pg, 800)

    vai(pg, 'Clienti')
    controlla(pg, 'Clienti', '.pannello .dettagli', ('sagome-clienti-1440.png',))
    pg.screenshot(path=str(USCITA / 'clienti-1440.png'))

    vai(pg, 'Fornitori')
    controlla(pg, 'Fornitori', '.schede-corpo .dt:not([data-sagoma]) tbody tr', ('sagome-fornitori-1440.png',))
    pg.screenshot(path=str(USCITA / 'fornitori-1440.png'))

    pg.set_viewport_size({'width': 768, 'height': 1024})
    vai(pg, 'Clienti'); pg.wait_for_timeout(300)
    ok(pg.locator('.sagoma').count() > 0, 'Clienti a 768 px: sagome durante il caricamento')
    pg.screenshot(path=str(USCITA / 'sagome-clienti-768.png'), full_page=True)
    pg.wait_for_selector('.pannello .dettagli', timeout=20000); pg.wait_for_timeout(300)
    ok(pg.locator('.sagoma').count() == 0, 'Clienti a 768 px: dati veri dopo il caricamento')
    pg.screenshot(path=str(USCITA / 'clienti-768.png'), full_page=True)
    pg.close(); b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
