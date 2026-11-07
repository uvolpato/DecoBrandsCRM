/** Una cella dei CSV di esportazione (separatore `;`): quotata se contiene `;`, virgolette o a capo,
 *  e con l'apice davanti se comincia con `=`, `+`, `@`, TAB, CR o `-` non seguito da una cifra.
 *  Senza l'apice Excel e LibreOffice eseguono il valore come formula (formula injection, §11):
 *  il numero del documento arriva dal documento caricato, quindi non è fidato. */
export const cella = (v: unknown) => {
  let x = String(v ?? '');
  if (/^[=+@\t\r]/.test(x) || /^-(?!\d)/.test(x)) x = "'" + x;
  return /[;"\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
};
