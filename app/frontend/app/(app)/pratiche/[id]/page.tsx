import { Pagina, Pannello } from '@/componenti/Pagina';

// F2-A2 porta qui il dettaglio (binario delle fasi, riepilogo e righe a confronto).
export default function PaginaPratica() {
  return (
    <Pagina titolo="Pratica">
      <Pannello>
        <div className="vuoto"><b>Dettaglio in arrivo</b>Il binario delle fasi e il confronto delle righe arrivano con F2-A2.</div>
      </Pannello>
    </Pagina>
  );
}
