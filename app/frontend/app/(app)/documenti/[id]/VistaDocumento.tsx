'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CampoRicerca } from '@/componenti/CampoRicerca';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { Scelte } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { Schede, type Scheda } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { Visualizzatore, type DocFile } from '@/componenti/Visualizzatore';
import { PdfEvidenziato } from '@/componenti/PdfEvidenziato';
import { api } from '@/lib/api';
import { cliente as entitaCliente, fornitore as entitaFornitore, type Entita } from '@/lib/entita';
import { data, euro, euroSegno } from '@/lib/formati';

// Documento scelto nella pagina Documenti (F6-A4b, §7.9, D-15): pannello di destra con i dati
// letti, prima l'azione proposta e poi le righe; il file originale sta nella finestra di
// correzione. Azioni, proposta, controlli e affidabilità arrivano dal server (V12, D-28).

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const STATO_PRATICA: Record<string, { testo: string; v: Variante }> = {
  inviato: { testo: 'Attesa conferma', v: 'attesa' },
  confermato: { testo: 'Confermata', v: 'info' },
  fatturato: { testo: 'Fatturata', v: 'ok' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
};
// Scelta dichiarata (F6-A4b): i bordi dei campi usano 0,90/0,70 fissi come il prototipo, perché le
// soglie vere stanno nelle Impostazioni e il dettaglio non le riceve. Il livello del documento resta
// quello calcolato dal server.
const SOGLIA_OK = 0.9;
const SOGLIA_BASSA = 0.7;

const PRATICA: Entita = {
  titolo: 'Pratica',
  voci: async (ctx) => {
    const r = await api<Record<string, unknown>[]>('pratiche/cerca?fornitore_id=' + String(ctx.fornitore_id ?? ''));
    return r.ok ? r.dati : [];
  },
  chiave: (p) => p.id,
  testo: (p) => p.numero,
  dettaglio: (p) => p.cliente + ' · ' + data(p.data) + ' · ' + p.stato,
  cerca: (p) => p.cliente + ' ' + p.numero,
  colonne: [
    { key: 'numero', header: 'Pratica' },
    { key: 'cliente', header: 'Cliente', grow: true },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'stato', header: 'Stato' },
  ],
};

interface Posizione { tipo?: string; pagina?: number; x0?: number; y0?: number; x1?: number; y1?: number }
interface Campo {
  campo: string; valore_letto: string | null; valore_finale: string | null;
  affidabilita: number | null; posizione: Posizione | null; precisione: string | null; verificato: boolean;
}
interface Riga {
  i: number; codice: string | null; descrizione: string | null; quantita: number | null; prezzo: number | null;
  importo: number | null; numero_fattura: string | null; data_fattura: string | null; provvigione: number | null;
}
interface Testata {
  tipo: string | null; numero: string | null; data: string | null; fornitore_id: string | null;
  codice_cliente: string | null; cliente: string | null; importo: number | null;
  mese: number | null; anno: number | null; riferimento_fattura: string | null;
}
interface Controllo { codice: string; campo: string; testo: string; grave: boolean }
interface Candidato {
  pratica: { id: string; numero: string; cliente: string | null; stato: string; data_ordine: string };
  punteggio: number; motivi: string[]; delta: number;
}
interface Proposta {
  esito: string; candidati: Candidato[]; importo: number;
  abbinamento: { cliente_id: string; cliente: string | null; codice: string | null } | null;
  cliente_riconosciuto: { cliente_id: string; ragione: string | null } | null;
}
interface Dettaglio {
  id: string; file_nome: string; file_tipo: 'pdf' | 'jpg' | 'png'; stato: string; tipo: string | null;
  livello: string | null; ricevuto_il: string; letto_il: string | null; errore: string | null;
  fornitore: { id: string; nome: string | null } | null;
  campi: Campo[]; testata: Testata; righe: Riga[]; controlli: Controllo[];
  proposta: Proposta; bollettino: { esiste: boolean } | null;
}

/** Punti da controllare (come M.statoLettura): controlli falliti + campi incerti con un valore. */
function punti(d: Dettaglio) {
  let n = d.controlli.length;
  for (const c of d.campi) {
    if (c.campo === 'tipo' || c.verificato || c.affidabilita == null) continue;
    if (c.affidabilita < SOGLIA_OK && (c.valore_finale ?? c.valore_letto) != null) n++;
  }
  return n;
}

/** Righe con almeno un valore incerto: per il contatore della scheda Righe lette. */
function righeIncerte(d: Dettaglio) {
  const out = new Set<number>();
  for (const c of d.campi) {
    const m = /^righe\[(\d+)\]\./.exec(c.campo);
    if (!m || c.verificato || c.affidabilita == null) continue;
    if (c.affidabilita < SOGLIA_OK && (c.valore_finale ?? c.valore_letto) != null) out.add(Number(m[1]));
  }
  return out;
}

const classeAff = (a: number | null, verificato: boolean) =>
  a == null ? '' : verificato && a < SOGLIA_OK ? 'campo-verificato' : verificato ? '' : a < SOGLIA_BASSA ? 'incerto-errore' : a < SOGLIA_OK ? 'incerto-attesa' : '';

