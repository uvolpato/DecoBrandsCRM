'use client';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { DataTable } from '@/componenti/DataTable';
import { Periodi } from '@/componenti/Flussi';
import { Conferma } from '@/componenti/Modale';
import { Pagina, Pannello } from '@/componenti/Pagina';
import { avviso, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, SagomaTabella, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { classeSegno, data, euro, pct } from '@/lib/formati';
import { useMemoria } from '@/lib/memoria';

// Liquidazioni (F4-A1, §7.8, D-18): i quattro trimestri, l'elenco dei subagenti che fa da filtro e i documenti
// del trimestre con lo stato deciso dal server. Numeri e nomi arrivano già calcolati (V12); un trimestre chiuso
// si legge dalla fotografia e non si modifica più (D-33, D-57). La scheda *Report subagenti* arriva con F4-A4.

interface Trimestre { trimestre: number; nome: string; da: string; a: string; chiave: string; etichetta: string; avanzamento: number | null; totale: number | null }
interface Subagente { id: string; nome: string; attivo: boolean; documenti: number; liquidabili: number; imponibile: number; provvigione: number; in_attesa: number; storni: number }
interface Documento {
  documento_id: string; numero: string; tipo: string; data: string; origine: string | null; pratica_id: string;
  cliente: string; codice_cliente: string; fornitore: string; subagente: string; subagente_id: string;
  imponibile: number; pct: number; provvigione: number;
  liquidabile: boolean; incasso: boolean; voce: 'storno' | 'riaccredito' | null; motivo_testo: string | null;
  stato: { etichetta: string; variante: Variante };
}
interface Risposta {
  anno: number; trimestre: number;
  stato: { chiave: string; etichetta: string; avanzamento: number | null };
  trimestri: Trimestre[]; subagenti: Subagente[]; senza_documenti: number;
  riepilogo: { documenti: number; liquidabili: number; imponibile: number; provvigione: number; in_attesa: number; bloccanti: number; storni: number } | null;
  chiusura: { possibile: boolean; motivo: string | null };
  chiusa_il: string | null; chiusa_da: string | null;
  documenti: Documento[];
}

export function VistaLiquidazioni({ anno, trimestre }: { anno: number; trimestre: number }) {
  const puo = usePuo();
  const [subSel, setSubSel] = useMemoria<string | null>('subagente', null);
  const [dati, setDati] = useState<Risposta | null>(null);
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(true);
  const [chiedi, setChiedi] = useState(false);
  const sagome = useSagome(caricando && !dati);

  useEffect(() => {
    let vivo = true;
    setCaricando(true);
    void api<Risposta>(`liquidazioni?anno=${anno}&trimestre=${trimestre}`).then((r) => {
      if (!vivo) return;
      setCaricando(false);
      if (r.ok) { setDati(r.dati); setErrore(''); } else { setErrore(r.messaggio); avviso(r.messaggio, true); }
    });
    return () => { vivo = false; };
  }, [anno, trimestre]);

  // cambio trimestre dall'indirizzo: finché i dati nuovi non arrivano non si mostrano quelli di prima
  const b = dati && dati.anno === anno && dati.trimestre === trimestre ? dati : null;
  if (!b) {
    return (
      <Pagina titolo="Liquidazioni" pieno sottotitolo="Provvigioni ai subagenti per trimestre: gennaio–marzo, aprile–giugno, luglio–settembre, ottobre–dicembre.">
        {errore ? <Pannello><div className="vuoto"><b>Liquidazione non caricata</b>{errore}</div></Pannello>
          : sagome ? <>
            <Sagoma larghezza="100%" altezza={78} arrotondato={10} />
            <div className="colonne riempi" style={{ '--colonne': 'minmax(300px, 0.8fr) minmax(0, 2.2fr)' } as CSSProperties}>
              <Pannello riempi senzaMargine><SagomaTabella righe={8} colonne={2} /></Pannello>
              <Pannello riempi senzaMargine><SagomaTabella righe={8} colonne={4} /></Pannello>
            </div>
          </> : null}
      </Pagina>
    );
  }

  const q = b.trimestri[trimestre - 1];
  const chiusa = b.stato.chiave === 'chiusa';
  const scelto = b.subagenti.find((s) => s.id === subSel) ?? null;
  const visibili = scelto ? b.documenti.filter((d) => d.subagente_id === scelto.id) : b.documenti;
  const inAttesa = b.riepilogo?.bloccanti ?? 0;
  const puoChiudere = puo('provvigioni.chiudi');
  const analisi = '/analisi?dal=' + q.da.slice(0, 7) + '&al=' + q.a.slice(0, 7) + (scelto ? '&subagenti=' + scelto.id : '');

  const chiudi = async () => {
    setChiedi(false);
    const r = await api<Risposta>(`liquidazioni/${anno}/${trimestre}/chiudi`, {});
    if (r.ok) { setDati(r.dati); avviso(`Liquidazione del ${trimestre}° trimestre chiusa`); }
    else avviso(r.messaggio, true);
  };

  return (
    <Pagina titolo="Liquidazioni" pieno sottotitolo="Provvigioni ai subagenti per trimestre: gennaio–marzo, aprile–giugno, luglio–settembre, ottobre–dicembre."
      azioni={[{
        etichetta: chiusa ? 'Liquidazione chiusa' : 'Chiudi il trimestre', icona: 'spunta',
        disabilitato: !b.chiusura.possibile || !puoChiudere,
        titolo: !puoChiudere ? 'Serve il livello responsabile nell’area Provvigioni' : (b.chiusura.motivo ?? ''),
        onClick: () => setChiedi(true),
      }]}>
      <Periodi etichetta={'Trimestri ' + anno} voci={b.trimestri.map((x) => ({
        href: `/liquidazioni/${anno}/${x.trimestre}`, titolo: `${x.trimestre}° trimestre`, sotto: x.nome,
        stato: x.etichetta, attivo: x.trimestre === trimestre, futuro: x.chiave === 'futura', avanzamento: x.avanzamento ?? undefined,
      }))} />

      {chiusa && <p className="nota">Liquidazione chiusa il {data(b.chiusa_il)} da {b.chiusa_da}: gli importi sono fissati.</p>}

      {b.stato.chiave === 'futura'
        ? <Pannello><div className="vuoto"><b>Trimestre non ancora iniziato</b>Le provvigioni compariranno qui con le prime fatture di {q.nome.split('–')[0]}.</div></Pannello>
        : <div className="colonne riempi" style={{ '--colonne': 'minmax(300px, 0.8fr) minmax(0, 2.2fr)' } as CSSProperties}>
          <Pannello titolo="Subagenti" riempi senzaMargine
            nota={`${b.subagenti.length} con documenti${b.senza_documenti ? ` · ${b.senza_documenti} senza` : ''}`}>
            <DataTable compatta righe={b.subagenti} chiave={(s) => s.id}
              ordinamentoIniziale={{ key: 'provvigione', dir: 'desc' }}
              rowClass={(s) => (s.id === subSel ? 'selezionata' : '')}
              onRowClick={(s) => setSubSel(s.id === subSel ? null : s.id)}
              colonne={[
                {
                  key: 'nome', header: 'Subagente',
                  cell: (s) => <><b>{s.nome}</b><span className="sec-riga">{s.documenti} {s.documenti === 1 ? 'documento' : 'documenti'}{s.attivo ? '' : ' · non attivo'}</span></>,
                },
                {
                  key: 'provvigione', header: chiusa ? 'Liquidato' : 'Da liquidare', tipo: 'euro', totale: 'somma',
                  cell: (s) => <>
                    <b className={classeSegno(Math.min(0, s.provvigione))}>{euro(s.provvigione)}</b>
                    {!!s.in_attesa && <span className="sec-riga testo-attesa">{euro(s.in_attesa)} in attesa</span>}
                    {!!s.storni && <span className="sec-riga negativo">{s.storni} {s.storni === 1 ? 'storno' : 'storni'}</span>}
                  </>,
                },
              ]}
              etichettaTotale="Totale" piede="Clic su un subagente per vedere i suoi documenti, di nuovo per tutti."
              emptyText="Nessun subagente" emptyHint="Nessun documento nel trimestre." />
          </Pannello>

          <div className="riempi" style={{ display: 'flex', flexDirection: 'column', minHeight: 'max(24rem, 60vh)' }}>
            <Pannello titolo={scelto ? scelto.nome : 'Tutti i subagenti'} riempi
            nota={<>
              {chiusa ? 'Totale liquidato' : 'Totale da liquidare'} <b>{euro(b.riepilogo?.provvigione ?? 0)}</b>
              {inAttesa ? <> · {inAttesa} {inAttesa === 1 ? 'documento' : 'documenti'} in attesa · <Link href="/bollettini">vai ai bollettini</Link></> : null}
            </>}
            azioni={[{ etichetta: 'Analisi completa', icona: 'analisi', href: analisi }]}>
            <Schede riempi memoria="liquidazioni" schede={[{
              id: 'documenti', etichetta: 'Documenti', conta: visibili.length, contaVariante: inAttesa ? 'attesa' : 'neutro',
              contenuto: () => (
                <div className="riempi">
                  <DataTable righe={visibili} chiave={(d) => d.documento_id + '|' + (d.voce ?? '')} filtro={subSel ?? 'tutti'}
                    ordinamentoIniziale={{ key: 'stato', dir: 'asc' }}
                    colonne={[
                      {
                        key: 'numero', header: 'Documento',
                        cell: (d) => <>
                          <Link href={'/pratiche/' + d.pratica_id}>{d.numero}</Link>
                          {d.voce && <Stato v={d.voce === 'storno' ? 'errore' : 'info'}>{d.voce === 'storno' ? 'Storno' : 'Riaccredito'}</Stato>}
                          <span className="sec-riga">{d.fornitore} · {d.origine ? 'fattura del ' + data(d.origine) : data(d.data)}</span>
                        </>,
                      },
                      {
                        key: 'cliente', header: 'Cliente · subagente', grow: true,
                        cell: (d) => <>{d.cliente}<span className="sec-riga">{d.subagente} · codice {d.codice_cliente}</span></>,
                      },
                      {
                        key: 'provvigione', header: 'Provvigione', tipo: 'euro', totale: 'somma',
                        cell: (d) => <><b className={classeSegno(Math.min(0, d.provvigione))}>{euro(d.provvigione)}</b><span className="sec-riga">{pct(d.pct)} di {euro(d.imponibile)}</span></>,
                      },
                      {
                        key: 'stato', header: 'Stato', sortValue: (d) => (d.liquidabile ? 1 : 0), classe: () => 'avvolgi',
                        cell: (d) => <><Stato v={d.stato.variante}>{d.stato.etichetta}</Stato>{d.motivo_testo && <span className="sec-riga">{d.motivo_testo}</span>}</>,
                      },
                    ]}
                    etichettaTotale="Totale in elenco, compresi i documenti in attesa"
                    piede="Fatturato (es. Gasper, Ing’s): entrano le fatture del trimestre; se il cliente non paga, lo storno è una voce negativa nella liquidazione successiva. Maturato (es. Gries): la fattura entra nel trimestre del bollettino che la riconosce, cioè quando il cliente paga."
                    emptyText="Nessun documento" emptyHint="Nessuna fattura o nota di credito con data in questo trimestre." />
                </div>
              ),
            }]} />
            </Pannello>
          </div>
        </div>}

      {chiedi && <Conferma titolo={`Chiudere la liquidazione del ${trimestre}° trimestre?`}
        testo={`Gli importi vengono fissati: ${euro(b.riepilogo?.provvigione ?? 0)} a ${b.subagenti.filter((s) => s.liquidabili > 0).length} subagenti.`}
        etichetta="Chiudi il trimestre" onRisposta={(si) => (si ? void chiudi() : setChiedi(false))} />}
    </Pagina>
  );
}
