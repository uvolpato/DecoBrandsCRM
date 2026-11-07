# Prova della pagina Guida dell'app (F5-A8, spec §7.17) con Playwright: argomenti a sinistra,
# ricerca in tutto il testo, apertura di un argomento, link alla pagina vera, schemi, argomenti
# di Gestione nascosti a chi non ha il permesso, /guida senza argomento, tablet senza scorrimento
# orizzontale. Servono backend (8002) e frontend (8001) accesi e gli utenti di prova di
# strumenti/prove/utenti_prova.js (<s>-ammi, <s>-oper, <s>-lett, password password-di-prova).
# Uso: python strumenti/prove/app_guida.py <suffisso> <cartella schermate> [indirizzo]
import sys, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente, percorso='/guida', larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + percorso); pg.wait_for_function("location.pathname === '/accesso'", timeout=60000)
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function(f"location.pathname === '{percorso.split('?')[0]}'", timeout=60000); pg.wait_for_load_state('networkidle')
        return pg
    titolo = lambda pg: pg.locator('.colonne > .pannello').nth(1).locator('.pannello-testa h2').inner_text()
    argomenti = lambda pg: pg.locator('.selezionabile a').count()

    # ---- amministratore: elenco, primo argomento, ricerca, apertura, link
    pg = entra(S + '-ammi')
    pg.wait_for_selector('.selezionabile a')
    ok(pg.locator('.testa h1').inner_text().strip() == 'Guida', 'titolo della pagina')
    ok(argomenti(pg) == 18, '18 argomenti, senza la Vendita diretta (D-08) e con il Registro (F5-A2)')
    ok(titolo(pg) == 'Come funziona il CRM', '/guida senza argomento: il primo argomento')
    ok(pg.title() == 'Guida · Decobrands', 'titolo della scheda del browser')
    ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '1440 px: niente scorrimento orizzontale')
    ok(pg.locator('.guida-schema.ciclo a.nodo').count() == 4 and pg.locator('.guida-schema.ciclo a.nodo[href="/pratiche"]').count() == 1,
       'schema del ciclo: quattro riquadri che aprono le pagine dell’app')
    ok(pg.locator('.pannello-testa a:has-text("Apri la pagina")').count() == 0, 'Inizia qui: niente “Apri la pagina”')
    ok(all(g in pg.locator('.selezionabile').inner_text() for g in ('Inizia qui', 'Lavoro', 'Anagrafiche', 'Gestione')), 'i quattro gruppi')

    pg.fill('.filtri input[type=search]', 'Prepara la contestazione'); pg.wait_for_timeout(200)
    ok(argomenti(pg) == 1 and 'Bollettini' in pg.locator('.selezionabile').inner_text(), 'la ricerca trova un pulsante: «Prepara la contestazione» → Bollettini')
    pg.click('.selezionabile a:has-text("Bollettini")'); pg.wait_for_function("location.pathname === '/guida/bollettini'")
    pg.wait_for_selector('.guida-finestra')
    ok(titolo(pg) == 'Bollettini' and 'Ogni mese ogni fornitore comunica' in pg.locator('.guida-sintesi').inner_text(), 'argomento aperto: sintesi')
    ok(pg.input_value('.filtri input[type=search]') == 'Prepara la contestazione', 'la ricerca resta passando da un argomento all’altro')
    ok(pg.locator('.guida-finestra:has-text("Sollecito · Contestazione")').count() == 1 and 'si apre da' in pg.locator('.guida-finestra').first.inner_text(), 'finestre: si apre da, campi, pulsanti')
    pg.fill('.filtri input[type=search]', ''); pg.wait_for_timeout(200)

    pg.click('.selezionabile a:has-text("Pratiche")'); pg.wait_for_function("location.pathname === '/guida/pratiche'")
    ok(pg.locator('.guida-sapere a[href="/guida/incassi"]').count() == 1, 'link interno alla Guida riscritto per l’app')
    ok(titolo(pg) == 'Pratiche' and pg.locator('.guida-schema.stati .stato-nodo').count() == 3, 'schema degli stati della pratica')
    ok(pg.locator('.pannello-testa a:has-text("Apri la pagina")').get_attribute('href') == '/pratiche', '“Apri la pagina” porta alla pagina vera')
    ok(pg.locator('.guida-flusso li').count() == 3 and pg.locator('.guida-pulsanti dt .tasto').count() > 10, 'Come si lavora numerato e Pulsanti e comandi')
    ok('Chi può modificare:' in pg.locator('.guida-ruoli').inner_text() and 'Provvigioni' in pg.locator('.guida-ruoli').inner_text(), 'Chi può modificare, dai permessi (§8.3)')
    pg.screenshot(path=str(USCITA / 'app-guida-1440.png'))

    pg.click('.guida-sapere a[href="/guida/incassi"]'); pg.wait_for_function("location.pathname === '/guida/incassi'")
    ok(titolo(pg) == 'Incassi dei clienti' and pg.locator('.guida-schema.incassi .corsia').count() == 2, 'link nel testo: Incassi dei clienti, due corsie')
    ok(pg.locator('.pannello-testa a:has-text("Apri la pagina")').get_attribute('href') == '/', 'Incassi: “Apri la pagina” porta a Oggi (/)')

    # argomento inesistente: si torna all'elenco, cioè al primo argomento
    pg.goto(BASE + '/guida/non-esiste'); pg.wait_for_selector('.guida')
    ok(titolo(pg) == 'Come funziona il CRM', 'argomento inesistente: torna al primo (l’elenco resta a sinistra)')

    pg.close()

    # ---- lettura: nessun argomento di Gestione
    pg = entra(S + '-lett')
    pg.wait_for_selector('.selezionabile a')
    testo = pg.locator('.selezionabile').inner_text()
    ok(not any(g in testo for g in ('Utenti e ruoli', 'Stato del sistema', 'Impostazioni', 'Documenti scartati', 'Accesso')) and argomenti(pg) == 12,
       'lettura: i cinque argomenti di Gestione non ci sono')
    pg.goto(BASE + '/guida/utenti'); pg.wait_for_selector('.guida')
    ok(titolo(pg) == 'Come funziona il CRM', 'lettura: /guida/utenti non aprire l’argomento riservato')
    pg.close()

    # ---- operatore: Stato del sistema (anche per un operatore) e scartati, non utenti e impostazioni
    pg = entra(S + '-oper')
    pg.wait_for_selector('.selezionabile a')
    testo = pg.locator('.selezionabile').inner_text()
    ok('Stato del sistema' in testo and 'Documenti scartati' in testo and 'Utenti e ruoli' not in testo and 'Impostazioni' not in testo,
       'operatore: Stato del sistema e Documenti scartati (D-45), non Utenti e Impostazioni')
    pg.close()

    # ---- tablet
    pg = entra(S + '-ammi', larghezza=768)
    pg.wait_for_selector('.selezionabile a')
    ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px: niente scorrimento orizzontale')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.colonne')).gridTemplateColumns.split(' ').length") == 1, '768 px: argomenti e contenuto impilati')
    pg.click('.selezionabile a:has-text("Bollettini")'); pg.wait_for_function("location.pathname === '/guida/bollettini'")
    pg.wait_for_timeout(300)
    ok(not pg.evaluate('document.documentElement.scrollWidth > innerWidth'), '768 px, argomento lungo: niente scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'app-guida-768.png'), full_page=True)
    pg.close()
    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
