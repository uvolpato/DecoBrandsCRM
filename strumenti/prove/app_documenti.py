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
        ok('Codice cliente' in testo(pg, '.dettagli') and 'Importo' in testo(pg, '.dettagli') and 'Cliente' in testo(pg, '.dettagli'), 'dettaglio: testata con cliente, codice cliente e importo')
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
        pg.locator('input[data-campo="righe[2].prezzo"]').blur()  # il CampoEuro si riformatta fuori dal fuoco
        pg.wait_for_timeout(100)
        ok(pg.input_value('input[data-campo="righe[2].prezzo"]').replace('\u00a0', ' ') == '10,50 €',
           'campo in euro: fuori dal fuoco il prezzo si legge 10,50 € (col fuoco il punto è accettato)')
        ok('calcolato' in testo(pg, '.tab-righe tbody tr[data-riga="2"] .calcolato') and '10,50' in testo(pg, '.tab-righe tbody tr[data-riga="2"] .calcolato'),
           'riga nuova: l’importo è calcolato da quantità × prezzo (D-153, non più scritto a mano)')
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
        ok(pg.locator('.velo .modale-piede button:has-text("Scarta")').is_disabled(), 'scarto: il pulsante Scarta è spento finché non si spunta (D-172)')
        pg.click('.velo .casella-grave input')
        pg.click('.velo .modale-piede button:has-text("Scarta")')
        try:
            pg.wait_for_selector(voce, state='detached', timeout=10000)
        except Exception:
            pass
        ok(pg.locator(voce).count() == 0, 'scarto: il documento esce dall’elenco')

        # D-106: documento senza agenzia → pillola in lista → Configura l'agenzia → il documento si registra
        pg.reload(); pg.wait_for_selector('.selezionabile a')
        # ripetibile: l'agenzia creata qui sotto resta nel database; un giro dopo la stessa coppia ce l'ha
        # già e il server rifiuta. Si tolgono quelle del 15/09/2026 (la data del documento di prova).
        togl = pg.evaluate("""async (nome) => {
          const io = await (await fetch('/api/accesso/io')).json();
          const el = await (await fetch('/api/documenti?stato=aperte&pagina=1&per_pagina=200')).json();
          const doc = (el.documenti ?? []).find((x) => x.file_nome === nome);
          if (!doc) return 'documento non trovato';
          // il cliente del documento di prova non ha `cliente_id` (è riconosciuto per nome o P.IVA): si cerca
          let cid = doc.cliente_id;
          if (!cid && doc.cliente) {
            const cl = await (await fetch('/api/clienti')).json();
            cid = (cl.find((x) => x.ragione_sociale === doc.cliente) ?? {}).id;
          }
          if (!cid) return 'cliente non trovato';
          const c = await (await fetch('/api/clienti/' + cid)).json();
          let n = 0;
          for (const a of (c.agenzie ?? [])) {
            if (a.valido_dal !== '2026-09-15') continue;
            const r = await fetch('/api/clienti/' + cid + '/agenzie/' + a.id,
              { method: 'DELETE', headers: { 'x-csrf-token': io.csrf } });
            if (r.status === 204) n++;
          }
          return n;
        }""", 'Prova-senza_%s.pdf' % S)
        print('agenzie di prova tolte prima del flusso:', togl)
        voceSenza = '.selezionabile a:has-text("PROVA-SENZA-%s")' % S.upper()
        pg.wait_for_selector(voceSenza)
        ok(pg.locator(voceSenza + ' .stato:has-text("Manca l’agenzia")').count() == 1, 'lista: pillola Manca l’agenzia sul documento senza agenzia')
        pg.click(voceSenza); pg.wait_for_selector('.dettagli', timeout=10000)
        pg.wait_for_selector('button:has-text("Configura l’agenzia")', timeout=10000)
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
        # D-172: «Rileggi» apre la conferma con la casella; il pulsante resta spento finché non si spunta
        pg3.click('button:has-text("Rileggi il documento")'); pg3.wait_for_selector('.velo .modale')
        ok(pg3.locator('.velo .modale-piede button:has-text("Rileggi il documento")').is_disabled(), 'rileggi: il pulsante è spento finché non si spunta (D-172)')
        pg3.click('.velo .casella-grave input')
        ok(pg3.locator('.velo .modale-piede button:has-text("Rileggi il documento")').is_enabled(), 'rileggi: il pulsante si accende dopo la spunta')
        pg3.click('.velo .modale-piede button:has-text("Annulla")'); pg3.wait_for_timeout(200)
        pg3.close()

        # A6-16: ordine senza fornitore riconosciuto → testi pensati per un documento senza nome fornitore
        scheda_ordine = dict(scheda_errore, id='999997', stato='da_controllare', tipo='ordine', livello='da_controllare',
                             file_nome='prova-ordine.pdf')
        scheda_ordine['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-ORDINE', codice_cliente='K-9')
        pg4 = entra(S + '-oper')
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

        # cliente scelto: la ricerca «Cliente» è controllata (cliente_id), il pallino diventa verde
        # alla scelta e «Cliente letto» resta il dato del documento. La scheda e i clienti sono simulati.
        clienti_simulati = [{'id': '1001', 'ragione_sociale': 'Agri Aggio SNC', 'piva': 'IT000000'}]
        scheda_cliente = {
            'id': '999995', 'file_nome': 'prova-cliente.jpg', 'file_tipo': 'jpg', 'stato': 'da_controllare',
            'tipo': 'fattura', 'livello': 'da_controllare', 'ricevuto_il': '2026-09-15T09:00:00.000Z',
            'letto_il': '2026-09-15T09:01:00.000Z', 'errore': None, 'scaglioni_mancanti': False, 'fornitore': None,
            'campi': [], 'controlli': [],
            'testata': {'tipo': 'fattura', 'numero': 'PROVA-CLIENTE', 'data': '2026-09-15', 'fornitore_id': None,
                        'codice_cliente': None, 'cliente': 'Agri Aggio SNC', 'cliente_id': None,
                        'piva_cliente': None, 'piva_fornitore': None, 'fornitore': None, 'importo': None,
                        'mese': None, 'anno': None, 'riferimento_fattura': None},
            'righe': [],
            'proposta': {'esito': 'nessuno', 'candidati': [], 'importo': 0, 'abbinamento': None,
                         'cliente_riconosciuto': None, 'agenzia_mancante': None, 'cliente_da_integra': None,
                         'manca_rappresentanza': None, 'fornitore_da_integra': None,
                         'candidati_fornitore': [], 'candidati_cliente': [], 'integra_non_raggiungibile': False},
            'bollettino': None,
            'soglie': {'soglia_ok': 0.8, 'soglia_bassa': 0.7},
        }
        pg6 = entra(S + '-oper')
        pg6.route(re.compile(r'^.*/api/documenti/999995$'), lambda r: risposta(r, json.dumps(scheda_cliente)))
        pg6.route(re.compile(r'^.*/api/clienti$'), lambda r: risposta(r, json.dumps(clienti_simulati)))
        pg6.goto(BASE + '/documenti/999995')
        pg6.locator('button:has-text("Correggi i dati letti")').wait_for(timeout=15000)
        pg6.click('button:has-text("Correggi i dati letti")'); pg6.wait_for_selector('.affiancata')
        campo_cli = pg6.locator('.aff-dx input[aria-label="Cerca cliente"]')
        pallino = campo_cli.locator('xpath=..').locator('span.pallino')
        ok(pg6.input_value('input[data-campo="cliente"]') == 'Agri Aggio SNC',
           'cliente scelto: «Cliente letto» parte col nome letto')
        ok('ok' not in pallino.get_attribute('class'),
           'cliente scelto: prima della scelta il pallino non è verde')
        campo_cli.fill('Agri')
        menu_cli = pg6.locator('.aff-dx .ricerca-menu:not([hidden])')
        menu_cli.wait_for()
        menu_cli.locator('li[role=option]').first.click()
        pg6.wait_for_function("document.querySelectorAll('.aff-dx .ricerca-menu:not([hidden])').length === 0")
        ok('ok' in pg6.locator('.aff-dx input[aria-label="Cerca cliente"]').locator('xpath=..').locator('span.pallino').get_attribute('class'),
           'cliente scelto: alla scelta il pallino diventa verde')
        verde_cli = pg6.locator('.aff-dx input[aria-label="Cerca cliente"]').locator('xpath=..').locator('a.pallino-link')
        ok(verde_cli.count() == 1 and verde_cli.get_attribute('href') == '/clienti/1001',
           'pallino verde del cliente: link alla scheda del cliente scelto')
        ok(verde_cli.get_attribute('target') is None and verde_cli.get_attribute('rel') is None,
           'pallino verde del cliente: si apre nella stessa scheda (D-170)')
        ok(verde_cli.get_attribute('aria-label') == 'Apri la scheda del cliente Agri Aggio SNC',
           'pallino verde del cliente: aria-label con il nome')
        ok(pg6.input_value('input[data-campo="cliente"]') == 'Agri Aggio SNC',
           'cliente scelto: «Cliente letto» resta il nome letto (non sovrascritto)')
        pg6.screenshot(path=str(USCITA / 'app-documenti-cliente-scelto-1440.png'))
        pg6.close()

        # D-157: con fornitore scelto la ricerca del cliente mostra il «Cod. cliente» (il codice presso
        # quel fornitore) e la voce col codice uguale a quello letto sale in testa col segno «coincide».
        clienti_cod = [{'id': '1002', 'ragione_sociale': 'Vivai Prova SNC', 'piva': 'IT111111', 'codice_fornitore': '45172'}]
        scheda_cod = dict(scheda_errore, id='999992', stato='da_controllare', tipo='fattura',
                          livello='da_controllare', file_nome='prova-cod.jpg', file_tipo='jpg')
        scheda_cod['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-COD',
                                     fornitore_id='5', codice_cliente='45172', cliente='Vivai Prova SNC')
        pgC = entra(S + '-oper')
        pgC.route(re.compile(r'^.*/api/documenti/999992$'), lambda r: risposta(r, json.dumps(scheda_cod)))
        pgC.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_cod)))
        pgC.goto(BASE + '/documenti/999992')
        pgC.locator('button:has-text("Correggi i dati letti")').wait_for(timeout=15000)
        pgC.click('button:has-text("Correggi i dati letti")'); pgC.wait_for_selector('.affiancata')
        campo_cod = pgC.locator('.aff-dx input[aria-label="Cerca cliente"]')
        campo_cod.fill('45172')
        menu_cod = pgC.locator('.aff-dx .ricerca-menu:not([hidden])')
        menu_cod.wait_for()
        ok('Cod. 45172' in menu_cod.inner_text(), 'con fornitore: il menu cliente mostra «Cod. 45172»')
        ok('coincide con il codice letto' in menu_cod.inner_text(), 'con codice letto uguale: il segno «coincide con il codice letto»')
        pgC.screenshot(path=str(USCITA / 'app-documenti-codice-cliente-1440.png'))
        pgC.close()

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
        ok(pg5.locator('.modale-piede button:has-text("Togli dalla coda")').is_disabled(), 'Togli dalla coda: pulsante spento finché non si spunta (D-172)')
        pg5.click('.modale .casella-grave input')
        pg5.locator('.modale-piede button:has-text("Togli dalla coda")').click(); pg5.wait_for_timeout(500)
        ok(scarti['n'] == 1, 'Togli dalla coda: chiama lo scarto esistente (una volta)')
        pg5.close()

        # D-164 §19: la coda si aggiorna da sola (SSE, area «documenti») senza toccare il documento
        # aperto a destra. L'elenco si rifà, il dettaglio (stessa chiave) non si rimonta. L'ordine
        # della coda (dal più vecchio) è quello che manda il server: qui si verifica la resa.
        righe_auto = {
            'documenti': [
                {'id': '999970', 'file_nome': 'coda-vecchio.pdf', 'file_tipo': 'pdf', 'tipo': None, 'numero': None,
                 'data': None, 'fornitore_id': None, 'fornitore': None, 'codice_cliente': None, 'cliente': None,
                 'importo': None, 'livello': None, 'stato': 'in_coda', 'ricevuto_il': '2026-09-01T08:00:00.000Z',
                 'letto_il': None, 'controlli_n': 0, 'manca_agenzia': False, 'manca_rappresentanza': False,
                 'fornitore_da_integra': False, 'cliente_da_integra': False},
                {'id': '999971', 'file_nome': 'coda-nuovo.pdf', 'file_tipo': 'pdf', 'tipo': None, 'numero': None,
                 'data': None, 'fornitore_id': None, 'fornitore': None, 'codice_cliente': None, 'cliente': None,
                 'importo': None, 'livello': None, 'stato': 'in_coda', 'ricevuto_il': '2026-09-02T08:00:00.000Z',
                 'letto_il': None, 'controlli_n': 0, 'manca_agenzia': False, 'manca_rappresentanza': False,
                 'fornitore_da_integra': False, 'cliente_da_integra': False},
            ],
            'conteggi': {'da_controllare': 0, 'in_coda': 2, 'in_lettura': 0, 'errore': 0},
            'totale': 2, 'pagina': 1, 'per_pagina': 200, 'lettura_configurata': False,
        }
        scheda_auto = dict(scheda_coda, id='999970', file_nome='coda-vecchio.pdf')
        conti = {'lista': 0, 'dettaglio': 0}
        def lista_auto(route):
            conti['lista'] += 1
            risposta(route, json.dumps(righe_auto))
        def dettaglio_auto(route):
            conti['dettaglio'] += 1
            risposta(route, json.dumps(scheda_auto))
        def flusso_auto(route):
            route.fulfill(status=200, content_type='text/event-stream', body='data: {"aree":["documenti"]}\n\n')
        pgQ = entra(S + '-ammi')
        pgQ.route(re.compile(r'^.*/api/documenti\?stato=aperte.*'), lista_auto)
        pgQ.route(re.compile(r'^.*/api/documenti/999970$'), dettaglio_auto)
        pgQ.route(re.compile(r'^.*/api/eventi/flusso$'), flusso_auto)
        pgQ.goto(BASE + '/documenti/999970')
        pgQ.wait_for_selector('.selezionabile a')
        voci_coda = pgQ.locator('.selezionabile a')
        ok('coda-vecchio.pdf' in voci_coda.first.inner_text(), 'coda: il documento più vecchio è il primo')
        pgQ.wait_for_selector('.dettagli')
        pgQ.wait_for_timeout(800)
        # StrictMode in sviluppo monta due volte: il dettaglio si richiede più di una volta al primo
        # caricamento; qui si prende la base DOPO il primo caricamento e si guarda solo il delta
        liste_prima, dettagli_prima = conti['lista'], conti['dettaglio']
        ok(dettagli_prima >= 1, 'coda: il dettaglio a destra si carica')
        # l'evento SSE per l'area documenti rifà solo l'elenco (senza sagome), non il dettaglio
        pgQ.wait_for_timeout(2500)
        ok(conti['lista'] > liste_prima, 'coda: l’elenco si aggiorna da solo (SSE), senza ricaricare')
        ok(conti['dettaglio'] == dettagli_prima, 'coda: il documento aperto a destra non si ricarica')
        pgQ.screenshot(path=str(USCITA / 'app-documenti-coda-auto-1440.png'))
        pgQ.close()

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
        ok(pgS.locator('.sopra-riga.diversa').count() == 0, 'somma righe: nessun avviso se uguale')
        pgS.fill('input[data-campo="righe[0].prezzo"]', '120'); pgS.wait_for_timeout(100)
        ok('290,00' in pgS.locator('.sopra-riga').inner_text(), 'somma righe: si aggiorna al cambio del prezzo (2×120 + 50 = 290)')
        ok(pgS.locator('.sopra-riga.diversa').count() == 1, 'somma righe: avviso se diversa dall’importo')
        somma_avviso = pgS.locator('.sopra-riga.diversa').inner_text()
        ok('Somma righe' in somma_avviso and '290,00' in somma_avviso,
           'somma righe: avviso rosso con la somma delle righe (290,00 €)')
        ok('290,00' in pgS.locator('.tab-righe tfoot td.dx').inner_text(), 'somma righe: stesso numero del piede della tabella')
        pgS.screenshot(path=str(USCITA.parents[1] / 'somma-1440.png'))
        pgS.close()

        # D-158: in «Apri la pratica» senza agenzia il pulsante «Aggiungi l'agenzia» apre FormAgenzia con
        # cliente, fornitore e codice bloccati; «Crea» fa sparire l'avviso e si apre la pratica senza uscire.
        fornitori_mock = [{'id': '5', 'ragione_sociale': 'Arte Wohnaccessoires GmbH', 'piva': 'DE123456'}]
        clienti_mock = [{'id': '1001', 'ragione_sociale': 'Agri Aggio SNC', 'piva': 'IT000000', 'codice_fornitore': '45172'}]
        subagenti_mock = [{'id': '9', 'codice': 'SUB09', 'nome': 'Maurizio', 'cognome': 'Bastasin', 'email': 'm@x.it', 'attivo': True}]
        scheda_apri = dict(scheda_errore, id='999991', stato='da_controllare', tipo='ordine', livello='affidabile', file_nome='prova-apri.pdf')
        scheda_apri['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-APRI', data='2026-09-15',
                                      fornitore_id='5', fornitore='Arte Wohnaccessoires GmbH',
                                      codice_cliente='45172', cliente='Agri Aggio SNC')
        scheda_apri['proposta'] = dict(scheda_errore['proposta'], esito='nuova')
        stati_apri = {'abbina': 0, 'agenzia_nuova': 0, 'crea': 0}
        def abbina_apri(route):
            stati_apri['abbina'] += 1
            if stati_apri['crea'] == 0:
                route.fulfill(status=409, content_type='application/json', body=json.dumps({'message': "Il cliente non ha un'agenzia con questo fornitore alla data dell'ordine"}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'pratica': {'id': '77', 'numero': 'OF/2026/077'}}))
        def agenzia_nuova(route):
            stati_apri['agenzia_nuova'] += 1
            risposta(route, json.dumps({'cliente': 'Agri Aggio SNC', 'fornitore': 'Arte Wohnaccessoires GmbH'}))
        def crea_agenzia(route):
            stati_apri['crea'] += 1
            route.fulfill(status=201, content_type='application/json', body=json.dumps({'id': '999'}))
        pgA = entra(S + '-oper')
        pgA.route(re.compile(r'^.*/api/documenti/999991$'), lambda r: risposta(r, json.dumps(scheda_apri)))
        pgA.route(re.compile(r'^.*/api/documenti/999991/abbina$'), abbina_apri)
        pgA.route(re.compile(r'^.*/api/clienti/1001/agenzia-nuova\?fornitore_id=5$'), agenzia_nuova)
        pgA.route(re.compile(r'^.*/api/clienti/1001/agenzie$'), crea_agenzia)
        pgA.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, json.dumps(fornitori_mock)))
        pgA.route(re.compile(r'^.*/api/fornitori/sconti-in-vigore$'), lambda r: risposta(r, '[]'))
        pgA.route(re.compile(r'^.*/api/subagenti$'), lambda r: risposta(r, json.dumps(subagenti_mock)))
        pgA.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_mock)))
        pgA.goto(BASE + '/documenti/999991')
        pgA.locator('.scelte button:has-text("Apri la pratica")').wait_for(timeout=15000)
        pgA.locator('.scelte button:has-text("Apri la pratica")').click()
        pgA.wait_for_selector('.velo .modale:has-text("Apri la pratica")')
        pgA.fill('#c-cliente_id', 'Agri')
        pgA.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.wait_for()
        pgA.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.click()
        pgA.wait_for_function("document.querySelectorAll('.velo .ricerca-menu:not([hidden])').length === 0")
        pgA.click('.velo .modale-piede button:has-text("Apri la pratica")')
        pgA.locator('.velo button:has-text("Aggiungi l’agenzia")').wait_for(timeout=10000)
        ok(pgA.locator('.velo button:has-text("Aggiungi l’agenzia")').count() == 1, 'D-158: senza agenzia compare «Aggiungi l’agenzia»')
        ok(stati_apri['abbina'] == 1, 'D-158: l’apertura ha risposto 409 una volta')
        pgA.screenshot(path=str(USCITA / 'app-documento-aggiungi-agenzia-1440.png'))
        pgA.locator('.velo button:has-text("Aggiungi l’agenzia")').click()
        pgA.wait_for_selector('.velo .modale:has-text("Nuova agenzia per")')
        ok(stati_apri['agenzia_nuova'] == 1, 'D-158: i nomi della coppia si leggono dalla rotta nuova')
        ok(pgA.locator('.velo input[name=fornitore_id]').get_attribute('disabled') is not None, 'D-158: fornitore bloccato')
        ok(pgA.locator('.velo input[name=codice_cliente_fornitore]').get_attribute('disabled') is not None, 'D-158: codice cliente bloccato')
        ok(pgA.input_value('.velo input[name=codice_cliente_fornitore]') == '45172', 'D-158: codice cliente precompilato dal documento')
        ok(pgA.input_value('.velo input[name=valido_dal]') == '2026-09-15', 'D-158: «Valido dal» = data dell’ordine')
        s_apri, sid_apri = scegli(pgA, 'subagente_id', 'Bastasin')
        ok('Bastasin' in s_apri and sid_apri.isdigit(), 'D-158: subagente scelto: %s (id %s)' % (s_apri, sid_apri))
        pgA.click('.velo .modale-piede button:has-text("Crea")')
        pgA.wait_for_selector('.velo .modale:has-text("Apri la pratica")', timeout=10000)
        ok(stati_apri['crea'] == 1, 'D-158: Crea ha creato l’agenzia')
        ok(pgA.locator('.velo button:has-text("Aggiungi l’agenzia")').count() == 0, 'D-158: dopo Crea l’avviso sparisce')
        pgA.click('.velo .modale-piede button:has-text("Apri la pratica")')
        pgA.wait_for_function("location.pathname.startsWith('/pratiche/')")
        ok(True, 'D-158: l’agenzia creata dal flusso apre la pratica senza uscire')
        pgA.close()

        # D-159: un'agenzia dal vecchio CRM da confermare non apre da sola la pratica: il riquadro
        # propone «Usa questa» (conferma e riprova) e «Configura». Si prova «Usa questa».
        agenzia_conf = {'id': '77', 'subagente_id': '9', 'subagente': 'Bastasin Maurizio', 'subagente_codice': 'SUB09',
                        'fornitore_id': '5', 'fornitore': 'Arte Wohnaccessoires GmbH',
                        'codice_cliente_fornitore': '45172', 'sconto': 0, 'pct_subagente': None, 'regola_mensile': None,
                        'valido_dal': '2000-01-01', 'valido_al': None, 'da_confermare': True}
        scheda_conf = dict(scheda_errore, id='999990', stato='da_controllare', tipo='ordine', livello='affidabile', file_nome='prova-conf.pdf')
        scheda_conf['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-CONF', data='2026-09-15',
                                      fornitore_id='5', fornitore='Arte Wohnaccessoires GmbH',
                                      codice_cliente='45172', cliente='Agri Aggio SNC')
        scheda_conf['proposta'] = dict(scheda_errore['proposta'], esito='nuova')
        stati_conf = {'abbina': 0, 'conferma': 0}
        def abbina_conf(route):
            stati_conf['abbina'] += 1
            if stati_conf['conferma'] == 0:
                route.fulfill(status=409, content_type='application/json',
                              body=json.dumps({'code': 'agenzia_da_confermare', 'agenzia': agenzia_conf,
                                               'message': 'Questa agenzia viene dal vecchio CRM: confermala o configurala prima di aprire la pratica.'}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'pratica': {'id': '77', 'numero': 'OF/2026/077'}}))
        def conferma_conf(route):
            stati_conf['conferma'] += 1
            risposta(route, json.dumps({**agenzia_conf, 'da_confermare': False}))
        pgD = entra(S + '-oper')
        pgD.route(re.compile(r'^.*/api/documenti/999990$'), lambda r: risposta(r, json.dumps(scheda_conf)))
        pgD.route(re.compile(r'^.*/api/documenti/999990/abbina$'), abbina_conf)
        pgD.route(re.compile(r'^.*/api/clienti/1001/agenzie/77/conferma$'), conferma_conf)
        pgD.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, json.dumps(fornitori_mock)))
        pgD.route(re.compile(r'^.*/api/fornitori/sconti-in-vigore$'), lambda r: risposta(r, '[]'))
        pgD.route(re.compile(r'^.*/api/subagenti$'), lambda r: risposta(r, json.dumps(subagenti_mock)))
        pgD.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_mock)))
        pgD.goto(BASE + '/documenti/999990')
        pgD.locator('.scelte button:has-text("Apri la pratica")').wait_for(timeout=15000)
        pgD.locator('.scelte button:has-text("Apri la pratica")').click()
        pgD.wait_for_selector('.velo .modale:has-text("Apri la pratica")')
        pgD.fill('#c-cliente_id', 'Agri')
        pgD.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.wait_for()
        pgD.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.click()
        pgD.wait_for_function("document.querySelectorAll('.velo .ricerca-menu:not([hidden])').length === 0")
        pgD.click('.velo .modale-piede button:has-text("Apri la pratica")')
        pgD.locator('.velo .nota:has-text("dal vecchio CRM")').wait_for(timeout=10000)
        ok(pgD.locator('.velo button:has-text("Usa questa")').count() == 1, 'D-159: con agenzia da confermare compare «Usa questa»')
        ok(pgD.locator('.velo button:has-text("Configura")').count() == 1, 'D-159: ... e «Configura»')
        ok('codice 45172' in pgD.locator('.velo .nota').inner_text() and 'sconto 0 %' in pgD.locator('.velo .nota').inner_text()
           and 'subagente Bastasin Maurizio' in pgD.locator('.velo .nota').inner_text() and 'dal 01/01/2000' in pgD.locator('.velo .nota').inner_text(),
           'D-159: il riquadro mostra codice, sconto, subagente e data')
        ok(stati_conf['abbina'] == 1, 'D-159: l’apertura ha risposto 409 una volta')
        pgD.screenshot(path=str(USCITA / 'app-documento-da-confermare-1440.png'))
        pgD.locator('.velo button:has-text("Usa questa")').click()
        pgD.wait_for_function("location.pathname.startsWith('/pratiche/')")
        ok(stati_conf['conferma'] == 1, 'D-159: «Usa questa» conferma l’agenzia')
        ok(True, 'D-159: dopo la conferma la pratica si apre')
        pgD.close()

        # D-162: senza scaglione del fornitore per lo sconto dell'agenzia, «Apri la pratica» risponde 409
        # scaglione_mancante e il pulsante «Configura le percentuali» apre FormPercentuali (fornitore fisso,
        # «Valide dal» = data dell'ordine); dopo il salvataggio si riprova ad aprire la pratica.
        scaglione_manc = {'fornitore_id': '5', 'fornitore': 'Arte Wohnaccessoires GmbH', 'sconto': 0,
                          'data': '2026-09-15', 'ha_percentuali': False}
        scheda_scag = dict(scheda_errore, id='999988', stato='da_controllare', tipo='ordine', livello='affidabile', file_nome='prova-scag.pdf')
        scheda_scag['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-SCAG', data='2026-09-15',
                                      fornitore_id='5', fornitore='Arte Wohnaccessoires GmbH',
                                      codice_cliente='45172', cliente='Agri Aggio SNC')
        scheda_scag['proposta'] = dict(scheda_errore['proposta'], esito='nuova')
        stati_scag = {'abbina': 0, 'salvate': 0}
        def abbina_scag(route):
            stati_scag['abbina'] += 1
            if stati_scag['salvate'] == 0:
                route.fulfill(status=409, content_type='application/json', body=json.dumps({
                    'code': 'scaglione_mancante',
                    'message': 'Arte Wohnaccessoires GmbH non ha ancora le percentuali delle provvigioni valide al 15/09/2026 (sconto 0 %): senza, la provvigione sarebbe zero.',
                    'scaglione': scaglione_manc}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'pratica': {'id': '77', 'numero': 'OF/2026/077'}}))
        def percentuali_scag(route):
            if route.request.method == 'POST':
                stati_scag['salvate'] += 1
                route.fulfill(status=201, content_type='application/json', body=json.dumps({'in_vigore': '2026-09-15', 'versioni': []}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'in_vigore': None, 'versioni': []}))
        pgSC = entra(S + '-ammi')
        pgSC.route(re.compile(r'^.*/api/documenti/999988$'), lambda r: risposta(r, json.dumps(scheda_scag)))
        pgSC.route(re.compile(r'^.*/api/documenti/999988/abbina$'), abbina_scag)
        pgSC.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, json.dumps(fornitori_mock)))
        pgSC.route(re.compile(r'^.*/api/fornitori/5/percentuali$'), percentuali_scag)
        pgSC.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_mock)))
        pgSC.goto(BASE + '/documenti/999988')
        pgSC.locator('.scelte button:has-text("Apri la pratica")').wait_for(timeout=15000)
        pgSC.locator('.scelte button:has-text("Apri la pratica")').click()
        pgSC.wait_for_selector('.velo .modale:has-text("Apri la pratica")')
        pgSC.fill('#c-cliente_id', 'Agri')
        pgSC.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.wait_for()
        pgSC.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.click()
        pgSC.wait_for_function("document.querySelectorAll('.velo .ricerca-menu:not([hidden])').length === 0")
        pgSC.click('.velo .modale-piede button:has-text("Apri la pratica")')
        pgSC.locator('.velo button:has-text("Configura le percentuali")').wait_for(timeout=10000)
        ok(pgSC.locator('.velo button:has-text("Configura le percentuali")').count() == 1, 'D-162: senza scaglione compare «Configura le percentuali»')
        ok('percentuali delle provvigioni' in pgSC.locator('.velo .modulo-errore').inner_text(), 'D-162: il riquadro mostra il messaggio del fornitore')
        ok(stati_scag['abbina'] == 1, 'D-162: l’apertura ha risposto 409 una volta')
        pgSC.screenshot(path=str(USCITA / 'app-documento-scaglione-mancante-1440.png'))
        pgSC.locator('.velo button:has-text("Configura le percentuali")').click()
        pgSC.wait_for_selector('.velo .modale:has-text("Nuovo scaglione di")')
        ok(pgSC.input_value('.velo input[name=valido_dal]') == '2026-09-15' and pgSC.locator('.velo input[name=valido_dal]').get_attribute('disabled') is not None,
           'D-162: «Valide dal» = data dell’ordine, fisso')
        ok(pgSC.input_value('.velo input[name=sconto_min]') == '0' and pgSC.locator('.velo input[name=sconto_min]').get_attribute('disabled') is not None,
           'D-162: sconto dell’agenzia proposto e fisso')
        pgSC.fill('#c-agente', '10'); pgSC.fill('#c-sub', '5')
        pgSC.click('.velo .modale-piede button:has-text("Salva")')
        pgSC.wait_for_function("location.pathname.startsWith('/pratiche/')")
        ok(stati_scag['salvate'] == 1, 'D-162: le percentuali si salvano dalla finestra')
        ok(stati_scag['abbina'] == 2, 'D-162: dopo il salvataggio si riprova ad aprire la pratica')
        pgSC.close()

        # D-163: se alla data dell'ordine esiste già una versione, «Configura le percentuali» apre la
        # correzione di quella versione (non «Nuove percentuali»), con lo sconto dell'agenzia già proposto.
        pct_esistente = {'in_vigore': '2026-09-15', 'versioni': [{
            'valido_dal': '2026-09-15', 'in_vigore': True, 'modificabile': True,
            'scaglioni': [{'id': '1', 'sconto_min': 10, 'pct_agente': 6, 'pct_subagente': 2, 'valido_dal': '2026-09-15',
                           'dal_fornitore': 8, 'clienti': 0, 'eccezioni': []}],
        }]}
        scaglione_corr = {'fornitore_id': '5', 'fornitore': 'Arte Wohnaccessoires GmbH', 'sconto': 0,
                          'data': '2026-09-15', 'ha_percentuali': True}
        scheda_corr = dict(scheda_errore, id='999987', stato='da_controllare', tipo='ordine', livello='affidabile', file_nome='prova-corr.pdf')
        scheda_corr['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-CORR', data='2026-09-15',
                                      fornitore_id='5', fornitore='Arte Wohnaccessoires GmbH',
                                      codice_cliente='45172', cliente='Agri Aggio SNC')
        scheda_corr['proposta'] = dict(scheda_errore['proposta'], esito='nuova')
        stati_corr = {'abbina': 0, 'put': 0}
        def abbina_corr(route):
            stati_corr['abbina'] += 1
            if stati_corr['put'] == 0:
                route.fulfill(status=409, content_type='application/json', body=json.dumps({
                    'code': 'scaglione_mancante',
                    'message': 'Arte Wohnaccessoires GmbH non ha ancora le percentuali delle provvigioni valide al 15/09/2026 (sconto 0 %): senza, la provvigione sarebbe zero.',
                    'scaglione': scaglione_corr}))
            else:
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'pratica': {'id': '77', 'numero': 'OF/2026/077'}}))
        def pct_corr(route):
            if route.request.method == 'PUT':
                stati_corr['put'] += 1
            risposta(route, json.dumps(pct_esistente))
        pgCR = entra(S + '-ammi')
        pgCR.route(re.compile(r'^.*/api/documenti/999987$'), lambda r: risposta(r, json.dumps(scheda_corr)))
        pgCR.route(re.compile(r'^.*/api/documenti/999987/abbina$'), abbina_corr)
        pgCR.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, json.dumps(fornitori_mock)))
        pgCR.route(re.compile(r'^.*/api/fornitori/5/percentuali$'), pct_corr)
        pgCR.route(re.compile(r'^.*/api/fornitori/5/percentuali/2026-09-15$'), pct_corr)
        pgCR.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_mock)))
        pgCR.goto(BASE + '/documenti/999987')
        pgCR.locator('.scelte button:has-text("Apri la pratica")').wait_for(timeout=15000)
        pgCR.locator('.scelte button:has-text("Apri la pratica")').click()
        pgCR.wait_for_selector('.velo .modale:has-text("Apri la pratica")')
        pgCR.fill('#c-cliente_id', 'Agri')
        pgCR.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.wait_for()
        pgCR.locator('.velo .ricerca-menu:not([hidden]) li[role=option]').first.click()
        pgCR.wait_for_function("document.querySelectorAll('.velo .ricerca-menu:not([hidden])').length === 0")
        pgCR.click('.velo .modale-piede button:has-text("Apri la pratica")')
        pgCR.locator('.velo button:has-text("Configura le percentuali")').wait_for(timeout=10000)
        pgCR.locator('.velo button:has-text("Configura le percentuali")').click()
        pgCR.wait_for_selector('.velo .modale:has-text("Nuovo scaglione di")', timeout=10000)
        ok(pgCR.locator('.velo .modale:has-text("Nuovo scaglione di")').count() == 1,
           'D-163: con una versione alla data dell’ordine si apre comunque la finestra dello scaglione')
        ok(pgCR.input_value('.velo input[name=valido_dal]') == '2026-09-15'
           and pgCR.locator('.velo input[name=valido_dal]').get_attribute('disabled') is not None,
           'D-163: «Valide dal» bloccato alla data della versione')
        ok(pgCR.input_value('.velo input[name=sconto_min]') == '0',
           'D-163: lo sconto dell’agenzia (0 %) è già proposto')
        pgCR.fill('#c-agente', '10'); pgCR.fill('#c-sub', '5')
        pgCR.click('.velo .modale-piede button:has-text("Salva")')
        pgCR.wait_for_function("location.pathname.startsWith('/pratiche/')")
        ok(stati_corr['put'] == 1, 'D-163: con la versione alla data si salva con la rotta PUT della versione')
        ok(stati_corr['abbina'] == 2, 'D-163: dopo il salvataggio si riprova ad aprire la pratica')
        pgCR.close()

        # D-161: finché le voci (fornitori, clienti) non arrivano, il campo di ricerca non mostra l'id
        # né il pallino rosso: mostra il nome già noto (nomeIniziale) e un pallino grigio. Le rotte delle
        # voci restano in attesa 1,5 s (rotta lenta): il campo non deve mai mostrare un numero né il rosso.
        scheda_nr = dict(scheda_errore, id='999989', stato='da_controllare', tipo='ordine', livello='affidabile', file_nome='prova-nr.pdf')
        scheda_nr['testata'] = dict(scheda_errore['testata'], tipo='ordine', numero='PROVA-NR', data='2026-09-15',
                                    fornitore_id='5', fornitore='Arte Wohnaccessoires GmbH', codice_cliente='45172',
                                    cliente='Agri Aggio SNC', cliente_id='1001')
        scheda_nr['proposta'] = dict(scheda_errore['proposta'], esito='nuova')
        attese = []
        def trattieni(route, corpo):
            attese.append((route, corpo))
        pgN = entra(S + '-oper')
        pgN.route(re.compile(r'^.*/api/documenti/999989$'), lambda r: risposta(r, json.dumps(scheda_nr)))
        pgN.route(re.compile(r'^.*/api/fornitori$'), lambda r: trattieni(r, json.dumps(fornitori_mock)))
        pgN.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: trattieni(r, json.dumps(clienti_mock)))
        pgN.goto(BASE + '/documenti/999989')
        pgN.locator('.scelte button:has-text("Apri la pratica")').wait_for(timeout=15000)
        pgN.locator('.scelte button:has-text("Apri la pratica")').click()
        pgN.wait_for_selector('.velo .modale:has-text("Apri la pratica")')
        f_nr = pgN.locator('.velo #c-fornitore_id')
        c_nr = pgN.locator('.velo #c-cliente_id')
        ok(pgN.input_value('#c-fornitore_id') == 'Arte Wohnaccessoires GmbH', 'D-161: fornitore col nome, non l’id, mentre le voci caricano')
        ok(pgN.input_value('#c-cliente_id') == 'Agri Aggio SNC', 'D-161: cliente col nome, non l’id, mentre le voci caricano')
        ok(pgN.locator('.velo .pallino.ko').count() == 0, 'D-161: niente pallino rosso mentre le voci caricano')
        pgN.screenshot(path=str(USCITA / 'app-documento-numeri-rossi-attesa.png'))
        pgN.wait_for_timeout(1500)  # il ritardo delle voci (rotta lenta)
        for route, corpo in attese:
            route.fulfill(status=200, content_type='application/json', body=corpo)
        pgN.wait_for_function("() => document.querySelectorAll('.velo .pallino.ok').length >= 2", timeout=5000)
        ok('ok' in f_nr.locator('xpath=..').locator('span.pallino').get_attribute('class'), 'D-161: fornitore trovato, pallino verde')
        ok('ok' in c_nr.locator('xpath=..').locator('span.pallino').get_attribute('class'), 'D-161: cliente trovato, pallino verde')
        pgN.screenshot(path=str(USCITA / 'app-documento-numeri-rossi-caricato.png'))
        pgN.close()

        # D-175: intestazione «Codice cliente» — spunta verde se il codice è del cliente associato,
        # avviso giallo col motivo se no (lo stato lo calcola il server). Scheda simulata.
        scheda_ok = dict(scheda_errore, id='999986', stato='da_controllare', tipo='fattura',
                         livello='affidabile', file_nome='prova-codice-ok.pdf')
        scheda_ok['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-CODICE-OK',
                                    fornitore_id='5', codice_cliente='45172', cliente='Agri Aggio SNC')
        scheda_ok['codice_cliente_esito'] = {'stato': 'corrisponde', 'cliente': 'Agri Aggio SNC'}
        pgOK = entra(S + '-oper')
        pgOK.route(re.compile(r'^.*/api/documenti/999986$'), lambda r: risposta(r, json.dumps(scheda_ok)))
        pgOK.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, json.dumps(fornitori_mock)))
        pgOK.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_mock)))
        pgOK.goto(BASE + '/documenti/999986')
        pgOK.locator('.dettagli').wait_for(timeout=15000)
        ok('codice del cliente associato' in pgOK.locator('.dettagli').inner_text(),
           'D-175: spunta verde «codice del cliente associato» sotto Codice cliente')
        pgOK.screenshot(path=str(USCITA / 'app-documento-codice-ok-1440.png'))
        pgOK.close()

        scheda_alt = dict(scheda_errore, id='999985', stato='da_controllare', tipo='fattura',
                          livello='affidabile', file_nome='prova-codice-alt.pdf')
        scheda_alt['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-CODICE-ALT',
                                     fornitore_id='5', codice_cliente='45172', cliente='Agri Aggio SNC')
        scheda_alt['codice_cliente_esito'] = {'stato': 'altro_cliente', 'cliente': 'Vivai Prova SNC', 'fornitore': 'Arte Wohnaccessoires GmbH'}
        pgALT = entra(S + '-oper')
        pgALT.route(re.compile(r'^.*/api/documenti/999985$'), lambda r: risposta(r, json.dumps(scheda_alt)))
        pgALT.route(re.compile(r'^.*/api/fornitori$'), lambda r: risposta(r, json.dumps(fornitori_mock)))
        pgALT.route(re.compile(r'^.*/api/clienti\?fornitore_id=5$'), lambda r: risposta(r, json.dumps(clienti_mock)))
        pgALT.goto(BASE + '/documenti/999985')
        pgALT.locator('.dettagli').wait_for(timeout=15000)
        ok('Il codice 45172 presso Arte Wohnaccessoires GmbH è di Vivai Prova SNC' in pgALT.locator('.dettagli').inner_text(),
           'D-175: avviso giallo col motivo quando il codice è di un altro cliente')
        pgALT.close()

        # D-174: conferma/proforma su una pratica già confermata → scelta parziale/sostituisce, col
        # suggerimento preselezionato; l'abbinamento manda il ruolo scelto.
        scheda_pf = dict(scheda_errore, id='999984', stato='da_controllare', tipo='proforma',
                         livello='affidabile', file_nome='prova-proforma-multiple.pdf')
        scheda_pf['testata'] = dict(scheda_errore['testata'], tipo='proforma', numero='PROVA-PF', data='2026-09-03')
        scheda_pf['proposta'] = {
            'esito': 'certo',
            'candidati': [{'pratica': {'id': '1', 'numero': 'OF/2026/001', 'cliente': 'Agri Aggio SNC', 'stato': 'confermato', 'data_ordine': '2026-02-17'},
                           'punteggio': 1, 'motivi': ['confermato 2.117,30 € su ordine 2.154,50 €: parziale (si somma)'], 'delta': 0, 'ruolo': 'parziale'}],
            'importo': 37.2, 'abbinamento': None, 'cliente_riconosciuto': None, 'agenzia_mancante': None,
            'cliente_da_integra': None, 'manca_rappresentanza': None, 'fornitore_da_integra': None,
            'candidati_fornitore': [], 'candidati_cliente': [], 'integra_non_raggiungibile': False,
        }
        visti_pf = {'abbina': 0, 'ruolo': None}
        def abbina_pf(route):
            visti_pf['abbina'] += 1
            try:
                visti_pf['ruolo'] = json.loads(route.request.post_data or '{}').get('ruolo')
            except Exception:
                visti_pf['ruolo'] = None
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'pratica': {'id': '1', 'numero': 'OF/2026/001'}}))
        pgPF = entra(S + '-oper')
        pgPF.route(re.compile(r'^.*/api/documenti/999984$'), lambda r: risposta(r, json.dumps(scheda_pf)))
        pgPF.route(re.compile(r'^.*/api/documenti/999984/abbina$'), abbina_pf)
        # 15/11/2026: la conferma dell'abbinamento mostra i dati veri della pratica (stato, «Confermato X di Y»).
        # 16/11/2026: dopo l'abbinamento l'app apre la pratica: lo stesso indirizzo serve anche il dettaglio,
        # quindi il finto server risponde con un dettaglio completo (senza `confronto` la pagina andava in errore).
        pratica_pf = {
            'id': '1', 'numero': 'OF/2026/001', 'numero_ordine_fornitore': 'AU276839',
            'cliente_id': '1001', 'cliente': 'Agri Aggio SNC', 'fornitore_id': '2', 'fornitore': 'Gries',
            'subagente_id': None, 'subagente': None, 'data': '2026-09-02', 'importo': 2154.5,
            'stato': 'confermata', 'nota': None, 'scadenza': None, 'pagato': False, 'pagamenti': [],
            'fasi': [
                {'titolo': 'Ordine', 'fatta': True, 'numero': 'AU276839', 'numeri': ['AU276839'], 'data': '2026-09-02', 'importo': 2154.5},
                {'titolo': 'Conferma', 'fatta': True, 'numero': 'C 1', 'numeri': ['C 1'], 'data': '2026-09-03', 'importo': 2154.5, 'delta': 0},
                {'titolo': 'Fattura', 'assente': True, 'testo': 'Nessuna'},
            ],
            'progresso': {'x': 2117.3, 'y': 2154.5},
            'confronto': {'fasi': [], 'righe': [], 'variazioni': {'numero': 0, 'totale': 0}},
            'provvigione': None, 'sconto_medio': None, 'sconto_dopo_nota': None,
            'azione': {'tipo': 'nessuna', 'testo': 'Pratica confermata: attesa la fattura.'},
            'incassi': [],
        }
        pgPF.route(re.compile(r'^.*/api/pratiche/1$'), lambda r: risposta(r, json.dumps(pratica_pf)))
        pgPF.route(re.compile(r'^.*/api/pratiche/1/documenti$'), lambda r: risposta(r, json.dumps({
            'pratica': {'id': '1', 'numero': 'OF/2026/001', 'stato': 'confermata', 'importo': 2154.5},
            'altri': [], 'documenti': [], 'totali': {'fatture': 0, 'note_credito': 0, 'netto': 0}})))
        pgPF.goto(BASE + '/documenti/999984')
        pgPF.locator('.scelte button:has-text("Abbina a OF/2026/001")').wait_for(timeout=15000)
        pgPF.locator('.scelte button:has-text("Abbina a OF/2026/001")').click()
        pgPF.wait_for_selector('.velo .modale:has-text("in più sulla pratica")')
        ok(pgPF.locator('#c-ruolo').input_value() == 'parziale', 'D-174: il suggerimento «parziale» è preselezionato')
        pgPF.select_option('#c-ruolo', 'sostituisce')
        pgPF.click('.velo .modale-piede button:has-text("Abbina")')
        pgPF.wait_for_selector('.velo .modale:has-text("Abbinare proforma PROVA-PF a OF/2026/001?")')
        testo_conf = pgPF.locator('.velo .modale').inner_text()
        ok('Sostituisce' in testo_conf and 'superata' in testo_conf, 'conferma abbinamento: il ruolo scelto e il suo effetto')
        ok('2.117,30' in testo_conf and '2.154,50' in testo_conf, 'conferma abbinamento: «Confermato X di Y» dal server')
        ok('ordine AU276839' in testo_conf, 'conferma abbinamento: l’ordine del fornitore arriva dal server (V12)')
        ok(pgPF.locator('.velo .casella-grave input[type=checkbox]').count() == 1,
           'proforma non si annulla dalla pratica: casella da spuntare (D-172)')
        pgPF.locator('.velo .casella-grave input[type=checkbox]').check()
        pgPF.click('.velo .modale-piede button:has-text("Abbina")')
        # 16/11/2026: dopo l'abbinamento l'app apre la pratica abbinata
        pgPF.wait_for_function("location.pathname === '/pratiche/1'", timeout=20000)
        ok(visti_pf['abbina'] == 1 and visti_pf['ruolo'] == 'sostituisce', 'D-174: l’abbinamento manda il ruolo scelto')
        pgPF.wait_for_selector('.binario', timeout=20000)
        ok('OF/2026/001' in pgPF.locator('.testa h1').inner_text(), 'dopo l’abbinamento si apre la pratica')
        pgPF.screenshot(path=str(USCITA / 'app-documento-ruolo-1440.png'))
        pgPF.close()

        # §16.4: la ricerca «Oppure abbina a un’altra pratica» mostra la colonna Importo (l’ultima fase,
        # dal server) e il pulsante «apri in una nuova scheda» con l’indirizzo ?vista=sola.
        pratiche_ric = [{'id': '123', 'numero': 'OF/2026/001', 'cliente': 'Cliente Prova', 'data': '2026-09-01', 'stato': 'fatturata', 'importo': 1234.56}]
        scheda_ric = dict(scheda_errore, id='999983', stato='da_controllare', tipo='fattura',
                          livello='da_controllare', file_nome='prova-ricerca.pdf')
        scheda_ric['testata'] = dict(scheda_errore['testata'], tipo='fattura', numero='PROVA-RIC', fornitore_id='5', cliente='Cliente Prova')
        # §16.4: la pratica in vista sola (aperta dalla ricerca, in una scheda a parte): niente cornice
        pratica_sola = {
            'id': '123', 'numero': 'OF/2026/001', 'numero_ordine_fornitore': None,
            'cliente_id': '1001', 'cliente': 'Cliente Prova', 'fornitore_id': '5', 'fornitore': 'Arte Wohnaccessoires GmbH',
            'subagente_id': None, 'subagente': None,
            'data': '2026-09-01', 'importo': 1234.56, 'stato': 'fatturata', 'nota': None, 'scadenza': None,
            'pagato': False, 'pagamenti': [],
            'fasi': [
                {'titolo': 'Ordine', 'fatta': True, 'numero': 'AB 1', 'numeri': ['AB 1'], 'data': '2026-09-01', 'importo': 1234.56},
                {'titolo': 'Conferma', 'fatta': True, 'numero': 'C 1', 'numeri': ['C 1'], 'data': '2026-09-02', 'importo': 1234.56, 'delta': 0},
                {'titolo': 'Fattura', 'fatta': True, 'numero': 'F 1', 'numeri': ['F 1'], 'data': '2026-09-03', 'importo': 1234.56, 'delta': 0},
                {'titolo': 'Nota di credito', 'assente': True, 'testo': 'Nessuna'},
            ],
            'progresso': None,
            'confronto': {'fasi': [], 'righe': [], 'variazioni': {'numero': 0, 'totale': 0}},
            'provvigione': None, 'sconto_medio': None, 'sconto_dopo_nota': None,
            'azione': {'tipo': 'nessuna', 'testo': 'Pratica fatturata: non serve altro.'},
            'incassi': [],
        }
        fiscali_sola = {'pratica': {'id': '123', 'numero': 'OF/2026/001', 'stato': 'fatturata', 'importo': 1234.56},
                        'altri': [], 'documenti': [], 'totali': {'fatture': 1234.56, 'note_credito': 0, 'netto': 1234.56}}
        pgR = entra(S + '-ammi')
        pgR.route(re.compile(r'^.*/api/documenti/999983$'), lambda r: risposta(r, json.dumps(scheda_ric)))
        pgR.route(re.compile(r'^.*/api/pratiche/cerca\?.*$'), lambda r: risposta(r, json.dumps(pratiche_ric)))
        # il pulsante apre una scheda nuova: le finte risposte valgono per tutte le schede della sessione
        pgR.context.route(re.compile(r'^.*/api/pratiche/123$'), lambda r: risposta(r, json.dumps(pratica_sola)))
        pgR.context.route(re.compile(r'^.*/api/pratiche/123/documenti$'), lambda r: risposta(r, json.dumps(fiscali_sola)))
        pgR.goto(BASE + '/documenti/999983')
        pgR.locator('.abbina-altra').wait_for(timeout=15000)
        pgR.click('.abbina-altra .ricerca-lente')
        pgR.wait_for_selector('.velo .modale:has-text("Cerca pratica")')
        ok('Importo' in pgR.locator('.velo .modale thead').inner_text(), 'ricerca pratica: colonna Importo')
        apri_btn = pgR.locator('.velo .modale tbody a.btn-riga').first
        ok(apri_btn.count() == 1, 'ricerca pratica: pulsante apri in una nuova scheda su ogni riga')
        ok(apri_btn.get_attribute('href') == '/pratiche/123?vista=sola', 'pulsante: indirizzo /pratiche/123?vista=sola')
        ok(apri_btn.get_attribute('target') == '_blank' and apri_btn.get_attribute('rel') == 'noopener', 'pulsante: nuova scheda (target _blank, rel noopener)')
        ok(apri_btn.get_attribute('aria-label') == 'Apri la pratica in una nuova scheda', 'pulsante: aria-label')
        pgR.screenshot(path=str(USCITA / 'app-documenti-ricerca-pratica-1440.png'))
        # il clic sull’icona apre davvero la scheda a parte, e non sceglie la riga nella ricerca
        with pgR.expect_popup() as nuova:
            apri_btn.click()
        pgN = nuova.value
        pgN.on('pageerror', lambda e: errori.append(str(e)))
        pgN.wait_for_function("location.pathname === '/pratiche/123' && location.search === '?vista=sola'", timeout=20000)
        pgN.locator('button:has-text("Chiudi la scheda")').wait_for(timeout=20000)
        ok(pgN.locator('.barra').count() == 0, 'scheda nuova: niente barra di navigazione')
        ok(pgN.locator('button:has-text("Torna")').count() == 0, 'scheda nuova: niente «Torna a…»')
        ok(pgR.locator('.velo .modale-piede button:has-text("Seleziona")').is_disabled(),
           'scheda nuova: il clic sull’icona non seleziona la riga')
        pgN.close()
        pgR.close()

        # §16.4: ?vista=sola apre la pratica senza cornice (niente barra né «Torna a…») con «Chiudi la scheda».
        pgV = entra(S + '-ammi')
        pgV.route(re.compile(r'^.*/api/pratiche/123$'), lambda r: risposta(r, json.dumps(pratica_sola)))
        pgV.route(re.compile(r'^.*/api/pratiche/123/documenti$'), lambda r: risposta(r, json.dumps(fiscali_sola)))
        pgV.goto(BASE + '/pratiche/123?vista=sola')
        pgV.locator('button:has-text("Chiudi la scheda")').wait_for(timeout=15000)
        ok(pgV.locator('.barra').count() == 0, 'vista sola: niente barra laterale né menu')
        ok(pgV.locator('button:has-text("Chiudi la scheda")').count() == 1, 'vista sola: pulsante Chiudi la scheda')
        ok('OF/2026/001' in pgV.locator('.testa h1').inner_text(), 'vista sola: il titolo della pratica c’è')
        ok(pgV.locator('button:has-text("Torna")').count() == 0, 'vista sola: niente «Torna a…»')
        pgV.screenshot(path=str(USCITA / 'app-documenti-vista-sola-1440.png'))
        pgV.close()

        b.close()
finally:
    prova_documento('togli')

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
