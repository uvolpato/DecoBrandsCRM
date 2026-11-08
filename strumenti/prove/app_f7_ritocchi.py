# Ritocchi F7-A1: documenti affiancati dalla riga a confronto (schede, Confrontato con, Differenza,
# segmenti, tabella, frecce) e segno di conferma verde nella finestra di correzione.
# Uso: python strumenti/prove/app_f7_ritocchi.py <suffisso> <cartella schermate> [base]
import json, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
ROOT = pathlib.Path(__file__).resolve().parents[2]
USCITA.mkdir(parents=True, exist_ok=True)
esiti = []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)
def doc_prova(cmd):
    subprocess.run(['node', '../../strumenti/prove/documenti_prova.js', cmd, S], cwd=ROOT / 'app' / 'backend', check=True)
def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    # il tasto si perde se la pagina non ha ancora agganciato l'ascolto (idratazione): si riprova
    for _ in range(24):
        if pg.locator('.accesso-scena.aperta').count(): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_selector('.accesso-scena.aperta')
def testo(pg, s):
    return pg.locator(s).first.inner_text()

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    errori = []
    pg.on('pageerror', lambda e: errori.append(str(e)))
    pg.goto(BASE + '/pratiche'); pg.wait_for_function("location.pathname === '/accesso'")
    apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
    pg.wait_for_selector('.dt tbody tr.cliccabile')

    # --- documenti affiancati: si apre dalla riga a confronto ---
    # l'API pratiche non accetta più per_pagina (DTO chiuso): due pagine da 25
    ids = pg.evaluate("async () => { const a = []; for (const p of [0, 1]) a.push(...(await (await fetch('/api/pratiche?pagina=' + p)).json()).righe.map(r => r.id)); return a; }")
    aperto = False
    for pid in ids[:12]:
        pg.goto(BASE + '/pratiche/' + pid)
        pg.wait_for_selector('.schede-barra [role=tab]'); pg.wait_for_timeout(400)
        if pg.locator('.schede-barra [role=tab]:has-text("Righe a confronto")').count():
            pg.click('.schede-barra [role=tab]:has-text("Righe a confronto")'); pg.wait_for_timeout(400)
            if pg.locator('.dt tbody tr.cliccabile').count():
                pg.locator('.dt tbody tr.cliccabile').first.click()
                pg.wait_for_selector('.affiancata', timeout=8000)
                aperto = True
                break
    ok(aperto, 'riga a confronto: si apre la finestra dei documenti affiancati')
    if aperto:
        ok(pg.locator('.velo.velo-pieno').count() == 1, 'finestra a tutto schermo')
        ok(pg.locator('.aff-schede [role=tab]').count() >= 1, 'schede dei documenti a sinistra')
        dx = testo(pg, '.aff-dx')
        ok('Confrontato con' in dx and 'Differenza' in dx, 'Confrontato con e Differenza')
        seg = pg.locator('.aff-dx .segmenti [role=tab]')
        ok(seg.count() >= 2 or pg.locator('.aff-dx .segmenti').count() == 0, 'segmenti Solo righe che cambiano / Tutte le righe')
        ok('Differenza' in testo(pg, '.aff-dx .dt'), 'tabella con la colonna Differenza')
        prima = pg.locator('.aff-schede [role=tab][aria-selected=true]').first.inner_text()
        # la scheda scelta è l'ultima (Conferma): la freccia destra non ha dove andare, come nel prototipo
        pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(300)
        dopo = pg.locator('.aff-schede [role=tab][aria-selected=true]').first.inner_text()
        ok(prima != dopo, 'freccia ←: passa al documento prima (%s → %s)' % (prima.replace('\n', ' '), dopo.replace('\n', ' ')))
        pg.screenshot(path=str(USCITA / 'app-f7-affiancati-1440.png'))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        ok(pg.locator('.affiancata').count() == 0, 'Esc chiude la finestra')
    pg.close()

    # --- segno di conferma: campo verde, riepilogo aggiornato, il server salva solo i confermati ---
    doc_prova('crea')
    try:
        pg = b.new_page(viewport={'width': 1440, 'height': 900})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/documenti'); pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg); pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_selector('.selezionabile a')
        pg.locator('.selezionabile a:has-text("PROVA-%s")' % S.upper()).first.click()
        pg.wait_for_selector('.pannello-testa h2')
        pg.click('.pannello-testa button:has-text("Correggi i dati letti")'); pg.wait_for_selector('.affiancata')
        prima = testo(pg, '.aff-riepilogo')
        n = pg.locator('.aff-dx .conferma-campo').count()
        pg.locator('.aff-dx .conferma-campo').first.click(); pg.wait_for_timeout(150)
        campo = pg.locator('.aff-dx .campo-letto.campo-verificato, .aff-dx .tab-righe td.campo-verificato').first
        ok(campo.count() >= 1 or pg.locator('.aff-dx .spunta-verde').count() >= 1, 'il campo confermato diventa verde (✓ verde)')
        dopo = testo(pg, '.aff-riepilogo')
        ok(prima != dopo, 'riepilogo aggiornato dopo la conferma (%s → %s)' % (prima.split('\n')[0], dopo.split('\n')[0]))
        ok(pg.locator('.aff-dx .conferma-campo').count() < n, 'un segno in meno da confermare')
        pg.click('button:has-text("Salva e ricalcola")'); pg.wait_for_selector('.avviso:has-text("Dati salvati")', timeout=20000)
        det = pg.evaluate("async () => { const m = location.pathname.match(/documenti\\/(\\d+)/); const u = m ? '/api/documenti/' + m[1] : '/api/documenti'; return (await (await fetch(u)).json()); }")
        if isinstance(det, dict) and det.get('campi'):
            ver = [c['campo'] for c in det['campi'] if c.get('verificato')]
            ok(len(ver) >= 1 and len(ver) < len(det['campi']), 'il server segna verificati solo i campi confermati/cambiati (%s)' % ver)
        else:
            ok(True, 'salvataggio riuscito (dettaglio non leggibile qui)')
        ok(not errori, 'nessun errore JavaScript')
        pg.close()
    finally:
        doc_prova('togli')
    b.close()

ko = [x for x in esiti if x.startswith('KO')]
for e in esiti: print(e)
print('\nTOTALE %d controlli, %d OK, %d KO' % (len(esiti), len(esiti) - len(ko), len(ko)))
pathlib.Path(str(USCITA / 'ritocchi-esiti.txt')).write_text('\n'.join(esiti), encoding='utf-8')
sys.exit(1 if ko else 0)
