# Prova del catalogo /componenti dell'app (fase 2d), con Playwright: ogni esempio si vede, filtri con
# ricerca multipla, riepilogo e numeri dei segmenti (D-22, D-23), tabella (ordine, totali), campo di
# ricerca e maschera, periodo, grafico, memoria della schermata (§7.12), pagina riservata.
# Servono backend e frontend accesi, gli utenti di prova (utenti_prova.js crea <s>: <s>-ammi, <s>-oper) e un
# superutente <s>-super con la stessa password (la pagina è solo sua). Un amministratore vede "Pagina riservata".
# Uso: python strumenti/prove/app_componenti.py <suffisso> <cartella schermate> [base, predefinita http://localhost:8011]
import sys, pathlib
from playwright.sync_api import sync_playwright

S, USCITA = sys.argv[1], pathlib.Path(sys.argv[2])
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8011'
PW = 'password-di-prova'
USCITA.mkdir(parents=True, exist_ok=True)
esiti, errori = [], []


def ok(c, t):
    esiti.append(('OK  ' if c else 'KO  ') + t)


def apri(pg):
    pg.wait_for_selector('.accesso-scena')
    if pg.locator('.accesso-scena.aperta').count() == 0:
        pg.keyboard.press('Enter')
    pg.wait_for_selector('.accesso-scena.aperta')


def sezione(pg, nome):
    return pg.locator('.catalogo-voci > div').filter(has=pg.locator('h2', has_text=nome)).first


