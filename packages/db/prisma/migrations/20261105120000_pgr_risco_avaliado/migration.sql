-- Riscos que nunca foram avaliados não podem aparecer como "aceitáveis".
ALTER TABLE "pgr_risks" ADD COLUMN "evaluated" BOOLEAN NOT NULL DEFAULT true;
UPDATE "pgr_risks" SET "evaluated" = false WHERE "classification" = 'Não avaliado';
