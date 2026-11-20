'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, esci, type Io } from '@/lib/api';
import { useEventi } from '@/lib/eventi';
import { Icona } from './Icona';
import { ruoloBreve, usePuo, useUtente } from './Utente';
import { statoDeploy } from '@/lib/manutenzione';

// Barra laterale con il menu per area (D-47, D-53, §7.1): in cima il nome dell'area aperta, sotto
// le sue voci; in fondo l'utente, che apre il menu con le aree, la password, la Guida ed Esci.
// `area` di una voce è l'area dei permessi (D-45): le sue voci si aprono con *.consulta e seguono
// il livello (sola lettura).
// I contatori dei problemi (Stato del sistema, gruppo Gestione) sono un numero letto dal server a
// ogni cambio pagina (§7.14, D-23): il browser non calcola niente.
interface Voce { href: string; t: string; icona: string; area?: string; permesso?: string }
const AREE_MENU: { id: string; t: string; icona: string; gruppi: { gruppo: string; voci: Voce[] }[] }[] = [
  { id: 'provvigioni', t: 'Provvigioni', icona: 'liquidazioni', gruppi: [
    { gruppo: 'Ogni giorno', voci: [{ href: '/', t: 'Oggi', icona: 'oggi', area: 'provvigioni' }, { href: '/documenti', t: 'Documenti', icona: 'arrivo', area: 'provvigioni' }, { href: '/pratiche', t: 'Pratiche', icona: 'pratiche', area: 'provvigioni' }, { href: '/scartati', t: 'Documenti scartati', icona: 'cestino', area: 'provvigioni', permesso: 'provvigioni.scartati' }] },
    { gruppo: 'Ogni mese', voci: [{ href: '/bollettini', t: 'Bollettini', icona: 'bollettini', area: 'provvigioni' }] },
    { gruppo: 'Ogni trimestre', voci: [{ href: '/liquidazioni', t: 'Liquidazioni', icona: 'liquidazioni', area: 'provvigioni' }, { href: '/analisi', t: 'Analisi', icona: 'analisi', area: 'provvigioni' }] },
  ] },
  { id: 'dati', t: 'Dati', icona: 'fornitori', gruppi: [
    { gruppo: 'Anagrafiche', voci: [{ href: '/soggetti', t: 'Soggetti', icona: 'subagenti', area: 'dati' }, { href: '/fornitori', t: 'Fornitori', icona: 'fornitori', area: 'dati' }, { href: '/subagenti', t: 'Subagenti', icona: 'subagenti', area: 'dati' }, { href: '/clienti', t: 'Clienti', icona: 'abbinamenti', area: 'dati' }] },
  ] },
  { id: 'gestione', t: 'Gestione', icona: 'impostazioni', gruppi: [
    { gruppo: 'Portale', voci: [
      { href: '/utenti', t: 'Utenti e ruoli', icona: 'subagenti', permesso: 'sistema.utenti' },
      { href: '/sistema', t: 'Stato del sistema', icona: 'sistema', permesso: 'sistema.stato' },
      { href: '/registro', t: 'Registro', icona: 'file', permesso: 'sistema.registro' },
      { href: '/impostazioni', t: 'Impostazioni', icona: 'impostazioni', permesso: 'sistema.impostazioni' },
      { href: '/componenti', t: 'Componenti', icona: 'componenti', permesso: 'sistema.amministratori' }] }, // catalogo: solo il superutente (Ugo 01/11/2026)
  ] },
];
const GUIDA: Voce = { href: '/guida', t: 'Guida', icona: 'guida' };
const TUTTE = [...AREE_MENU.flatMap((a) => a.gruppi.flatMap((g) => g.voci)), GUIDA];
const permessoDi = (v: Voce) => v.permesso ?? (v.area ? v.area + '.consulta' : undefined);
const attiva = (href: string, percorso: string) => (href === '/' ? percorso === '/' : percorso === href || percorso.startsWith(href + '/'));
const areaDi = (percorso: string) => AREE_MENU.find((a) => a.gruppi.some((g) => g.voci.some((v) => attiva(v.href, percorso))));

