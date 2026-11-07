'use client';
// PDF renderizzato con PDF.js, con sopra lo strato trasparente per il rettangolo del valore
// selezionato (§6.6.1): le coordinate sono normalizzate 0–1 e restano allineate a ogni scala.
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

export function PdfEvidenziato({ src, pagina, posizione }: {
  src: string; pagina: number; posizione: PosizionePdf | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const retRef = useRef<HTMLDivElement>(null);
  const [larghezza, setLarghezza] = useState(0);

  // la larghezza del riquadro decide la scala della pagina (resta allineata al ridimensionamento)
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
      const page = await doc.getPage(pagina);
      const base = page.getViewport({ scale: 1 });
      const sc = larghezza / base.width;
      const vp = page.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      if (!canvas || !vivo) return;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      await page.render({ canvas, viewport: vp }).promise;
    })().catch(() => {});
    return () => {
      vivo = false;
      void task?.destroy();
    };
  }, [src, pagina, larghezza]);

  const canvas = canvasRef.current;
  const MARGINE = 5; // px di allargamento per lato: il rettangolo non taglia le prime/ultime lettere
  const dx = canvas?.clientWidth ? (MARGINE / canvas.clientWidth) * 100 : 0;
  const dy = canvas?.clientHeight ? (MARGINE / canvas.clientHeight) * 100 : 0;
  const r = posizione && posizione.x0 != null && posizione.x1 != null
    ? {
        left: `${(posizione.x0 * 100 - dx).toFixed(3)}%`,
        top: `${(posizione.y0 * 100 - dy).toFixed(3)}%`,
        width: `${((posizione.x1 - posizione.x0) * 100 + 2 * dx).toFixed(3)}%`,
        height: `${((posizione.y1 - posizione.y0) * 100 + 2 * dy).toFixed(3)}%`,
      }
    : null;

  // porta il rettangolo in vista quando cambia il campo selezionato (il valore può essere in basso nella pagina)
  const chiaveR = r ? `${pagina}:${posizione!.x0}:${posizione!.y0}:${posizione!.x1}:${posizione!.y1}` : '';
  useEffect(() => {
    if (chiaveR) retRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [chiaveR]);

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', background: '#525659' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} aria-label={'Pagina ' + pagina + ' del documento'} />
        {r && (
          <div ref={retRef} style={{
            position: 'absolute', ...r,
            border: '2px solid #ffd24d', background: 'rgba(255,210,77,0.22)',
            borderRadius: 2, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
            scrollMargin: '64px',
          }} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
