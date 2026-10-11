-- CreateEnum
CREATE TYPE "EpiDeliveryStatus" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateTable
CREATE TABLE "epi_catalog_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mainProtection" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "epi_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epi_deliveries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "employeeName" TEXT NOT NULL,
    "departmentName" TEXT,
    "positionName" TEXT,
    "admittedAt" TIMESTAMP(3),
    "status" "EpiDeliveryStatus" NOT NULL DEFAULT 'ATIVA',
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "pdfSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "epi_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epi_delivery_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "epiCatalogItemId" TEXT,
    "epiName" TEXT NOT NULL,
    "ca" TEXT,
    "quantity" TEXT,
    "expiresAt" TIMESTAMP(3),
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "epi_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epi_delivery_signatures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerCpf" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureImage" BYTEA,
    "signatureMethod" "ContractSignatureMethod",
    "contentHash" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epi_delivery_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "epi_catalog_items_tenantId_idx" ON "epi_catalog_items"("tenantId");

-- CreateIndex
CREATE INDEX "epi_deliveries_tenantId_idx" ON "epi_deliveries"("tenantId");

-- CreateIndex
CREATE INDEX "epi_deliveries_companyId_idx" ON "epi_deliveries"("companyId");

-- CreateIndex
CREATE INDEX "epi_deliveries_employeeId_idx" ON "epi_deliveries"("employeeId");

-- CreateIndex
CREATE INDEX "epi_delivery_items_tenantId_idx" ON "epi_delivery_items"("tenantId");

-- CreateIndex
CREATE INDEX "epi_delivery_items_deliveryId_idx" ON "epi_delivery_items"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "epi_delivery_signatures_deliveryId_key" ON "epi_delivery_signatures"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "epi_delivery_signatures_tokenHash_key" ON "epi_delivery_signatures"("tokenHash");

-- CreateIndex
CREATE INDEX "epi_delivery_signatures_tenantId_idx" ON "epi_delivery_signatures"("tenantId");

-- AddForeignKey
ALTER TABLE "epi_deliveries" ADD CONSTRAINT "epi_deliveries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epi_delivery_items" ADD CONSTRAINT "epi_delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "epi_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epi_delivery_items" ADD CONSTRAINT "epi_delivery_items_epiCatalogItemId_fkey" FOREIGN KEY ("epiCatalogItemId") REFERENCES "epi_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epi_delivery_signatures" ADD CONSTRAINT "epi_delivery_signatures_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "epi_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

