-- CreateEnum
CREATE TYPE "ProtectionKind" AS ENUM ('EPC', 'EPI');

-- CreateTable
CREATE TABLE "protection_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "ProtectionKind" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "protection_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protection_equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "ProtectionKind" NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "usefulLifeMonths" INTEGER,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "protection_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazard_protections" (
    "hazardId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    CONSTRAINT "hazard_protections_pkey" PRIMARY KEY ("hazardId","equipmentId")
);

CREATE UNIQUE INDEX "protection_categories_tenantId_kind_name_key" ON "protection_categories"("tenantId", "kind", "name");
CREATE INDEX "protection_equipment_tenantId_kind_idx" ON "protection_equipment"("tenantId", "kind");
CREATE INDEX "hazard_protections_equipmentId_idx" ON "hazard_protections"("equipmentId");

ALTER TABLE "protection_equipment" ADD CONSTRAINT "protection_equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "protection_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hazard_protections" ADD CONSTRAINT "hazard_protections_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "hazards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hazard_protections" ADD CONSTRAINT "hazard_protections_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "protection_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
