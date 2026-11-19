# Prova della pagina Clienti dell'app (F1-A3), con Playwright: elenco, ricerca e segmenti, scheda, scheda Agenzie
# (aggiunge con i campi di ricerca fornitore e subagente, periodo sovrapposto rifiutato, modifica, elimina), scheda
# Pratiche, memoria della schermata, Cerca in Integra (D-111: solo al clic, import dal ponte finto, nessuna
# corrispondenza, pulsante spento in lettura), 768 px, lettura senza comandi. L'agenzia creata viene eliminata alla fine.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Serve almeno un cliente senza agenzie (seed).
# Per «Cerca in Integra» servono DATABASE_URL (decobrands_test) e PONTE_URL (decobrands_ponte_prova), come il backend.
# Uso: python strumenti/prove/app_clienti.py <suffisso> <cartella schermate> [base]
import subprocess, sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW, RUN = 'password-di-prova', str(int(time.time()))[-6:]
COD, PIVA = 'C99001', '99999999991'
RADICE = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RADICE / 'app' / 'backend'
AIUTO = pathlib.Path(__file__).resolve().parent / 'integra_prova.js'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def integra(*args): subprocess.run(['node', str(AIUTO), *args], cwd=BACKEND, check=True, capture_output=True)
# A6-09: le richieste di creazione agenzia si registrano, per scoprire un doppio invio del modulo
post_agenzie = []
def conta_agenzia(r):
    if r.method == 'POST' and r.url.split('?')[0].rstrip('/').endswith('/agenzie'):
        post_agenzie.append(r.url)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.on('request', conta_agenzia)
        pg.goto(BASE + '/clienti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/clienti')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')
    seg = lambda pg, t: pg.locator('.clienti-filtri .filtri .segmenti [role=tab]:has-text("%s")' % t)
    # i segmenti diventano una tendina quando non stanno su una riga (16/11/2026): gli stessi controlli
    # leggono il pulsante [role=tab] oppure la voce della tendina (.segmenti-select).
    def nseg(pg, t):  # numero del segmento: .n del pulsante, oppure «Tutti (13)» nella tendina
        tab = seg(pg, t)
        if tab.count(): return int(tab.locator('.n').inner_text())
        testo = pg.locator('.clienti-filtri .filtri .segmenti-select option', has_text=t).first.inner_text()
        return int(testo[testo.rfind('(') + 1:-1])
    def clic_seg(pg, t):  # sceglie il segmento: pulsante o voce della tendina
        tab = seg(pg, t)
        if tab.count(): tab.click(); return
        sel = pg.locator('.clienti-filtri .filtri .segmenti-select')
        for i, txt in enumerate(sel.locator('option').all_inner_texts()):
            if txt.split(' (')[0] == t: sel.select_option(index=i); return
    def seg_scelto(pg, t):  # il segmento è scelto? (pulsante o tendina)
        tab = seg(pg, t)
        if tab.count(): return tab.get_attribute('aria-selected') == 'true'
        return pg.locator('.clienti-filtri .filtri .segmenti-select option', has_text=t).first.evaluate('o => o.selected')
    scheda = lambda pg, t: pg.click('.schede-barra [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    cerca = lambda pg, t: (pg.fill('.filtri input[type=search]', t), pg.wait_for_timeout(300))
    def vai(pg, voce):  # voce del menu: navigazione dentro l'app, senza ricaricare
        pg.click('.barra a.voce:has-text("%s")' % voce); pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower()); pg.wait_for_load_state('networkidle')
    def scegli(pg, campo, scritto):
        """Campo di ricerca (CampoRicerca): si scrive, compare il menu, si sceglie la prima voce. Ritorna il valore scelto."""
        pg.fill('#c-' + campo, scritto)
        menu = pg.locator('.velo .ricerca-menu:not([hidden])')
        menu.wait_for(); voce = menu.locator('li[role=option]').first
        voce.wait_for(); nome = voce.locator('b').inner_text(); voce.click()
        pg.wait_for_function("document.querySelectorAll('.velo .ricerca-menu:not([hidden])').length === 0")
        return nome, pg.locator('input[name=%s]' % campo).input_value()

    pg = entra(S + '-ammi')
    ok('Clienti' in testo(pg, '.testa h1'), 'titolo della pagina')
    n_tutti = nseg(pg, 'Tutti'); n_con = nseg(pg, 'Con agenzie'); n_senza = nseg(pg, 'Senza agenzie')
    ok(n_tutti >= 3 and n_con + n_senza == n_tutti and n_senza >= 1, 'elenco e segmenti: %d clienti = %d con agenzie + %d senza' % (n_tutti, n_con, n_senza))
    # R2-10 (D-24): ricerca e segmenti sulla stessa riga, come il prototipo
    y = lambda s: pg.locator(s).first.bounding_box()['y']
    ok(abs(y('.clienti-filtri .filtri .cerca') - y('.clienti-filtri .filtri .segmenti, .clienti-filtri .filtri .segmenti-select')) < 6,
       '1440 px: ricerca e segmenti sulla stessa riga')
    nome0 = pg.locator('.dt tbody tr.cliccabile b').first.inner_text()
    cerca(pg, nome0[:6])
    ok(1 <= righe(pg) <= n_tutti, 'ricerca per nome: elenco filtrato')
    cerca(pg, 'zzzz-nessuno'); ok(righe(pg) == 0, 'ricerca senza risultati: elenco vuoto')
    cerca(pg, '')
    # filtro multiplo per fornitore (D-22): restringe l'elenco, i segmenti contano con gli altri filtri (D-23)
    fb = pg.locator('.filtri').first
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click(); fb.locator('.ricerca-menu li[role=option]', has_text='Gries').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    n_f = nseg(pg, 'Tutti')
    ok('Gries' in (campo.get_attribute('placeholder') or '') and 1 <= n_f <= n_tutti and righe(pg) == n_f and nseg(pg, 'Senza agenzie') == 0,
       'filtro per fornitore Gries: %d clienti su %d, segmenti aggiornati' % (n_f, n_tutti))
    pg.locator('.dt tbody tr.cliccabile:not(.selezionata)').first.click(); pg.wait_for_timeout(500); pg.go_back(); pg.wait_for_timeout(500)
    ok('Gries' in (pg.locator('.filtri').first.locator('.ricerca.multipla .ricerca-testo').first.get_attribute('placeholder') or '') and righe(pg) == n_f, 'tornando indietro il filtro per fornitore resta')
    pg.screenshot(path=str(USCITA / 'app-clienti-filtro-1440.png'))
    pg.locator('.riepilogo-filtri .btn-icona').nth(1).click(); pg.wait_for_timeout(300)
    ok(righe(pg) == n_tutti, 'riepilogo: togli tutti i filtri, tornano %d clienti' % n_tutti)
    clic_seg(pg, 'Senza agenzie'); pg.wait_for_timeout(300)
    ok(righe(pg) == n_senza, 'segmento Senza agenzie: %d righe' % n_senza)

    # scheda di un cliente senza agenzie
    pg.click('.dt tbody tr.cliccabile'); pg.wait_for_function("/^\\/clienti\\/\\d+/.test(location.pathname)")
    pg.wait_for_selector('.dt tbody tr.selezionata', timeout=10000)  # il pannello ha caricato il cliente scelto
    cliente = testo(pg, '.pannello-testa h2'); url_cliente = pg.url
    ok(cliente != 'Cliente' and pg.locator('.dt tbody tr.selezionata').count() == 1 and 'Integra' in testo(pg, '.pannello'), 'scheda del cliente «%s» aperta, riga evidenziata' % cliente)
    ok(pg.locator('.schede-barra [role=tab]').count() == 2 and pg.locator('.schede-corpo .dt').count() == 1 and 'Nessuna agenzia' in testo(pg, '.schede-corpo'), 'schede Agenzie e Pratiche; senza agenzie')
    pg.screenshot(path=str(USCITA / 'app-clienti-1440.png'))

    # nuova agenzia con i campi di ricerca
    D1, A1, D2 = '2031-01-01', '2031-06-30', '2031-03-01'
    pg.click('button:has-text("Aggiungi agenzia")'); finestra(pg).wait_for(); pg.wait_for_selector('.velo .campo-ricerca')
    ok(pg.locator('.velo .campo-ricerca').count() == 2, 'nuova agenzia: Fornitore e Subagente sono campi di ricerca')
    # D-112: la proposta del vecchio CRM arriva solo dal documento (fornitore fisso + codice letto)
    ok('Dal vecchio CRM' not in testo(pg, '.velo .modale') and 'non era rappresentato' not in testo(pg, '.velo .modale'),
       'agenzia dalla scheda cliente: nessuna proposta dallo storico')
    # senza subagente la provvigione è tutta di Decobrands: percentuale e regola si spengono, con la nota
    ok(pg.locator('#c-pct_subagente[disabled]').count() == 1 and pg.locator('#c-regola_mensile[disabled]').count() == 1
       and 'Senza subagente' in testo(pg, '.velo .campo:has(#c-pct_subagente) .aiuto'),
       'senza subagente: percentuale e regola spente, «tutta di Decobrands»')
    f, fid = scegli(pg, 'fornitore_id', 'Gri')
    ok('Gries' in f and fid.isdigit(), 'fornitore scelto dal menu: %s (id %s)' % (f, fid))
    s_, sid = scegli(pg, 'subagente_id', 'Nis')
    ok('Nista' in s_ and sid.isdigit(), 'subagente scelto dal menu: %s (id %s)' % (s_, sid))
    # 15/11/2026: l'aiuto dello sconto mostra gli scaglioni del fornitore SCELTO ed è un link alle percentuali
    # (apre nella stessa scheda, con conferma se ci sono correzioni non salvate — D-170, rilievo A)
    link_sconto = pg.locator('.velo .campo:has(#c-sconto) .aiuto a').first
    ok(link_sconto.count() == 1 and 'Scaglioni in vigore' in link_sconto.inner_text()
       and link_sconto.get_attribute('href') == '/fornitori/' + fid + '?scheda=percentuali',
       'sconto: aiuto con gli scaglioni del fornitore scelto, link alle percentuali')
    # il pallino verde di Fornitore e Subagente è un link alla loro scheda (prop link di CampoRicerca)
    ok(pg.locator('.velo a.pallino-link[aria-label*="fornitore"]').first.get_attribute('href') == '/fornitori/' + fid,
       'pallino verde del fornitore: link alla scheda')
    ok(pg.locator('.velo a.pallino-link[aria-label*="subagente"]').first.get_attribute('href') == '/subagenti/' + sid,
       'pallino verde del subagente: link alla scheda')
    # 15/11/2026: Valido dal e Valido al sono campi data (selettore nativo)
    ok(pg.locator('#c-valido_dal[type=date]').count() == 1 and pg.locator('#c-valido_al[type=date]').count() == 1,
       'valido dal e valido al: campi data con selettore')
    ok(pg.locator('#c-pct_subagente:not([disabled])').count() == 1 and pg.locator('#c-regola_mensile:not([disabled])').count() == 1, 'responsabile: percentuale e regola del subagente attive')
    pg.fill('#c-codice_cliente_fornitore', 'T' + RUN); pg.fill('#c-sconto', '5'); pg.fill('#c-valido_dal', D1); pg.fill('#c-valido_al', A1)
    prima_post = len(post_agenzie)
    pg.click('.modale-piede button[type=submit]')
    try:
        finestra(pg).wait_for(state='detached', timeout=15000)
    except Exception:
        errore = pg.locator('.modulo-errore').inner_text() if pg.locator('.modulo-errore').count() else 'finestra ancora aperta'
        raise AssertionError('creazione agenzia non riuscita (%d POST): %s' % (len(post_agenzie) - prima_post, errore))
    pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    ok(len(post_agenzie) - prima_post == 1, 'creazione agenzia: %d richiesta POST, nessun doppio invio' % (len(post_agenzie) - prima_post))
    riga = pg.locator('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    ok('Gries' in riga.inner_text() and 'Nista' in riga.inner_text() and '5 %' in riga.inner_text() and '30/06/2031' in riga.inner_text(), 'agenzia creata: fornitore, subagente, sconto e periodo in tabella')
    pg.reload(); pg.wait_for_selector('.schede-corpo .dt'); pg.wait_for_timeout(500)
    ok(pg.locator('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN).count() == 1, 'dopo il ricaricamento l’agenzia resta')

    # seconda agenzia sovrapposta
    pg.click('button:has-text("Aggiungi agenzia")'); finestra(pg).wait_for()
    scegli(pg, 'fornitore_id', 'Gri'); scegli(pg, 'subagente_id', 'Rav')
    pg.fill('#c-sconto', '3'); pg.fill('#c-valido_dal', D2); pg.fill('#c-valido_al', '2031-09-30')
    pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])')
    ok(finestra(pg).count() == 1 and 'Periodo sovrapposto' in testo(pg, '.modulo-errore'), 'agenzia sovrapposta: «%s», finestra aperta' % testo(pg, '.modulo-errore'))
    pg.fill('#c-valido_dal', '2031-07-01'); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached')
    pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("Ravelli")')
    ok(pg.locator('.schede-corpo .dt tbody tr:has-text("Ravelli")').count() == 1, 'senza sovrapposizione (dal 01/07) la seconda agenzia viene creata')
    # filtro multiplo nella scheda Agenzie: per subagente
    fa = pg.locator('.schede-corpo .filtri').first
    ca = fa.locator('.ricerca.multipla .ricerca-testo').nth(1)
    ca.click(); fa.locator('.ricerca-menu li[role=option]', has_text='Rav').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 1 and pg.locator('.schede-corpo .dt tbody tr:has-text("Ravelli")').count() == 1, 'scheda Agenzie: filtro per subagente Ravelli, una riga')
    pg.locator('.schede-corpo .riepilogo-filtri .btn-icona').nth(1).click(); pg.wait_for_timeout(300)
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 2, 'scheda Agenzie: tolto il filtro, due righe')
    # D-171: azioni a icone in colonne fisse — lo slot vuoto di Conferma non sposta Modifica ed Elimina;
    # nessuno scorrimento orizzontale causato dalle azioni (1440 e 768)
    ra = pg.locator('.schede-corpo .dt tbody tr')
    xs = [ra.nth(i).locator('button[aria-label^="Modifica"]').bounding_box()['x'] for i in range(ra.count())]
    ok(ra.count() == 2 and all(abs(x - xs[0]) <= 1 for x in xs), 'Agenzie: Modifica alla stessa x in ogni riga (slot vuoto di Conferma compreso)')
    xe = ra.first.locator('button[aria-label^="Elimina"]').bounding_box()['x']
    ok(abs(xe - xs[0] - 36) <= 1, 'Agenzie: Elimina a 36 px da Modifica (lo slot vuoto di Conferma resta)')
    ok(not pg.evaluate("document.querySelector('.schede-corpo .dt-scorri').scrollWidth > document.querySelector('.schede-corpo .dt-scorri').clientWidth"),
       'Agenzie 1440: nessuno scorrimento orizzontale della tabella')
    pg.screenshot(path=str(USCITA.parents[1] / 'azioni-riga-1440.png'))
    # 1200 px: la banda 1100–1250, dove il dettaglio scendeva a ~300 px (impilato, niente scorrimento)
    pg.set_viewport_size({'width': 1200, 'height': 900}); pg.wait_for_timeout(400)
    ok(not sovr(pg) and not pg.evaluate("document.querySelector('.schede-corpo .dt-scorri').scrollWidth > document.querySelector('.schede-corpo .dt-scorri').clientWidth"),
       'Agenzie 1200: nessuno scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'app-clienti-1200.png'))
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    ok(not sovr(pg) and not pg.evaluate("document.querySelector('.schede-corpo .dt-scorri').scrollWidth > document.querySelector('.schede-corpo .dt-scorri').clientWidth"),
       'Agenzie 768: nessuno scorrimento orizzontale')
    pg.screenshot(path=str(USCITA.parents[1] / 'azioni-riga-768.png'))
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(400)
    # modifica della prima
    pg.click('.schede-corpo .dt tbody tr:has-text("T%s") button[aria-label^="Modifica"]' % RUN); finestra(pg).wait_for()
    ok(pg.input_value('#c-sconto') == '5' and pg.input_value('#c-valido_dal') == D1, 'modifica: il modulo parte dai valori attuali')
    pg.fill('#c-sconto', '7'); pg.fill('#c-pct_subagente', '12'); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached')
    pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s"):has-text("7 %%")' % RUN)
    ok('12 %' in testo(pg, '.schede-corpo .dt tbody tr:has-text("T%s")' % RUN), 'agenzia modificata: sconto 7 %, al subagente 12 % (responsabile, D-166: non supera il fornitore)')
    pg.screenshot(path=str(USCITA / 'app-clienti-agenzie-1440.png'))

    # D-205: togliere il subagente dalla modifica — si svuota il campo e si salva (null esplicito)
    pg.click('.schede-corpo .dt tbody tr:has-text("T%s") button[aria-label^="Modifica"]' % RUN); finestra(pg).wait_for()
    ok(pg.input_value('#c-subagente_id') != '', 'modifica: il campo Subagente è precompilato')
    pg.fill('#c-subagente_id', ''); pg.locator('#c-sconto').focus(); pg.wait_for_timeout(200)
    ok(pg.locator('#c-pct_subagente[disabled]').count() == 1 and pg.locator('#c-regola_mensile[disabled]').count() == 1
       and 'Senza subagente' in testo(pg, '.velo .campo:has(#c-pct_subagente) .aiuto'),
       'subagente svuotato: percentuale e regola si spengono (tutta a Decobrands)')
    pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached')
    pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s"):has-text("7 %%")' % RUN)
    ok('seguito da' not in testo(pg, '.schede-corpo .dt tbody tr:has-text("T%s")' % RUN) and 'Nista' not in testo(pg, '.schede-corpo .dt tbody tr:has-text("T%s")' % RUN),
       'subagente tolto: la riga non mostra più «seguito da»')
    pg.screenshot(path=str(USCITA / 'app-clienti-togli-subagente-1440.png'))

    # Pratiche
    scheda(pg, 'Pratiche'); pg.wait_for_selector('.schede-corpo .dt')
    ok(pg.locator('.schede-corpo .dt').count() == 1, 'scheda Pratiche: tabella (senza pratiche: «Nessuna pratica»)')
    scheda(pg, 'Agenzie'); pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)

    # memoria della schermata: cliente, ricerca, segmento e scheda
    clic_seg(pg, 'Senza agenzie'); pg.wait_for_timeout(200)  # il ricaricamento ha azzerato la memoria
    scheda(pg, 'Pratiche'); url = pg.url
    vai(pg, 'Fornitori'); ok('/fornitori' in pg.url, 'vado a Fornitori')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(600)
    ok(pg.url == url and seg_scelto(pg, 'Senza agenzie'), 'indietro: stesso cliente e segmento ricordato')
    ok(pg.locator('.schede-barra [role=tab][aria-selected=true]:has-text("Pratiche")').count() == 1, 'indietro: stessa scheda (Pratiche)')
    scheda(pg, 'Agenzie'); pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    clic_seg(pg, 'Con agenzie'); pg.wait_for_timeout(300)
    for i in range(righe(pg)):
        if pg.locator('.dt tbody tr.cliccabile').nth(i).locator('td').last.inner_text().strip() not in ('0', ''):
            pg.locator('.dt tbody tr.cliccabile').nth(i).click(); break
    pg.wait_for_timeout(600); scheda(pg, 'Pratiche'); pg.wait_for_timeout(400)
    ok(pg.locator('.schede-corpo .dt tbody tr.cliccabile, .schede-corpo .dt tbody tr').count() >= 1 and 'Nessuna pratica' not in testo(pg, '.schede-corpo'), 'cliente con pratiche aperte: la scheda Pratiche le mostra')
    # A5-18: importo in euro e stato con l'etichetta, non il codice interno
    ok('€' in testo(pg, '.schede-corpo .dt tbody'), 'scheda Pratiche: importo formattato in euro')
    pg.screenshot(path=str(USCITA / 'app-clienti-pratiche-1440.png'))

    # elimina le due agenzie di prova
    clic_seg(pg, 'Senza agenzie'); pg.wait_for_timeout(200); clic_seg(pg, 'Tutti'); cerca(pg, cliente[:12])
    pg.locator('.dt tbody tr.cliccabile', has_text=cliente).first.click(); pg.wait_for_timeout(600)
    scheda(pg, 'Agenzie'); pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    for chi in ('T' + RUN, 'Ravelli'):
        pg.click('.schede-corpo .dt tbody tr:has-text("%s") button[aria-label^="Elimina"]' % chi); pg.wait_for_selector('.velo .modale')
        pg.click('.velo .casella-grave input')
        pg.click('.velo .modale button.pericolo, .velo .modale button:has-text("Elimina")')
        pg.wait_for_function("!document.querySelector('.velo .modale')")
        pg.wait_for_function("![...document.querySelectorAll('.schede-corpo .dt tbody tr')].some(r => r.textContent.includes('%s'))" % chi)
    ok(pg.locator('.schede-corpo .dt tbody tr:has-text("Ravelli"), .schede-corpo .dt tbody tr:has-text("T%s")' % RUN).count() == 0 and 'Nessuna agenzia' in testo(pg, '.schede-corpo'), 'agenzie eliminate: tabella vuota')

    # D-111: Cerca in Integra — la ricerca parte solo al clic, l'import aggiunge il cliente all'elenco
    integra('ponte-aggiungi', 'cliente', COD, 'Cliente Prova Integra', PIVA)
    cerca(pg, ''); clic_seg(pg, 'Tutti'); pg.wait_for_timeout(400)
    n_prima = righe(pg)
    pg.click('button:has-text("Cerca in Integra")'); finestra(pg).wait_for()
    ok(pg.locator('#cerca-integra').count() == 1 and pg.locator('.velo .elenco').count() == 0,
       'Cerca in Integra: finestra con il campo, nessuna ricerca automatica')
    # ponte lento: il server risponde {errore: 'ponte lento'} oltre i 3 s; la finestra lo dice, senza attendere
    pg.route('**/api/integra/cerca*', lambda r: r.fulfill(status=200, content_type='application/json', body='{"errore":"ponte lento","ms":3200}'))
    pg.fill('#cerca-integra', 'lento'); pg.click('.velo .modale button[type=submit]')
    pg.wait_for_selector('.velo .modale .nota:has-text("Il ponte di Integra non risponde")', timeout=10000)
    ok('riprova' in testo(pg, '.velo .modale'), 'ponte lento: «Il ponte di Integra non risponde, riprova»')
    pg.unroute('**/api/integra/cerca*')
    pg.fill('#cerca-integra', 'zzzz-nessuno'); pg.click('.velo .modale button[type=submit]')
    pg.wait_for_selector('.velo .modale .nota:has-text("Nessuna corrispondenza")', timeout=10000)
    ok('registralo a mano' in testo(pg, '.velo .modale'), 'Cerca in Integra: nessuna corrispondenza, invito a registrarlo a mano')
    pg.fill('#cerca-integra', 'Prova Integra'); pg.click('.velo .modale button[type=submit]')
    pg.wait_for_selector('.velo .elenco li', timeout=10000)
    riga_i = pg.locator('.velo .elenco li').first
    bt = riga_i.get_by_role('button', name='Importa Cliente Prova Integra')
    ok(COD in riga_i.inner_text() and PIVA in riga_i.inner_text() and bt.count() == 1,
       'Cerca in Integra: riga con codice, P.IVA e pulsante «Importa <ragione sociale>»')
    pg.screenshot(path=str(USCITA / 'app-clienti-cerca-integra-1440.png'))
    bt.click()
    finestra(pg).wait_for(state='detached', timeout=15000)
    pg.wait_for_selector('.dt tbody tr.cliccabile:has-text("Cliente Prova Integra")', timeout=10000)
    ok(righe(pg) == n_prima + 1 and pg.locator('.dt tbody tr.cliccabile:has-text("Cliente Prova Integra")').count() == 1,
       'import da Integra: finestra chiusa, elenco ricaricato (%d -> %d righe)' % (n_prima, righe(pg)))
    # D-135: dopo Importa si apre la scheda del nuovo cliente
    pg.wait_for_function("/^\\/clienti\\/\\d+$/.test(location.pathname)")
    pg.wait_for_selector('.pannello-testa h2:has-text("Cliente Prova Integra")', timeout=10000)
    ok('Cliente Prova Integra' in testo(pg, '.pannello-testa h2'), 'import da Integra: si apre la scheda del nuovo cliente (D-135)')
    pg.screenshot(path=str(USCITA / 'app-clienti-importato-1440.png'))
    integra('ponte-togli', 'cliente', COD); integra('pulisci', 'cliente', COD)

    # 768 px
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    pg.click('button:has-text("Cerca in Integra")'); finestra(pg).wait_for()
    ok(not sovr(pg), '768 px: la finestra di Cerca in Integra non allarga la pagina')
    pg.screenshot(path=str(USCITA / 'app-clienti-cerca-integra-768.png'))
    pg.click('.velo .modale-piede button:has-text("Chiudi")')
    pg.screenshot(path=str(USCITA / 'app-clienti-768.png'), full_page=True)
    pg.close()

    # operatore: percentuale e regola spente, il resto si salva (D-50); può cercare in Integra
    pg = entra(S + '-oper'); pg.wait_for_timeout(600)
    ok(pg.locator('button:has-text("Cerca in Integra"):not([disabled])').count() == 1, 'operatore: Cerca in Integra attivo (dati.importa)')
    clic_seg(pg, 'Tutti'); pg.click('.dt tbody tr.cliccabile'); pg.wait_for_timeout(600)
    pg.click('button:has-text("Aggiungi agenzia")'); finestra(pg).wait_for(); pg.wait_for_selector('#c-pct_subagente')
    # D-205: senza subagente percentuale e regola sono spente con la nota «tutta di Decobrands»
    ok(pg.locator('#c-pct_subagente[disabled]').count() == 1 and pg.locator('#c-regola_mensile[disabled]').count() == 1
       and 'Senza subagente' in testo(pg, '.velo .campo:has(#c-pct_subagente) .aiuto'),
       'operatore, senza subagente: percentuale e regola spente, nota «tutta di Decobrands»')
    # D-50: scelto un subagente, percentuale e regola restano spente con la nota del responsabile
    scegli(pg, 'subagente_id', 'Nis')
    ok(pg.locator('#c-pct_subagente[disabled]').count() == 1 and pg.locator('#c-regola_mensile[disabled]').count() == 1 and 'responsabile' in testo(pg, '.velo .campo:has(#c-pct_subagente) .aiuto'),
       'operatore: percentuale e regola spente, con la nota «li cambia un responsabile»')
    pg.screenshot(path=str(USCITA / 'app-clienti-operatore-1440.png'))
    pg.click('.modale-piede button:has-text("Annulla")')
    pg.close()

    pg = entra(S + '-lett'); pg.wait_for_timeout(600)
    ok(pg.locator('button:has-text("Aggiungi agenzia")').count() == 0, 'lettura: Aggiungi agenzia assente')
    ok(pg.locator('button:has-text("Cerca in Integra")[disabled]').count() == 1 and 'operatore in Dati' in (pg.locator('button:has-text("Cerca in Integra")').get_attribute('title') or ''),
       'lettura: Cerca in Integra spento, con il motivo')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
