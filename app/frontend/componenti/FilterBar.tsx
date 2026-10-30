'use client';
import { Icona } from './Icona';

// Barra dei filtri come CRM.FilterBar del prototipo (D-22), stesso markup .filtri.
// ponytail: per ora 'cerca' e 'segmenti' (Utenti); 'ricerca' sulle entità, tendine e riepilogo
// arrivano con le pagine che li usano (Pratiche, Analisi).
export interface CampoFiltro {
  nome: string;
  tipo: 'cerca' | 'segmenti';
  placeholder?: string;
  opzioni?: { value: string; label: string; n?: number }[];
}

export function FilterBar({ campi, valori, onChange }: {
  campi: CampoFiltro[]; valori: Record<string, string>; onChange: (v: Record<string, string>) => void;
}) {
  const metti = (nome: string, v: string) => onChange({ ...valori, [nome]: v });
  return (
    <div className="filtri">
      {campi.map((c) => (
        <div key={c.nome} className="filtro-slot">
          {c.tipo === 'cerca' ? (
            <label className="cerca">
              <Icona nome="cerca" />
              <input type="search" aria-label="Cerca" placeholder={c.placeholder ?? 'Cerca'} value={valori[c.nome] ?? ''} onChange={(e) => metti(c.nome, e.target.value)} />
            </label>
          ) : (
            <div className="segmenti" role="tablist">
              {c.opzioni!.map((o) => (
                <button key={o.value} type="button" role="tab" aria-selected={valori[c.nome] === o.value} onClick={() => metti(c.nome, o.value)}>
                  {o.label}{o.n != null && <span className="n">{o.n}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
