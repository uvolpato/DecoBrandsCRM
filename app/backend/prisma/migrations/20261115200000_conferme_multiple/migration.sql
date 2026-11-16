-- D-174 §19: una pratica può avere più conferme/proforme. La prima porta ad «attesa fattura» come
-- oggi; le successive si agganciano alla stessa pratica e all'abbinamento l'operatore sceglie
-- «parziale» (si somma) o «sostituisce» (revisione: quella vecchia resta in archivio come superata,
-- non conta). Il ruolo sta sul documento nuovo, superato_da sul documento sostituito (punta a chi lo
-- sostituisce; più sostituiti possono puntare allo stesso sostituto). Nessuna FK: se il sostituto si
-- cancella, il superato resta in archivio e non conta più (edge case raro, non gestito in D-174).

ALTER TABLE "ordini_fornitore_documenti" ADD COLUMN "ruolo" VARCHAR(15);
ALTER TABLE "ordini_fornitore_documenti" ADD COLUMN "superato_da" BIGINT;
