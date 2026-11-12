-- Il PDF di un bollettino resta il PDF di quel bollettino (D-54, D-74): non si scarta, altrimenti la
-- pulizia degli scartati ne cancellerebbe il file dopo i giorni di conservazione; e non si abbina anche
-- a una pratica, altrimenti lo stesso file sarebbe bollettino e fattura. Il vincolo sta nel database
-- perche' le due rotte da sole non bastano (A3-02).
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_scarto_libero_check" CHECK (
    "stato" <> 'scartato' OR ("abbinato_bollettino_id" IS NULL AND "abbinato_pratica_id" IS NULL));

ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_un_abbinamento_check" CHECK (
    "abbinato_bollettino_id" IS NULL OR "abbinato_pratica_id" IS NULL);
