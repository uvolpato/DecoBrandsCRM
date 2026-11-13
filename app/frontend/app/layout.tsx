import type { Metadata } from 'next';
import type { ReactNode } from 'react';
// Copiati dal prototipo senza modifiche (D-24, §16.1): si aggiornano ricopiandoli.
import './stile/public-sans.css';
import './stile/stile.css';

export const metadata: Metadata = { title: 'Decobrands' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* V6, §16.6, D-44, D-127: sotto i 744 px l'app si ferma a monte, accesso compreso.
            Il blocco è solo CSS (una @media nel foglio): arriva già nell'HTML del server, senza
            lampo dell'app e senza matchMedia. Il foglio è copiato dal prototipo (D-24). */}
        <div className="schermo-stretto">
          {/* eslint-disable-next-line @next/next/no-img-element -- stesso logo del prototipo */}
          <img src="/logo-decobrands.png" alt="Decobrands" />
          <p>
            Il Sistema Informativo Aziendale si usa da computer o tablet. Apri questa pagina da uno
            schermo più grande, o allarga la finestra.
          </p>
        </div>
        <div className="app-tutta">{children}</div>
      </body>
    </html>
  );
}
