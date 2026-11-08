# Prova della pagina Documenti dell'app (F6-A4b, §7.9) con Playwright: pagina unica come il
# prototipo (elenco selezionabile a sinistra, documento scelto a destra), finestra di correzione,
# salvataggio, scarto, sola lettura. Servono backend (8002) e frontend (8001) accesi, gli utenti di
# prova <s>-ammi e <s>-lett (utenti_prova.js crea <s>) e il documento di prova (lo crea e lo toglie
# questo script con documenti_prova.js).
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

def prova_documento(comando):
    subprocess.run(['node', '../../strumenti/prove/documenti_prova.js', comando, S],
                   cwd=ROOT / 'app' / 'backend', check=True)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
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
        voce = '.selezionabile a:has-text("PROVA-%s")' % S.upper()

        pg = entra(S + '-ammi')
        pg.wait_for_selector('.selezionabile a')
        ok('Documenti' in testo(pg, '.testa h1'), 'titolo della pagina')
        ok(pg.locator('.caricamento').count() == 1, 'area di caricamento nel pannello Da controllare')
        ok('Da controllare' in testo(pg, '.pannello-testa'), 'pannello Da controllare')
        nota = pg.locator('.pannello:has(h2:has-text("Da controllare")) .pannello-nota').first
        pg.wait_for_function("() => /\\d+ document/.test(document.querySelector('.pannello-nota')?.textContent ?? '')")
        ok('document' in nota.inner_text(), 'conteggio dei documenti nel pannello')
        pg.wait_for_selector(voce)
        ok('Fattura PROVA-' + S.upper() in testo(pg, voce), 'elenco: tipo e numero letti')
        ok(pg.locator(voce + ' .stato:has-text("Affidabilità bassa")').count() == 1, 'elenco: livello basso (rosso)')
        ok(pg.locator(voce + '[aria-current=true]').count() == 1, 'il primo documento è selezionato nella stessa pagina')
        pg.screenshot(path=str(USCITA / 'app-documenti-1440.png'), full_page=True)

        ok(pg.locator('.dettagli').count() == 1, 'a destra il documento scelto, senza cambiare pagina')
        ok('PROVA-' + S.upper() in pg.locator('.pannello-testa h2').last.inner_text(), 'dettaglio: titolo con il documento')
        ok('Codice cliente' in testo(pg, '.dettagli') and 'Importo' in testo(pg, '.dettagli'), 'dettaglio: testata con codice cliente e importo')
        ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'due schede: azione proposta e righe lette')
        ok('Scegli la pratica' in testo(pg, '.schede-barra') or 'Pratica proposta' in testo(pg, '.schede-barra'), 'scheda dell’azione proposta')
        pg.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg.wait_for_timeout(200)
        ok(pg.locator('.dt tbody tr').count() == 2, 'righe lette: due righe')
        pg.wait_for_selector('.schede-conta')
        ok('da controllare' in testo(pg, '.schede-barra [role=tab]:has-text("Righe lette")'), 'contatore delle righe incerte nella scheda')
        pg.screenshot(path=str(USCITA / 'app-documento-1440.png'), full_page=True)

        pg.click('.pannello-testa button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
        ok(pg.locator('.aff-sx canvas').count() == 1, 'finestra di correzione: PDF originale a sinistra')
        ok(pg.input_value('input[data-campo="numero"]') == 'PROVA-' + S.upper(), 'finestra di correzione: numero letto')
        ok(pg.locator('.aff-dx .incerto-errore').count() >= 1 and pg.locator('.aff-dx .incerto-attesa').count() >= 1, 'campi bordati giallo e rosso')
        ok('pagina' in testo(pg, '.aff-dx') or 'Seleziona un campo' in testo(pg, '.aff-dx'), 'posizione del campo accanto ai dati')
        pg.fill('input[data-campo="numero"]', 'PROVA-' + S.upper() + '-B')
        pg.fill('input[data-campo="importo"]', '260')
        pg.click('button:has-text("Aggiungi riga")'); pg.wait_for_timeout(100)
        pg.fill('input[data-campo="righe[2].codice"]', 'BALC-405')
        pg.fill('input[data-campo="righe[2].descrizione"]', 'Riga aggiunta')
        pg.fill('input[data-campo="righe[2].quantita"]', '1')
        pg.fill('input[data-campo="righe[2].prezzo"]', '10')
        pg.fill('input[data-campo="righe[2].importo"]', '10')
        # il segno di conferma accanto al campo incerto non cambia il valore (F6-A4b)
        const_cerchi = pg.locator('.aff-dx .conferma-campo').count()
        ok(const_cerchi >= 1, 'finestra: il segno di conferma per i campi incerti')
        for _ in range(40):
            if not pg.locator('.aff-dx .conferma-campo').count():
                break
            pg.locator('.aff-dx .conferma-campo').first.click(); pg.wait_for_timeout(50)
        ok(pg.locator('.aff-dx .conferma-campo').count() == 0, 'tutti i campi confermati: niente più segni')
        ok('tutti i campi sono controllati' in testo(pg, '.aff-riepilogo'), 'riepilogo: nessun punto da controllare')
        pg.screenshot(path=str(USCITA / 'app-documenti-correggi-1440.png'))
        pg.click('button:has-text("Salva e ricalcola")'); pg.wait_for_selector('.avviso:has-text("Dati salvati")')
        ok(pg.locator('.affiancata').count() == 0, 'salvataggio: la finestra si chiude')
        ok(pg.locator('.pannello-testa .btn-conta').count() == 0, 'salvataggio: nessun punto da controllare sul pulsante')
        pg.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg.wait_for_timeout(200)
        ok(pg.locator('.dt tbody tr').count() == 3 and 'BALC-405' in testo(pg, '.dt tbody'), 'righe: la riga aggiunta c’è')
        pg.wait_for_selector(voce + ' .stato:has-text("Affidabile")', timeout=5000)
        ok(pg.locator(voce + ' .stato:has-text("Affidabile")').count() == 1, 'elenco: il livello è diventato affidabile')

        pg.set_viewport_size({'width': 768, 'height': 900}); pg.wait_for_timeout(400)
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: pagina senza scorrimento orizzontale')
        ok(pg.evaluate("getComputedStyle(document.querySelector('.colonne')).gridTemplateColumns.split(' ').length") == 1, '768 px: elenco e dettaglio impilati')
        pg.screenshot(path=str(USCITA / 'app-documenti-768.png'), full_page=True)
        pg.click('.pannello-testa button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
        ok(pg.evaluate("getComputedStyle(document.querySelector('.aff-corpo')).flexDirection") == 'column', '768 px: correzione impilata')
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: correzione senza scorrimento orizzontale')
        pg.screenshot(path=str(USCITA / 'app-documento-768.png'), full_page=True)
        pg.click('.aff-piede button:has-text("Annulla")'); pg.wait_for_timeout(200)
        pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(300)

        # sola lettura: stessa pagina, niente caricamento e niente pulsanti di modifica
        lett = entra(S + '-lett')
        lett.wait_for_selector('.selezionabile a')
        ok(lett.locator('.caricamento').count() == 0, 'sola lettura: niente area di caricamento')
        ok(lett.locator('.pannello-testa button:has-text("Correggi i dati letti")').count() == 0
           and lett.locator('.pannello-testa button:has-text("Scarta")').count() == 0,
           'sola lettura: niente pulsanti di modifica')
        lett.close()

        pg.click('.pannello-testa button:has-text("Scarta il documento")'); pg.wait_for_selector('.velo .modale')
        pg.select_option('.velo select[name=motivo]', 'Doppione')
        pg.click('.velo .modale-piede button:has-text("Scarta")')
        try:
            pg.wait_for_selector(voce, state='detached', timeout=10000)
        except Exception:
            pass
        ok(pg.locator(voce).count() == 0, 'scarto: il documento esce dall’elenco')
        pg.close()
        b.close()
finally:
    prova_documento('togli')

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
