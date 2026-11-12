-- La decisione su un documento mancante (bollettini_attese, D-56) e' il testo della contestazione di un
-- bollettino chiuso: cancellare il documento non deve portarla via in cascata, altrimenti il bollettino non
-- si ricostruisce piu' (A3-03). Le rotte annulla e sposta la bloccano gia'; la FK lo impedisce a chiunque.
ALTER TABLE "bollettini_attese" DROP CONSTRAINT "bollettini_attese_documento_id_fkey";

ALTER TABLE "bollettini_attese" ADD CONSTRAINT "bollettini_attese_documento_id_fkey"
    FOREIGN KEY ("documento_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
