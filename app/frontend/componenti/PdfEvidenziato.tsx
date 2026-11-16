'use client';
// Visualizzatore del documento nella finestra «Correggi i dati letti» (§6.6.1): PDF (PDF.js, tutte
// le pagine una sotto l'altra) oppure foto (JPG/PNG), in un riquadro che scorre, con il rettangolo del
// valore selezionato e l'ingrandimento. Coordinate normalizzate 0–1. I PDF si ridisegnano alla scala
// scelta (niente sfocato); le foto si scalano col CSS. Zoom con Ctrl+rotella (verso il puntatore),
// trascinamento quando si è ingranditi, doppio clic per tornare ad «Adatta» (larghezza intera).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Icona } from './Icona';
import { Sagoma, useSagome } from './Sagoma';

export interface PosizionePdf {
  tipo?: string;
  pagina?: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const PASSO_ZOOM = 1.25;
const MARGINE = 5; // px di allargamento per lato: il rettangolo non taglia le prime/ultime lettere

export function PdfEvidenziato({ src, tipo = 'pdf', pagina = 1, posizione, mancaPosizione = false }: {
  src: string; tipo?: 'pdf' | 'jpg' | 'png'; pagina?: number;
  posizione: PosizionePdf | null; mancaPosizione?: boolean;
}) {
  const scatolaRef = useRef<HTMLDivElement>(null); // il riquadro che scorre
  const retRef = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderRef = useRef<(RenderTask | null)[]>([]); // un render per pagina: si annulla prima di ridisegnare
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [larghezza, setLarghezza] = useState(0);
  const [pagine, setPagine] = useState(0);
  const [aspetti, setAspetti] = useState<number[]>([]);
  const [errore, setErrore] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomNetto, setZoomNetto] = useState(1); // per il ridisegno netto del PDF, a gesto finito
  const [imgAspetto, setImgAspetto] = useState(0); // altezza/larghezza della foto
  const [imgPronto, setImgPronto] = useState(false);
  // punto d'appoggio per lo zoom verso il puntatore e per i pulsanti (verso il centro)
  const ancora = useRef<{ ox: number; oy: number; cx: number; cy: number; rapporto: number } | null>(null);
  const inizio = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  const eImmagine = tipo !== 'pdf';
  const sagome = useSagome(!errore && !(eImmagine ? imgPronto : pronto));

  // al cambio di documento si riparte da «Adatta»
  useEffect(() => {
    setZoom(1);
    setZoomNetto(1);
    setImgAspetto(0);
    setImgPronto(false);
  }, [src, tipo]);

