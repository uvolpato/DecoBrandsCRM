'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Aggiornamenti } from '@/componenti/Aggiornamenti';
import { Campo } from '@/componenti/Campo';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { Caricamento, Matrice } from '@/componenti/Flussi';
import { Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { mpiu, PeriodoMesi } from '@/componenti/PeriodoMesi';
import { SollecitiBollettino } from '@/componenti/Solleciti';
import { avviso, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, SagomaMatrice, useSagome } from '@/componenti/Sagoma';
import { usePuo } from '@/componenti/Utente';
import { api, caricaPdf } from '@/lib/api';
import { fornitore } from '@/lib/entita';
import { useEventi } from '@/lib/eventi';
import { data, euro } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Bollettini (F3-A1, §7.7): matrice fornitore × 6 mesi (D-16) e caricamento. Stato, importi e conteggi
// arrivano dal server (V12); qui si compone soltanto. Le celle arrivano/gia verificate portano al
// dettaglio (F3-A2).
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const etichetta = (k: string) => MESI[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);

type StatoCella = 'arrivato' | 'verificato' | 'contestato' | 'atteso' | 'ritardo' | 'in_corso' | 'nessuno';
interface Cella { mese: string; stato: StatoCella; bollettino_id: string | null; importo: number | null; entro: string | null }
interface Riga { id: string; fornitore: string; maturazione: string; celle: Cella[] }
interface Risposta {
  da: string; al: string; primo: string; ultimo: string; colonne: string[];
  fornitori: Riga[]; conteggi: { tutti: number; dafare: number };
}

const BADGE: Record<string, { testo: string; v: Variante }> = {
  verificato: { testo: 'Verificato', v: 'ok' },
  contestato: { testo: 'Contestato', v: 'errore' },
  arrivato: { testo: 'Arrivato', v: 'attesa' },
};

export function VistaBollettini() {
  const puo = usePuo();
  const puoModifica = puo('provvigioni.modifica');
  const [valori, setValori] = useMemoria<Valori>('filtri', { fornitori: [], vista: 'tutti' });
  const [periodo, setPeriodo] = useMemoria<{ da: string; a: string }>('periodo', { da: '', a: '' });
  const [dati, setDati] = useState<Risposta | null>(null);
  const [inAttesa, setInAttesa] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [carica, setCarica] = useState(false);
  const [sollecito, setSollecito] = useState<{ fornitoreId: string; anno: number; mese: number } | null>(null);
  const [versione, setVersione] = useState(0);
  const [caricando, setCaricando] = useState(true);
  const sagome = useSagome(caricando);
  const eventi = useEventi();
  // anche i documenti: una fattura nuova cambia le celle "atteso" / "nessuna fattura"
  const vEventi = (eventi.bollettini ?? 0) + (eventi.documenti ?? 0);
  const vVista = useRef(vEventi);

  const parametri = () => {
    const p = new URLSearchParams();
    if (periodo.a) p.set('al', periodo.a);
    const scelte = (valori.fornitori as string[] | undefined) ?? [];
    if (scelte.length) p.set('fornitori', scelte.join(','));
    p.set('vista', String(valori.vista ?? 'tutti'));
    return p;
  };

  useEffect(() => {
    let vivo = true;
    setCaricando(true);
    void api<Risposta>('bollettini?' + parametri().toString()).then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) {
        setDati(r.dati);
        setInAttesa(null);
        setErrore('');
      } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri sono valori (valori, periodo, versione)
  }, [valori, periodo, versione]);

  // aggiornamenti dal server (F4-A6, D-23): contatori subito, matrice ferma; se è cambiata compare la barra
  useEffect(() => {
    if (vEventi === vVista.current) return;
    vVista.current = vEventi;
    if (!dati) return;
    let vivo = true;
    void api<Risposta>('bollettini?' + parametri().toString(), undefined, undefined, { automatico: true }).then((r) => {
      if (!vivo || !r.ok) return;
      setDati((d) => (d ? { ...d, conteggi: r.dati.conteggi } : d));
      setInAttesa(JSON.stringify(dati.fornitori) === JSON.stringify(r.dati.fornitori) ? null : r.dati);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'evento, con i filtri di adesso
  }, [vEventi]);

  const applica = () => {
    if (!inAttesa) return;
    setDati(inAttesa);
    setInAttesa(null);
  };

  const da = periodo.da || dati?.da || '';
  const a = periodo.a || dati?.al || '';
  const primo = dati?.primo ?? a, ultimo = dati?.ultimo ?? a;
  const sposta = (n: number) => setPeriodo({ da: mpiu(da, n), a: mpiu(a, n) });

  const cella = (c: Cella, fornitoreId: string) => {
    const b = BADGE[c.stato];
    if (b && c.bollettino_id) {
      return { href: '/bollettini/' + c.bollettino_id, stato: <Stato v={b.v}>{b.testo}</Stato>, valore: euro(c.importo ?? 0) };
    }
    if (c.stato === 'ritardo') {
      return {
        stato: <Stato v="errore">Non arrivato</Stato>,
        ...(puoModifica ? {
          azione: {
            etichetta: 'Sollecita',
            onClick: () => setSollecito({ fornitoreId, anno: Number(c.mese.slice(0, 4)), mese: Number(c.mese.slice(5, 7)) }),
          },
        } : {}),
      };
    }
    if (c.stato === 'atteso') return { stato: <Stato v="neutro">Atteso entro il {data(c.entro).slice(0, 5)}</Stato> };
    if (c.stato === 'in_corso') return { vuota: 'Mese in corso' };
    return { vuota: 'Nessuna fattura' };
  };

  return (
    <Pagina titolo="Bollettini" sottotitolo="Ogni mese ogni fornitore ci comunica le provvigioni che ci riconosce. Qui vedi quali sono arrivati e quali vanno ancora verificati."
      azioni={puo('provvigioni.modifica') ? [{ etichetta: 'Carica un bollettino', icona: 'carica', onClick: () => setCarica(true) }] : []}>
      <div className="pila" aria-busy={(!dati && sagome) || undefined}>
        <div className="barra-periodo">
          {dati && <PeriodoMesi da={da} mesi={6} primo={primo} ultimo={ultimo} onChange={(d, a2) => setPeriodo({ da: d, a: a2 })} />}
          {!dati && sagome && <Sagoma larghezza={180} altezza={34} arrotondato={8} />}
          <div className="sposta-periodo">
            <button type="button" className="btn sec piccolo" title="Sposta il periodo di un mese indietro" disabled={!dati || da <= primo} onClick={() => sposta(-1)}>‹</button>
            <button type="button" className="btn sec piccolo" title="Sposta il periodo di un mese avanti" disabled={!dati || a >= ultimo} onClick={() => sposta(1)}>›</button>
          </div>
          <FilterBar valori={valori} onChange={setValori} caricando={sagome && !dati} riepilogo={{ prima: [{ etichetta: 'Periodo', testo: da && a ? etichetta(da) + ' – ' + etichetta(a) : '' }] }} campi={[
            { nome: 'fornitori', tipo: 'ricerca', entita: fornitore, multipla: true, etichetta: 'Fornitore', placeholder: 'Tutti i fornitori' },
            {
              nome: 'vista', tipo: 'segmenti', etichetta: 'Vista', opzioni: [
                { value: 'tutti', label: 'Tutti', n: dati?.conteggi.tutti },
                { value: 'dafare', label: 'Con qualcosa da fare', n: dati?.conteggi.dafare },
              ],
            },
          ]} />
        </div>

        {inAttesa && <Aggiornamenti onAggiorna={applica} />}

        {errore && !dati ? <Pannello><div className="vuoto"><b>Bollettini non caricati</b>{errore}</div></Pannello>
          : !dati ? (sagome ? <SagomaMatrice righe={6} colonne={6} /> : null)
            : !dati.fornitori.length
              ? <Pannello><div className="vuoto"><b>Nessun fornitore con qualcosa da fare in questo periodo</b>Scegli “Tutti” o cambia i mesi.</div></Pannello>
              : <Matrice angolo="Fornitore" colonne={dati.colonne.map(etichetta)}
                  righe={dati.fornitori.map((f) => ({ titolo: f.fornitore, sotto: 'paga sul ' + f.maturazione, celle: f.celle.map((c) => cella(c, f.id)) }))} />}

        <Nota>Un bollettino è atteso per ogni mese chiuso in cui il fornitore ci ha fatturato qualcosa. Le righe si confrontano con quanto calcoliamo dalle pratiche: le differenze vanno accettate o contestate prima di chiudere il bollettino. Si vedono al massimo 6 mesi alla volta.</Nota>
      </div>

      {carica && <FinestraCarica onChiudi={() => setCarica(false)} onCaricato={() => { setCarica(false); setVersione((v) => v + 1); }} />}
      {sollecito && <SollecitiBollettino fornitoreId={sollecito.fornitoreId} anno={sollecito.anno} mese={sollecito.mese}
        onChiudi={() => setSollecito(null)} onCopiato={() => { setSollecito(null); setVersione((v) => v + 1); }} />}
    </Pagina>
  );
}

/** Carica un bollettino (§7.7): il PDF passa prima dal canale comune, poi si lega al fornitore/mese. */
function FinestraCarica({ onChiudi, onCaricato }: { onChiudi: () => void; onCaricato: () => void }) {
  const oggi = new Date();
  const prima = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [arrivo, setArrivo] = useState<number | null>(null);

  async function invia(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);
    const fornitore = String(fd.get('fornitore') ?? '');
    const anno = String(fd.get('anno') ?? '');
    const mese = String(fd.get('mese') ?? '');
    if (!fornitore) { setErrore('Scegli il fornitore.'); return; }
    if (!file) { setErrore('Scegli il PDF del bollettino.'); return; }
    setErrore(''); setAttesa(true);
    try {
      let id = arrivo;
      if (!id) {
        const c = await caricaPdf(file);
        if (!c.ok) { setErrore(c.messaggio); return; }
        id = Number(c.dati.id);
        setArrivo(id);
      }
      const r = await api('bollettini', { fornitore_id: Number(fornitore), anno: Number(anno), mese: Number(mese), arrivo_id: id });
      if (!r.ok) { setErrore(r.messaggio); return; }
      avviso('Bollettino caricato: va verificato.');
      onCaricato();
    } finally {
      setAttesa(false);
    }
  }

  const anni = [prima.getFullYear(), oggi.getFullYear()];
  return (
    <Modale titolo="Carica un bollettino" onChiudi={() => { if (!attesa) onChiudi(); }} piede={<>
      <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
      <button type="submit" form="carica-bollettino" className="btn" disabled={attesa}>{attesa ? 'Attendi…' : 'Carica'}</button>
    </>}>
      <form id="carica-bollettino" className="modulo modulo-2" onSubmit={invia} noValidate>
        <Campo nome="fornitore" etichetta="Fornitore" tipo="ricerca" entita={fornitore} largo />
        <Campo nome="mese" etichetta="Mese" tipo="select" valore={String(prima.getMonth() + 1)}
          opzioni={MESI.map((m, i) => ({ value: String(i + 1), label: m }))} />
        <Campo nome="anno" etichetta="Anno" tipo="select" valore={String(prima.getFullYear())}
          opzioni={anni.map((y) => ({ value: String(y), label: String(y) }))} />
        <div className="campo largo">
          <label>PDF del bollettino</label>
          <Caricamento titolo="Allega il PDF" testo="Un file PDF; il server controlla che sia un PDF."
            accetta="application/pdf,.pdf" onFile={(f) => { setFile(f[0] ?? null); setArrivo(null); }} />
          {file && <span className="aiuto">{file.name}</span>}
        </div>
        <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
      </form>
    </Modale>
  );
}
