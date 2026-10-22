-- CreateTable
CREATE TABLE "epi_stock_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ca" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "epi_stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "epi_stock_items_tenantId_idx" ON "epi_stock_items"("tenantId");
