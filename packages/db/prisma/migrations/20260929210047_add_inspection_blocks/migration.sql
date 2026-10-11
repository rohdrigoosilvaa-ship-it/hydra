-- AlterTable
ALTER TABLE "inspection_template_items" ADD COLUMN     "blockLabel" TEXT;

-- CreateTable
CREATE TABLE "inspection_blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_block_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "responseType" "InspectionItemType" NOT NULL DEFAULT 'CONFORME_NAO_CONFORME',
    "category" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "inspection_block_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_blocks_tenantId_idx" ON "inspection_blocks"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_block_items_tenantId_idx" ON "inspection_block_items"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_block_items_blockId_idx" ON "inspection_block_items"("blockId");

-- AddForeignKey
ALTER TABLE "inspection_block_items" ADD CONSTRAINT "inspection_block_items_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "inspection_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

