'use client';
import Link from 'next/link';
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { ElencoSelezionabile } from '@/componenti/Flussi';
import { Icona } from '@/componenti/Icona';
import { Nota, Pagina, Pannello } from '@/componenti/Pagina';
import { Stato, type Variante } from '@/componenti/Piccoli';
import { usePuo } from '@/componenti/Utente';
import { useMemoria } from '@/lib/memoria';
import { GUIDA, type Argomento, type Finestra } from '@/lib/guida';

// Guida in linea (§7.17): argomenti a sinistra con la ricerca in tutto il testo, contenuto a
// destra. I testi stanno in lib/guida.ts; qui solo il disegno, con le classi guida-* del prototipo
// (viste-gestione.js, vistaGuida). Gli argomenti di Gestione si vedono solo con il permesso.

const PERMESSO: Record<string, string> = {
  accesso: 'sistema.utenti', // il prototipo li lega a Utenti e ruoli
  utenti: 'sistema.utenti',
  sistema: 'sistema.stato',
  impostazioni: 'sistema.impostazioni',
  scartati: 'provvigioni.scartati',
};

// la ricerca guarda tutto il testo, nomi dei pulsanti e delle finestre compresi («Prepara la contestazione»)
const testoPiano = (g: Argomento) =>
  JSON.stringify([g.titolo, g.sintesi, g.flusso, g.pulsanti, g.finestre, g.sapere]).replace(/<[^>]+>/g, '').toLowerCase();

