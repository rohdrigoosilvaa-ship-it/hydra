-- CreateEnum
CREATE TYPE "OccurrenceInvolvedPersonRole" AS ENUM ('VITIMA', 'TESTEMUNHA', 'ENVOLVIDO');

-- CreateEnum
CREATE TYPE "BehaviorObservationCategory" AS ENUM ('ATO_SEGURO', 'ATO_INSEGURO', 'CONDICAO_SEGURA', 'CONDICAO_INSEGURA');

-- AlterTable
ALTER TABLE "occurrences" ADD COLUMN     "immediateActions" TEXT;

-- CreateTable
CREATE TABLE "occurrence_involved_people" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "name" TEXT,
    "role" "OccurrenceInvolvedPersonRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrence_involved_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_observations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "observerId" TEXT,
    "observedEmployeeId" TEXT,
    "category" "BehaviorObservationCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "behavior_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "occurrence_involved_people_tenantId_idx" ON "occurrence_involved_people"("tenantId");

-- CreateIndex
CREATE INDEX "occurrence_involved_people_occurrenceId_idx" ON "occurrence_involved_people"("occurrenceId");

-- CreateIndex
CREATE INDEX "behavior_observations_tenantId_idx" ON "behavior_observations"("tenantId");

-- CreateIndex
CREATE INDEX "behavior_observations_companyId_idx" ON "behavior_observations"("companyId");

-- AddForeignKey
ALTER TABLE "occurrence_involved_people" ADD CONSTRAINT "occurrence_involved_people_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
