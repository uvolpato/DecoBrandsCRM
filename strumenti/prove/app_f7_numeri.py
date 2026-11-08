# Numeri del seed visti dall'app (criterio 6): legge le risposte del server con la sessione del browser.
# Uso: python strumenti/prove/app_f7_numeri.py <suffisso> [base]
import json, sys
from playwright.sync_api import sync_playwright

S = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8001'
PW = 'password-di-prova'
def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.goto(BASE + '/'); pg.wait_for_function("location.pathname === '/accesso'")
    apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
    pg.wait_for_selector('.testa h1')
    def get(u):
        return pg.evaluate("async u => (await (await fetch('/api/' + u)).json())", u)
    oggi = get('oggi')
    print('CONTEGGI', json.dumps(get('oggi/conteggi')))
    print('OGGI riquadri', json.dumps([(r['etichetta'], r['valore']) for r in oggi['riquadri']], ensure_ascii=False))
    print('OGGI gruppi', json.dumps([(g['titolo'], g['conta'], g.get('disponibile')) for g in oggi['gruppi']], ensure_ascii=False))
    print('OGGI sottotitolo', oggi['sottotitolo'])
    print('OGGI trimestre', json.dumps(oggi['trimestre'], ensure_ascii=False))
    pr = get('pratiche?pagina=0')
    print('PRATICHE totale', pr['totale'], 'conteggi', json.dumps(pr['conteggi']), 'totali', json.dumps(pr['totali']))
    bol = get('bollettini')
    print('BOLLETTINI colonne', json.dumps(bol.get('colonne'), ensure_ascii=False), 'fornitori', len(bol.get('fornitori', [])), 'conteggi', json.dumps(bol.get('conteggi')))
    for n in (2, 3):
        l = get('liquidazioni?anno=2026&trimestre=%d' % n)
        print('LIQUIDAZIONE T%d' % n, json.dumps({'stato': l['stato']['chiave'], 'riepilogo': l.get('riepilogo'), 'trimestri': [(t['trimestre'], t['totale'], t['chiave']) for t in l.get('trimestri', [])], 'subagenti': [(s['nome'], s['provvigione']) for s in l.get('subagenti', [])]}, ensure_ascii=False))
    ana = get('analisi?dal=2025-10&al=2026-09')
    print('ANALISI', json.dumps(ana['numeri'], ensure_ascii=False))
    reg = get('registro?pagina=0')
    print('REGISTRO totale', reg.get('totale'), 'conteggi', json.dumps(reg.get('conteggi')))
    b.close()
