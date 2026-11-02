'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { CampoProps } from '@/componenti/Campo';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli } from '@/componenti/Piccoli';
import { Schede } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { subagente } from '@/lib/entita';
import { data as dataIt, pct } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

interface Fornitore {
  id: string;
  ragione_sociale: string | null;
  piva: string | null;
  paese: string | null;
  codice_integra: string | null;
  giorni_attesa_conferma: number;
  giorno_bollettino: number;
  tipo_provvigione: string;
  giorni_incasso: number;
  note: string | null;
  attivo: boolean;
  scaglioni: number;
}
interface Scaglione {
  id: string;
  sconto_min: number;
  pct_agente: number;
  pct_subagente: number;
  valido_dal: string;
}
interface ClienteSeguito {
  id: string;
  subagente_id: string | null;
  cliente: string | null;
  piva: string | null;
  subagente: string | null;
  codice_cliente_fornitore: string | null;
  sconto: number;
  pct_subagente: number | null;
  regola_mensile: string | null;
  valido_dal: string;
  valido_al: string | null;
}
type Dettaglio = Omit<Fornitore, 'scaglioni'> & {
  scaglioni: Scaglione[];
  clienti_seguiti: ClienteSeguito[];
};

// Percentuali datate (§4.2.2, §5.11, D-25, D-51): il server restituisce le versioni e, per ogni
// scaglione, le eccezioni personali valide in qualche giorno della versione.
interface EccezioneScaglione {
  id: string;
  subagente_id: string;
  subagente: string;
  pct_personale: number;
  valido_dal: string;
  valido_al: string | null;
}
interface ScaglioneVersione extends Scaglione {
  dal_fornitore: number;
  clienti: number;
  eccezioni: EccezioneScaglione[];
}
interface Versione {
  valido_dal: string;
  in_vigore: boolean;
  scaglioni: ScaglioneVersione[];
}
interface Percentuali {
  in_vigore: string | null;
  versioni: Versione[];
}

interface RigaBozza {
  sconto_min: string;
  pct_agente: string;
  pct_subagente: string;
  nuova: boolean;
}
interface Bozza {
  modo: 'nuova' | 'correggi';
  idFornitore: string;
  valido_dal: string; // nuova: campo; correggi: la data della versione
  righe: RigaBozza[];
}

const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

let schedaFornitore = 'percentuali';