/** La voce a cui appartiene una pagina, con il permesso che la apre e la sua area (guscio, titoli). */
export function voceDi(percorso: string) {
  const v = TUTTE.find((x) => attiva(x.href, percorso));
  return v && { ...v, permesso: permessoDi(v) };
}
/** La prima pagina che l'utente può aprire (dopo l'accesso, se Oggi non è per lui: es. chi gestisce solo il portale). */
export const primaPagina = (puo: (p: string) => boolean) =>
  TUTTE.find((v) => permessoDi(v) && puo(permessoDi(v)!))?.href ?? '/guida';
/** Titolo della voce di una pagina (per "In costruzione" e per il titolo della scheda del browser). */
export const titoloDi = (percorso: string) => voceDi(percorso)?.t ?? 'Decobrands';

/** Una voce si apre se il suo permesso c'è (le voci di un'area con *.consulta e le altre con il loro). */
const libera = (io: Io) => (v: Voce) => !permessoDi(v) || io.permessi.includes(permessoDi(v)!);

/** Le aree che l'utente può aprire, con le sole voci permesse (menu dell'utente e profilo). */
export const areeAperte = (io: Io) =>
  AREE_MENU.map((a) => ({ ...a, gruppi: a.gruppi.map((g) => ({ ...g, voci: g.voci.filter(libera(io)) })).filter((g) => g.voci.length) }))
    .filter((a) => a.gruppi.length);

/** Pagina di atterraggio dopo l'accesso senza `dopo` (D-88): la pagina di ingresso della prima area
 *  che l'utente può aprire (Provvigioni → Dati → Gestione), altrimenti `/`. */
export const atterraggio = (io: Io) => {
  for (const a of areeAperte(io)) return io.ingressi?.[a.id] ?? a.gruppi[0].voci[0].href;
  return '/';
};

