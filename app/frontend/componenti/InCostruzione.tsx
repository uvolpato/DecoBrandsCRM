'use client';
import { Pagina, Pannello } from './Pagina';

// ponytail: segnaposto delle pagine non ancora fatte, dentro il guscio; sparisce con l'ultima.
export function InCostruzione({ titolo }: { titolo: string }) {
  return (
    <Pagina titolo={titolo}>
      <Pannello>
        <div className="vuoto"><b>In costruzione</b>Questa pagina arriva con i prossimi passi del piano (avanzamento-app.md).</div>
      </Pannello>
    </Pagina>
  );
}
