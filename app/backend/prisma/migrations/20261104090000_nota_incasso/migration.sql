-- D-62 §19: la nota della segnalazione d'incasso ha una colonna sua (§5.14).
-- `note` resta la nota del documento, quella che si modifica dal form della pratica: prima la
-- segnalazione la sovrascriveva. Nessun dato da spostare: l'endpoint non aveva ancora una pagina e
-- non si può distinguere una vecchia nota d'incasso da una nota del documento. Colonna nulla, senza
-- default (nessuna riscrittura della tabella), solo aggiunta.
ALTER TABLE "ordini_fornitore_documenti" ADD COLUMN "nota_incasso" TEXT;
