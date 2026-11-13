'use client';
// PDF intero con PDF.js: tutte le pagine una sotto l'altra in un riquadro che scorre, con il
// rettangolo del valore selezionato sulla sua pagina (§6.6.1). Coordinate normalizzate 0–1.
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';

export interface PosizionePdf {
  tipo?: string;
  pagina?: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function PdfEvidenziato({ src, pagina = 1, posizione }: {
  src: string; pagina?: number; posizione: PosizionePdf | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const retRef = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const [larghezza, setLarghezza] = useState(0);
  const [pagine, setPagine] = useState(0);
  const [aspetti, setAspetti] = useState<number[]>([]);

  // la larghezza del riquadro decide la scala delle pagine (resta allineata al ridimensionamento)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const misura = () => setLarghezza(box.clientWidth);
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let vivo = true;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      if (!larghezza) return;
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      task = pdfjs.getDocument({ url: src });
      const doc = await task.promise;
      if (!vivo) return;
      const ratio: number[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const base = (await doc.getPage(n)).getViewport({ scale: 1 });
        ratio.push(base.height / base.width);
      }
      setPagine(doc.numPages);
      setAspetti(ratio);
      // i canvas nascono al render successivo: si aspetta un fotogramma prima di disegnarci sopra
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      // ponytail: tutte le pagine disegnate subito, fine a ~20 pagine; oltre serve il disegno a richiesta
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: larghezza / base.width });
        const canvas = canvases.current[n - 1];
        if (!canvas || !vivo) return;
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        await page.render({ canvas, viewport: vp }).promise;
        if (!vivo) return;
      }
    })().catch(() => {});
    return () => {
      vivo = false;
      void task?.destroy();
    };
  }, [src, larghezza]);

  const MARGINE = 5; // px di allargamento per lato: il rettangolo non taglia le prime/ultime lettere
  const altezzaPagina = larghezza && aspetti[pagina - 1] ? larghezza * aspetti[pagina - 1] : 0;
  const dx = larghezza ? (MARGINE / larghezza) * 100 : 0;
  const dy = altezzaPagina ? (MARGINE / altezzaPagina) * 100 : 0;
  const r = posizione && posizione.x0 != null && posizione.x1 != null
    ? {
        left: `${(posizione.x0 * 100 - dx).toFixed(3)}%`,
        top: `${(posizione.y0 * 100 - dy).toFixed(3)}%`,
        width: `${((posizione.x1 - posizione.x0) * 100 + 2 * dx).toFixed(3)}%`,
        height: `${((posizione.y1 - posizione.y0) * 100 + 2 * dy).toFixed(3)}%`,
      }
    : null;

  // porta il rettangolo in vista quando cambia il campo selezionato (può stare in qualsiasi pagina)
  const chiaveR = r ? `${pagina}:${posizione!.x0}:${posizione!.y0}:${posizione!.x1}:${posizione!.y1}` : '';
  useEffect(() => {
    if (chiaveR) retRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [chiaveR]);

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', background: '#525659' }}>
      {Array.from({ length: pagine }, (_, i) => (
        <div key={i} style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
          <canvas ref={(el) => { canvases.current[i] = el; }} style={{ width: '100%', display: 'block' }}
            aria-label={'Pagina ' + (i + 1) + ' di ' + pagine} />
          {r && pagina === i + 1 && (
            <div ref={retRef} style={{
              position: 'absolute', ...r,
              border: '2px solid #ffd24d', background: 'rgba(255,210,77,0.22)',
              borderRadius: 2, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
              scrollMargin: '64px',
            }} aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}
