import type { ReactNode } from 'react';
import { ClasseBody } from '@/componenti/ClasseBody';

// Pagine di accesso: barra scura con il solo marchio, come nel prototipo (CRM.Accesso, §7.0).
export default function LayoutAccesso({ children }: { children: ReactNode }) {
  return (
    <>
      <ClasseBody classe="in-accesso" />
      <aside className="barra">
        <div className="marchio">
          {/* eslint-disable-next-line @next/next/no-img-element -- stesso logo del prototipo, già piccolo */}
          <img src="/logo-decobrands.png" alt="Decobrands" />
          <span>Pratiche e provvigioni</span>
        </div>
        <div className="barra-piede">Accesso riservato a chi lavora con Decobrands. Gli utenti li crea l’amministratore.</div>
      </aside>
      <main className="principale">{children}</main>
    </>
  );
}
