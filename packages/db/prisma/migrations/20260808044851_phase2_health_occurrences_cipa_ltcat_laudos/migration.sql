/*
  Warnings:

  - The `status` column on the `pgrs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL', 'RETORNO_TRABALHO', 'MUDANCA_RISCO');

-- CreateEnum
CREATE TYPE "ExamResult" AS ENUM ('APTO', 'INAPTO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "OccurrenceType" AS ENUM ('INCIDENT', 'NEAR_MISS', 'ACCIDENT_TYPICAL', 'ACCIDENT_COMMUTE', 'OCCUPATIONAL_DISEASE');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CLOSED');

-- CreateEnum
CREATE TYPE "InvestigationMethod" AS ENUM ('FIVE_WHYS', 'ISHIKAWA');

-- CreateEnum
CREATE TYPE "CatType" AS ENUM ('TYPICAL', 'COMMUTE', 'DISEASE');

-- CreateEnum
CREATE TYPE "CatStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CipaTermStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CipaMemberRole" AS ENUM ('TITULAR', 'SUPLENTE');

-- CreateEnum
CREATE TYPE "CipaRepresentation" AS ENUM ('EMPREGADOR', 'EMPREGADOS');

-- CreateEnum
CREATE TYPE "TechnicalReportType" AS ENUM ('INSALUBRIDADE', 'PERICULOSIDADE', 'COMPLEMENTAR', 'PARECER');

-- AlterTable
ALTER TABLE "pgrs" DROP COLUMN "status",
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT';

-- DropEnum
DROP TYPE "PgrStatus";

-- CreateTable
CREATE TABLE "pcmso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "responsibleId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "pcmso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pcmsoId" TEXT,
    "type" "ExamType" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "result" "ExamResult" NOT NULL DEFAULT 'PENDENTE',
    "nextDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "medical_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "result" "ExamResult" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "physicianId" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "unitId" TEXT,
    "employeeId" TEXT,
    "type" "OccurrenceType" NOT NULL,
    "highPotential" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "method" "InvestigationMethod" NOT NULL,
    "immediateCause" TEXT,
    "rootCause" TEXT,
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "type" "CatType" NOT NULL,
    "leaveDays" INTEGER,
    "status" "CatStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "cats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipa_terms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CipaTermStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cipa_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipa_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" "CipaMemberRole" NOT NULL,
    "representation" "CipaRepresentation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cipa_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ltcats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "artNumber" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "responsibleId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ltcats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "TechnicalReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "technical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pcmso_tenantId_idx" ON "pcmso"("tenantId");

-- CreateIndex
CREATE INDEX "pcmso_companyId_idx" ON "pcmso"("companyId");

-- CreateIndex
CREATE INDEX "medical_exams_tenantId_idx" ON "medical_exams"("tenantId");

-- CreateIndex
CREATE INDEX "medical_exams_employeeId_idx" ON "medical_exams"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "asos_examId_key" ON "asos"("examId");

-- CreateIndex
CREATE INDEX "asos_tenantId_idx" ON "asos"("tenantId");

-- CreateIndex
CREATE INDEX "occurrences_tenantId_idx" ON "occurrences"("tenantId");

-- CreateIndex
CREATE INDEX "occurrences_companyId_idx" ON "occurrences"("companyId");

-- CreateIndex
CREATE INDEX "occurrences_type_idx" ON "occurrences"("type");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_occurrenceId_key" ON "investigations"("occurrenceId");

-- CreateIndex
CREATE INDEX "investigations_tenantId_idx" ON "investigations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cats_occurrenceId_key" ON "cats"("occurrenceId");

-- CreateIndex
CREATE INDEX "cats_tenantId_idx" ON "cats"("tenantId");

-- CreateIndex
CREATE INDEX "cipa_terms_tenantId_idx" ON "cipa_terms"("tenantId");

-- CreateIndex
CREATE INDEX "cipa_terms_companyId_idx" ON "cipa_terms"("companyId");

-- CreateIndex
CREATE INDEX "cipa_members_tenantId_idx" ON "cipa_members"("tenantId");

-- CreateIndex
CREATE INDEX "cipa_members_termId_idx" ON "cipa_members"("termId");

-- CreateIndex
CREATE INDEX "ltcats_tenantId_idx" ON "ltcats"("tenantId");

-- CreateIndex
CREATE INDEX "ltcats_companyId_idx" ON "ltcats"("companyId");

-- CreateIndex
CREATE INDEX "technical_reports_tenantId_idx" ON "technical_reports"("tenantId");

-- CreateIndex
CREATE INDEX "technical_reports_companyId_idx" ON "technical_reports"("companyId");

-- AddForeignKey
ALTER TABLE "medical_exams" ADD CONSTRAINT "medical_exams_pcmsoId_fkey" FOREIGN KEY ("pcmsoId") REFERENCES "pcmso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asos" ADD CONSTRAINT "asos_examId_fkey" FOREIGN KEY ("examId") REFERENCES "medical_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cats" ADD CONSTRAINT "cats_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cipa_members" ADD CONSTRAINT "cipa_members_termId_fkey" FOREIGN KEY ("termId") REFERENCES "cipa_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
