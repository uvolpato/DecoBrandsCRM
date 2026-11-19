'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { CercaInIntegra } from '@/componenti/CercaInIntegra';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { FormPercentuali, type Percentuali, type Scaglione, type ScaglioneVersione, type Versione } from '@/componenti/FormPercentuali';
import { AzioniRiga, type AzioneRiga } from '@/componenti/AzioniRiga';
import { Copiabile } from '@/componenti/Copiabile';
import { ConfermaGrave } from '@/componenti/ConfermaGrave';
import { Pagina, Pannello, Pulsante, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, Informazioni } from '@/componenti/Piccoli';
import { SagomaCorpo, SagomaElenco, SagomaTabella, useSagome } from '@/componenti/Sagoma';
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
  soggetto_codice: string | null;
  giorni_attesa_conferma: number;
  giorno_bollettino: number;
  tipo_provvigione: string;
  giorni_incasso: number;
  spese_base_provvigione: boolean;
  raggruppamento: string;
  scaglioni_esatti: boolean;
  note: string | null;
  attivo: boolean;
  scaglioni: number;
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
  mancano_scaglioni: boolean; // D-113: nessuna versione delle percentuali in vigore oggi
  scaglioni: Scaglione[];
  clienti_seguiti: ClienteSeguito[];
};

// Percentuali datate (§4.2.2, §5.11, D-25, D-51): i tipi stanno in FormPercentuali, condiviso
// con «Apri la pratica» (D-162); qui si mostra solo la scheda e si apre la finestra.

