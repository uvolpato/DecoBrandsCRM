-- Schema completo (fase 2a, spec §4.2): i valori ammessi che mancavano, scritti come CHECK.
-- Prisma non li vede: non toglierli. Le prove stanno in test/vincoli.spec.ts.

-- Documenti fiscali (§4.2.7.1): importo positivo per la fattura, negativo per la nota di credito
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_importo_check"
  CHECK (("tipo" = 'fattura' AND "importo" >= 0) OR ("tipo" = 'nota_credito' AND "importo" <= 0));
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_fonte_incasso_check"
  CHECK ("fonte_incasso" IS NULL OR "fonte_incasso" IN ('bollettino', 'fornitore', 'manuale'));
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_solleciti_check" CHECK ("solleciti" >= 0);

-- Correzioni (§4.2.7.2): % fra 0 e 100, 0 per "nessuna"
ALTER TABLE "provvigioni_correzioni" ADD CONSTRAINT "provvigioni_correzioni_valore_check"
  CHECK (("tipo" = 'pct' AND "valore" BETWEEN 0 AND 100) OR ("tipo" = 'nessuna' AND "valore" = 0) OR "tipo" = 'importo');

-- Bollettino chiuso (§4.2.9): data e chi l'ha chiuso vanno insieme (la data c'era già)
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_chiuso_da_check" CHECK (("stato" = 'da_verificare') = ("chiuso_da" IS NULL));

-- Ingresso documenti (§4.2.12–§4.2.13)
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_origine_check" CHECK ("origine" IN ('email', 'caricamento'));
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_stato_check"
  CHECK ("stato" IN ('in_coda', 'in_lettura', 'da_controllare', 'abbinato', 'scartato', 'errore'));
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_tipo_check"
  CHECK ("tipo" IS NULL OR "tipo" IN ('ordine', 'conferma', 'fattura', 'nota_credito', 'bollettino'));
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_livello_check"
  CHECK ("livello" IS NULL OR "livello" IN ('affidabile', 'da_controllare', 'bassa'));
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_tentativi_check" CHECK ("tentativi" >= 0);
ALTER TABLE "documenti_campi" ADD CONSTRAINT "documenti_campi_affidabilita_check" CHECK ("affidabilita" IS NULL OR "affidabilita" BETWEEN 0 AND 1);
ALTER TABLE "documenti_campi" ADD CONSTRAINT "documenti_campi_precisione_check"
  CHECK ("precisione" IS NULL OR "precisione" IN ('esatta', 'approssimata', 'assente'));

-- Registro (§4.2.11): livello, esito, stato dell'anomalia; solo le anomalie hanno uno stato
ALTER TABLE "registro" ADD CONSTRAINT "registro_livello_check" CHECK ("livello" IN ('info', 'attenzione', 'errore', 'critico'));
ALTER TABLE "registro" ADD CONSTRAINT "registro_esito_check" CHECK ("esito" IS NULL OR "esito" IN ('successo', 'errore', 'negato'));
ALTER TABLE "registro" ADD CONSTRAINT "registro_stato_check" CHECK (("genere" = 'anomalia' AND "stato" IS NOT NULL AND "stato" IN ('aperta', 'chiusa')) OR ("genere" = 'evento' AND "stato" IS NULL));
ALTER TABLE "registro" ADD CONSTRAINT "registro_servizio_check"
  CHECK ("servizio" IS NULL OR "servizio" IN ('casella', 'lettura', 'integra', 'posta', 'accesso', 'app'));

-- Impostazioni e giri dei servizi (§4.2.14, §4.2.15)
ALTER TABLE "impostazioni" ADD CONSTRAINT "impostazioni_chiave_check"
  CHECK ("chiave" IN ('azienda', 'casella', 'lettura', 'posta', 'accesso', 'integra', 'conservazione'));
ALTER TABLE "servizi_esecuzioni" ADD CONSTRAINT "servizi_esecuzioni_servizio_check" CHECK ("servizio" IN ('casella', 'lettura', 'integra', 'posta'));
ALTER TABLE "servizi_esecuzioni" ADD CONSTRAINT "servizi_esecuzioni_tipo_check" CHECK ("tipo" IN ('lavoro', 'controllo'));
ALTER TABLE "servizi_esecuzioni" ADD CONSTRAINT "servizi_esecuzioni_esito_check" CHECK ("esito" IS NULL OR "esito" IN ('ok', 'attenzione', 'errore'));