export function VistaGuida({ idSel }: { idSel?: string }) {
  const puo = usePuo();
  const [valori, setValori] = useMemoria<Valori>('guida', { q: '' });
  const visibili = GUIDA.filter((g) => g.gruppo !== 'Gestione' || puo(PERMESSO[g.id]));
  const g = visibili.find((x) => x.id === idSel) ?? visibili[0]; // argomento inesistente: si torna al primo
  const q = String(valori.q ?? '').trim().toLowerCase();
  const trovati = visibili.filter((x) => !q || testoPiano(x).includes(q));

  return (
    <Pagina titolo="Guida" pieno
      sottotitolo="Come si usa il CRM, pagina per pagina: cosa fa, come si lavora, a cosa servono i pulsanti e le finestre. Da ogni pagina il pulsante “Guida” in alto apre l’argomento giusto.">
      <div className="colonne riempi" style={{ '--colonne': 'minmax(240px,0.55fr) minmax(0,2fr)' } as CSSProperties}>
        <Pannello titolo="Argomenti" riempi>
          <FilterBar valori={valori} onChange={setValori}
            campi={[{ nome: 'q', tipo: 'cerca', placeholder: 'Cerca in tutto il testo…' }]} />
          {trovati.length
            ? <ElencoSelezionabile selezionata={g.id}
              voci={trovati.map((x) => ({ id: x.id, href: '/guida/' + x.id, titolo: x.titolo, sotto: x.gruppo }))} />
            : <Nota>Nessun argomento contiene «{String(valori.q ?? '')}».</Nota>}
        </Pannello>

        <Pannello titolo={g.titolo} nota={g.gruppo} riempi
          azioni={g.gruppo === 'Inizia qui' ? [] : [{ etichetta: 'Apri la pagina', href: g.vai, consentito: true }]}>
          <ArgomentoGuida g={g} />
        </Pannello>
      </div>
    </Pagina>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <section className="guida-sez"><h3>{titolo}</h3>{children}</section>;
}

/** Coppie nome / testo, come CRM.Pannello.coppie del prototipo: nome in un riquadro da tasto o semplice. */
function Coppie({ classe, lista, tasto, piccolo }: { classe: string; lista: string[][]; tasto?: boolean; piccolo?: boolean }) {
  return (
    <dl className={classe}>
      {lista.map(([nome, testo], i) => (
        <div key={i}>
          <dt>{tasto ? <span className={'tasto' + (piccolo ? ' piccolo' : '')}>{nome}</span> : nome}</dt>
          <dd dangerouslySetInnerHTML={{ __html: testo }} />
        </div>
      ))}
    </dl>
  );
}

function FinestraGuida({ f }: { f: Finestra }) {
  return (
    <article className="guida-finestra">
      <header><b>{f.nome}</b><span>si apre da <span className="tasto piccolo">{f.da}</span></span></header>
      <p>{f.cosa}</p>
      {f.campi && <><h4>Cosa contiene</h4><Coppie classe="guida-campi" lista={f.campi} /></>}
      {f.azioni && <><h4>Pulsanti</h4><Coppie classe="guida-campi" lista={f.azioni} tasto piccolo /></>}
    </article>
  );
}

function ArgomentoGuida({ g }: { g: Argomento }) {
  return (
    <div className="guida">
      <p className="guida-sintesi" dangerouslySetInnerHTML={{ __html: g.sintesi }} />
      {g.schema && <Schema nome={g.schema} />}
      {g.flusso && (
        <Sezione titolo="Come si lavora">
          <ol className="guida-flusso">
            {g.flusso.map(([titolo, testo], i) => (
              <li key={i}><span className="n">{i + 1}</span><b>{titolo}</b><span>{testo}</span></li>
            ))}
          </ol>
        </Sezione>
      )}
      {g.pulsanti && <Sezione titolo="Pulsanti e comandi"><Coppie classe="guida-pulsanti" lista={g.pulsanti} tasto /></Sezione>}
      {g.finestre && (
        <Sezione titolo="Finestre">
          <div className="guida-finestre">{g.finestre.map((f) => <FinestraGuida key={f.nome} f={f} />)}</div>
        </Sezione>
      )}
      {g.sapere && (
        <Sezione titolo="Da sapere">
          <ul className="guida-sapere">{g.sapere.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</ul>
        </Sezione>
      )}
      {g.modifica && (
        <p className="guida-ruoli"><Icona nome="lucchetto" /><span><b>Chi può modificare:</b> {g.modifica} Con il profilo
          sola lettura la pagina si consulta (e le liquidazioni si esportano) ma non si modifica.</span></p>
      )}
    </div>
  );
}

// schemi disegnati: il ciclo del lavoro, gli stati della pratica e gli incassi (§7.17)
const CICLO = [
  ['Ogni giorno', 'Documenti', 'entrano, si leggono, si abbinano', 'arrivo', '/documenti'],
  ['Ogni giorno', 'Pratiche', 'ordine → conferma → fattura', 'pratiche', '/pratiche'],
  ['Ogni mese', 'Bollettini', 'il fornitore riconosce, noi verifichiamo', 'bollettini', '/bollettini'],
  ['Ogni trimestre', 'Liquidazioni', 'si paga ai subagenti', 'liquidazioni', '/liquidazioni'],
];

const CORSIE: { titolo: string; passi: [Variante, string, string][] }[] = [
  {
    titolo: 'Sul fatturato', passi: [
      ['ok', 'Fattura', 'provvigione nel bollettino del mese'],
      ['errore', 'Storno', '1–2 mesi dopo se il cliente non paga'],
      ['ok', 'Riaccredito', 'nel mese in cui il cliente paga'],
    ],
  },
  {
    titolo: 'Sul maturato', passi: [
      ['neutro', 'Fattura', 'nessuna provvigione finché il cliente non paga'],
      ['attesa', 'Da verificare', 'oltre i giorni d’incasso'],
      ['ok', 'Riconosciuta', 'nel mese in cui il cliente paga'],
    ],
  },
];

function Schema({ nome }: { nome: 'ciclo' | 'stati' | 'incassi' }) {
  if (nome === 'ciclo') {
    return (
      <>
        <div className="guida-schema ciclo">
          {CICLO.map(([cadenza, titolo, testo, icona, href], i) => (
            <Fragment key={titolo}>
              {i > 0 && <span className="freccia" aria-hidden="true" />}
              <Link className="nodo" href={href}>
                <span className="cadenza">{cadenza}</span><Icona nome={icona} /><b>{titolo}</b><span>{testo}</span>
              </Link>
            </Fragment>
          ))}
        </div>
        <p className="guida-sotto-schema"><Icona nome="oggi" /><span><b>Oggi</b> raccoglie da tutte e quattro le fasi quello che chiede un’azione.</span></p>
      </>
    );
  }
  if (nome === 'incassi') {
    return (
      <>
        <div className="guida-schema incassi" role="img" aria-label="Incassi sul fatturato e sul maturato">
          {CORSIE.map((c) => (
            <div key={c.titolo} className="corsia">
              <b>{c.titolo}</b>
              <div className="passi">
                {c.passi.map(([v, titolo, testo], i) => (
                  <Fragment key={titolo}>
                    {i > 0 && <span className="freccia" aria-hidden="true" />}
                    <div className="stato-nodo"><Stato v={v}>{titolo}</Stato><span>{testo}</span></div>
                  </Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="guida-sotto-schema"><Icona nome="liquidazioni" /><span>Al subagente lo storno arriva nella <b>liquidazione del trimestre successivo</b> come voce negativa.</span></p>
      </>
    );
  }
  return (
    <div className="guida-schema stati" role="img" aria-label="Stati della pratica">
      <div className="stato-nodo">
        <Stato v="info">Attesa conferma</Stato><span>arriva l’ordine</span>
        <div className="ramo"><Stato v="errore">Conferma in ritardo</Stato><span>passati i giorni di attesa del fornitore</span></div>
      </div>
      <span className="freccia" aria-hidden="true" />
      <div className="stato-nodo"><Stato v="primario">Confermata</Stato><span>arriva la conferma</span></div>
      <span className="freccia" aria-hidden="true" />
      <div className="stato-nodo">
        <Stato v="ok">Fatturata</Stato><span>arriva la fattura</span>
        <div className="ramo"><Stato v="neutro">Nota di credito</Stato><span>riduce l’imponibile, non cambia lo stato</span></div>
      </div>
    </div>
  );
}
