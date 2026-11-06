'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Campo } from '@/componenti/Campo';
import { ElencoSelezionabile } from '@/componenti/Flussi';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { api } from '@/lib/api';

// Impostazioni (§7.15, D-65), come vistaImpostazioni del prototipo (viste-gestione.js): sezioni a
// sinistra, modulo della sezione a destra con *Salva* e *Prova la connessione*. I metadati dei campi
// arrivano dal server (niente riscritti qui); le password non si rileggono: si scrivono solo per
// sostituirle. I controlli veri li fa il server (V12).

interface CampoRisposta { nome: string; etichetta: string; tipo: string; aiuto?: string; largo?: boolean; min?: number; max?: number; step?: number; valore?: unknown; impostata?: boolean }
interface Sezione { chiave: string; titolo: string; sotto: string; campi: CampoRisposta[] }

const PROVABILE = ['casella', 'lettura', 'posta', 'integra'];

export function VistaImpostazioni() {
  const { sezione } = useParams<{ sezione: string }>();
  const [sezioni, setSezioni] = useState<Sezione[] | null>(null);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [prova, setProva] = useState<{ ok: boolean; testo: string } | null>(null);
  const sagome = useSagome(!sezioni);

  const carica = useCallback(async () => {
    const r = await api<{ sezioni: Sezione[] }>('impostazioni');
    if (r.ok) { setSezioni(r.dati.sezioni); setErrore(''); }
    else if (!sezioni) setErrore(r.messaggio); else avviso(r.messaggio, true);
  }, [sezioni]);

  useEffect(() => { void carica(); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- una volta all'apertura

  const sez = sezioni?.find((s) => s.chiave === sezione) ?? sezioni?.[0];

  const salva = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!sez) return;
    const fd = new FormData(ev.currentTarget);
    const valori: Record<string, unknown> = {};
    for (const c of sez.campi) {
      const v = fd.get(c.nome);
      if (c.tipo === 'password') { const t = String(v ?? '').trim(); if (t) valori[c.nome] = t; }
      else if (c.tipo === 'numero') { const t = String(v ?? '').trim(); valori[c.nome] = t === '' ? '' : Number(t); }
      else valori[c.nome] = String(v ?? '').trim();
    }
    setAttesa(true);
    const r = await api('impostazioni/' + sez.chiave, { valori }, 'PUT');
    setAttesa(false);
    if (r.ok) { setProva(null); avviso('Impostazioni salvate'); await carica(); }
    else avviso(r.messaggio, true);
  };

  const provaConnessione = async () => {
    if (!sez) return;
    setProva(null);
    const r = await api<{ ok: boolean; testo: string }>('impostazioni/' + sez.chiave + '/prova', {});
    if (r.ok) setProva(r.dati);
    else avviso(r.messaggio, true);
  };

  if (!sez) {
    return (
      <Pagina titolo="Impostazioni" pieno
        sottotitolo="Valgono per tutti gli utenti. Le password non si rileggono: si sostituiscono. Ogni modifica resta nel registro eventi.">
        {errore
          ? <Pannello><div className="vuoto"><b>Impostazioni non caricate</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>
          : sagome && <Pannello riempi><div className="modulo modulo-2">{Array.from({ length: 6 }, (_, i) => <Sagoma key={i} altezza={20} larghezza={i % 3 === 0 ? '100%' : '60%'} />)}</div></Pannello>}
      </Pagina>
    );
  }

  return (
    <Pagina titolo="Impostazioni" pieno
      sottotitolo="Valgono per tutti gli utenti. Le password non si rileggono: si sostituiscono. Ogni modifica resta nel registro eventi.">
      <div className="colonne riempi" style={{ '--colonne': 'minmax(240px,0.6fr) minmax(0,2fr)' } as CSSProperties}>
        <Pannello titolo="Sezioni" riempi>
          <ElencoSelezionabile selezionata={sez.chiave}
            voci={sezioni!.map((s) => ({ id: s.chiave, href: '/impostazioni/' + s.chiave, titolo: s.titolo, sotto: s.sotto }))} />
        </Pannello>
        <Pannello titolo={sez.titolo} nota={sez.sotto} riempi>
          <form className="modulo modulo-2" onSubmit={salva} noValidate>
            {sez.campi.map((c) => c.tipo === 'password' ? (
              <Campo key={c.nome} nome={c.nome} etichetta={c.etichetta} tipo="password" completa="new-password" valore=""
                segnaposto={c.impostata ? '•••••••• impostata · scrivi per sostituirla' : 'non impostata'} aiuto="Lascia vuoto per non cambiarla." />
            ) : (
              <Campo key={c.nome} nome={c.nome} etichetta={c.etichetta} tipo={c.tipo as 'testo' | 'numero' | 'email'}
                valore={typeof c.valore === 'number' || typeof c.valore === 'string' ? c.valore : undefined}
                aiuto={c.aiuto} largo={c.largo} min={c.min} max={c.max} step={c.step} />
            ))}
            <div className="modulo-errore" style={{ gridColumn: '1 / -1' }}>
              <div className="azioni-riga">
                <button type="submit" className="btn" disabled={attesa}>{attesa ? 'Attendi…' : 'Salva ' + sez.titolo.toLowerCase()}</button>
                {PROVABILE.includes(sez.chiave) && (
                  <button type="button" className="btn sec" onClick={() => void provaConnessione()}>Prova la connessione</button>
                )}
              </div>
              {PROVABILE.includes(sez.chiave) && <Nota>La prova usa i valori salvati.</Nota>}
              {prova && <p className={'nota' + (prova.ok ? '' : ' nota-errore')} role="status">{prova.testo}</p>}
            </div>
          </form>
        </Pannello>
      </div>
    </Pagina>
  );
}
