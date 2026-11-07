# Prova degli aggiornamenti dal server (F4-A6, §16.4.2, D-23), con Playwright: due schede dello stesso
# utente; la scheda B registra una fattura di prova su una pratica e poi la annulla; la scheda A (Pratiche,
# con il filtro "Attesa fattura") mostra la barra entro pochi secondi, i contatori cambiano e le righe
# restano; "Aggiorna" applica e la riga esce. Alla fine la fattura è tolta (pulizia anche in caso di errore).
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti <s>-ammi (password-di-prova).
# Uso: python strumenti/prove/app_eventi.py <suffisso> <cartella schermate> [base]
import re
import sys, pathlib, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8101'
PW = 'password-di-prova'
NUMERO = 'EV-' + S.upper() + '-' + str(int(time.time()) % 100000)
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def numero(testo):
    return int(re.sub(r'[^\d]', '', testo) or 0)
def piatto(t):
    return ' '.join(t.replace(chr(160), ' ').split())

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    def apri(pg):
        pg.wait_for_selector('.accesso-scena')
        if pg.locator('.accesso-scena.aperta').count() == 0: pg.keyboard.press('Enter')
        pg.wait_for_selector('.accesso-scena.aperta')

    def entra(pg, utente):
        pg.goto(BASE + '/pratiche'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/pratiche'")
        pg.wait_for_selector('.dt tbody tr')

    def quieta(pg):
        pg.wait_for_function("() => !document.querySelector('.dt[aria-busy=true]') && !document.querySelector('.in-aggiornamento')")

    def segmento(pg, testo):
        return pg.locator('.segmenti [role=tab]', has_text=testo).first

    def attesa_barra(pg, timeout=15000):
        pg.wait_for_selector('.aggiornamenti', timeout=timeout)
        return pg.locator('.aggiornamenti')

    def elimina(pg, pratica_id, numero_doc):
        """Toglie la fattura di prova se è rimasta (pulizia)."""
        csrf = pg.request.get(BASE + '/api/accesso/io').json()['csrf']
        docs = pg.request.get(BASE + f'/api/pratiche/{pratica_id}/documenti').json()
        for d in docs.get('documenti', []):
            if d['numero'] == numero_doc:
                pg.request.delete(BASE + f"/api/pratiche/{pratica_id}/documenti/{d['id']}", headers={'x-csrf-token': csrf})
                return True
        return False

    pgA = b.new_page(viewport={'width': 1440, 'height': 900})
    pgB = b.new_page(viewport={'width': 1440, 'height': 900})
    for pg in (pgA, pgB):
        pg.on('pageerror', lambda e: errori.append(str(e)))
    entra(pgA, S + '-ammi')
    entra(pgB, S + '-ammi')

    # scheda A: la lista con il filtro "Attesa fattura" (una pratica confermata)
    segmento(pgA, 'Attesa fattura').click(); pgA.wait_for_timeout(700); quieta(pgA)
    conta = numero(segmento(pgA, 'Attesa fattura').locator('.n').inner_text())
    ok(conta > 0, 'Pratiche con il filtro Attesa fattura: %d' % conta)
    righe_prima = pgA.locator('.dt tbody tr').count()
    riga1 = pgA.locator('.dt tbody tr').first.inner_text()
    ok(righe_prima > 0, 'righe in elenco: %d' % righe_prima)

    # la pratica da toccare: la prima del filtro, dallo stesso elenco del server
    elenco = pgA.request.get(BASE + '/api/pratiche?stato=confermata&ordina=stato&dir=asc&pagina=0').json()
    pratica = elenco['righe'][0]
    ok(pratica['numero'] in riga1, 'la prima riga è la pratica %s' % pratica['numero'])

    # scheda B: una scrittura vera (fattura di prova), poi si toglie
    pgB.goto(BASE + '/pratiche/' + pratica['id']); pgB.wait_for_selector('.schede-barra')
    pgB.click('button:has-text("Registra fattura")')
    pgB.wait_for_selector('.velo #c-numero')
    pgB.fill('.velo #c-numero', NUMERO)
    pgB.fill('.velo #c-importo', '100')
    pgB.click('.velo .modale-piede button:has-text("Registra")')
    pgB.wait_for_function("!document.querySelector('.velo')", timeout=15000)
    pgB.wait_for_selector('.avviso', timeout=10000)
    ok('Fattura registrata' in piatto(pgB.locator('.avviso').inner_text()), 'scheda B: fattura %s registrata' % NUMERO)

    # scheda A: entro pochi secondi la barra; i contatori cambiano, le righe no
    barra = attesa_barra(pgA)
    testo_barra = piatto(barra.inner_text())
    ok('Ci sono aggiornamenti' in testo_barra and 'Aggiorna' in testo_barra, 'barra «Ci sono aggiornamenti · Aggiorna»')
    ok(not segmento(pgA, 'Attesa fattura').locator('.n').inner_text().strip() == str(conta),
       'contatore del segmento aggiornato (%s -> %s)' % (conta, segmento(pgA, 'Attesa fattura').locator('.n').inner_text()))
    ok(pgA.locator('.dt tbody tr').count() == righe_prima and pratica['numero'] in pgA.locator('.dt tbody tr').first.inner_text(),
       'le righe restano ferme finché non si clicca Aggiorna')
    pgA.screenshot(path=str(USCITA / 'app-eventi-1440.png'))

    # 768 px con la barra: niente scorrimento di lato
    pgA.set_viewport_size({'width': 768, 'height': 1024}); pgA.wait_for_timeout(500)
    ok(not pgA.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '768 px: nessuno scorrimento orizzontale')
    pgA.screenshot(path=str(USCITA / 'app-eventi-768.png'), full_page=True)
    pgA.set_viewport_size({'width': 1440, 'height': 900}); pgA.wait_for_timeout(400)

    # Aggiorna: applica i dati nuovi, filtri e pagina restano
    pgA.click('.aggiornamenti button:has-text("Aggiorna")')
    pgA.wait_for_function("!document.querySelector('.aggiornamenti')")
    pgA.wait_for_timeout(700); quieta(pgA)
    ok(segmento(pgA, 'Attesa fattura').get_attribute('aria-selected') == 'true', 'dopo Aggiorna il filtro è ancora quello')
    ok(pgA.locator('.dt tbody tr', has_text=pratica['numero']).count() == 0, 'dopo Aggiorna la pratica fatturata esce dall’elenco')

    # pulizia in scheda B: Annulla la fattura di prova (documenti fiscali nella card del Riepilogo)
    riga_doc = pgB.locator('.elenco li', has_text=NUMERO).first
    if riga_doc.count() == 0:  # la pagina può essersi ricaricata: si riapre
        pgB.goto(BASE + '/pratiche/' + pratica['id']); pgB.wait_for_selector('.schede-barra')
        riga_doc = pgB.locator('.elenco li', has_text=NUMERO).first
    riga_doc.locator('button', has_text='Annulla').first.click()
    pgB.wait_for_selector('.velo .modale-piede button:has-text("Annulla il documento")')
    pgB.click('.velo .modale-piede button:has-text("Annulla il documento")')
    pgB.wait_for_function("!document.querySelector('.velo')", timeout=15000)
    pgB.wait_for_timeout(700)
    ok(pgB.locator('.dt tbody tr', has_text=NUMERO).count() == 0, 'scheda B: fattura di prova tolta')

    # scheda A: torna la riga; Aggiorna chiude il giro
    attesa_barra(pgA)
    pgA.click('.aggiornamenti button:has-text("Aggiorna")')
    pgA.wait_for_function("!document.querySelector('.aggiornamenti')")
    pgA.wait_for_timeout(700); quieta(pgA)
    ok(pgA.locator('.dt tbody tr', has_text=pratica['numero']).count() == 1, 'dopo la pulizia la pratica torna in elenco con Aggiorna')
    ok(numero(segmento(pgA, 'Attesa fattura').locator('.n').inner_text()) == conta, 'contatore del segmento tornato a %d' % conta)

    # pulizia di sicurezza: se una prova precedente ha lasciato la fattura, la toglie
    ok(not elimina(pgB, pratica['id'], NUMERO), 'pulizia: nessun documento di prova rimasto')
    pgA.close(); pgB.close(); b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori delle pagine:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