export function VistaFornitori({ idSel }: { idSel?: string }) {
  const puo = usePuo();
  const router = useRouter();
  const [fornitori, setFornitori] = useState<Fornitore[] | null>(null);
  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null);
  const [percentuali, setPercentuali] = useState<Percentuali | null>(null);
  const [valori, setValori] = useMemoria<Valori>('filtri', { q: '' });
  const [valoriCl, setValoriCl] = useMemoria<Valori>('filtri-clienti', { subagenti: [] });
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const r = await api<Fornitore[]>('fornitori');
    if (r.ok) { setFornitori(r.dati); setErrore(''); } else if (!fornitori) setErrore(r.messaggio); else avviso(r.messaggio, true);
  }, [fornitori]);

  const caricaDettaglio = useCallback(async (id: string) => {
    const r = await api<Dettaglio>('fornitori/' + id);
    if (r.ok) setDettaglio(r.dati); else avviso(r.messaggio, true);
  }, []);

  useEffect(() => {
    void carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fornitori || fornitori.length === 0) return;
    const id = idSel ?? fornitori[0].id;
    if (!idSel) router.replace('/fornitori/' + id);
    void caricaDettaglio(id);
  }, [fornitori, idSel, router, caricaDettaglio]);

  // percentuali e versioni del fornitore aperto (sola lettura per chi ha dati.consulta)
  useEffect(() => {
    const id = dettaglio?.id;
    setPercentuali(null);
    if (!id) return;
    let vivo = true;
    void api<Percentuali>('fornitori/' + id + '/percentuali').then((r) => {
      if (!vivo) return;
      if (r.ok) setPercentuali(r.dati); else avviso(r.messaggio, true);
    });
    return () => { vivo = false; };
  }, [dettaglio?.id]);

  const cercati = useMemo(() => {
    const q = String(valori.q ?? '').toLowerCase();
    return (fornitori ?? []).filter((x) => !q || [x.ragione_sociale, x.piva, x.codice_integra, x.paese].some((t) => (t ?? '').toLowerCase().includes(q)));
  }, [fornitori, valori.q]);

  const u = dettaglio;
  const chiudi = () => setFinestra(null);
  const puoModificare = puo('dati.condizioni');

  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  function modificaRegole(x: Dettaglio) {
    setFinestra(
      <FormModal titolo={'Modifica le regole di ' + (x.ragione_sociale ?? '')} conferma="Salva" colonne={2}
        campi={[
          { nome: 'giorni_attesa_conferma', etichetta: 'Giorni di attesa della conferma', tipo: 'testo', valore: String(x.giorni_attesa_conferma) },
          { nome: 'giorno_bollettino', etichetta: 'Giorno del bollettino (mese successivo)', tipo: 'testo', valore: String(x.giorno_bollettino) },
          { nome: 'tipo_provvigione', etichetta: 'Tipo di provvigione', tipo: 'select', valore: x.tipo_provvigione, opzioni: [{ value: 'maturato', label: 'Sul maturato' }, { value: 'fatturato', label: 'Sul fatturato' }] },
          { nome: 'giorni_incasso', etichetta: 'Giorni per l’incasso dal cliente', tipo: 'testo', valore: String(x.giorni_incasso) },
          { nome: 'note', etichetta: 'Note', tipo: 'testo', valore: x.note ?? '', largo: true },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {};
          if (v.giorni_attesa_conferma !== undefined) corpo.giorni_attesa_conferma = Number(v.giorni_attesa_conferma);
          if (v.giorno_bollettino !== undefined) corpo.giorno_bollettino = Number(v.giorno_bollettino);
          if (v.tipo_provvigione !== undefined) corpo.tipo_provvigione = v.tipo_provvigione;
          if (v.giorni_incasso !== undefined) corpo.giorni_incasso = Number(v.giorni_incasso);
          if (v.note !== undefined) corpo.note = v.note;
          const r = await api<Dettaglio>('fornitori/' + x.id, corpo, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso('Regole salvate');
          await carica();
          await caricaDettaglio(x.id);
          return undefined;
        }}
      />,
    );
  }

  function nuovePercentuali() {
    if (!u) return;
    // righe precompilate dalla versione più recente; le soglie si aggiungono, non si tolgono (D-25)
    const ultima = percentuali?.versioni[0];
    setBozza({
      modo: 'nuova', idFornitore: u.id, valido_dal: oggi(),
      righe: [
        ...(ultima?.scaglioni ?? []).map((s) => ({ sconto_min: String(s.sconto_min), pct_agente: String(s.pct_agente), pct_subagente: String(s.pct_subagente), nuova: false })),
        { sconto_min: '', pct_agente: '', pct_subagente: '', nuova: true },
      ],
    });
  }

  function correggi(v: Versione) {
    if (!u) return;
    setBozza({
      modo: 'correggi', idFornitore: u.id, valido_dal: v.valido_dal,
      righe: v.scaglioni.map((s) => ({ sconto_min: String(s.sconto_min), pct_agente: String(s.pct_agente), pct_subagente: String(s.pct_subagente), nuova: false })),
    });
  }

  async function eliminaVersione(v: Versione) {
    if (!u) return;
    if (!(await chiedi('Eliminare le percentuali dal ' + dataIt(v.valido_dal) + '?', 'La versione sparisce: i documenti da quel giorno tornano alle percentuali della versione precedente.', 'Elimina', true))) return;
    const r = await api('fornitori/' + u.id + '/percentuali/' + v.valido_dal, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Versione eliminata');
    const p = await api<Percentuali>('fornitori/' + u.id + '/percentuali');
    if (p.ok) setPercentuali(p.dati); else avviso(p.messaggio, true);
  }

  function campiBozza(b: Bozza): CampoProps[] {
    const campi: CampoProps[] = [{
      nome: 'valido_dal', etichetta: 'Valide dal', tipo: 'data', valore: b.valido_dal, largo: true,
      disabilitato: b.modo === 'correggi',
      aiuto: b.modo === 'nuova' ? 'Deve venire dopo l’ultima chiusura (bollettino verificato o trimestre liquidato); può cadere fra due versioni.' : undefined,
    }];
    b.righe.forEach((r, i) => {
      if (r.nuova) {
        campi.push({ nome: 'sconto' + i, etichetta: 'Aggiungi uno sconto %', valore: r.sconto_min, largo: true, aiuto: 'Facoltativo: le soglie esistenti non si tolgono.' });
        campi.push({ nome: 'agente' + i, etichetta: 'A Decobrands % (nuovo sconto)', valore: r.pct_agente });
        campi.push({ nome: 'sub' + i, etichetta: 'Al subagente % (nuovo sconto)', valore: r.pct_subagente });
      } else {
        const sconto = pct(Number(r.sconto_min));
        campi.push({ nome: 'agente' + i, etichetta: 'Sconto ' + sconto + ' · a Decobrands %', valore: r.pct_agente });
        campi.push({ nome: 'sub' + i, etichetta: 'Sconto ' + sconto + ' · al subagente %', valore: r.pct_subagente });
      }
    });
    return campi;
  }

  async function salvaBozza(v: Record<string, string>) {
    const b = bozza;
    if (!b) return;
    if (b.modo === 'nuova' && !v.valido_dal) return 'Indica la data da cui valgono.';
    const scaglioni: { sconto_min: number; pct_agente: number; pct_subagente: number }[] = [];
    for (let i = 0; i < b.righe.length; i++) {
      const sconto = b.righe[i].nuova ? v['sconto' + i] : b.righe[i].sconto_min;
      if (b.righe[i].nuova && !sconto) continue;
      if (v['agente' + i] === '' || v['sub' + i] === '') return 'Indica le due percentuali per lo sconto ' + sconto + ' %.';
      scaglioni.push({ sconto_min: Number(sconto), pct_agente: Number(v['agente' + i]), pct_subagente: Number(v['sub' + i]) });
    }
    if (!scaglioni.length) return 'Indica almeno uno scaglione.';
    const r = b.modo === 'nuova'
      ? await api<Percentuali>('fornitori/' + b.idFornitore + '/percentuali', { valido_dal: v.valido_dal, scaglioni })
      : await api<Percentuali>('fornitori/' + b.idFornitore + '/percentuali/' + b.valido_dal, { scaglioni }, 'PUT');
    if (!r.ok) return r.messaggio;
    setPercentuali(r.dati);
    avviso(b.modo === 'nuova' ? 'Percentuali salvate: valgono dal ' + dataIt(v.valido_dal) : 'Percentuali corrette');
    setBozza(null);
    return undefined;
  }

  // in vigore in alto, poi le future dalla più vicina, poi le passate dalla più recente
  function ordinate(versioni: Versione[]) {
    const vigore = versioni.find((v) => v.in_vigore);
    const future = versioni.filter((v) => !v.in_vigore && (!vigore || v.valido_dal > vigore.valido_dal)).sort((a, b) => a.valido_dal.localeCompare(b.valido_dal));
    const passate = versioni.filter((v) => !v.in_vigore && vigore && v.valido_dal < vigore.valido_dal);
    return [
      ...(vigore ? [{ v: vigore, tipo: 'in vigore' }] : []),
      ...future.map((v) => ({ v, tipo: 'futura' })),
      ...passate.map((v) => ({ v, tipo: 'passata' })),
    ];
  }

  const colonneFornitori: Colonna<Fornitore>[] = [
    { key: 'ragione_sociale', header: 'Fornitore', grow: true, cell: (x) => <><b>{x.ragione_sociale ?? '—'}</b><span className="sec-riga">{x.piva ?? ''}{x.codice_integra ? ' · ' + x.codice_integra : ''}</span></> },
    { key: 'scaglioni', header: 'Scaglioni', align: 'center', cell: (x) => String(x.scaglioni) },
    { key: 'giorni_attesa_conferma', header: 'Attesa conferma', align: 'center', cell: (x) => x.giorni_attesa_conferma + ' gg' },
  ];

  const colonneScaglioni: Colonna<ScaglioneVersione>[] = [
    { key: 'sconto_min', header: 'Sconto', align: 'center', cell: (s) => pct(s.sconto_min) },
    { key: 'pct_agente', header: 'A Decobrands', align: 'center', cell: (s) => pct(s.pct_agente) },
    {
      key: 'pct_subagente', header: 'Al subagente', align: 'center', classe: () => 'avvolgi', cell: (s) => <>{pct(s.pct_subagente)}
        {s.eccezioni.map((e) => <span key={e.id} className="sec-riga">{e.subagente} {pct(e.pct_personale)} · dal {dataIt(e.valido_dal)}{e.valido_al ? ' al ' + dataIt(e.valido_al) : ''}</span>)}
      </>,
    },
    { key: 'dal_fornitore', header: 'Totale', align: 'center', cell: (s) => pct(s.dal_fornitore) },
    { key: 'clienti', header: 'Clienti', align: 'center' },
  ];

  const colonneClienti: Colonna<ClienteSeguito>[] = [
    { key: 'cliente', header: 'Cliente', grow: true, cell: (c) => <><b>{c.cliente ?? '—'}</b><span className="sec-riga">{c.piva ?? ''}</span></> },
    { key: 'subagente', header: 'Seguito da', cell: (c) => c.subagente ?? '—' },
    { key: 'codice_cliente_fornitore', header: 'Codice cliente', cell: (c) => c.codice_cliente_fornitore ?? '—' },
    { key: 'sconto', header: 'Sconto', align: 'center', cell: (c) => c.sconto + ' %' },
    { key: 'periodo', header: 'Periodo', cell: (c) => (c.valido_dal + (c.valido_al ? ' → ' + c.valido_al : '')) },
  ];

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Fornitori" pieno
      sottotitolo="Anagrafica da Integra (sola lettura). Qui si modificano solo le regole del CRM: giorni di attesa della conferma, bollettino, tipo di provvigione, giorni per l’incasso, note.">
      {corpo}
      {finestra}
      {bozza && (
        <FormModal titolo={(bozza.modo === 'nuova' ? 'Nuove percentuali di ' : 'Correggi le percentuali di ') + (u?.ragione_sociale ?? '')}
          testo={bozza.modo === 'nuova' ? 'Valgono per i documenti con data uguale o successiva a quella indicata.' : 'La correzione sostituisce le percentuali di questa versione.'}
          conferma={bozza.modo === 'nuova' ? 'Salva le nuove percentuali' : 'Salva la correzione'} colonne={2}
          campi={campiBozza(bozza)} onChiudi={() => setBozza(null)} onConferma={salvaBozza} />
      )}
    </Pagina>
  );

  if (!fornitori) return pagina(errore && <Pannello><div className="vuoto"><b>Fornitori non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>);

  const azioni: Azione[] = puoModificare && u ? [{ etichetta: 'Modifica le regole', icona: 'impostazioni', onClick: () => modificaRegole(u) }] : [];

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.15fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        <FilterBar valori={valori} onChange={setValori} campi={[
          { nome: 'q', tipo: 'cerca', placeholder: 'Ragione sociale, P.IVA o codice' },
        ]} />
        <div className="riempi">
          <DataTable righe={cercati} filtro={String(valori.q)} colonne={colonneFornitori} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'ragione_sociale', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/fornitori/' + x.id)}
            emptyText="Nessun fornitore" emptyHint="Cambia la ricerca." memoria="fornitori" />
        </div>
      </div>
      <Pannello titolo={u?.ragione_sociale ?? 'Fornitore'} riempi azioni={azioni}>
        {u && (
          <>
            <Dettagli inColonne voci={[
              { etichetta: 'Ragione sociale', valore: u.ragione_sociale ?? '—' },
              { etichetta: 'P.IVA', valore: u.piva ?? '—' },
              { etichetta: 'Paese', valore: u.paese ?? '—' },
              { etichetta: 'Codice Integra', valore: u.codice_integra ?? '—' },
              { etichetta: 'Giorni di attesa della conferma', valore: u.giorni_attesa_conferma },
              { etichetta: 'Giorno del bollettino', valore: u.giorno_bollettino },
              { etichetta: 'Tipo di provvigione', valore: u.tipo_provvigione === 'maturato' ? 'Sul maturato' : 'Sul fatturato' },
              { etichetta: 'Giorni per l’incasso', valore: u.giorni_incasso },
              { etichetta: 'Note', valore: u.note ?? '—' },
            ]} />
            <Schede riempi attiva={schedaFornitore} onCambia={(id) => { schedaFornitore = id; }} memoria="fornitori" schede={[
              {
                id: 'percentuali', etichetta: 'Percentuali', contenuto: () => (
                  <div className="pila riempi">
                    <div className="strumenti-scheda">
                      <span className="spazio" />
                      {puoModificare && percentuali && <button type="button" className="btn sec piccolo" onClick={nuovePercentuali}>Nuove percentuali</button>}
                    </div>
                    {!percentuali
                      ? <div className="vuoto">Percentuali non caricate.</div>
                      : ordinate(percentuali.versioni).map(({ v, tipo }) => (
                        <div key={v.valido_dal} data-versione={v.valido_dal} style={{ flex: 'none' }}>
                          <div className="strumenti-scheda">
                            <h3>{tipo === 'in vigore' ? 'In vigore dal ' + dataIt(v.valido_dal) : 'Dal ' + dataIt(v.valido_dal)}</h3>
                            {tipo !== 'in vigore' && <span className="testo-tenue">{tipo}</span>}
                            <span className="spazio" />
                            {puoModificare && <button type="button" className="btn sec piccolo" onClick={() => correggi(v)}>Correggi</button>}
                            {puoModificare && percentuali.versioni.length > 1 && <button type="button" className="btn sec piccolo" onClick={() => void eliminaVersione(v)}>Elimina</button>}
                          </div>
                          <DataTable compatta naturale righe={v.scaglioni} colonne={colonneScaglioni} chiave={(s) => s.id}
                            ordinamentoIniziale={{ key: 'sconto_min', dir: 'asc' }} emptyText="Nessuno scaglione" />
                        </div>
                      ))}
                    <Nota>Totale = % a Decobrands + % al subagente; Clienti = clienti seguiti con quello sconto. I documenti si calcolano con le percentuali in vigore alla loro data. Una versione nuova, una correzione o un’eccezione valgono da una data dopo l’ultima chiusura (bollettino verificato o contestato, trimestre liquidato): prima il server rifiuta.</Nota>
                  </div>
                ),
              },
              {
                id: 'clienti', etichetta: 'Clienti seguiti', contenuto: () => (
                  <div className="pila riempi">
                    <FilterBar valori={valoriCl} onChange={setValoriCl} campi={[
                      { nome: 'subagenti', tipo: 'ricerca', entita: subagente, multipla: true, placeholder: 'Tutti i subagenti' },
                    ]} />
                    <div className="riempi">
                    <DataTable righe={u.clienti_seguiti.filter((c) => !(valoriCl.subagenti as string[]).length || (valoriCl.subagenti as string[]).includes(c.subagente_id ?? ''))} filtro={JSON.stringify(valoriCl)} colonne={colonneClienti} chiave={(c) => c.id} emptyText="Nessun cliente seguito" />
                    </div>
                  </div>
                ),
              },
            ]} />
          </>
        )}
      </Pannello>
    </div>,
  );
}
