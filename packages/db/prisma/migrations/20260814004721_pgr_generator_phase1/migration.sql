/*
  Warnings:

  - You are about to drop the column `departmentId` on the `ghe` table. All the data in the column will be lost.
  - You are about to drop the column `positionId` on the `ghe` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `ghe` table. All the data in the column will be lost.
  - You are about to drop the column `controlMeasures` on the `pgr_risks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ExposureType" AS ENUM ('EVENTUAL', 'INTERMITENTE', 'PERMANENTE');

-- CreateEnum
CREATE TYPE "EvaluationCriteria" AS ENUM ('QUALITATIVO', 'QUANTITATIVO');

-- AlterTable
ALTER TABLE "ghe" DROP COLUMN "departmentId",
DROP COLUMN "positionId",
DROP COLUMN "unitId",
ADD COLUMN     "activityDescription" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "localDescription" TEXT;

-- AlterTable
ALTER TABLE "hazards" ADD COLUMN     "esocialCode" TEXT;

-- AlterTable
ALTER TABLE "pgr_risks" DROP COLUMN "controlMeasures",
ADD COLUMN     "adminControls" TEXT,
ADD COLUMN     "classification" TEXT,
ADD COLUMN     "conclusion" TEXT,
ADD COLUMN     "engineeringControls" TEXT,
ADD COLUMN     "epcMeasures" TEXT,
ADD COLUMN     "epiMeasures" TEXT,
ADD COLUMN     "evaluationCriteria" "EvaluationCriteria",
ADD COLUMN     "exposureProfile" TEXT,
ADD COLUMN     "exposureType" "ExposureType",
ADD COLUMN     "propagationMeans" TEXT,
ADD COLUMN     "sourceCircumstances" TEXT,
ADD COLUMN     "typicalInjuries" TEXT;

-- AlterTable
ALTER TABLE "pgrs" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "companyResponsibleName" TEXT,
ADD COLUMN     "companyResponsibleRole" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "preparedBy" TEXT,
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "technicalResponsibleCouncil" TEXT,
ADD COLUMN     "technicalResponsibleName" TEXT,
ADD COLUMN     "technicalResponsibleRegistry" TEXT,
ADD COLUMN     "technicalResponsibleSpecialty" TEXT,
ADD COLUMN     "technicalResponsibleUf" TEXT;

-- CreateTable
CREATE TABLE "ghe_functions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gheId" TEXT NOT NULL,
    "departmentId" TEXT,
    "positionId" TEXT,
    "activityDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ghe_functions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ghe_functions_tenantId_idx" ON "ghe_functions"("tenantId");

-- CreateIndex
CREATE INDEX "ghe_functions_gheId_idx" ON "ghe_functions"("gheId");

-- AddForeignKey
ALTER TABLE "ghe_functions" ADD CONSTRAINT "ghe_functions_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "ghe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ghe_functions" ADD CONSTRAINT "ghe_functions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ghe_functions" ADD CONSTRAINT "ghe_functions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
