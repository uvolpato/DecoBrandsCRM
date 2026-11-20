'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Barra, primaPagina, voceDi } from '@/componenti/Barra';
import { ClasseBody } from '@/componenti/ClasseBody';
import { Riservata } from '@/componenti/Pagina';
import { RegioneAvvisi } from '@/componenti/Piccoli';
import { UtenteCtx, AggiornaUtenteCtx } from '@/componenti/Utente';
import { api, type Io } from '@/lib/api';
import { EventiProvider } from '@/lib/eventi';

// Guscio dell'app (passo 1.11): chiede al server chi è l'utente (D-38) a ogni cambio pagina;
// senza sessione porta all'accesso e poi torna qui; con la password provvisoria solo il cambio.
// Barra, "Pagina riservata", fascia "Profilo in sola lettura" e pulsanti spenti seguono i permessi del
// server e l'area della pagina (D-45): il controllo è qui, una volta per tutte le pagine.
// A7-07, D-45, §8.3: gli stessi selettori di stile.css che spengono i pulsanti in sola lettura. Il CSS
// (pointer-events: none) ferma il mouse ma non la tastiera né il lettore di schermo: qui il guscio li blocca
// anche dal clic da tastiera e li annuncia spenti con aria-disabled (WCAG 4.1.2).
const SELETTORE_SPENTI = [
  'body.sola-lettura .principale button.btn:not(.consentito):not(.torna)',
  'body.sola-lettura .velo .modale-piede button.btn:not(.sec):not(.consentito)',
  'body.sola-lettura .affiancata .aff-piede button.btn:not(.sec):not(.consentito)',
  'body.sola-lettura .velo .modale-corpo .btn:not(.sec):not(.consentito)',
].join(', ');

export default function Guscio({ children }: { children: ReactNode }) {
  // useSearchParams (vista=sola) vuole un confine Suspense: senza, la build di produzione si ferma
  // su ogni pagina ("useSearchParams() should be wrapped in a suspense boundary").
  return (<Suspense><GuscioInterno>{children}</GuscioInterno></Suspense>);
}

function GuscioInterno({ children }: { children: ReactNode }) {
  const router = useRouter();
  const percorso = usePathname();
  const [io, setIo] = useState<Io | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [tentativo, setTentativo] = useState(0); // A5-14: Riprova rilancia l'effetto di lettura di /accesso/io
  const voce = voceDi(percorso);
  const solaLettura = !!voce?.area && !!io && io.aree[voce.area] === 'lettura';
  // §16.4 §19: ?vista=sola toglie la cornice (barra, avvisi, navigazione) per aprire una pagina in una
  // scheda a parte (es. la pratica dal pulsante «apri in una nuova scheda» della ricerca). Stessa
  // sessione e stessi permessi: cambia solo l'involucro, non l'accesso.
  const vistaSola = useSearchParams().get('vista') === 'sola';

  useEffect(() => {
    let vivo = true;
    void api<Io>('accesso/io').then((r) => {
      if (!vivo) return;
      if (!r.ok) {
        // il 401 lo porta all'accesso lib/api.ts (sessione scaduta o assente); gli altri errori (server
        // giù, 5xx) mostrano una pagina scura con Riprova, mai uno schermo bianco (A5-14)
        if (r.stato !== 401) setErrore(r.messaggio);
        return;
      }
      setErrore(null);
      if (r.dati.cambia_password) router.replace('/accesso/cambia?dopo=' + encodeURIComponent(percorso));
      // Oggi (pagina d'arrivo) è di Provvigioni: chi non ha l'area va alla prima pagina che può aprire
      else if (percorso === '/' && !r.dati.permessi.includes('provvigioni.consulta')) router.replace(primaPagina((p) => r.dati.permessi.includes(p)));
      else setIo(r.dati);
    });
    return () => { vivo = false; };
  }, [router, percorso, tentativo]);

  // Uscita automatica (D-89, D-216): ogni 5 s il guscio chiede chi è l'utente in modo automatico
  // (`x-automatico`, non conta come attività): se il server risponde 401 — sessione scaduta per il
  // timeout o sostituita da un nuovo accesso — lib/api riporta all'accesso con il messaggio, senza
  // che serva un click.
  useEffect(() => {
    if (!io) return;
    const t = setInterval(() => void api('accesso/io', undefined, undefined, { automatico: true }), 5000);
    return () => clearInterval(t);
  }, [io]);

  // A7-07: in sola lettura si bloccano i pulsanti spenti anche dal clic da tastiera (cattura) e si
  // segnano spenti con aria-disabled, anche quando compaiono dopo (finestre, righe di tabella).
  useEffect(() => {
    if (!solaLettura) return;
    const blocca = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t?.closest(SELETTORE_SPENTI)) { e.preventDefault(); e.stopPropagation(); }
    };
    const segna = () => document.querySelectorAll(SELETTORE_SPENTI).forEach((el) => el.setAttribute('aria-disabled', 'true'));
    segna();
    const principale = document.getElementById('principale');
    const osserva = new MutationObserver(segna);
    if (principale) osserva.observe(principale, { childList: true, subtree: true });
    document.addEventListener('click', blocca, true);
    return () => {
      document.removeEventListener('click', blocca, true);
      osserva.disconnect();
    };
  }, [solaLettura]);

  // A5-14: pagina scura come l'accesso (body:has(.accesso-scena)), con il messaggio e Riprova
  if (errore) return (
    <main className="principale">
      <div className="accesso-scena aperta">
        <div className="accesso">
          <section className="pannello">
            <div className="pannello-corpo">
              <h1>Il server non risponde</h1>
              <p className="nota" role="alert">{errore}</p>
              <button type="button" className="btn largo" onClick={() => { setErrore(null); setTentativo((t) => t + 1); }}>Riprova</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
  // attesa del guscio: stesso fondo scuro della scena d'accesso (body:has(.accesso-scena)), mai un lampo chiaro
  if (!io) return (
    <main className="principale">
      <div className="accesso-scena aperta">
        <div className="avvio-gira" role="status" aria-label="Caricamento" />
      </div>
    </main>
  );
  // D-45: la voce della pagina decide il permesso (le pagine di un'area con *.consulta) e la sola lettura
  return (
    <UtenteCtx.Provider value={io}>
      <AggiornaUtenteCtx.Provider value={setIo}>
        <EventiProvider>
          {/* stile.css: body.sola-lettura mostra la fascia e spegne i pulsanti che modificano (§8.3) */}
          {solaLettura && <ClasseBody classe="sola-lettura" />}
          {vistaSola && <ClasseBody classe="vista-sola" />}
          {!vistaSola && <><Barra /><RegioneAvvisi /></>}
          <main className="principale" id="principale">
            {voce?.permesso ? <Riservata permesso={voce.permesso} titolo={voce.t}>{children}</Riservata> : children}
          </main>
        </EventiProvider>
      </AggiornaUtenteCtx.Provider>
    </UtenteCtx.Provider>
  );
}
