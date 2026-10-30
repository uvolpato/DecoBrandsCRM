'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, Riservata, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato } from '@/componenti/Piccoli';
import { Schede } from '@/componenti/Schede';
import { RUOLI, usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';

// Utenti e ruoli (§7.13, D-39), come vistaUtenti del prototipo (viste-gestione.js): elenco con
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
}
interface Permesso { id: string; testo: string; ruoli: string[] }

// filtro e scheda restano tornando alla pagina, come nel prototipo
let filtro: Record<string, string> = { vista: 'attivi', q: '' };
let schedaUtente = 'utente';
const VISTE: Record<string, (u: Utente) => boolean> = { attivi: (u) => u.attivo, disattivati: (u) => !u.attivo, tutti: () => true };
const ULTIMA_EMAIL: Record<string, string> = { benvenuto: 'Benvenuto con la password provvisoria', password: 'Nuova password provvisoria', reset: 'Password dimenticata' };
const variante = (r: string) => (r === 'superutente' || r === 'amministratore' ? 'primario' : r === 'operatore' ? 'info' : 'neutro');

export function VistaUtenti({ idSel }: { idSel?: string }) {
  return <Riservata permesso="gestione" titolo="Utenti e ruoli"><Utenti idSel={idSel} /></Riservata>;
}

function Utenti({ idSel }: { idSel?: string }) {
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
    void api<Permesso[]>('utenti/ruoli').then((r) => (r.ok ? setPermessi(r.dati) : avviso(r.messaggio, true)));
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
      sottotitolo="Si entra con nome utente (o email) e password. La password provvisoria arriva per email e va cambiata al primo accesso. Il ruolo decide cosa si può fare.">
      {corpo}
      {finestra}
    </Pagina>
  );
  if (!utenti) return pagina(errore && <Pannello><div className="vuoto"><b>Utenti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>);
  const u = utenti.find((x) => x.id === idSel) ?? utenti[0];

  // chi può gestire chi (D-39): nessuno tocca il superutente né l'utente dei servizi; gli amministratori li gestisce il superutente
  const gestibile = (x: Utente) => !x.sistema && x.ruolo !== 'superutente' && (x.ruolo !== 'amministratore' || puo('amministratori'));
  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  function modifica(x: Utente | null) {
    const sonoIo = x?.id === io.id;
    // il superutente sceglie anche "Amministratore"; l'amministratore solo operatore e sola lettura (D-39)
    const scelte = ['amministratore', 'operatore', 'lettura'].filter((r) => r !== 'amministratore' || puo('amministratori') || x?.ruolo === r);
    setFinestra(
      <FormModal titolo={x ? 'Modifica ' + x.nome : 'Nuovo utente'} conferma={x ? 'Salva' : 'Crea e manda la password'} colonne={2}
        testo={x ? undefined : 'L’utente riceve per email il nome utente e una password provvisoria, da cambiare al primo accesso.'}
        campi={[
          { nome: 'nome', etichetta: 'Nome e cognome', valore: x?.nome ?? '', largo: true },
          { nome: 'username', etichetta: 'Nome utente', valore: x?.username ?? '', aiuto: 'Minuscole, numeri, punto, trattino; senza @.' },
          { nome: 'email', etichetta: 'Email', valore: x?.email ?? '', completa: 'off' },
          {
            nome: 'ruolo', etichetta: 'Ruolo', tipo: 'select', valore: x?.ruolo ?? 'operatore', largo: true,
            opzioni: (x?.ruolo === 'superutente' ? ['superutente'] : scelte).map((r) => ({ value: r, label: RUOLI[r] })),
            // il proprio ruolo non si cambia: il campo spento non si manda e il server lo lascia com'è
            disabilitato: sonoIo || x?.ruolo === 'superutente',
            aiuto: sonoIo ? 'Non puoi cambiare il tuo ruolo.' : (puo('amministratori') ? 'Amministratore: tutto tranne gli amministratori. ' : '') + 'Operatore: lavoro quotidiano e anagrafiche del CRM. Sola lettura: consulta ed esporta.',
          },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo = { nome: v.nome, username: v.username.toLowerCase(), email: v.email, ...(v.ruolo ? { ruolo: v.ruolo } : {}) };
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
    { key: 'ruolo', header: 'Ruolo', valore: (x) => RUOLI[x.ruolo], cell: (x) => x.sistema ? <Stato v="neutro">Servizi automatici</Stato> : <Stato v={variante(x.ruolo)}>{RUOLI[x.ruolo]}</Stato> },
    { key: 'accesso', header: 'Ultimo accesso', valore: (x) => x.ultimo_accesso ?? '', cell: (x) => !x.attivo ? <Stato v="neutro">Disattivato</Stato> : x.ultimo_accesso || x.sistema ? quando(x.ultimo_accesso) : <Stato v="attesa">Mai entrato</Stato> },
  ];
  const ruoli = Object.keys(RUOLI);

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
          { etichetta: 'Ruolo', valore: RUOLI[u.ruolo] },
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

  function cosaPuoFare() {
    return (
      <>
        <div className="riempi">
          <DataTable compatta righe={permessi} chiave={(p) => p.id} colonne={[
            { key: 'testo', header: 'Attività', grow: true, sortable: false },
            ...ruoli.map((r): Colonna<Permesso> => ({
              key: r, header: RUOLI[r], align: 'center', sortable: false,
              cell: (p) => p.ruoli.includes(r) ? <span className="si" aria-label="sì"><Icona nome="spunta" /></span> : <span className="testo-tenue" aria-label="no">—</span>,
              classe: () => (r === u.ruolo ? 'col-evidenza' : ''),
            })),
          ]} />
        </div>
        <Nota>Evidenziata la colonna del ruolo di {u.nome}.</Nota>
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
          { id: 'ruoli', etichetta: 'Cosa può fare ogni ruolo', conta: permessi.length, contenuto: cosaPuoFare },
        ]} />
      </Pannello>
    </div>,
  );
}
