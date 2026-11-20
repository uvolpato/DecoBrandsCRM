// Pagina di attesa servita sulla porta del frontend mentre il deploy lo tiene fermo (D-212).
// Senza Caddy il portale è esposto direttamente da Next: quando Next è spento non risponde nessuno,
// quindi il cartello di manutenzione da solo non basta. Questo mini-server risponde su ogni indirizzo
// con la pagina di attesa e il logo; la pagina si rilegge e si ricarica appena il frontend vero prende
// il posto (stessa porta, stessa impronta assente).
//   node servi.js <porta> [indirizzo]     (127.0.0.1 se non scritto)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const [porta, indirizzo = '127.0.0.1'] = process.argv.slice(2);
if (!Number(porta)) {
  console.error('uso: node servi.js <porta> [indirizzo]');
  process.exit(1);
}
const file = (nome) => path.join(__dirname, nome);
const immagine = fs.readFileSync(file('logo-decobrands.png'));

http.createServer((req, res) => {
  const via = (req.url || '/').split('?')[0];
  if (via === '/logo-decobrands.png') {
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
    return res.end(immagine);
  }
  // tutto il resto è la pagina di attesa: l'indirizzo chiesto resta nella barra
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(file('index.html')));
}).listen(Number(porta), indirizzo, () => console.log(`pagina di attesa su ${indirizzo}:${porta}`));
