import { redirect } from 'next/navigation';

// /impostazioni: apre la prima sezione, come il prototipo (#/impostazioni → azienda).
export default function Pagina() {
  redirect('/impostazioni/azienda');
}
