# Prova della pagina Fornitori dell'app (F1-A1), con Playwright: elenco, ricerca, scheda, modifica delle regole
# (responsabile), Percentuali in sola lettura, Cerca in Integra (D-111: solo al clic, import dal ponte finto,
# nessuna corrispondenza, pulsante spento senza dati.importa), operatore e lettura senza modifica, memoria della
# schermata, 768 px. Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi,
# <s>-oper, <s>-lett (password-di-prova, da utenti_prova.js crea <s>). Le regole modificate vengono rimesse come prima.
# Per «Cerca in Integra» servono DATABASE_URL (decobrands_test) e PONTE_URL (decobrands_ponte_prova), come il backend.
# Uso: python strumenti/prove/app_fornitori.py <suffisso> <cartella schermate> [base]
import subprocess, sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW, RUN = 'password-di-prova', str(int(time.time()))[-6:]
COD, PIVA = 'F99001', '99999999992'
RADICE = pathlib.Path(__file__).resolve().parents[2]
BACKEND = RADICE / 'app' / 'backend'
AIUTO = pathlib.Path(__file__).resolve().parent / 'integra_prova.js'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def integra(*args): subprocess.run(['node', str(AIUTO), *args], cwd=BACKEND, check=True, capture_output=True)

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
        pg.goto(BASE + '/fornitori'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/fornitori')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        # il primo fornitore si apre da solo (router.replace nell'effetto di VistaFornitori): si attende
        # che l'indirizzo sia /fornitori/<id> prima di tornare, così i clic successivi non corrono il giro
        pg.wait_for_function("/^\\/fornitori\\/\\d+/.test(location.pathname)")
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')
    scheda = lambda pg, t: pg.click('.schede-barra [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    def vai(pg, voce):  # voce del menu: navigazione dentro l'app, senza ricaricare
        pg.click('.barra a.voce:has-text("%s")' % voce); pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower()); pg.wait_for_load_state('networkidle')

    pg = entra(S + '-ammi')
    ok('Fornitori' in testo(pg, '.testa h1'), 'titolo della pagina')
    n0 = righe(pg)
    ok(n0 >= 3, 'elenco: %d fornitori' % n0)
    pg.fill('.filtri input[type=search]', 'zzzz-nessuno'); pg.wait_for_timeout(250)
    ok(righe(pg) == 0, 'ricerca senza risultati: elenco vuoto')
    pg.fill('.filtri input[type=search]', 'Gries'); pg.wait_for_timeout(250)
    ok(righe(pg) == 1 and 'Gries' in testo(pg, '.dt tbody'), 'ricerca per nome: Gries')
    pg.click('.dt tbody tr.cliccabile'); pg.wait_for_function("/^\\/fornitori\\/\\d+/.test(location.pathname)"); pg.wait_for_timeout(500)
    ok('Gries' in testo(pg, '.pannello-testa h2') and pg.locator('.dt tbody tr.selezionata').count() == 1, 'scheda del fornitore aperta, riga evidenziata')
    ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'due schede: Percentuali e Clienti seguiti')
    # Percentuali datate (F1-A5): versioni, nuova versione, errore nel periodo chiuso, correzione, eliminazione
    scheda(pg, 'Percentuali'); pg.wait_for_timeout(300)
    corpo = pg.locator('.schede-corpo')
    ok(corpo.locator('[data-versione]').count() >= 1 and 'In vigore dal' in corpo.inner_text(), 'Percentuali: versioni, quella in vigore in evidenza')
    ok(corpo.locator('.dt tbody tr').count() >= 1, 'Percentuali: scaglioni in tabella')
    # D-51: la versione in vigore del seed è nel periodo chiuso, quindi niente Correggi/Elimina su di lei
    ok(corpo.locator('button:has-text("Nuove percentuali")').count() == 1 and corpo.locator('button:has-text("Correggi")').count() == 0,
       'responsabile: nuova versione sì, correzione no nel periodo chiuso')
    pg.screenshot(path=str(USCITA / 'app-fornitori-1440.png'))
    pg.click('button:has-text("Nuove percentuali")'); finestra(pg).wait_for()
    pg.fill('#c-valido_dal', '2020-01-01'); pg.click('.modale-piede button[type=submit]')
    pg.wait_for_selector('.modulo-errore:not([hidden])', timeout=5000)
    ok('chiuso' in testo(pg, '.modulo-errore'), 'data nel periodo chiuso: il server rifiuta, messaggio nella finestra')
    pg.fill('#c-valido_dal', '2050-01-01'); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(500)
    nuovo = pg.locator('[data-versione="2050-01-01"]')
    ok(nuovo.count() == 1 and 'futura' in nuovo.inner_text(), 'nuova versione salvata e mostrata come futura')
    nuovo.locator('button:has-text("Correggi")').click(); finestra(pg).wait_for()
    pg.fill('#c-agente0', '21'); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(500)
    ok('21%' in pg.locator('[data-versione="2050-01-01"]').inner_text(), 'correzione salvata: la percentuale cambia')
    # D-163: la correzione aggiunge uno scaglione con la riga «Aggiungi uno sconto %»
    pg.locator('[data-versione="2050-01-01"] button:has-text("Correggi")').click(); finestra(pg).wait_for()
    nuova = pg.locator('.velo .modale input[placeholder="Aggiungi uno sconto %"]')
    nuova.wait_for(timeout=8000)
    ok(nuova.count() == 1, 'D-163: correzione con la riga «Aggiungi uno sconto %»')
    idx = nuova.get_attribute('id')[len('c-sconto'):]
    nuova.fill('25'); pg.fill('#c-agente' + idx, '3'); pg.fill('#c-sub' + idx, '1')
    pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(500)
    ok('25%' in pg.locator('[data-versione="2050-01-01"]').inner_text(), 'D-163: scaglione aggiunto salvato (sconto 25 %)')
    pg.locator('[data-versione="2050-01-01"] button:has-text("Elimina")').click(); pg.wait_for_selector('.velo .modale')
    pg.click('.velo .modale button.pericolo')
    pg.wait_for_function("!document.querySelector('[data-versione=\"2050-01-01\"]')", timeout=8000)
    ok(pg.locator('[data-versione="2050-01-01"]').count() == 0, 'eliminazione della versione di prova')
    scheda(pg, 'Percentuali'); pg.wait_for_timeout(200)
    scheda(pg, 'Clienti seguiti'); pg.wait_for_timeout(200)
    ok(pg.locator('.schede-corpo .dt').count() == 1, 'scheda Clienti seguiti: tabella')
    # filtro multiplo per subagente (D-22): restringe i clienti seguiti
    n_seg0 = pg.locator('.schede-corpo .dt tbody tr.cliccabile, .schede-corpo .dt tbody tr').count()
    fs = pg.locator('.schede-corpo .filtri').first; cs = fs.locator('.ricerca.multipla .ricerca-testo').first
    cs.click(); fs.locator('.ricerca-menu li[role=option]').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    n_seg1 = pg.locator('.schede-corpo .dt tbody tr').count()
    ok(cs.get_attribute('placeholder') not in ('', 'Tutti i subagenti') and 0 <= n_seg1 <= n_seg0, 'Clienti seguiti: filtro per subagente (%d su %d righe)' % (n_seg1, n_seg0))
    pg.screenshot(path=str(USCITA / 'app-fornitori-filtro-1440.png'))
    cs.click(); fs.locator('.ricerca-menu .link-azzera').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # modifica delle regole
    gi = str(40 + int(RUN) % 50)
    pg.click('button:has-text("Modifica le regole")'); finestra(pg).wait_for()
    vecchio = pg.input_value('#c-giorni_incasso')
    pg.fill('#c-giorni_incasso', gi); pg.click('.modale-piede button[type=submit]')
    finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(500)
    ok(gi in testo(pg, '.dettagli'), 'regole salvate: giorni d’incasso aggiornati nella scheda')
    pg.reload(); pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(400)
    ok(gi in testo(pg, '.dettagli'), 'dopo il ricaricamento il valore resta (%s)' % gi)
    pg.click('button:has-text("Modifica le regole")'); finestra(pg).wait_for()
    pg.fill('#c-giorni_incasso', 'abc'); pg.click('.modale-piede button[type=submit]'); pg.wait_for_selector('.modulo-errore:not([hidden])', timeout=5000)
    ok(finestra(pg).count() == 1, 'valore non numerico: rifiutato dal server, finestra aperta')
    pg.fill('#c-giorni_incasso', vecchio); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached')  # ripristino
    # memoria della schermata: fornitore, ricerca e scheda si ritrovano tornando indietro
    pg.fill('.filtri input[type=search]', 'Gries'); scheda(pg, 'Clienti seguiti'); pg.wait_for_timeout(300)  # il ricaricamento azzera la memoria: si riscrive
    url = pg.url
    vai(pg, "Subagenti"); ok('/subagenti' in pg.url, 'vado a Subagenti')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile')
    # §7.12: la memoria si ripristina al re-render della navigazione morbida; il dettaglio ricarica, quindi
    # si attende che la scheda ricordata sia riselezionata (non il momento intermedio, come in app_componenti)
    try:
        pg.wait_for_function("(document.querySelector('.schede-barra [role=tab][aria-selected=true]')?.textContent ?? '').startsWith('Clienti seguiti')", timeout=8000)
    except Exception:
        pass
    ok(pg.url == url and pg.input_value('.filtri input[type=search]') == 'Gries', 'indietro: stesso fornitore e ricerca ricordata')
    ok(pg.locator('.schede-barra [role=tab][aria-selected=true]:has-text("Clienti seguiti")').count() == 1, 'indietro: stessa scheda')
    # D-111: Cerca in Integra — la ricerca parte solo al clic, l'import aggiunge il fornitore all'elenco
    integra('ponte-aggiungi', 'fornitore', COD, 'Fornitore Prova Integra', PIVA)
    pg.fill('.filtri input[type=search]', ''); pg.wait_for_timeout(400)
    n_prima = righe(pg)
    pg.click('button:has-text("Cerca in Integra")'); finestra(pg).wait_for()
    ok(pg.locator('#cerca-integra').count() == 1 and pg.locator('.velo .elenco').count() == 0,
       'Cerca in Integra: finestra con il campo, nessuna ricerca automatica')
    pg.fill('#cerca-integra', 'zzzz-nessuno'); pg.click('.velo .modale button[type=submit]')
    pg.wait_for_selector('.velo .modale .nota:has-text("Nessuna corrispondenza")', timeout=10000)
    ok('registralo a mano' in testo(pg, '.velo .modale'), 'Cerca in Integra: nessuna corrispondenza, invito a registrarlo a mano')
    pg.fill('#cerca-integra', 'Prova Integra'); pg.click('.velo .modale button[type=submit]')
    pg.wait_for_selector('.velo .elenco li', timeout=10000)
    riga_i = pg.locator('.velo .elenco li').first
    bt = riga_i.get_by_role('button', name='Importa Fornitore Prova Integra')
    ok(COD in riga_i.inner_text() and PIVA in riga_i.inner_text() and bt.count() == 1,
       'Cerca in Integra: riga con codice, P.IVA e pulsante «Importa <ragione sociale>»')
    pg.screenshot(path=str(USCITA / 'app-fornitori-cerca-integra-1440.png'))
    bt.click()
    finestra(pg).wait_for(state='detached', timeout=15000)
    pg.wait_for_selector('.dt tbody tr.cliccabile:has-text("Fornitore Prova Integra")', timeout=10000)
    ok(righe(pg) == n_prima + 1 and pg.locator('.dt tbody tr.cliccabile:has-text("Fornitore Prova Integra")').count() == 1,
       'import da Integra: finestra chiusa, elenco ricaricato (%d -> %d righe)' % (n_prima, righe(pg)))
    # D-135: dopo Importa si apre la scheda del nuovo fornitore
    pg.wait_for_function("/^\\/fornitori\\/\\d+$/.test(location.pathname)")
    pg.wait_for_selector('.pannello-testa h2:has-text("Fornitore Prova Integra")', timeout=10000)
    ok('Fornitore Prova Integra' in testo(pg, '.pannello-testa h2'), 'import da Integra: si apre la scheda del nuovo fornitore (D-135)')
    pg.screenshot(path=str(USCITA / 'app-fornitori-importato-1440.png'))
    integra('ponte-togli', 'fornitore', COD); integra('pulisci', 'fornitore', COD)
    # 768 px
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    pg.click('button:has-text("Cerca in Integra")'); finestra(pg).wait_for()
    ok(not sovr(pg), '768 px: la finestra di Cerca in Integra non allarga la pagina')
    pg.screenshot(path=str(USCITA / 'app-fornitori-cerca-integra-768.png'))
    pg.click('.velo .modale-piede button:has-text("Chiudi")')
    pg.screenshot(path=str(USCITA / 'app-fornitori-768.png'), full_page=True)

    # D-113: fornitore senza scaglioni → avviso → form → salvati, l'avviso sparisce
    # (il seed ha «Nuovo Fornitore Demo SRL» senza percentuali; dopo un giro resta configurato, quindi si controlla)
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(300)
    pg.fill('.filtri input[type=search]', 'Nuovo Fornitore'); pg.wait_for_timeout(300)
    pg.locator('.dt tbody tr.cliccabile').first.click(); pg.wait_for_timeout(600)
    scheda(pg, 'Percentuali'); pg.wait_for_timeout(300)
    avviso = pg.locator('.schede-corpo .nota-attesa')
    if avviso.count() == 1:
        ok('Senza scaglioni le pratiche' in avviso.inner_text() and avviso.locator('button:has-text("Configura gli scaglioni")').count() == 1,
           'fornitore senza scaglioni: avviso con «Configura gli scaglioni»')
        pg.screenshot(path=str(USCITA / 'app-fornitori-senza-scaglioni-1440.png'))
        avviso.locator('button:has-text("Configura gli scaglioni")').click(); finestra(pg).wait_for(); pg.wait_for_selector('#c-sconto0')
        pg.fill('#c-sconto0', '10'); pg.fill('#c-agente0', '5'); pg.fill('#c-sub0', '2')
        pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached'); pg.wait_for_timeout(700)
        ok(pg.locator('.schede-corpo .nota-attesa').count() == 0 and 'In vigore dal' in testo(pg, '.schede-corpo') and '10%' in testo(pg, '.schede-corpo'),
           'scaglioni salvati: l’avviso sparisce e la versione è in vigore')
        pg.screenshot(path=str(USCITA / 'app-fornitori-scaglioni-salvati-1440.png'))
    else:
        ok('In vigore dal' in testo(pg, '.schede-corpo'), 'fornitore già configurato da un giro precedente: versioni in tabella')
    pg.close()
    # operatore e lettura: niente modifica
    for u in ('oper', 'lett'):
        pg = entra(S + '-' + u); pg.wait_for_timeout(600)
        scheda(pg, 'Percentuali'); pg.wait_for_timeout(300)
        ok(pg.locator('button:has-text("Modifica le regole"), button:has-text("Nuove percentuali"), button:has-text("Correggi")').count() == 0,
           '%s: comandi delle percentuali assenti' % u)
        if u == 'oper':
            ok(pg.locator('button:has-text("Cerca in Integra"):not([disabled])').count() == 1, 'operatore: Cerca in Integra attivo (dati.importa)')
        else:
            ok(pg.locator('button:has-text("Cerca in Integra")[disabled]').count() == 1 and 'operatore in Dati' in (pg.locator('button:has-text("Cerca in Integra")').get_attribute('title') or ''),
               'lettura: Cerca in Integra spento, con il motivo')
        # D-113: senza il permesso il pulsante è spento e il motivo si legge
        pg.fill('.filtri input[type=search]', 'Nuovo Fornitore'); pg.wait_for_timeout(300)
        pg.locator('.dt tbody tr.cliccabile').first.click(); pg.wait_for_timeout(600)
        scheda(pg, 'Percentuali'); pg.wait_for_timeout(300)
        av = pg.locator('.schede-corpo .nota-attesa')
        if av.count() == 1:
            ok(av.locator('button:has-text("Configura gli scaglioni")[disabled]').count() == 1 and 'responsabile' in av.inner_text(),
               '%s: «Configura gli scaglioni» spento, con il motivo' % u)
        pg.close()
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
ok(not errori, 'nessun errore JavaScript')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
