// Licenza d'uso (D-43), stesso testo di CRM.LICENZA nel prototipo (guida.js).
// Bozza da far verificare al consulente (patent box).
export const LICENZA_RIGA = 'Software proprietario sviluppato internamente da Decobrands. Uso riservato agli utenti autorizzati.';
export const COPYRIGHT = '© 2026 Decobrands S.r.l. · Tutti i diritti riservati';

export function TestoLicenza() {
  return (
    <div className="licenza">
      <p><b>Sistema Informativo Aziendale Decobrands</b><br />© 2026 Decobrands S.r.l. Tutti i diritti riservati.</p>
      <h3>1. Titolarità</h3>
      <p>
        Il software è stato ideato e sviluppato internamente da Decobrands S.r.l. per i propri processi aziendali. È un’opera
        dell’ingegno protetta dal diritto d’autore (legge 22 aprile 1941 n. 633, art. 2 n. 8 e art. 64-bis e seguenti); codice
        sorgente, documentazione, interfaccia e banche dati appartengono a Decobrands S.r.l.
      </p>
      <h3>2. Uso concesso</h3>
      <p>
        L’uso è concesso solo al personale e ai collaboratori autorizzati da Decobrands, con credenziali personali, per le attività
        aziendali. Le credenziali non si cedono ad altri.
      </p>
      <h3>3. Divieti</h3>
      <p>
        Senza autorizzazione scritta di Decobrands S.r.l. è vietato copiare, modificare, decompilare, distribuire, cedere o mettere a
        disposizione di terzi il software, in tutto o in parte, salvo i casi permessi dalla legge (art. 64-ter e 64-quater).
      </p>
      <h3>4. Riservatezza</h3>
      <p>Dati e documenti trattati nel sistema sono riservati e si usano solo per le attività aziendali.</p>
      <h3>5. Componenti di terzi</h3>
      <p>Il sistema usa componenti open source, ognuno con la propria licenza, che resta valida:</p>
      <ul>
        <li>Chart.js, ExcelJS, jsPDF e jsPDF-AutoTable: licenza MIT</li>
        <li>carattere Public Sans: SIL Open Font License 1.1</li>
        <li>le librerie dell’applicazione elencate nei file delle dipendenze, con le rispettive licenze</li>
      </ul>
    </div>
  );
}
