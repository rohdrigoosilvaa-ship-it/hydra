-- CreateEnum
CREATE TYPE "ChecklistTemplateStatus" AS ENUM ('RASCUNHO', 'ATIVO', 'INATIVO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "ChecklistFrequency" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL', 'POR_TURNO', 'POR_EVENTO', 'PERSONALIZADA');

-- CreateEnum
CREATE TYPE "NonConformityCreation" AS ENUM ('MANUAL', 'AUTOMATICA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InspectionItemType" ADD VALUE 'TEXTO_CURTO';
ALTER TYPE "InspectionItemType" ADD VALUE 'TEXTO_LONGO';
ALTER TYPE "InspectionItemType" ADD VALUE 'SELECAO_UNICA';
ALTER TYPE "InspectionItemType" ADD VALUE 'NUMERO';
ALTER TYPE "InspectionItemType" ADD VALUE 'DATA';
ALTER TYPE "InspectionItemType" ADD VALUE 'HORA';
ALTER TYPE "InspectionItemType" ADD VALUE 'ESCALA';

-- AlterTable
ALTER TABLE "inspection_templates" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "frequency" "ChecklistFrequency",
ADD COLUMN     "ncCreation" "NonConformityCreation" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "previousVersionId" TEXT,
ADD COLUMN     "process" TEXT,
ADD COLUMN     "responsibleId" TEXT,
ADD COLUMN     "status" "ChecklistTemplateStatus" NOT NULL DEFAULT 'ATIVO',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "inspection_template_items" ADD COLUMN     "allowActionPlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowComment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "conditionItemId" TEXT,
ADD COLUMN     "conditionOperator" TEXT,
ADD COLUMN     "conditionValue" TEXT,
ADD COLUMN     "instruction" TEXT,
ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scaleMax" INTEGER,
ADD COLUMN     "scaleMin" INTEGER,
ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "weight" INTEGER;

-- CreateTable
CREATE TABLE "inspection_template_sections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "inspection_template_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_template_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_template_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_template_sections_tenantId_idx" ON "inspection_template_sections"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_template_sections_templateId_idx" ON "inspection_template_sections"("templateId");

-- CreateIndex
CREATE INDEX "inspection_template_history_tenantId_idx" ON "inspection_template_history"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_template_history_templateId_idx" ON "inspection_template_history"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_templates_tenantId_code_version_key" ON "inspection_templates"("tenantId", "code", "version");

-- AddForeignKey
ALTER TABLE "inspection_template_sections" ADD CONSTRAINT "inspection_template_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_template_history" ADD CONSTRAINT "inspection_template_history_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_template_items" ADD CONSTRAINT "inspection_template_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "inspection_template_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

