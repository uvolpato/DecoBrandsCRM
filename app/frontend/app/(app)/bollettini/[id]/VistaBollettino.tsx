'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Campo } from '@/componenti/Campo';
import { Cerniera, type GruppoCerniera, type RigaCerniera } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { Conferma, Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { usePuo } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { documentoFornitore } from '@/lib/entita';
import { data, euro, euroSegno, pct } from '@/lib/formati';

// Dettaglio del bollettino a cerniera (F3-A2, §7.7): righe del fornitore contro il nostro calcolo,
// gruppi Da decidere · Decise · Quadrano · Incassi, decisioni (D-49, D-56), abbinamento a mano e
// chiusura (D-51). Il server dà numeri e scelte (V12); qui si compone e si mandano solo le scelte.

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const CATEG: Record<string, string> = {
  differenza: 'importo diverso', mancante: 'manca nel bollettino', sconosciuta: 'non è fra le nostre pratiche',
  storno: 'storno: il cliente non ha pagato', riaccredito: 'riaccredito: il cliente ha pagato',
  attesa_incasso: 'non ancora pagata dal cliente', pagata_dopo: 'pagata dopo',
};

interface Lato { imponibile: number; pct: number; importo: number }
interface Riga {
  id: string | null; documento_id: string | null; numero: string; data: string | null; tipo: string | null;
  pratica_id: string | null; cliente_id: string | null; cliente: string | null;
  categoria: string; gruppo: 'da_decidere' | 'decise' | 'quadrano' | 'incassi';
  loro: Lato | null; noi: Lato | null; differenza: number | null;
  aperta: boolean; incasso: boolean; pagamento: boolean; giorni: number | null;
  pagata_in: { id: string; mese: number; anno: number } | null;
  decisione: { esito: 'accettato' | 'contestato' | 'attendere'; motivo: string | null; da: string | null; da_nome?: string | null; il: string | null } | null;
  scelte: string[];
}
interface Dettaglio {
  id: string; fornitore_id: string; fornitore: string; maturazione: string; mese: number; anno: number;
  stato: string; badge: string; ricevuto: string; chiuso_il: string | null; chiuso_da: string | null; note: string | null;
  file: { arrivo_id: string; nome: string } | null; modificabile: boolean;
  righe: Riga[];
  totali: { riconosciuto: number; calcolato: number; differenza: number; aperte: number; contestate: number };
  azione: { tipo: 'decidi' | 'contesta' | 'verifica' | 'chiuso'; testo: string };
}

export function VistaBollettino({ id }: { id: string }) {
  const puo = usePuo();
  const [d, setD] = useState<Dettaglio | null>(null);
  const [errore, setErrore] = useState('');
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [bozza, setBozza] = useState<{ oggetto: string; testo: string } | null>(null);
  const puoModifica = puo('provvigioni.modifica');
  const sagome = useSagome(!d);

  const carica = useCallback(async () => {
    const r = await api<Dettaglio>('bollettini/' + id);
    if (r.ok) { setD(r.dati); setErrore(''); } else setErrore(r.messaggio);
  }, [id]);
  useEffect(() => { void carica(); }, [carica]);

  const chiudi = () => setFinestra(null);
  const salvato = (x: Dettaglio, testo: string) => { setD(x); avviso(testo); chiudi(); };

  if (!d) {
    return (
      <Pagina titolo="Bollettino" pieno>
        {errore
          ? <Pannello>
            <div className="vuoto"><b>Bollettino non caricato</b>{errore}
              <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button>
            </div>
          </Pannello>
          : sagome && (
            <div className="pila" aria-busy="true" style={{ flex: '1 1 auto', minHeight: 0 }}>
              <Sagoma larghezza="100%" altezza={44} />
              <div className="colonne riempi" style={{ '--colonne': 'minmax(300px, 0.8fr) minmax(0, 1.9fr)' } as React.CSSProperties}>
                <Pannello riempi><Sagoma larghezza="100%" altezza={420} /></Pannello>
                <div className="pila">
                  <Sagoma larghezza="100%" altezza={72} />
                  {Array.from({ length: 4 }, (_, i) => <Sagoma key={i} larghezza="100%" altezza={64} />)}
                </div>
              </div>
            </div>
          )}
      </Pagina>
    );
  }

  const modificabile = d.modificabile && puoModifica;
  const bollettinoId = d.id;
  const fornitoreId = d.fornitore_id;
  const conMancanti = d.righe.some((x) => x.categoria === 'mancante' || x.categoria === 'sconosciuta');
  const meseBollettino = `${d.anno}-${String(d.mese).padStart(2, '0')}`;

  const percorso = (x: Riga) => x.categoria === 'mancante'
    ? `bollettini/${d.id}/documenti/${x.documento_id}/decisione`
    : `bollettini/${d.id}/righe/${x.id}/decisione`;

  function decidi(x: Riga) {
    const esito = x.categoria === 'mancante' ? 'attendere' : 'accettato';
    apriDecisione(x, esito);
  }

  function apriDecisione(x: Riga, esito: 'accettato' | 'contestato' | 'attendere') {
    const T = {
      accettato: [`Accetta l’importo di ${x.numero}`, 'Registriamo il loro importo come corretto. Al subagente resta la provvigione calcolata sull’imponibile.', 'Conferma'],
      contestato: [`Contesta la riga ${x.numero}`, 'La riga finirà nella contestazione da inviare al fornitore.', 'Contesta'],
      attendere: [`Attendi il prossimo bollettino`, 'Il documento non c’è in questo bollettino: lo aspettiamo nel prossimo.', 'Conferma'],
    }[esito];
    setFinestra(
      <FormModal titolo={T[0]} testo={T[1]} conferma={T[2]} pericolo={esito === 'contestato'}
        campi={esito === 'attendere' ? [] : [{
          nome: 'motivo', etichetta: 'Motivo',
          aiuto: esito === 'contestato' ? 'Obbligatorio: comparirà nel testo della contestazione.' : 'Facoltativo, resta nello storico.',
        }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const r = await api<Dettaglio>(percorso(x), { decisione: esito, motivo: v.motivo || null }, 'PUT');
          if (!r.ok) return r.messaggio;
          salvato(r.dati, esito === 'contestato' ? 'Riga contestata' : esito === 'attendere' ? 'Al prossimo bollettino' : 'Importo accettato');
        }} />);
  }

  async function annullaDecisione(x: Riga) {
    const r = await api<Dettaglio>(percorso(x), { decisione: null }, 'PUT');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    salvato(r.dati, 'Decisione annullata');
  }

  function abbina(x: Riga) {
    setFinestra(
      <FormModal titolo={`Abbina la riga ${x.numero}`} conferma="Abbina"
        testo="Scegli il documento del fornitore che corrisponde davvero a questa riga. Il documento sta su una sola riga."
        campi={[{ nome: 'documento_id', etichetta: 'Documento', tipo: 'ricerca', entita: documentoFornitore, contesto: { fornitore_id: fornitoreId, mese: meseBollettino } }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.documento_id) return 'Scegli il documento.';
          const r = await api<Dettaglio>(`bollettini/${bollettinoId}/righe/${x.id}/documento`, { documento_id: Number(v.documento_id) }, 'PUT');
          if (!r.ok) return r.messaggio;
          salvato(r.dati, 'Riga abbinata al documento');
        }} />);
  }

  /** Scorre alla prima riga del gruppo Da decidere e la evidenzia un attimo (D-49, §7.7). */
  function vaiAllaPrima() {
    const x = document.querySelector<HTMLElement>('.cerniera [data-gruppo="Da decidere"] .c-riga');
    if (!x) return;
    x.scrollIntoView({ behavior: 'smooth', block: 'center' });
    x.classList.add('evidenzia');
    setTimeout(() => x.classList.remove('evidenzia'), 1600);
  }

  // Testo della contestazione calcolato dal server (V12): qui si copia o si scarica, non si salva.
  async function preparaContestazione() {
    const r = await api<{ oggetto: string; testo: string }>(`bollettini/${bollettinoId}/contestazione`);
    if (!r.ok) { avviso(r.messaggio, true); return; }
    setBozza(r.dati);
  }

  function copiaContestazione() {
    if (!bozza) return;
    const t = document.getElementById('contestazione-testo') as HTMLTextAreaElement | null;
    const ripiego = () => { t?.select(); document.execCommand('copy'); };
    try {
      void navigator.clipboard.writeText(bozza.testo).catch(ripiego);
    } catch {
      ripiego(); // browser senza appunti: si seleziona il testo e si copia
    }
    avviso('Testo copiato');
  }

  function scaricaContestazione() {
    if (!bozza) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bozza.oggetto + '\n\n' + bozza.testo], { type: 'text/plain;charset=utf-8' }));
    a.download = `contestazione-${meseBollettino}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function chiudiBollettino(stato: 'verificato' | 'contestato') {
    setFinestra(
      <Conferma titolo={stato === 'verificato' ? 'Segnare il bollettino come verificato?' : 'Segnare il bollettino come contestato?'}
        testo="Il mese diventa chiuso: le percentuali e i documenti di quel mese non si cambiano più."
        etichetta={stato === 'verificato' ? 'Segna come verificato' : 'Segna come contestato'} pericolo={stato === 'contestato'}
        onRisposta={(si) => {
          chiudi();
          if (!si) return;
          void api<Dettaglio>(`bollettini/${bollettinoId}/stato`, { stato }, 'PUT').then((r) => {
            if (!r.ok) { avviso(r.messaggio, true); return; }
            setD(r.dati);
            avviso(stato === 'verificato' ? 'Bollettino verificato' : 'Bollettino segnato come contestato');
          });
        }} />);
  }

  const esitoIncasso = (x: Riga): ReactNode => x.categoria === 'storno' ? <Stato v="errore">Non pagata</Stato>
    : x.categoria === 'riaccredito' ? <Stato v="ok">Pagata</Stato>
      : x.categoria === 'pagata_dopo' && x.pagata_in ? <Stato v="ok">Riconosciuta a {MESI_BREVI[x.pagata_in.mese - 1]}</Stato>
        : <Stato v="neutro">{(x.giorni ?? 0) + ' giorni'}</Stato>;

  const riga = (x: Riga): RigaCerniera => {
    const esitoDecisione = x.decisione && (x.decisione.esito === 'contestato' ? <Stato v="errore">Da contestare</Stato>
      : x.decisione.esito === 'attendere' ? <Stato v="neutro">Al prossimo bollettino</Stato>
        : <Stato v="ok">Accettata</Stato>);
    const azioni: RigaCerniera['azioni'] = [];
    if (modificabile) {
      if (x.decisione) {
        azioni.push({ etichetta: 'Annulla', variante: 'testo', onClick: () => void annullaDecisione(x) });
      } else {
        if (x.categoria === 'mancante') azioni.push({ etichetta: 'Attendi il prossimo', variante: 'sec', onClick: () => decidi(x) });
        else if (x.categoria !== 'quadra' && !x.incasso) azioni.push({ etichetta: 'Accetta il loro importo', variante: 'sec', onClick: () => decidi(x) });
        if (x.categoria !== 'quadra' && !x.incasso) azioni.push({ etichetta: 'Contesta', variante: 'pericolo', onClick: () => apriDecisione(x, 'contestato') });
        if (x.id && !x.incasso && (x.categoria !== 'quadra' || conMancanti)) {
          azioni.push({ etichetta: 'Abbina il documento', variante: 'testo', onClick: () => abbina(x) });
        }
      }
    }
    return {
      titolo: x.pratica_id ? <Link href={'/pratiche/' + x.pratica_id}><b>{x.numero}</b></Link> : <b>{x.numero}</b>,
      dettagli: <>
        {x.cliente ? (x.pratica_id ? <Link href={'/pratiche/' + x.pratica_id}>{x.cliente}</Link> : x.cliente) : ''}
        {x.cliente ? ' · ' : ''}{x.data ? data(x.data) : 'senza data'}
        {CATEG[x.categoria] && !x.incasso && x.categoria !== 'quadra' ? ' · ' + CATEG[x.categoria] : ''}
        {x.pagamento && x.data ? ` · fattura di ${MESI_BREVI[Number(x.data.slice(5, 7)) - 1]}, il cliente ha pagato questo mese` : ''}
        {x.decisione?.motivo ? <><br />Motivo: {x.decisione.motivo}</> : null}
        {x.decisione ? <><br />Decisa da {x.decisione.da_nome ?? 'un utente'}{x.decisione.il ? ' il ' + data(x.decisione.il) : ''}</> : null}
      </>,
      sinistra: x.loro ? { importo: x.loro.importo, dett: pct(x.loro.pct) + ' di ' + euro(x.loro.imponibile) } : null,
      destra: x.noi ? { importo: x.noi.importo, dett: pct(x.noi.pct) + ' di ' + euro(x.noi.imponibile) } : null,
      differenza: x.loro && x.noi ? x.loro.importo - x.noi.importo : x.loro ? x.loro.importo : -(x.noi?.importo ?? 0),
      quadra: x.categoria === 'quadra' || x.incasso,
      esito: x.incasso ? esitoIncasso(x) : esitoDecisione,
      azioni,
    };
  };

  const gruppi: GruppoCerniera[] = [
    { titolo: 'Da decidere', variante: 'attesa', righe: d.righe.filter((x) => x.gruppo === 'da_decidere').map(riga) },
    { titolo: 'Decise', variante: 'neutro', righe: d.righe.filter((x) => x.gruppo === 'decise').map(riga) },
    { titolo: 'Quadrano', variante: 'ok', chiuso: d.righe.some((x) => x.gruppo === 'da_decidere' || x.gruppo === 'decise'), righe: d.righe.filter((x) => x.gruppo === 'quadrano').map(riga) },
    {
      titolo: d.maturazione === 'maturato' ? 'Incassi dei clienti: fatture non ancora pagate o pagate dopo' : 'Incassi dei clienti: storni e riaccrediti',
      variante: 'neutro', righe: d.righe.filter((x) => x.gruppo === 'incassi').map(riga),
    },
  ];

  const badge = d.badge === 'verificato' ? { t: 'Verificato', v: 'ok' as Variante }
    : d.badge === 'contestato' ? { t: 'Contestato', v: 'errore' as Variante }
      : d.badge === 'pronto' ? { t: 'Pronto da chiudere', v: 'primario' as Variante }
        : { t: 'Da verificare', v: 'attesa' as Variante };

  const barra = (
    <div className="barra-decisione">
      <span>{d.azione.testo}{d.chiuso_il ? ` Chiuso il ${data(d.chiuso_il)}${d.chiuso_da ? ' da ' + d.chiuso_da : ''}.` : ''}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {d.totali.aperte > 0 && <>
          <span className="testo-tenue">{d.totali.aperte === 1 ? 'Manca 1 riga da decidere' : `Mancano ${d.totali.aperte} righe da decidere`}</span>
          <button type="button" className="link-azzera" onClick={vaiAllaPrima}>Vai alla prima</button>
        </>}
        {d.totali.contestate > 0 && <button type="button" className="btn sec" onClick={() => void preparaContestazione()}>Prepara la contestazione</button>}
        {modificabile && d.azione.tipo === 'verifica' && <button type="button" className="btn" onClick={() => chiudiBollettino('verificato')}>Segna come verificato</button>}
        {modificabile && d.azione.tipo === 'contesta' && <button type="button" className="btn" onClick={() => chiudiBollettino('contestato')}>Segna come contestato</button>}
        {modificabile && d.azione.tipo === 'decidi' && <button type="button" className="btn" disabled>Segna come verificato</button>}
      </span>
    </div>
  );

  const cerniera = (
    <div className="pila" style={{ minHeight: 0, flex: '1 1 auto' }}>
      {d.note && <Nota>{d.note}</Nota>}
      <Cerniera sinistra={`${d.fornitore} riconosce`} destra="Noi calcoliamo"
        totali={{ sinistra: d.totali.riconosciuto, destra: d.totali.calcolato, differenza: d.totali.differenza }}
        gruppi={gruppi} />
    </div>
  );

  return (
    <Pagina pieno titolo={`${d.fornitore} · ${MESI[d.mese - 1]} ${d.anno}`} badge={<Stato v={badge.v}>{badge.t}</Stato>}
      sottotitolo={<>
        Ricevuto il {data(d.ricevuto)} · {d.file ? d.file.nome : 'nessun file allegato'} · paga sul {d.maturazione}
        {d.maturazione === 'maturato' ? ': verificando il bollettino si sbloccano le provvigioni dei subagenti su queste fatture.' : '.'}
      </>}
      azioni={[{ etichetta: 'Torna ai bollettini', icona: 'indietro', variante: 'sec', href: '/bollettini' }]}>
      <div className="pila" style={{ flex: '1 1 auto', minHeight: 0 }}>
        {barra}
        {d.file ? (
          <div className="colonne riempi" style={{ '--colonne': 'minmax(300px, 0.8fr) minmax(0, 1.9fr)', flex: '1 1 auto', minHeight: 0 } as React.CSSProperties}>
            <Pannello titolo="Bollettino del fornitore" nota={d.file.nome} riempi>
              <object data={'/api/documenti/' + d.file.arrivo_id + '/file'} type="application/pdf" aria-label="PDF del bollettino"
                style={{ width: '100%', height: '100%', minHeight: 420, border: 0, borderRadius: 8, background: '#f1f3f5' }}>
                <p>Il browser non mostra il PDF qui. <a href={'/api/documenti/' + d.file.arrivo_id + '/file'} target="_blank" rel="noreferrer">Apri il PDF in una scheda</a>.</p>
              </object>
            </Pannello>
            {cerniera}
          </div>
        ) : cerniera}
      </div>
      {bozza && (
        <Modale titolo="Prepara la contestazione" testo="Copia il testo nella tua email al fornitore. Le modifiche non si salvano."
          onChiudi={() => setBozza(null)}
          piede={<>
            <button type="button" className="btn sec" onClick={() => setBozza(null)}>Chiudi</button>
            <button type="button" className="btn sec" onClick={scaricaContestazione}>Scarica .txt</button>
            <button type="button" className="btn" onClick={copiaContestazione}>Copia</button>
          </>}>
          <div className="modulo">
            <div className="campo">
              <label htmlFor="contestazione-oggetto">Oggetto</label>
              <input id="contestazione-oggetto" value={bozza.oggetto} onChange={(e) => setBozza({ ...bozza, oggetto: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="contestazione-testo">Testo</label>
              <textarea id="contestazione-testo" className="testo-email" value={bozza.testo} onChange={(e) => setBozza({ ...bozza, testo: e.target.value })} />
            </div>
          </div>
        </Modale>
      )}
      {finestra}
    </Pagina>
  );
}
