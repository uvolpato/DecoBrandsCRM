'use client';
import { BarController, BarElement, CategoryScale, Chart, DoughnutController, ArcElement, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { euro, num } from '@/lib/formati';

// Grafico come CRM.Grafico (D-17 §19): involucro di Chart.js 4.4.4 (MIT) con lo stile del CRM: carattere e
// colori dell'app, importi in euro all'italiana, legenda in basso, niente animazioni vistose.
// I valori sono già calcolati dal server (V12). Clic su una barra o fetta = filtro (onClick, evidenzia);
// immagine() dà il PNG su fondo bianco per Excel e PDF.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, DoughnutController, ArcElement, Legend, Tooltip);

export const COLORI_GRAFICI = { primario: '#0d6efd', primarioTenue: '#9ec5fe', neutro: '#adb5bd', ok: '#198754', attesa: '#ffc107', errore: '#dc3545', testo: '#495057', griglia: '#e9ecef' };

export interface SerieGrafico { nome: string; valori: number[]; colore?: string | string[]; tipo?: 'line' | 'bar'; asse?: string }
export interface GraficoProps {
  tipo?: 'bar' | 'line' | 'doughnut';
  etichette: string[];
  serie: SerieGrafico[];
  orizzontale?: boolean;
  impilato?: boolean;
  altezza?: number;
  euro?: boolean; // valori in euro (predefinito)
  titolo?: string; // per chi non vede il grafico (aria-label)
  onClick?: (indice: number, serie: number) => void;
  evidenzia?: number | number[]; // il punto scelto resta pieno, gli altri si schiariscono
}
export interface GraficoMano { immagine: () => { dati: string; larghezza: number; altezza: number } | null }

export function Grafico({ tipo = 'bar', etichette, serie, orizzontale, impilato, altezza = 240, euro: inEuro = true, titolo, onClick, evidenzia, ref }: GraficoProps & { ref?: Ref<GraficoMano> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const suClick = useRef(onClick);
  suClick.current = onClick;
  useImperativeHandle(ref, () => ({
    immagine() {
      const cv = canvas.current; // il canvas è trasparente: lo si copia su fondo bianco
      if (!cv) return null;
      const k = document.createElement('canvas');
      k.width = cv.width; k.height = cv.height;
      const x = k.getContext('2d')!;
      x.fillStyle = '#fff'; x.fillRect(0, 0, k.width, k.height); x.drawImage(cv, 0, 0);
      return { dati: k.toDataURL('image/png'), larghezza: cv.width, altezza: cv.height };
    },
  }));

  const dati = JSON.stringify([tipo, etichette, serie, orizzontale, impilato, inEuro, evidenzia]);
  useEffect(() => {
    const C = COLORI_GRAFICI, tondo = tipo === 'doughnut';
    const fmt = (v: number) => (inEuro ? euro(v).replace(',00', '') : num(v));
    const fmtAsse = (v: number | string) => { const n = Number(v); return inEuro ? (Math.abs(n) >= 1000 ? num(Math.round(n / 100) / 10) + ' k€' : num(n) + ' €') : num(n); };
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = C.testo;
    const ev = evidenzia == null ? [] : ([] as number[]).concat(evidenzia);
    const schiarisci = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c + '4d' : c);
    const colore = (s: SerieGrafico) => {
      const c = s.colore ?? C.primario;
      if (!ev.length || s.tipo === 'line') return c;
      return s.valori.map((_, i) => { const x = Array.isArray(c) ? c[i % c.length] : c; return ev.includes(i) ? x : schiarisci(x); });
    };
    const g = new Chart(canvas.current!, {
      type: tipo,
      data: {
        labels: etichette,
        datasets: serie.map((s) => ({
          label: s.nome, data: s.valori, type: s.tipo, yAxisID: s.asse, backgroundColor: colore(s),
          borderColor: s.tipo === 'line' ? (typeof s.colore === 'string' ? s.colore : C.ok) : tondo ? '#fff' : 'transparent',
          borderWidth: s.tipo === 'line' ? 2.5 : tondo ? 2 : 0, borderRadius: tondo ? 0 : 4, pointRadius: s.tipo === 'line' ? 4 : 0,
          maxBarThickness: 34, order: s.tipo === 'line' ? 0 : 1,
        })) as never,
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
        indexAxis: orizzontale ? 'y' : 'x',
        onClick: (_e, els) => { if (els.length) suClick.current?.(els[0].index, els[0].datasetIndex); },
        onHover: (e, els) => { const t = e.native?.target as HTMLElement | undefined; if (t && suClick.current) t.style.cursor = els.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: serie.length > 1 || tondo, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, padding: 14 } },
          tooltip: { callbacks: { label: (c) => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + fmt(tondo ? (c.parsed as unknown as number) : orizzontale ? c.parsed.x! : c.parsed.y!) } },
        },
        scales: tondo ? {} : {
          x: { stacked: !!impilato, grid: { display: !!orizzontale, color: C.griglia }, ticks: orizzontale ? { callback: fmtAsse } : {} },
          y: { stacked: !!impilato, grid: { display: !orizzontale, color: C.griglia }, ticks: orizzontale ? {} : { callback: fmtAsse }, beginAtZero: true },
        },
      },
    });
    return () => g.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- si ridisegna quando cambiano i dati (dati)
  }, [dati]);

  return (
    <div className={'grafico' + (onClick ? ' cliccabile' : '')} style={{ height: altezza }}>
      <canvas ref={canvas} role="img" aria-label={titolo ?? 'Grafico'} />
    </div>
  );
}
