-- Exames por risco, periodicidade nos exames do cargo e exames complementares do colaborador
ALTER TABLE "position_exams"
  ADD COLUMN "periodicityMonths" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "hazardId" TEXT;

CREATE TABLE "hazard_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hazardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodicityMonths" INTEGER NOT NULL DEFAULT 12,
    CONSTRAINT "hazard_exams_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hazard_exams_hazardId_idx" ON "hazard_exams"("hazardId");
ALTER TABLE "hazard_exams" ADD CONSTRAINT "hazard_exams_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "hazards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "medical_exam_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "performedAt" DATE,
    "nextDueAt" DATE,
    CONSTRAINT "medical_exam_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "medical_exam_items_examId_idx" ON "medical_exam_items"("examId");
CREATE INDEX "medical_exam_items_tenantId_idx" ON "medical_exam_items"("tenantId");
ALTER TABLE "medical_exam_items" ADD CONSTRAINT "medical_exam_items_examId_fkey" FOREIGN KEY ("examId") REFERENCES "medical_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
