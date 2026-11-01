// Formati come M.euro, M.num, M.pct, M.data del prototipo (motore.js). Intl con 'it-IT' non mette il
// separatore delle migliaia sotto 10.000 (8207,20): si formatta a mano, come nel prototipo.
const gruppi = (t: string) => t.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function numero(n: unknown, dec: number, minDec: number) {
  const x = Number(n) || 0;
  const [i, d0] = Math.abs(x).toFixed(dec).split('.');
  let d = d0;
  if (d && minDec < dec) { d = d.replace(/0+$/, ''); while (d.length < minDec) d += '0'; }
  return (x < 0 && Number(Math.abs(x).toFixed(dec)) !== 0 ? '-' : '') + gruppi(i) + (d ? ',' + d : '');
}

export const euro = (n: unknown) => numero(n, 2, 2) + ' €';
export const pct = (n: unknown) => numero(n, 2, 0) + '%';
export const num = (n: unknown) => numero(n, 2, 0);
/** aaaa-mm-gg → gg/mm/aaaa */
export const data = (iso?: string | null) => { if (!iso) return '—'; const [a, m, g] = iso.split('-'); return g + '/' + m + '/' + a; };
/** Classe del segno di un importo: negativo in rosso, positivo in verde (CRM.classeSegno). */
export const classeSegno = (n: number) => (n > 0.004 ? 'positivo' : n < -0.004 ? 'negativo' : '');
export const euroSegno = (n: number) => (n > 0.004 ? '+' : '') + euro(n);
