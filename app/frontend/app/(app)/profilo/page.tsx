'use client';
import { type FormEvent } from 'react';
import { areeAperte } from '@/componenti/Barra';
import { Campo } from '@/componenti/Campo';
import { Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, Dettagli, Informazioni } from '@/componenti/Piccoli';
import { LIVELLI, RUOLI, useAggiornaUtente, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';

// Il mio profilo (D-88, §7.0): dati in sola lettura, aree con il livello, la pagina di ingresso
// per area (scelta dal singolo utente) e la sicurezza. Il server valida area e percorso (V12).

export default function Profilo() {
  const io = useUtente();
  const aggiorna = useAggiornaUtente();
  const aree = areeAperte(io); // solo le aree che l'utente può aprire, con le voci permesse
  const livello = (id: string) => (id === 'gestione' ? 'secondo il ruolo' : LIVELLI[io.aree[id]] ?? '—');

  const salva = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const ingressi: Record<string, string | null> = {};
    for (const a of aree) ingressi[a.id] = String(f.get('ingresso_' + a.id) ?? '') || null; // vuoto: nessuna scelta
    const r = await api<{ ingressi: Record<string, string> }>('accesso/profilo', { ingressi }, 'PUT');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    aggiorna({ ...io, ingressi: r.dati.ingressi }); // il menu dell'utente riparte dalla scelta nuova
    avviso('Preferenze salvate: entrando in un’area si apre la pagina scelta');
  };

  return (
    <Pagina titolo="Il mio profilo"
      sottotitolo="I tuoi dati, le aree che puoi aprire e la pagina con cui entri in ognuna.">
      <div className="colonne pari" style={{ alignItems: 'start' }}>
        <div className="pila">
          <Pannello titolo="I tuoi dati">
            <Dettagli inColonne voci={[
              { etichetta: 'Nome e cognome', valore: io.nome },
              { etichetta: 'Nome utente', valore: io.username },
              { etichetta: 'Email', valore: io.email },
              { etichetta: 'Ruolo di Sistema', valore: RUOLI[io.ruolo] ?? io.ruolo },
            ]} />
          </Pannello>
          <Pannello titolo="Aree che puoi aprire" nota="livello"
            info={<Informazioni titolo="Informazioni sulle aree che puoi aprire">
              Nome, nome utente, email, ruolo e livelli li cambia chi amministra: da qui si leggono soltanto.
            </Informazioni>}>
            <Dettagli inColonne voci={aree.map((a) => ({ etichetta: a.t, valore: livello(a.id) }))} />
          </Pannello>
        </div>
        <div className="pila">
          <Pannello titolo="Pagina di ingresso per area" nota="quando scegli l’area nel menu"
            info={<Informazioni titolo="Informazioni sulla pagina di ingresso">
              Senza scelta si apre la prima pagina dell’area; in Gestione la prima a cui hai accesso. La scelta vale solo per te.
            </Informazioni>}>
            <form className="modulo" onSubmit={salva} noValidate>
              {aree.map((a) => (
                <Campo key={a.id} nome={'ingresso_' + a.id} etichetta={a.t} tipo="select"
                  valore={io.ingressi[a.id] ?? a.gruppi[0].voci[0].href}
                  opzioni={a.gruppi.flatMap((g) => g.voci).map((v) => ({ value: v.href, label: v.t }))}
                  aiuto={a.id === 'gestione' ? 'Ci sono solo le voci a cui hai accesso.' : undefined} />
              ))}
              <div className="azioni-riga">
                <button type="submit" className="btn">Salva le preferenze</button>
              </div>
            </form>
          </Pannello>
          <Pannello titolo="Sicurezza"
            azioni={[{ etichetta: 'Cambia la password', icona: 'chiave', href: '/accesso/cambia' }]}
            info={<Informazioni titolo="Informazioni sulla sicurezza">
              Cambiare la password chiude le sessioni aperte sugli altri computer. Per uscire, il menu dell’utente in fondo alla barra.
            </Informazioni>}>
          </Pannello>
        </div>
      </div>
    </Pagina>
  );
}
