# Prova degli aggiornamenti dal server (F4-A6, §16.4.2, D-23), con Playwright: due schede dello stesso
# utente; la scheda B registra una fattura di prova su una pratica e poi la annulla; la scheda A (Pratiche,
# con il filtro "Attesa fattura") mostra la barra entro pochi secondi, i contatori cambiano e le righe
# restano; "Aggiorna" applica e la riga esce. All'inizio si finge un 502 sul flusso: la fonte SSE deve
# riaprirsi da sola (A5-12). Alla fine la fattura è tolta (pulizia anche in caso di errore).
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
        # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
        for _ in range(24):
            if pg.locator('.accesso-scena.aperta').count(): break
            pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
        pg.wait_for_selector('.accesso-scena.aperta')

    def entra(pg, utente):
        pg.goto(BASE + '/pratiche')
        # due schede dello stesso utente condividono la sessione: la seconda è già dentro, salta l'accesso
        try:
            pg.wait_for_function("location.pathname === '/accesso'", timeout=5000)
        except Exception:
            pass
        if pg.evaluate("location.pathname === '/accesso'"):
            apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/pratiche'")
        pg.wait_for_selector('.dt tbody tr')

    def quieta(pg):
        pg.wait_for_function("() => !document.querySelector('.dt[aria-busy=true]') && !document.querySelector('.in-aggiornamento')")

    def segmento(pg, testo):
        return pg.locator('.segmenti [role=tab]', has_text=testo).first

    def attesa_barra(pg, timeout=30000):
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

    # A5-12: un 502 (riavvio del backend dietro Caddy) chiude la fonte SSE senza che EventSource riprovi;
    # il provider la riapre da solo dopo 15 s. La pagina non si ricarica: la verifica è una seconda
    # richiesta al flusso senza intervento dell'utente.
    risposte = {'finte': 0}
    flussi = []
    pgA.on('request', lambda r: flussi.append(r.url) if '/api/eventi/flusso' in r.url else None)

    def finto_502(route):
        if risposte['finte'] < 1:
            risposte['finte'] += 1
            route.fulfill(status=502, body='')
        else:
            route.continue_()

    pgA.route('**/api/eventi/flusso', finto_502)
    pgA.reload()
    pgA.wait_for_selector('.dt tbody tr')
    for _ in range(50):  # riapre dopo 15 s: si aspetta fino a 25 s
        if len(flussi) >= 2: break
        pgA.wait_for_timeout(500)
    ok(len(flussi) >= 2, 'A5-12: dopo il 502 la fonte SSE si riapre da sola')
    pgA.unroute('**/api/eventi/flusso', finto_502)

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
    pgB.goto(BASE + '/pratiche/' + pratica['id']); pgB.wait_for_load_state('networkidle'); pgB.wait_for_selector('.schede-barra')
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
    riga_doc.locator('button[aria-label^="Annulla"]').first.click()
    pgB.wait_for_selector('.velo .modale-piede button:has-text("Annulla il documento")')
    pgB.click('.velo .casella-grave input')
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

    # A5-13: un documento caricato da un'altra scheda fa crescere il contatore Documenti della barra
    # senza navigare (D-23): la barra si rilegge a ogni evento, non solo al cambio pagina.
    barra_doc = lambda: pgA.locator('.barra a[href="/documenti"] .conta')
    conta_doc = lambda: numero(barra_doc().inner_text()) if barra_doc().count() else 0
    prima_doc = conta_doc()
    csrf_b = pgB.request.get(BASE + '/api/accesso/io').json()['csrf']
    pdf = (b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
           b'3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF\n'
           b'% ' + NUMERO.encode() + b'\n')
    risposta = pgB.request.post(BASE + '/api/documenti/carica',
        multipart={'file': {'name': 'prova-eventi.pdf', 'mimeType': 'application/pdf', 'buffer': pdf}},
        headers={'x-csrf-token': csrf_b})
    ok(risposta.status == 201, 'scheda B: documento caricato (stato %d)' % risposta.status)
    doc_id = risposta.json()['id']
    for _ in range(30):
        if conta_doc() == prima_doc + 1:
            break
        pgA.wait_for_timeout(500)
    ok(conta_doc() == prima_doc + 1,
       'A5-13: il contatore Documenti della barra cresce senza navigare (%d -> %d)' % (prima_doc, prima_doc + 1))
    # pulizia: si scarta il documento di prova (aspetta se il lettore lo sta leggendo)
    for _ in range(30):
        scartato = pgB.request.post(BASE + '/api/documenti/' + doc_id + '/scarta',
            data={'motivo': 'Doppione'}, headers={'x-csrf-token': csrf_b})
        if scartato.status == 204:
            break
        pgB.wait_for_timeout(500)

    pgA.close(); pgB.close(); b.close()

ok(not errori, 'nessun errore JavaScript')
print('\n'.join(esiti))
print('errori delle pagine:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
