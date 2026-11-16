'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { caricaVoci, type Contesto, type Entita } from '@/lib/entita';
import { data as formattaData } from '@/lib/formati';
import { CampoRicerca } from './CampoRicerca';
import { Icona } from './Icona';
import { RiepilogoFiltri, type VoceRiepilogo } from './RiepilogoFiltri';
import { Sagoma } from './Sagoma';

// Barra dei filtri come CRM.FilterBar del prototipo (D-22 §19), stesso markup .filtri.
// Tipi: 'cerca' (testo) · 'segmenti' · 'select' (tendina, solo per scelte fisse: periodo, mese) ·
// 'data' (Dal / Al) · 'ricerca' (campo di ricerca su un'entità). REGOLA: i filtri su fornitori, subagenti, clienti (e ogni
// altra entità) sono sempre 'ricerca' con multipla: true, mai tendine; con due o più filtri la barra ha il
// riepilogo (`riepilogo`). Il valore di una ricerca multipla è l'elenco delle chiavi.
// REGOLA dei conteggi (D-23): il numero `n` di ogni segmento conta le righe con TUTTI gli altri filtri
// applicati (ricerca, fornitore, …) tranne il segmento stesso: chi usa la barra lo ricalcola a ogni cambio.
// Il fuoco dei campi è un bordo interno (stile `.filtro-select` in `stile.css`): un outline esterno
// finirebbe sotto il menu aperto, tendina nativa o ricerca (D-64).
export type Valori = Record<string, string | string[]>;
export interface CampoFiltro {
  nome: string;
  tipo: 'cerca' | 'segmenti' | 'select' | 'data' | 'ricerca';
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

export function FilterBar<V extends Valori>({ campi, valori, onChange, riepilogo, caricando, classe }: {
  campi: CampoFiltro[]; valori: V; onChange: (v: V) => void;
  riepilogo?: boolean | { prima: VoceRiepilogo[] }; // icone Riepilogo dei filtri e Togli tutti i filtri in fondo
  caricando?: boolean; // i numeri dei segmenti non sono ancora arrivati: sagome (D-59)
  classe?: string; // classi in più sul contenitore .filtri (es. filtri-entita dell'Analisi)
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
      const testo = c.tipo === 'ricerca' ? nome(s) : c.tipo === 'cerca' ? '“' + s + '”'
        : c.tipo === 'data' ? formattaData(s) : c.opzioni!.find((o) => String(o.value) === s)?.label ?? s;
      voci.push({
        etichetta: et, vuoto: c.tipo === 'cerca' ? 'nessuna' : 'tutti',
        valori: attivo && s ? [{ testo, togli: () => metti(c.nome, d) }] : c.tipo === 'segmenti' || c.tipo === 'select' ? [{ testo }] : [],
      });
    });
  }
  const azzera = () => onChange({ ...valori, ...Object.fromEntries(attivi.map((c) => [c.nome, predef(c)])) });

  // segmenti resi due volte: i visibili (quando non stretta) e il clone nascosto per misurarne la larghezza
  // naturale (sempre nel DOM, fuori dal flusso), così la misura non dipende dallo scambio segmenti/tendina.
  // Il clone usa la classe propria `segmenti-misura` e nessun role/.n: invisibile a screen reader e selettori.
  const segmenti = (c: CampoFiltro, nascosto: boolean) => (
    <div className={nascosto ? 'segmenti-misura' : 'segmenti'} role={nascosto ? undefined : 'tablist'} aria-hidden={nascosto || undefined}>
      {c.opzioni!.map((o) => (
        <button key={o.value} type="button" role={nascosto ? undefined : 'tab'} aria-selected={nascosto ? undefined : str(c.nome) === String(o.value)} tabIndex={nascosto ? -1 : undefined} onClick={() => metti(c.nome, String(o.value))}>
          {o.label}{(o.n != null || caricando) && <span className="n">{caricando ? <Sagoma larghezza={14} altezza={9} /> : o.n}</span>}
        </button>
      ))}
    </div>
  );

  // Segmenti → tendina quando non stanno su una riga (Ugo 15/11/2026). La decisione dipende SOLO da due
  // grandezze che non cambiano con lo scambio: la larghezza del contenitore (osservato solo lui, mai i
  // figli) e la larghezza necessaria = segmenti a larghezza naturale (clone) + gli altri controlli a
  // larghezza naturale + spazi, misurata una volta e quando cambiano voci e numeri. Niente misure che
  // leggono la barra visibile dopo lo scambio, né setState se il valore non cambia.
  const [stretta, setStretta] = useState(false);
  const strettaRef = useRef(false);
  const necessariaRef = useRef(0);
  const cont = useRef<HTMLDivElement>(null);

  const decidi = (larghezza: number) => {
    // isteresi: si compatta sotto la soglia, si torna ai segmenti solo con +24 px di margine
    const deve = strettaRef.current ? larghezza < necessariaRef.current + 24 : larghezza < necessariaRef.current;
    if (deve === strettaRef.current) return;
    strettaRef.current = deve;
    setStretta(deve);
  };

  const campoSeg = campi.find((c) => c.tipo === 'segmenti');
  const chiaveMisura = campoSeg ? campoSeg.nome + ':' + JSON.stringify(campoSeg.opzioni) + ':' + JSON.stringify(valori) : '';

  // larghezza necessaria, misurata una volta e quando cambiano voci e numeri (chiaveMisura)
  useLayoutEffect(() => {
    const el = cont.current;
    const clone = el?.querySelector<HTMLElement>('.segmenti-misura');
    if (!el || !clone) return;
    const slot = el.querySelector<HTMLElement>('.segmenti, .segmenti-select');
    // Larghezza necessaria = tutti i controlli al loro flex-basis. Con width:max-content i campi con
    // width:100% (cerca, ricerca) misurerebbero il contenuto dell'input, non il flex-basis, e con
    // flex-shrink/grow attivi la somma sottostima la barra: i segmenti andrebbero a capo senza tendina
    // (Soggetti 15/11/2026). Qui si misurano i figli a niente crescita né ritiro.
    const figli = Array.from(el.children).flatMap((c) =>
      c.classList.contains('filtro-slot')
        ? Array.from(c.children).filter((x) => !x.classList.contains('segmenti-misura'))
        : [c],
    ) as HTMLElement[];
    const salva = figli.map((f) => [f, f.style.flexGrow, f.style.flexShrink] as const);
    figli.forEach((f) => { f.style.flexGrow = '0'; f.style.flexShrink = '0'; });
    const prima = el.style.width;
    el.style.width = 'max-content';
    const naturale = el.scrollWidth;
    const slotLar = slot ? slot.offsetWidth : 0;
    const cloneLar = clone.offsetWidth;
    el.style.width = prima;
    salva.forEach(([f, g, s]) => { f.style.flexGrow = g; f.style.flexShrink = s; });
    necessariaRef.current = naturale + cloneLar - slotLar;
    decidi(el.clientWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- si rimisura solo su voci e numeri (chiaveMisura)
  }, [chiaveMisura]);

  // osserva solo il contenitore (larghezza stabile rispetto allo scambio), mai i figli
  useEffect(() => {
    const el = cont.current;
    if (!el) return;
    const ro = new ResizeObserver(() => decidi(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- il callback usa solo ref stabili
  }, []);

  return (
    <div ref={cont} className={'filtri' + (riepilogo ? ' con-riepilogo' : '') + (classe ? ' ' + classe : '')}>
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
              <>
                {!stretta && segmenti(c, false)}
                {stretta && (
                  <select className="filtro-select segmenti-select" aria-label={c.etichetta ?? 'Stato'} value={str(c.nome)} onChange={(e) => metti(c.nome, e.target.value)}>
                    {c.opzioni!.map((o) => <option key={o.value} value={o.value}>{o.label}{o.n != null ? ` (${o.n})` : ''}</option>)}
                  </select>
                )}
                {segmenti(c, true)}
              </>
            ) : c.tipo === 'data' ? (
              <label className="filtro-etichetta"><span>{c.etichetta}</span>
                <input type="date" className="filtro-select" aria-label={c.etichetta ?? c.nome} value={str(c.nome)} onChange={(e) => metti(c.nome, e.target.value)} />
              </label>
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
