'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { COPYRIGHT, LICENZA_RIGA, TestoLicenza } from './Licenza';
import { Modale } from './Modale';

// Scena delle pagine di accesso (D-42, D-43, spec §7.0), come CRM.Accesso del prototipo: pagina
// scura, logo al centro, licenza in basso; la pagina (componente Accesso) è la finestra.
// Su Accedi e Password dimenticata il logo resta finché non si preme un tasto o si tocca; il tasto
// finisce nel primo campo. Esc, un clic fuori o 2 minuti senza toccare nulla tornano al logo e il
// modulo riparte vuoto. Sta nel layout: fra una pagina di accesso e l'altra la finestra resta aperta.
const CON_LOGO = ['/accesso', '/accesso/dimenticata'];
const ATTESA = 2 * 60_000;
// link delle email e cambio password: finestra subito aperta; Esci: di nuovo il logo
const apertaPer = (p: string) => !CON_LOGO.includes(p) && p !== '/accesso/esci';

export function ScenaAccesso({ children }: { children: ReactNode }) {
  const percorso = usePathname();
  const router = useRouter();
  const libera = CON_LOGO.includes(percorso);
  const [aperta, setAperta] = useState(apertaPer(percorso));
  const [giro, setGiro] = useState(0); // cambia a ogni chiusura: il modulo si ricrea vuoto
  const [licenza, setLicenza] = useState(false);
  const tasto = useRef(''); // il tasto che ha aperto la finestra, per il primo campo
  const giu = useRef<Element | null>(null); // dove è partito il clic
  const scena = useRef<HTMLDivElement>(null);

  // arrivando con un messaggio (password appena salvata) la finestra è già aperta: il messaggio si vede subito
  useEffect(() => { if (/[?&]fatto=/.test(location.search)) setAperta(true); }, []);

  // cambiando pagina: Accedi ↔ Password dimenticata lasciano la finestra com'è, Esci torna al logo
  useEffect(() => {
    if (percorso === '/accesso/esci') setAperta(false);
    else if (!CON_LOGO.includes(percorso)) setAperta(true);
  }, [percorso]);

  const chiudi = useCallback(() => {
    setAperta(false);
    setGiro((g) => g + 1);
    if (percorso !== '/accesso') router.replace('/accesso');
  }, [percorso, router]);
  const chiudiLicenza = useCallback(() => setLicenza(false), []);

  useEffect(() => {
    if (!aperta) return;
    const primo = scena.current?.querySelector<HTMLInputElement>('.accesso input:not([type=checkbox])');
    if (!primo) return;
    // il tasto va nel campo solo se è vuoto: se il browser l'ha già riempito non si sporca
    if (tasto.current && !primo.value) primo.value = tasto.current;
    tasto.current = '';
    primo.focus();
  }, [aperta]);

  useEffect(() => {
    if (!libera || licenza) return; // con la licenza aperta Esc è suo
    const premuto = (ev: KeyboardEvent) => {
      if (aperta) { if (ev.key === 'Escape') chiudi(); return; }
      if ((ev.target as Element).closest?.('.accesso-piede')) return;
      if ((ev.ctrlKey || ev.metaKey) && !ev.getModifierState('AltGraph')) return; // scorciatoie sì, AltGr (@, #) no
      const lettera = ev.key.length === 1 && ev.key !== ' ';
      if (!lettera && !['Enter', ' ', 'Tab'].includes(ev.key)) return; // F5, F11, Esc… restano al browser
      ev.preventDefault();
      tasto.current = lettera ? ev.key : '';
      setAperta(true);
    };
    document.addEventListener('keydown', premuto);
    return () => document.removeEventListener('keydown', premuto);
  }, [libera, licenza, aperta, chiudi]);

  // finestra aperta e nessun tasto o clic per 2 minuti: torna al logo, modulo vuoto
  useEffect(() => {
    if (!libera || !aperta || licenza) return;
    let t = setTimeout(chiudi, ATTESA);
    const rinvia = () => { clearTimeout(t); t = setTimeout(chiudi, ATTESA); };
    document.addEventListener('keydown', rinvia);
    document.addEventListener('pointerdown', rinvia);
    return () => { clearTimeout(t); document.removeEventListener('keydown', rinvia); document.removeEventListener('pointerdown', rinvia); };
  }, [libera, aperta, licenza, chiudi]);

  // si chiude solo se il clic è partito e finito fuori: trascinare una selezione dal campo non chiude
  function clic(ev: MouseEvent) {
    const t = ev.target as Element, partito = giu.current;
    if (!libera || t.closest('.accesso-piede')) return;
    if (!aperta) setAperta(true);
    else if (!t.closest('.accesso') && !partito?.closest('.accesso')) chiudi();
  }

  return (
    <>
      <div ref={scena} className={'accesso-scena' + (aperta ? ' aperta' : '')} onPointerDown={(e) => { giu.current = e.target as Element; }} onClick={clic}>
        <div className="accesso-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- stesso logo del prototipo, già piccolo */}
          <img src="/logo-decobrands.png" alt="Decobrands" />
          <span>Sistema Informativo Aziendale</span>
          <button type="button" className="accesso-invito">Premi un tasto o tocca per entrare</button>
        </div>
        <div className="accesso-piede">
          <p>{LICENZA_RIGA}</p>
          <p>{COPYRIGHT} · <button type="button" className="accesso-licenza" onClick={() => setLicenza(true)}>Licenza d’uso</button></p>
        </div>
        <Fragment key={giro}>{children}</Fragment>
      </div>
      {licenza && <Modale titolo="Licenza d’uso" onChiudi={chiudiLicenza}><TestoLicenza /></Modale>}
    </>
  );
}
