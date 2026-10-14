"""Rigenera prototipo-crm/specifica.html e preventivo.html dai file .md.
Uso (dalla radice del repository):  python strumenti/genera-pagine-doc.py
Richiede: pip install markdown
"""
import io, re, os, html
import markdown

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTO = os.path.join(RADICE, 'prototipo-crm')

def leggi(p): return io.open(os.path.join(RADICE, p), encoding='utf-8').read()
def scrivi(p, s): io.open(os.path.join(RADICE, p), 'w', encoding='utf-8', newline='\n').write(s)

def md2html(testo):
    h = markdown.markdown(testo, extensions=['tables', 'fenced_code', 'sane_lists'])
    h = h.replace('<hr />', '')
    h = re.sub(r'<pre><code', '<pre class="spec-code"><code', h)
    return h

def intestazione(md):
    """Separa titolo (# ...), righe di intestazione (**Chiave:** ...) e corpo."""
    righe = md.split('\n')
    titolo = righe[0].lstrip('# ').strip()
    i = 1; meta = []
    while i < len(righe) and not righe[i].startswith('## '):
        r = righe[i].strip()
        if r.startswith('**'): meta.append(r)
        i += 1
    return titolo, meta, '\n'.join(righe[i:])

def inline(s):  # markdown in linea (grassetto, codice) senza <p>
    return re.sub(r'^<p>|</p>$', '', markdown.markdown(s))

def ancora(num): return 'sec-' + num.rstrip('.').replace('.', '-')

# ---------------------------------------------------------------- specifica
def genera_specifica():
    md = leggi('specifica-crm-provvigioni.md')
    titolo, meta, corpo = intestazione(md)
    h = md2html(corpo)
    h = h.replace('<table>', '<div class="table-wrap"><table class="table table-sm table-bordered align-middle mb-2">')
    h = h.replace('</table>', '</table></div>').replace('<thead>', '<thead class="table-light">')
    indice = []
    def titoli(m):
        liv, testo = m.group(1), m.group(2)
        mm = re.match(r'([\d.]+)\s', re.sub('<[^>]+>', '', testo))
        if not mm: return m.group(0)
        num = mm.group(1); a = ancora(num)
        pulito = re.sub('<[^>]+>', '', testo)
        if liv == '2': indice.append((pulito, a, []))
        elif liv == '3' and num.rstrip('.').count('.') == 1 and indice: indice[-1][2].append((pulito, a))
        apri = '</section>\n<section id="%s">\n' % a if liv == '2' else ''
        return '%s<h%s id="%s">%s</h%s>' % (apri, liv, a, testo, liv) if liv != '2' else '%s<h2>%s</h2>' % (apri, testo)
    h = re.sub(r'<h([234])>(.*?)</h\1>', titoli, h)
    h = h.split('</section>\n', 1)[1] + '\n</section>' if h.startswith('</section>') else h + '\n</section>'
    li = []
    for testo, a, figli in indice:
        if figli:
            sub = '\n'.join('              <li class="nav-item"><a class="nav-link" href="#%s">%s</a></li>' % (fa, html.escape(ft)) for ft, fa in figli)
            li.append('          <li class="nav-item">\n            <a class="nav-link" href="#%s">%s</a>\n            <ul class="nav flex-column ps-3">\n%s\n            </ul>\n          </li>' % (a, html.escape(testo), sub))
        else:
            li.append('          <li class="nav-item"><a class="nav-link" href="#%s">%s</a></li>' % (a, html.escape(testo)))
    versione = next((m for m in meta if m.startswith('**Versione')), '')
    intro = ('        <section id="sec-intro">\n          <h2 class="border-0 pt-0" style="margin-top:0">%s</h2>\n%s\n        </section>\n' %
             (html.escape(titolo), '\n'.join('          <p class="small text-muted mb-1">%s</p>' % inline(m) for m in meta)))
    pagina = io.open(os.path.join(PROTO, 'specifica.html'), encoding='utf-8').read()
    pagina = re.sub(r'(<i class="bi bi-info-circle me-1"></i>Rendering statico di <code>specifica-crm-provvigioni.md</code>).*?\n',
                    lambda m: m.group(1) + ' — ' + re.sub(r'</?strong>', '', inline(versione)) + ' (generato da <code>strumenti/genera-pagine-doc.py</code>).\n', pagina, count=1)
    pagina = re.sub(r'(<div class="nav-item-titolo">Indice</div>\s*<ul class="nav flex-column">\n).*?(\n        </ul>\n      </nav>)',
                    lambda m: m.group(1) + '\n'.join(li) + m.group(2), pagina, count=1, flags=re.S)
    pagina = re.sub(r'(<div id="contenuto" class="card card-body bg-white spec-body">\n).*?(\n      </div>\n    </div>\n  </div>\n</div>\n<script)',
                    lambda m: m.group(1) + '\n' + intro + '\n' + h + m.group(2), pagina, count=1, flags=re.S)
    scrivi('prototipo-crm/specifica.html', pagina)
    return len(indice)

# ---------------------------------------------------------------- preventivo
def genera_preventivo():
    md = leggi('preventivo-crm-provvigioni.md')
    titolo, meta, corpo = intestazione(md)
    h = md2html(corpo)
    h = h.replace('<table>', '<table class="table table-bordered bg-white">')
    h = re.sub(r'<h2>((\d+)\.[^<]*)</h2>', r'<h2 id="sez-\2">\1</h2>', h)
    alert = '  <div class="alert alert-light border small">\n    %s\n  </div>\n' % '<br>\n    '.join(inline(m) for m in meta)
    pagina = io.open(os.path.join(PROTO, 'preventivo.html'), encoding='utf-8').read()
    pagina = re.sub(r'(Riferimento: <code>preventivo-crm-provvigioni.md</code>)\.',
                    r'\1 (generato da <code>strumenti/genera-pagine-doc.py</code>).', pagina, count=1)
    pagina = re.sub(r'\n  <div class="alert alert-light border small">.*?(\n</div>\n<script)',
                    lambda m: '\n' + alert + '\n' + h + '\n' + m.group(1), pagina, count=1, flags=re.S)
    scrivi('prototipo-crm/preventivo.html', pagina)

if __name__ == '__main__':
    n = genera_specifica(); genera_preventivo()
    print('specifica.html: %d sezioni · preventivo.html aggiornato' % n)
