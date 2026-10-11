-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('DOENCA', 'MATERNIDADE', 'ACIDENTE', 'OUTROS');

-- CreateEnum
CREATE TYPE "EsocialEventType" AS ENUM ('S2210', 'S2220', 'S2221', 'S2230', 'S2240');

-- CreateEnum
CREATE TYPE "EsocialEventStatus" AS ENUM ('PENDING', 'SENT', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('CLINICA', 'ENGENHEIRO', 'TECNICO', 'CONSULTORIA', 'LABORATORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ProviderContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "cid" TEXT,
    "inssBenefit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fap_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "fapIndex" DOUBLE PRECISION NOT NULL,
    "ntepCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fap_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "responsibleId" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "ppps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esocial_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "eventType" "EsocialEventType" NOT NULL,
    "status" "EsocialEventStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "receiptNumber" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "esocial_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "slaDays" INTEGER,
    "status" "ProviderContractStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "provider_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "absences_tenantId_idx" ON "absences"("tenantId");

-- CreateIndex
CREATE INDEX "absences_employeeId_idx" ON "absences"("employeeId");

-- CreateIndex
CREATE INDEX "fap_records_tenantId_idx" ON "fap_records"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "fap_records_companyId_year_key" ON "fap_records"("companyId", "year");

-- CreateIndex
CREATE INDEX "ppps_tenantId_idx" ON "ppps"("tenantId");

-- CreateIndex
CREATE INDEX "ppps_employeeId_idx" ON "ppps"("employeeId");

-- CreateIndex
CREATE INDEX "esocial_events_tenantId_idx" ON "esocial_events"("tenantId");

-- CreateIndex
CREATE INDEX "esocial_events_companyId_idx" ON "esocial_events"("companyId");

-- CreateIndex
CREATE INDEX "esocial_events_status_idx" ON "esocial_events"("status");

-- CreateIndex
CREATE INDEX "providers_tenantId_idx" ON "providers"("tenantId");

-- CreateIndex
CREATE INDEX "provider_contracts_tenantId_idx" ON "provider_contracts"("tenantId");

-- CreateIndex
CREATE INDEX "provider_contracts_providerId_idx" ON "provider_contracts"("providerId");

-- AddForeignKey
ALTER TABLE "provider_contracts" ADD CONSTRAINT "provider_contracts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
