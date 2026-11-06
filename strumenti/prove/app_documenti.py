# Prova della pagina Documenti dell'app (F6-A4b, §7.9) con Playwright: elenco, dettaglio,
# finestra di correzione, salvataggio, scarto, sola lettura. Servono backend (8002) e frontend
# (8001) accesi, gli utenti di prova <s>-ammi e <s>-lett (utenti_prova.js crea <s>) e il documento
# di prova (lo crea e lo toglie questo script con documenti_prova.js).
# Uso: python strumenti/prove/app_documenti.py <suffisso> <cartella schermate>
import pathlib, subprocess, sys
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
ROOT = pathlib.Path(__file__).resolve().parents[2]
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def num(pg, s): return int(pg.locator(s).first.inner_text().strip())

def prova_documento(comando):
    subprocess.run(['node', '../../strumenti/prove/documenti_prova.js', comando, S],
                   cwd=ROOT / 'app' / 'backend', check=True)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

prova_documento('crea')
try:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        def entra(utente, larghezza=1440):
            pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 500 else 844})
            pg.on('pageerror', lambda e: errori.append(str(e)))
            pg.goto(BASE + '/documenti'); pg.wait_for_function("location.pathname === '/accesso'")
            apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
            pg.wait_for_function("location.pathname === '/documenti'"); pg.wait_for_load_state('networkidle')
            return pg
        testo = lambda pg, s: pg.locator(s).first.inner_text()

        pg = entra(S + '-ammi')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        ok('Documenti' in testo(pg, '.testa h1'), 'titolo della pagina')
        ok(pg.locator('.caricamento').count() == 1, 'area di caricamento in alto')
        pg.fill('.filtri input[type=search]', 'PROVA-' + S.upper()); pg.wait_for_timeout(400)
        riga = '.dt tbody tr.cliccabile:has-text("PROVA-%s")' % S.upper()
        pg.wait_for_selector(riga)
        ok(num(pg, '.segmenti [role=tab]:has-text("Da controllare") .n') >= 1, 'segmento Da controllare con il conteggio')
        ok(pg.locator(riga + ' .stato:has-text("Affidabilità bassa")').count() == 1, 'riga con il livello basso (rosso)')
        ok('Fattura PROVA-' + S.upper() in testo(pg, riga), 'riga con tipo e numero letti')
        pg.screenshot(path=str(USCITA / 'app-documenti-1440.png'), full_page=True)

        pg.click(riga); pg.wait_for_function("location.pathname.startsWith('/documenti/')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dettagli')
        ok('PROVA-' + S.upper() in testo(pg, '.testa h1'), 'dettaglio: titolo con il documento')
        ok('Codice cliente' in testo(pg, '.dettagli') and 'Importo' in testo(pg, '.dettagli'), 'dettaglio: testata con codice cliente e importo')
        ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'due schede: azione proposta e righe lette')
        ok(pg.locator('object[type="application/pdf"]').count() == 1, 'PDF originale affiancato')
        ok('Scegli la pratica' in testo(pg, '.schede-barra') or 'Pratica proposta' in testo(pg, '.schede-barra'), 'scheda dell’azione proposta')
        pg.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg.wait_for_timeout(200)
        ok(pg.locator('.dt tbody tr').count() == 2, 'righe lette: due righe')
        pg.wait_for_selector('.schede-conta')
        ok('da controllare' in testo(pg, '.schede-barra [role=tab]:has-text("Righe lette")'), 'contatore delle righe incerte nella scheda')
        pg.screenshot(path=str(USCITA / 'app-documento-1440.png'), full_page=True)

        pg.click('.testa-azioni button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
        ok(pg.input_value('input[data-campo="numero"]') == 'PROVA-' + S.upper(), 'finestra di correzione: numero letto')
        ok(pg.locator('.aff-dx .incerto-errore').count() >= 1 and pg.locator('.aff-dx .incerto-attesa').count() >= 1, 'campi bordati giallo e rosso')
        ok('pagina' in testo(pg, '.aff-sx') or 'Seleziona un campo' in testo(pg, '.aff-sx'), 'posizione del campo sotto il documento')
        pg.fill('input[data-campo="numero"]', 'PROVA-' + S.upper() + '-B')
        pg.fill('input[data-campo="importo"]', '260')
        pg.click('button:has-text("Aggiungi riga")'); pg.wait_for_timeout(100)
        pg.fill('input[data-campo="righe[2].codice"]', 'BALC-405')
        pg.fill('input[data-campo="righe[2].descrizione"]', 'Riga aggiunta')
        pg.fill('input[data-campo="righe[2].quantita"]', '1')
        pg.fill('input[data-campo="righe[2].prezzo"]', '10')
        pg.fill('input[data-campo="righe[2].importo"]', '10')
        pg.screenshot(path=str(USCITA / 'app-documenti-correggi-1440.png'))
        pg.click('button:has-text("Salva e ricalcola")'); pg.wait_for_selector('.avviso:has-text("Dati salvati")')
        ok(pg.locator('.affiancata').count() == 0, 'salvataggio: la finestra si chiude')
        ok(pg.locator('.testa-azioni .btn-conta').count() == 0, 'salvataggio: nessun punto da controllare sul pulsante')
        pg.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg.wait_for_timeout(200)
        ok(pg.locator('.dt tbody tr').count() == 3 and 'BALC-405' in testo(pg, '.dt tbody'), 'righe: la riga aggiunta c’è')

        pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(400)
        pg.fill('.filtri input[type=search]', 'PROVA-' + S.upper()); pg.wait_for_timeout(400)
        pg.wait_for_selector(riga)
        ok(pg.locator(riga + ' .stato:has-text("Affidabile")').count() == 1, 'elenco: il livello è diventato affidabile')

        pg.set_viewport_size({'width': 768, 'height': 900}); pg.wait_for_timeout(300)
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: elenco senza scorrimento orizzontale')
        pg.screenshot(path=str(USCITA / 'app-documenti-768.png'), full_page=True)
        pg.click(riga); pg.wait_for_function("location.pathname.startsWith('/documenti/')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dettagli')
        ok(pg.evaluate("getComputedStyle(document.querySelector('.colonne')).gridTemplateColumns.split(' ').length") == 1, '768 px: dettaglio impilato')
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: dettaglio senza scorrimento orizzontale')
        pg.screenshot(path=str(USCITA / 'app-documento-768.png'), full_page=True)
        pg.click('.testa-azioni button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
        ok(pg.evaluate("getComputedStyle(document.querySelector('.aff-corpo')).flexDirection") == 'column', '768 px: correzione impilata')
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: correzione senza scorrimento orizzontale')
        pg.screenshot(path=str(USCITA / 'app-documenti-correggi-768.png'))
        pg.click('.aff-piede button:has-text("Annulla")'); pg.wait_for_timeout(200)
        pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(300)

        pg.click('.testa-azioni button:has-text("Scarta il documento")'); pg.wait_for_selector('.velo .modale')
        pg.select_option('.velo select[name=motivo]', 'Doppione')
        pg.click('.velo .modale-piede button:has-text("Scarta")')
        pg.wait_for_function("location.pathname === '/documenti'"); pg.wait_for_timeout(500)
        ok(pg.locator(riga).count() == 0, 'scarto: il documento esce dall’elenco')
        pg.close()

        pg = entra(S + '-lett')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        ok(pg.locator('.caricamento').count() == 0, 'sola lettura: niente area di caricamento')
        pg.click('.dt tbody tr.cliccabile'); pg.wait_for_function("location.pathname.startsWith('/documenti/')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dettagli')
        ok(pg.locator('.testa-azioni button:has-text("Correggi i dati letti")').count() == 0 and pg.locator('.testa-azioni button:has-text("Scarta")').count() == 0,
           'sola lettura: niente pulsanti di modifica')
        pg.close()
        b.close()
finally:
    prova_documento('togli')

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
