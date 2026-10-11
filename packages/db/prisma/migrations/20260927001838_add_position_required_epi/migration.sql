-- CreateTable
CREATE TABLE "position_required_epis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "epiCatalogItemId" TEXT,
    "epiName" TEXT NOT NULL,
    "ca" TEXT,
    "periodicityMonths" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_required_epis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "position_required_epis_tenantId_idx" ON "position_required_epis"("tenantId");

-- CreateIndex
CREATE INDEX "position_required_epis_positionId_idx" ON "position_required_epis"("positionId");

-- AddForeignKey
ALTER TABLE "position_required_epis" ADD CONSTRAINT "position_required_epis_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_required_epis" ADD CONSTRAINT "position_required_epis_epiCatalogItemId_fkey" FOREIGN KEY ("epiCatalogItemId") REFERENCES "epi_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

