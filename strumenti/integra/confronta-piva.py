"""Confronta le P.IVA dei clienti estratti dal vecchio CRM con le anagrafiche di Integra.

Tre esiti per ogni cliente:
  - P.IVA nella vista del CRM (`integra_v_clienti`): il cliente entra da solo nel nuovo CRM;
  - P.IVA solo nell'anagrafica di Integra (`integra.clienti`, senza riga agente): esiste, ma la
    vista del CRM non la vede — va assegnato un agente o corretta la vista;
  - P.IVA assente da Integra: va creato o corretta la P.IVA.

Uso:
    python confronta-piva.py --clienti dati-crm-legacy/clienti.jsonl \\
        --integra "postgresql://utente:password@localhost:5432/decobrands_db" \\
        [--schema-vista public] [--schema-integra integra]

    # oppure da un'esportazione CSV della vista (colonna piva)
    python confronta-piva.py --clienti dati-crm-legacy/clienti.jsonl --integra-csv piva_integra.csv

Produce nella cartella dei clienti:
    confronto_integra.json      riepilogo
    piva_non_in_integra.csv     clienti da creare o con P.IVA da correggere
    piva_solo_integra.csv       presenti in Integra ma invisibili alla vista del CRM
    piva_doppie.csv             P.IVA presenti su più clienti estratti (da unire)
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path


def piva(valore):
    """Stessa normalizzazione del CRM (integra.ts): maiuscolo, senza spazi e punti, IT via se restano 11 cifre."""
    s = re.sub(r"[\s.]", "", str(valore or "")).upper()
    return s[2:] if re.fullmatch(r"IT\d{11}", s) else s


def piva_valida(s):
    return bool(re.fullmatch(r"\d{11}", s) or re.fullmatch(r"[A-Z]{2}.{2,}", s))


def leggi_clienti(percorso):
    clienti = []
    with open(percorso, encoding="utf-8") as fh:
        for riga in fh:
            if not riga.strip():
                continue
            c = json.loads(riga)
            amm = c.get("dati_amministrativi") or {}
            grezza = amm.get("PARTITA IVA") or (c.get("elenco") or {}).get("VatNumber")
            clienti.append({
                "id": c["id"],
                "ragione_sociale": c.get("ragione_sociale"),
                "piva_grezza": grezza,
                "piva": piva(grezza),
                "citta": amm.get("Città") or amm.get("comune") or (c.get("elenco") or {}).get("City"),
                "scheda_errore": bool(c.get("scheda_errore")),
            })
    return clienti


def ident(schema):
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema):
        sys.exit(f"schema non valido: {schema}")
    return schema


def leggi_integra_pg(url, schema_vista, schema_integra):
    import psycopg
    v, i = ident(schema_vista), ident(schema_integra)
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute(f"SELECT piva, codice, ragione_sociale, attivo FROM {v}.integra_v_clienti")
        vista = [{"piva": piva(r[0]), "codice": r[1], "ragione_sociale": r[2], "attivo": r[3]}
                 for r in cur.fetchall()]
        cur.execute(f"SELECT cli_cdcli, cli_piva, cli_rgsoc, cli_obsoleto FROM {i}.clienti")
        anagrafica = [{"piva": piva(r[1]), "codice": r[0], "ragione_sociale": r[2],
                       "attivo": r[3] == 0} for r in cur.fetchall()]
    return vista, anagrafica


def leggi_integra_csv(percorso):
    with open(percorso, encoding="utf-8-sig", newline="") as fh:
        vista = [{"piva": piva(r.get("piva") or r.get("PIVA") or r.get("P.IVA")),
                  "codice": r.get("codice"), "ragione_sociale": r.get("ragione_sociale"),
                  "attivo": None} for r in csv.DictReader(fh)]
    return vista, vista


def scrivi(path, righe, campi):
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=campi, extrasaction="ignore")
        w.writeheader()
        w.writerows(righe)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clienti", required=True)
    ap.add_argument("--integra")
    ap.add_argument("--integra-csv")
    ap.add_argument("--schema-vista", default="public")
    ap.add_argument("--schema-integra", default="integra")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    if bool(a.integra) == bool(a.integra_csv):
        sys.exit("Serve --integra (connessione) oppure --integra-csv (esportazione), uno dei due")

    clienti = leggi_clienti(a.clienti)
    vista, anagrafica = (leggi_integra_pg(a.integra, a.schema_vista, a.schema_integra)
                         if a.integra else leggi_integra_csv(a.integra_csv))
    in_vista = {r["piva"] for r in vista if r["piva"] and piva_valida(r["piva"])}
    in_integra = {r["piva"] for r in anagrafica if r["piva"] and piva_valida(r["piva"])}
    out = Path(a.out) if a.out else Path(a.clienti).parent

    senza_piva, non_valide, nella_vista, solo_integra, assenti = [], [], [], [], []
    for c in clienti:
        if not c["piva"]:
            senza_piva.append(c)
        elif not piva_valida(c["piva"]):
            non_valide.append(c)
        elif c["piva"] in in_vista:
            nella_vista.append(c)
        elif c["piva"] in in_integra:
            solo_integra.append(c)
        else:
            assenti.append(c)

    doppie = {p: n for p, n in Counter(c["piva"] for c in clienti if c["piva"]).items() if n > 1}
    campi = ["id", "ragione_sociale", "piva", "piva_grezza", "citta"]
    scrivi(out / "piva_non_in_integra.csv", assenti, campi)
    scrivi(out / "piva_solo_integra.csv", solo_integra, campi)
    scrivi(out / "piva_doppie.csv", (c for c in clienti if c["piva"] in doppie), campi)

    riepilogo = {
        "clienti_estratti": len(clienti),
        "schede_non_leggibili_nel_vecchio_crm": sum(1 for c in clienti if c["scheda_errore"]),
        "clienti_con_piva_valida": len(nella_vista) + len(solo_integra) + len(assenti),
        "piva_nella_vista_crm": len(nella_vista),
        "piva_solo_anagrafica_integra": len(solo_integra),
        "piva_assenti_in_integra": len(assenti),
        "clienti_senza_piva": len(senza_piva),
        "piva_non_valide": len(non_valide),
        "piva_doppie_tra_i_clienti": len(doppie),
        "righe_vista_crm": len(vista),
        "piva_distinte_vista_crm": len(in_vista),
        "righe_anagrafica_integra": len(anagrafica),
        "piva_distinte_anagrafica_integra": len(in_integra),
    }
    (out / "confronto_integra.json").write_text(
        json.dumps(riepilogo, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(riepilogo, ensure_ascii=False, indent=2))
    print(f"\nFile in {out}")


if __name__ == "__main__":
    main()
