'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Aggiornamenti } from '@/componenti/Aggiornamenti';
import { Elenco, GruppiDaFare, Periodi, type GruppoDaFare } from '@/componenti/Flussi';
import { Cifre, KpiRow, type Kpi } from '@/componenti/Kpi';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso } from '@/componenti/Piccoli';
import { Sagoma, SagomaRiquadri, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { SollecitiConferme, SollecitiPagamento } from '@/componenti/Solleciti';
import { usePuo } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { useEventi } from '@/lib/eventi';
import { data } from '@/lib/formati';

// Oggi (F5-A1, §7.1): i quattro riquadri filtrano la lista, i gruppi si aprono e chiudono, la
// colonna destra guarda avanti. Numeri, testi e scadenze arrivano dal server (V12); qui si compone.
// Contatori dal vivo (D-23): i riquadri si aggiornano da soli, i gruppi solo con *Aggiorna*.

interface Riquadro extends Kpi { disponibile?: boolean }
interface Voce { tipo: 'errore' | 'attesa' | 'primario'; titolo: string; dettaglio: string; href: string; azione: string; extra?: string }
interface Gruppo {
  id: string; titolo: string; variante: string; tipo: 'errore' | 'attesa' | 'primario'; disponibile: boolean;
  conta: number; sommario?: string; vuoto?: string; voci: Voce[];
}
interface Scadenza { data: string; testo: string; dettaglio: string; href: string; giorni: number }
interface Operazione { testo: string; quando: string; chi: string }
interface Trimestre {
  anno: number; trimestre: number; nome: string; etichetta: string; avanzamento: number | null; giorni: number;
  atteso: number; riconosciuto: number; da_liquidare: number; bloccato: number; href: string;
}
interface Dati {
  oggi: string; aggiornato_il: string; sottotitolo: string;
  riquadri: Riquadro[]; gruppi: Gruppo[]; scadenze: Scadenza[]; operazioni: Operazione[];
  registro_href: string; trimestre: Trimestre;
}

export function VistaOggi() {
  const puo = usePuo();
  const [dati, setDati] = useState<Dati | null>(null);
  const [inAttesa, setInAttesa] = useState<Dati | null>(null);
  const [errore, setErrore] = useState('');
  const [filtro, setFiltro] = useState<string | null>(null);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [caricando, setCaricando] = useState(true);
  const sagome = useSagome(caricando);
  const eventi = useEventi();
  const vEventi = Object.values(eventi).reduce((n, x) => n + x, 0);
  const vVista = useRef(vEventi);

  useEffect(() => {
    let vivo = true;
    void api<Dati>('oggi').then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
  }, []);

  // D-23: riquadri, scadenze, operazioni e trimestre subito; i gruppi restano finché non si clicca
  useEffect(() => {
    if (vEventi === vVista.current) return;
    vVista.current = vEventi;
    if (!dati) return;
    let vivo = true;
    void api<Dati>('oggi').then((r) => {
      if (!vivo || !r.ok) return;
      setDati((d) => d && {
        ...d, riquadri: r.dati.riquadri, scadenze: r.dati.scadenze, operazioni: r.dati.operazioni,
        trimestre: r.dati.trimestre, aggiornato_il: r.dati.aggiornato_il, sottotitolo: r.dati.sottotitolo,
      });
      setInAttesa(JSON.stringify(dati.gruppi) === JSON.stringify(r.dati.gruppi) ? null : r.dati);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'evento, con i dati di adesso
  }, [vEventi]);

  const applica = () => {
    if (!inAttesa) return;
    setDati(inAttesa);
    setInAttesa(null);
  };

  const chiudi = () => setFinestra(null);
  const gruppi: GruppoDaFare[] = (dati?.gruppi ?? []).map((g) => ({
    id: g.id, titolo: g.titolo, variante: g.variante, conta: g.conta, sommario: g.sommario, vuoto: g.vuoto,
    voci: g.voci.map((v) => ({
      tipo: v.tipo, titolo: v.titolo, dettaglio: v.dettaglio, href: v.href, azione: v.azione,
      extra: v.extra ? <span className="giorni">{v.extra}</span> : undefined,
    })),
    azioni: g.id === 'conferme' && g.conta
      ? [{ etichetta: 'Prepara i solleciti', icona: 'posta', variante: 'primario', onClick: () => setFinestra(<SollecitiConferme onChiudi={chiudi} />) }]
      : g.id === 'documenti' ? [{ etichetta: 'Apri la coda', href: '/documenti' }]
        : g.id === 'bollettini' ? [{ etichetta: 'Apri bollettini', href: '/bollettini' }]
          : g.id === 'pagamenti' && g.conta && puo('provvigioni.modifica')
            ? [{ etichetta: 'Prepara i solleciti', icona: 'posta', variante: 'primario', onClick: () => setFinestra(<SollecitiPagamento onChiudi={chiudi} />) }]
            : [],
  }));

  if (!dati) {
    return (
      <Pagina titolo="Oggi" pieno>
        {errore
          ? <Pannello><div className="vuoto"><b>Oggi non caricato</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => location.reload()}>Riprova</button></div></Pannello>
          : sagome && (
            <div className="pila riempi" aria-busy="true">
              <SagomaRiquadri n={4} />
              <div className="colonne riempi">
                <Pannello riempi senzaMargine>
                  <div className="pila" style={{ padding: 18 }}>
                    {Array.from({ length: 5 }, (_, i) => <Sagoma key={i} larghezza="100%" altezza={54} />)}
                  </div>
                </Pannello>
                <div className="pila">
                  <Pannello><div className="pila">{Array.from({ length: 4 }, (_, i) => <Sagoma key={i} larghezza="90%" altezza={18} />)}</div></Pannello>
                  <Pannello titolo="Trimestre in corso"><div className="pila">{Array.from({ length: 4 }, (_, i) => <Sagoma key={i} larghezza="85%" altezza={20} />)}</div></Pannello>
                </div>
              </div>
            </div>
          )}
      </Pagina>
    );
  }

  const t = dati.trimestre;
  return (
    <Pagina titolo="Oggi" pieno sottotitolo={dati.sottotitolo}>
      <KpiRow voci={dati.riquadri} selezionata={filtro} onSeleziona={setFiltro} />

      <div className="colonne riempi">
        <div className="pila riempi">
          {inAttesa && <Aggiornamenti onAggiorna={applica} />}
          <Pannello titolo="Da fare" nota="clic sul gruppo per aprirlo o chiuderlo" senzaMargine riempi>
            <GruppiDaFare gruppi={gruppi} filtro={filtro}
              vuoto={{ titolo: 'Tutto in ordine', testo: 'Nessun documento da abbinare, nessuna conferma in ritardo, nessun bollettino da verificare.' }} />
          </Pannello>
        </div>

        <div className="pila" style={{ overflow: 'auto', minHeight: 0 }}>
          <Pannello>
            <Schede memoria="oggi" schede={[
              {
                id: 'scadenze', etichetta: 'Prossime scadenze', conta: dati.scadenze.length, contenuto: () => (
                  <>
                    {dati.scadenze.length ? (
                      <ul className="scadenze">
                        {dati.scadenze.map((s) => (
                          <li key={s.data + s.testo}>
                            <span className="sc-data">{data(s.data).slice(0, 5)}
                              <small>{s.giorni === 0 ? 'oggi' : 'fra ' + s.giorni + ' gg'}</small></span>
                            <div><Link href={s.href}>{s.testo}</Link><span>{s.dettaglio}</span></div>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="testo-tenue" style={{ margin: 0 }}>Nessuna scadenza nei prossimi 15 giorni.</p>}
                    <Nota>Prossimi 15 giorni.</Nota>
                  </>
                ),
              },
              {
                id: 'operazioni', etichetta: 'Ultime operazioni', contenuto: () => (
                  <Elenco voci={dati.operazioni.map((o) => ({
                    testo: <><b>{o.testo}</b><span className="sec-riga">{o.quando} · {o.chi}</span></>,
                  }))} vuoto="Qui compaiono le operazioni fatte: abbinamenti, verifiche, liquidazioni." />
                ),
              },
            ]} />
          </Pannello>

          <Pannello titolo={`${t.trimestre}° trimestre ${t.anno}`} azioni={[{ etichetta: 'Apri liquidazione', variante: 'testo', href: t.href }]}>
            <Periodi etichetta="Trimestre in corso" voci={[{
              href: t.href, titolo: t.nome, sotto: t.etichetta, attivo: true,
              stato: t.giorni >= 0 ? `mancano ${t.giorni} giorni` : '',
              avanzamento: t.avanzamento ?? undefined,
            }]} />
            <Cifre voci={[
              { etichetta: 'Atteso dai fornitori', valore: t.atteso },
              { etichetta: 'Già riconosciuto nei bollettini', valore: t.riconosciuto },
              { etichetta: 'Da liquidare ai subagenti', valore: t.da_liquidare },
              { etichetta: 'Bloccato in attesa dei bollettini', valore: t.bloccato, variante: t.bloccato ? 'attesa' : undefined },
            ]} />
          </Pannello>
        </div>
      </div>

      {finestra}
    </Pagina>
  );
}