  // la larghezza del riquadro decide la scala (resta allineata al ridimensionamento)
  useEffect(() => {
    const box = scatolaRef.current;
    if (!box) return;
    const misura = () => setLarghezza(box.clientWidth);
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // carica il PDF una volta sola: il ridisegno alla scala scelta sta nell'effetto dopo
  useEffect(() => {
    if (eImmagine) return;
    let vivo = true;
    let task: PDFDocumentLoadingTask | null = null;
    const annulla = () => { void task?.destroy(); docRef.current = null; };
    setErrore(false);
    setPronto(false);
    setPagine(0);
    setAspetti([]);
    const carica = async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      task = pdfjs.getDocument({ url: src });
      const doc = await task.promise;
      if (!vivo) return;
      docRef.current = doc;
      const ratio: number[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const base = (await doc.getPage(n)).getViewport({ scale: 1 });
        ratio.push(base.height / base.width);
      }
      setPagine(doc.numPages);
      setAspetti(ratio);
    };
    (async () => {
      try {
        await carica();
      } catch {
        // un tentativo in più: alla prima apertura il chunk/worker di pdf.js può essere a cache fredda
        if (!vivo) return;
        annulla();
        try {
          await carica();
        } catch {
          if (vivo) setErrore(true);
        }
      }
    })();
    return () => {
      vivo = false;
      annulla();
    };
  }, [src, tentativo, eImmagine]);

  // disegna (o ridisegna) le pagine alla scala scelta: `zoomNetto` segue `zoom` con un piccolo
  // ritardo, così la rotella non ridisegna a ogni scatto. Il canvas non si usa da due render insieme:
  // prima di ridisegnare si annulla e si aspetta il render precedente della pagina.
  useEffect(() => {
    if (eImmagine || !larghezza || !pagine) return;
    const doc = docRef.current;
    if (!doc) return;
    let vivo = true;
    const cancella = async (n: number) => {
      const prec = renderRef.current[n - 1];
      if (!prec) return;
      renderRef.current[n - 1] = null;
      try { prec.cancel(); await prec.promise; } catch { /* annullato: non è un errore */ }
    };
    const disegna = async () => {
      // i canvas nascono al render successivo: un fotogramma prima di disegnarci sopra
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      for (let n = 1; n <= pagine; n++) {
        await cancella(n);
        if (!vivo) return;
        const page = await doc.getPage(n);
        if (!vivo) return;
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: (larghezza * zoomNetto) / base.width });
        const canvas = canvases.current[n - 1];
        if (!canvas) return;
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const task = page.render({ canvas, viewport: vp });
        renderRef.current[n - 1] = task;
        try { await task.promise; } catch { /* annullato o non riuscito: mai mostrato come errore */ }
        if (!vivo) return;
        if (n === 1) setPronto(true);
      }
    };
    void disegna();
    return () => {
      vivo = false;
      for (const t of renderRef.current) if (t) t.cancel();
      renderRef.current = [];
    };
  }, [pagine, larghezza, zoomNetto, eImmagine]);

  // Ctrl+rotella ingrandisce verso il puntatore (listener non passivo: serve preventDefault)
  useEffect(() => {
    const box = scatolaRef.current;
    if (!box) return;
    const ruota = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const z = zoomRef.current;
      const rect = box.getBoundingClientRect();
      const ox = e.clientX - rect.left, oy = e.clientY - rect.top;
      const fattore = e.deltaY < 0 ? PASSO_ZOOM : 1 / PASSO_ZOOM;
      const v = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * fattore));
      if (v === z) return;
      ancora.current = { ox, oy, cx: box.scrollLeft + ox, cy: box.scrollTop + oy, rapporto: v / z };
      setZoom(v);
    };
    box.addEventListener('wheel', ruota, { passive: false });
    return () => box.removeEventListener('wheel', ruota);
  }, []);

  // dopo il cambio di zoom riporta sotto il puntatore (o il centro) lo stesso punto del documento
  useLayoutEffect(() => {
    const a = ancora.current;
    if (!a) return;
    const box = scatolaRef.current;
    if (!box) return;
    box.scrollLeft = a.cx * a.rapporto - a.ox;
    box.scrollTop = a.cy * a.rapporto - a.oy;
    ancora.current = null;
  }, [zoom]);

  useEffect(() => {
    const t = setTimeout(() => setZoomNetto(zoom), 150);
    return () => clearTimeout(t);
  }, [zoom]);

  const cambiaZoom = (nuovo: number) => {
    const v = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nuovo));
    if (v === zoom) return;
    const box = scatolaRef.current;
    if (box) {
      const ox = box.clientWidth / 2, oy = box.clientHeight / 2;
      ancora.current = { ox, oy, cx: box.scrollLeft + ox, cy: box.scrollTop + oy, rapporto: v / zoom };
    }
    setZoom(v);
  };

  const adatta = () => {
    const box = scatolaRef.current;
    if (box) { box.scrollLeft = 0; box.scrollTop = 0; }
    setZoom(1);
  };

  const premi = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const box = scatolaRef.current;
    if (!box) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    inizio.current = { x: e.clientX, y: e.clientY, sl: box.scrollLeft, st: box.scrollTop };
  };
  const muovi = (e: React.PointerEvent) => {
    const ini = inizio.current;
    const box = scatolaRef.current;
    if (!ini || !box) return;
    box.scrollLeft = ini.sl - (e.clientX - ini.x);
    box.scrollTop = ini.st - (e.clientY - ini.y);
  };
  const lascia = () => { inizio.current = null; };

  // scala del contenuto (larghezza intera × zoom) e rettangolo del valore, in percentuale del riquadro
  const scala = larghezza * zoom;
  const asp = eImmagine ? imgAspetto : (aspetti[pagina - 1] || 0);
  const altezzaPagina = asp ? scala * asp : 0;
  const dx = scala ? (MARGINE / scala) * 100 : 0;
  const dy = altezzaPagina ? (MARGINE / altezzaPagina) * 100 : 0;
  const r = posizione && posizione.x0 != null && posizione.x1 != null
    ? {
        left: `${(posizione.x0 * 100 - dx).toFixed(3)}%`,
        top: `${(posizione.y0 * 100 - dy).toFixed(3)}%`,
        width: `${((posizione.x1 - posizione.x0) * 100 + 2 * dx).toFixed(3)}%`,
        height: `${((posizione.y1 - posizione.y0) * 100 + 2 * dy).toFixed(3)}%`,
      }
    : null;

  const rettangolo = r ? (
    <div ref={retRef} style={{
      position: 'absolute', ...r,
      border: '2px solid #ffd24d', background: 'rgba(255,210,77,0.22)',
      borderRadius: 2, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
      scrollMargin: '64px',
    }} aria-hidden="true" />
  ) : null;

  // porta il rettangolo in vista quando cambia il campo selezionato (può stare in qualsiasi pagina)
  const chiaveR = r ? `${pagina}:${posizione!.x0}:${posizione!.y0}:${posizione!.x1}:${posizione!.y1}` : '';
  useEffect(() => {
    if (chiaveR) retRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [chiaveR]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#525659' }}>
      <div className="zoom-barra" role="toolbar" aria-label="Ingrandimento del documento">
        <button type="button" className="zoom-btn" aria-label="Riduci" disabled={zoom <= MIN_ZOOM} onClick={() => cambiaZoom(zoom / PASSO_ZOOM)}>
          <Icona nome="meno" />
        </button>
        <span className="zoom-pct">{Math.round(zoom * 100)}%</span>
        <button type="button" className="zoom-btn" aria-label="Ingrandisci" disabled={zoom >= MAX_ZOOM} onClick={() => cambiaZoom(zoom * PASSO_ZOOM)}>
          <Icona nome="piu" />
        </button>
        <button type="button" className="zoom-btn testo" aria-label="Adatta alla larghezza" onClick={adatta}>Adatta</button>
      </div>
      {mancaPosizione && !errore && (
        <div className="visualizzatore-nota" role="status">Posizione del campo non disponibile per questo documento</div>
      )}
      <div ref={scatolaRef}
        style={{ position: 'absolute', inset: 0, overflow: 'auto', cursor: zoom > 1 ? 'grab' : undefined, touchAction: 'pan-x pan-y' }}
        onPointerDown={premi} onPointerMove={muovi} onPointerUp={lascia} onPointerCancel={lascia}
        onDoubleClick={adatta}>
        {errore ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', color: '#fff' }}>
            <div>{eImmagine ? 'Non riesco a mostrare la foto' : 'Non riesco a mostrare il PDF'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" onClick={() => { setErrore(false); setTentativo((t) => t + 1); }}>Riprova</button>
              <a className="btn sec" href={src} target="_blank" rel="noopener">{eImmagine ? 'Apri la foto' : 'Apri il PDF'}</a>
            </div>
          </div>
        ) : eImmagine ? (
          <div style={{ position: 'relative', width: scala, minHeight: imgAspetto ? undefined : 220 }}>
            {!imgPronto && sagome && (
              <div style={{ position: 'absolute', inset: 0 }} aria-busy="true"><Sagoma larghezza="100%" altezza="100%" /></div>
            )}
            <img src={src} alt="Foto del documento" style={{ width: '100%', height: imgAspetto ? scala * imgAspetto : 'auto', display: 'block' }}
              onLoad={(e) => { const i = e.currentTarget; setImgAspetto(i.naturalHeight / i.naturalWidth); setImgPronto(true); }}
              onError={() => setErrore(true)} />
            {r && imgAspetto ? rettangolo : null}
          </div>
        ) : (
          <>
            {!pronto && sagome && (
              <div style={{ height: '100%' }} aria-busy="true"><Sagoma larghezza="100%" altezza="100%" /></div>
            )}
            {Array.from({ length: pagine }, (_, i) => (
              <div key={i} style={{ position: 'relative', width: scala, marginBottom: 8 }}>
                <canvas ref={(el) => { canvases.current[i] = el; }} style={{ width: '100%', display: 'block' }}
                  aria-label={'Pagina ' + (i + 1) + ' di ' + pagine} />
                {r && pagina === i + 1 ? rettangolo : null}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
