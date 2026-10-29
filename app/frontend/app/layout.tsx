import type { Metadata } from 'next';
import type { ReactNode } from 'react';
// Copiati dal prototipo senza modifiche (D-24, §16.1): si aggiornano ricopiandoli.
import './stile/public-sans.css';
import './stile/stile.css';

export const metadata: Metadata = { title: 'Decobrands' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
