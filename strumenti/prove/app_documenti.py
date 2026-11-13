# Prova della pagina Documenti dell'app (F6-A4b, §7.9) con Playwright: pagina unica come il
# prototipo (elenco selezionabile a sinistra, documento scelto a destra), finestra di correzione,
# salvataggio, scarto, sola lettura. Servono backend (8002) e frontend (8001) accesi, gli utenti di
# prova <s>-ammi e <s>-lett (utenti_prova.js crea <s>) e il documento di prova (lo crea e lo toglie
# questo script con documenti_prova.js).
# Uso: python strumenti/prove/app_documenti.py <suffisso> <cartella schermate>
import pathlib, subprocess, sys, json, re
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

def scegli(pg, campo, scritto):
    """Campo di ricerca (CampoRicerca): si scrive, compare il menu, si sceglie la prima voce. Ritorna il valore scelto."""
    pg.fill('#c-' + campo, scritto)
    menu = pg.locator('.velo .ricerca-menu:not([hidden])')
    menu.wait_for(); voce = menu.locator('li[role=option]').first
    voce.wait_for(); nome = voce.locator('b').inner_text(); voce.click()
    pg.wait_for_function("document.querySelectorAll('.velo .ricerca-menu:not([hidden])').length === 0")
    return nome, pg.locator('input[name=%s]' % campo).input_value()

