'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { CampoProps } from '@/componenti/Campo';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { Elenco } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { Conferma, Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, Stato } from '@/componenti/Piccoli';
import { Sagoma, SagomaCorpo, SagomaElenco, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { agente, fornitore } from '@/lib/entita';
import { data as dataIt, pct } from '@/lib/formati';

interface Agente {
  id: string;
  codice: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  attivo: boolean;
  subagenti: number;
}

interface Subagente {
  id: string;
  agente_id: string;
  agente: string | null;
  agente_codice: string | null;
  codice: string;
  nome: string;
  cognome: string;
  email: string | null;
  soggetto_codice: string | null;
  attivo: boolean;
}

// Eccezioni personali con periodo proprio (§4.2.3, §5.2, D-51): non sono legate a una versione
// delle percentuali e non si copiano.
interface Eccezione {
  id: string;
  subagente_id: string;
  subagente: string;
  fornitore_id: string;
  fornitore: string | null;
  sconto_min: number;
  pct_personale: number;
  pct_standard: number | null;
  valido_dal: string;
  valido_al: string | null;
  modificabile: boolean;
}
interface Percentuali {
  versioni: { in_vigore: boolean; scaglioni: { sconto_min: number }[] }[];
}
interface FormEccezione {
  riga: Eccezione | null;
  fornitore_id: string;
  scaglioni: number[];
}

const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

let filtro: Record<string, string> = { vista: 'attivi', q: '' };
let schedaSubagente = 'dati';
const VISTE: Record<string, (x: Subagente) => boolean> = { attivi: (x) => x.attivo, disattivati: (x) => !x.attivo, tutti: () => true };

export function VistaSubagenti({ idSel }: { idSel?: string }) {
  const io = useUtente();
  const puo = usePuo();
  const router = useRouter();
  const [subagenti, setSubagenti] = useState<Subagente[] | null>(null);
  const [agenti, setAgenti] = useState<Agente[] | null>(null);
  const [eccezioni, setEccezioni] = useState<Eccezione[] | null>(null);
  const [valori, setValori] = useState(filtro);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [bozzaEccezione, setBozzaEccezione] = useState<FormEccezione | null>(null);
  const [errore, setErrore] = useState('');
  const sagome = useSagome(!subagenti);

  const carica = useCallback(async () => {
    const r = await api<Subagente[]>('subagenti');
    if (r.ok) { setSubagenti(r.dati); setErrore(''); } else if (!subagenti) setErrore(r.messaggio); else avviso(r.messaggio, true);
    const a = await api<Agente[]>('agenti');
    if (a.ok) setAgenti(a.dati);
  }, [subagenti]);

  useEffect(() => {
    void carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subagenti || subagenti.length === 0) return;
    const id = idSel ?? subagenti[0].id;
    if (!idSel) router.replace('/subagenti/' + id);
  }, [subagenti, idSel, router]);

  const cercati = useMemo(() => {
    const q = (valori.q ?? '').toLowerCase();
    return (subagenti ?? []).filter((x) => !q || [x.nome, x.cognome, x.codice, x.email ?? ''].some((t) => t.toLowerCase().includes(q)));
  }, [subagenti, valori.q]);
  const righe = useMemo(() => cercati.filter(VISTE[valori.vista]), [cercati, valori.vista]);

  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  const u = subagenti?.find((x) => x.id === idSel) ?? subagenti?.[0] ?? null;
  const puoModificare = puo('dati.modifica');
  const puoCondizioni = puo('dati.condizioni');

  const caricaEccezioni = useCallback(async (id: string) => {
    const r = await api<Eccezione[]>('eccezioni?subagente_id=' + id);
    if (r.ok) setEccezioni(r.dati); else avviso(r.messaggio, true);
  }, []);

  useEffect(() => {
    setEccezioni(null);
    if (u) void caricaEccezioni(u.id);
  }, [u?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al cambio di subagente

  function modifica(x: Subagente | null) {
    const opzioniAgenti = (agenti ?? []).filter((a) => a.attivo).map((a) => ({ value: a.id, label: a.cognome + ' ' + a.nome + ' (' + a.codice + ')' }));
    setFinestra(
      <FormModal titolo={x ? 'Modifica ' + x.cognome + ' ' + x.nome : 'Nuovo subagente'} conferma={x ? 'Salva' : 'Crea'} colonne={2}
        campi={[
          { nome: 'agente_id', etichetta: 'Agente', tipo: 'ricerca', entita: agente, valore: x?.agente_id ?? (agenti?.[0]?.id ?? ''), largo: true },
          { nome: 'codice', etichetta: 'Codice', valore: x?.codice ?? '' },
          { nome: 'nome', etichetta: 'Nome', valore: x?.nome ?? '' },
          { nome: 'cognome', etichetta: 'Cognome', valore: x?.cognome ?? '' },
          { nome: 'email', etichetta: 'Email', valore: x?.email ?? '', largo: true },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {
            codice: v.codice,
            nome: v.nome,
            cognome: v.cognome,
            email: v.email || null,
            agente_id: Number(v.agente_id),
          };
          const r = x ? await api<Subagente>('subagenti/' + x.id, corpo, 'PUT') : await api<Subagente>('subagenti', corpo);
          if (!r.ok) return r.messaggio;
          avviso(x ? 'Subagente salvato' : 'Subagente creato');
          if (!x) router.push('/subagenti/' + r.dati.id);
          await carica();
        }}
      />,
    );
  }

  async function attiva(x: Subagente, si: boolean) {
    const r = await api('subagenti/' + x.id + '/attivo', { attivo: si });
    avviso(!r.ok ? r.messaggio : si ? 'Subagente riattivato' : 'Subagente disattivato', !r.ok);
    await carica();
  }
  async function elimina(x: Subagente) {
    if (!(await chiedi('Eliminare ' + x.cognome + ' ' + x.nome + '?', 'Eliminazione definitiva se non ha pratiche o abbinamenti.', 'Elimina', true))) return;
    const r = await api('subagenti/' + x.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Subagente eliminato');
    router.push('/subagenti');
    await carica();
  }

  /* ---------- Eccezioni personali del subagente (D-26, D-51) ---------- */

  function periodo(e: Eccezione) {
    return 'dal ' + dataIt(e.valido_dal) + (e.valido_al ? ' al ' + dataIt(e.valido_al) : '');
  }

  async function cambiaFornitore(id: string) {
    setBozzaEccezione((b) => b ? { ...b, fornitore_id: id, scaglioni: [] } : b);
    if (!id) return;
    const r = await api<Percentuali>('fornitori/' + id + '/percentuali');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    const versione = r.dati.versioni.find((v) => v.in_vigore) ?? r.dati.versioni[0];
    const scaglioni = [...new Set((versione?.scaglioni ?? []).map((s) => s.sconto_min))].sort((a, b) => a - b);
    setBozzaEccezione((b) => b && b.fornitore_id === id ? { ...b, scaglioni } : b);
  }

  function nuovaEccezione() {
    setBozzaEccezione({ riga: null, fornitore_id: '', scaglioni: [] });
  }

  function modificaEccezione(e: Eccezione) {
    setBozzaEccezione({ riga: e, fornitore_id: e.fornitore_id, scaglioni: [e.sconto_min] });
  }

  function campiEccezione(b: FormEccezione): CampoProps[] {
    if (b.riga) {
      return [
        { nome: 'pct_personale', etichetta: 'Al subagente %', valore: String(b.riga.pct_personale), aiuto: 'Da 0 a 100.' },
        { nome: 'valido_dal', etichetta: 'Dal', tipo: 'data', valore: b.riga.valido_dal },
      ];
    }
    return [
      { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: fornitore, valore: b.fornitore_id, largo: true, onCambia: (v) => void cambiaFornitore(v) },
      {
        nome: 'sconto', etichetta: 'Sconto al cliente %', tipo: 'select',
        valore: b.scaglioni.length === 1 ? String(b.scaglioni[0]) : '',
        opzioni: [{ value: '', label: b.scaglioni.length ? 'Scegli lo sconto' : 'Scegli prima il fornitore' }, ...b.scaglioni.map((s) => ({ value: String(s), label: pct(s) }))],
      },
      { nome: 'pct_personale', etichetta: 'Al subagente %', valore: '', aiuto: 'Da 0 a 100; 0 = nessuna provvigione su questo sconto.' },
      { nome: 'valido_dal', etichetta: 'Dal', tipo: 'data', valore: oggi() },
    ];
  }

  async function salvaEccezione(v: Record<string, string>) {
    const b = bozzaEccezione;
    if (!b || !u) return;
    if (v.pct_personale === '') return 'Indica la percentuale al subagente.';
    if (!v.valido_dal) return 'Indica il giorno da cui vale.';
    if (b.riga) {
      const r = await api<Eccezione>('eccezioni/' + b.riga.id, { pct_personale: Number(v.pct_personale), valido_dal: v.valido_dal }, 'PUT');
      if (!r.ok) return r.messaggio;
      avviso('Eccezione salvata');
    } else {
      if (!v.fornitore_id) return 'Scegli il fornitore dall’elenco.';
      if (!v.sconto) return 'Scegli lo sconto.';
      const r = await api<Eccezione>('eccezioni', {
        subagente_id: Number(u.id), fornitore_id: Number(v.fornitore_id), sconto_min: Number(v.sconto),
        pct_personale: Number(v.pct_personale), valido_dal: v.valido_dal,
      });
      if (!r.ok) return r.messaggio;
      avviso('Eccezione aggiunta');
    }
    setBozzaEccezione(null);
    await caricaEccezioni(u.id);
    return undefined;
  }

  function apriEccezione(e: Eccezione) {
    setFinestra(
      <Modale titolo={'Eccezione · ' + (u ? u.cognome + ' ' + u.nome : '')} onChiudi={chiudi}
        piede={<>
          <button type="button" className="btn sec" onClick={chiudi}>Chiudi</button>
          {puoCondizioni && <>
            <button type="button" className="btn sec" onClick={() => { chiudi(); cambiaPercentuale(e); }}>Cambia la %</button>
            <button type="button" className="btn sec" onClick={() => { chiudi(); termina(e); }}>Termina</button>
            {e.modificabile && <button type="button" className="btn sec" onClick={() => { chiudi(); modificaEccezione(e); }}>Modifica</button>}
            {e.modificabile && <button type="button" className="btn pericolo" onClick={() => { chiudi(); void eliminaEccezione(e); }}>Elimina</button>}
          </>}
        </>}>
        <Dettagli inColonne voci={[
          { etichetta: 'Fornitore', valore: e.fornitore ?? '—' },
          { etichetta: 'Sconto al cliente', valore: pct(e.sconto_min) },
          { etichetta: 'Al subagente', valore: pct(e.pct_personale) },
          { etichetta: 'Percentuale standard', valore: e.pct_standard == null ? '—' : pct(e.pct_standard) },
          { etichetta: 'Periodo', valore: periodo(e) },
        ]} />
        {!e.modificabile && <Nota>Questa eccezione è già usata in un periodo chiuso: si può cambiare la percentuale o terminarla da una data successiva, ma non correggerla né eliminarla.</Nota>}
      </Modale>,
    );
  }

  function cambiaPercentuale(e: Eccezione) {
    setFinestra(
      <FormModal titolo="Cambia la percentuale" conferma="Cambia" colonne={2}
        testo="Dal giorno indicato la vecchia eccezione finisce e ne comincia una nuova con la percentuale scelta."
        campi={[
          { nome: 'pct_personale', etichetta: 'Nuova % al subagente', valore: '' },
          { nome: 'dal', etichetta: 'Dal', tipo: 'data', valore: oggi() },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.pct_personale) return 'Indica la nuova percentuale.';
          if (!v.dal) return 'Indica il giorno del cambio.';
          const r = await api('eccezioni/' + e.id + '/cambia', { pct_personale: Number(v.pct_personale), dal: v.dal });
          if (!r.ok) return r.messaggio;
          avviso('Percentuale cambiata');
          if (u) await caricaEccezioni(u.id);
        }}
      />,
    );
  }

  function termina(e: Eccezione) {
    setFinestra(
      <FormModal titolo="Termina l’eccezione" conferma="Termina" colonne={2}
        testo="Dal giorno indicato l’eccezione non vale più e torna la percentuale standard dello scaglione (quel giorno è escluso)."
        campi={[{ nome: 'al', etichetta: 'Primo giorno senza l’eccezione', tipo: 'data', valore: oggi() }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.al) return 'Indica il giorno.';
          const r = await api('eccezioni/' + e.id + '/termina', { al: v.al });
          if (!r.ok) return r.messaggio;
          avviso('Eccezione terminata');
          if (u) await caricaEccezioni(u.id);
        }}
      />,
    );
  }

  async function eliminaEccezione(e: Eccezione) {
    if (!(await chiedi('Eliminare l’eccezione?', 'Torna a valere la percentuale standard dello scaglione.', 'Elimina', true))) return;
    const r = await api('eccezioni/' + e.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Eccezione eliminata');
    if (u) await caricaEccezioni(u.id);
  }

  function tabEccezioni() {
    if (!u) return null;
    if (eccezioni === null) return <div className="pila riempi" aria-busy="true">
      <div className="strumenti-scheda"><h3>Eccezioni personali</h3></div>
      <div className="pila">{Array.from({ length: 4 }, (_, i) => <Sagoma key={i} larghezza="100%" altezza={34} />)}</div>
    </div>;
    const voci = [...(eccezioni ?? [])].sort((a, b) => b.valido_dal.localeCompare(a.valido_dal)).map((e) => {
      const finita = !!e.valido_al && e.valido_al <= oggi();
      return {
        testo: <span className={finita ? 'testo-tenue' : undefined}><b>{e.fornitore ?? '—'}</b>, sconto {pct(e.sconto_min)} <span className="testo-tenue">· {periodo(e)}</span></span>,
        destra: <>{pct(e.pct_personale)} <span className="testo-tenue">invece di {e.pct_standard == null ? '—' : pct(e.pct_standard)}</span></>,
        onClick: puoCondizioni ? () => apriEccezione(e) : undefined,
        titolo: puoCondizioni ? 'Apri l’eccezione' : undefined,
      };
    });
    return (
      <div className="pila riempi">
        <div className="strumenti-scheda">
          <h3>Eccezioni personali</h3>
          <span className="spazio" />
          {puoCondizioni && <button type="button" className="btn sec piccolo" onClick={nuovaEccezione}>Aggiungi eccezione</button>}
        </div>
        <div className="riempi">
          <Elenco voci={voci} vuoto="Nessuna: valgono le percentuali standard dei fornitori." />
        </div>
        <Nota>La percentuale personale vale al posto di quella dello scaglione, nei giorni del suo periodo. Non è legata a una versione delle percentuali: con le versioni nuove continua da sola. Un cambio o una fine valgono da una data dopo l’ultima chiusura del fornitore.</Nota>
      </div>
    );
  }

  const colonne: Colonna<Subagente>[] = [
    { key: 'nome', header: 'Subagente', grow: true, cell: (x) => <><b>{x.cognome} {x.nome}</b>{x.attivo === false && <> <Stato v="neutro">non attivo</Stato></>}<span className="sec-riga">{[x.soggetto_codice, x.codice, x.email].filter(Boolean).join(' · ')}</span></> },
    { key: 'agente', header: 'Agente', valore: (x) => x.agente ?? '', cell: (x) => x.agente ?? <span className="testo-tenue">—</span> },
    { key: 'stato', header: 'Stato', valore: (x) => (x.attivo ? 'Attivo' : 'Non attivo'), cell: (x) => x.attivo ? <Stato v="ok">Attivo</Stato> : <Stato v="neutro">Non attivo</Stato> },
  ];

  const azioni: Azione[] = !u || !puoModificare ? [] : [
    { etichetta: 'Modifica', onClick: () => modifica(u) },
    { etichetta: u.attivo ? 'Disattiva' : 'Riattiva', onClick: () => attiva(u, !u.attivo) },
    { etichetta: 'Elimina', variante: 'pericolo', onClick: () => elimina(u) },
  ];

  const filtri = (
    <FilterBar valori={valori} onChange={(v) => { filtro = v; setValori(v); }} caricando={sagome} campi={[
      { nome: 'q', tipo: 'cerca', placeholder: 'Nome, cognome, codice o email' },
      { nome: 'vista', tipo: 'segmenti', opzioni: [
        { value: 'attivi', label: 'Attivi', n: subagenti ? cercati.filter(VISTE.attivi).length : undefined },
        { value: 'disattivati', label: 'Disattivati', n: subagenti ? cercati.filter(VISTE.disattivati).length : undefined },
        { value: 'tutti', label: 'Tutti', n: subagenti ? cercati.length : undefined },
      ] },
    ]} />
  );

  if (!subagenti) {
    return (
      <Pagina titolo="Subagenti" pieno>
        {errore
          ? <Pannello><div className="vuoto"><b>Subagenti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>
          : sagome && <SagomaElenco filtri={filtri} />}
        {finestra}
      </Pagina>
    );
  }

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Subagenti" pieno azioni={puoModificare ? [{ etichetta: 'Nuovo subagente', icona: 'piu', onClick: () => modifica(null) }] : []}
      sottotitolo="Chi segue quali clienti. I subagenti si gestiscono per intero nel CRM.">
      {corpo}
      {finestra}
      {bozzaEccezione && u && (
        <FormModal titolo={(bozzaEccezione.riga ? 'Modifica l’eccezione · ' : 'Nuova eccezione · ') + u.cognome + ' ' + u.nome}
          testo="La percentuale personale vale al posto di quella dello scaglione, nei giorni del periodo indicato."
          conferma={bozzaEccezione.riga ? 'Salva' : 'Aggiungi eccezione'} colonne={2}
          campi={campiEccezione(bozzaEccezione)} onChiudi={() => setBozzaEccezione(null)} onConferma={salvaEccezione} />
      )}
    </Pagina>
  );

  function datiSubagente() {
    if (!u) return null;
    return (
      <>
        <Dettagli inColonne voci={[
          { etichetta: 'Codice soggetto', valore: u.soggetto_codice ?? '—' },
          { etichetta: 'Codice', valore: u.codice },
          { etichetta: 'Nome', valore: u.nome },
          { etichetta: 'Cognome', valore: u.cognome },
          { etichetta: 'Email', valore: u.email ?? '—' },
          { etichetta: 'Agente', valore: u.agente ?? '—' },
          { etichetta: 'Stato', valore: u.attivo ? <Stato v="ok">Attivo</Stato> : <Stato v="neutro">Non attivo</Stato> },
        ]} />
        {!puoModificare && <Nota>Non hai il permesso per modificare i subagenti.</Nota>}
      </>
    );
  }

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.15fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        {filtri}
        <div className="riempi">
          <DataTable righe={righe} filtro={valori.q + '|' + valori.vista} colonne={colonne} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'nome', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/subagenti/' + x.id)}
            emptyText="Nessun subagente" emptyHint="Cambia la ricerca o il filtro." />
        </div>
      </div>
      <Pannello titolo={u ? u.cognome + ' ' + u.nome : 'Subagente'} riempi azioni={azioni}>
        {u ? <Schede riempi attiva={schedaSubagente} onCambia={(id) => { schedaSubagente = id; }} schede={[
          { id: 'dati', etichetta: 'Dati', contenuto: datiSubagente },
          { id: 'eccezioni', etichetta: 'Eccezioni personali', conta: eccezioni?.length, contenuto: tabEccezioni },
        ]} /> : <SagomaCorpo />}
      </Pannello>
    </div>,
  );
}
