-- D-140: il PDF di un bollettino, legato al bollettino del suo fornitore e mese (D-56), ha stato `abbinato`.
-- Prima si scriveva solo `abbinato_bollettino_id` e lo stato restava quello di prima: il file tornava
-- nelle liste come documento da lavorare. Nessun CHECK nuovo: gli stati ammessi non cambiano.
UPDATE "documenti_in_arrivo"
SET "stato" = 'abbinato'
WHERE "abbinato_bollettino_id" IS NOT NULL
  AND "stato" IN ('in_coda', 'da_controllare', 'errore');
