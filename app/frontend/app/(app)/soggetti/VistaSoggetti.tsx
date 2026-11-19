'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CampoProps } from '@/componenti/Campo';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Icona } from '@/componenti/Icona';
import { Conferma, Modale } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, Informazioni, Stato, type Variante } from '@/componenti/Piccoli';
import { SagomaCorpo, SagomaElenco, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { domani } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Anagrafica unica a soggetti (D-102, specifica-anagrafica-soggetti.md §4): elenco e scheda come il
// prototipo ufficiale (viste-soggetti.js). Ricerca, segmenti, ordinamento, pagina e conteggi arrivano
// dal server (V12, D-23): qui si compone soltanto.
interface Ruolo {
  tipo: 'cliente' | 'fornitore' | 'subagente';
  id: string;
  nome: string;
  codice: string;
  attivo: boolean;
}
interface Soggetto {
  id: string;
  codice: string;
  natura: string;
  paese: string;
  piva: string | null;
  piva_norm: string;
  codice_fiscale: string | null;
  cf_norm: string;
  attivo: boolean;
  note?: string | null;
  nome: string;
  ruoli: Ruolo[];
}
interface Conteggi { tutti: number; cliente: number; fornitore: number; subagente: number; nonattivi: number }
interface Elenco { righe: Soggetto[]; totale: number; conteggi: Conteggi }
interface Sede {
  id: string;
  tipo: string;
  insegna: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  predefinita: boolean;
  valido_al: string | null;
}
interface Recapito {
  id: string;
  soggetto_id: string | null;
  sede_id: string | null;
  persona_id: string | null;
  tipo: string;
  valore: string;
  etichetta: string | null;
  predefinito: boolean;
  valido_al: string | null;
}
interface Contatto {
  id: string;
  persona: { id: string; nome: string; cognome: string };
  valido_al: string | null;
}
interface Fatturazione {
  codice_destinatario: string | null;
  pec_destinatario: string | null;
  id_paese_estero: string | null;
  id_codice_estero: string | null;
  regime_fiscale: string | null;
  split_payment: boolean;
  reverse_charge: boolean;
  esigibilita_iva: string | null;
  attiva: boolean;
}
interface Dettaglio extends Soggetto {
  sorgente: string;
  da_integra: boolean; // D-138: il master arriva da Integra e qui è in sola lettura
  sedi: Sede[];
  recapiti: Recapito[];
  contatti: Contatto[];
  fatturazione: Fatturazione | null;
}

const TITOLO_SEDE: Record<string, string> = {
  legale: 'Sede legale', operativa: 'Sede operativa', punto_vendita: 'Punto vendita', magazzino: 'Magazzino', fatturazione: 'Sede di fatturazione',
};
const TIPI_RECAPITO = ['email', 'pec', 'telefono', 'cellulare', 'fax', 'sito'];
const ETICHETTE_RECAPITO = ['', 'ordini', 'amministrazione', 'magazzino', 'direzione'];
const SORGENTE: Record<string, string> = { integra: 'Integra', vecchio_crm: 'Vecchio CRM', crm: 'Censita nel CRM' };
const ESIGIBILITA: Record<string, string> = { I: 'Immediata', D: 'Differita', S: 'Scissione dei pagamenti' };
const VARIANTE_RUOLO: Record<Ruolo['tipo'], Variante> = { cliente: 'info', fornitore: 'ok', subagente: 'attesa' };

const fiscale = (x: Soggetto) => (x.piva_norm ? 'P.IVA ' + x.piva_norm : x.cf_norm ? 'C.F. ' + x.cf_norm : 'Nessun dato fiscale');
const aperte = <T extends { valido_al: string | null }>(righe: T[]) => righe.filter((x) => !x.valido_al); // §1.4: chiuse con valido_al
// §4.3: valido_al è escluso e il server vuole una fine dopo l'inizio; il recapito chiude da domani

export function VistaSoggetti({ idSel }: { idSel?: string }) {
  const io = useUtente();
  const puo = usePuo();
  const router = useRouter();
  const perPagina = io.righe_pagina ?? 25;
  const [valori, setValori] = useMemoria<Valori>('filtri', { vista: 'tutti', q: '' });
  const [ordine, setOrdine] = useMemoria<{ key: string; dir: 'asc' | 'desc' }>('ordine', { key: 'codice', dir: 'asc' });
  const [pagina, setPagina] = useMemoria<number>('pagina', 0);
  const [sel, setSel] = useMemoria<string | undefined>('sel', undefined);
  const [dati, setDati] = useState<Elenco | null>(null);
  const [det, setDet] = useState<Dettaglio | null>(null);
  const [detCaricando, setDetCaricando] = useState(false);
  const [erroreDet, setErroreDet] = useState('');
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [versione, setVersione] = useState(0);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const primaVolta = useRef(true);
  const sagome = useSagome(caricando);
  const sagomaDet = useSagome(detCaricando && !det); // D-59: niente sagoma sotto i 150 ms, e non dopo un salvataggio

  const ricarica = () => setVersione((v) => v + 1);

  useEffect(() => {
    let vivo = true;
    setCaricando(true);
    const p = new URLSearchParams({ vista: String(valori.vista ?? 'tutti'), ordina: ordine.key, dir: ordine.dir, pagina: String(pagina + 1), righe: String(perPagina) });
    if (valori.q) p.set('q', String(valori.q));
    const t = setTimeout(() => {
      void api<Elenco>('soggetti?' + p.toString()).then((r) => {
        if (!vivo) return;
        setCaricando(false);
        if (r.ok) { setDati(r.dati); setErrore(''); } else if (!dati) setErrore(r.messaggio); else avviso(r.messaggio, true);
      });
    }, primaVolta.current ? 0 : 250);
    primaVolta.current = false;
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i parametri sono valori (filtri, ordine, pagina)
  }, [valori, ordine, pagina, versione, perPagina]);

  const id = idSel ?? sel ?? dati?.righe[0]?.id;
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    setDetCaricando(true);
    setErroreDet('');
    setDet((d) => (d?.id === id ? d : null)); // R2-03: dopo un salvataggio il pannello non si svuota
    void api<Dettaglio>('soggetti/' + id).then((r) => {
      if (!vivo) return; // R2-02: vince l'ultimo clic, non l'ultima risposta
      setDetCaricando(false);
      if (r.ok) { setDet(r.dati); return; }
      setErroreDet(r.messaggio); // R2-04: soggetto non caricato, non «nessun soggetto»
      if (r.stato === 404 && id === sel) setSel(undefined); // l'id ricordato non esiste più
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sel si legge solo per il 404
  }, [id, versione]);

  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  const puoModificare = puo('dati.modifica');

  /* ---------- Identità master ---------- */
  function formSoggetto(s: Soggetto | null) {
    const nuovo = !s;
    setFinestra(
      <FormModal titolo={nuovo ? 'Nuovo soggetto' : 'Modifica identità · ' + (s.nome || s.codice)}
        testo={nuovo ? 'Solo identità e chiavi di riconoscimento. Il nome arriverà con i ruoli, le sedi e i recapiti restano qui.' : undefined}
        conferma={nuovo ? 'Crea soggetto' : 'Salva'} colonne={2}
        campi={[
          { nome: 'natura', etichetta: 'Natura', tipo: 'select', valore: s?.natura ?? 'azienda', opzioni: [{ value: 'azienda', label: 'Azienda' }, { value: 'persona', label: 'Persona' }] },
          { nome: 'paese', etichetta: 'Paese (ISO 2)', valore: s?.paese ?? 'IT' },
          { nome: 'piva', etichetta: 'Partita IVA', valore: s?.piva ?? '', largo: true, aiuto: 'Com’è scritta in origine; la versione normalizzata si calcola in salvataggio.' },
          { nome: 'codice_fiscale', etichetta: 'Codice fiscale', valore: s?.codice_fiscale ?? '' },
          { nome: 'note', etichetta: 'Note', valore: s?.note ?? '', largo: true },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo = { natura: v.natura, paese: v.paese || 'IT', piva: v.piva || null, codice_fiscale: v.codice_fiscale || null, note: v.note || null };
          const r = nuovo ? await api<Soggetto>('soggetti', corpo) : await api<Soggetto>('soggetti/' + s.id, corpo, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso(nuovo ? 'Soggetto creato' : 'Identità salvata');
          ricarica();
          if (nuovo) router.push('/soggetti/' + r.dati.id);
        }}
      />,
    );
  }

  async function attiva(s: Soggetto, si: boolean) {
    const r = await api('soggetti/' + s.id + '/attivo', { attivo: si });
    if (!r.ok) {
      // il server dice quali ruoli attivi bloccano la disattivazione (D-102)
      if (!si) setFinestra(<Modale titolo={'Non si può disattivare ' + s.codice} onChiudi={chiudi}><p>{r.messaggio}</p></Modale>);
      else avviso(r.messaggio, true);
      return;
    }
    avviso(si ? 'Soggetto riattivato' : 'Soggetto disattivato');
    ricarica();
  }

  async function disattiva(s: Soggetto) {
    if (!(await chiedi('Disattivare ' + s.codice + '?', 'Nessuna cancellazione: il soggetto resta in elenco come non attivo, con i suoi dati.', 'Disattiva', true))) return;
    await attiva(s, false);
  }

  /* ---------- Ruoli (§5, D-101) ---------- */
  function aggiungiRuolo(s: Soggetto) {
    setFinestra(
      <FormModal titolo={'Aggiungi ruolo · ' + (s.nome || s.codice)} conferma="Aggiungi ruolo" colonne={2}
        campi={[
          { nome: 'tipo', etichetta: 'Ruolo', tipo: 'select', valore: 'cliente', opzioni: [{ value: 'cliente', label: 'Cliente' }, { value: 'fornitore', label: 'Fornitore' }] },
          { nome: 'nome', etichetta: 'Ragione sociale', valore: '', largo: true, aiuto: 'Va nella versione del ruolo, come in Integra.' },
          { nome: 'citta', etichetta: 'Città (ruoli azienda)', valore: '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          // D-138: senza codice Integra; il legame nasce da Cerca in Integra → Importa
          const r = await api<Ruolo>('soggetti/' + s.id + '/ruoli', { tipo: v.tipo, ragione_sociale: v.nome, citta: v.citta || null });
          if (!r.ok) return r.messaggio;
          avviso('Ruolo aggiunto');
          ricarica();
        }}
      />,
    );
  }

  /* ---------- Sedi (§4.2) ---------- */
  function formSede(s: Soggetto, sede: Sede | null) {
    const nuovo = !sede;
    setFinestra(
      <FormModal titolo={(nuovo ? 'Nuova sede · ' : 'Sede · ') + (s.nome || s.codice)} conferma="Salva sede" colonne={2}
        campi={[
          { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', valore: sede?.tipo ?? 'punto_vendita', opzioni: Object.entries(TITOLO_SEDE).map(([value, label]) => ({ value, label })) },
          { nome: 'insegna', etichetta: 'Insegna del punto vendita', valore: sede?.insegna ?? '', aiuto: 'Vuota per le sedi legali o di magazzino.' },
          { nome: 'indirizzo', etichetta: 'Indirizzo', valore: sede?.indirizzo ?? '', largo: true },
          { nome: 'cap', etichetta: 'CAP', valore: sede?.cap ?? '' },
          { nome: 'citta', etichetta: 'Città', valore: sede?.citta ?? '' },
          { nome: 'provincia', etichetta: 'Provincia', valore: sede?.provincia ?? '', aiuto: 'Due lettere.' },
          { nome: 'predefinita', etichetta: 'Predefinita di questo tipo', tipo: 'casella', valore: !!sede?.predefinita, aiuto: 'Una sola per tipo: l’export a Integra porta l’indirizzo della predefinita.' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo = {
            tipo: v.tipo, insegna: v.insegna || null, indirizzo: v.indirizzo || null, cap: v.cap || null,
            citta: v.citta || null, provincia: v.provincia || null, predefinita: !!v.predefinita,
          };
          const r = nuovo ? await api('soggetti/' + s.id + '/sedi', corpo) : await api('soggetti/' + s.id + '/sedi/' + sede.id, corpo, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso('Sede salvata');
          ricarica();
        }}
      />,
    );
  }

  /* ---------- Recapiti (§4.3) ---------- */
  function formRecapito(s: Dettaglio, x: Recapito | null) {
    const nuovo = !x;
    const sedi = aperte(s.sedi), contatti = aperte(s.contatti);
    const doveDi = (r: Recapito) => (r.sede_id ? 'se' + r.sede_id : r.persona_id ? 'pe' + r.persona_id : 'so');
    setFinestra(
      <FormModal titolo={(nuovo ? 'Nuovo recapito · ' : 'Recapito · ') + (s.nome || s.codice)} conferma="Salva recapito" colonne={2}
        azioniExtra={x ? [{ etichetta: 'Disattiva', variante: 'pericolo' as const, onClick: () => { chiudi(); void disattivaRecapito(s, x); } }] : undefined}
        campi={[
          { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', valore: x?.tipo ?? 'email', opzioni: TIPI_RECAPITO.map((k) => ({ value: k, label: k })) },
          { nome: 'valore', etichetta: 'Valore', valore: x?.valore ?? '', largo: true, aiuto: 'Le email in minuscolo: si salva anche normalizzato.' },
          {
            nome: 'dove', etichetta: 'Allegato a', tipo: 'select', valore: x ? doveDi(x) : 'so',
            // §4.3: un recapito sta su uno solo fra soggetto, sede e persona; dopo la creazione non si sposta
            disabilitato: !nuovo, aiuto: nuovo ? undefined : 'Non si sposta: per cambiarlo si crea un recapito nuovo.',
            opzioni: [
              { value: 'so', label: 'Soggetto' },
              ...sedi.map((y) => ({ value: 'se' + y.id, label: 'Sede: ' + (y.insegna || TITOLO_SEDE[y.tipo] || y.tipo) })),
              ...contatti.map((c) => ({ value: 'pe' + c.persona.id, label: c.persona.nome + ' ' + c.persona.cognome })),
            ],
          },
          { nome: 'etichetta', etichetta: 'Uso', tipo: 'select', valore: x?.etichetta ?? '', opzioni: ETICHETTE_RECAPITO.map((k) => ({ value: k, label: k || '—' })) },
          { nome: 'predefinito', etichetta: 'Predefinito per questo uso', tipo: 'casella', valore: !!x?.predefinito },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = { tipo: v.tipo, valore: v.valore, etichetta: v.etichetta || null, predefinito: !!v.predefinito };
          if (nuovo) {
            const dove = String(v.dove || 'so');
            if (dove === 'so') corpo.soggetto_id = Number(s.id);
            else if (dove.startsWith('se')) corpo.sede_id = Number(dove.slice(2));
            else corpo.persona_id = Number(dove.slice(2));
          }
          const r = nuovo ? await api('soggetti/' + s.id + '/recapiti', corpo) : await api('soggetti/' + s.id + '/recapiti/' + x.id, corpo, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso('Recapito salvato');
          ricarica();
        }}
      />,
    );
  }

  async function disattivaRecapito(s: Dettaglio, r: Recapito) {
    if (!(await chiedi('Disattivare il recapito?', 'Resta nei dati ma non si usa più; i documenti passati lo citano.', 'Disattiva', true))) return;
    const esito = await api('soggetti/' + s.id + '/recapiti/' + r.id, { valido_al: domani() }, 'PUT');
    if (!esito.ok) { avviso(esito.messaggio, true); return; }
    avviso('Recapito disattivato');
    ricarica();
  }

  /* ---------- Fatturazione elettronica (§4.5) ---------- */
  function formFatturazione(s: Dettaglio) {
    const f = s.fatturazione;
    setFinestra(
      <FormModal titolo={'Fatturazione elettronica · ' + (s.nome || s.codice)} conferma="Salva" colonne={2}
        campi={[
          { nome: 'attiva', etichetta: 'Configurata', tipo: 'select', valore: f?.attiva ? 'si' : 'no', opzioni: [{ value: 'si', label: 'Sì' }, { value: 'no', label: 'No' }] },
          { nome: 'codice_destinatario', etichetta: 'Codice destinatario SDI (7 caratteri)', valore: f?.codice_destinatario ?? '', aiuto: 'Oppure la PEC; per i destinatari esteri si lascia vuoto.' },
          { nome: 'pec_destinatario', etichetta: 'PEC del destinatario', valore: f?.pec_destinatario ?? '' },
          { nome: 'regime_fiscale', etichetta: 'Regime fiscale', tipo: 'select', valore: f?.regime_fiscale ?? '', opzioni: ['', 'RF01', 'RF02', 'RF04', 'RF08', 'RF10', 'RF16', 'RF19'].map((k) => ({ value: k, label: k || '—' })) },
          { nome: 'esigibilita_iva', etichetta: 'Esigibilità IVA', tipo: 'select', valore: f?.esigibilita_iva ?? '', opzioni: [{ value: '', label: '—' }, { value: 'I', label: 'Immediata' }, { value: 'D', label: 'Differita' }, { value: 'S', label: 'Scissione' }] },
          { nome: 'split_payment', etichetta: 'Split payment', tipo: 'casella', valore: !!f?.split_payment },
          { nome: 'reverse_charge', etichetta: 'Reverse charge', tipo: 'casella', valore: !!f?.reverse_charge },
          { nome: 'id_paese_estero', etichetta: 'Paese estero (ISO 2)', valore: f?.id_paese_estero ?? '', aiuto: 'Solo per i destinatari senza SDI.' },
          { nome: 'id_codice_estero', etichetta: 'Identificativo estero', valore: f?.id_codice_estero ?? '', largo: true },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const r = await api('soggetti/' + s.id + '/fatturazione', {
            attiva: v.attiva === 'si', codice_destinatario: v.codice_destinatario || null, pec_destinatario: v.pec_destinatario || null,
            regime_fiscale: v.regime_fiscale || null, esigibilita_iva: v.esigibilita_iva || null,
            split_payment: !!v.split_payment, reverse_charge: !!v.reverse_charge,
            id_paese_estero: v.id_paese_estero || null, id_codice_estero: v.id_codice_estero || null,
          }, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso('Fatturazione salvata');
          ricarica();
        }}
      />,
    );
  }

  /* ---------- Elenco ---------- */
  const filtri = (
    <FilterBar valori={valori} onChange={(v) => { setValori(v); setPagina(0); }} caricando={sagome && !dati} campi={[
      { nome: 'q', tipo: 'cerca', placeholder: 'Codice, nome, P.IVA o codice fiscale' },
      { nome: 'vista', tipo: 'segmenti', opzioni: [
        { value: 'tutti', label: 'Tutti', n: dati?.conteggi.tutti },
        { value: 'cliente', label: 'Clienti', n: dati?.conteggi.cliente },
        { value: 'fornitore', label: 'Fornitori', n: dati?.conteggi.fornitore },
        { value: 'subagente', label: 'Subagenti', n: dati?.conteggi.subagente },
        { value: 'nonattivi', label: 'Non attivi', n: dati?.conteggi.nonattivi },
      ] },
    ]} />
  );

  const colonne: Colonna<Soggetto>[] = [
    { key: 'codice', header: 'Codice' },
    { key: 'nome', header: 'Soggetto', grow: true, cell: (x) => <><b>{x.nome || 'Senza ruolo'}</b><span className="sec-riga">{fiscale(x)}</span></> },
    {
      key: 'ruoli', header: 'Ruoli', sortable: false,
      cell: (x) => x.ruoli.filter((r) => r.attivo).map((r) => <Stato key={r.tipo} v={VARIANTE_RUOLO[r.tipo]}>{r.tipo}</Stato>),
    },
    { key: 'attivo', header: 'Stato', sortable: false, cell: (x) => (x.attivo ? null : <Stato v="neutro">non attivo</Stato>) },
  ];

  const apriRuolo = (r: Ruolo) => '/' + (r.tipo === 'cliente' ? 'clienti' : r.tipo === 'fornitore' ? 'fornitori' : 'subagenti') + '/' + r.id;

  /* ---------- Scheda del soggetto ---------- */
  const ruoli = det?.ruoli ?? [];
  const sedi = aperte(det?.sedi ?? []);
  const recapiti = aperte(det?.recapiti ?? []);
  const f = det?.fatturazione;

  function tabRuoli() {
    if (!det) return null;
    return (
      <div className="pila riempi">
        <div className="strumenti-scheda">
          <span className="spazio" />
          <Informazioni titolo="Informazioni sui ruoli">
            <ul>
              <li>Il ruolo si chiude nella sua pagina (attivo = false): i documenti restano appesi.</li>
              <li>Il codice di Integra arriva dall’import, non si scrive a mano.</li>
              <li>Un clic sulla riga apre la pagina del ruolo.</li>
            </ul>
          </Informazioni>
          {puoModificare && <button type="button" className="btn sec piccolo" onClick={() => aggiungiRuolo(det)}><Icona nome="piu" /> Aggiungi ruolo</button>}
        </div>
        <div className="riempi">
          <DataTable compatta righe={ruoli} chiave={(r) => r.tipo} ordinamentoIniziale={{ key: 'tipo', dir: 'asc' }}
            colonne={[
              { key: 'tipo', header: 'Ruolo', cell: (r) => <Stato v={VARIANTE_RUOLO[r.tipo]}>{r.tipo}</Stato> },
              { key: 'nome', header: 'Nome', grow: true, cell: (r) => <><Link href={apriRuolo(r)}><b>{r.nome || '—'}</b></Link>{r.attivo ? '' : <> <Stato v="neutro">chiuso</Stato></>}</> },
              { key: 'codice', header: 'Codice Integra', cell: (r) => r.codice || <span className="testo-tenue">—</span> },
            ] as Colonna<Ruolo>[]}
            onRowClick={(r) => router.push(apriRuolo(r))} emptyText="Nessun ruolo" emptyHint="Un soggetto può essere cliente e fornitore insieme: due codici diversi (D-101)." />
        </div>
      </div>
    );
  }

  function tabSedi() {
    if (!det) return null;
    return (
      <div className="pila riempi">
        <div className="strumenti-scheda">
          <span className="spazio" />
          <Informazioni titolo="Informazioni sulle sedi">
            <ul>
              <li>Una catena = un soggetto con N punti vendita (Consorzio Agrario, MCL): i documenti restano appesi alla sede.</li>
              <li>Valido_al chiude, non si cancella.</li>
            </ul>
          </Informazioni>
          {puoModificare && <button type="button" className="btn sec piccolo" onClick={() => formSede(det, null)}><Icona nome="piu" /> Nuova sede</button>}
        </div>
        <div className="riempi">
          <DataTable compatta righe={sedi} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'tipo', dir: 'asc' }}
            colonne={[
              { key: 'tipo', header: 'Tipo', cell: (x) => <Stato v={x.tipo === 'punto_vendita' ? 'attesa' : 'neutro'}>{TITOLO_SEDE[x.tipo] ?? x.tipo}</Stato> },
              { key: 'insegna', header: 'Insegna', grow: true, cell: (x) => <><b>{x.insegna || ''}</b><span className="sec-riga">{[x.indirizzo, x.cap, x.citta, x.provincia].filter(Boolean).join(', ')}</span></> },
              { key: 'predefinita', header: '', sortable: false, cell: (x) => (x.predefinita ? <Stato v="ok">Predefinita</Stato> : null) },
            ] as Colonna<Sede>[]}
            onRowClick={puoModificare ? (x) => formSede(det, x) : undefined}
            emptyText="Nessuna sede" emptyHint="Il settore e il gruppo sono della sede, non dell’azienda." />
        </div>
      </div>
    );
  }

  function tabRecapiti() {
    if (!det) return null;
    const sedeDi = (x: Recapito) => det.sedi.find((y) => y.id === x.sede_id)?.insegna || 'sede';
    const personaDi = (x: Recapito) => {
      const c = det.contatti.find((y) => y.persona.id === x.persona_id);
      return c ? c.persona.nome + ' ' + c.persona.cognome : 'persona';
    };
    return (
      <div className="pila riempi">
        <div className="strumenti-scheda">
          <span className="spazio" />
          {puoModificare && <button type="button" className="btn sec piccolo" onClick={() => formRecapito(det, null)}><Icona nome="piu" /> Nuovo recapito</button>}
        </div>
        <div className="riempi">
          <DataTable compatta righe={recapiti} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'tipo', dir: 'asc' }}
            colonne={[
              { key: 'tipo', header: 'Tipo' },
              { key: 'valore', header: 'Recapito', grow: true, cell: (x) => <><b>{x.valore}</b>{x.etichetta && <span className="sec-riga">{x.etichetta}</span>}</> },
              { key: 'dove', header: 'Allegato a', sortable: false, cell: (x) => (x.sede_id ? sedeDi(x) : x.persona_id ? personaDi(x) : 'soggetto') },
              { key: 'predefinito', header: '', sortable: false, cell: (x) => (x.predefinito ? <Stato v="ok">Predefinito</Stato> : null) },
            ] as Colonna<Recapito>[]}
            onRowClick={puoModificare ? (x) => formRecapito(det, x) : undefined}
            emptyText="Nessun recapito" emptyHint="Una email per soggetto non basta: ordini, fatture, PEC e solleciti vanno su indirizzi diversi. (§4.3)" />
        </div>
      </div>
    );
  }

  function tabFatturazione() {
    if (!det) return null;
    return (
      <div className="pila">
        <div className="strumenti-scheda"><span className="spazio" /><Informazioni titolo="Informazioni sulla fatturazione">
          <ul>
            <li>Dati dell’amministrazione che cambiano nel tempo; sono del soggetto fiscale, non del ruolo: usati anche nelle fatture dei fornitori. (§4.5)</li>
          </ul>
        </Informazioni></div>
        <Dettagli inColonne voci={[
          { etichetta: 'Configurata', valore: f?.attiva ? <Stato v="ok">Sì</Stato> : <Stato v="neutro">No</Stato> },
          { etichetta: 'Codice SDI', valore: f?.codice_destinatario ? <b>{f.codice_destinatario}</b> : <span className="testo-tenue">—</span> },
          { etichetta: 'PEC', valore: f?.pec_destinatario ?? <span className="testo-tenue">—</span> },
          { etichetta: 'ID estero', valore: f?.id_codice_estero ? [f.id_paese_estero, f.id_codice_estero].filter(Boolean).join(' · ') : <span className="testo-tenue">—</span> },
          { etichetta: 'Regime fiscale', valore: f?.regime_fiscale ?? <span className="testo-tenue">—</span> },
          { etichetta: 'Esigibilità IVA', valore: f?.esigibilita_iva ? (ESIGIBILITA[f.esigibilita_iva] ?? f.esigibilita_iva) : <span className="testo-tenue">—</span> },
        ]} />
        {f && (f.split_payment || f.reverse_charge) && <Nota>{(f.split_payment ? 'Split payment. ' : '') + (f.reverse_charge ? 'Reverse charge.' : '')}</Nota>}
        {puoModificare && <div className="strumenti-scheda"><button type="button" className="btn sec piccolo" onClick={() => formFatturazione(det)}><Icona nome="piu" /> Modifica fatturazione</button></div>}
      </div>
    );
  }

  // D-138: il master di un soggetto da Integra non si modifica qui (il server risponde comunque 409)
  const azioni: Azione[] = !det || !puoModificare || det.da_integra ? [] : [
    { etichetta: 'Modifica identità', onClick: () => formSoggetto(det) },
    det.attivo ? { etichetta: 'Disattiva', variante: 'pericolo', onClick: () => void disattiva(det) } : { etichetta: 'Riattiva', onClick: () => void attiva(det, true) },
  ];

  const cornice = (corpo?: ReactNode) => (
    <Pagina titolo="Soggetti" pieno azioni={puoModificare ? [{ etichetta: 'Nuovo soggetto', icona: 'piu', onClick: () => formSoggetto(null) }] : []}
      sottotitolo="Anagrafica unica (D-102): identità, sedi e recapiti sono del soggetto; cliente, fornitore e subagente sono ruoli sopra.">
      {corpo}
      {finestra}
    </Pagina>
  );

  if (!dati) {
    return cornice(errore
      ? <Pannello><div className="vuoto"><b>Soggetti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={ricarica}>Riprova</button></div></Pannello>
      : sagome && <SagomaElenco filtri={filtri} larghezze="minmax(0,1fr) minmax(560px,1fr)" />);
  }

  const pagine = Math.max(1, Math.ceil(dati.totale / perPagina));

  return cornice(
    <div className="colonne pari riempi" style={{ '--colonne': 'minmax(0,1fr) minmax(560px,1fr)' } as CSSProperties}>
      <div className="pila riempi soggetti-filtri">
        {filtri}
        <div className="riempi">
          <DataTable righe={dati.righe} colonne={colonne} chiave={(x) => x.id} memoria="soggetti" caricando={sagome}
            ordine={ordine} onOrdine={(o) => { setOrdine(o); setPagina(0); }}
            paginaServer={{ pagina, pagine, totale: dati.totale }} onPagina={setPagina}
            perPagina={perPagina} filtro={JSON.stringify({ valori, ordine })}
            rowClass={(x) => (x.id === det?.id ? 'selezionata' : '')}
            onRowClick={(x) => { setSel(x.id); router.push('/soggetti/' + x.id); }}
            emptyText="Nessun soggetto" emptyHint="Cambia la ricerca o il segmento." />
        </div>
      </div>
      <Pannello titolo={det ? det.nome || 'Soggetto ' + det.codice : 'Soggetto'} nota="identità master" riempi azioni={azioni}>
        {det ? (
          <>
            <Dettagli inColonne voci={[
              { etichetta: 'Codice', valore: <><b>{det.codice}</b> <span className="testo-tenue">· come si cita al telefono</span></> },
              { etichetta: 'Natura', valore: det.natura === 'persona' ? 'Persona' : 'Azienda' },
              { etichetta: 'Partita IVA', valore: det.piva ? <>{det.piva}<span className="testo-tenue"> · normalizzata {det.piva_norm}</span></> : <span className="testo-tenue">—</span> },
              { etichetta: 'Codice fiscale', valore: det.codice_fiscale ?? <span className="testo-tenue">—</span> },
              { etichetta: 'Paese', valore: det.paese },
              { etichetta: 'Sorgente', valore: SORGENTE[det.sorgente as string] ?? String(det.sorgente ?? '—') },
              { etichetta: 'Stato', valore: det.attivo ? <Stato v="ok">Attivo</Stato> : <Stato v="neutro">Non attivo: i documenti restano appesi ai loro ruoli</Stato> },
            ]} />
            {det.da_integra && <Nota>Da Integra: i dati del soggetto si correggono in Integra. Qui restano in sola lettura; ruoli e agenzie si gestiscono come sempre.</Nota>}
            {det.note && <Nota>{det.note}</Nota>}
            <div style={{ height: 8, flex: 'none' }} />
            <Schede riempi memoria="soggetti" schede={[
              { id: 'ruoli', etichetta: 'Ruoli', conta: ruoli.length, contenuto: tabRuoli },
              { id: 'sedi', etichetta: 'Sedi', conta: sedi.length, contenuto: tabSedi },
              { id: 'recapiti', etichetta: 'Recapiti', conta: recapiti.length, contenuto: tabRecapiti },
              { id: 'fatturazione', etichetta: 'Fatturazione', conta: f?.attiva ? 1 : 0, contaVariante: f?.attiva ? 'ok' : 'neutro', contenuto: tabFatturazione },
            ]} />
          </>
        ) : erroreDet ? (
          <div className="vuoto"><b>Soggetto non caricato</b>{erroreDet} <button type="button" className="btn sec piccolo" onClick={ricarica}>Riprova</button></div>
        ) : sagomaDet ? <SagomaCorpo /> : (
          <Nota>Nessun soggetto: cambia la ricerca o il segmento, oppure crea il primo con «Nuovo soggetto».</Nota>
        )}
      </Pannello>
    </div>,
  );
}
