-- CreateEnum
CREATE TYPE "InspectionItemType" AS ENUM ('CONFORME_NAO_CONFORME', 'SIM_NAO', 'NOTA', 'TEXTO_LIVRE');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "InspectionResponseValue" AS ENUM ('CONFORME', 'NAO_CONFORME', 'NAO_APLICAVEL');

-- CreateEnum
CREATE TYPE "NonConformitySeverity" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "NonConformityStatus" AS ENUM ('ABERTA', 'EM_TRATATIVA', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('INSPECTION', 'INSPECTION_ITEM_RESPONSE', 'NON_CONFORMITY', 'BEHAVIOR_OBSERVATION', 'OCCURRENCE', 'ACTION', 'AUDIT', 'PGR');

-- AlterTable
ALTER TABLE "pgr_actions" ADD COLUMN     "nonConformityId" TEXT;

-- CreateTable
CREATE TABLE "inspection_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "inspection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_template_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "responseType" "InspectionItemType" NOT NULL DEFAULT 'CONFORME_NAO_CONFORME',
    "category" TEXT,

    CONSTRAINT "inspection_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "departmentId" TEXT,
    "templateId" TEXT NOT NULL,
    "inspectorId" TEXT,
    "status" "InspectionStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_item_responses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "templateItemId" TEXT NOT NULL,
    "value" "InspectionResponseValue",
    "textValue" TEXT,
    "comment" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_item_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_conformities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "inspectionItemResponseId" TEXT,
    "description" TEXT NOT NULL,
    "severity" "NonConformitySeverity" NOT NULL DEFAULT 'MEDIA',
    "status" "NonConformityStatus" NOT NULL DEFAULT 'ABERTA',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "non_conformities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "caption" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_templates_tenantId_idx" ON "inspection_templates"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_templates_companyId_idx" ON "inspection_templates"("companyId");

-- CreateIndex
CREATE INDEX "inspection_template_items_tenantId_idx" ON "inspection_template_items"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_template_items_templateId_idx" ON "inspection_template_items"("templateId");

-- CreateIndex
CREATE INDEX "inspections_tenantId_idx" ON "inspections"("tenantId");

-- CreateIndex
CREATE INDEX "inspections_companyId_idx" ON "inspections"("companyId");

-- CreateIndex
CREATE INDEX "inspections_templateId_idx" ON "inspections"("templateId");

-- CreateIndex
CREATE INDEX "inspection_item_responses_tenantId_idx" ON "inspection_item_responses"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_item_responses_inspectionId_idx" ON "inspection_item_responses"("inspectionId");

-- CreateIndex
CREATE INDEX "non_conformities_tenantId_idx" ON "non_conformities"("tenantId");

-- CreateIndex
CREATE INDEX "non_conformities_companyId_idx" ON "non_conformities"("companyId");

-- CreateIndex
CREATE INDEX "non_conformities_inspectionId_idx" ON "non_conformities"("inspectionId");

-- CreateIndex
CREATE INDEX "evidences_tenantId_idx" ON "evidences"("tenantId");

-- CreateIndex
CREATE INDEX "evidences_sourceType_sourceId_idx" ON "evidences"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "pgr_actions" ADD CONSTRAINT "pgr_actions_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "non_conformities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_template_items" ADD CONSTRAINT "inspection_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_item_responses" ADD CONSTRAINT "inspection_item_responses_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_item_responses" ADD CONSTRAINT "inspection_item_responses_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "inspection_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_inspectionItemResponseId_fkey" FOREIGN KEY ("inspectionItemResponseId") REFERENCES "inspection_item_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
