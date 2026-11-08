# Prova della pagina Soggetti dell'app (F1-A8b, D-102), con Playwright: elenco dal server, ricerca,
# segmenti, ordinamento, pagine, memoria della schermata, scheda con le quattro schede, nuovo soggetto
# (P.IVA doppia, corta, senza dati fiscali), ruoli, sedi, recapiti, fatturazione, disattiva, permessi,
# codice soggetto nelle altre anagrafiche, 768 px. Crea un soggetto di prova che resta nel database.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti di prova <s>-ammi, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>), sul database di prova con il seed caricato.
# Uso: python strumenti/prove/app_soggetti.py <suffisso> <cartella schermate> [base]
import re
import sys, pathlib, time
from playwright.sync_api import sync_playwright

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
    seg = lambda pg, t: pg.locator('.segmenti [role=tab]:has-text("%s")' % t)
    sovr = lambda pg: pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    cerca = lambda pg, t: (pg.fill('.filtri input[type=search]', t), pg.wait_for_timeout(1400))
    def vai(pg, voce):  # voce del menu: navigazione dentro l'app, senza ricaricare
        pg.click('.barra a.voce:has-text("%s")' % voce)
        pg.wait_for_function("location.pathname.startsWith('/%s')" % voce.lower()); pg.wait_for_load_state('networkidle')
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
    ok('Soggetti' in testo(pg, '.testa h1'), 'titolo della pagina')
    ok(righe(pg) == 25 and 'di 28' in testo(pg, '.soggetti-filtri .dt-piede'), 'elenco: 25 righe in pagina, 28 soggetti dal server')
    ok(seg(pg, 'Tutti').locator('.n').inner_text() == '28', 'segmento Tutti: 28 dal server')
    cerca(pg, 'MCL')
    ok(attesa(pg, '.soggetti-filtri .dt tbody tr:has-text("MCL SRL")') and righe(pg) == 1, 'ricerca per nome: MCL SRL')
    ok(attesa(pg, '.segmenti [role=tab]:has-text("Tutti") .n:text-is("1")') and seg(pg, 'Tutti').locator('.n').inner_text() == '1',
       'D-23: il numero del segmento conta con la ricerca')
    cerca(pg, '08943010155')
    ok(righe(pg) == 1 and 'P.IVA 08943010155' in testo(pg, '.soggetti-filtri .dt tbody'), 'ricerca per P.IVA: MCL')
    cerca(pg, '')
    seg(pg, 'Clienti').click()
    ok(attesa(pg, '.soggetti-filtri .dt-piede:has-text("13 elementi")') and '13 elementi' in testo(pg, '.soggetti-filtri .dt-piede'), 'segmento Clienti: 13 dal server')
    seg(pg, 'Fornitori').click()
    ok(attesa(pg, '.soggetti-filtri .dt-piede:has-text("12 elementi")') and '12 elementi' in testo(pg, '.soggetti-filtri .dt-piede'), 'segmento Fornitori: 12 dal server')
    seg(pg, 'Subagenti').click()
    ok(attesa(pg, '.soggetti-filtri .dt-piede:has-text("4 elementi")') and '4 elementi' in testo(pg, '.soggetti-filtri .dt-piede'), 'segmento Subagenti: 4 dal server')
    seg(pg, 'Non attivi').click()
    ok(attesa(pg, '.soggetti-filtri .dt:has-text("Nessun soggetto")') and righe(pg) == 0, 'segmento Non attivi: elenco vuoto')
    seg(pg, 'Tutti').click(); pg.wait_for_timeout(800)
    pg.click('.soggetti-filtri .dt th:has-text("Codice")')
    ok(attesa(pg, '.soggetti-filtri .dt th[aria-sort="descending"]:has-text("Codice")'), 'ordinamento dal server: codice decrescente')
    codici = lambda pg: [x.inner_text() for x in pg.locator('.soggetti-filtri .dt tbody tr td:first-child').all()]
    def codici_attesi(pg, n, rovescio=None, minore=None, timeout=20000):
        fine, c = time.time() + timeout / 1000, []
        while time.time() < fine:
            c = codici(pg)
            if len(c) == n and (rovescio is None or c == sorted(c, reverse=rovescio)) and (minore is None or c[0] < minore):
                return c
            pg.wait_for_timeout(250)
        return c
    c1 = codici_attesi(pg, 25, rovescio=True)
    ok(len(c1) == 25 and c1 == sorted(c1, reverse=True), 'ordinamento dal server: righe in ordine decrescente')
    pg.click('.dt-pagine button[title="Pagina 2"]')
    c2 = codici_attesi(pg, 3, rovescio=True, minore=c1[-1])
    ok(len(c2) == 3 and c2[0] < c1[-1] and c2 == sorted(c2, reverse=True), 'pagina 2: le ultime tre righe')
    # memoria della schermata (§7.12): ricerca, scheda, ordinamento e pagina si ritrovano
    pg.click('.soggetti-filtri .dt tbody tr:first-child'); pg.wait_for_selector('.schede-barra [role=tab]', timeout=10000)
    pg.wait_for_selector('.dettagli'); pg.wait_for_timeout(500)
    scheda(pg, 'Sedi'); pg.wait_for_timeout(300)
    vai(pg, 'Clienti'); ok('/clienti' in pg.url, 'vado a Clienti dal menu')
    pg.go_back(); pg.wait_for_selector('.soggetti-filtri .dt tbody tr.cliccabile'); pg.wait_for_timeout(700)
    ok(codici_attesi(pg, 3, rovescio=True, minore=c1[-1]) == c2, 'indietro: pagina e ordinamento ricordati')
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
    pg.select_option('#c-tipo', 'cliente'); pg.fill('#c-nome', CLIENTE); pg.fill('#c-codice', 'c99' + RUN); invia(pg)
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 1 and 'cliente' in testo(pg, '.schede-corpo'), 'ruolo cliente aggiunto')
    pg.click('button:has-text("Aggiungi ruolo")'); finestra(pg).wait_for()
    pg.select_option('#c-tipo', 'fornitore'); pg.fill('#c-nome', FORNITORE); pg.fill('#c-codice', 'f99' + RUN); invia(pg)
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
    scheda(pg, 'Ruoli'); pg.wait_for_timeout(300)
    corpo = testo(pg, '.schede-corpo')
    ok(pg.locator('.schede-corpo .dt tbody tr').count() == 2 and ('C99' + RUN) in corpo.upper() and ('F99' + RUN) in corpo.upper(),
       'due ruoli con due codici sullo stesso soggetto (D-101)')
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
    finestra(pg).wait_for(state='detached'); attesa_scheda(pg)
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
    pg.close()
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
ok(not errori, 'nessun errore JavaScript')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
