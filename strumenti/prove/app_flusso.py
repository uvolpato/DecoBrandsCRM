# Prova di flusso continuo sull'app vera (F7-A1), con Playwright: accesso ed Esci, numeri del seed
# confrontati con il prototipo, filtri/conteggi/riepilogo/ordinamento/pagine, dettaglio pratica,
# documenti, abbinamento fattura → pratica fatturata, riconciliazione del bollettino, storno D-11 nella
# liquidazione successiva, esportazioni Excel/CSV/PDF, aggiornamenti dal server fra due schede,
# anagrafiche e gestione, 1440 e 768 px, nessun errore JavaScript.
# Servono backend e frontend accesi (base: terzo argomento) e gli utenti <s>-ammi, <s>-oper, <s>-lett
# (password-di-prova, da utenti_prova.js crea <s>). Il documento di prova lo crea e lo toglie questo
# script con documenti_prova.js: DATABASE_URL deve puntare allo stesso database dell'app.
# Il seed deve essere quello di §12; la verifica del bollettino cambia lo stato (come le altre prove F3).
# Uso: python strumenti/prove/app_flusso.py <suffisso> <cartella schermate> [base]
import os, pathlib, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
ROOT = pathlib.Path(__file__).resolve().parents[2]
PROTOTIPO = (ROOT / 'prototipo-alternativo' / 'index.html').as_uri()
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def numero(t):
    return float(re.sub(r'[^\d,-]', '', t).replace('.', '').replace(',', '.'))
def piatto(t):
    return ' '.join(t.replace(chr(160), ' ').split())

def prova_documento(comando):
    subprocess.run(['node', '../../strumenti/prove/documenti_prova.js', comando, S],
                   cwd=ROOT / 'app' / 'backend', check=True, capture_output=True)

def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')

def esci(pg):
    pg.click('.io-btn'); pg.wait_for_selector('.menu-utente')
    pg.click('.menu-utente-voce:has-text("Esci")'); pg.wait_for_function("location.pathname === '/accesso'")

