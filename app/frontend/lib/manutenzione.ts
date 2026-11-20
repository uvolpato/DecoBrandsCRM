'use client';
// Stato del deploy servito da Caddy (D-217). deploy.cmd scrive manutenzione/stato.json solo durante
// il preavviso ({"fase":"preavviso","tra_minuti":N}) e la manutenzione ({"fase":"manutenzione"}); se
// il file non c'e' (fase normale) Caddy non lo serve e qui torna null.

export interface StatoDeploy { fase: 'preavviso' | 'manutenzione'; tra_minuti?: number }

export async function statoDeploy(): Promise<StatoDeploy | null> {
  try {
    const r = await fetch('/manutenzione/stato.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const d = (await r.json().catch(() => null)) as StatoDeploy | null;
    return d && (d.fase === 'preavviso' || d.fase === 'manutenzione') ? d : null;
  } catch {
    return null; // server giu' o rete: non e' il segnale di manutenzione
  }
}
