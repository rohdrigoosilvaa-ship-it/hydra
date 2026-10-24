-- AlterTable
ALTER TABLE "position_risks"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "damagePotential" TEXT,
  ADD COLUMN "observations" TEXT,
  ADD COLUMN "sourceCircumstances" TEXT,
  ADD COLUMN "adminMeasures" TEXT,
  ADD COLUMN "measurementType" "EvaluationCriteria" NOT NULL DEFAULT 'QUALITATIVO',
  ADD COLUMN "generatesUnhealthiness" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "generatesHazardPay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specialRetirement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "insertInAso" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "epcStatus" TEXT NOT NULL DEFAULT 'NAO_SE_APLICA',
  ADD COLUMN "epiStatus" TEXT NOT NULL DEFAULT 'NAO_SE_APLICA',
  ADD COLUMN "probability" INTEGER,
  ADD COLUMN "severity" INTEGER,
  ADD COLUMN "certainty" INTEGER;

-- CreateTable
CREATE TABLE "position_risk_protections" (
    "positionId" TEXT NOT NULL,
    "hazardId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    CONSTRAINT "position_risk_protections_pkey" PRIMARY KEY ("positionId","hazardId","equipmentId")
);
CREATE INDEX "position_risk_protections_equipmentId_idx" ON "position_risk_protections"("equipmentId");
ALTER TABLE "position_risk_protections" ADD CONSTRAINT "position_risk_protections_positionId_hazardId_fkey" FOREIGN KEY ("positionId","hazardId") REFERENCES "position_risks"("positionId","hazardId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "position_risk_protections" ADD CONSTRAINT "position_risk_protections_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "protection_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Vínculos já existentes passam a ter a cópia dos dados do risco.
UPDATE "position_risks" pr SET
  "description" = h."description", "damagePotential" = h."damagePotential", "observations" = h."observations",
  "sourceCircumstances" = h."sourceCircumstances", "adminMeasures" = h."adminMeasures",
  "measurementType" = h."measurementType", "generatesUnhealthiness" = h."generatesUnhealthiness",
  "generatesHazardPay" = h."generatesHazardPay", "specialRetirement" = h."specialRetirement",
  "insertInAso" = h."insertInAso", "epcStatus" = h."epcStatus", "epiStatus" = h."epiStatus"
FROM "hazards" h WHERE h."id" = pr."hazardId";

INSERT INTO "position_risk_protections" ("positionId","hazardId","equipmentId")
SELECT pr."positionId", pr."hazardId", hp."equipmentId"
FROM "position_risks" pr JOIN "hazard_protections" hp ON hp."hazardId" = pr."hazardId"
ON CONFLICT DO NOTHING;
