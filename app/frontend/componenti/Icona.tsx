// Icone a tratto 24×24, gli stessi percorsi di CRM.icona del prototipo (componenti.js).
// ponytail: solo le icone usate finora; le altre si copiano dal prototipo quando servono.
const PERCORSI: Record<string, string> = {
  occhio: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  'occhio-chiuso': '<path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  esci: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
};

export function Icona({ nome }: { nome: string }) {
  return <svg className="icona" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PERCORSI[nome] ?? '' }} />;
}
