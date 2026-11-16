# Unico aiuto per i filtri a segmenti dell'app (0.2.7): da D-187 i segmenti diventano una tendina
# quando la barra non sta su una riga. Le prove leggono i numeri, contano e scelgono le voci da
# segmenti O tendina. `scopo` è il prefisso della FilterBar (es. '.filtri '), con lo spazio finale.
import re, time


def tendina(pg, scopo=''):
    return pg.locator(scopo + '.segmenti-select').count() > 0


def _bottoni(pg, scopo):
    return pg.locator(scopo + '.segmenti [role=tab]')


def _opzioni(pg, scopo):
    return pg.locator(scopo + '.segmenti-select option')


def quanti(pg, scopo=''):
    """Quante voci: i bottoni dei segmenti o le opzioni della tendina."""
    return _opzioni(pg, scopo).count() if tendina(pg, scopo) else _bottoni(pg, scopo).count()


def numero(pg, etichetta, scopo=''):
    """Numero della voce <etichetta>: il badge .n dei segmenti o «(n)» della tendina. None se manca."""
    b = _bottoni(pg, scopo).filter(has_text=etichetta)
    if b.count():
        t = b.first.locator('.n').inner_text().strip()
        return int(t) if t else None
    opt = _opzioni(pg, scopo).filter(has_text=etichetta).first
    if not opt.count():
        return None
    m = re.search(r'\((\d+)\)', opt.inner_text())
    return int(m.group(1)) if m else None


def scegli(pg, etichetta, scopo=''):
    """Sceglie la voce: clic sul bottone dei segmenti o select_option sulla tendina."""
    b = _bottoni(pg, scopo).filter(has_text=etichetta)
    if b.count():
        b.first.click()
        return
    opt = _opzioni(pg, scopo).filter(has_text=etichetta).first
    pg.locator(scopo + '.segmenti-select').select_option(value=opt.get_attribute('value'))


def scelta(pg, etichetta, scopo=''):
    """La voce <etichetta> è quella attiva? (aria-selected sui segmenti, valore della tendina)."""
    b = _bottoni(pg, scopo).filter(has_text=etichetta)
    if b.count():
        return b.first.get_attribute('aria-selected') == 'true'
    opt = _opzioni(pg, scopo).filter(has_text=etichetta).first
    return pg.locator(scopo + '.segmenti-select').input_value() == opt.get_attribute('value')


def testo_voce(pg, indice, scopo=''):
    """Testo della voce i-esima (per i controlli che leggono l'elenco delle voci)."""
    return _opzioni(pg, scopo).nth(indice).inner_text() if tendina(pg, scopo) else _bottoni(pg, scopo).nth(indice).inner_text()


def attendi_numero(pg, etichetta, valore, scopo='', timeout=20):
    """Aspetta che il numero della voce diventi <valore> (il numero arriva dal server dopo il filtro)."""
    fine = time.time() + timeout
    while time.time() < fine:
        try:
            if numero(pg, etichetta, scopo) == valore:
                return True
        except Exception:
            pass
        pg.wait_for_timeout(250)
    return False