prova_documento('crea')
try:
  with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(utente=S + '-ammi', percorso='/oggi', larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 800 else 1024})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + percorso); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', utente); pg.fill('#c-password', PW); pg.wait_for_timeout(500); pg.click('button.btn.largo')
        pg.wait_for_function('p => location.pathname === p', arg=percorso, timeout=60000)
        pg.wait_for_load_state('networkidle')
        return pg

    def api(pg, percorso, metodo='GET', corpo=None):
        r = pg.request.fetch(BASE + '/api/' + percorso, method=metodo, data=corpo or {},
                             headers={'x-csrf-token': pg.request.get(BASE + '/api/accesso/io').json()['csrf']})
        return r

    def json(pg, percorso):
        return api(pg, percorso).json()

    def quieta(pg):
        pg.wait_for_function("() => !document.querySelector('.dt[aria-busy=true]') && !document.querySelector('.in-aggiornamento')")

    def testo(pg, s):
        return pg.locator(s).first.inner_text()

    def cerca(pg, t):
        pg.fill('.filtri input[type=search]', t); pg.wait_for_timeout(500)
        quieta(pg); pg.wait_for_timeout(400)

    # ---------- 0. Accesso: scena, logo, credenziali sbagliate ----------
    pg0 = b.new_page(viewport={'width': 1440, 'height': 900})
    pg0.goto(BASE + '/'); pg0.wait_for_function("(location.pathname + location.search).includes('/accesso')")
    pg0.wait_for_selector('.accesso-scena')
    ok(pg0.locator('.accesso-scena .accesso-logo img').count() == 1, 'accesso: scena scura con il logo')
    ok('Premi un tasto' in pg0.locator('body').inner_text(), 'accesso: invito a premere un tasto')
    apri(pg0); pg0.fill('#c-utente', S + '-ammi'); pg0.fill('#c-password', 'sbagliata'); pg0.click('button.btn.largo')
    pg0.wait_for_selector('.modulo-errore:not([hidden])')
    ok(pg0.locator('.modulo-errore').inner_text() == 'Credenziali non valide.', 'accesso: un solo messaggio per credenziali sbagliate')
    pg0.close()

    # ---------- 1. Numeri del seed: prototipo ↔ app (criterio 6) ----------
    proto = b.new_page()
    proto.goto(PROTOTIPO); proto.wait_for_timeout(400)
    ok(proto.evaluate('() => M.S.oggi') == '2026-09-04', 'prototipo: «oggi» fermo al 04/09/2026')
    proto_q3 = proto.evaluate("() => M.righeLiquidazione(2026,3).filter(r => r.liquidabile).reduce((s,r) => s + r.provvigione, 0)")
    proto_q2 = proto.evaluate("() => M.righeLiquidazione(2026,2).filter(r => r.liquidabile).reduce((s,r) => s + r.provvigione, 0)")
    proto_doc_q3 = proto.evaluate("() => M.righeLiquidazione(2026,3).filter(r => r.liquidabile).map(r => r.doc.numero)")
    ok(abs(proto_q3 - 1886.73) < 0.01, 'prototipo: 3° trimestre 2026 da liquidare 1.886,73 € (valore di riferimento)')

    pg = entra(percorso='/pratiche')
    q3 = json(pg, 'liquidazioni?anno=2026&trimestre=3')
    q2 = json(pg, 'liquidazioni?anno=2026&trimestre=2')
    ok(q3['stato']['chiave'] in ('da_liquidare', 'chiusa'), 'app: 3° trimestre 2026 presente')
    ok(abs(q2['riepilogo']['provvigione'] - proto_q2) < 0.01,
       'app: 2° trimestre = prototipo (%.2f €)' % q2['riepilogo']['provvigione'])
    extra = sum(d['provvigione'] for d in q3['documenti'] if d['liquidabile'] and d['numero'] not in proto_doc_q3)
    ok(abs(extra - 99.65) < 0.01, 'app: due pratiche in più nel seed (§12) valgono 99,65 € (FT-S12-2A + FT-S12-2B)')
    ok(abs((q3['riepilogo']['provvigione'] - extra) - proto_q3) < 0.01,
       'app − pratiche in più = prototipo: %.2f − %.2f = %.2f' % (q3['riepilogo']['provvigione'], extra, proto_q3))
    ok(len(json(pg, 'pratiche?pagina=0')['righe']) == 25, 'app: Seed con 54 pratiche (25 per pagina)')
    ok(json(pg, 'pratiche?pagina=0')['totale'] == 54, 'app: 54 pratiche, 52 del prototipo + 2 dei casi §12')
    bol = json(pg, 'bollettini/6')
    ok(bol['fornitore'] == 'Gasper GmbH' and bol['mese'] == 8 and bol['anno'] == 2026, 'app: bollettino Gasper agosto 2026')
    ok(bol['totali']['riconosciuto'] == 394.8 and bol['totali']['calcolato'] == 3349.38
       and bol['totali']['differenza'] == -2954.58, 'app: totali Gasper agosto = prototipo (394,80 / 3.349,38 / -2.954,58)')
    ana = json(pg, 'analisi?dal=2025-10&al=2026-09')
    ok(ana['numeri']['fatturato'] == 79534.06 and ana['numeri']['prese'] == 12976.26
       and ana['numeri']['pagate'] == 4127.34 and ana['numeri']['margine'] == 8848.92,
       'app: Analisi ott 2025–set 2026 = prototipo (79.534,06 / 12.976,26 / 4.127,34 / 8.848,92)')
    ok(ana['numeri']['documenti'] == 19 and ana['numeri']['clienti'] == 7, 'app: Analisi 19 documenti, 7 clienti')
    proto.close()

    # ---------- 1b. Oggi: gruppi, riquadri, scadenze, ultime operazioni ----------
    pg.goto(BASE + '/'); pg.wait_for_selector('.gruppo-fare'); quieta(pg)
    ok(pg.locator('.kpi').count() == 4, 'Oggi: quattro riquadri')
    ok(pg.locator('.gruppo-fare').count() == 4, 'Oggi: quattro gruppi di cose da fare')
    ok(pg.locator('.schede-barra [role=tab]:has-text("Prossime scadenze")').count() == 1, 'Oggi: scheda Prossime scadenze')
    pg.click('.schede-barra [role=tab]:has-text("Ultime operazioni")'); pg.wait_for_timeout(400)
    ok(pg.locator('.schede-corpo .elenco li').count() >= 3, 'Oggi: ultime operazioni dal registro')
    ok(pg.locator('.gruppo-fare').count() == 4, 'Oggi: anche nella scheda operazioni i quattro gruppi restano')
    pg.goto(BASE + '/pratiche'); pg.wait_for_selector('.dt tbody tr.cliccabile')

    # ---------- 2. Accesso, guscio, Esci ----------
    ok('Pratiche' in pg.locator('.testa h1').inner_text(), 'accesso con nome utente e password: si entra su Pratiche')
    ok(pg.locator('.barra-piede .io b').inner_text() == 'Prova Ammi', 'barra: nome dell’utente')
    ok(pg.locator('.barra .gruppo').count() >= 3, 'barra laterale a gruppi (Ogni giorno, Ogni mese, Ogni trimestre…)')
    ok('Pratiche' in pg.locator('.barra .voce.attiva').inner_text(), 'voce attiva = pagina corrente')
    ok(pg.locator('.testa a[href^="/guida/"]').count() == 1, 'testata: Guida contestuale')
    esci(pg)
    ok(True, 'Esci dal menu dell’utente chiude la sessione')
    pg.close()
    pg = entra(percorso='/pratiche')
    pg.wait_for_selector('.dt tbody tr.cliccabile')
    ok(pg.locator('.dt tbody tr.cliccabile').count() == 25, 'di nuovo dentro: elenco pratiche caricato')
    ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '1440 px: Pratiche senza scorrimento orizzontale')

    # ---------- 3. Pratiche: ricerca, filtri, conteggi, riepilogo, ordinamento, pagine ----------
    seg = lambda t: pg.locator('.segmenti [role=tab]:has-text("%s")' % t)
    nseg = lambda t: int(seg(t).locator('.n').inner_text())
    righe = lambda: pg.locator('.dt tbody tr.cliccabile').count()
    pg.wait_for_function("() => { const n = document.querySelector('.segmenti [role=tab] .n'); return !!n && /\\d/.test(n.textContent); }")
    ok(pg.locator('.segmenti [role=tab]').count() == 6, 'pratiche: sei segmenti di stato')
    n = nseg('Tutte')
    stati = sum(nseg(t) for t in ('Conferma in ritardo', 'Attesa conferma', 'Attesa fattura', 'Fatturate'))
    ok(n == 54 and stati == n, 'pratiche: i numeri dei segmenti vengono dal server (54 = somma degli stati)')
    ok(nseg('Con variazioni') >= 1, 'pratiche: almeno una con variazioni fra le fasi')
    numero0 = pg.locator('.dt tbody tr.cliccabile b').first.inner_text()
    cerca(pg, numero0)
    ok(1 <= righe() <= n and numero0 in testo(pg, '.dt tbody'), 'ricerca per numero: trova la pratica')
    cerca(pg, 'zzzz-nessuno')
    ok(righe() == 0 and '0 elementi' in testo(pg, '.dt-piede'), 'ricerca senza risultati: elenco vuoto')
    cerca(pg, '')
    fb = pg.locator('.filtri').first
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click(); fb.locator('.ricerca-menu:not([hidden]) li[role=option]', has_text='Gries').first.click(); pg.keyboard.press('Escape')
    pg.wait_for_function("() => document.querySelector('.filtri .ricerca-testo')?.placeholder.includes('Gries')")
    pg.wait_for_function("(n) => { const e = document.querySelector('.segmenti [role=tab] .n'); return e && Number(e.textContent) < n; }", arg=n); quieta(pg)
    n_g = nseg('Tutte')
    pg.wait_for_function("(n) => document.querySelectorAll('.dt tbody tr.cliccabile').length === Math.min(25, n)", arg=n_g)
    ok(1 <= n_g < n and righe() == min(25, n_g), 'filtro multiplo Gries: %d pratiche' % n_g)
    ok(nseg('Tutte') == n_g and nseg('Attesa fattura') <= n_g, 'numeri dei segmenti aggiornati con il filtro (D-23)')
    ok(pg.locator('.riepilogo-filtri .btn-icona-conta').inner_text() == '1', 'riepilogo: 1 filtro attivo')
    pg.locator('.riepilogo-filtri .btn-icona').first.click(); pg.wait_for_timeout(300)
    ok('Gries' in testo(pg, '.riepilogo-pop'), 'riepilogo dei filtri: mostra Gries')
    pg.click('.riepilogo-pop .link-azzera')
    pg.wait_for_function("(n) => Number(document.querySelector('.segmenti [role=tab] .n')?.textContent) === n", arg=n); quieta(pg)
    ok(nseg('Tutte') == n, 'Togli tutti i filtri: torna a 54')
    pg.click('.dt th:has-text("Importo")'); pg.wait_for_function("() => document.querySelector('.dt th.attivo')?.getAttribute('aria-sort') === 'ascending'")
    pg.wait_for_function("""() => { const v = [...document.querySelectorAll('.dt tbody tr.cliccabile')].map(r => Number((r.children[4]?.textContent || '').replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.'))); return v.length && v.every((x, i) => i === 0 || v[i-1] <= x); }"""); quieta(pg)
    importi = lambda: [numero(pg.locator('.dt tbody tr.cliccabile').nth(i).locator('td').nth(4).inner_text()) for i in range(righe())]
    ok(importi() == sorted(importi()), 'ordinamento per importo crescente')
    pg.click('.dt th:has-text("Importo")'); pg.wait_for_function("() => document.querySelector('.dt th.attivo')?.getAttribute('aria-sort') === 'descending'")
    pg.wait_for_function("""() => { const v = [...document.querySelectorAll('.dt tbody tr.cliccabile')].map(r => Number((r.children[4]?.textContent || '').replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.'))); return v.length && v.every((x, i) => i === 0 || v[i-1] >= x); }"""); quieta(pg)
    ok(importi() == sorted(importi(), reverse=True), 'secondo clic: importo decrescente')
    prima_dec = pg.locator('.dt tbody tr.cliccabile b').first.inner_text()
    pg.click('.dt-pagine button[title="Pagina successiva"]')
    pg.wait_for_function("() => document.querySelector('.dt-piede > span')?.textContent.startsWith('26–')"); quieta(pg)
    inizio = testo(pg, '.dt-piede > span:first-child')
    ok(inizio.startswith('26–') and 'di 54 elementi' in inizio, 'pagine: «%s»' % inizio)
    ok(pg.locator('.dt tbody tr.cliccabile b').first.inner_text() != prima_dec, 'pagina successiva: righe diverse')
    ok(pg.locator('.dt th.attivo:has-text("Importo")').get_attribute('aria-sort') == 'descending', 'la pagina tiene l’ordinamento')
    pg.click('.dt-pagine button[title="Pagina precedente"]')
    pg.wait_for_function("() => document.querySelector('.dt-piede > span')?.textContent.startsWith('1–')"); quieta(pg)
    ok(testo(pg, '.dt-piede').startswith('1–25'), 'pagina precedente: si torna alla prima')

    # ---------- 4. Dettaglio pratica, schede, confronto documenti ----------
    pg.locator('.segmenti [role=tab]:has-text("Con variazioni")').click(); quieta(pg)
    pg.wait_for_function("() => document.querySelector('.dt tbody tr.cliccabile')?.textContent.includes('variazioni fra le fasi')")
    pg.wait_for_timeout(500)
    pg.locator('.dt tbody tr.cliccabile').first.click()
    try:
        pg.wait_for_function("/^\\/pratiche\\/\\d+/.test(location.pathname)", timeout=10000)
    except Exception:
        pg.locator('.dt tbody tr.cliccabile').first.click()
    pg.wait_for_selector('.binario', timeout=60000)
    ok(pg.locator('.testa h1').count() == 1 and '/pratiche/' in pg.url, 'clic sulla riga: dettaglio della pratica')
    fasi = pg.locator('.binario .tappa h3').all_inner_texts()
    ok(fasi == ['Ordine', 'Conferma', 'Fattura', 'Nota di credito'], 'binario delle fasi: %s' % ' > '.join(fasi))
    ok(pg.locator('.binario .tappa.fatta').count() >= 2, 'binario: le fasi fatte hanno la spunta')
    ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'pratica: due schede (Riepilogo, Righe a confronto)')
    ok(pg.locator('.schede-barra [role=tab]').nth(1).get_attribute('aria-selected') == 'true', 'aperta da «Con variazioni»: parte da Righe a confronto')
    ok(pg.locator('.dt tbody tr').count() >= 1 and 'variazion' in testo(pg, '.schede-barra [role=tab][aria-selected=true]'), 'righe a confronto: la tabella delle variazioni')
    pg.click('.schede-barra [role=tab]:has-text("Riepilogo")'); pg.wait_for_timeout(400)
    ok(pg.locator('.avviso-variazioni').count() == 1, 'Riepilogo: avviso delle variazioni')
    ok(pg.locator('.pannello', has=pg.locator('h2', has_text='Provvigione')).locator('.cifre').count() == 1, 'Riepilogo: provvigione calcolata dal server')
    ok(pg.locator('.pannello', has=pg.locator('h2', has_text='Documenti fiscali')).locator('.elenco').count() == 1, 'Riepilogo: card Documenti fiscali')
    fisc = pg.locator('.pannello', has=pg.locator('h2', has_text='Documenti fiscali'))
    ok(fisc.locator('.elenco li').count() >= 1, 'Riepilogo: righe dei documenti fiscali')
    ok('Netto' in fisc.inner_text(), 'Riepilogo: il netto è fatture − note di credito')
    pg.click('.testa-azioni button:has-text("Torna")'); pg.wait_for_selector('.dt tbody tr.cliccabile')
    ok(seg('Con variazioni').get_attribute('aria-selected') == 'true', 'Torna a Pratiche: il filtro di prima è ancora scelto')

    # ---------- 5. Documenti: elenco, schede, righe lette ----------
    pg.goto(BASE + '/documenti'); pg.wait_for_selector('.selezionabile a'); pg.wait_for_timeout(800)
    ok(testo(pg, '.testa h1') == 'Documenti', 'Documenti: pagina unica elenco + dettaglio')
    ok(pg.locator('.caricamento').count() == 1, 'Documenti: area di caricamento')
    ok(pg.locator('.selezionabile a').count() >= 10, 'Documenti: elenco dei documenti in coda')
    voce = '.selezionabile a:has-text("PROVA-%s")' % S.upper()
    pg.wait_for_selector(voce)
    ok(pg.locator(voce + ' .stato:has-text("Affidabilità bassa")').count() == 1, 'documento di prova: livello basso (rosso)')
    pg.locator(voce).first.click(); pg.wait_for_timeout(1200)
    ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'documento: due schede (azione proposta, righe lette)')
    ok('Scegli la pratica' in testo(pg, '.schede-barra') or 'Pratica proposta' in testo(pg, '.schede-barra'), 'documento: scheda dell’azione proposta')
    pg.click('.schede-barra [role=tab]:has-text("Righe lette")'); pg.wait_for_timeout(300)
    ok(pg.locator('.dt tbody tr').count() == 2, 'righe lette: due righe')
    ok('da controllare' in testo(pg, '.schede-barra [role=tab]:has-text("Righe lette")'), 'righe incerte contate nella scheda')
    pg.click('.pannello-testa button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
    ok(pg.locator('.aff-sx canvas').count() == 1, 'correzione: PDF originale a sinistra')
    ok(pg.locator('.aff-dx .incerto-errore').count() >= 1 and pg.locator('.aff-dx .incerto-attesa').count() >= 1, 'correzione: campi bordati giallo e rosso')
    pg.click('.aff-piede button:has-text("Annulla")'); pg.wait_for_timeout(300)
    ok(pg.locator('.affiancata').count() == 0, 'correzione annullata: la finestra si chiude')
    pg.screenshot(path=str(USCITA / 'app-flusso-documenti-1440.png'), full_page=True)

    # ---------- 6. Abbinamento fattura → pratica fatturata (poi si annulla) ----------
    pg.click('.schede-barra [role=tab]:has-text("Pratica proposta"), .schede-barra [role=tab]:has-text("Scegli la pratica")')
    pg.wait_for_timeout(500)
    ok(pg.locator('.schede-corpo button:has-text("Abbina a")').count() >= 1, 'abbinamento: pratiche candidate dal server')
    ok(pg.locator('.schede-corpo .scelte').count() >= 1, 'abbinamento: elenco con gli elementi in comune')
    candidato = pg.locator('.schede-corpo button:has-text("Abbina a")').first
    numero_pratica = candidato.inner_text().replace('Abbina a ', '').strip()
    candidato.click(); pg.wait_for_timeout(800)
    if pg.locator('.velo .modale-piede button:has-text("Procedi comunque")').count():
        ok('affidabilità bassa' in testo(pg, '.velo'), 'lettura bassa: l’abbinamento chiede conferma')
        pg.click('.velo .modale-piede button:has-text("Procedi comunque")')
    pg.wait_for_function("!document.querySelector('.velo') || !document.querySelector('.velo .modale')", timeout=20000)
    pg.wait_for_timeout(1500)
    pratica = next((x for x in json(pg, 'pratiche?q=' + numero_pratica)['righe'] if x['numero'] == numero_pratica), None)
    ok(pratica is not None and pratica['stato'] == 'fatturata', 'fattura abbinata a %s: la pratica è Fatturata' % numero_pratica)
    ok('Documento abbinato alla pratica' in piatto(pg.locator('body').inner_text()), 'avviso: documento abbinato alla pratica %s' % numero_pratica)
    # pulizia: si toglie la fattura di prova, la pratica torna com'era e il file in coda
    docs = json(pg, 'pratiche/%s/documenti' % pratica['id'])['documenti']
    prova = next((d for d in docs if d['numero'] == 'PROVA-' + S.upper()), None)
    ok(prova is not None, 'la fattura di prova è fra i documenti della pratica')
    pg.goto(BASE + '/pratiche/' + pratica['id']); pg.wait_for_selector('.binario'); pg.wait_for_timeout(800)
    pg.locator('.pannello', has=pg.locator('h2', has_text='Documenti fiscali')).locator('.elenco li', has_text='PROVA-' + S.upper()).first.click()
    pg.wait_for_selector('.affiancata object')
    ok(pg.locator('.affiancata object[type="application/pdf"]').count() == 1, 'pratica: PDF del documento affiancato')
    ok('PROVA-' + S.upper() in testo(pg, '.affiancata'), 'visualizzatore: il documento di prova è nella scheda')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    if prova:
        r = api(pg, 'pratiche/%s/documenti/%s' % (pratica['id'], prova['id']), 'DELETE')
        ok(r.status == 204, 'annullata la fattura di prova (%d)' % r.status)
    dopo = next((x for x in json(pg, 'pratiche?q=' + numero_pratica)['righe'] if x['numero'] == numero_pratica), None)
    ok(dopo and dopo['stato'] != 'fatturata', 'dopo l’annullamento la pratica non è più Fatturata')

    # ---------- 7. Bollettini: matrice, periodo, filtri, riconciliazione ----------
    pg.goto(BASE + '/bollettini'); pg.wait_for_selector('.matrice'); pg.wait_for_timeout(800)
    ok(testo(pg, '.testa h1') == 'Bollettini', 'Bollettini: matrice fornitore × 6 mesi')
    ok(pg.locator('.matrice .m-intest').count() == 7, 'matrice: sei mesi + intestazione fornitore')
    ok('2026' in testo(pg, '.periodo-btn'), 'bollettini: periodo con l’anno')
    pg.click('.periodo-btn'); pg.wait_for_timeout(300)
    ok(pg.locator('.pm-mesi button').count() >= 12, 'selettore dei mesi aperto')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    fb = pg.locator('.barra-periodo')
    campo = fb.locator('.ricerca.multipla .ricerca-testo').first
    campo.click(); fb.locator('.ricerca-menu li[role=option]', has_text='Gasper').first.click()
    pg.keyboard.press('Escape')
    pg.wait_for_function("() => document.querySelector('.barra-periodo .ricerca-testo')?.placeholder.includes('Gasper')")
    pg.wait_for_function("() => document.querySelectorAll('.matrice .m-riga').length === 1"); pg.wait_for_timeout(400)
    ok(pg.locator('.matrice .m-riga').count() == 1 and 'Gasper' in testo(pg, '.matrice'), 'filtro fornitore: una riga Gasper')
    ok(pg.locator('.riepilogo-filtri .btn-icona-conta').inner_text() == '1', 'bollettini: riepilogo con un filtro')
    pg.locator('.riepilogo-filtri .btn-icona').first.click(); pg.wait_for_timeout(200)
    ok('Periodo' in testo(pg, '.riepilogo-pop') and 'Gasper' in testo(pg, '.riepilogo-pop'), 'riepilogo: periodo e fornitore')
    pg.click('.riepilogo-pop >> text=Togli tutti i filtri')
    pg.wait_for_function("() => document.querySelectorAll('.matrice .m-riga').length === 11")
    ok(pg.locator('.matrice .m-riga').count() == 11, 'tolti i filtri: undici fornitori in matrice')

    # bollettino da riconciliare: il primo ancora «arrivato» (di norma Gasper agosto)
    celle = json(pg, 'bollettini?al=2026-09')['fornitori']
    da_fare = [(f['fornitore'], c) for f in celle for c in f['celle'] if c['stato'] == 'arrivato' and c['bollettino_id']]
    id_bol = da_fare[0][1]['bollettino_id'] if da_fare else '6'
    pg.goto(BASE + '/bollettini/' + str(id_bol)); pg.wait_for_selector('.cerniera'); pg.wait_for_timeout(700)
    ok(testo(pg, '.testa .stato') in ('Da verificare', 'Pronto da chiudere', 'Verificato'), 'bollettino: testata con lo stato')
    ok(pg.locator('.cerniera-riepilogo .lato b').count() == 2, 'cerniera: i due lati (loro / noi)')
    ok(pg.locator('.cerniera-riepilogo .cucitura b').count() == 1, 'cerniera: la cucitura (differenza)')
    if id_bol == '6':
        ok(numero(testo(pg, '.cerniera-riepilogo .lato b')) == 394.8 and numero(testo(pg, '.cerniera-riepilogo .lato.destro b')) == 3349.38
           and numero(testo(pg, '.cerniera-riepilogo .cucitura b')) == -2954.58, 'Gasper agosto: 394,80 / 3.349,38 / -2.954,58')
        ok(pg.locator('object[type="application/pdf"]').count() == 0 and 'nessun file allegato' in testo(pg, '.testa'), 'senza PDF: la pagina lo dice')
    ok(pg.locator('.c-gruppo').count() >= 2, 'bollettino: gruppi Da decidere / Decise / Quadrano / Incassi')
    if testo(pg, '.testa .stato') != 'Verificato':
        ok('Segna come verificato' in testo(pg, '.barra-decisione'), 'azione proposta: Segna come verificato')
        # decide le righe aperte (mancante → Attendi il prossimo; differenza → Accetta)
        for _ in range(6):
            mancante = pg.locator('.c-riga').filter(has=pg.locator('button:has-text("Attendi il prossimo")'))
            accetta = pg.locator('.c-riga').filter(has=pg.locator('button:has-text("Accetta il loro importo")'))
            if mancante.count():
                mancante.first.locator('button', has_text='Attendi il prossimo').first.click()
            elif accetta.count():
                accetta.first.locator('button', has_text='Accetta il loro importo').first.click()
            else:
                break
            pg.wait_for_selector('.velo .modale-piede button:has-text("Conferma")')
            pg.click('.velo .modale-piede button:has-text("Conferma")')
            pg.wait_for_function("!document.querySelector('.velo')"); pg.wait_for_timeout(500)
        ok(pg.locator('.barra-decisione button:has-text("Segna come verificato")').first.is_enabled(), 'decise le righe: la verifica è attiva')
        pg.click('.barra-decisione button:has-text("Segna come verificato")')
        pg.wait_for_selector('.velo .modale-piede button:has-text("Segna come verificato")')
        ok('mese diventa chiuso' in testo(pg, '.velo'), 'la conferma dice che il mese diventa chiuso')
        pg.click('.velo .modale-piede button:has-text("Segna come verificato")')
        pg.wait_for_function("document.querySelector('.testa .stato')?.innerText === 'Verificato'")
        ok(True, 'bollettino chiuso: Verificato')
    ok(pg.locator('.barra-decisione button').count() == 0 or 'Verificato' in testo(pg, '.testa .stato'), 'verificato: pagina in sola lettura')
    pg.screenshot(path=str(USCITA / 'app-flusso-bollettino-1440.png'), full_page=True)
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '768 px: bollettino senza scorrimento di lato')
    ok(not pg.locator('.c-intest').first.is_visible(), '768 px: le intestazioni delle colonne spariscono')
    ok('riconosce' in pg.eval_on_selector('.c-riga .c-sx', "e => getComputedStyle(e, '::before').content"), '768 px: ogni valore porta la sua etichetta')
    pg.screenshot(path=str(USCITA / 'app-flusso-bollettino-768.png'), full_page=True)
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(400)

    # ---------- 8. Storno D-11: voce negativa nella liquidazione successiva ----------
    def storno_in(anno, tri):
        d = json(pg, 'liquidazioni?anno=%d&trimestre=%d' % (anno, tri))
        return [x for x in d['documenti'] if x['numero'] == 'F-2026-0822']
    candidati = [(2026, 3), (2026, 4)]
    qs = [(a, t, storno_in(a, t)) for a, t in candidati]
    qs = [(a, t, v) for a, t, v in qs if v]
    ok(bool(qs), 'storno F-2026-0822 presente in una liquidazione (Q3 o Q4)')
    if qs:
        a, t, vo = qs[0]
        ok(vo[0]['voce'] == 'storno' and vo[0]['provvigione'] < 0,
           'storno come voce negativa nel %d° trimestre: %.2f €' % (t, vo[0]['provvigione']))
        ok([x['voce'] for x in json(pg, 'liquidazioni?anno=2026&trimestre=%d' % t)['documenti']].count('storno') >= 1,
           'la liquidazione conta la voce di storno fra i documenti')
        pg.goto(BASE + '/liquidazioni/2026/%d' % t); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
        ok(pg.locator('.colonne', has_text='F-2026-0822').count() >= 1, 'liquidazione: la pagina mostra la riga di storno')
        ok('Storno' in piatto(pg.locator('.colonne').inner_text()), 'liquidazione: etichetta «Storno»')

    # ---------- 9. Liquidazioni: trimestri, subagenti, report, esportazioni ----------
    pg.goto(BASE + '/liquidazioni/2026/3'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    ok(testo(pg, '.testa h1') == 'Liquidazioni', 'Liquidazioni: titolo della pagina')
    ok(pg.locator('.periodi a').count() == 4, 'quattro riquadri dei trimestri')
    ok(pg.locator('.periodi a').nth(0).inner_text().startswith('1° trimestre') and pg.locator('.periodi a').nth(3).inner_text().startswith('4° trimestre'),
       'trimestri in ordine, dal 1° al 4°')
    ok(pg.locator('.periodi a.attivo').get_attribute('aria-current') == 'page', 'il 3° trimestre è quello attivo')
    pg.goto(BASE + '/liquidazioni/2026/2'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    ok('Liquidata il 10/07/2026' in testo(pg, '.periodi a.attivo'), '2° trimestre: chiuso, si legge dalla fotografia')
    ok(pg.locator('.testa-azioni button:has-text("Liquidazione chiusa")').is_disabled(), '2° trimestre: niente riapertura')
    pg.goto(BASE + '/liquidazioni/2026/3'); pg.wait_for_selector('.periodi a.attivo'); quieta(pg)
    ok(pg.locator('.colonne .pannello').count() >= 2, 'due colonne: subagenti e documenti')
    sub = pg.locator('.colonne .pannello').first.locator('.dt tbody tr')
    ok(sub.count() == 4, 'subagenti con documenti: 4 righe')
    if q3['stato']['chiave'] == 'da_liquidare':
        atteso = json(pg, 'liquidazioni?anno=2026&trimestre=3')['riepilogo']['provvigione']
        ok(abs(numero(testo(pg, '.colonne > .pannello tfoot td.dx')) - atteso) < 0.01, 'totale da liquidare Q3 = server: %.2f €' % atteso)
    ok(pg.locator('.colonne .pannello').nth(1).locator('.schede-barra [role=tab]').count() == 2, 'schede Documenti e Report subagenti')
    schede_dx = pg.locator('.colonne .pannello').nth(1).locator('.schede-barra [role=tab]')
    documenti = lambda: pg.locator('.colonne .pannello').nth(1).locator('.schede-corpo .dt tbody tr')
    ok(documenti().count() == 10, 'documenti del trimestre: 10 righe')
    ok(schede_dx.first.inner_text().startswith('Documenti'), 'prima scheda: Documenti')
    schede_dx.nth(1).click()
    pg.locator('.colonne .pannello').nth(1).locator('.report-sub canvas').wait_for(timeout=20000)
    ok(pg.locator('.report-sub canvas').count() == 1, 'Report subagenti: grafico delle provvigioni')
    ok(pg.locator('.report-sub .dt tbody tr').count() == 4, 'Report subagenti: una riga per subagente')
    ok('Sul 2° trim.' in testo(pg, '.report-sub .dt thead'), 'Report subagenti: variazione sul trimestre prima')
    ok(pg.locator('.report-sub a', has_text='Analisi completa').count() == 1, 'Report subagenti: link ad Analisi completa')
    schede_dx.first.click(); pg.wait_for_timeout(500)
    marco = pg.locator('.colonne .pannello').first.locator('.dt tbody tr', has_text='Marco Nista').first
    marco.click(); quieta(pg)
    ok('selezionata' in (marco.get_attribute('class') or '') and documenti().count() == 2, 'clic su Marco Nista: solo i suoi documenti')
    marco.click(); quieta(pg)
    ok(documenti().count() == 10, 'di nuovo sul subagente: tornano tutti')

    def esporta(contenuto, formato='xlsx', sub=None):
        pg.click('.testa-azioni button:has-text("Esporta")'); pg.wait_for_selector('.velo .scelte-esporta')
        pg.locator('.velo .scelta-esporta input[value="%s"]' % contenuto).check()
        if sub: pg.select_option('.velo #esporta-sub', label=sub)
        if formato != 'xlsx': pg.locator('.velo .formato-esporta [role=radio]', has_text=formato.upper()).click()
        with pg.expect_download(timeout=180000) as attesa: pg.click('.velo .modale-piede button:has-text("Scarica")')
        return attesa.value
    pg.click('.testa-azioni button:has-text("Esporta")'); pg.wait_for_selector('.velo .scelte-esporta')
    ok(pg.locator('.velo .scelta-esporta').count() == 3 and pg.locator('.velo .formato-esporta [role=radio]').count() == 3, 'finestra Esporta: tre contenuti e tre formati')
    ok(pg.locator('.velo input[value=completa]').is_checked() and pg.locator('.velo .formato-esporta [role=radio]', has_text='Excel').get_attribute('aria-selected') == 'true', 'predefinito: tutto il trimestre in Excel')
    pg.keyboard.press('Escape'); pg.wait_for_function("!document.querySelector('.velo')")
    xlsx = esporta('completa')
    ok(xlsx.suggested_filename == 'Liquidazione_2026_T3_completa.xlsx' and pathlib.Path(xlsx.path()).stat().st_size > 1000, 'Excel completo scaricato: %s' % xlsx.suggested_filename)
    import zipfile
    with zipfile.ZipFile(xlsx.path()) as z: fogli = z.read('xl/workbook.xml').decode('utf-8')
    ok('name="Riepilogo"' in fogli and 'name="Marco Nista"' in fogli, 'Excel completo: foglio Riepilogo e un foglio per subagente')
    csv = esporta('riepilogo', 'csv')
    righe_csv = [r for r in pathlib.Path(csv.path()).read_text(encoding='utf-8-sig').strip().splitlines() if r]
    ok(csv.suggested_filename == 'Liquidazione_2026_T3_riepilogo.csv' and righe_csv[0].startswith('Subagente;Documenti;Imponibile;Provvigione da liquidare'), 'CSV del riepilogo: intestazione')
    ok(len(righe_csv) == 5, 'CSV del riepilogo: 4 subagenti')
    pdf = esporta('subagente', 'pdf', 'Marco Nista')
    ok(pdf.suggested_filename == 'Liquidazione_2026_T3_Marco_Nista.pdf' and pathlib.Path(pdf.path()).read_bytes()[:5] == b'%PDF-', 'PDF di un subagente scaricato')
    ok(pg.locator('.velo').count() == 0, 'finestra di esportazione chiusa')

    # ---------- 10. Analisi: numeri, grafici, filtri, esportazione ----------
    pg.goto(BASE + '/analisi?dal=2025-10&al=2026-09'); pg.wait_for_selector('.kpi .kpi-valore'); quieta(pg)
    ok(testo(pg, '.testa h1') == 'Analisi', 'Analisi: titolo della pagina')
    ok(len(pg.locator('.kpi .kpi-valore').all_inner_texts()) == 4, 'Analisi: quattro numeri')
    ok(pg.locator('.griglia-bi canvas').count() == 4, 'Analisi: quattro grafici')
    ok(pg.locator('.pannello-bi .segmenti [role=tab]').count() == 5, 'Analisi: cinque raggruppamenti')
    ok(pg.locator('.pannello-bi .dt tbody tr').count() == 4, 'Analisi: tabella per subagente con 4 righe')
    ok(pg.locator('.pannello-bi .segmenti [role=tab]').all_inner_texts()[:3] == ['Per subagente', 'Per fornitore', 'Per cliente'], 'Analisi: raggruppamenti della tabella')
    ok('+333%' in testo(pg, '.kpi-riga'), 'Analisi: confronto con il periodo precedente (+333%)')
    ok(numero(testo(pg, '.kpi .kpi-valore')) == 79534.06, 'Analisi: fatturato del periodo 79.534,06 €')
    ok('ott 2025' in testo(pg, '.periodo-btn') and 'set 2026' in testo(pg, '.periodo-btn'), 'Analisi: periodo fisso del seed')
    pg.click('.periodo-btn'); pg.wait_for_timeout(200)
    ok(pg.locator('.periodo-pop .pm-mesi button').count() >= 12, 'Analisi: selettore dei mesi aperto')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.locator('.barra-analisi .filtro-ricerca .ricerca-testo').nth(0).click()
    pg.locator('.barra-analisi .ricerca-menu li[role=option]', has_text='Gries').first.click()
    pg.locator('.barra-analisi .ricerca-menu li[role=option]', has_text='Gasper').first.click()
    pg.keyboard.press('Escape')
    pg.wait_for_function("() => document.querySelectorAll('.barra-analisi .filtro-ricerca .ricerca-testo')[0].placeholder === 'Filtro multiplo (2)'"); quieta(pg)
    ok(pg.locator('.barra-analisi .filtro-ricerca .ricerca-testo').nth(0).get_attribute('placeholder') == 'Filtro multiplo (2)', 'Analisi: filtro multiplo (2 fornitori)')
    pg.wait_for_selector('.riepilogo-filtri .btn-icona-conta')
    ok(pg.locator('.riepilogo-filtri .btn-icona-conta').inner_text() == '2', 'Analisi: riepilogo con due filtri (periodo e fornitore)')
    pg.locator('.riepilogo-filtri .btn-icona').first.click(); pg.wait_for_timeout(200)
    ok('Gries' in testo(pg, '.riepilogo-pop') and 'Gasper' in testo(pg, '.riepilogo-pop') and 'ottobre 2025' in testo(pg, '.riepilogo-pop'), 'Analisi: riepilogo periodo e fornitori')
    pg.keyboard.press('Escape'); pg.locator('.riepilogo-filtri .btn-icona').nth(1).click(); quieta(pg)
    pg.click('.testa-azioni button:has-text("Esporta")'); pg.wait_for_selector('.velo .formato-esporta')
    with pg.expect_download(timeout=180000) as attesa: pg.click('.velo .modale-piede button:has-text("Scarica")')
    ax = attesa.value
    ok(ax.suggested_filename == 'Analisi_2025-10_2026-09.xlsx' and pathlib.Path(ax.path()).stat().st_size > 1000, 'Analisi: Excel scaricato')
    ok(pg.locator('.velo').count() == 0, 'Analisi: finestra di esportazione chiusa')
    pg.set_viewport_size({'width': 768, 'height': 1024}); pg.wait_for_timeout(600)
    ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '768 px: Analisi senza scorrimento orizzontale')
    pg.screenshot(path=str(USCITA / 'app-flusso-analisi-768.png'), full_page=True)
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(400)

    # ---------- 11. Aggiornamenti dal server fra due schede ----------
    pgA = entra(percorso='/pratiche')
    pgB = entra(percorso='/pratiche')
    segA = pgA.locator('.segmenti [role=tab]:has-text("Attesa fattura")')
    segA.click(); pgA.wait_for_function("() => !document.querySelector('.dt[aria-busy=true]')"); pgA.wait_for_timeout(800)
    conta = int(segA.locator('.n').inner_text())
    righe_prima = pgA.locator('.dt tbody tr.cliccabile').count()
    elenco = json(pgA, 'pratiche?stato=confermata&ordina=stato&dir=asc&pagina=0')['righe']
    numero_riga = pgA.locator('.dt tbody tr.cliccabile b').first.inner_text()
    pratica = next((x for x in elenco if x['numero'] == numero_riga), elenco[0])
    ok(conta > 0 and righe_prima > 0, 'scheda A: filtro Attesa fattura con %d pratiche' % conta)
    numero_ev = 'EV-' + S.upper() + '-' + str(int(time.time() * 1000) % 100000)
    pgB.goto(BASE + '/pratiche/' + pratica['id']); pgB.wait_for_selector('.schede-barra')
    pgB.click('button:has-text("Registra fattura")'); pgB.wait_for_selector('.velo #c-numero')
    pgB.fill('.velo #c-numero', numero_ev); pgB.fill('.velo #c-importo', '100')
    pgB.click('.velo .modale-piede button:has-text("Registra")')
    pgB.wait_for_function("!document.querySelector('.velo')", timeout=20000); pgB.wait_for_selector('.avviso', timeout=10000)
    ok('Fattura registrata' in piatto(pgB.locator('.avviso').inner_text()), 'scheda B: fattura %s registrata' % numero_ev)
    pgA.wait_for_selector('.aggiornamenti', timeout=15000)
    ok('Ci sono aggiornamenti' in piatto(pgA.locator('.aggiornamenti').inner_text()) and 'Aggiorna' in piatto(pgA.locator('.aggiornamenti').inner_text()), 'scheda A: barra «Ci sono aggiornamenti · Aggiorna»')
    ok(not segA.locator('.n').inner_text().strip() == str(conta), 'scheda A: il contatore del segmento cambia da solo')
    ok(pgA.locator('.dt tbody tr.cliccabile').count() == righe_prima and pratica['numero'] in pgA.locator('.dt tbody tr').first.inner_text(), 'scheda A: le righe restano ferme finché non si clicca Aggiorna')
    pgA.click('.aggiornamenti button:has-text("Aggiorna")')
    pgA.wait_for_function("!document.querySelector('.aggiornamenti')"); pgA.wait_for_timeout(1000); quieta(pgA)
    ok(segA.get_attribute('aria-selected') == 'true', 'dopo Aggiorna il filtro è ancora quello')
    ok(pgA.locator('.dt tbody tr', has_text=pratica['numero']).count() == 0, 'dopo Aggiorna la pratica fatturata esce dall’elenco')
    # pulizia: si annulla la fattura di prova
    r = api(pgB, 'pratiche/%s/documenti' % pratica['id'])
    docs = r.json()['documenti']
    ev = next((d for d in docs if d['numero'] == numero_ev), None)
    if ev: api(pgB, 'pratiche/%s/documenti/%s' % (pratica['id'], ev['id']), 'DELETE')
    pgA.wait_for_selector('.aggiornamenti', timeout=15000)
    pgA.click('.aggiornamenti button:has-text("Aggiorna")'); pgA.wait_for_timeout(1000); quieta(pgA)
    ok(pgA.locator('.dt tbody tr', has_text=pratica['numero']).count() == 1, 'dopo la pulizia la pratica torna in elenco con Aggiorna')
    pgA.screenshot(path=str(USCITA / 'app-flusso-aggiornamenti-1440.png'))
    pgA.close(); pgB.close()

    # ---------- 12. Anagrafiche ----------
    pg.goto(BASE + '/fornitori'); pg.wait_for_selector('.dt tbody tr'); quieta(pg)
    ok(testo(pg, '.testa h1') == 'Fornitori', 'Fornitori: elenco')
    ok(pg.locator('.dt tbody tr.cliccabile').count() == 11, 'Fornitori: undici righe dal seed')
    pg.fill('.filtri input[type=search]', 'Gries')
    pg.wait_for_function("() => document.querySelectorAll('.dt tbody tr.cliccabile').length === 1"); quieta(pg)
    ok(pg.locator('.dt tbody tr.cliccabile').count() == 1 and 'Gries' in testo(pg, '.dt tbody'), 'Fornitori: ricerca Gries')
    pg.locator('.dt tbody tr.cliccabile').first.click()
    pg.wait_for_function("() => document.querySelector('.principale')?.textContent.includes('F00031')")
    ok('F00031' in testo(pg, '.principale') and 'sola lettura' in testo(pg, '.testa'), 'Fornitore: codice Integra e nota di sola lettura')
    ok(pg.locator('.schede-barra [role=tab]').count() >= 2, 'Fornitore: schede (percentuali, clienti seguiti)')
    ok('Percentuali' in testo(pg, '.schede-barra') and 'Clienti seguiti' in testo(pg, '.schede-barra'), 'Fornitore: nomi delle schede')
    pg.goto(BASE + '/subagenti'); pg.wait_for_selector('.dt tbody tr'); quieta(pg)
    ok(pg.locator('.dt tbody tr.cliccabile').count() == 4 and 'Nista' in testo(pg, '.dt tbody'), 'Subagenti: quattro righe del seed')
    ok(pg.locator('.segmenti [role=tab]').count() == 3, 'Subagenti: segmenti Attivi, Disattivati, Tutti')
    pg.goto(BASE + '/clienti'); pg.wait_for_selector('.dt tbody tr.cliccabile'); quieta(pg)
    ok(pg.locator('.dt tbody tr.cliccabile').count() == 11, 'Clienti: undici righe dal seed')
    ok(pg.locator('.segmenti [role=tab]').count() == 3, 'Clienti: segmenti Tutti, Con agenzie, Senza agenzie')
    pg.fill('.filtri input[type=search]', 'Vivaio'); pg.wait_for_timeout(800); quieta(pg)
    ok('Vivaio Verde Azzurro' in testo(pg, '.dt tbody'), 'Clienti: ricerca per nome')
    pg.locator('.dt tbody tr.cliccabile').first.click()
    pg.wait_for_function("() => document.querySelector('.principale')?.textContent.includes('C00412')")
    ok('C00412' in testo(pg, '.principale'), 'Cliente: codice Integra C00412')
    ok(pg.locator('.schede-barra [role=tab]').count() >= 2, 'Cliente: schede Agenzie e Pratiche')
    ok('Agenzie' in testo(pg, '.schede-barra') and 'Pratiche' in testo(pg, '.schede-barra'), 'Cliente: nomi delle schede')

    # ---------- 13. Gestione: utenti, sistema, impostazioni, registro, scartati, guida ----------
    pg.goto(BASE + '/utenti'); pg.wait_for_selector('.dt tbody tr'); quieta(pg)
    ok('Utenti' in testo(pg, '.testa h1'), 'Utenti: elenco e tabella dei ruoli')
    ok(pg.locator('.dt tbody tr').count() >= 4, 'Utenti: utenti dal seed')
    pg.locator('.dt tbody tr').first.click(); pg.wait_for_timeout(600)
    ok(pg.locator('.schede-barra [role=tab]').count() == 2, 'Scheda utente: due schede (dati, permessi)')
    pg.goto(BASE + '/sistema'); pg.wait_for_selector('.kpi'); pg.wait_for_timeout(600)
    ok(testo(pg, '.testa h1') == 'Stato del sistema', 'Stato del sistema: titolo')
    ok(pg.locator('.kpi').count() == 4, 'Stato del sistema: quattro servizi')
    pg.goto(BASE + '/impostazioni'); pg.wait_for_selector('.selezionabile a'); pg.wait_for_timeout(600)
    ok(pg.locator('.selezionabile a').count() == 6, 'Impostazioni: sei sezioni')
    ok('Server di lettura' in testo(pg, '.selezionabile') and 'Conservazione' in testo(pg, '.selezionabile'), 'Impostazioni: lettura e conservazione')
    pg.goto(BASE + '/sistema'); pg.wait_for_selector('.kpi'); pg.wait_for_timeout(600)
    ok(pg.locator('.colonne .pannello').count() == 2 and pg.locator('.colonne .pannello').first.locator('.dt tbody tr').count() >= 1,
       'Stato del sistema: problemi e giri dei servizi')
    pg.goto(BASE + '/registro'); pg.wait_for_selector('.dt tbody tr'); quieta(pg)
    pg.wait_for_function("() => document.querySelectorAll('.dt tbody tr').length === 25")
    ok(pg.locator('.segmenti [role=tab]').count() == 3, 'Registro: tre segmenti (Tutto, Anomalie aperte, Errori)')
    ok(pg.locator('.dt tbody tr').count() == 25, 'Registro: 25 righe per pagina')
    ok(pg.locator('.testa-azioni button:has-text("Esporta")').count() == 1, 'Registro: pulsante Esporta CSV')
    pg.goto(BASE + '/scartati'); pg.wait_for_selector('.dt'); pg.wait_for_timeout(600)
    ok(testo(pg, '.testa h1') == 'Documenti scartati', 'Scartati: elenco dei documenti scartati')
    pg.goto(BASE + '/guida'); pg.wait_for_selector('.selezionabile a'); pg.wait_for_timeout(600)
    ok(pg.locator('.selezionabile a').count() == 18, 'Guida: 18 argomenti (senza Vendita diretta, con Registro)')
    ok('Come funziona il CRM' in testo(pg, '.selezionabile'), 'Guida: primo argomento «Come funziona il CRM»')
    ok(pg.locator('.filtri input[type=search]').count() == 1, 'Guida: ricerca in tutto il testo')

    # ---------- 14. Sola lettura e 768 px ----------
    pg.close()
    pg = entra(S + '-lett', '/')
    pg.wait_for_function("() => document.body.classList.contains('sola-lettura')")
    ok(pg.evaluate("document.body.classList.contains('sola-lettura')"), 'lettura: fascia «Profilo in sola lettura»')
    ok(pg.locator('#carica-barra').count() == 0 or not pg.locator('#carica-barra').is_visible(), 'lettura: Carica documenti nascosto')
    pg.goto(BASE + '/utenti'); pg.wait_for_selector('.vuoto')
    ok('Pagina riservata' in testo(pg, '.vuoto'), 'lettura: pagina riservata')
    pg.close()

    pg = b.new_page(viewport={'width': 768, 'height': 1024})
    pg.on('pageerror', lambda e: errori.append(str(e)))
    pg.goto(BASE + '/pratiche'); pg.wait_for_function("location.pathname === '/accesso'")
    apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.wait_for_timeout(500); pg.click('button.btn.largo')
    pg.wait_for_function("location.pathname === '/pratiche'", timeout=60000); pg.wait_for_selector('.dt tbody tr'); pg.wait_for_timeout(800)
    for percorso in ('/pratiche', '/documenti', '/bollettini', '/liquidazioni/2026/3', '/analisi'):
        pg.goto(BASE + percorso); pg.wait_for_timeout(1200)
        ok(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), '768 px: %s senza scorrimento orizzontale' % percorso)
    pg.goto(BASE + '/pratiche'); pg.wait_for_timeout(800)
    pg.screenshot(path=str(USCITA / 'app-flusso-pratiche-768.png'), full_page=True)
    pg.goto(BASE + '/documenti'); pg.wait_for_timeout(1000)
    pg.screenshot(path=str(USCITA / 'app-flusso-documenti-768.png'), full_page=True)
    pg.close()
    b.close()
finally:
    prova_documento('togli')

ok(not errori, 'nessun errore JavaScript in tutta la prova')
print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
sys.exit(1 if any(e.startswith('KO') for e in esiti) else 0)
