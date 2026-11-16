# Prova del pacchetto barra-filtri-lampeggio: dopo il primo assestamento, la barra dei filtri non
# deve più passare da segmenti a tendina e indietro (0 cambi in 2 s). Si prova su Utenti e Pratiche
# a 1440, 1100 e 768 px. Servono backend (8002) e frontend (8001) accesi e gli utenti di prova di
# app_guscio.sql (<s>-ammi con la password PW).
# Uso: python strumenti/prove/app_filtri_lampeggio.py <suffisso> <cartella schermate>
import sys, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8001'
PW = 'password-di-prova'
esiti, errori = [], []
def ok(c, t): esiti.append(('OK ' if c else 'KO ') + t)

# stato della barra: 'segmenti' se i segmenti sono visibili, 'tendina' se è la tendina, None se la
# pagina non ha una FilterBar con segmenti
STATO = """() => {
  const f = document.querySelector('.filtri');
  if (!f) return null;
  const seg = Array.from(f.querySelectorAll('.segmenti'));
  const vis = seg.length > 0;
  const sel = !!f.querySelector('.segmenti-select');
  if (vis && !sel) return 'segmenti';
  if (sel && !vis) return 'tendina';
  return null;
}"""

# i segmenti (o la tendina) stanno sulla stessa riga della ricerca libera: mai a capo (Soggetti 15/11/2026)
UNARIGA = """() => {
  const f = document.querySelector('.filtri');
  if (!f) return null;
  const c = f.querySelector('.cerca');
  if (!c) return null;
  const seg = f.querySelector('.segmenti') || f.querySelector('.segmenti-select');
  if (!seg) return null;
  return Math.abs(c.getBoundingClientRect().top - seg.getBoundingClientRect().top) < 5 ? 'una-riga' : 'a-capo';
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    def entra(pagina, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900 if larghezza > 500 else 844})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/' + pagina); pg.wait_for_function("location.pathname === '/accesso'")
        for _ in range(24):
            if pg.locator('.accesso-scena.aperta').count(): break
            pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
        pg.wait_for_selector('.accesso-scena.aperta')
        pg.fill('#c-utente', S + '-ammi'); pg.fill('#c-password', PW); pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/" + pagina + "'")
        pg.wait_for_load_state('networkidle')
        pg.wait_for_selector('.avvio-gira', state='detached'); pg.wait_for_selector('.principale h1')
        return pg

    for pagina in ('utenti', 'pratiche', 'soggetti'):
        for lar in (1440, 1100, 768):
            pg = entra(pagina, lar)
            pg.wait_for_selector('.filtri .segmenti, .filtri .segmenti-select')
            pg.wait_for_timeout(1000)  # assestamento: il passaggio iniziale segmenti→tendina non conta
            prima = pg.evaluate(STATO)
            cambi, ultimo = 0, prima
            for _ in range(40):
                pg.wait_for_timeout(50)
                s = pg.evaluate(STATO)
                if s != ultimo:
                    cambi += 1; ultimo = s
            ok(cambi == 0 and prima in ('segmenti', 'tendina'), f'{pagina} {lar} px: 0 cambi in 2 s (stato {prima})')
            ok(pg.evaluate(UNARIGA) == 'una-riga', f'{pagina} {lar} px: segmenti o tendina sulla riga della ricerca')
            pg.screenshot(path=str(USCITA / f'filtri-{pagina}-{lar}.png'))
            pg.close()

    b.close()

print('\n'.join(esiti))
print('errori della pagina:', errori or 'nessuno')
print(f"{len(esiti)} controlli, {sum(e.startswith('KO') for e in esiti)} KO")
