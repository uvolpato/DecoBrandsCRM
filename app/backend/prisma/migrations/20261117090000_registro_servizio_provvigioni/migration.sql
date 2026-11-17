-- Registro servizio (D-31 §19): il CHECK `registro_servizio_check` elencava i servizi dell'epoca
-- (casella, lettura, integra, posta, accesso, app) ma non `provvigioni`. Le anomalie di provvigione
-- (D-182 §19, D-199 §19, D-200 §19: provvigione.sconto_medio e provvigione.gruppo_scaglione) usano
-- servizio 'provvigioni': `apriAnomalia` falliva con violazione del vincolo (P2010/23514), quindi
-- nessuna anomalia di provvigione poteva essere aperta. Si riallarga con i valori di oggi + provvigioni.

ALTER TABLE "registro" DROP CONSTRAINT "registro_servizio_check";
ALTER TABLE "registro" ADD CONSTRAINT "registro_servizio_check"
  CHECK ("servizio" IS NULL OR "servizio" IN ('casella', 'lettura', 'integra', 'posta', 'accesso', 'app', 'provvigioni'));