export function VistaDocumento({ id, onFatto }: { id: string; onFatto?: () => void }) {
  const router = useRouter();
  const puo = usePuo();
  const puoModifica = puo('provvigioni.modifica');
  const [d, setD] = useState<Dettaglio | null>(null);
  const [errore, setErrore] = useState('');
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [scheda, setScheda] = useState('azioni');
  const [altra, setAltra] = useState('');
  const [bollettinoId, setBollettinoId] = useState<string | null>(null);
  const sagome = useSagome(!d);

  const carica = useCallback(async () => {
    const r = await api<Dettaglio>('documenti/' + id);
    if (r.ok) { setD(r.dati); setErrore(''); } else setErrore(r.messaggio);
  }, [id]);
  useEffect(() => { void carica(); }, [carica]);

  // il bollettino già registrato: serve solo il collegamento alla verifica (D-71)
  useEffect(() => {
    const t = d?.testata;
    if (!d?.bollettino?.esiste || !d.fornitore || !t?.mese || !t?.anno) return;
    const al = t.anno + '-' + String(t.mese).padStart(2, '0');
    void api<{ fornitori: { celle: { mese: string; bollettino_id: string | null }[] }[] }>(
      'bollettini?al=' + al + '&fornitori=' + d.fornitore.id + '&vista=tutti',
    ).then((r) => {
      if (!r.ok) return;
      const cella = r.dati.fornitori[0]?.celle.find((c) => c.mese === al);
      if (cella?.bollettino_id) setBollettinoId(cella.bollettino_id);
    });
  }, [d]);

  const chiudi = () => setFinestra(null);
  const salvato = (x: Dettaglio) => {
    const n = punti(x);
    setD(x);
    chiudi();
    onFatto?.();
    avviso(n ? `Dati salvati: restano ${n} ${n === 1 ? 'punto' : 'punti'} da controllare` : 'Dati salvati: lettura controllata, l’abbinamento è ricalcolato');
  };

  if (!d) {
    return (
      <Pannello riempi>
        {errore
          ? <div className="vuoto"><b>Documento non caricato</b>{errore}
            <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div>
          : sagome && (
            <div className="pila" aria-busy="true">
              <Sagoma larghezza="100%" altezza={96} />
              <Sagoma larghezza="100%" altezza={420} />
            </div>
          )}
      </Pannello>
    );
  }

  const doc: Dettaglio = d;
  const t = doc.testata;
  const boll = t.tipo === 'bollettino' || doc.tipo === 'bollettino';
  const nomeFornitore = doc.fornitore?.nome ?? 'non riconosciuto';
  const n = punti(doc);
  const incerte = righeIncerte(doc);
  const etichettaTipo = t.tipo ? TIPO[t.tipo] ?? t.tipo : 'Documento';
  const ab = doc.proposta.abbinamento;

  async function inviaAbbina(corpo: Record<string, unknown>) {
    const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/abbina', corpo);
    if (!r.ok) { avviso(r.messaggio, true); return false; }
    avviso('Documento abbinato alla pratica ' + r.dati.pratica.numero);
    router.push('/pratiche/' + r.dati.pratica.id);
    return true;
  }

  /** Con lettura bassa l'abbinamento chiede conferma (come il prototipo, §6.5 punto 6). */
  async function seAffidabile(fn: () => void | Promise<void>) {
    if (doc.livello !== 'bassa') { await fn(); return; }
    const si = await new Promise<boolean>((ok) => setFinestra(
      <Conferma titolo="Lettura con affidabilità bassa"
        testo={`Ci sono ${n} ${n === 1 ? 'punto' : 'punti'} da controllare nei dati letti. Conviene correggerli prima: vuoi procedere comunque?`}
        etichetta="Procedi comunque" onRisposta={(x) => { chiudi(); ok(x); }} />,
    ));
    if (si) await fn();
  }

  /** Nota di credito: la fattura stornata si cerca nella pratica; se manca si sceglie. */
  async function abbinaNota(praticaId: string) {
    const r = await api<{ documenti: { id: string; tipo: string; numero: string; data: string }[] }>('pratiche/' + praticaId + '/documenti');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    const fatture = r.dati.documenti.filter((x) => x.tipo === 'fattura');
    if (!fatture.length) { avviso('La pratica non ha fatture da stornare: scegline un’altra o scarta il documento.', true); return; }
    const trovata = fatture.find((x) => x.numero === t.riferimento_fattura);
    const abbina = (fatturaId: string) => inviaAbbina({
      tipo: 'nota_credito', pratica_id: Number(praticaId), numero: t.numero, data: t.data,
      importo: t.importo ?? undefined, fattura_id: Number(fatturaId),
    });
    if (trovata) { await abbina(trovata.id); return; }
    setFinestra(
      <FormModal titolo="Quale fattura storna questa nota di credito?"
        testo={t.riferimento_fattura ? `Il riferimento letto è ${t.riferimento_fattura}, ma la pratica non ha una fattura con quel numero.` : 'Il documento non riporta il numero della fattura stornata.'}
        conferma="Abbina" campi={[{
          nome: 'fattura_id', etichetta: 'Fattura stornata', tipo: 'select', largo: true,
          opzioni: fatture.map((f) => ({ value: f.id, label: f.numero + ' del ' + data(f.data) })),
        }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.fattura_id) return 'Scegli la fattura stornata.';
          return (await abbina(v.fattura_id)) ? undefined : 'Abbinamento non riuscito.';
        }} />);
  }

  async function abbinaPratica(praticaId: string) {
    if (t.tipo === 'nota_credito') { await abbinaNota(praticaId); return; }
    await inviaAbbina({
      tipo: t.tipo, pratica_id: Number(praticaId), numero: t.numero, data: t.data, importo: t.importo ?? undefined,
    });
  }

  function apriNuova() {
    setFinestra(
      <FormModal titolo="Apri la pratica" conferma="Apri la pratica" colonne={2}
        testo="La pratica nasce dall’ordine. Cliente e fornitore servono per l’agenzia e la provvigione."
        campi={[
          { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: entitaFornitore, largo: true, valore: t.fornitore_id ?? '' },
          { nome: 'cliente_id', etichetta: 'Cliente', tipo: 'ricerca', entita: entitaCliente, largo: true, valore: ab?.cliente_id ?? doc.proposta.cliente_riconosciuto?.cliente_id ?? '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const fornitoreId = v.fornitore_id || t.fornitore_id;
          if (!v.cliente_id || !fornitoreId) return 'Scegli cliente e fornitore.';
          const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/abbina', {
            tipo: 'ordine', numero: t.numero, data: t.data, importo: t.importo ?? undefined,
            cliente_id: Number(v.cliente_id), fornitore_id: Number(fornitoreId),
          });
          if (!r.ok) return r.messaggio;
          avviso('Aperta la pratica ' + r.dati.pratica.numero);
          router.push('/pratiche/' + r.dati.pratica.id);
        }} />);
  }

  function apriBollettino() {
    setFinestra(
      <FormModal titolo={'Registra il bollettino di ' + (t.mese ? MESI[t.mese - 1] : '') + ' ' + (t.anno ?? '')}
        conferma="Registra e verifica" colonne={2}
        testo="Dopo la registrazione lo confronti riga per riga con le nostre pratiche."
        campi={[
          { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: entitaFornitore, largo: true, valore: t.fornitore_id ?? '' },
          { nome: 'mese', etichetta: 'Mese', tipo: 'select', valore: String(t.mese ?? ''), opzioni: MESI.map((m, i) => ({ value: String(i + 1), label: m })) },
          { nome: 'anno', etichetta: 'Anno', tipo: 'numero', valore: t.anno ?? '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const fornitoreId = v.fornitore_id || t.fornitore_id;
          if (!fornitoreId) return 'Scegli il fornitore.';
          const r = await api<{ id: string }>('bollettini', {
            fornitore_id: Number(fornitoreId), anno: Number(v.anno), mese: Number(v.mese), arrivo_id: Number(id),
          });
          if (!r.ok) return r.messaggio;
          avviso('Bollettino registrato: ora verificalo');
          router.push('/bollettini/' + r.dati.id);
        }} />);
  }

  function scarta() {
    setFinestra(
      <FormModal titolo={'Scartare ' + etichettaTipo.toLowerCase() + (t.numero ? ' ' + t.numero : '') + '?'}
        conferma="Scarta" pericolo colonne={1}
        testo="Il documento esce dall’elenco e non viene registrato. Resta fra i documenti scartati per 90 giorni e si può recuperare."
        campi={[
          { nome: 'motivo', etichetta: 'Motivo', tipo: 'select', opzioni: ['Doppione', 'Non riguarda Decobrands', 'Documento illeggibile', 'Altro'].map((x) => ({ value: x, label: x })) },
          { nome: 'nota', etichetta: 'Nota (facoltativa)', segnaposto: 'es. arrivato due volte' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const r = await api('documenti/' + id + '/scarta', { motivo: v.motivo, nota: v.nota || undefined });
          if (!r.ok) return r.messaggio;
          avviso('Documento scartato: lo trovi fra gli scartati');
          onFatto?.();
          router.push('/documenti');
        }} />);
  }

  /** Riapre il file originale accanto ai dati letti, senza passare dalla correzione. */
  function apriPdf() {
    const f: DocFile = {
      id: doc.id, arrivo_id: doc.id, file_nome: doc.file_nome, tipo: t.tipo ?? 'altro', numero: t.numero,
      data: t.data ?? doc.ricevuto_il.slice(0, 10), importo: t.importo,
    };
    setFinestra(<Visualizzatore docs={[f]} iniziale={f} onChiudi={chiudi}
      titolo="Il documento originale" testo="A sinistra il file, a destra i dati letti." />);
  }

  const azioni: Azione[] = [
    ...(doc.file_nome ? [{
      etichetta: 'PDF', variante: 'sec' as const, onClick: apriPdf, titolo: 'Riapri il documento originale',
    }] : []),
    ...(puoModifica && d.stato === 'da_controllare' ? [{
      etichetta: 'Correggi i dati letti', onClick: () => setFinestra(<FinestraCorreggi d={d} onChiudi={chiudi} onSalvato={salvato} />),
      conta: n || undefined, contaVariante: d.livello === 'bassa' ? 'errore' as const : 'attesa' as const,
      titolo: n + (n === 1 ? ' punto da controllare' : ' punti da controllare'),
    }] : []),
    ...(puoModifica && ['da_controllare', 'errore', 'in_coda'].includes(d.stato) ? [{
      etichetta: 'Scarta il documento', variante: 'pericolo' as const, onClick: scarta,
    }] : []),
  ];

  const testata = boll ? [
    { etichetta: 'Fornitore', valore: nomeFornitore },
    { etichetta: 'Mese', valore: t.mese ? MESI[t.mese - 1] + ' ' + (t.anno ?? '') : '—' },
    { etichetta: 'Totale riconosciuto', valore: euro(d.proposta.importo) },
  ] : [
    { etichetta: 'Fornitore', valore: nomeFornitore },
    { etichetta: 'Tipo', valore: etichettaTipo },
    { etichetta: 'Data del documento', valore: data(t.data) },
    {
      etichetta: 'Codice cliente', valore: <>
        {t.codice_cliente ?? '—'}
        {ab ? <span className="sec-riga">{ab.cliente ?? 'cliente riconosciuto'}</span>
          : <span className="sec-riga testo-tenue">non trovato fra i clienti</span>}
      </>,
    },
    { etichetta: 'Importo', valore: t.importo == null ? '—' : euro(t.importo) },
    ...(t.riferimento_fattura ? [{ etichetta: 'Fattura stornata', valore: t.riferimento_fattura }] : []),
  ];

  function azione() {
    return (
      <>
        {incerte.size > 0 && (
          <div className="avviso-variazioni" role="status">
            <Icona nome="avviso" />
            <span><b>{incerte.size} {incerte.size === 1 ? 'riga letta' : 'righe lette'} con valori incerti</b>: controllale prima di decidere.</span>
            <button type="button" className="btn sec piccolo" onClick={() => setScheda('righe')}>Vedi le righe</button>
          </div>
        )}
        {boll ? (
          doc.bollettino?.esiste ? (
            <Nota>Il bollettino di {t.mese ? MESI[t.mese - 1] : ''} {t.anno ?? ''} di {nomeFornitore} è già registrato:
              {bollettinoId ? <> <Link href={'/bollettini/' + bollettinoId}>aprilo</Link></> : <> aprilo da <Link href="/bollettini">Bollettini</Link></>}.
              Se questo è la versione rettificata, correggi il mese o scartalo.</Nota>
          ) : (
            <Scelte voci={[{
              titolo: 'Registra il bollettino di ' + (t.mese ? MESI[t.mese - 1] : '') + ' ' + (t.anno ?? ''),
              consigliata: true,
              punti: [
                `${doc.righe.length} ${doc.righe.length === 1 ? 'riga letta' : 'righe lette'}, totale ${euro(doc.proposta.importo)}`,
                'dopo la registrazione lo confronti riga per riga con le nostre pratiche',
              ],
              azione: { etichetta: 'Registra e verifica', onClick: () => void seAffidabile(apriBollettino) },
            }]} />
          )
        ) : t.tipo === 'ordine' ? (
          <>
            {doc.proposta.esito === 'doppio' ? (
              <Nota>Questo ordine risulta già registrato: controlla il numero letto o scarta il documento.</Nota>
            ) : (
              <>
                {!ab && (doc.proposta.cliente_riconosciuto
                  ? <Nota>Il codice {t.codice_cliente ?? '—'} non è abbinato a {nomeFornitore}, ma il cliente è <b>{doc.proposta.cliente_riconosciuto.ragione ?? ''}</b>. Aggiungi l’agenzia nella <Link href={'/clienti/' + doc.proposta.cliente_riconosciuto.cliente_id}>scheda del cliente</Link>, oppure scegli cliente e fornitore qui sotto.</Nota>
                  : <Nota>Il codice {t.codice_cliente ?? '—'} non corrisponde a nessun cliente di {nomeFornitore}. Correggi il codice letto oppure scegli cliente e fornitore qui sotto.</Nota>)}
                <Scelte voci={[{
                  titolo: (t.numero ?? 'Ordine') + ' · ' + (ab?.cliente ?? 'cliente da scegliere'),
                  sottotitolo: <Stato v="attesa">Nuova pratica</Stato>,
                  consigliata: true,
                  punti: [
                    ab ? `codice cliente ${ab.codice ?? ''} = ${ab.cliente ?? ''}` : 'cliente e fornitore da scegliere',
                    'con l’ordine nasce la pratica e parte l’attesa della conferma',
                  ],
                  azione: { etichetta: 'Apri la pratica', onClick: () => void seAffidabile(apriNuova) },
                }]} />
              </>
            )}
          </>
        ) : (
          <>
            {doc.proposta.esito === 'nessuno' && <h3>A quale pratica appartiene?</h3>}
            {doc.proposta.esito === 'nessuno' && (
              <Nota>Il codice {t.codice_cliente ?? '—'} non corrisponde a nessun cliente di {nomeFornitore}. Scegli la pratica a mano oppure correggi il codice.</Nota>
            )}
            {doc.proposta.esito === 'doppio' && <Nota>Questo documento risulta già registrato: controlla il numero letto o scarta il documento.</Nota>}
            <Scelte vuoto={'Nessuna pratica aperta di ' + nomeFornitore + ' a cui abbinarlo.'} voci={doc.proposta.candidati.map((c, i) => {
              const s = STATO_PRATICA[c.pratica.stato] ?? { testo: c.pratica.stato, v: 'neutro' as Variante };
              return {
                titolo: c.pratica.numero + ' · ' + (c.pratica.cliente ?? ''),
                sottotitolo: <Stato v={s.v}>{s.testo}</Stato>,
                consigliata: i === 0 && doc.proposta.esito !== 'nessuno',
                punti: [...c.motivi, t.tipo === 'nota_credito'
                  ? <>riduce il fatturato della pratica di <b className="negativo">{euro(Math.abs(doc.proposta.importo))}</b></>
                  : Math.abs(c.delta) < 0.01 ? <>importo uguale alla fase prima</>
                    : <><span className={c.delta < 0 ? 'negativo' : 'positivo'}>{euroSegno(c.delta)}</span> rispetto alla fase prima</>],
                azione: { etichetta: 'Abbina a ' + c.pratica.numero, onClick: () => void seAffidabile(() => abbinaPratica(c.pratica.id)) },
              };
            })} />
          </>
        )}
        {!boll && doc.stato === 'da_controllare' && (
          <div className="abbina-altra">
            <span className="testo-tenue">Oppure abbina a un’altra pratica di {nomeFornitore}:</span>
            <CampoRicerca entita={PRATICA} contesto={{ fornitore_id: t.fornitore_id }} valore={altra} onChange={setAltra} />
            <button type="button" className="btn sec" disabled={!altra} onClick={() => { setAltra(''); void seAffidabile(() => abbinaPratica(altra)); }}>Abbina</button>
          </div>
        )}
      </>
    );
  }

  function righeLette() {
    const colonne: Colonna<Riga>[] = boll ? [
      { key: 'numero_fattura', header: 'Documento', grow: true },
      { key: 'data_fattura', header: 'Data', tipo: 'data' },
      { key: 'importo', header: 'Imponibile', tipo: 'euro' },
      { key: 'provvigione', header: 'Provvigione', tipo: 'euro', totale: 'somma' },
    ] : [
      { key: 'codice', header: 'Articolo', grow: true, cell: (r) => <><b>{r.codice ?? '—'}</b><span className="sec-riga">{r.descrizione ?? ''}</span></> },
      { key: 'quantita', header: 'Quantità', tipo: 'numero' },
      { key: 'prezzo', header: 'Prezzo', tipo: 'euro' },
      { key: 'importo', header: 'Importo', tipo: 'euro', totale: 'somma' },
    ];
    return (
      <>
        <Nota>{incerte.size
          ? 'Le righe evidenziate hanno valori letti con poca sicurezza: correggili o confermali con Correggi i dati letti.'
          : 'Righe come lette dal documento. Per cambiarle usa Correggi i dati letti.'}</Nota>
        <div className="riempi">
          <DataTable righe={doc.righe} colonne={colonne} chiave={(r) => String(r.i)} compatta
            etichettaTotale={boll ? 'Totale provvigioni' : 'Totale documento'}
            rowClass={(r) => incerte.has(r.i) ? 'evidenzia' : ''}
            emptyText="Nessuna riga letta" emptyHint="Correggi i dati letti per aggiungerle." />
        </div>
      </>
    );
  }

  const schede: Scheda[] = [
    {
      id: 'azioni',
      etichetta: boll ? 'Cosa farne' : t.tipo === 'ordine' ? 'Nuova pratica' : doc.proposta.esito === 'nessuno' ? 'Scegli la pratica' : 'Pratica proposta',
      contenuto: azione,
    },
    {
      id: 'righe', etichetta: 'Righe lette',
      conta: incerte.size ? incerte.size + ' da controllare' : doc.righe.length,
      contaVariante: incerte.size ? (doc.livello === 'bassa' ? 'errore' : 'attesa') : 'neutro',
      contenuto: righeLette,
    },
  ];

  return (
    <>
      <Pannello riempi
        titolo={etichettaTipo + (t.numero ? ' ' + t.numero : '') + (doc.fornitore?.nome ? ' · ' + doc.fornitore.nome : '')}
        nota={<><Icona nome="file" /> {d.file_nome}</>}
        azioni={azioni}>
        <div className="pila riempi">
          <Dettagli inColonne voci={testata} />
          <Schede schede={schede} attiva={scheda} onCambia={setScheda} riempi />
        </div>
      </Pannello>
      {finestra}
    </>
  );
}

/** PDF o foto come nel prototipo, a tutta altezza nel pannello di sinistra: il PDF alla pagina del campo. */
function FileDocumento({ d, pagina, posizione }: { d: Dettaglio; pagina?: number; posizione?: Posizione | null }) {
  const src = '/api/documenti/' + d.id + '/file';
  if (d.file_tipo !== 'pdf') {
    return <img src={src} alt={'Foto del documento ' + d.file_nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  }
  // il rettangolo (§6.6) si disegna solo se la posizione ha davvero le coordinate
  const p = posizione && posizione.x0 != null && posizione.x1 != null
    ? { x0: posizione.x0, y0: posizione.y0 ?? 0, x1: posizione.x1, y1: posizione.y1 ?? 0 }
    : null;
  return <PdfEvidenziato src={src} pagina={pagina ?? 1} posizione={p} />;
}

/* ---------- Correggi i dati letti (F6-A4b, §6.5 punto 7) ---------- */

interface BozzaRiga {
  i: number | null; codice: string; descrizione: string; quantita: string; prezzo: string; importo: string;
  numero_fattura: string; data_fattura: string; provvigione: string;
}
interface Bozza {
  testata: { tipo: string; numero: string; data: string; fornitore_id: string; codice_cliente: string; cliente: string; importo: string; mese: string; anno: string; riferimento_fattura: string };
  righe: BozzaRiga[];
}
const RIGA_KEYS = ['codice', 'descrizione', 'quantita', 'prezzo', 'importo', 'numero_fattura', 'data_fattura', 'provvigione'] as const;

/** Campo con il bordo dell'affidabilità (giallo 0,70–0,90 · rosso < 0,70 · verde se confermato).
 *  Il ✓ accanto al campo conferma il valore letto: da lì non conta più fra i punti da controllare. */
function CampoLetto({ x, etichetta, verificato, onConferma, children }: {
  x: Campo | undefined; etichetta: string; verificato: boolean; onConferma?: () => void; children: ReactNode;
}) {
  const a = x?.affidabilita ?? null;
  const incerto = a != null && !verificato && a < SOGLIA_OK;
  return (
    <div className={'campo-letto ' + classeAff(a, verificato)}>
      <label>{etichetta}{incerto && <span className="aff">{Math.round(a * 100)}%</span>}</label>
      <div className="campo-riga">
        {children}
        {verificato && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: ' + etichetta}>✓</span>}
        {incerto && <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo" aria-label={'Conferma ' + etichetta} onClick={onConferma}>✓</button>}
      </div>
    </div>
  );
}

function FinestraCorreggi({ d, onChiudi, onSalvato }: { d: Dettaglio; onChiudi: () => void; onSalvato: (x: Dettaglio) => void }) {
  const [b, setB] = useState<Bozza>(() => ({
    testata: {
      tipo: d.testata.tipo ?? 'altro', numero: d.testata.numero ?? '', data: d.testata.data ?? '',
      fornitore_id: d.testata.fornitore_id ?? '', codice_cliente: d.testata.codice_cliente ?? '',
      cliente: d.testata.cliente ?? '', importo: d.testata.importo == null ? '' : String(d.testata.importo),
      mese: d.testata.mese == null ? '' : String(d.testata.mese), anno: d.testata.anno == null ? '' : String(d.testata.anno),
      riferimento_fattura: d.testata.riferimento_fattura ?? '',
    },
    righe: d.righe.map((r) => ({
      i: r.i, codice: r.codice ?? '', descrizione: r.descrizione ?? '',
      quantita: r.quantita == null ? '' : String(r.quantita), prezzo: r.prezzo == null ? '' : String(r.prezzo),
      importo: r.importo == null ? '' : String(r.importo), numero_fattura: r.numero_fattura ?? '',
      data_fattura: r.data_fattura ?? '', provvigione: r.provvigione == null ? '' : String(r.provvigione),
    })),
  }));
  const [campo, setCampo] = useState<string | null>(null);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  // campi già validati (dal server o con il ✓ in questa finestra): non sono più punti da controllare
  const [verificati, setVerificati] = useState<Set<string>>(() => new Set(d.campi.filter((c) => c.verificato).map((c) => c.campo)));
  const af = useMemo(() => new Map(d.campi.map((c) => [c.campo, c])), [d.campi]);
  const boll = b.testata.tipo === 'bollettino';
  const verificato = (k: string) => verificati.has(k);
  const conferma = (k: string) => setVerificati((s) => s.has(k) ? s : new Set(s).add(k));
  const campoSi = (k: string, etichetta: string, children: ReactNode) => (
    <CampoLetto x={af.get(k)} etichetta={etichetta} verificato={verificato(k)} onConferma={() => conferma(k)}>{children}</CampoLetto>
  );

  useEffect(() => {
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi(); };
    document.addEventListener('keydown', tasto);
    return () => document.removeEventListener('keydown', tasto);
  }, [onChiudi]);

  const t = (k: keyof Bozza['testata'], v: string) => setB((x) => ({ ...x, testata: { ...x.testata, [k]: v } }));
  const r = (idx: number, k: keyof BozzaRiga, v: string) => setB((x) => ({ ...x, righe: x.righe.map((z, j) => j === idx ? { ...z, [k]: v } : z) }));
  const campoRiga = (riga: BozzaRiga, idx: number, k: string) => `righe[${riga.i ?? idx}].${k}`;
  const pos = campo ? af.get(campo) : null;
  const pagina = pos?.posizione?.pagina;
  // punti ancora aperti: controlli falliti + campi incerti non confermati (si aggiorna a ogni ✓)
  const restanti = d.campi.filter((c) => c.campo !== 'tipo' && !verificato(c.campo) && c.affidabilita != null
    && c.affidabilita < SOGLIA_OK && (c.valore_finale ?? c.valore_letto) != null);
  const nPunti = d.controlli.length + restanti.length;
  const bassa = d.controlli.some((c) => c.grave) || restanti.some((c) => (c.affidabilita ?? 1) < SOGLIA_BASSA);

  async function salva() {
    if (!boll && !b.testata.numero.trim()) { setErrore('Il numero del documento è obbligatorio.'); return; }
    setErrore(''); setAttesa(true);
    try {
      const testata = boll
        ? { tipo: 'bollettino', fornitore_id: b.testata.fornitore_id || null, mese: b.testata.mese || null, anno: b.testata.anno || null }
        : {
          tipo: b.testata.tipo, numero: b.testata.numero, data: b.testata.data, fornitore_id: b.testata.fornitore_id || null,
          codice_cliente: b.testata.codice_cliente, cliente: b.testata.cliente, importo: b.testata.importo,
          riferimento_fattura: b.testata.riferimento_fattura,
        };
      const righe = b.righe
        .filter((x) => x.i != null || RIGA_KEYS.some((k) => x[k].trim() !== ''))
        .map((x) => ({ i: x.i, ...Object.fromEntries(RIGA_KEYS.map((k) => [k, x[k]])) }));
      // i ✓ valgono per campo: il server segna verificati solo questi (e i valori cambiati)
      const verificatiInviati = [...verificati].filter((k) => !k.startsWith('righe[new-'));
      const res = await api<Dettaglio>('documenti/' + d.id, { testata, righe, verificati: verificatiInviati }, 'PUT');
      if (!res.ok) { setErrore(res.messaggio); return; }
      onSalvato(res.dati);
    } finally {
      setAttesa(false);
    }
  }

  return (
    <div className="velo velo-pieno" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="affiancata" role="dialog" aria-modal="true" aria-label={'Correggi i dati letti · ' + (TIPO[b.testata.tipo] ?? 'Documento') + ' ' + b.testata.numero}>
        <div className="aff-testa" style={{ padding: '14px 20px' }}>
          <div>
            <h2>Correggi i dati letti · {TIPO[b.testata.tipo] ?? 'Documento'} {b.testata.numero}</h2>
            <p className="testo-tenue">A sinistra il documento, a destra i dati letti. Correggi o conferma i campi bordati.</p>
          </div>
          <button type="button" className="btn-chiudi" onClick={onChiudi} aria-label="Chiudi"><Icona nome="chiudi" /></button>
        </div>
        <div className="aff-corpo">
          <div className="aff-sx aff-pdf">
            <FileDocumento d={d} pagina={pagina} posizione={pos?.posizione ?? null} />
          </div>
          <div className="aff-dx">
            <p className="testo-tenue" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
              {d.file_tipo === 'pdf'
                ? pos
                  ? `Posizione: pagina ${pagina ?? 1} (${pos.precisione ?? 'assente'})`
                  : 'Seleziona un campo per aprire il PDF alla sua pagina.'
                : 'La foto resta ferma: la posizione del valore non si evidenzia.'}
            </p>
            <div className="aff-riepilogo">
              <div className="riep-testa" style={{ cursor: 'default' }}>
                <Stato v={bassa ? 'errore' : nPunti ? 'attesa' : 'ok'}>
                  {bassa ? 'Affidabilità bassa' : nPunti ? 'Da controllare' : 'Lettura affidabile'}
                </Stato>
                <span>{nPunti ? nPunti + (nPunti === 1 ? ' punto da controllare' : ' punti da controllare') : 'tutti i campi sono controllati'}</span>
              </div>
            </div>
            <h3>Testata</h3>
            <div className="griglia-letti">
              {boll ? (
                <>
                  {campoSi('fornitore_id', 'Fornitore',
                    <CampoRicerca entita={entitaFornitore} valore={b.testata.fornitore_id} onChange={(v) => t('fornitore_id', v)} />)}
                  {campoSi('mese', 'Mese',
                    <select data-campo="mese" value={b.testata.mese} onFocus={() => setCampo('mese')} onChange={(e) => t('mese', e.target.value)}>
                      {MESI.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                    </select>)}
                  {campoSi('anno', 'Anno',
                    <input data-campo="anno" type="number" value={b.testata.anno} onFocus={() => setCampo('anno')} onChange={(e) => t('anno', e.target.value)} />)}
                </>
              ) : (
                <>
                  {campoSi('tipo', 'Tipo',
                    <select data-campo="tipo" value={b.testata.tipo} onFocus={() => setCampo('tipo')} onChange={(e) => t('tipo', e.target.value)}>
                      {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>)}
                  {campoSi('numero', 'Numero',
                    <input data-campo="numero" value={b.testata.numero} onFocus={() => setCampo('numero')} onChange={(e) => t('numero', e.target.value)} />)}
                  {campoSi('data', 'Data',
                    <input data-campo="data" type="date" value={b.testata.data} onFocus={() => setCampo('data')} onChange={(e) => t('data', e.target.value)} />)}
                  {campoSi('fornitore_id', 'Fornitore',
                    <CampoRicerca entita={entitaFornitore} valore={b.testata.fornitore_id} onChange={(v) => t('fornitore_id', v)} />)}
                  {campoSi('codice_cliente', 'Codice cliente',
                    <input data-campo="codice_cliente" value={b.testata.codice_cliente} onFocus={() => setCampo('codice_cliente')} onChange={(e) => t('codice_cliente', e.target.value)} />)}
                  {campoSi('cliente', 'Cliente letto',
                    <input data-campo="cliente" value={b.testata.cliente} onFocus={() => setCampo('cliente')} onChange={(e) => t('cliente', e.target.value)} />)}
                  {campoSi('importo_totale', 'Importo',
                    <input data-campo="importo" type="number" step="0.01" value={b.testata.importo} onFocus={() => setCampo('importo_totale')} onChange={(e) => t('importo', e.target.value)} />)}
                  {b.testata.tipo === 'nota_credito' &&
                    campoSi('riferimento_fattura', 'Fattura stornata',
                      <input data-campo="riferimento_fattura" value={b.testata.riferimento_fattura} onFocus={() => setCampo('riferimento_fattura')} onChange={(e) => t('riferimento_fattura', e.target.value)} />)}
                </>
              )}
            </div>
            <div className="righe-testa">
              <h3>Righe <span className="testo-tenue">{b.righe.length}</span></h3>
              <button type="button" className="btn sec piccolo" onClick={() => setB((x) => ({ ...x, righe: [...x.righe, { i: null, codice: '', descrizione: '', quantita: '', prezzo: '', importo: '', numero_fattura: '', data_fattura: '', provvigione: '' }] }))}>
                <Icona nome="piu" />Aggiungi riga
              </button>
            </div>
            <div className="tab-righe-box">
              <table className="tab-righe">
                <thead>
                  <tr>
                    <th>#</th>
                    {boll ? <><th>Documento</th><th>Data</th><th className="dx">Imponibile</th><th className="dx">Provvigione</th></>
                      : <><th>Articolo</th><th className="largo">Descrizione</th><th className="dx">Quantità</th><th className="dx">Prezzo</th><th className="dx">Importo</th></>}
                    <th aria-label="Elimina" />
                  </tr>
                </thead>
                <tbody>
                  {b.righe.map((x, idx) => {
                    const cella = (k: keyof BozzaRiga, tipo: 'text' | 'number' | 'date' = 'text') => {
                      const c = campoRiga(x, idx, k);
                      // una riga nuova non ha affidabilità: la chiave non deve scontrarsi con una riga tolta
                      const keyAff = x.i != null ? c : `righe[new-${idx}].${k}`;
                      const aff = af.get(keyAff)?.affidabilita ?? null;
                      const ver = verificato(keyAff);
                      const extra = k === 'descrizione' ? 'largo ' : k === 'codice' || k === 'numero_fattura' ? 'col-codice ' : '';
                      return (
                        <td key={k} className={extra + classeAff(aff, ver)}>
                          <div className="campo-riga">
                            <input data-campo={c} type={tipo} step={tipo === 'number' ? 'any' : undefined} value={String(x[k] ?? '')}
                              onFocus={() => setCampo(keyAff)} onChange={(e) => { r(idx, k, e.target.value); conferma(keyAff); }} />
                            {ver && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: riga ' + (idx + 1)}>✓</span>}
                            {aff != null && !ver && aff < SOGLIA_OK && (
                              <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo"
                                aria-label={'Conferma la riga ' + (idx + 1)} onClick={() => conferma(keyAff)}>✓</button>
                            )}
                          </div>
                        </td>
                      );
                    };
                    return (
                      <tr key={idx} className={x.i == null ? 'nuova' : undefined}>
                        <td className="testo-tenue">{idx + 1}</td>
                        {boll ? <>{cella('numero_fattura')}{cella('data_fattura', 'date')}{cella('importo', 'number')}{cella('provvigione', 'number')}</>
                          : <>{cella('codice')}{cella('descrizione')}{cella('quantita', 'number')}{cella('prezzo', 'number')}{cella('importo', 'number')}</>}
                        <td><button type="button" className="btn testo piccolo" title="Elimina la riga" aria-label={'Elimina la riga ' + (idx + 1)}
                          onClick={() => setB((z) => ({ ...z, righe: z.righe.filter((_, j) => j !== idx) }))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
          </div>
        </div>
        <div className="aff-piede" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--bordo-tenue)' }}>
          <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
          <button type="button" className="btn" onClick={() => void salva()} disabled={attesa}>{attesa ? 'Attendi…' : 'Salva e ricalcola l’abbinamento'}</button>
        </div>
      </div>
    </div>
  );
}
