'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato } from '@/componenti/Piccoli';
import { Schede } from '@/componenti/Schede';
import { AREE, LIVELLI, RUOLI, usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';

// Utenti e ruoli (§7.13, D-39, D-45), come vistaUtenti del prototipo (viste-gestione.js): elenco con
// ricerca e segmenti, scheda Dati dell'utente · Cosa può fare ogni ruolo, finestre.
// Le regole (chi gestisce chi, almeno un amministratore, doppioni) le decide il server (V12):
// qui si nascondono i pulsanti che il server rifiuterebbe e si mostra il suo messaggio.

interface Utente {
  id: string;
  username: string;
  nome: string;
  email: string;
  ruolo: string;
  attivo: boolean;
  sistema: boolean;
  deve_cambiare_password: boolean;
  ultimo_accesso: string | null;
  ultimo_invio: { quando: string; tipo: string; errore: string | null } | null;
  aree: Record<string, string>; // area → livello (D-45)
}
// la tabella dei permessi del server (GET /api/utenti/ruoli): Sistema per ruolo, aree per livello minimo
interface Permesso { id: string; area: string; testo: string; ruoli?: string[]; minimo?: string; ancheOperatore?: boolean }

// filtro e scheda restano tornando alla pagina, come nel prototipo
let filtro: Record<string, string> = { vista: 'attivi', q: '' };
let schedaUtente = 'utente';
const VISTE: Record<string, (u: Utente) => boolean> = { attivi: (u) => u.attivo, disattivati: (u) => !u.attivo, tutti: () => true };
const ULTIMA_EMAIL: Record<string, string> = { benvenuto: 'Benvenuto con la password provvisoria', password: 'Nuova password provvisoria', reset: 'Password dimenticata' };
const ORDINE = Object.keys(LIVELLI); // lettura < operatore < responsabile
// "Provvigioni: operatore · Anagrafiche: lettura"
const livelliTesto = (x: Utente) => Object.keys(AREE).filter((a) => x.aree[a]).map((a) => AREE[a] + ': ' + LIVELLI[x.aree[a]].toLowerCase()).join(' · ');

// il permesso (sistema.utenti) lo controlla il guscio, come per ogni pagina (D-45)
export function VistaUtenti({ idSel }: { idSel?: string }) {
  const io = useUtente();
  const puo = usePuo();
  const router = useRouter();
  const [utenti, setUtenti] = useState<Utente[] | null>(null);
  const [permessi, setPermessi] = useState<Permesso[]>([]);
  const [valori, setValori] = useState(filtro);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const r = await api<Utente[]>('utenti');
    if (r.ok) { setUtenti(r.dati); setErrore(''); } else if (!utenti) setErrore(r.messaggio); else avviso(r.messaggio, true);
  }, [utenti]);
  useEffect(() => {
    void carica();
    void api<{ permessi: Permesso[] }>('utenti/ruoli').then((r) => (r.ok ? setPermessi(r.dati.permessi) : avviso(r.messaggio, true)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una volta all'apertura
  }, []);

  // la ricerca vale anche per i numeri dei segmenti (D-23): contano con gli altri filtri
  const cercati = useMemo(() => {
    const q = (valori.q ?? '').toLowerCase();
    return (utenti ?? []).filter((x) => !q || [x.nome, x.username, x.email].some((t) => t.toLowerCase().includes(q)));
  }, [utenti, valori.q]);
  const righe = useMemo(() => cercati.filter(VISTE[valori.vista]), [cercati, valori.vista]);

  const nuovo = () => modifica(null);
  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Utenti e ruoli" pieno azioni={[{ etichetta: 'Nuovo utente', icona: 'piu', onClick: nuovo }]}
      sottotitolo="Si entra con nome utente (o email) e password. Il ruolo di Sistema decide chi gestisce il portale; il livello in ogni area (lettura, operatore, responsabile) decide cosa si può fare lì.">
      {corpo}
      {finestra}
    </Pagina>
  );
  if (!utenti) return pagina(errore && <Pannello><div className="vuoto"><b>Utenti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>);
  const u = utenti.find((x) => x.id === idSel) ?? utenti[0];

  // chi può gestire chi (D-39): nessuno tocca il superutente né l'utente dei servizi; gli amministratori li gestisce il superutente
  const gestibile = (x: Utente) => !x.sistema && x.ruolo !== 'superutente' && (x.ruolo !== 'amministratore' || puo('sistema.amministratori'));
  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  function modifica(x: Utente | null) {
    const sonoIo = x?.id === io.id;
    // D-39, D-45: "Amministratore" lo sceglie solo il superutente; i propri livelli li cambia solo il superutente
    const scelte = ['utente', 'amministratore'].filter((r) => r !== 'amministratore' || puo('sistema.amministratori') || x?.ruolo === r);
    const bloccati = sonoIo && io.ruolo !== 'superutente';
    setFinestra(
      <FormModal titolo={x ? 'Modifica ' + x.nome : 'Nuovo utente'} conferma={x ? 'Salva' : 'Crea e manda la password'} colonne={2}
        testo={x ? undefined : 'L’utente riceve per email il nome utente e una password provvisoria, da cambiare al primo accesso.'}
        campi={[
          { nome: 'nome', etichetta: 'Nome e cognome', valore: x?.nome ?? '', largo: true },
          { nome: 'username', etichetta: 'Nome utente', valore: x?.username ?? '', aiuto: 'Minuscole, numeri, punto, trattino; senza @.' },
          { nome: 'email', etichetta: 'Email', valore: x?.email ?? '', completa: 'off' },
          {
            nome: 'ruolo', etichetta: 'Ruolo di Sistema', tipo: 'select', valore: x?.ruolo ?? 'utente', largo: true,
            opzioni: (x?.ruolo === 'superutente' ? ['superutente'] : scelte).map((r) => ({ value: r, label: RUOLI[r] })),
            // il proprio ruolo non si cambia: il campo spento non si manda e il server lo lascia com'è
            disabilitato: sonoIo || x?.ruolo === 'superutente',
            aiuto: bloccati ? 'Non puoi cambiare il tuo ruolo né i tuoi livelli.' : 'Amministratore: gestisce utenti e impostazioni del portale. Non dà accesso alle aree: quelle si scelgono qui sotto.',
          },
          ...Object.keys(AREE).map((a) => ({
            nome: 'area_' + a, etichetta: AREE[a], tipo: 'select' as const, valore: x?.aree[a] ?? '', disabilitato: bloccati,
            opzioni: [{ value: '', label: 'Nessun accesso' }, ...ORDINE.map((l) => ({ value: l, label: LIVELLI[l] }))],
          })),
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          // livelli delle aree mostrate (null = nessun accesso), solo se i campi erano attivi: spenti non
          // arrivano e il server li lascia com'è; le aree non mostrate (Vendite, spenta) restano com'erano
          const aree = Object.keys(AREE).some((a) => ('area_' + a) in v)
            ? Object.fromEntries(Object.keys(AREE).map((a) => [a, v['area_' + a] || null])) : undefined;
          const corpo = { nome: v.nome, username: v.username.toLowerCase(), email: v.email, ...(v.ruolo ? { ruolo: v.ruolo } : {}), ...(aree ? { aree } : {}) };
          const r = x ? await api<Utente>('utenti/' + x.id, corpo, 'PUT') : await api<Utente>('utenti', corpo);
          if (!r.ok) return r.messaggio;
          const err = r.dati.ultimo_invio?.errore;
          avviso(x ? 'Utente salvato' : err ? 'Utente creato, ma l’email non è partita: ' + err : 'Utente creato: nome utente e password provvisoria mandati a ' + r.dati.email, !!err);
          if (!x) router.push('/utenti/' + r.dati.id);
          await carica();
        }}
      />,
    );
  }

  // D-39 §7.13: nuova password provvisoria per email; quella di prima smette di funzionare
  async function reimposta(x: Utente) {
    if (!(await chiedi('Mandare una nuova password provvisoria a ' + x.nome + '?',
      <>Riceve a {x.email} una password provvisoria: quella attuale smette di funzionare e al primo accesso ne sceglie una nuova.</>, 'Manda la password'))) return;
    const r = await api<Utente>('utenti/' + x.id + '/password', {});
    const err = r.ok ? r.dati.ultimo_invio?.errore : r.messaggio;
    avviso(!r.ok ? r.messaggio : err ? 'Invio non riuscito: ' + err : 'Password provvisoria mandata a ' + x.email, !!err);
    await carica();
  }
  async function attiva(x: Utente, si: boolean) {
    const r = await api('utenti/' + x.id + '/attivo', { attivo: si });
    avviso(!r.ok ? r.messaggio : si ? 'Utente riattivato' : 'Utente disattivato: non può più accedere', !r.ok);
    await carica();
  }
  async function elimina(x: Utente) {
    const testo = x.ultimo_accesso ? x.nome + ' ha già usato l’app: il suo nome resta nel registro eventi. Se deve solo smettere di accedere, conviene disattivarlo.' : 'Non ha mai effettuato l’accesso.';
    if (!(await chiedi('Eliminare ' + x.nome + '?', testo, 'Elimina', true))) return;
    const r = await api('utenti/' + x.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Utente eliminato');
    router.push('/utenti');
    await carica();
  }

  const sonoIo = u.id === io.id, modificabile = sonoIo || gestibile(u);
  const azioni: Azione[] = !modificabile ? [] : [{ etichetta: 'Modifica', onClick: () => modifica(u) }, sonoIo
    ? { etichetta: 'Cambia la tua password', icona: 'chiave', href: '/accesso/cambia?dopo=' + encodeURIComponent('/utenti/' + u.id) }
    : { etichetta: 'Reimposta la password', icona: 'chiave', onClick: () => reimposta(u) }];

  const colonne: Colonna<Utente>[] = [
    { key: 'nome', header: 'Utente', grow: true, cell: (x) => <><b>{x.nome}</b>{x.id === io.id && <> <span className="testo-tenue">(tu)</span></>}<span className="sec-riga">{x.username} · {x.email}</span></> },
    { key: 'ruolo', header: 'Ruolo e aree', valore: (x) => (x.ruolo === 'utente' ? 'z' : RUOLI[x.ruolo]) + ' ' + livelliTesto(x), cell: (x) => x.sistema ? <Stato v="neutro">Servizi automatici</Stato>
      : <>{x.ruolo !== 'utente' && <Stato v="primario">{RUOLI[x.ruolo]}</Stato>}<span className="sec-riga">{livelliTesto(x) || 'nessuna area'}</span></> },
    { key: 'accesso', header: 'Ultimo accesso', valore: (x) => x.ultimo_accesso ?? '', cell: (x) => !x.attivo ? <Stato v="neutro">Disattivato</Stato> : x.ultimo_accesso || x.sistema ? quando(x.ultimo_accesso) : <Stato v="attesa">Mai entrato</Stato> },
  ];

  function datiUtente() {
    const nota = u.sistema ? 'Utente usato dai servizi automatici (lettura della casella, sincronizzazione da Integra): non si modifica e non accede all’app.'
      : u.ruolo === 'superutente' && !sonoIo ? 'Il superutente si crea all’installazione e non si modifica da qui: crea e gestisce gli amministratori.'
        : !modificabile ? 'Gli amministratori li gestisce il superutente.' : '';
    const noMe = sonoIo ? 'Non puoi disattivare o eliminare te stesso' : undefined;
    return (
      <>
        <Dettagli inColonne voci={[
          { etichetta: 'Nome utente', valore: u.username },
          { etichetta: 'Email', valore: u.email },
          { etichetta: 'Ruolo di Sistema', valore: RUOLI[u.ruolo] },
          ...Object.keys(AREE).map((a) => ({ etichetta: AREE[a], valore: u.aree[a] ? LIVELLI[u.aree[a]] : <span className="testo-tenue">—</span> })),
          { etichetta: 'Stato', valore: u.attivo ? <><Stato v="ok">Attivo</Stato>{u.deve_cambiare_password && <> <Stato v="attesa">Password provvisoria</Stato></>}</> : <Stato v="neutro">Disattivato</Stato> },
          { etichetta: 'Ultimo accesso', valore: quando(u.ultimo_accesso) },
          { etichetta: 'Ultima email', valore: u.ultimo_invio ? <>{ULTIMA_EMAIL[u.ultimo_invio.tipo] ?? u.ultimo_invio.tipo} · {quando(u.ultimo_invio.quando)}{u.ultimo_invio.errore && <span className="sec-riga negativo">{u.ultimo_invio.errore}</span>}</> : '—' },
        ]} />
        {nota ? <Nota>{nota}</Nota> : (
          <div className="azioni-riga">
            <button type="button" className="btn sec piccolo" disabled={sonoIo} title={noMe} onClick={() => attiva(u, !u.attivo)}>{u.attivo ? 'Disattiva' : 'Riattiva'}</button>
            <button type="button" className="btn pericolo piccolo" disabled={sonoIo} title={noMe} onClick={() => elimina(u)}>Elimina</button>
          </div>
        )}
      </>
    );
  }

  // D-45: una tabella per Sistema (colonne = ruoli) e una per area (colonne = livelli); evidenziato quello di u
  function cosaPuoFare() {
    const spunta = (si: boolean) => (si ? <span className="si" aria-label="sì"><Icona nome="spunta" /></span> : <span className="testo-tenue" aria-label="no">—</span>);
    const tabella = (titolo: string, righe: Permesso[], colonne: Record<string, string>, evid: string | undefined, vale: (p: Permesso, k: string) => boolean) => (
      <div key={titolo}>
        <div className="ruoli-titolo">{titolo}</div>
        <DataTable compatta naturale righe={righe} chiave={(p) => p.id} colonne={[
          { key: 'testo', header: 'Attività', grow: true, sortable: false },
          ...Object.keys(colonne).map((k): Colonna<Permesso> => ({
            key: k, header: colonne[k], align: 'center', sortable: false, cell: (p) => spunta(vale(p, k)), classe: () => (k === evid ? 'col-evidenza' : ''),
          })),
        ]} />
      </div>
    );
    return (
      <>
        {tabella('Sistema', permessi.filter((p) => p.area === 'sistema'), RUOLI, u.ruolo, (p, k) => !!p.ruoli?.includes(k) || (!!p.ancheOperatore && k === 'utente'))}
        {Object.keys(AREE).map((a) => tabella(AREE[a], permessi.filter((p) => p.area === a), LIVELLI, u.aree[a],
          (p, k) => ORDINE.indexOf(k) >= ORDINE.indexOf(p.minimo!)))}
        <Nota>Evidenziati il ruolo e i livelli di {u.nome}. Un livello comprende quelli prima. Stato del sistema: anche per chi è operatore in un’area.</Nota>
      </>
    );
  }

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.15fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        <FilterBar valori={valori} onChange={(v) => { filtro = v; setValori(v); }} campi={[
          { nome: 'q', tipo: 'cerca', placeholder: 'Nome, nome utente o email' },
          { nome: 'vista', tipo: 'segmenti', opzioni: [
            { value: 'attivi', label: 'Attivi', n: cercati.filter(VISTE.attivi).length },
            { value: 'disattivati', label: 'Disattivati', n: cercati.filter(VISTE.disattivati).length },
            { value: 'tutti', label: 'Tutti', n: cercati.length },
          ] },
        ]} />
        <div className="riempi">
          <DataTable righe={righe} filtro={valori.q + '|' + valori.vista} colonne={colonne} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'nome', dir: 'asc' }}
            rowClass={(x) => (x.id === u.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/utenti/' + x.id)}
            emptyText="Nessun utente" emptyHint="Cambia la ricerca o il filtro." />
        </div>
      </div>
      <Pannello titolo={u.nome} nota={u.sistema ? 'utente dei servizi automatici' : ''} riempi azioni={azioni}>
        <Schede riempi attiva={schedaUtente} onCambia={(id) => { schedaUtente = id; }} schede={[
          { id: 'utente', etichetta: 'Dati dell’utente', contenuto: datiUtente },
          { id: 'ruoli', etichetta: 'Cosa può fare ogni ruolo', contenuto: cosaPuoFare },
        ]} />
      </Pannello>
    </div>,
  );
}
