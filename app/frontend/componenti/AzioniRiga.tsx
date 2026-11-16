'use client';
import { Icona } from './Icona';

// Azioni di riga sempre a icone, in colonne fisse (D-171): la tabella dichiara l'elenco ordinato delle
// azioni possibili (nome, icona, verbo, variante); per ogni riga dà quelle attive. Ogni azione sta nel
// suo slot fisso: se manca resta lo spazio vuoto e le altre non scorrono. Non permessa = icona spenta
// con il motivo nel title (comportamento attuale dei permessi).

export interface AzioneRiga {
  nome: string;
  icona: string;
  etichetta: string; // verbo: «Modifica», «Elimina», «Conferma», «Recupera»…
  variante?: 'primario' | 'pericolo'; // primario = in evidenza, pericolo = rosso tenue
}

export interface AttivaRiga {
  nome: string;
  onClick: () => void;
  etichetta?: string; // sovrascrive il verbo per questa riga (es. «Cambia la correzione»)
  disabilitata?: boolean;
  titolo?: string; // motivo quando disabilitata; altrimenti «{verbo} {oggetto}»
}

export function AzioniRiga({ azioni, oggetto, riga }: {
  azioni: AzioneRiga[];
  oggetto: string;
  riga: AttivaRiga[];
}) {
  return (
    <div className="azioni-fisse" role="group" aria-label="Azioni">
      {azioni.map((az) => {
        const attiva = riga.find((r) => r.nome === az.nome);
        const label = (attiva?.etichetta ?? az.etichetta) + ' ' + oggetto;
        if (!attiva) return <span key={az.nome} className="azione-slot" aria-hidden="true" />;
        return (
          <button key={az.nome} type="button"
            className={'btn-riga' + (az.variante ? ' ' + az.variante : '')}
            title={attiva.titolo ?? label} aria-label={label}
            disabled={attiva.disabilitata}
            onClick={attiva.onClick}>
            <Icona nome={az.icona} />
          </button>
        );
      })}
    </div>
  );
}
