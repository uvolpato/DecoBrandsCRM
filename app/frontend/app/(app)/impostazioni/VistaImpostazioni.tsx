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

interface CampoRisposta { nome: string; etichetta: string; tipo: string; aiuto?: string; largo?: boolean; min?: number; max?: number; step?: number; opzioni?: { value: string; label: string }[]; gruppo?: string; valore?: unknown; impostata?: boolean }
interface Sezione { chiave: string; titolo: string; sotto: string; campi: CampoRisposta[] }
// Parametri del .env del server (D-70): si mostrano in sola lettura, non si modificano da qui.
interface ParametroServer { nome: string; uso: string; sezioni: string[]; impostato: boolean; valore: string | null }

const PROVABILE = ['casella', 'lettura', 'posta', 'integra'];

export function VistaImpostazioni() {
  const { sezione } = useParams<{ sezione: string }>();
  const [sezioni, setSezioni] = useState<Sezione[] | null>(null);
  const [ambiente, setAmbiente] = useState<ParametroServer[]>([]);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [prova, setProva] = useState<{ ok: boolean; testo: string } | null>(null);
  const [connettore, setConnettore] = useState('');
  const sagome = useSagome(!sezioni);

  const carica = useCallback(async () => {
    const r = await api<{ sezioni: Sezione[]; ambiente: ParametroServer[] }>('impostazioni');
    if (r.ok) { setSezioni(r.dati.sezioni); setAmbiente(r.dati.ambiente ?? []); setErrore(''); }
    else if (!sezioni) setErrore(r.messaggio); else avviso(r.messaggio, true);
  }, [sezioni]);

  useEffect(() => { void carica(); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- una volta all'apertura

  const sez = sezioni?.find((s) => s.chiave === sezione) ?? sezioni?.[0];

  // il modello scelto decide quali parametri si vedono e si salvano (D-68)
  useEffect(() => {
    const scelto = sez?.campi.find((c) => c.nome === 'connettore')?.valore;
    setConnettore(typeof scelto === 'string' ? scelto : '');
  }, [sez?.chiave]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al cambio sezione
  const visibili = sez ? sez.campi.filter((c) => !c.gruppo || c.gruppo === connettore) : [];
  const parametri = sez ? ambiente.filter((p) => p.sezioni.includes(sez.chiave)) : [];

  const salva = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!sez) return;
    const fd = new FormData(ev.currentTarget);
    const valori: Record<string, unknown> = {};
    for (const c of visibili) {
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
          <form key={sez.chiave} className="modulo modulo-2" onSubmit={salva} noValidate>
            {visibili.map((c) => c.tipo === 'password' ? (
              <Campo key={c.nome} nome={c.nome} etichetta={c.etichetta} tipo="password" completa="new-password" valore=""
                segnaposto={c.impostata ? '•••••••• impostata · scrivi per sostituirla' : 'non impostata'} aiuto="Lascia vuoto per non cambiarla." />
            ) : (
              <Campo key={c.nome} nome={c.nome} etichetta={c.etichetta} tipo={c.tipo as 'testo' | 'numero' | 'email' | 'select'}
                valore={typeof c.valore === 'number' || typeof c.valore === 'string' ? c.valore : undefined}
                opzioni={c.opzioni} aiuto={c.aiuto} largo={c.largo} min={c.min} max={c.max} step={c.step}
                onCambia={c.nome === 'connettore' ? setConnettore : undefined} />
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
          {parametri.length > 0 && (
            <div className="nota" style={{ marginTop: 16 }}>
              <b>Parametri del server (file .env)</b>
              <p style={{ margin: '4px 0' }}>
                Si leggono qui e <b>non si modificano da questa pagina</b>: si cambiano nel file{' '}
                <code>app/backend/.env</code> sul server, poi si riavvia il backend.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {parametri.map((p) => (
                  <li key={p.nome}>
                    <code>{p.nome}</code> — {p.uso}{' '}
                    <span style={p.impostato ? undefined : { color: 'var(--errore-testo, #842029)' }}>
                      {p.impostato ? 'impostato' : 'mancante'}
                    </span>
                    {p.valore ? ' · ' + p.valore : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Pannello>
      </div>
    </Pagina>
  );
}
