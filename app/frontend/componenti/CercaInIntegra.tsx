'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Elenco } from './Flussi';
import { Modale } from './Modale';
import { Pulsante } from './Pagina';
import { avviso } from './Piccoli';
import { usePuo } from './Utente';

// D-111: l'anagrafica si riempie su richiesta. La ricerca parte solo al clic su Cerca (il ponte di
// Integra è lento) e il riconoscimento lo fa il server: dal browser arrivano tipo e testo, poi solo
// l'id della riga da importare (V12, D-28).
interface Riga {
  id_integra: number;
  codice: string;
  ragione_sociale: string;
  piva: string;
  attivo: boolean;
}
export interface CercaInIntegraProps {
  tipo: 'cliente' | 'fornitore';
  onImportato: () => void | Promise<void>; // ricarica la lista dopo l'import
}

export function CercaInIntegra({ tipo, onImportato }: CercaInIntegraProps) {
  const puo = usePuo();
  const consentito = puo('dati.importa');
  const [aperta, setAperta] = useState(false);
  const [q, setQ] = useState('');
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState(false);
  const [attesa, setAttesa] = useState(false);
  const [importando, setImportando] = useState(0);

  function apri() {
    setQ(''); setRighe(null); setMessaggio(''); setErrore(false); setAperta(true);
  }
  const chiudi = () => { if (!attesa && !importando) setAperta(false); };

  async function cerca() {
    if (attesa) return; // Invio due volte mentre il ponte risponde: una richiesta sola
    const testo = q.trim();
    if (!testo) return;
    setAttesa(true); setRighe(null); setMessaggio(''); setErrore(false);
    const r = await api<{ righe?: Riga[]; errore?: string }>('integra/cerca?tipo=' + tipo + '&q=' + encodeURIComponent(testo));
    setAttesa(false);
    if (!r.ok) { setMessaggio(r.messaggio); setErrore(true); return; }
    if (r.dati.errore === 'ponte lento') { setMessaggio('Il ponte di Integra non risponde, riprova.'); setErrore(true); return; }
    const trovate = r.dati.righe ?? [];
    setRighe(trovate);
    if (!trovate.length) setMessaggio('Nessuna corrispondenza in Integra: registralo a mano.');
  }

  async function importa(x: Riga) {
    setImportando(x.id_integra); setMessaggio(''); setErrore(false);
    const r = await api<{ gia_presente?: boolean; ragione_sociale?: string }>('integra/importa', { tipo, id_integra: x.id_integra });
    setImportando(0);
    if (!r.ok) { setMessaggio(r.messaggio); setErrore(true); return; }
    setAperta(false);
    avviso(r.dati.gia_presente ? 'Era già in anagrafica' : 'Importato da Integra: ' + (x.ragione_sociale || x.codice));
    await onImportato();
  }

  return (
    <>
      <div className="azioni-riga">
        <Pulsante piccolo a={{
          etichetta: 'Cerca in Integra', icona: 'cerca', variante: 'sec', onClick: apri,
          disabilitato: !consentito, titolo: consentito ? 'Cerca un soggetto in Integra e importalo' : 'Serve il livello operatore in Dati',
        }} />
      </div>
      {aperta && (
        <Modale titolo="Cerca in Integra"
          testo={'Cerca fra i ' + (tipo === 'cliente' ? 'clienti' : 'fornitori') + ' di Integra non ancora in anagrafica. Parte solo quando premi Cerca: il ponte di Integra è lento.'}
          onChiudi={chiudi}>
          <form className="pila" onSubmit={(e) => { e.preventDefault(); void cerca(); }}>
            <div className="campo">
              <label htmlFor="cerca-integra">Codice, P.IVA o ragione sociale</label>
              <input id="cerca-integra" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
            <div className="azioni-riga">
              <button type="submit" className="btn" disabled={attesa || !q.trim()}>{attesa ? 'Cerco…' : 'Cerca'}</button>
            </div>
            {messaggio && <p className={'nota' + (errore ? ' pericolo-testo' : '')} role="status">{messaggio}</p>}
            {righe && righe.length > 0 && (
              <Elenco voci={righe.map((x) => ({
                testo: <><b>{x.ragione_sociale || '—'}</b><span className="sec-riga">{[x.codice, x.piva, x.attivo ? '' : 'non attivo'].filter(Boolean).join(' · ')}</span></>,
                destra: (
                  <button type="button" className="btn sec piccolo" disabled={!!importando}
                    onClick={() => void importa(x)}>{importando === x.id_integra ? 'Importo…' : 'Importa'}</button>
                ),
              }))} />
            )}
          </form>
        </Modale>
      )}
    </>
  );
}