export function VistaFornitori({ idSel }: { idSel?: string }) {
  const puo = usePuo();
  const router = useRouter();
  const cerca = useSearchParams();
  // ?scheda=percentuali apre la scheda delle percentuali già selezionata (link diretto, 15/11/2026):
  // senza memoria, così il collegamento vince su una scheda ricordata di una navigazione precedente
  const schedaParam = cerca.get('scheda');
  const [fornitori, setFornitori] = useState<Fornitore[] | null>(null);
  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null);
  const [percentuali, setPercentuali] = useState<Percentuali | null>(null);
  const [valori, setValori] = useMemoria<Valori>('filtri', { q: '' });
  const [valoriCl, setValoriCl] = useMemoria<Valori>('filtri-clienti', { subagenti: [] });
  const [finestra, setFinestra] = useState<ReactNode>(null);
  // D-162: la finestra delle percentuali è FormPercentuali (condivisa con «Apri la pratica»)
  const [formPct, setFormPct] = useState<{ scaglione?: ScaglioneVersione; validoDal?: string } | null>(null);
  const [errore, setErrore] = useState('');
  const [errorePercentuali, setErrorePercentuali] = useState(false);
  const sagome = useSagome(!fornitori);

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
    setErrorePercentuali(false);
    if (!id) return;
    let vivo = true;
    void api<Percentuali>('fornitori/' + id + '/percentuali').then((r) => {
      if (!vivo) return;
      if (r.ok) setPercentuali(r.dati); else { setErrorePercentuali(true); avviso(r.messaggio, true); }
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
  // D-113: senza una versione in vigore la pratica non si apre; dopo il salvataggio lo dice subito `in_vigore`
  const mancanoScaglioni = percentuali ? percentuali.in_vigore === null : (u?.mancano_scaglioni ?? false);

  // D-172: conferma con casella per le operazioni senza ritorno
  const chiediGrave = (titolo: string, punti: ReactNode[], etichetta: string, etichettaCasella?: string) =>
    new Promise<boolean>((ok) => setFinestra(<ConfermaGrave titolo={titolo} punti={punti} etichettaCasella={etichettaCasella} etichetta={etichetta} onRisposta={(si) => { chiudi(); ok(si); }} />));

  function modificaRegole(x: Dettaglio) {
    setFinestra(
      <FormModal titolo={'Modifica le regole di ' + (x.ragione_sociale ?? '')} conferma="Salva" colonne={2}
        campi={[
          { nome: 'giorni_attesa_conferma', etichetta: 'Giorni attesa conferma', tipo: 'testo', valore: String(x.giorni_attesa_conferma) },
          { nome: 'giorno_bollettino', etichetta: 'Giorno del bollettino (mese successivo)', tipo: 'testo', valore: String(x.giorno_bollettino) },
          { nome: 'tipo_provvigione', etichetta: 'Tipo di provvigione', tipo: 'select', valore: x.tipo_provvigione, opzioni: [{ value: 'maturato', label: 'Sul maturato' }, { value: 'fatturato', label: 'Sul fatturato' }] },
          { nome: 'giorni_incasso', etichetta: 'Giorni per l’incasso dal cliente', tipo: 'testo', valore: String(x.giorni_incasso) },
          { nome: 'spese_base_provvigione', etichetta: 'Spese nella base della provvigione (trasporto, imballo)', tipo: 'casella', valore: x.spese_base_provvigione, largo: true },
          { nome: 'raggruppamento', etichetta: 'Raggruppamento per lo scaglione', tipo: 'select', valore: x.raggruppamento, opzioni: [{ value: 'documento', label: 'Sconto medio del documento' }, { value: 'riga', label: 'Per sconto di riga' }], largo: true },
          { nome: 'scaglioni_esatti', etichetta: 'Scaglioni', tipo: 'select', valore: x.scaglioni_esatti ? 'esatti' : 'fascia', opzioni: [{ value: 'fascia', label: 'A fascia (da soglia in su)' }, { value: 'esatti', label: 'Solo sconti esatti (±0,05)' }], largo: true },
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
          // la casella non compare nel corpo quando non è spuntata (D-183: esclusa è il predefinito)
          corpo.spese_base_provvigione = v.spese_base_provvigione === 'on';
          if (v.raggruppamento !== undefined) corpo.raggruppamento = v.raggruppamento;
          if (v.scaglioni_esatti !== undefined) corpo.scaglioni_esatti = v.scaglioni_esatti === 'esatti';
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

  // D-168: un solo scaglione alla volta; la data (editable) decide se entra nella versione esistente
  // o ne crea una nuova (il server copia gli scaglioni in vigore a quella data, come «Nuove percentuali»).
  function aggiungiScaglione(validoDal?: string) {
    setFormPct({ validoDal });
  }

  function modificaScaglione(s: ScaglioneVersione) {
    setFormPct({ scaglione: s });
  }

  async function eliminaScaglione(v: Versione, s: ScaglioneVersione) {
    if (!u) return;
    if (!(await chiediGrave('Eliminare lo scaglione da ' + pct(s.sconto_min) + '?',
      ['Lo scaglione sparisce dalla versione dal ' + dataIt(v.valido_dal) + '.', 'Se è usato da un’eccezione personale o da un periodo chiuso il server rifiuta.'],
      'Elimina'))) return;
    const scaglioni = v.scaglioni.filter((x) => x.id !== s.id).map((x) => ({ sconto_min: x.sconto_min, pct_agente: x.pct_agente, pct_subagente: x.pct_subagente }));
    const r = await api<Percentuali>('fornitori/' + u.id + '/percentuali/' + v.valido_dal, { scaglioni }, 'PUT');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Scaglione eliminato');
    setPercentuali(r.dati);
  }

  async function eliminaVersione(v: Versione) {
    if (!u) return;
    if (!(await chiediGrave('Eliminare le percentuali dal ' + dataIt(v.valido_dal) + '?',
      ['La versione sparisce in modo definitivo.', 'I documenti da quel giorno tornano alle percentuali della versione precedente.'],
      'Elimina'))) return;
    const r = await api('fornitori/' + u.id + '/percentuali/' + v.valido_dal, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Versione eliminata');
    const p = await api<Percentuali>('fornitori/' + u.id + '/percentuali');
    if (p.ok) setPercentuali(p.dati); else avviso(p.messaggio, true);
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
    { key: 'ragione_sociale', header: 'Fornitore', grow: true, cell: (x) => <><b>{x.ragione_sociale ?? '—'}</b><span className="sec-riga">{[x.soggetto_codice, x.piva, x.codice_integra].filter(Boolean).join(' · ')}</span></> },
    { key: 'scaglioni', header: 'Scaglioni', align: 'center', cell: (x) => String(x.scaglioni) },
    { key: 'giorni_attesa_conferma', header: 'Attesa conferma', align: 'center', cell: (x) => x.giorni_attesa_conferma + ' gg' },
  ];

  const colonneScaglioni: Colonna<ScaglioneVersione>[] = [
    { key: 'sconto_min', header: 'Sconto', align: 'right', cell: (s) => pct(s.sconto_min) },
    { key: 'pct_agente', header: 'Dal fornitore', align: 'right', cell: (s) => pct(s.pct_agente) },
    {
      key: 'pct_subagente', header: 'di cui al subagente', align: 'right', classe: () => 'avvolgi', cell: (s) => <>{pct(s.pct_subagente)}
        {s.eccezioni.map((e) => <span key={e.id} className="sec-riga">{e.subagente} {pct(e.pct_personale)} · dal {dataIt(e.valido_dal)}{e.valido_al ? ' al ' + dataIt(e.valido_al) : ''}</span>)}
      </>,
    },
    { key: 'margine', header: 'Margine', align: 'right', cell: (s) => pct(s.pct_agente - s.pct_subagente) },
    { key: 'clienti', header: 'Clienti', align: 'center' },
  ];

  // D-168, D-171: matita e cestino per riga (solo nelle versioni modificabili); l'ultimo scaglione
  // non si elimina dalla tabella (si elimina la versione).
  const AZIONI_SCAGLIONE: AzioneRiga[] = [
    { nome: 'modifica', icona: 'matita', etichetta: 'Modifica' },
    { nome: 'elimina', icona: 'cestino', etichetta: 'Elimina', variante: 'pericolo' },
  ];
  const colonneScaglioniConAzioni = (v: Versione): Colonna<ScaglioneVersione>[] => [
    ...colonneScaglioni,
    ...(puoModificare && v.modificabile ? [{
      key: 'azioni', header: '', align: 'center' as const, sortable: false,
      cell: (s: ScaglioneVersione) => (
        <AzioniRiga azioni={AZIONI_SCAGLIONE} oggetto={'lo scaglione da ' + pct(s.sconto_min)}
          riga={[
            { nome: 'modifica', onClick: () => modificaScaglione(s) },
            { nome: 'elimina', onClick: () => void eliminaScaglione(v, s), disabilitata: v.scaglioni.length === 1 },
          ]} />
      ),
    }] : []),
  ];

  const colonneClienti: Colonna<ClienteSeguito>[] = [
    { key: 'cliente', header: 'Cliente', grow: true, cell: (c) => <><b>{c.cliente ?? '—'}</b><span className="sec-riga">{c.piva ?? ''}</span></> },
    { key: 'subagente', header: 'Seguito da', cell: (c) => c.subagente ?? '—' },
    { key: 'codice_cliente_fornitore', header: 'Codice cliente', cell: (c) => c.codice_cliente_fornitore ?? '—' },
    { key: 'sconto', header: 'Sconto', align: 'center', cell: (c) => c.sconto + ' %' },
    { key: 'periodo', header: 'Periodo', cell: (c) => (dataIt(c.valido_dal) + (c.valido_al ? ' → ' + dataIt(c.valido_al) : '')) },
  ];

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Fornitori" pieno
      sottotitolo="Anagrafica da Integra (sola lettura). Qui si modificano solo le regole del CRM: giorni di attesa della conferma, bollettino, tipo di provvigione, giorni per l’incasso, note.">
      {corpo}
      {finestra}
      {formPct && u && (
        <FormPercentuali idFornitore={u.id} ragioneSociale={u.ragione_sociale}
          scaglione={formPct.scaglione ?? null}
          validoDal={formPct.validoDal}
          validoDalFisso={!!formPct.scaglione}
          scontoFisso={!!formPct.scaglione}
          onSalvata={(p) => { setPercentuali(p); setFormPct(null); }}
          onChiudi={() => setFormPct(null)} />
      )}
    </Pagina>
  );

  const filtri = (
    <FilterBar valori={valori} onChange={setValori} campi={[
      { nome: 'q', tipo: 'cerca', placeholder: 'Ragione sociale, P.IVA o codice' },
    ]} />
  );

  if (!fornitori) return pagina(errore
    ? <Pannello><div className="vuoto"><b>Fornitori non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>
    : sagome && <SagomaElenco larghezze="minmax(0,1.15fr) minmax(560px,1fr)" filtri={<>{filtri}<CercaInIntegra tipo="fornitore" onImportato={async (id) => { await carica(); router.push('/fornitori/' + id); }} /></>} />);

  const azioni: Azione[] = puoModificare && u ? [{ etichetta: 'Modifica le regole', icona: 'impostazioni', onClick: () => modificaRegole(u) }] : [];

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.15fr) minmax(560px,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        {filtri}
        <CercaInIntegra tipo="fornitore" onImportato={async (id) => { await carica(); router.push('/fornitori/' + id); }} />
        <div className="riempi">
          <DataTable righe={cercati} filtro={String(valori.q)} colonne={colonneFornitori} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'ragione_sociale', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/fornitori/' + x.id)}
            emptyText="Nessun fornitore" emptyHint="Cambia la ricerca." memoria="fornitori" />
        </div>
      </div>
      <Pannello titolo={u?.ragione_sociale ?? 'Fornitore'} riempi azioni={azioni}>
        {u ? (
          <>
            <Dettagli inColonne voci={[
              { etichetta: 'Ragione sociale', valore: u.ragione_sociale ?? '—' },
              { etichetta: 'P.IVA', valore: u.piva ? <>{u.piva}<Copiabile valore={u.piva} /></> : '—' },
              { etichetta: 'Paese', valore: u.paese ?? '—' },
              { etichetta: 'Codice soggetto', valore: u.soggetto_codice ?? '—' },
              { etichetta: 'Codice Integra', valore: u.codice_integra ?? '—' },
              { etichetta: 'Giorni attesa conferma', valore: u.giorni_attesa_conferma },
              { etichetta: 'Giorno del bollettino', valore: u.giorno_bollettino },
              { etichetta: 'Tipo di provvigione', valore: u.tipo_provvigione === 'maturato' ? 'Sul maturato' : 'Sul fatturato' },
              { etichetta: 'Giorni per l’incasso', valore: u.giorni_incasso },
              { etichetta: 'Spese nella base', valore: u.spese_base_provvigione ? 'Sì (incluse)' : 'No (escluse)' },
              { etichetta: 'Raggruppamento', valore: u.raggruppamento === 'riga' ? 'Per sconto di riga' : 'Sconto medio del documento' },
              { etichetta: 'Scaglioni', valore: u.scaglioni_esatti ? 'Solo sconti esatti (±0,05)' : 'A fascia (da soglia in su)' },
              { etichetta: 'Note', valore: u.note ?? '—' },
            ]} />
            <Schede riempi memoria={schedaParam ? undefined : 'fornitori'} attiva={schedaParam ?? undefined} schede={[
              {
                id: 'percentuali', etichetta: 'Percentuali', contenuto: () => (
                  <div className="pila riempi">
                    {mancanoScaglioni && (
                      <div className="nota nota-attesa strumenti-scheda" role="status">
                        <span className="spazio">
                          Senza scaglioni le pratiche di questo fornitore non si aprono (D-87).
                          {!puoModificare && <span className="testo-tenue"> Serve il livello responsabile in Dati.</span>}
                        </span>
                        <Pulsante piccolo a={{
                          etichetta: 'Configura gli scaglioni', variante: 'sec', onClick: () => aggiungiScaglione(),
                          disabilitato: !puoModificare, titolo: puoModificare ? undefined : 'Serve il livello responsabile in Dati',
                        }} />
                      </div>
                    )}
                    <div className="strumenti-scheda">
                      <span className="spazio" />
                      <Informazioni titolo="Informazioni sulle percentuali">
                        <ul>
                          <li><b>Dal fornitore</b>: la % che il fornitore riconosce a Decobrands.</li>
                          <li><b>Di cui al subagente</b>: la parte girata al subagente.</li>
                          <li><b>Margine Decobrands</b>: la differenza fra le due.</li>
                          <li><b>Clienti</b>: i clienti seguiti con quello sconto.</li>
                          <li><b>Come vale una soglia</b>: ogni soglia vale da quello sconto in su, fino alla successiva (come nel vecchio CRM). Con «solo sconti esatti» lo sconto deve coincidere con una soglia.</li>
                          <li><b>Date di validità e chiusure</b>: i documenti si calcolano con le percentuali in vigore alla loro data. Un nuovo scaglione, una sua modifica o un’eccezione valgono da una data dopo l’ultima chiusura (bollettino verificato o contestato, trimestre liquidato): prima il server rifiuta.</li>
                        </ul>
                      </Informazioni>
                      {puoModificare && percentuali && !mancanoScaglioni && <button type="button" className="btn sec piccolo" onClick={() => aggiungiScaglione(percentuali.in_vigore ?? undefined)}>Aggiungi scaglione</button>}
                    </div>
                    {!percentuali
                      ? errorePercentuali ? <div className="vuoto">Percentuali non caricate.</div> : <SagomaTabella righe={4} colonne={5} />
                      : <div className="scaglioni-elenco scaglioni-tabella">
                          {ordinate(percentuali.versioni).map(({ v, tipo }) => (
                            <div key={v.valido_dal} data-versione={v.valido_dal} className="scaglioni-versione">
                              <div className="strumenti-scheda">
                                <h3>{tipo === 'in vigore' ? 'In vigore dal ' + dataIt(v.valido_dal) : 'Dal ' + dataIt(v.valido_dal)}</h3>
                                {tipo !== 'in vigore' && <span className="testo-tenue">{tipo}</span>}
                                <span className="spazio" />
                                {puoModificare && v.modificabile && percentuali.versioni.length > 1 &&<button type="button" className="btn sec piccolo" onClick={() => void eliminaVersione(v)}>Elimina</button>}
                              </div>
                              <DataTable compatta righe={v.scaglioni} colonne={colonneScaglioniConAzioni(v)} chiave={(s) => s.id}
                                ordinamentoIniziale={{ key: 'sconto_min', dir: 'asc' }} emptyText="Nessuno scaglione" />
                            </div>
                          ))}
                        </div>}
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
        ) : <SagomaCorpo />}
      </Pannello>
    </div>,
  );
}