def n_seg(pg, nome):  # numero del segmento della prima barra del catalogo (FilterBar)
    return int(pg.locator('.catalogo-voci .filtri .segmenti button', has_text=nome).first.locator('.n').inner_text())


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    def entra(utente, larghezza=1440):
        pg = b.new_page(viewport={'width': larghezza, 'height': 900})
        pg.on('pageerror', lambda e: errori.append(str(e)))
        pg.goto(BASE + '/componenti')
        pg.wait_for_function("location.pathname === '/accesso'")
        apri(pg)
        pg.fill('#c-utente', utente)
        pg.fill('#c-password', PW)
        pg.click('button.btn.largo')
        pg.wait_for_function("location.pathname === '/componenti'")
        pg.wait_for_load_state('networkidle')
        return pg

    # --- amministratore ---
    pg = entra(S + '-super')
    pg.wait_for_selector('.catalogo-voci h2')
    titoli = pg.locator('.catalogo-voci > div > .pannello > .pannello-testa h2').all_inner_texts()
    ok(len(titoli) >= 25, f'catalogo: {len(titoli)} componenti')
    ok(pg.locator('.catalogo-indice a').count() == len(titoli), 'indice: un collegamento per componente')
    ok(pg.locator('.barra .voce.attiva', has_text='Componenti').count() == 1, 'barra: voce Componenti attiva')
    for t in ['Pagina', 'Pannello', 'Schede', 'DataTable', 'FilterBar', 'CampoRicerca', 'RiepilogoFiltri', 'PeriodoMesi', 'Grafico', 'KpiRow', 'Cifre',
              'Elenco', 'Caricamento', 'GruppiDaFare', 'ListaDaFare', 'Scelte', 'Binario', 'Matrice', 'Cerniera', 'Periodi']:
        ok(any(x.startswith(t) for x in titoli), 'esempio presente: ' + t)
    ok(all(pg.locator('.catalogo-voci > div').nth(i).locator('.esempio').count() == 1 for i in range(len(titoli))), 'ogni componente ha il suo esempio e la firma')
    ok(pg.locator('.catalogo-voci > div > .pannello .codice').count() == len(titoli), 'ogni componente ha i parametri')

    # DataTable: ordine e totali su tutte le righe
    dt = sezione(pg, 'DataTable')
    dt.scroll_into_view_if_needed()
    ok('17.721,05' in dt.locator('tfoot').inner_text(), 'DataTable: totale della colonna Importo')
    dt.locator('th', has_text='Importo').click()
    ok('310,20' in dt.locator('tbody tr').first.inner_text(), 'DataTable: ordinata per importo crescente')
    ok(dt.locator('.dt-piede').inner_text().startswith('6 elementi'), 'DataTable: conteggio nel piede')

    # FilterBar: segmenti che contano con gli altri filtri (D-23), ricerca multipla, riepilogo
    fb = sezione(pg, 'FilterBar')
    fb.scroll_into_view_if_needed()
    ok((n_seg(pg, 'Tutte'), n_seg(pg, 'Liquidabili'), n_seg(pg, 'In attesa'), n_seg(pg, 'Contestate')) == (6, 3, 2, 1), 'FilterBar: numeri dei segmenti iniziali 6/3/2/1')
    fb.locator('.cerca input').fill('casa')
    ok((n_seg(pg, 'Tutte'), n_seg(pg, 'Liquidabili'), n_seg(pg, 'Contestate')) == (1, 0, 1), 'FilterBar: la ricerca cambia i numeri dei segmenti')
    fb.locator('.cerca input').fill('')
    campo = fb.locator('.ricerca.multipla .ricerca-testo')
    campo.click()
    ok(fb.locator('.ricerca-menu').is_visible(), 'ricerca multipla: il menu si apre')
    fb.locator('.ricerca-menu li[role=option]', has_text='Arredo Bagno Rossi').click()
    fb.locator('.ricerca-menu li[role=option]', has_text='Ceramiche Verdi').click()
    ok(fb.locator('.ricerca-menu li.menu-titolo', has_text='Scelti (2)').count() == 1, 'ricerca multipla: due voci scelte')
    pg.keyboard.press('Escape')  # la chiusura emette il cambio
    pg.wait_for_timeout(200)
    ok(campo.get_attribute('placeholder') == 'Filtro multiplo (2)', 'ricerca multipla: riassunto "Filtro multiplo (2)"')
    ok((n_seg(pg, 'Tutte'), n_seg(pg, 'Liquidabili'), n_seg(pg, 'In attesa'), n_seg(pg, 'Contestate')) == (2, 1, 1, 0), 'FilterBar: i numeri contano con i clienti scelti')
    ok(fb.locator('tbody tr').count() == 2, 'FilterBar: la tabella segue i filtri')
    fb.locator('.riepilogo-filtri .btn-icona').first.click()
    ok(fb.locator('.btn-icona-conta').inner_text() == '2' and fb.locator('.riepilogo-pop .filtro-voce:has(button)').count() == 2, 'riepilogo: 2 filtri attivi, con i nomi')
    fb.locator('.riepilogo-pop .filtro-voce', has_text='Ceramiche Verdi').locator('button').click()
    pg.wait_for_timeout(200)
    ok(fb.locator('tbody tr').count() == 1, 'riepilogo: la × toglie una voce')
    pg.screenshot(path=str(USCITA / 'componenti-filtri-1440.png'))
    fb.locator('.riepilogo-filtri .btn-icona').nth(1).click()
    pg.wait_for_timeout(200)
    ok(fb.locator('tbody tr').count() == 6 and n_seg(pg, 'Tutte') == 6, 'riepilogo: "Togli tutti i filtri"')

    # CampoRicerca singola + maschera
    cr = sezione(pg, 'CampoRicerca')
    cr.scroll_into_view_if_needed()
    ok(cr.locator('.pallino.ok').count() == 1, 'campo singolo: pallino verde (valore in anagrafica)')
    f = cr.locator('#d-f')
    f.fill('')
    f.type('gas')
    cr.locator('.ricerca-menu li[role=option]', has_text='Gasper').click()
    ok('fornitore 2' in cr.inner_text(), 'campo singolo: scelta dal menu')
    f.fill('xyz')
    pg.keyboard.press('Tab'); pg.keyboard.press('Tab')  # esce dal campo (la lente è dentro)
    ok(cr.locator('.pallino.ko').count() == 1, 'campo singolo: valore scritto a mano, pallino rosso')
    cr.locator('.ricerca-lente').nth(1).click()  # maschera del campo multiplo
    pg.wait_for_selector('.modale.larga')
    ok(pg.locator('.modale.larga h2').inner_text() == 'Cerca subagente', 'maschera: aperta con la lente')
    pg.locator('.modale.larga tbody tr', has_text='Laura Neri').click()
    ok('2 scelte' in pg.locator('.modale.larga .ricerca-scelta-barra').inner_text(), 'maschera: riga spuntata col clic')
    pg.screenshot(path=str(USCITA / 'componenti-maschera-1440.png'))
    pg.locator('.modale.larga .btn', has_text='Applica').click()
    ok(cr.locator('.ricerca.multipla .ricerca-testo').get_attribute('placeholder') == 'Filtro multiplo (2)', 'maschera: Applica aggiorna il campo')

    # Periodo, grafico, kpi, schede
    pm = sezione(pg, 'PeriodoMesi')
    pm.scroll_into_view_if_needed()
    pm.locator('.periodo-btn').click()
    pm.locator('.pm-mesi button', has_text='feb').click()
    ok('feb 2026 → lug 2026' in pm.inner_text(), 'PeriodoMesi: si completa a 6 mesi dentro i dati')
    gr = sezione(pg, 'Grafico')
    gr.scroll_into_view_if_needed()
    pg.wait_for_timeout(500)
    ok(gr.locator('canvas').evaluate('c => c.width > 100 && c.height > 50'), 'Grafico: disegnato')
    kp = sezione(pg, 'KpiRow')
    kp.locator('button.kpi').first.click()
    ok(kp.locator('button.kpi[aria-pressed=true]').count() == 1, 'KpiRow: riquadro selezionato')

    # memoria della schermata: scheda e ordinamento si ritrovano tornando
    sc = sezione(pg, 'Schede')
    sc.scroll_into_view_if_needed()
    sc.locator('.schede-barra [role=tab]', has_text='Errori').click()
    pg.click('.barra a[href="/utenti"]')
    pg.wait_for_function("location.pathname === '/utenti'")
    pg.go_back()
    pg.wait_for_function("location.pathname === '/componenti'")
    pg.wait_for_selector('.catalogo-voci h2')
    ok(sezione(pg, 'Schede').locator('.schede-barra [role=tab][aria-selected=true]').inner_text().startswith('Errori'), 'memoria: la scheda aperta si ritrova')
    ok('310,20' in sezione(pg, 'DataTable').locator('tbody tr').first.inner_text(), 'memoria: l’ordinamento della tabella si ritrova')
    pg.screenshot(path=str(USCITA / 'componenti-1440.png'), full_page=False)
    pg.close()

    # --- 768 px ---
    pg = entra(S + '-super', 768)
    pg.wait_for_selector('.catalogo-voci h2')
    ok(pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '768 px: nessuno scorrimento orizzontale della pagina')
    pg.screenshot(path=str(USCITA / 'componenti-768.png'))
    sezione(pg, 'FilterBar').scroll_into_view_if_needed()
    pg.screenshot(path=str(USCITA / 'componenti-filtri-768.png'))
    pg.close()

    # --- non amministratore ---
    pg = entra(S + '-ammi')
    ok(pg.locator('.vuoto b', has_text='Pagina riservata').count() == 1, 'amministratore: Pagina riservata')
    ok(pg.locator('.barra .voce', has_text='Componenti').count() == 0, 'amministratore: la voce Componenti non c’è')
    ok(pg.locator('.catalogo-voci').count() == 0, 'amministratore: il catalogo non si vede')
    pg.close()
    b.close()

ok(not errori, 'nessun errore JavaScript' + (': ' + '; '.join(errori[:3]) if errori else ''))
print('\n'.join(esiti))
ko = sum(1 for e in esiti if e.startswith('KO'))
print(f'\n{len(esiti) - ko} OK, {ko} KO')
sys.exit(1 if ko else 0)
