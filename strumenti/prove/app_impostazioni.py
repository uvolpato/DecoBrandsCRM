# Prova della pagina Impostazioni dell'app (F5-A6, §7.15, D-65) con Playwright: sei sezioni,
# salvataggio e rilettura, password mai nel DOM né nelle risposte, errore del server per un numero
# fuori limite, *Prova la connessione* senza 500, 1440 e 768 px.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi e <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>).
# Uso: python strumenti/prove/app_impostazioni.py <suffisso> <cartella schermate> [base]
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
    risposte = []
    def entra(utente, percorso='/impostazioni/azienda', larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.on('response', lambda r: risposte.append((r.url, r.text())) if '/api/impostazioni' in r.url else None)
        pg.goto(BASE + percorso)
        pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '%s'" % percorso)
        pg.wait_for_load_state('networkidle')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')

    pg = entra(S + '-ammi')

    # pagina e sei sezioni, la prima aperta è azienda
    ok(testo(pg, '.testa h1') == 'Impostazioni', 'titolo della pagina: Impostazioni')
    sez = pg.locator('.selezionabile a')
    ok(sez.count() == 6, 'sei sezioni nell’elenco')
    ok(sez.first.get_attribute('aria-current') == 'true', 'la sezione aperta è la prima (azienda)')
    nomi = [sez.nth(i).inner_text() for i in range(6)]
    ok('Dati dell’azienda' in nomi[0] and 'Conservazione dei dati' in nomi[5], 'sezioni in ordine: azienda … conservazione')

    # *Prova la connessione* su una casella non configurata: messaggio chiaro, non un 500
    pg.goto(BASE + '/impostazioni/casella'); pg.wait_for_load_state('networkidle')
    pg.locator('button:has-text("Prova la connessione")').click(); pg.wait_for_timeout(1500)
    r = testo(pg, 'p.nota[role=status]')
    ok('non configurata' in r or 'non riuscita' in r, 'prova casella non configurata: %s' % r)
    ok('500' not in r and 'Qualcosa non ha funzionato' not in r, 'la prova non è un 500')

    # salvataggio dei dati dell’azienda e rilettura dopo il ricaricamento
    pg.goto(BASE + '/impostazioni/azienda'); pg.wait_for_load_state('networkidle')
    pg.fill('#c-ragione_sociale', 'Decobrands SRL')
    pg.fill('#c-piva', 'IT03589740163')
    pg.fill('#c-email', 'amministrazione@decobrands.it')
    pg.fill('#c-indirizzo', 'Via di prova F5-A6')
    pg.locator('button:has-text("Salva dati dell’azienda")').click(); pg.wait_for_timeout(1200)
    ok('Impostazioni salvate' in testo(pg, '.avviso'), 'avviso «Impostazioni salvate»')
    pg.reload(); pg.wait_for_load_state('networkidle')
    ok(pg.input_value('#c-indirizzo') == 'Via di prova F5-A6', 'il dato salvato si ritrova dopo il ricaricamento')
    # ripristina l’intestazione del seed
    pg.fill('#c-indirizzo', 'Via dell’Industria 12, 24040 Bergamo')
    pg.locator('button:has-text("Salva dati dell’azienda")').click(); pg.wait_for_timeout(1200)

    # una password salvata compare «impostata» e il valore non è nel DOM né nelle risposte
    pg.goto(BASE + '/impostazioni/casella'); pg.wait_for_load_state('networkidle')
    pg.fill('#c-password', 'SEGRETA-PROVA-E2E')
    pg.locator('button:has-text("Salva casella dei documenti")').click(); pg.wait_for_timeout(1200)
    ok('Impostazioni salvate' in testo(pg, '.avviso'), 'password salvata')
    pg.reload(); pg.wait_for_load_state('networkidle')
    ok('impostata' in pg.get_attribute('#c-password', 'placeholder'), 'la password salvata compare «impostata»')
    dom = pg.content()
    corpi = '\n'.join(b for _, b in risposte)
    ok('SEGRETA-PROVA-E2E' not in dom and 'SEGRETA-PROVA-E2E' not in corpi,
       'il valore della password non è nel DOM né nelle risposte')

    # un numero fuori limite: l’errore del server, non un salvataggio silenzioso
    pg.goto(BASE + '/impostazioni/conservazione'); pg.wait_for_load_state('networkidle')
    pg.fill('#c-righe_pagina', '500')
    pg.locator('button:has-text("Salva conservazione dei dati")').click(); pg.wait_for_timeout(1200)
    ok('da 5 a 200' in testo(pg, '.avviso'), 'numero fuori limite: l’avviso dice il limite')

    # 1440 e 768 px: nessuno scorrimento orizzontale, nessun errore JavaScript
    pg.goto(BASE + '/impostazioni/azienda'); pg.wait_for_load_state('networkidle')
    pg.screenshot(path=str(USCITA / 'app-impostazioni-1440.png'), full_page=True)
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(700)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    ok(pg.locator('.selezionabile a').count() == 6, '768 px: le sei sezioni restano a sinistra')
    pg.screenshot(path=str(USCITA / 'app-impostazioni-768.png'), full_page=True)
    pg.close()

    # chi non è amministratore vede «Pagina riservata» e non ha la voce Impostazioni
    pg = entra(S + '-lett')
    ok('Pagina riservata' in testo(pg, '.vuoto'), 'lettura: la pagina dice «Pagina riservata»')
    ok(pg.locator('.barra a', has_text='Impostazioni').count() == 0, 'lettura: la voce Impostazioni non compare nel menu')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
