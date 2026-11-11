# Prova della pagina Clienti dell'app (F1-A3), con Playwright: elenco, ricerca e segmenti, scheda, scheda Agenzie
# (aggiunge con i campi di ricerca fornitore e subagente, periodo sovrapposto rifiutato, modifica, elimina), scheda
# Pratiche, memoria della schermata, 768 px, lettura senza comandi. L'agenzia creata viene eliminata alla fine.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-oper, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Serve almeno un cliente senza agenzie (seed).
# Uso: python strumenti/prove/app_clienti.py <suffisso> <cartella schermate> [base]
import sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW, RUN = 'password-di-prova', str(int(time.time()))[-6:]
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
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/clienti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/clienti')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.dt tbody tr.cliccabile')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')
    seg = lambda pg, t: pg.locator('.segmenti [role=tab]:has-text("%s")' % t)
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
    n_tutti = int(seg(pg, 'Tutti').locator('.n').inner_text()); n_con = int(seg(pg, 'Con agenzie').locator('.n').inner_text()); n_senza = int(seg(pg, 'Senza agenzie').locator('.n').inner_text())
    ok(n_tutti >= 3 and n_con + n_senza == n_tutti and n_senza >= 1, 'elenco e segmenti: %d clienti = %d con agenzie + %d senza' % (n_tutti, n_con, n_senza))
    nome0 = pg.locator('.dt tbody tr.cliccabile b').first.inner_text()
    cerca(pg, nome0[:6])
    ok(1 <= righe(pg) <= n_tutti, 'ricerca per nome: elenco filtrato')
    cerca(pg, 'zzzz-nessuno'); ok(righe(pg) == 0, 'ricerca senza risultati: elenco vuoto')
    cerca(pg, '')
    # filtro multiplo per fornitore (D-22): restringe l'elenco, i segmenti contano con gli altri filtri (D-23)
    fb = pg.locator('.filtri').first
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click(); fb.locator('.ricerca-menu li[role=option]', has_text='Gries').first.click(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    n_f = int(seg(pg, 'Tutti').locator('.n').inner_text())
    ok('Gries' in (campo.get_attribute('placeholder') or '') and 1 <= n_f <= n_tutti and righe(pg) == n_f and int(seg(pg, 'Senza agenzie').locator('.n').inner_text()) == 0,
       'filtro per fornitore Gries: %d clienti su %d, segmenti aggiornati' % (n_f, n_tutti))
    pg.locator('.dt tbody tr.cliccabile:not(.selezionata)').first.click(); pg.wait_for_timeout(500); pg.go_back(); pg.wait_for_timeout(500)
    ok('Gries' in (pg.locator('.filtri').first.locator('.ricerca.multipla .ricerca-testo').first.get_attribute('placeholder') or '') and righe(pg) == n_f, 'tornando indietro il filtro per fornitore resta')
    pg.screenshot(path=str(USCITA / 'app-clienti-filtro-1440.png'))
    pg.locator('.riepilogo-filtri .btn-icona').nth(1).click(); pg.wait_for_timeout(300)
    ok(righe(pg) == n_tutti, 'riepilogo: togli tutti i filtri, tornano %d clienti' % n_tutti)
    seg(pg, 'Senza agenzie').click(); pg.wait_for_timeout(300)
    ok(righe(pg) == n_senza, 'segmento Senza agenzie: %d righe' % n_senza)

    # scheda di un cliente senza agenzie
    pg.click('.dt tbody tr.cliccabile'); pg.wait_for_function("/^\\/clienti\\/\\d+/.test(location.pathname)"); pg.wait_for_timeout(500)
    cliente = testo(pg, '.pannello-testa h2'); url_cliente = pg.url
    ok(cliente != 'Cliente' and pg.locator('.dt tbody tr.selezionata').count() == 1 and 'Integra' in testo(pg, '.pannello'), 'scheda del cliente «%s» aperta, riga evidenziata' % cliente)
    ok(pg.locator('.schede-barra [role=tab]').count() == 2 and pg.locator('.schede-corpo .dt').count() == 1 and 'Nessuna agenzia' in testo(pg, '.schede-corpo'), 'schede Agenzie e Pratiche; senza agenzie')
    pg.screenshot(path=str(USCITA / 'app-clienti-1440.png'))

    # nuova agenzia con i campi di ricerca
    D1, A1, D2 = '2031-01-01', '2031-06-30', '2031-03-01'
    pg.click('button:has-text("Aggiungi agenzia")'); finestra(pg).wait_for(); pg.wait_for_selector('.velo .campo-ricerca')
    ok(pg.locator('.velo .campo-ricerca').count() == 2, 'nuova agenzia: Fornitore e Subagente sono campi di ricerca')
    f, fid = scegli(pg, 'fornitore_id', 'Gri')
    ok('Gries' in f and fid.isdigit(), 'fornitore scelto dal menu: %s (id %s)' % (f, fid))
    s_, sid = scegli(pg, 'subagente_id', 'Nis')
    ok('Nista' in s_ and sid.isdigit(), 'subagente scelto dal menu: %s (id %s)' % (s_, sid))
    ok('Scaglioni in vigore' in testo(pg, '.velo .campo:has(#c-sconto) .aiuto') and 'Gries' in testo(pg, '.velo .campo:has(#c-sconto) .aiuto'), 'sconto: aiuto con gli scaglioni dei fornitori')
    ok(pg.locator('#c-pct_subagente:not([disabled])').count() == 1 and pg.locator('#c-regola_mensile:not([disabled])').count() == 1, 'responsabile: percentuale e regola del subagente attive')
    pg.fill('#c-codice_cliente_fornitore', 'T' + RUN); pg.fill('#c-sconto', '5'); pg.fill('#c-valido_dal', D1); pg.fill('#c-valido_al', A1)
    pg.click('.modale-piede button[type=submit]')
    try:
        finestra(pg).wait_for(state='detached', timeout=15000)
    except Exception:
        errore = pg.locator('.modulo-errore').inner_text() if pg.locator('.modulo-errore').count() else 'finestra ancora aperta'
        raise AssertionError('creazione agenzia non riuscita: ' + errore)
    pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    riga = pg.locator('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    ok('Gries' in riga.inner_text() and 'Nista' in riga.inner_text() and '5 %' in riga.inner_text() and A1 in riga.inner_text(), 'agenzia creata: fornitore, subagente, sconto e periodo in tabella')
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
    # modifica della prima
    pg.click('.schede-corpo .dt tbody tr:has-text("T%s") button:has-text("Modifica")' % RUN); finestra(pg).wait_for()
    ok(pg.input_value('#c-sconto') == '5' and pg.input_value('#c-valido_dal') == D1, 'modifica: il modulo parte dai valori attuali')
    pg.fill('#c-sconto', '7'); pg.fill('#c-pct_subagente', '33'); pg.click('.modale-piede button[type=submit]'); finestra(pg).wait_for(state='detached')
    pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s"):has-text("7 %%")' % RUN)
    ok('33 %' in testo(pg, '.schede-corpo .dt tbody tr:has-text("T%s")' % RUN), 'agenzia modificata: sconto 7 %, al subagente 33 % (responsabile)')
    pg.screenshot(path=str(USCITA / 'app-clienti-agenzie-1440.png'))

    # Pratiche
    scheda(pg, 'Pratiche'); pg.wait_for_selector('.schede-corpo .dt')
    ok(pg.locator('.schede-corpo .dt').count() == 1, 'scheda Pratiche: tabella (senza pratiche: «Nessuna pratica»)')
    scheda(pg, 'Agenzie'); pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)

    # memoria della schermata: cliente, ricerca, segmento e scheda
    seg(pg, 'Senza agenzie').click(); pg.wait_for_timeout(200)  # il ricaricamento ha azzerato la memoria
    scheda(pg, 'Pratiche'); url = pg.url
    vai(pg, 'Fornitori'); ok('/fornitori' in pg.url, 'vado a Fornitori')
    pg.go_back(); pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_timeout(600)
    ok(pg.url == url and seg(pg, 'Senza agenzie').get_attribute('aria-selected') == 'true', 'indietro: stesso cliente e segmento ricordato')
    ok(pg.locator('.schede-barra [role=tab][aria-selected=true]:has-text("Pratiche")').count() == 1, 'indietro: stessa scheda (Pratiche)')
    scheda(pg, 'Agenzie'); pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)

    # un cliente con pratiche: la scheda le elenca
    seg(pg, 'Con agenzie').click(); pg.wait_for_timeout(300)
    for i in range(righe(pg)):
        if pg.locator('.dt tbody tr.cliccabile').nth(i).locator('td').last.inner_text().strip() not in ('0', ''):
            pg.locator('.dt tbody tr.cliccabile').nth(i).click(); break
    pg.wait_for_timeout(600); scheda(pg, 'Pratiche'); pg.wait_for_timeout(400)
    ok(pg.locator('.schede-corpo .dt tbody tr.cliccabile, .schede-corpo .dt tbody tr').count() >= 1 and 'Nessuna pratica' not in testo(pg, '.schede-corpo'), 'cliente con pratiche aperte: la scheda Pratiche le mostra')
    pg.screenshot(path=str(USCITA / 'app-clienti-pratiche-1440.png'))

    # elimina le due agenzie di prova
    seg(pg, 'Senza agenzie').click(); pg.wait_for_timeout(200); seg(pg, 'Tutti').click(); cerca(pg, cliente[:12])
    pg.locator('.dt tbody tr.cliccabile', has_text=cliente).first.click(); pg.wait_for_timeout(600)
    scheda(pg, 'Agenzie'); pg.wait_for_selector('.schede-corpo .dt tbody tr:has-text("T%s")' % RUN)
    for chi in ('T' + RUN, 'Ravelli'):
        pg.click('.schede-corpo .dt tbody tr:has-text("%s") button:has-text("Elimina")' % chi); pg.wait_for_selector('.velo .modale')
        pg.click('.velo .modale button.pericolo, .velo .modale button:has-text("Elimina")')
        pg.wait_for_function("!document.querySelector('.velo .modale')")
        pg.wait_for_function("![...document.querySelectorAll('.schede-corpo .dt tbody tr')].some(r => r.textContent.includes('%s'))" % chi)
    ok(pg.locator('.schede-corpo .dt tbody tr:has-text("Ravelli"), .schede-corpo .dt tbody tr:has-text("T%s")' % RUN).count() == 0 and 'Nessuna agenzia' in testo(pg, '.schede-corpo'), 'agenzie eliminate: tabella vuota')

    # 768 px
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(400)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    pg.screenshot(path=str(USCITA / 'app-clienti-768.png'), full_page=True)
    pg.close()

    # operatore: percentuale e regola spente, il resto si salva (D-50)
    pg = entra(S + '-oper'); pg.wait_for_timeout(600)
    seg(pg, 'Tutti').click(); pg.click('.dt tbody tr.cliccabile'); pg.wait_for_timeout(600)
    pg.click('button:has-text("Aggiungi agenzia")'); finestra(pg).wait_for(); pg.wait_for_selector('#c-pct_subagente')
    ok(pg.locator('#c-pct_subagente[disabled]').count() == 1 and pg.locator('#c-regola_mensile[disabled]').count() == 1 and 'responsabile' in testo(pg, '.velo .campo:has(#c-pct_subagente) .aiuto'),
       'operatore: percentuale e regola spente, con la nota «li cambia un responsabile»')
    pg.screenshot(path=str(USCITA / 'app-clienti-operatore-1440.png'))
    pg.click('.modale-piede button:has-text("Annulla")')
    pg.close()

    pg = entra(S + '-lett'); pg.wait_for_timeout(600)
    ok(pg.locator('button:has-text("Aggiungi agenzia")').count() == 0, 'lettura: Aggiungi agenzia assente')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
