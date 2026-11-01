'use client';
import { useEffect, useState } from 'react';
import { caricaVoci, type Contesto, type Entita } from '@/lib/entita';
import { CampoRicerca } from './CampoRicerca';
import { Icona } from './Icona';
import { RiepilogoFiltri, type VoceRiepilogo } from './RiepilogoFiltri';

// Barra dei filtri come CRM.FilterBar del prototipo (D-22 §19), stesso markup .filtri.
// Tipi: 'cerca' (testo) · 'segmenti' · 'select' (tendina, solo per scelte fisse: periodo, mese) ·
// 'ricerca' (campo di ricerca su un'entità). REGOLA: i filtri su fornitori, subagenti, clienti (e ogni
// altra entità) sono sempre 'ricerca' con multipla: true, mai tendine; con due o più filtri la barra ha il
// riepilogo (`riepilogo`). Il valore di una ricerca multipla è l'elenco delle chiavi.
// REGOLA dei conteggi (D-23): il numero `n` di ogni segmento conta le righe con TUTTI gli altri filtri
// applicati (ricerca, fornitore, …) tranne il segmento stesso: chi usa la barra lo ricalcola a ogni cambio.
export type Valori = Record<string, string | string[]>;
export interface CampoFiltro {
  nome: string;
  tipo: 'cerca' | 'segmenti' | 'select' | 'ricerca';
  opzioni?: { value: string; label: string; n?: number }[]; // segmenti, select
  placeholder?: string;
  etichetta?: string;
  entita?: Entita; // ricerca
  multipla?: boolean; // ricerca
  contesto?: Contesto; // ricerca
  predefinito?: string | string[]; // valore "senza filtro"; di norma la prima opzione, '' o []
  nelRiepilogo?: boolean; // false: non compare nel riepilogo e non si azzera (es. la durata)
}

const predef = (c: CampoFiltro): string | string[] =>
  c.predefinito ?? (c.tipo === 'ricerca' && c.multipla ? [] : c.tipo === 'segmenti' || c.tipo === 'select' ? String(c.opzioni![0].value) : '');
const uguali = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function FilterBar<V extends Valori>({ campi, valori, onChange, riepilogo }: {
  campi: CampoFiltro[]; valori: V; onChange: (v: V) => void;
  riepilogo?: boolean | { prima: VoceRiepilogo[] }; // icone Riepilogo dei filtri e Togli tutti i filtri in fondo
}) {
  const metti = (nome: string, v: string | string[]) => onChange({ ...valori, [nome]: v });
  const str = (nome: string) => String(valori[nome] ?? '');
  const arr = (nome: string) => (valori[nome] as string[] | undefined) ?? [];

  // nomi delle voci scelte nei filtri di ricerca, per il riepilogo (dal server, V12)
  const [nomi, setNomi] = useState<Record<string, Record<string, string>>>({});
  const entita = campi.filter((c) => c.tipo === 'ricerca' && c.entita);
  const chiaveNomi = entita.map((c) => c.nome + JSON.stringify(c.contesto ?? {})).join('|');
  useEffect(() => {
    if (!riepilogo) return;
    let vivo = true;
    entita.forEach((c) => caricaVoci(c.entita!, c.contesto ?? {}).then((voci) => {
      if (vivo) setNomi((n) => ({ ...n, [c.nome]: Object.fromEntries(voci.map((r) => [String(c.entita!.chiave(r)), c.entita!.testo(r)])) }));
    }).catch(() => undefined));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- si ricarica solo se cambiano i campi di ricerca
  }, [chiaveNomi, !!riepilogo]);

  const attivi = campi.filter((c) => c.nelRiepilogo !== false);
  const voci: VoceRiepilogo[] = [];
  let conta = 0;
  if (riepilogo) {
    if (typeof riepilogo === 'object') voci.push(...riepilogo.prima);
    attivi.forEach((c) => {
      const v = valori[c.nome], d = predef(c), attivo = !uguali(v, d);
      const et = c.etichetta ?? (c.tipo === 'cerca' ? 'Ricerca' : c.tipo === 'segmenti' ? 'Vista' : c.nome);
      const nome = (k: string) => nomi[c.nome]?.[k] ?? k;
      if (c.tipo === 'ricerca' && c.multipla) {
        const ch = arr(c.nome);
        conta += ch.length;
        voci.push({ etichetta: et, valori: ch.map((k) => ({ testo: nome(k), togli: () => metti(c.nome, ch.filter((x) => x !== k)) })) });
        return;
      }
      if (attivo) conta++;
      const s = String(v ?? '');
      const testo = c.tipo === 'ricerca' ? nome(s) : c.tipo === 'cerca' ? '“' + s + '”' : c.opzioni!.find((o) => String(o.value) === s)?.label ?? s;
      voci.push({
        etichetta: et, vuoto: c.tipo === 'cerca' ? 'nessuna' : 'tutti',
        valori: attivo && s ? [{ testo, togli: () => metti(c.nome, d) }] : c.tipo === 'segmenti' || c.tipo === 'select' ? [{ testo }] : [],
      });
    });
  }
  const azzera = () => onChange({ ...valori, ...Object.fromEntries(attivi.map((c) => [c.nome, predef(c)])) });

  return (
    <div className={'filtri' + (riepilogo ? ' con-riepilogo' : '')}>
      {campi.map((c) => {
        if (c.tipo === 'ricerca') {
          const base = { entita: c.entita!, contesto: c.contesto, placeholder: c.placeholder, etichetta: c.etichetta };
          return (
            <div key={c.nome} className="filtro-slot filtro-etichetta filtro-ricerca">
              {c.etichetta && <span>{c.etichetta}</span>}
              {c.multipla
                ? <CampoRicerca {...base} multipla valori={arr(c.nome)} onChange={(v) => metti(c.nome, v)} />
                : <CampoRicerca {...base} valore={str(c.nome)} onChange={(v) => metti(c.nome, v)} />}
            </div>
          );
        }
        return (
          <div key={c.nome} className="filtro-slot">
            {c.tipo === 'cerca' ? (
              <label className="cerca">
                <Icona nome="cerca" />
                <input type="search" aria-label="Cerca" placeholder={c.placeholder ?? 'Cerca'} value={str(c.nome)} onChange={(e) => metti(c.nome, e.target.value)} />
              </label>
            ) : c.tipo === 'segmenti' ? (
              <div className="segmenti" role="tablist">
                {c.opzioni!.map((o) => (
                  <button key={o.value} type="button" role="tab" aria-selected={str(c.nome) === String(o.value)} onClick={() => metti(c.nome, String(o.value))}>
                    {o.label}{o.n != null && <span className="n">{o.n}</span>}
                  </button>
                ))}
              </div>
            ) : (() => {
              const sel = (
                <select className="filtro-select" aria-label={c.etichetta ?? c.nome} value={str(c.nome)} onChange={(e) => metti(c.nome, e.target.value)}>
                  {c.opzioni!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              );
              return c.etichetta ? <label className="filtro-etichetta"><span>{c.etichetta}</span>{sel}</label> : sel;
            })()}
          </div>
        );
      })}
      {riepilogo && <RiepilogoFiltri voci={voci} attivi={conta} onAzzera={azzera} />}
    </div>
  );
}
