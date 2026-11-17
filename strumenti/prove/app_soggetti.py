# Prova della pagina Soggetti dell'app (F1-A8b, D-102), con Playwright: elenco dal server, ricerca,
# segmenti, ordinamento, pagine, memoria della schermata, scheda con le quattro schede, nuovo soggetto
# (P.IVA doppia, corta, senza dati fiscali), ruoli, sedi, recapiti, fatturazione, disattiva, permessi,
# codice soggetto nelle altre anagrafiche, 768 px, risposta fuori ordine (R2-02) e soggetto che non
# c'è (R2-04). Crea un soggetto di prova che resta nel database.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>), sul database di prova con il seed caricato.
# Uso: python strumenti/prove/app_soggetti.py <suffisso> <cartella schermate> [base]
import re
import sys, pathlib, time
from playwright.sync_api import sync_playwright
import segmenti as segm

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW, RUN = 'password-di-prova', str(int(time.time()))[-6:]
PIVA = '9' + RUN + '0000'  # 11 cifre, nuova a ogni giro
CLIENTE, FORNITORE = 'Prova Cliente ' + RUN, 'Prova Fornitore ' + RUN
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/soggetti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname.startsWith('/soggetti')"); pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.soggetti-filtri .dt tbody tr.cliccabile')
        return pg
    testo = lambda pg, s: pg.locator(s).first.inner_text()
    righe = lambda pg: pg.locator('.soggetti-filtri .dt tbody tr.cliccabile').count()
    finestra = lambda pg: pg.locator('.velo .modale')
    scheda = lambda pg, t: pg.click('.schede-barra [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    cerca = lambda pg, t: (pg.fill('.filtri input[type=search]', t), pg.wait_for_timeout(1400))
    def vai(pg, voce):  # voce del menu: navigazione dentro l'app, senza ricaricare
        # 16/11/2026: in `next dev` un clic può perdersi durante la compilazione della rotta: si riprova
        for _ in range(3):
            pg.click('.barra a.voce:has-text("%s")' % voce)
            try:
                pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower(), timeout=15000)
                pg.wait_for_load_state('networkidle')
                return
            except Exception:
                pg.wait_for_timeout(500)
        raise AssertionError('Il menu non apre ' + voce)
    def invia(pg): pg.click('.modale-piede button[type=submit]')
    def errore(pg):
        pg.wait_for_selector('.modulo-errore:not([hidden])', timeout=8000)
        return testo(pg, '.modulo-errore')
    def attesa(pg, selettore, timeout=20000):
        try:
            pg.wait_for_selector(selettore, timeout=timeout)
            return True
        except Exception:
            return False
    def attesa_scheda(pg): pg.wait_for_selector('.schede-barra [role=tab]', timeout=8000); pg.wait_for_timeout(1400)

    pg = entra(S + '-ammi')
    # ---------- 1. elenco, ricerca, segmenti, ordinamento, pagine, memoria
    # i conteggi vengono dal server: le prove precedenti creano/importano soggetti (c)
    c_conteggi = pg.evaluate("async () => (await (await fetch('/api/soggetti')).json()).conteggi")
    n_tutti, n_clienti, n_fornitori, n_subagenti = c_conteggi['tutti'], c_conteggi['cliente'], c_conteggi['fornitore'], c_conteggi['subagente']
    n_pag2 = max(0, n_tutti - 25)
    ok('Soggetti' in testo(pg, '.testa h1'), 'titolo della pagina')
    ok(righe(pg) == min(25, n_tutti) and 'di %d' % n_tutti in testo(pg, '.soggetti-filtri .dt-piede'),
       'elenco: %d righe in pagina, %d soggetti dal server' % (min(25, n_tutti), n_tutti))
    ok(segm.numero(pg, 'Tutti') == n_tutti, 'segmento Tutti: %d dal server' % n_tutti)
    cerca(pg, 'MCL')
    ok(attesa(pg, '.soggetti-filtri .dt tbody tr:has-text("MCL SRL")') and righe(pg) == 1, 'ricerca per nome: MCL SRL')
    ok(segm.attendi_numero(pg, 'Tutti', 1) and segm.numero(pg, 'Tutti') == 1,
       'D-23: il numero del segmento conta con la ricerca')
    cerca(pg, '08943010155')
    ok(righe(pg) == 1 and 'P.IVA 08943010155' in testo(pg, '.soggetti-filtri .dt tbody'), 'ricerca per P.IVA: MCL')
    cerca(pg, '')
    segm.scegli(pg, 'Clienti')
    ok(attesa(pg, '.soggetti-filtri .dt-piede:has-text("%d elementi")' % n_clienti) and '%d elementi' % n_clienti in testo(pg, '.soggetti-filtri .dt-piede'), 'segmento Clienti: %d dal server' % n_clienti)
    segm.scegli(pg, 'Fornitori')
    ok(attesa(pg, '.soggetti-filtri .dt-piede:has-text("%d elementi")' % n_fornitori) and '%d elementi' % n_fornitori in testo(pg, '.soggetti-filtri .dt-piede'), 'segmento Fornitori: %d dal server' % n_fornitori)
    segm.scegli(pg, 'Subagenti')
    ok(attesa(pg, '.soggetti-filtri .dt-piede:has-text("%d elementi")' % n_subagenti) and '%d elementi' % n_subagenti in testo(pg, '.soggetti-filtri .dt-piede'), 'segmento Subagenti: %d dal server' % n_subagenti)
    segm.scegli(pg, 'Non attivi')
    ok(attesa(pg, '.soggetti-filtri .dt:has-text("Nessun soggetto")') and righe(pg) == 0, 'segmento Non attivi: elenco vuoto')
    segm.scegli(pg, 'Tutti'); pg.wait_for_timeout(800)
    pg.click('.soggetti-filtri .dt th:has-text("Codice")')
    ok(attesa(pg, '.soggetti-filtri .dt th[aria-sort="descending"]:has-text("Codice")'), 'ordinamento dal server: codice decrescente')
    codici = lambda pg: pg.locator('.soggetti-filtri .dt tbody tr td:first-child').all_inner_texts()
    def codici_attesi(pg, n, rovescio=None, minore=None, timeout=20000):
        fine, c = time.time() + timeout / 1000, []
        while time.time() < fine:
            try:
                c = codici(pg)
            except Exception:
                c = []  # la tabella sta cambiando pagina: si riprova
            if len(c) == n and (rovescio is None or c == sorted(c, reverse=rovescio)) and (minore is None or c[0] < minore):
                return c
            pg.wait_for_timeout(250)
        return c
    c1 = codici_attesi(pg, min(25, n_tutti), rovescio=True)
    ok(len(c1) == min(25, n_tutti) and c1 == sorted(c1, reverse=True), 'ordinamento dal server: righe in ordine decrescente')
    pg.click('.dt-pagine button[title="Pagina 2"]')
    c2 = codici_attesi(pg, n_pag2, rovescio=True, minore=c1[-1])
    ok(len(c2) == n_pag2 and (not c2 or c2[0] < c1[-1]) and c2 == sorted(c2, reverse=True), 'pagina 2: le ultime righe')
    # memoria della schermata (§7.12): ricerca, scheda, ordinamento e pagina si ritrovano
    pg.click('.soggetti-filtri .dt tbody tr:first-child'); pg.wait_for_selector('.schede-barra [role=tab]', timeout=10000)
    pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(500)
    scheda(pg, 'Sedi'); pg.wait_for_timeout(300)
    vai(pg, 'Clienti'); ok('/clienti' in pg.url, 'vado a Clienti dal menu')
    pg.go_back(); pg.wait_for_selector('.soggetti-filtri .dt tbody tr.cliccabile'); pg.wait_for_timeout(700)
    ok(codici_attesi(pg, n_pag2, rovescio=True, minore=c1[-1]) == c2, 'indietro: pagina e ordinamento ricordati')
    ok(pg.locator('.schede-barra [role=tab][aria-selected=true]:has-text("Sedi")').count() == 1, 'indietro: stessa scheda')

    # ---------- 2. scheda del soggetto: quattro schede con i contatori
    cerca(pg, 'MCL'); pg.wait_for_selector('.soggetti-filtri .dt tbody tr:has-text("MCL SRL")', timeout=8000)
    pg.click('.soggetti-filtri .dt tbody tr:has-text("MCL SRL")'); pg.wait_for_selector('.pannello-testa h2:has-text("MCL SRL")'); attesa_scheda(pg)
    ok('MCL SRL' in testo(pg, '.pannello-testa h2'), 'scheda del soggetto aperta')
    conte = [x.inner_text() for x in pg.locator('.schede-barra .schede-conta').all()]
    ok(conte == ['2', '4', '3', '1'], 'contatori delle schede: ruoli 2, sedi 4, recapiti 3, fatturazione 1 (%s)' % ','.join(conte))
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    corpo = testo(pg, '.schede-corpo')
    ok('C02477' in corpo and 'F90012' in corpo and 'cliente' in corpo and 'fornitore' in corpo, 'D-101: due ruoli e due codici sullo stesso soggetto')
    ok(pg.locator('.schede-corpo button[aria-label="Informazioni sui ruoli"]').count() == 1, 'scheda Ruoli: pulsante Informazioni, accanto ad Aggiungi ruolo')
    pg.screenshot(path=str(USCITA / 'ruoli-1440.png'))
    # D-138: il master arriva da Integra: in sola lettura, con la nota
    ok(pg.locator('.pannello-testa button:has-text("Modifica identità"), .pannello-testa button:has-text("Disattiva")').count() == 0,
       'D-138: soggetto da Integra senza comandi sul master')
    ok('Da Integra' in testo(pg, '.pannello'), 'D-138: la scheda dice che il master si corregge in Integra')
    scheda(pg, 'Sedi'); pg.wait_for_timeout(300)
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 4 and 'MCL Brescello' in testo(pg, '.schede-corpo'), 'sedi: quattro punti vendita, insegna e indirizzo')
    scheda(pg, 'Recapiti'); pg.wait_for_timeout(300)
    ok('ordini@mclsrl.it' in testo(pg, '.schede-corpo') and 'ordini' in testo(pg, '.schede-corpo'), 'recapiti: email con l’uso')
    scheda(pg, 'Fatturazione'); pg.wait_for_timeout(300)
    ok('M5E2RC4' in testo(pg, '.schede-corpo') and 'Immediata' in testo(pg, '.schede-corpo'), 'fatturazione: codice SDI ed esigibilità')
    # clic sulla riga del ruolo: apre la pagina del ruolo
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    pg.click('.schede-corpo .dt tbody tr:has-text("cliente")'); pg.wait_for_selector('.testa h1:has-text("Clienti")', timeout=20000)
    pg.wait_for_selector('.pannello-testa h2:has-text("MCL SRL")', timeout=20000)
    ok('MCL SRL' in testo(pg, '.pannello-testa h2'), 'clic sulla riga del ruolo: si apre il cliente')
    pg.go_back(); attesa_scheda(pg)

    # ---------- 3. Nuovo soggetto: i rifiuti del server e la creazione
    pg.click('.testa-azioni button:has-text("Nuovo soggetto")'); finestra(pg).wait_for()
    pg.fill('#c-piva', 'IT08943010155'); invia(pg)
    e = errore(pg)
    ok('MCL SRL' in e and 'C0' in e, 'P.IVA doppia rifiutata con codice e nome dell’esistente')
    pg.fill('#c-piva', '123456789'); invia(pg)
    ok('scarto' in errore(pg), 'P.IVA corta rifiutata (§7.4)')
    pg.fill('#c-piva', ''); invia(pg)
    ok('almeno P.IVA o codice fiscale' in errore(pg), 'senza P.IVA e senza codice fiscale rifiutato')
    pg.fill('#c-piva', PIVA); invia(pg)
    finestra(pg).wait_for(state='detached'); pg.wait_for_selector('.pannello-testa h2:has-text("Soggetto C")', timeout=10000); pg.wait_for_timeout(1400)
    ok(bool(re.search(r'/soggetti/\d+', pg.url)), 'soggetto creato: si apre la sua scheda')
    dettagli = testo(pg, '.dettagli')
    codice = re.search(r'C\d{6}', dettagli).group(0)
    ok(codice.startswith('C') and int(codice[1:]) > 28 and 'Soggetto ' + codice in testo(pg, '.pannello-testa h2'), 'codice progressivo %s, nessun ruolo: si mostra il codice' % codice)
    # disattiva permessa: non ha ruoli; poi riattiva
    pg.click('.pannello-testa button:has-text("Disattiva")'); finestra(pg).wait_for()
    pg.click('.velo .modale button.pericolo'); pg.wait_for_selector('.dettagli:has-text("Non attivo")', timeout=10000)
    ok('Non attivo' in testo(pg, '.dettagli'), 'disattiva permessa senza ruoli attivi')
    pg.click('.pannello-testa button:has-text("Riattiva")'); pg.wait_for_timeout(1400)
    ok('Attivo' in testo(pg, '.dettagli') and 'Non attivo' not in testo(pg, '.dettagli'), 'riattiva')

    # ---------- 4. Aggiungi ruolo cliente e fornitore
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    pg.click('button:has-text("Aggiungi ruolo")'); finestra(pg).wait_for()
    ok(pg.locator('#c-codice').count() == 0, 'R1-08: la finestra del ruolo non chiede il codice di Integra')
    pg.select_option('#c-tipo', 'cliente'); pg.fill('#c-nome', CLIENTE); invia(pg)
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 1 and 'cliente' in testo(pg, '.schede-corpo'), 'ruolo cliente aggiunto')
    pg.click('button:has-text("Aggiungi ruolo")'); finestra(pg).wait_for()
    pg.select_option('#c-tipo', 'fornitore'); pg.fill('#c-nome', FORNITORE); invia(pg)
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    corpo = testo(pg, '.schede-corpo')
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 2 and 'cliente' in corpo and 'fornitore' in corpo,
       'due ruoli sullo stesso soggetto (D-101), senza codice Integra (D-138)')
    # il clic sulla riga del ruolo apre la pagina del ruolo
    pg.click('.schede-corpo .dt tbody tr:has-text("cliente")'); pg.wait_for_selector('.testa h1:has-text("Clienti")', timeout=20000)
    pg.wait_for_selector('.pannello-testa h2:has-text("%s")' % CLIENTE, timeout=20000)
    ok(CLIENTE in testo(pg, '.pannello-testa h2'), 'la riga del ruolo apre il cliente %s' % CLIENTE)
    pg.go_back(); attesa_scheda(pg)

    # ---------- 5. Sedi: una sola predefinita per tipo
    scheda(pg, 'Sedi'); pg.wait_for_timeout(300)
    def nuova_sede(indirizzo, citta):
        pg.click('button:has-text("Nuova sede")'); finestra(pg).wait_for()
        pg.select_option('#c-tipo', 'legale'); pg.fill('#c-insegna', 'Sede A8 ' + citta)
        pg.fill('#c-indirizzo', indirizzo); pg.fill('#c-citta', citta)
        pg.check('#c-predefinita'); invia(pg)
        finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
        scheda(pg, 'Sedi'); pg.wait_for_timeout(300)
    nuova_sede('Via Uno 1', 'Milano')
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 1 and 'Predefinita' in testo(pg, '.schede-corpo'), 'sede creata e predefinita')
    nuova_sede('Via Due 2', 'Torino')
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 2 and pg.locator('.schede-corpo .dt tbody tr:has-text("Predefinita")').count() == 1,
       'due sedi legali, una sola predefinita (l’altra si è spenta)')

    # ---------- 6. Recapiti: email sbagliata, duplicato, allegato a sede, disattivazione
    scheda(pg, 'Recapiti'); pg.wait_for_timeout(300)
    pg.click('button:has-text("Nuovo recapito")'); finestra(pg).wait_for()
    pg.select_option('#c-tipo', 'email'); pg.fill('#c-valore', 'non-una-email'); invia(pg)
    ok('email non è valida' in errore(pg), 'email con formato sbagliato rifiutata dal server')
    pg.fill('#c-valore', 'Prova.A8@Example.IT'); invia(pg)
    finestra(pg).wait_for(state='detached')
    ok(pg.locator('.pannello .sagoma').count() == 0 and pg.locator('.pannello-testa h2').count() == 1,
       'R2-03: dopo il salvataggio il pannello resta, senza sagoma')
    attesa_scheda(pg)
    scheda(pg, 'Recapiti'); pg.wait_for_timeout(300)
    ok('prova.a8@example.it' in testo(pg, '.schede-corpo'), 'email salvata in minuscolo')
    pg.click('button:has-text("Nuovo recapito")'); finestra(pg).wait_for()
    pg.fill('#c-valore', 'prova.a8@example.it'); invia(pg)
    ok('esiste già' in errore(pg), 'recapito identico e attivo: duplicato rifiutato')
    pg.click('.velo .modale button:has-text("Annulla")'); finestra(pg).wait_for(state='detached')
    pg.click('button:has-text("Nuovo recapito")'); finestra(pg).wait_for()
    pg.select_option('#c-tipo', 'telefono'); pg.fill('#c-valore', '+39 02 999 0001')
    pg.select_option('#c-dove', label='Sede: Sede A8 Milano'); invia(pg)
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
    scheda(pg, 'Recapiti'); pg.wait_for_timeout(300)
    riga_sede = pg.locator('.schede-corpo .dt tbody tr:has-text("+39 02 999 0001")')
    ok(riga_sede.count() == 1 and 'Sede A8 Milano' in riga_sede.inner_text(), 'recapito allegato a una sede')
    pg.locator('.schede-corpo .dt tbody tr:has-text("prova.a8@example.it")').click(); finestra(pg).wait_for()
    pg.click('.velo .modale .modale-piede button:has-text("Disattiva")'); pg.wait_for_selector('.velo .modale button.pericolo')
    pg.click('.velo .modale button.pericolo'); pg.wait_for_timeout(1400)
    ok(pg.locator('.schede-corpo .dt tbody tr:has-text("prova.a8@example.it")').count() == 0, 'Disattiva chiude il recapito (valido_al) e sparisce da quelli in uso')

    # ---------- 7. Fatturazione: i rifiuti e il salvataggio
    scheda(pg, 'Fatturazione'); pg.wait_for_timeout(300)
    pg.click('button:has-text("Modifica fatturazione")'); finestra(pg).wait_for()
    pg.select_option('#c-attiva', 'si'); invia(pg)
    ok('almeno un modo' in errore(pg), 'configurata senza codice, PEC o estero: rifiutata')
    pg.fill('#c-codice_destinatario', 'ABC123'); invia(pg)
    ok('7 lettere' in errore(pg), 'codice SDI di 6 caratteri: rifiutato')
    pg.fill('#c-codice_destinatario', 'ABC1234'); invia(pg)
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
    scheda(pg, 'Fatturazione'); pg.wait_for_timeout(300)
    ok('ABC1234' in testo(pg, '.schede-corpo') and 'Sì' in testo(pg, '.schede-corpo'), 'fatturazione valida salvata')
    pg.reload(); attesa_scheda(pg)
    scheda(pg, 'Fatturazione'); pg.wait_for_timeout(300)
    ok('ABC1234' in testo(pg, '.schede-corpo'), 'dopo il ricaricamento la fatturazione resta')

    # ---------- 8. Disattiva rifiutata con ruoli attivi
    pg.click('.pannello-testa button:has-text("Disattiva")'); finestra(pg).wait_for()
    pg.click('.velo .modale button.pericolo'); pg.wait_for_timeout(1400)
    ok('Non si può disattivare' in testo(pg, '.velo .modale') and 'ruoli attivi' in testo(pg, '.velo .modale'), 'disattiva rifiutata: ha ruoli attivi')
    pg.screenshot(path=str(USCITA / 'app-soggetti-rifiuto-1440.png'))
    pg.click('.velo .modale button:has-text("Chiudi")'); finestra(pg).wait_for(state='detached')
    pg.screenshot(path=str(USCITA / 'app-soggetti-1440.png'))
    ok(not sovr(pg), '1440 px: nessuno scorrimento orizzontale')

    # ---------- 9. Permessi: lettura, nessun comando di scrittura
    pg.close()
    pg = entra(S + '-lett'); pg.wait_for_timeout(500)
    cerca(pg, 'MCL'); pg.wait_for_selector('.soggetti-filtri .dt tbody tr:has-text("MCL SRL")', timeout=8000)
    pg.click('.soggetti-filtri .dt tbody tr:has-text("MCL SRL")'); attesa_scheda(pg)
    comandi = pg.locator('.testa-azioni button:has-text("Nuovo soggetto"), .pannello-testa button:has-text("Modifica identità"), '
                         '.pannello-testa button:has-text("Disattiva"), button:has-text("Aggiungi ruolo"), '
                         'button:has-text("Nuova sede"), button:has-text("Nuovo recapito"), button:has-text("Modifica fatturazione")')
    ok(comandi.count() == 0, 'lettura: nessun comando di scrittura')
    ok('MCL SRL' in testo(pg, '.pannello-testa h2'), 'lettura: la scheda si vede lo stesso')
    pg.close()

    # ---------- 10. Codice soggetto in Clienti, Fornitori, Subagenti
    pg = entra(S + '-ammi')
    for percorso, nome in (('clienti', 'Clienti'), ('fornitori', 'Fornitori'), ('subagenti', 'Subagenti')):
        vai(pg, nome)
        pg.wait_for_selector('.dt tbody tr.cliccabile'); pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(600)
        seconda = testo(pg, '.dt tbody tr:first-child .sec-riga')
        ok(bool(re.match(r'C\d{6}', seconda)), '%s: il codice soggetto è sotto il nome (%s)' % (percorso, seconda.replace('\n', ' ')[:40]))
        ok('Codice soggetto' in testo(pg, '.dettagli'), '%s: riga Codice soggetto nel pannello' % percorso)

    # ---------- 11. 768 px: si usa, senza scorrimento orizzontale
    vai(pg, 'Soggetti'); pg.wait_for_selector('.soggetti-filtri .dt tbody tr.cliccabile'); pg.wait_for_timeout(600)
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not sovr(pg), '768 px: nessuno scorrimento orizzontale della pagina')
    ok(righe(pg) > 0 and pg.locator('.pannello-testa h2').count() == 1, '768 px: elenco e scheda si usano')
    pg.screenshot(path=str(USCITA / 'app-soggetti-768.png'), full_page=True)
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    ok(pg.locator('.schede-corpo button[aria-label="Informazioni sui ruoli"]').count() == 1, '768 px: pulsante Informazioni nella scheda Ruoli')
    pg.screenshot(path=str(USCITA / 'ruoli-768.png'), full_page=True)  # impilata: la scheda sta sotto l'elenco
    pg.close()

    # ---------- 12. R2-02 e R2-04: risposta vecchia non sovrascrive, soggetto che non c'è
    pg = entra(S + '-ammi')
    primi = pg.evaluate("""async () => {
        const r = await fetch('/api/soggetti?righe=3&ordina=codice&dir=asc');
        const j = await r.json();
        return j.righe.map((x) => ({ id: x.id, nome: x.nome || 'Soggetto ' + x.codice }));
    }""")
    # il primo clic (riga 2) risponde dopo 0,9 s; il secondo (riga 3) subito: vince il secondo
    pg.route('**/api/soggetti/' + primi[1]['id'], lambda route: (time.sleep(0.9), route.continue_()))
    pg.evaluate("""() => {
        const r = document.querySelectorAll('.soggetti-filtri .dt tbody tr.cliccabile');
        r[1].click(); setTimeout(() => r[2].click(), 60);
    }""")
    pg.wait_for_timeout(2200)
    ok('/soggetti/' + primi[2]['id'] in pg.url and testo(pg, '.pannello-testa h2') == primi[2]['nome'],
       'R2-02: con due clic rapidi vince l’ultimo, non la risposta più lenta')
    pg.unroute('**/api/soggetti/' + primi[1]['id'])
    pg.goto(BASE + '/soggetti/999999')
    ok(attesa(pg, '.vuoto:has-text("Soggetto non caricato")', 10000),
       'R2-04: un soggetto che non c’è dice «Soggetto non caricato», non «Nessun soggetto»')
    ok(pg.locator('.soggetti-filtri .dt tbody tr.cliccabile').count() > 0, 'R2-04: l’elenco resta al suo posto')
    pg.close()
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
ok(not errori, 'nessun errore JavaScript')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
