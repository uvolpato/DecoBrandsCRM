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
        pg.wait_for_selector('.selezionabile a')
        ok('Documenti' in testo(pg, '.testa h1'), 'titolo della pagina')
        ok(pg.locator('.caricamento').count() == 1, 'area di caricamento nel pannello Da controllare')
        ok('Da controllare' in testo(pg, '.pannello-testa'), 'pannello Da controllare')
        nota = pg.locator('.pannello:has(h2:has-text("Da controllare")) .pannello-nota').first
        pg.wait_for_function("() => /\\d+ document/.test(document.querySelector('.pannello-nota')?.textContent ?? '')")
        ok('document' in nota.inner_text(), 'conteggio dei documenti nel pannello')
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
                'fornitore_da_integra': {'id_integra': 99001, 'ragione_sociale': 'Fornitore Prova Integra', 'piva': '99999999991'},
            },
            'bollettino': None,
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
                         'manca_rappresentanza': None, 'fornitore_da_integra': None},
            'bollettino': None,
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

        b.close()
finally:
    prova_documento('togli')

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
