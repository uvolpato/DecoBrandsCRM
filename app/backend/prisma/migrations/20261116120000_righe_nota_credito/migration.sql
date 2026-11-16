-- Righe della nota di credito (D-197 §19): la nota salva le sue righe come la fattura, nella stessa
-- tabella `ordini_fornitore_righe`, con `fase = 'nota_credito'` e `documento_id` = la nota. Il CHECK
-- della fase si allarga per accettare il valore nuovo. Additiva: nessuna colonna, nessun dato toccato.
ALTER TABLE "ordini_fornitore_righe" DROP CONSTRAINT "ordini_fornitore_righe_fase_check";
ALTER TABLE "ordini_fornitore_righe" ADD CONSTRAINT "ordini_fornitore_righe_fase_check"
  CHECK ("fase" IN ('ordine', 'conferma', 'fattura', 'nota_credito'));
