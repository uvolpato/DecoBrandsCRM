'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icona } from './Icona';
import { ruoloBreve, usePuo, useUtente } from './Utente';

// Barra laterale con il menu per area (D-47, §7.1): in cima le aree che l'utente può aprire
// (Provvigioni, Dati, Gestione), sotto le voci dell'area della pagina; la Guida vale per tutte.
// In fondo l'utente con Esci e Cambia la password. `area` di una voce è l'area dei permessi
// (D-45): le sue voci si aprono con *.consulta e seguono il livello (sola lettura).
// ponytail: i contatori delle voci (Oggi, Documenti, Pratiche…) arrivano con le loro pagine.
interface Voce { href: string; t: string; icona: string; area?: string; permesso?: string }
const AREE_MENU: { id: string; t: string; icona: string; gruppi: { gruppo: string; voci: Voce[] }[] }[] = [
  { id: 'provvigioni', t: 'Provvigioni', icona: 'liquidazioni', gruppi: [
    { gruppo: 'Ogni giorno', voci: [{ href: '/', t: 'Oggi', icona: 'oggi', area: 'provvigioni' }, { href: '/documenti', t: 'Documenti', icona: 'arrivo', area: 'provvigioni' }, { href: '/pratiche', t: 'Pratiche', icona: 'pratiche', area: 'provvigioni' }, { href: '/scartati', t: 'Documenti scartati', icona: 'cestino', area: 'provvigioni', permesso: 'provvigioni.scartati' }] },
    { gruppo: 'Ogni mese', voci: [{ href: '/bollettini', t: 'Bollettini', icona: 'bollettini', area: 'provvigioni' }] },
    { gruppo: 'Ogni trimestre', voci: [{ href: '/liquidazioni', t: 'Liquidazioni', icona: 'liquidazioni', area: 'provvigioni' }, { href: '/analisi', t: 'Analisi', icona: 'analisi', area: 'provvigioni' }] },
  ] },
  { id: 'dati', t: 'Dati', icona: 'fornitori', gruppi: [
    { gruppo: 'Anagrafiche', voci: [{ href: '/fornitori', t: 'Fornitori', icona: 'fornitori', area: 'dati' }, { href: '/subagenti', t: 'Subagenti', icona: 'subagenti', area: 'dati' }, { href: '/clienti', t: 'Clienti', icona: 'abbinamenti', area: 'dati' }] },
  ] },
  { id: 'gestione', t: 'Gestione', icona: 'impostazioni', gruppi: [
    { gruppo: 'Portale', voci: [
      { href: '/utenti', t: 'Utenti e ruoli', icona: 'subagenti', permesso: 'sistema.utenti' },
      { href: '/sistema', t: 'Stato del sistema', icona: 'sistema', permesso: 'sistema.stato' },
      { href: '/impostazioni', t: 'Impostazioni', icona: 'impostazioni', permesso: 'sistema.impostazioni' },
      { href: '/componenti', t: 'Componenti', icona: 'componenti', permesso: 'sistema.utenti' }] }, // catalogo: solo amministratori (permesso esistente)
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

export function Barra() {
  const io = useUtente();
  const puo = usePuo();
  const percorso = usePathname();
  const router = useRouter();
  const sigla = io.nome.split(' ').map((x) => x[0]).join('').slice(0, 2);
  const libera = (v: Voce) => !permessoDi(v) || puo(permessoDi(v)!);
  // per ogni area le voci che l'utente può aprire; un'area senza voci non compare
  const aree = AREE_MENU.map((a) => ({ ...a, gruppi: a.gruppi.map((g) => ({ ...g, voci: g.voci.filter(libera) })).filter((g) => g.voci.length) }))
    .filter((a) => a.gruppi.length);
  // l'area della pagina; sulle pagine comuni (Guida) resta l'ultima aperta
  const [ultima, setUltima] = useState<string>();
  const dellaPagina = areaDi(percorso)?.id;
  if (dellaPagina && dellaPagina !== ultima) setUltima(dellaPagina);
  const qui = aree.find((a) => a.id === (dellaPagina ?? ultima)) ?? aree[0];

  const voce = (v: Voce) => {
    const si = attiva(v.href, percorso);
    return (
      <Link key={v.href} className={'voce' + (si ? ' attiva' : '')} href={v.href} aria-current={si ? 'page' : undefined}>
        <Icona nome={v.icona} /><span>{v.t}</span>
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
      {/* ponytail: aree a segmenti finché ci stanno (fino a 4); con più aree un elenco a tendina */}
      {aree.length > 1 && (
        <nav className="aree-barra" aria-label="Aree">
          {aree.map((a) => (
            <Link key={a.id} href={a.gruppi[0].voci[0].href} className={'area' + (a === qui ? ' attiva' : '')} aria-current={a === qui ? 'true' : undefined}>
              <Icona nome={a.icona} /><span>{a.t}</span>
            </Link>
          ))}
        </nav>
      )}
      {qui?.id === 'provvigioni' && puo('provvigioni.modifica') && <button type="button" className="carica-barra" id="carica-barra" onClick={() => router.push('/documenti')}><Icona nome="carica" />Carica documenti</button>}
      <div className="barra-menu">
        {qui?.gruppi.map((g) => (
          <nav key={g.gruppo} className="gruppo" aria-label={g.gruppo}><div className="gruppo-nome">{g.gruppo}</div>{g.voci.map(voce)}</nav>
        ))}
        <nav className="gruppo" aria-label="Aiuto">{voce(GUIDA)}</nav>
      </div>
      <div className="barra-piede">
        <div className="io">
          <span className="io-sigla" aria-hidden="true">{sigla}</span>
          <span><b>{io.nome}</b>{ruoloBreve(io)}</span>
          <Link className="io-esci" href="/accesso/esci" title="Esci" aria-label="Esci"><Icona nome="esci" /></Link>
        </div>
        <Link href="/accesso/cambia">Cambia la password</Link>
      </div>
    </aside>
  );
}