export function Barra() {
  const io = useUtente();
  const puo = usePuo();
  const percorso = usePathname();
  const router = useRouter();
  const sigla = io.nome.split(' ').map((x) => x[0]).join('').slice(0, 2);
  // contatori delle voci (§7.1, come il prototipo): numeri letti dal server a ogni cambio pagina.
  // Oggi, Documenti, Pratiche e Bollettini; Documenti e Pratiche sono urgenti (gialli) quando c'è
  // qualcosa da fare. Il browser non calcola niente (V12).
  const [conteggi, setConteggi] = useState<{ oggi: number; documenti: number; pratiche: number; bollettini: number } | null>(null);
  const [problemi, setProblemi] = useState<{ problemi: number; errore: boolean } | null>(null);
  // versione dell'app in fondo alla barra (13/11/2026): numero letto dal server una volta
  const [versione, setVersione] = useState('');
  useEffect(() => {
    let vivo = true;
    void api<{ numero: string }>('versione').then((r) => { if (vivo && r.ok) setVersione(r.dati.numero); });
    return () => { vivo = false; };
  }, []);
  // D-23, U20: i contatori si rileggono a ogni cambio pagina e a ogni evento delle aree della barra.
  const eventi = useEventi();
  const vEventi = (eventi.documenti ?? 0) + (eventi.pratiche ?? 0) + (eventi.bollettini ?? 0) + (eventi.sistema ?? 0);
  useEffect(() => {
    let vivo = true;
    if (puo('provvigioni.consulta')) {
      void api<{ oggi: number; documenti: number; pratiche: number; bollettini: number }>('oggi/conteggi').then((r) => {
        if (vivo && r.ok) setConteggi(r.dati);
      });
    } else setConteggi(null);
    if (puo('sistema.stato')) {
      void api<{ problemi: number; errore: boolean }>('sistema/contatore').then((r) => {
        if (vivo && r.ok) setProblemi(r.dati);
      });
    } else setProblemi(null);
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a ogni pagina e a ogni evento (D-23, U20)
  }, [percorso, vEventi]);
  const conta = (n?: number, urgente?: boolean, stile?: React.CSSProperties) => (n ? <span className={'conta' + (urgente ? ' urgente' : '')} style={stile}>{n}</span> : null);
  const contaVoce = (href: string) => {
    if (href === '/') return conta(conteggi?.oggi);
    if (href === '/documenti') return conta(conteggi?.documenti, true);
    if (href === '/pratiche') return conta(conteggi?.pratiche, true);
    if (href === '/bollettini') return conta(conteggi?.bollettini);
    return null;
  };
  // per ogni area le voci che l'utente può aprire; un'area senza voci non compare
  const aree = areeAperte(io);
  // l'area della pagina; sulle pagine comuni (Guida) resta l'ultima aperta
  const [ultima, setUltima] = useState<string>();
  const dellaPagina = areaDi(percorso)?.id;
  if (dellaPagina && dellaPagina !== ultima) setUltima(dellaPagina);
  const qui = aree.find((a) => a.id === (dellaPagina ?? ultima)) ?? aree[0];

  // menu dell'utente (D-53 §19): email, aree, password e guida, esci; si apre verso l'alto
  const [menuUtente, setMenuUtente] = useState(false);
  const contenitoreUtente = useRef<HTMLDivElement>(null);
  const pulsanteUtente = useRef<HTMLButtonElement>(null);
  const riquadroUtente = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenuUtente(false); }, [percorso]);
  useEffect(() => {
    if (!menuUtente) return;
    riquadroUtente.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    const fuori = (e: MouseEvent) => {
      if (contenitoreUtente.current?.contains(e.target as Node)) return;
      setMenuUtente(false); pulsanteUtente.current?.focus();
    };
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuUtente(false); pulsanteUtente.current?.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const voci = [...(riquadroUtente.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
      if (!voci.length) return;
      e.preventDefault();
      const i = voci.indexOf(document.activeElement as HTMLElement);
      const n = i < 0 ? (e.key === 'ArrowDown' ? 0 : voci.length - 1) : (i + (e.key === 'ArrowDown' ? 1 : -1) + voci.length) % voci.length;
      voci[n]?.focus();
    };
    document.addEventListener('click', fuori);
    document.addEventListener('keydown', tasto);
    return () => { document.removeEventListener('click', fuori); document.removeEventListener('keydown', tasto); };
  }, [menuUtente]);

  // preavviso di aggiornamento (D-217): card sopra il profilo con countdown mm:ss; alla manutenzione
  // si ricarica e Caddy mostra la pagina di attesa. Il segnale sta in stato.json, servito da Caddy.
  const [preavviso, setPreavviso] = useState<{ rimanente: number; totale: number } | null>(null);
  const finePreavviso = useRef<number | null>(null);
  const inizioPreavviso = useRef<number | null>(null);
  const totalePreavviso = useRef(0);
  const ultimoBattito = useRef<number | null>(null);
  const ultimoBattitoVisto = useRef(0);
  useEffect(() => {
    let vivo = true;
    const giro = async () => {
      const s = await statoDeploy();
      if (!vivo) return;
      if (s?.fase === 'manutenzione') { window.location.reload(); return; }
      if (s?.fase === 'preavviso' && typeof s.tra_minuti === 'number' && s.tra_minuti > 0 && typeof s.inizio === 'number') {
        // battito: il deploy riscrive il file ogni 5 s; se non lo fa da ~15 s e' stato annullato
        if (typeof s.aggiornato === 'number') {
          if (ultimoBattito.current !== s.aggiornato) {
            ultimoBattito.current = s.aggiornato;
            ultimoBattitoVisto.current = Date.now();
          } else if (Date.now() - ultimoBattitoVisto.current > 15_000) {
            inizioPreavviso.current = null;
            finePreavviso.current = null;
            setPreavviso(null);
            return;
          }
        }
        // istante assoluto: annullando il deploy il countdown non riparte e a 0 la card sparisce
        if (inizioPreavviso.current !== s.inizio) {
          inizioPreavviso.current = s.inizio;
          totalePreavviso.current = s.tra_minuti * 60;
          finePreavviso.current = (s.inizio + s.tra_minuti * 60) * 1000;
        }
      } else {
        inizioPreavviso.current = null;
        finePreavviso.current = null;
        ultimoBattito.current = null;
        setPreavviso(null);
      }
    };
    const poll = setInterval(() => void giro(), 5000);
    const tick = setInterval(() => {
      if (finePreavviso.current == null) return;
      const rimanente = Math.max(0, Math.ceil((finePreavviso.current - Date.now()) / 1000));
      setPreavviso(rimanente <= 0 ? null : { rimanente, totale: totalePreavviso.current });
    }, 1000);
    void giro();
    return () => { vivo = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const voce = (v: Voce) => {
    const si = attiva(v.href, percorso);
    return (
      <Link key={v.href} className={'voce' + (si ? ' attiva' : '')} href={v.href} aria-current={si ? 'page' : undefined}>
        <Icona nome={v.icona} /><span>{v.t}</span>
        {v.href === '/sistema' ? conta(problemi?.problemi, problemi?.errore) : contaVoce(v.href)}
      </Link>
    );
  };

  return (
    <aside className="barra">
      <div className="marchio">
        {/* eslint-disable-next-line @next/next/no-img-element -- stesso logo del prototipo */}
        <img src="/logo-decobrands.png" alt="Decobrands" />
        <span>Sistema Informativo Aziendale</span>
      </div>
      {qui && <div className="area-titolo"><Icona nome={qui.icona} /><span>{qui.t}</span></div>}
      {qui?.id === 'provvigioni' && puo('provvigioni.modifica') && <button type="button" className="carica-barra" id="carica-barra" onClick={() => router.push('/documenti')}><Icona nome="carica" />Carica documenti</button>}
      <div className="barra-menu">
        {qui?.gruppi.map((g) => (
          <nav key={g.gruppo} className="gruppo" aria-label={g.gruppo}>
            <div className="gruppo-nome">{g.gruppo}{qui.id === 'gestione' && conta(problemi?.problemi, problemi?.errore, { marginLeft: '.4rem' })}</div>
            {g.voci.map(voce)}
          </nav>
        ))}
      </div>
      {preavviso != null && (() => {
        const { rimanente, totale } = preavviso;
        const fase = rimanente <= 20 ? 'rosso' : rimanente > totale / 2 ? 'verde' : 'giallo';
        const mm = String(Math.floor(rimanente / 60)).padStart(2, '0');
        const ss = String(rimanente % 60).padStart(2, '0');
        return (
          <div className={'barra-manutenzione ' + fase} role="status">
            <span className="barra-manutenzione-titolo"><Icona nome="sistema" /><b>Salva il lavoro</b></span>
            <span>Aggiornamento tra</span>
            <span className="tempo">{mm}:{ss}</span>
          </div>
        );
      })()}
      <div ref={contenitoreUtente} className={'barra-piede' + (menuUtente ? ' aperta' : '')}>
        {menuUtente && (
          <div ref={riquadroUtente} className="menu-utente" role="menu" aria-label="Utente">
            <div className="menu-utente-mail">{io.email || io.nome}</div>
            {aree.length > 1 && (
              <>
                {aree.map((a) => (
                  <Link key={a.id} href={io.ingressi?.[a.id] ?? a.gruppi[0].voci[0].href} role="menuitem" aria-current={a === qui ? 'true' : undefined}
                    className={'menu-utente-voce' + (a === qui ? ' attiva' : '')} onClick={() => setMenuUtente(false)}>
                    <Icona nome={a.icona} /><span>{a.t}</span>
                    {a === qui && <span className="menu-utente-spunta"><Icona nome="spunta" /></span>}
                  </Link>
                ))}
                <div className="menu-sep" />
              </>
            )}
            <Link href="/profilo" role="menuitem" className="menu-utente-voce" onClick={() => setMenuUtente(false)}><Icona nome="subagenti" /><span>Il mio profilo</span></Link>
            <Link href="/accesso/cambia" role="menuitem" className="menu-utente-voce" onClick={() => setMenuUtente(false)}><Icona nome="chiave" /><span>Cambia la password</span></Link>
            <Link href={GUIDA.href} role="menuitem" className="menu-utente-voce" onClick={() => setMenuUtente(false)}><Icona nome="guida" /><span>Guida</span></Link>
            <div className="menu-sep" />
            <button type="button" role="menuitem" className="menu-utente-voce" onClick={() => { setMenuUtente(false); void esci(); }}><Icona nome="esci" /><span>Esci</span></button>
          </div>
        )}
        <button ref={pulsanteUtente} type="button" className="io io-btn" aria-haspopup="menu" aria-expanded={menuUtente}
          aria-label={'Menu di ' + io.nome} onClick={() => setMenuUtente(!menuUtente)}>
          <span className="io-sigla" aria-hidden="true">{sigla}</span>
          <span><b>{io.nome}</b>{ruoloBreve(io)}</span>
          <Icona nome="giu" />
        </button>
        {versione && <div className="barra-versione">v{versione}</div>}
      </div>
    </aside>
  );
}
