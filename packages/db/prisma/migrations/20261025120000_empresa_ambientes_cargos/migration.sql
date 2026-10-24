-- CreateEnum
CREATE TYPE "EnvironmentUnitType" AS ENUM ('MATRIZ', 'FILIAL');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "contracted_lives" INTEGER;

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "color" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "esocialStartDate" TIMESTAMP(3),
ADD COLUMN     "requiresEntryAptitude" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sectorInfo" TEXT,
ADD COLUMN     "workSchedule" TEXT,
ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "technicalOpinion" TEXT;

-- CreateTable
CREATE TABLE "work_environments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "description" TEXT,
    "location" TEXT,
    "unitType" "EnvironmentUnitType" NOT NULL DEFAULT 'MATRIZ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "work_environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_environments" (
    "positionId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "position_environments_pkey" PRIMARY KEY ("positionId","environmentId")
);

-- CreateIndex
CREATE INDEX "work_environments_tenantId_idx" ON "work_environments"("tenantId");

-- CreateIndex
CREATE INDEX "work_environments_companyId_idx" ON "work_environments"("companyId");

-- CreateIndex
CREATE INDEX "position_environments_environmentId_idx" ON "position_environments"("environmentId");

-- AddForeignKey
ALTER TABLE "work_environments" ADD CONSTRAINT "work_environments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_environments" ADD CONSTRAINT "position_environments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_environments" ADD CONSTRAINT "position_environments_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "work_environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
