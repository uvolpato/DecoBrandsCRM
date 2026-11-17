-- Quota pagata sulla riga del bollettino (D-201 §19): alcuni fornitori (Arte) riconoscono la provvigione
-- sul pagato (Prov. € = Betrag × % bezahlt × Prov. %). null = 100 %: per i bollettini che non portano la
-- colonna il comportamento resta quello di oggi. Additiva: nessun dato toccato, predefinito invariato.

ALTER TABLE "bollettini_righe" ADD COLUMN "quota_pagata" DECIMAL(7,4);

ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_quota_pagata_check"
  CHECK ("quota_pagata" IS NULL OR ("quota_pagata" >= 0 AND "quota_pagata" <= 100));
