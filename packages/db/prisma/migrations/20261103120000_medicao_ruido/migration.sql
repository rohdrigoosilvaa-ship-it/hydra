-- Medição de ruído nos riscos do cargo e do PGR
ALTER TABLE "position_risks"
  ADD COLUMN "measurementCompany" TEXT,
  ADD COLUMN "measurementTechnique" TEXT,
  ADD COLUMN "measurementEquipment" TEXT,
  ADD COLUMN "measurementDate" DATE,
  ADD COLUMN "measurementValue" DECIMAL(8,2),
  ADD COLUMN "measurementActionLevel" DECIMAL(8,2),
  ADD COLUMN "measurementLimit" DECIMAL(8,2);

ALTER TABLE "pgr_risks"
  ADD COLUMN "measurementCompany" TEXT,
  ADD COLUMN "measurementTechnique" TEXT,
  ADD COLUMN "measurementEquipment" TEXT,
  ADD COLUMN "measurementDate" DATE,
  ADD COLUMN "measurementValue" DECIMAL(8,2),
  ADD COLUMN "measurementActionLevel" DECIMAL(8,2),
  ADD COLUMN "measurementLimit" DECIMAL(8,2);
