'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icona } from './Icona';
import { RUOLI, usePuo, useUtente } from './Utente';

// Barra laterale come CRM.Barra del prototipo (componenti.js): voci per gruppo, solo quelle
// permesse al ruolo; il gruppo Gestione si richiude ed è aperto nelle sue pagine; in fondo
// l'utente con Esci e Cambia la password.
// ponytail: i contatori delle voci (Oggi, Documenti, Pratiche…) arrivano con le loro pagine.
const VOCI: { gruppo: string; richiudibile?: boolean; voci: { href: string; t: string; icona: string; permesso?: string }[] }[] = [
  { gruppo: 'Ogni giorno', voci: [{ href: '/', t: 'Oggi', icona: 'oggi' }, { href: '/documenti', t: 'Documenti', icona: 'arrivo' }, { href: '/pratiche', t: 'Pratiche', icona: 'pratiche' }] },
  { gruppo: 'Ogni mese', voci: [{ href: '/bollettini', t: 'Bollettini', icona: 'bollettini' }] },
  { gruppo: 'Ogni trimestre', voci: [{ href: '/liquidazioni', t: 'Liquidazioni', icona: 'liquidazioni' }, { href: '/analisi', t: 'Analisi', icona: 'analisi' }] },
  { gruppo: 'Anagrafiche', voci: [{ href: '/fornitori', t: 'Fornitori', icona: 'fornitori' }, { href: '/subagenti', t: 'Subagenti', icona: 'subagenti' }, { href: '/clienti', t: 'Clienti', icona: 'abbinamenti' }] },
  { gruppo: 'Gestione', richiudibile: true, voci: [
    { href: '/utenti', t: 'Utenti e ruoli', icona: 'subagenti', permesso: 'gestione' },
    { href: '/sistema', t: 'Stato del sistema', icona: 'sistema', permesso: 'sistema' },
    { href: '/impostazioni', t: 'Impostazioni', icona: 'impostazioni', permesso: 'gestione' },
    { href: '/scartati', t: 'Documenti scartati', icona: 'cestino', permesso: 'scartati' },
    { href: '/guida', t: 'Guida', icona: 'guida' }] },
];

/** Titolo della voce di una pagina (per "In costruzione" e per il titolo della scheda del browser). */
export const titoloDi = (percorso: string) =>
  VOCI.flatMap((g) => g.voci).find((v) => v.href !== '/' && (percorso === v.href || percorso.startsWith(v.href + '/')))?.t ?? 'Decobrands';

const attiva = (href: string, percorso: string) => (href === '/' ? percorso === '/' : percorso === href || percorso.startsWith(href + '/'));

export function Barra() {
  const io = useUtente();
  const puo = usePuo();
  const percorso = usePathname();
  const router = useRouter();
  const [gestioneAperta, setGestioneAperta] = useState(false);
  const sigla = io.nome.split(' ').map((x) => x[0]).join('').slice(0, 2);

  return (
    <aside className="barra">
      <div className="marchio">
        {/* eslint-disable-next-line @next/next/no-img-element -- stesso logo del prototipo */}
        <img src="/logo-decobrands.png" alt="Decobrands" />
        <span>Sistema Informativo Aziendale</span>
      </div>
      {/* nascosto in sola lettura da stile.css (body.sola-lettura #carica-barra) */}
      <button type="button" className="carica-barra" id="carica-barra" onClick={() => router.push('/documenti')}><Icona nome="carica" />Carica documenti</button>
      <div className="barra-menu">
        {VOCI.map((g) => {
          const voci = g.voci.filter((v) => !v.permesso || puo(v.permesso));
          if (!voci.length) return null;
          const links = voci.map((v) => {
            const si = attiva(v.href, percorso);
            return (
              <Link key={v.href} className={'voce' + (si ? ' attiva' : '')} href={v.href} aria-current={si ? 'page' : undefined}>
                <Icona nome={v.icona} /><span>{v.t}</span>
              </Link>
            );
          });
          if (!g.richiudibile) return <nav key={g.gruppo} className="gruppo" aria-label={g.gruppo}><div className="gruppo-nome">{g.gruppo}</div>{links}</nav>;
          // aperto quando si è in una delle sue pagine, o se l'utente l'ha aperto
          const aperto = gestioneAperta || voci.some((v) => attiva(v.href, percorso));
          return (
            <details key={g.gruppo} className="gruppo richiudibile" open={aperto} aria-label={g.gruppo}
              onToggle={(e) => setGestioneAperta((e.target as HTMLDetailsElement).open)}>
              <summary className="gruppo-nome">{g.gruppo}</summary>
              {links}
            </details>
          );
        })}
      </div>
      <div className="barra-piede">
        <div className="io">
          <span className="io-sigla" aria-hidden="true">{sigla}</span>
          <span><b>{io.nome}</b>{RUOLI[io.ruolo] ?? io.ruolo}</span>
          <Link className="io-esci" href="/accesso/esci" title="Esci" aria-label="Esci"><Icona nome="esci" /></Link>
        </div>
        <Link href="/accesso/cambia">Cambia la password</Link>
      </div>
    </aside>
  );
}