prova_documento('crea')
prova_documento('crea-senza')
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
        voceSenza = '.selezionabile a:has-text("PROVA-SENZA-%s")' % S.upper()

        pg = entra(S + '-ammi')
        # se la pagina ha errori JS l'elenco non compare: li si dice subito, non con un timeout muto
        ok(not errori, 'nessun errore di pagina all’apertura' + ((': ' + '; '.join(errori[:3])) if errori else ''))
        pg.wait_for_selector('.selezionabile a')
        ok('Documenti' in testo(pg, '.testa h1'), 'titolo della pagina')
        ok(pg.locator('.caricamento').count() == 1, 'area di caricamento nel pannello Da controllare')
        ok('Da controllare' in testo(pg, '.pannello-testa'), 'pannello Da controllare')
        nota = pg.locator('.pannello:has(h2:has-text("Da controllare")) .pannello-nota').first
        pg.wait_for_function("() => /\\d+ document/.test(document.querySelector('.pannello-nota')?.textContent ?? '')")
        ok('document' in nota.inner_text(), 'conteggio dei documenti nel pannello')
        # §7.9: lettura non configurata → avviso fisso (non a scomparsa) e ritmo dichiarato
        ok(pg.locator('.avviso-variazioni:has-text("lettura dei documenti non è configurata")').count() == 1,
           'avviso fisso: la lettura dei documenti non è configurata')
        ok('ogni 15 secondi' in testo(pg, '.pannello'), 'nota: si legge un documento ogni 15 secondi')
        pg.wait_for_selector(voce)
        pg.click(voce)  # due documenti di prova: si sceglie quello normale
        pg.locator(voce + '[aria-current=true]').wait_for(timeout=10000)
        ok('Fattura PROVA-' + S.upper() in testo(pg, voce), 'elenco: tipo e numero letti')
        ok(pg.locator(voce + ' .stato:has-text("Affidabilità bassa")').count() == 1, 'elenco: livello basso (rosso)')
        ok(pg.locator(voce + '[aria-current=true]').count() == 1, 'il primo documento è selezionato nella stessa pagina')
        pg.screenshot(path=str(USCITA / 'app-documenti-1440.png'), full_page=True)

        pg.wait_for_selector('.dettagli', timeout=10000)  # il dettaglio arriva dal server
        ok(pg.locator('.dettagli').count() == 1, 'a destra il documento scelto, senza cambiare pagina')
        ok('PROVA-' + S.upper() in pg.locator('.pannello-testa h2').last.inner_text(), 'dettaglio: titolo con il documento')
        ok('Codice cliente' in testo(pg, '.dettagli') and 'Importo' in testo(pg, '.dettagli'), 'dettaglio: testata con codice cliente e importo')
        ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'due schede: azione proposta e righe lette')
        ok('Scegli la pratica' in testo(pg, '.schede-barra') or 'Pratica proposta' in testo(pg, '.schede-barra'), 'scheda dell’azione proposta')

        # A5-04: cambiando documento il dettaglio riparte da «azioni» e non conserva la scelta fatta prima
        pg.fill('.abbina-altra input', 'pratica scelta sul primo documento')
        pg.click(voceSenza); pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(300)
        ok(pg.locator('.schede-barra [role=tab]').first.get_attribute('aria-selected') == 'true',
           'A5-04: cambiando documento la scheda torna ad «azioni»')
        pg.click(voce); pg.wait_for_selector('.abbina-altra input')
        ok(pg.input_value('.abbina-altra input') == '',
           'A5-04: tornando al documento il campo di abbinamento è vuoto')
        ok(pg.locator('.abbina-altra input').count() == 1, 'A5-04: il campo di abbinamento c’è ancora')
        pg.locator(voce + '[aria-current=true]').wait_for()

        # A5-01: «Vedi le righe» nell'avviso apre davvero la scheda Righe lette (scheda controllata)
        pg.click('button:has-text("Vedi le righe")'); pg.wait_for_timeout(200)
        ok(pg.locator('.schede-barra [role=tab]:has-text("Righe lette")').get_attribute('aria-selected') == 'true',
           'A5-01: «Vedi le righe» apre la scheda Righe lette')
        ok('di non riconosciuto' not in pg.locator('body').inner_text(), 'A6-16: niente «di non riconosciuto» nei testi')
        pg.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg.wait_for_timeout(200)
        ok(pg.locator('.dt tbody tr').count() == 2, 'righe lette: due righe')
        pg.wait_for_selector('.schede-conta')
        ok('da controllare' in testo(pg, '.schede-barra [role=tab]:has-text("Righe lette")'), 'contatore delle righe incerte nella scheda')
        pg.screenshot(path=str(USCITA / 'app-documento-1440.png'), full_page=True)

        pg.click('.pannello-testa button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
        pg.wait_for_selector('.aff-sx canvas', timeout=20000)  # il visore disegna le pagine in modo asincrono (PDF.js)
        pg.wait_for_timeout(400)  # le voci delle anagrafiche arrivano dal server: la ricerca mostra il nome, non l'id
        pg.screenshot(path=str(USCITA.parents[1] / 'correggi-1440.png'))  # schermata della finestra per il controllo visivo
        ok(pg.locator('.aff-sx canvas').count() >= 1, 'finestra di correzione: PDF originale a sinistra')
        ok(pg.input_value('input[data-campo="numero"]') == 'PROVA-' + S.upper(), 'finestra di correzione: numero letto')
        ok(pg.locator('.aff-dx .incerto-errore').count() >= 1 and pg.locator('.aff-dx .incerto-attesa').count() >= 1, 'campi bordati giallo e rosso')
        ok('pagina' in testo(pg, '.aff-dx') or 'Seleziona un campo' in testo(pg, '.aff-dx'), 'posizione del campo accanto ai dati')
        pg.fill('input[data-campo="numero"]', 'PROVA-' + S.upper() + '-B')
        pg.fill('input[data-campo="importo"]', '')  # campo euro: si svuota prima di scrivere (CampoEuro non si azzera da solo)
        pg.fill('input[data-campo="importo"]', '260.5')
        pg.click('button:has-text("Aggiungi riga")'); pg.wait_for_timeout(100)
        pg.fill('input[data-campo="righe[2].codice"]', 'BALC-405')
        pg.fill('input[data-campo="righe[2].descrizione"]', 'Riga aggiunta')
        pg.fill('input[data-campo="righe[2].quantita"]', '1')
        pg.fill('input[data-campo="righe[2].prezzo"]', '10.5')
        pg.fill('input[data-campo="righe[2].importo"]', '10.5')
        pg.wait_for_timeout(100)
        ok(pg.input_value('input[data-campo="righe[2].prezzo"]').replace('\u00a0', ' ') == '10,50 €',
           'campo in euro: fuori dal fuoco il prezzo si legge 10,50 € (col fuoco il punto è accettato)')
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
        pg.wait_for_selector('.aff-sx canvas', timeout=20000)
        pg.screenshot(path=str(USCITA.parents[1] / 'correggi-768.png'))  # schermata della finestra a 768 px
        ok(pg.evaluate("getComputedStyle(document.querySelector('.aff-corpo')).flexDirection") == 'column', '768 px: correzione impilata')
        ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: correzione senza scorrimento orizzontale')
        # correzioni 1: a 768 la «Somma righe» resta dentro la colonna dell'Importo
        dentro768 = pg.evaluate("""() => {
          const s = document.querySelector('.sopra-riga'); if (!s) return null;
          const c = s.closest('.campo-letto').getBoundingClientRect(), r = s.getBoundingClientRect();
          return r.left >= c.left - 1 && r.right <= c.right + 1;
        }""")
        ok(dentro768 is True, '768 px: «Somma righe» dentro la colonna dell’Importo')
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

        # D-106: documento senza agenzia → pillola in lista → Configura l'agenzia → il documento si registra
        pg.reload(); pg.wait_for_selector('.selezionabile a')
        voceSenza = '.selezionabile a:has-text("PROVA-SENZA-%s")' % S.upper()
        pg.wait_for_selector(voceSenza)
        ok(pg.locator(voceSenza + ' .stato:has-text("Manca l’agenzia")').count() == 1, 'lista: pillola Manca l’agenzia sul documento senza agenzia')
        pg.click(voceSenza); pg.wait_for_timeout(300)
        ok(pg.locator('button:has-text("Configura l’agenzia")').count() == 1, 'dettaglio: azione Configura l’agenzia')
        pg.screenshot(path=str(USCITA / 'app-documento-manca-agenzia-1440.png'))
        pg.click('button:has-text("Configura l’agenzia")'); pg.wait_for_selector('.velo .modale')
        ok(pg.locator('.velo input[name=fornitore_id]').get_attribute('disabled') is not None, 'finestra: fornitore fisso (disabilitato)')
        ok('Nuova agenzia per ' in testo(pg, '.velo .modale-testa'), 'finestra: cliente fisso nel titolo')
        ok(pg.input_value('.velo input[name=valido_dal]') == '2026-09-15', 'finestra: «Valido dal» = data del documento')
        ok(pg.input_value('.velo input[name=subagente_id]') == '', 'finestra: subagente vuoto da scegliere (D-134, mai il primo dell’elenco)')
        s_, sid = scegli(pg, 'subagente_id', 'Nis')
        ok('Nista' in s_ and sid.isdigit(), 'subagente scelto dal menu: %s (id %s)' % (s_, sid))
        pg.click('.velo .modale-piede button:has-text("Crea")')
        pg.wait_for_selector('.avviso:has-text("Agenzia creata")')
        try:
            pg.wait_for_selector(voceSenza + ' .stato:has-text("Manca l’agenzia")', state='detached', timeout=8000)
            senza_gone = True
        except Exception:
            senza_gone = False
        ok(senza_gone, 'dopo il salvataggio la pillola sparisce')
        ok(pg.locator('.scelte button:has-text("Apri la pratica")').count() == 1, 'dettaglio: ora si può aprire la pratica')
        pg.click('.scelte button:has-text("Apri la pratica")'); pg.wait_for_selector('.velo .modale:has-text("Apri la pratica")')
        pg.click('.velo .modale-piede button:has-text("Apri la pratica")')
        pg.wait_for_function("location.pathname.startsWith('/pratiche/')")
        ok(True, 'il documento senza agenzia si registra: aperta la pratica')
        pg.close()

        # D-133 (R2-01, R2-08): import del fornitore dal documento. La scheda è simulata (il documento
        # vero vorrebbe un fornitore nel ponte di Integra); si guarda quello che la correzione cambia:
        # il browser non manda più il PUT che cancellava le righe, aspetta l'import, ricarica la scheda.
        scheda = {
            'id': '999999', 'file_nome': 'prova-integra.pdf', 'file_tipo': 'pdf', 'stato': 'da_controllare',
            'tipo': 'fattura', 'livello': 'affidabile', 'ricevuto_il': '2026-09-15T09:00:00.000Z',
            'letto_il': '2026-09-15T09:01:00.000Z', 'errore': None, 'scaglioni_mancanti': False, 'fornitore': None,
            'campi': [], 'controlli': [],
            'testata': {'tipo': 'fattura', 'numero': 'PROVA-INTEGRA', 'data': '2026-09-15', 'fornitore_id': None,
                        'codice_cliente': 'K-1', 'cliente': 'Cliente Prova', 'importo': 250,
                        'mese': None, 'anno': None, 'riferimento_fattura': None},
            'righe': [
                {'i': 0, 'codice': 'ART-1', 'descrizione': 'Articolo di prova', 'quantita': 2, 'prezzo': 100,
                 'importo': 200, 'numero_fattura': None, 'data_fattura': None, 'provvigione': None},
                {'i': 1, 'codice': 'ART-2', 'descrizione': 'Secondo articolo', 'quantita': 1, 'prezzo': 50,
                 'importo': 50, 'numero_fattura': None, 'data_fattura': None, 'provvigione': None},
            ],
            'proposta': {
                'esito': 'fornitore_da_integra', 'candidati': [], 'importo': 250, 'abbinamento': None,
                'cliente_riconosciuto': None, 'agenzia_mancante': None, 'cliente_da_integra': None,
                'manca_rappresentanza': None,
                'candidati_fornitore': [], 'candidati_cliente': [], 'integra_non_raggiungibile': False,
                'fornitore_da_integra': {'id_integra': 99001, 'ragione_sociale': 'Fornitore Prova Integra', 'piva': '99999999991'},
            },
            'bollettino': None,
            'soglie': {'soglia_ok': 0.8, 'soglia_bassa': 0.7},
        }
        visti = {'dettaglio': 0, 'importa': 0, 'put': 0, 'pendente': []}
        def risposta(route, corpo):
            route.fulfill(status=200, content_type='application/json', body=corpo)
        def dettaglio_simulato(route):
            visti['dettaglio'] += 1
            risposta(route, json.dumps(scheda))
        def importa_in_attesa(route):
            visti['importa'] += 1
            visti['pendente'].append(route)  # non risponde: il pulsante resta «Importo…»
        pg2 = entra(S + '-ammi')
        pg2.on('request', lambda r: visti.__setitem__('put', visti['put'] + 1) if r.method == 'PUT' else None)
        pg2.route(re.compile(r'^.*/api/documenti/999999$'), dettaglio_simulato)
        pg2.route('**/api/integra/importa', importa_in_attesa)
        pg2.goto(BASE + '/documenti/999999')
        pronto = pg2.locator('button:has-text("Importa da Integra")')
        pronto.wait_for()
        prima = visti['dettaglio']  # C1: la scheda si legge 1 o 2 volte all'apertura (Strict Mode)
        pronto.click()
        pg2.wait_for_selector('button:has-text("Importo…")')
        ok(pg2.locator('button[disabled]:has-text("Importo…")').count() == 1, 'import in corso: pulsante spento e «Importo…»')
        pg2.locator('button:has-text("Importo…")').dispatch_event('click')  # il secondo clic non deve partire
        pg2.wait_for_timeout(400)
        ok(visti['importa'] == 1, 'secondo clic durante l’attesa: una sola richiesta (R2-08)')
        visti['pendente'][0].abort()
        pg2.wait_for_selector('button:has-text("Importa da Integra")', timeout=5000)
        ok(visti['put'] == 0, 'il browser non manda il PUT che cancellava le righe lette (R2-01)')
        ok(visti['dettaglio'] == prima, 'import non riuscito: la scheda non si ricarica')
        pg2.unroute('**/api/integra/importa')
        pg2.route('**/api/integra/importa', lambda r: risposta(r, '{"creato":true,"id":"1"}'))
        prima = visti['dettaglio']
        pg2.locator('button:has-text("Importa da Integra")').click()
        pg2.wait_for_selector('.avviso:has-text("Fornitore importato da Integra")')
        ok(visti['dettaglio'] == prima + 1 and visti['put'] == 0, 'dopo l’import la scheda si ricarica una volta, senza PUT')
        pg2.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg2.wait_for_timeout(200)
        ok(pg2.locator('.dt tbody tr').count() == 2 and 'ART-1' in testo(pg2, '.dt tbody'),
           'dopo l’import le righe lette sono ancora nella scheda Righe')
        pg2.screenshot(path=str(USCITA / 'app-documento-import-integra-1440.png'))
        pg2.close()

        # A4-01: un documento in errore offre «Rileggi il documento» (la lettura si riprova). La scheda
        # è simulata come per l'import: non serve un documento vero nello stato errore.
        scheda_errore = {
            'id': '999998', 'file_nome': 'prova-errore.pdf', 'file_tipo': 'pdf', 'stato': 'errore',
            'tipo': None, 'livello': None, 'ricevuto_il': '2026-09-15T09:00:00.000Z',
            'letto_il': None, 'errore': 'LlamaCloud non ha accettato il file (402): crediti finiti',
            'scaglioni_mancanti': False, 'fornitore': None, 'campi': [], 'controlli': [],
            'testata': {'tipo': None, 'numero': None, 'data': None, 'fornitore_id': None,
                        'codice_cliente': None, 'cliente': None, 'importo': None,
                        'mese': None, 'anno': None, 'riferimento_fattura': None},
            'righe': [],
            'proposta': {'esito': 'nessuno', 'candidati': [], 'importo': 0, 'abbinamento': None,
                         'cliente_riconosciuto': None, 'agenzia_mancante': None, 'cliente_da_integra': None,
                         'manca_rappresentanza': None, 'fornitore_da_integra': None,
            'candidati_fornitore': [], 'candidati_cliente': [], 'integra_non_raggiungibile': False},
            'bollettino': None,
            'soglie': {'soglia_ok': 0.8, 'soglia_bassa': 0.7},
        }
        pg3 = entra(S + '-ammi')
        pg3.route(re.compile(r'^.*/api/documenti/999998$'), lambda r: risposta(r, json.dumps(scheda_errore)))
        pg3.goto(BASE + '/documenti/999998')
        pg3.locator('button:has-text("Rileggi il documento")').wait_for(timeout=15000)
        ok(pg3.locator('button:has-text("Rileggi il documento")').count() == 1, 'errore: pulsante Rileggi il documento')
        ok(pg3.locator('button:has-text("Correggi i dati letti")').count() == 1, 'errore: pulsante Correggi i dati letti per inserire i dati a mano')
        ok('di non riconosciuto' not in pg3.locator('body').inner_text(), 'A6-16: nessun documento senza fornitore dice «di non riconosciuto»')
        pg3.close()

        # A6-16: ordine senza fornitore riconosciuto → testi pensati per un documento senza nome fornitore
        scheda_ordine = dict(scheda_errore, id='999997', stato='da_controllare', tipo='ordine', livello='da_controllare',
                             file_nome='prova-ordine.pdf')
        scheda_ordine['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-ORDINE', codice_cliente='K-9')
        pg4 = entra(S + '-ammi')
        pg4.route(re.compile(r'^.*/api/documenti/999997$'), lambda r: risposta(r, json.dumps(scheda_ordine)))
        pg4.goto(BASE + '/documenti/999997')
        pg4.locator('.abbina-altra').wait_for(timeout=15000)
        corpo4 = pg4.locator('body').inner_text()
        ok('di non riconosciuto' not in corpo4, 'A6-16: il testo non usa «non riconosciuto» come nome del fornitore')
        ok('Fornitore e codice cliente non letti' in corpo4, 'A6-16: avviso per fornitore e codice non letti')
        ok('Oppure abbina a un’altra pratica:' in corpo4, 'A6-16: «Oppure abbina a un’altra pratica» senza il nome')
        pg4.close()

        # «Fornitore letto» e «Cliente letto»: il nome scritto sul documento si corregge come gli altri
        # campi; il pulsante › (non più «Cerca questo») mette il nome letto nella ricerca (per parole).
        scheda_letto = dict(scheda_errore, id='999996', stato='da_controllare', tipo='fattura',
                            livello='bassa', file_nome='prova-letto.jpg', file_tipo='jpg',
                            campi=[{'campo': 'fornitore', 'valore_letto': 'Gries GmbH', 'valore_finale': None,
                                    'affidabilita': 0.62, 'posizione': None, 'precisione': 'assente', 'verificato': False}])
        scheda_letto['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-LETTO',
                                       piva_cliente='DE123456', piva_fornitore='DE987654', fornitore='Gries GmbH',
                                       cliente='Agri Aggio SNC')
        pg5 = entra(S + '-ammi')
        pg5.route(re.compile(r'^.*/api/documenti/999996$'), lambda r: risposta(r, json.dumps(scheda_letto)))
        pg5.goto(BASE + '/documenti/999996')
        pg5.locator('button:has-text("Correggi i dati letti")').wait_for(timeout=15000)
        pg5.click('button:has-text("Correggi i dati letti")'); pg5.wait_for_selector('.affiancata')
        ok(pg5.input_value('input[data-campo="fornitore"]') == 'Gries GmbH',
           'Correggi i dati letti: il campo Fornitore letto mostra il nome letto')
        ok(pg5.locator('input[data-campo="piva_cliente"]').count() == 1
           and pg5.input_value('input[data-campo="piva_cliente"]') == 'DE123456', 'Correggi i dati letti: la P.IVA letta sotto il nome')
        ok(pg5.locator('input[data-campo="piva_fornitore"]').count() == 1
           and pg5.input_value('input[data-campo="piva_fornitore"]') == 'DE987654', 'Correggi i dati letti: la P.IVA del fornitore letta sotto il nome')
        # D-154: tre righe nell'ordine (tipo·numero·data·importo / cliente / fornitore), niente «Cerca questo»
        ok(pg5.locator('.aff-dx .riga-letti.tipo').count() == 1
           and pg5.locator('.aff-dx .riga-letti.cliente').count() == 1
           and pg5.locator('.aff-dx .riga-letti.fornitore').count() == 1, 'testata su tre righe (tipo, cliente, fornitore)')
        ok(pg5.locator('.riga-letti.tipo input[data-campo="importo"]').count() == 1, 'l’Importo sta nella prima riga')
        ok(pg5.locator('.aff-dx button:has-text("Cerca questo")').count() == 0,
           'niente più «Cerca questo» nella finestra Correggi')
        ok(pg5.locator('.aff-dx button.btn-arrow').count() == 2, 'due pulsanti › (cliente e fornitore)')
        # correzioni 1: etichette sulla stessa linea e campi della stessa altezza/linea in ogni riga
        righe_top = pg5.evaluate("""() => [...document.querySelectorAll('.aff-dx .riga-letti')].map((r) =>
          [...r.querySelectorAll('input, select, button.btn-arrow')].map((e) => Math.round(e.getBoundingClientRect().top)))""")
        ok(righe_top and all(max(t) - min(t) <= 2 for t in righe_top if t),
           'testata: campi di ogni riga sulla stessa linea (±2 px)')
        # D-153: la lente resta sulla stessa riga del campo Fornitore (niente wrap)
        campo_f = pg5.locator('.aff-dx input[aria-label="Cerca fornitore"]')
        lente_f = campo_f.locator('xpath=..').locator('button.ricerca-lente')
        bf = campo_f.bounding_box(); bl = lente_f.bounding_box()
        ok(bf is not None and bl is not None and abs(bf['y'] - bl['y']) <= 4,
           'la lente resta sulla stessa riga del campo Fornitore')
        # D-153: riepilogo dell'affidabilità chiuso di default, con la freccia e senza area vuota
        ok(pg5.locator('.aff-riepilogo .riep-freccia').count() == 1, 'riepilogo: freccia presente con punti aperti')
        ok(pg5.locator('#aff-riep-elenco[hidden]').count() == 1, 'riepilogo chiuso di default: elenco nascosto')
        pg5.click('.aff-dx button[aria-label="Cerca il cliente letto"]')
        pg5.wait_for_selector('.aff-dx .ricerca-menu:not([hidden])')
        ok(pg5.locator('.aff-dx .ricerca-menu:not([hidden])').count() == 1,
           'il pulsante › apre la ricerca col nome letto')
        ok(pg5.input_value('.aff-dx input[aria-label="Cerca cliente"]') == 'Agri Aggio SNC',
           'il pulsante › mette il nome letto nella ricerca del cliente')
        pg5.screenshot(path=str(USCITA / 'app-documenti-fornitore-letto-1440.png'))
        pg5.close()

        # §7.9: la lista mostra i documenti in coda (stato «In coda», in cima) e il dettaglio offre
        # «Togli dalla coda» che usa lo scarto esistente. La lista e il dettaglio sono simulati.
        lista_coda = {
            'documenti': [
                {'id': '999996', 'file_nome': 'prova-coda.pdf', 'file_tipo': 'pdf', 'tipo': None, 'numero': None,
                 'data': None, 'fornitore_id': None, 'fornitore': None, 'codice_cliente': None, 'cliente': None,
                 'importo': None, 'livello': None, 'stato': 'in_coda', 'ricevuto_il': '2026-09-15T09:00:00.000Z',
                 'letto_il': None, 'controlli_n': 0, 'manca_agenzia': False, 'manca_rappresentanza': False,
                 'fornitore_da_integra': False, 'cliente_da_integra': False},
            ],
            'conteggi': {'da_controllare': 0, 'in_coda': 1, 'in_lettura': 0, 'errore': 0},
            'totale': 1, 'pagina': 1, 'per_pagina': 200, 'lettura_configurata': False,
        }
        scheda_coda = {
            'id': '999996', 'file_nome': 'prova-coda.pdf', 'file_tipo': 'pdf', 'stato': 'in_coda', 'tipo': None,
            'livello': None, 'ricevuto_il': '2026-09-15T09:00:00.000Z', 'letto_il': None, 'errore': None,
            'scaglioni_mancanti': False, 'fornitore': None, 'campi': [], 'controlli': [],
            'testata': {'tipo': None, 'numero': None, 'data': None, 'fornitore_id': None, 'codice_cliente': None,
                        'cliente': None, 'importo': None, 'mese': None, 'anno': None, 'riferimento_fattura': None},
            'righe': [],
            'proposta': {'esito': 'nessuno', 'candidati': [], 'importo': 0, 'abbinamento': None,
                         'cliente_riconosciuto': None, 'agenzia_mancante': None, 'cliente_da_integra': None,
                         'manca_rappresentanza': None, 'fornitore_da_integra': None,
            'candidati_fornitore': [], 'candidati_cliente': [], 'integra_non_raggiungibile': False},
            'bollettino': None,
            'soglie': {'soglia_ok': 0.8, 'soglia_bassa': 0.7},
        }
        scarti = {'n': 0}
        pg5 = entra(S + '-ammi')
        pg5.route(re.compile(r'^.*/api/documenti\?stato=aperte.*'), lambda r: risposta(r, json.dumps(lista_coda)))
        pg5.route(re.compile(r'^.*/api/documenti/999996$'), lambda r: risposta(r, json.dumps(scheda_coda)))
        def scarta_coda(route):
            scarti['n'] += 1
            route.fulfill(status=204, content_type='application/json', body='')
        pg5.route(re.compile(r'^.*/api/documenti/999996/scarta$'), scarta_coda)
        pg5.goto(BASE + '/documenti')
        pg5.wait_for_selector('.selezionabile a')
        ok(pg5.locator('.selezionabile a .stato:has-text("In coda")').count() == 1, 'lista: il documento in coda compare con «In coda»')
        ok('prova-coda.pdf' in testo(pg5, '.selezionabile'), 'lista: la riga in coda mostra il nome del file')
        pg5.click('.selezionabile a:has-text("prova-coda.pdf")')
        pg5.locator('button:has-text("Togli dalla coda")').wait_for(timeout=15000)
        ok(pg5.locator('button:has-text("Togli dalla coda")').count() == 1, 'dettaglio in coda: pulsante Togli dalla coda')
        ok(pg5.locator('button:has-text("Scarta il documento")').count() == 0, 'dettaglio in coda: niente Scarta il documento')
        pg5.screenshot(path=str(USCITA / 'app-documenti-coda-1440.png'))
        pg5.locator('button:has-text("Togli dalla coda")').click(); pg5.wait_for_selector('.modale')
        pg5.locator('.modale-piede button:has-text("Togli dalla coda")').click(); pg5.wait_for_timeout(500)
        ok(scarti['n'] == 1, 'Togli dalla coda: chiama lo scarto esistente (una volta)')
        pg5.close()

        # D-152: fornitore non univoco → elenco dei candidati con la fonte (CRM/Integra) e il pulsante
        # «Scegli»; scegliendo un candidato il server ricollega e la scheda si ricarica. Scheda simulata.
        scheda_scegli = dict(scheda_errore, id='999995', stato='da_controllare', tipo='ordine', livello='da_controllare',
                             file_nome='prova-scegli.pdf')
        scheda_scegli['proposta'] = {
            'esito': 'fornitore_da_scegliere', 'candidati': [], 'importo': 0, 'abbinamento': None,
            'cliente_riconosciuto': None, 'agenzia_mancante': None, 'cliente_da_integra': None,
            'manca_rappresentanza': None, 'fornitore_da_integra': None,
            'candidati_fornitore': [
                {'fonte': 'crm', 'id': '11', 'ragione_sociale': 'Arte Wohnaccessoires GmbH & Co. KG', 'piva': '12345678901', 'citta': None, 'motivo': 'nome simile'},
                {'fonte': 'integra', 'id': '22', 'ragione_sociale': 'Arte SRL', 'piva': '12345678901', 'citta': None, 'motivo': 'nome simile'},
            ],
            'candidati_cliente': [], 'integra_non_raggiungibile': False,
        }
        scelti = {'n': 0, 'dettaglio': 0}
        def dettaglio_scegli(route):
            scelti['dettaglio'] += 1
            risposta(route, json.dumps(scheda_scegli))
        def scegli_rotta(route):
            scelti['n'] += 1
            route.fulfill(status=200, content_type='application/json', body=json.dumps(scheda_scegli))
        pg6 = entra(S + '-ammi')
        pg6.route(re.compile(r'^.*/api/documenti/999995$'), dettaglio_scegli)
        pg6.route(re.compile(r'^.*/api/documenti/999995/scegli$'), scegli_rotta)
        pg6.goto(BASE + '/documenti/999995')
        pg6.locator('button[aria-label^="Scegli "]').first.wait_for(timeout=15000)
        ok(pg6.locator('button[aria-label^="Scegli "]').count() == 2, 'D-152: due candidati con il pulsante Scegli')
        ok('CRM' in pg6.locator('body').inner_text() and 'Integra' in pg6.locator('body').inner_text(), 'D-152: la fonte del candidato è un\'etichetta')
        ok('Fornitore da scegliere' in testo(pg6, '.schede-barra'), 'D-152: scheda «Fornitore da scegliere»')
        ok(pg6.locator('button:has-text("Nessuno di questi")').count() == 1, 'D-152: «Nessuno di questi» per cercare a mano')
        pg6.screenshot(path=str(USCITA / 'app-documento-scegli-1440.png'))
        prima = scelti['dettaglio']
        pg6.locator('button[aria-label^="Scegli "]').first.click()
        pg6.wait_for_timeout(400)
        ok(scelti['n'] == 1, 'D-152: la scelta chiama la rotta scegli una volta')
        ok(scelti['dettaglio'] > prima, 'D-152: dopo la scelta la scheda si ricarica')
        pg6.close()

        # D-152: la ricerca del fornitore guarda anche Integra: nella finestra compare la riga «Integra»
        # sotto i risultati del CRM, dal ponte finto (/api/integra/cerca), e scegliendola si importa.
        # Scheda simulata: il documento vero PROVA-<s> è stato scartato prima, quindi non è nell'elenco
        # delle aperte; così il blocco non dipende dal suo stato (e la foto non serve al visore).
        scheda_integra = dict(scheda_errore, id='999993', stato='da_controllare', tipo='fattura',
                              livello='da_controllare', file_nome='prova-integra-cerca.jpg', file_tipo='jpg')
        scheda_integra['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-INTEGRA-CERCA',
                                         fornitore='Fornitore da cercare')
        int_ok = {'cerca': 0, 'importa': 0}
        def cerca_integra(route):
            int_ok['cerca'] += 1
            risposta(route, json.dumps({'righe': [{'id_integra': 99001, 'codice': 'F99001', 'ragione_sociale': 'Fornitore Prova Integra', 'piva': '99999999991', 'attivo': True}], 'ms': 1}))
        def importa_integra(route):
            int_ok['importa'] += 1
            risposta(route, json.dumps({'creato': True, 'id': '1', 'ragione_sociale': 'Fornitore Prova Integra'}))
        pg7 = entra(S + '-ammi')
        pg7.route(re.compile(r'^.*/api/documenti/999993$'), lambda r: risposta(r, json.dumps(scheda_integra)))
        pg7.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, '[]'))
        pg7.route(re.compile(r'^.*/api/integra/cerca\?tipo=fornitore.*$'), cerca_integra)
        pg7.route(re.compile(r'^.*/api/integra/importa$'), importa_integra)
        pg7.goto(BASE + '/documenti/999993')
        pg7.locator('button:has-text("Correggi i dati letti")').wait_for(timeout=15000)
        pg7.click('button:has-text("Correggi i dati letti")'); pg7.wait_for_selector('.affiancata')
        pg7.click('.ricerca-lente[title^="Apri la ricerca di fornitore"]')
        pg7.wait_for_selector('.velo .modale:has-text("Cerca fornitore")')
        pg7.fill('.velo .modale .filtri input[type="search"]', 'forn')
        pg7.wait_for_selector('.velo .modale li.menu-titolo:has-text("Integra")', timeout=5000)
        ok(int_ok['cerca'] >= 1, 'D-152: la ricerca del fornitore interroga anche Integra')
        ok(pg7.locator('.velo .modale li.menu-titolo:has-text("Integra")').count() == 1, 'D-152: riga «Integra» nella finestra di ricerca')
        ok('Fornitore Prova Integra' in pg7.locator('.velo .modale').inner_text(), 'D-152: la riga di Integra compare sotto i risultati del CRM')
        pg7.close()

        # D-154: «Somma righe» sopra l'Importo nella finestra Correggi (solo anteprima, mai salvata).
        # Le righe hanno quantità×prezzo senza importo letto: la somma si aggiorna al cambio del prezzo.
        scheda_somma = dict(scheda_errore, id='999994', stato='da_controllare', tipo='fattura',
                            livello='da_controllare', file_nome='prova-somma.pdf')
        scheda_somma['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-SOMMA', importo=250)
        scheda_somma['righe'] = [
            {'i': 0, 'codice': 'ART-1', 'descrizione': 'Articolo di prova', 'quantita': 2, 'prezzo': 100,
             'importo': None, 'numero_fattura': None, 'data_fattura': None, 'provvigione': None},
            {'i': 1, 'codice': 'ART-2', 'descrizione': 'Secondo articolo', 'quantita': 1, 'prezzo': 50,
             'importo': None, 'numero_fattura': None, 'data_fattura': None, 'provvigione': None},
        ]
        pgS = entra(S + '-ammi')
        pgS.route(re.compile(r'^.*/api/documenti/999994$'), lambda r: risposta(r, json.dumps(scheda_somma)))
        pgS.goto(BASE + '/documenti/999994')
        pgS.locator('button:has-text("Correggi i dati letti")').wait_for(timeout=15000)
        pgS.click('button:has-text("Correggi i dati letti")'); pgS.wait_for_selector('.affiancata')
        ok(pgS.locator('.sopra-riga').count() == 1, 'somma righe: compare sopra l’Importo')
        # correzioni 1: la «Somma righe» sta tutta dentro la colonna dell'Importo (a destra non esce)
        dentro1440 = pgS.evaluate("""() => {
          const s = document.querySelector('.sopra-riga'); if (!s) return null;
          const c = s.closest('.campo-letto').getBoundingClientRect(), r = s.getBoundingClientRect();
          return r.left >= c.left - 1 && r.right <= c.right + 1;
        }""")
        ok(dentro1440 is True, 'somma righe: dentro la colonna dell’Importo (a destra non esce)')
        ok('Somma righe' in pgS.locator('.sopra-riga').inner_text(), 'somma righe: etichetta «Somma righe»')
        ok('250,00' in pgS.locator('.sopra-riga').inner_text(), 'somma righe: 250,00 € all’apertura (2×100 + 1×50)')
        ok(pgS.locator('.sopra-riga .spunta-ok').count() == 1, 'somma righe: spunta verde se uguale all’importo')
        ok(pgS.locator('.sopra-riga .somma-righe-avviso').count() == 0, 'somma righe: nessun avviso se uguale')
        pgS.fill('input[data-campo="righe[0].prezzo"]', '120'); pgS.wait_for_timeout(100)
        ok('290,00' in pgS.locator('.sopra-riga').inner_text(), 'somma righe: si aggiorna al cambio del prezzo (2×120 + 50 = 290)')
        ok(pgS.locator('.sopra-riga .somma-righe-avviso').count() == 1, 'somma righe: avviso se diversa dall’importo')
        somma_avviso = pgS.locator('.sopra-riga .somma-righe-avviso').inner_text()
        ok('diversa di' in somma_avviso and '40,00' in somma_avviso,
           'somma righe: avviso con la differenza (40,00 €)')
        ok('290,00' in pgS.locator('.tab-righe tfoot td.dx').inner_text(), 'somma righe: stesso numero del piede della tabella')
        pgS.screenshot(path=str(USCITA.parents[1] / 'somma-1440.png'))
        pgS.close()

        b.close()
finally:
    prova_documento('togli')

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
