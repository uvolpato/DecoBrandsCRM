'use client';
import { VistaDocumenti } from './VistaDocumenti';

// Elenco e dettaglio stanno nel LAYOUT, non nel page: così navigando fra /documenti e
// /documenti/:id il layout NON si rimonta e l'elenco a sinistra non si ricarica.
export default function Layout() {
  return <VistaDocumenti />;
}
