-- AlterTable
ALTER TABLE "hazards"
  ADD COLUMN "sourceCircumstances" TEXT,
  ADD COLUMN "observations" TEXT,
  ADD COLUMN "adminMeasures" TEXT,
  ADD COLUMN "exposureType" "ExposureType",
  ADD COLUMN "sendEsocial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "measurementType" "EvaluationCriteria" NOT NULL DEFAULT 'QUALITATIVO',
  ADD COLUMN "generatesUnhealthiness" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "generatesHazardPay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specialRetirement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "insertInAso" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "epcStatus" TEXT NOT NULL DEFAULT 'NAO_SE_APLICA',
  ADD COLUMN "epiStatus" TEXT NOT NULL DEFAULT 'NAO_SE_APLICA';

-- CreateTable
CREATE TABLE "position_risks" (
    "positionId" TEXT NOT NULL,
    "hazardId" TEXT NOT NULL,
    "exposureType" "ExposureType",
    "sendEsocial" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "position_risks_pkey" PRIMARY KEY ("positionId","hazardId")
);

-- CreateTable
CREATE TABLE "position_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "position_exams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "position_risks_hazardId_idx" ON "position_risks"("hazardId");
CREATE INDEX "position_exams_tenantId_idx" ON "position_exams"("tenantId");
CREATE INDEX "position_exams_positionId_idx" ON "position_exams"("positionId");

ALTER TABLE "position_risks" ADD CONSTRAINT "position_risks_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "position_risks" ADD CONSTRAINT "position_risks_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "hazards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "position_exams" ADD CONSTRAINT "position_exams_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
