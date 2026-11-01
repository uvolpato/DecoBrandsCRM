'use client';
import { useEffect, useRef, useState } from 'react';
import { Icona } from './Icona';

// PeriodoMesi come CRM.PeriodoMesi (D-16 §19): periodo di N mesi scelto con anno e griglia dei mesi,
// scorciatoie a sinistra. Si sceglie il mese d'inizio e il periodo si completa da solo a N mesi, dentro i
// mesi con dati (primo…ultimo). Mesi come 'aaaa-mm'. `da` lo tiene chi usa il componente (con
// useMemoria si ritrova tornando alla pagina, §7.12).
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const mk = (a: number, m: number) => a + '-' + String(m).padStart(2, '0');
const mpiu = (k: string, n: number) => { const t = Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1 + n; return mk(Math.floor(t / 12), t % 12 + 1); };
const etichetta = (k: string) => MESI[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);

export function completaPeriodo(da: string, n: number, primo: string, ultimo: string) {
  let a = mpiu(da, n - 1);
  if (a > ultimo) { a = ultimo; da = mpiu(a, -(n - 1)); }
  if (da < primo) { da = primo; a = mpiu(da, n - 1); if (a > ultimo) a = ultimo; }
  return { da, a };
}

export function PeriodoMesi({ da, mesi = 6, primo, ultimo, onChange }: { da: string; mesi?: number; primo: string; ultimo: string; onChange: (da: string, a: string) => void }) {
  const cur = completaPeriodo(da, mesi, primo, ultimo);
  const [aperto, setAperto] = useState(false);
  const [anno, setAnno] = useState(Number(cur.da.slice(0, 4)));
  const [sopra, setSopra] = useState<string | null>(null); // mese sotto il mouse: anteprima del periodo
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setAperto(false); };
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(false); };
    document.addEventListener('click', fuori);
    document.addEventListener('keydown', tasto);
    return () => { document.removeEventListener('click', fuori); document.removeEventListener('keydown', tasto); };
  }, [aperto]);

  const scegli = (d: string) => { const p = completaPeriodo(d, mesi, primo, ultimo); setAperto(false); onChange(p.da, p.a); };
  // scorciatoie: ultimi N mesi, semestri interi con dati
  const scorciatoie = [{ t: 'Ultimi ' + mesi + ' mesi', da: mpiu(ultimo, -(mesi - 1)) }];
  for (let y = Number(ultimo.slice(0, 4)); y >= Number(primo.slice(0, 4)); y--) {
    if (mk(y, 12) <= ultimo && mk(y, 7) >= primo) scorciatoie.push({ t: '2° semestre ' + y, da: mk(y, 7) });
    if (mk(y, 6) <= ultimo && mk(y, 1) >= primo) scorciatoie.push({ t: '1° semestre ' + y, da: mk(y, 1) });
  }
  const anteprima = sopra ? completaPeriodo(sopra, mesi, primo, ultimo) : null;

  return (
    <div className="periodo-mesi" ref={box}>
      <button type="button" className="periodo-btn" aria-haspopup="dialog" aria-expanded={aperto}
        onClick={() => { if (!aperto) setAnno(Number(cur.da.slice(0, 4))); setAperto(!aperto); }}>
        <Icona nome="oggi" /><span>{etichetta(cur.da)} → {etichetta(cur.a)}</span>
      </button>
      <div className="periodo-pop" role="dialog" aria-label="Scegli il periodo" hidden={!aperto}>
        <div className="pm-scorciatoie">
          {scorciatoie.slice(0, 6).map((x) => <button key={x.t} type="button" className={x.da === cur.da ? 'attiva' : undefined} onClick={() => scegli(x.da)}>{x.t}</button>)}
        </div>
        <div className="pm-griglia">
          <div className="pm-anno">
            <button type="button" aria-label="Anno precedente" disabled={anno <= Number(primo.slice(0, 4))} onClick={() => setAnno(anno - 1)}>‹</button>
            <b>{anno}</b>
            <button type="button" aria-label="Anno successivo" disabled={anno >= Number(ultimo.slice(0, 4))} onClick={() => setAnno(anno + 1)}>›</button>
          </div>
          <div className={'pm-mesi' + (anteprima ? ' in-anteprima' : '')} onMouseLeave={() => setSopra(null)}>
            {MESI.map((m, i) => {
              const k = mk(anno, i + 1), fuori = k < primo || k > ultimo, dentro = k >= cur.da && k <= cur.a;
              return (
                <button key={k} type="button" disabled={fuori} title={fuori ? 'Nessun dato' : undefined} onMouseEnter={() => setSopra(k)} onClick={() => scegli(k)}
                  className={[dentro ? 'dentro' : '', k === cur.da || k === cur.a ? 'estremo' : '', anteprima && k >= anteprima.da && k <= anteprima.a ? 'anteprima' : ''].join(' ')}>{m}</button>
              );
            })}
          </div>
          <p className="pm-nota">Scegli il mese d’inizio: il periodo si completa da solo a {mesi} mesi.</p>
        </div>
      </div>
    </div>
  );
}
