'use client';
import { useEffect, useRef, useState } from 'react';
import { Icona } from './Icona';

// Come CRM.RiepilogoFiltri (D-21 §19): due pulsanti a icona per le barre dei filtri.
// L'imbuto con il numero dei filtri attivi apre il riepilogo di TUTTI i filtri (periodo compreso), ogni
// voce con × per toglierla e "Togli tutti i filtri"; l'imbuto barrato li toglie tutti (spento se non ce ne sono).
export interface VoceRiepilogo {
  etichetta: string;
  testo?: string; // un valore solo, senza ×
  valori?: { testo: string; togli?: () => void }[]; // uno o più valori, ognuno con ×
  vuoto?: string; // cosa dire quando non ce ne sono (predefinito: "tutti")
}

export function RiepilogoFiltri({ voci, attivi, onAzzera }: { voci: VoceRiepilogo[]; attivi: number; onAzzera: () => void }) {
  const [aperto, setAperto] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setAperto(false); };
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(false); };
    document.addEventListener('click', fuori);
    document.addEventListener('keydown', tasto);
    return () => { document.removeEventListener('click', fuori); document.removeEventListener('keydown', tasto); };
  }, [aperto]);

  return (
    <div className="riepilogo-filtri" ref={box}>
      <button type="button" className={'btn-icona' + (attivi ? ' con-conta' : '')} aria-haspopup="dialog" aria-expanded={aperto} title="Riepilogo dei filtri"
        aria-label={'Riepilogo dei filtri' + (attivi ? ': ' + attivi + ' attivi' : '')} onClick={() => setAperto(!aperto)}>
        <Icona nome="filtro" />{attivi > 0 && <span className="btn-icona-conta">{attivi}</span>}
      </button>
      <button type="button" className="btn-icona" disabled={!attivi} title="Togli tutti i filtri" aria-label="Togli tutti i filtri" onClick={onAzzera}><Icona nome="filtro-via" /></button>
      <div className="riepilogo-pop" role="dialog" aria-label="Filtri attivi" hidden={!aperto}>
        <p className="riepilogo-titolo">Filtri attivi</p>
        <dl>
          {voci.map((v) => (
            <div key={v.etichetta} style={{ display: 'contents' }}>
              <dt>{v.etichetta}</dt>
              <dd>
                {v.valori
                  ? v.valori.length
                    ? v.valori.map((x) => (
                      <span key={x.testo} className="filtro-voce">{x.testo}
                        {x.togli && <button type="button" className="filtro-voce-togli" aria-label={'Togli ' + x.testo} title="Togli" onClick={() => { setAperto(false); x.togli!(); }}><Icona nome="chiudi" /></button>}
                      </span>))
                    : <span className="testo-tenue">{v.vuoto ?? 'tutti'}</span>
                  : v.testo}
              </dd>
            </div>
          ))}
        </dl>
        {attivi ? <button type="button" className="link-azzera" onClick={() => { setAperto(false); onAzzera(); }}>Togli tutti i filtri</button> : <p className="testo-tenue">Nessun filtro attivo.</p>}
      </div>
    </div>
  );
}
