-- AlterTable
ALTER TABLE "evidences" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "pgrs" ADD COLUMN     "cnae" TEXT,
ADD COLUMN     "consideracoesFinais" TEXT,
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "episRecomendados" TEXT,
ADD COLUMN     "grauRisco" INTEGER,
ADD COLUMN     "metasPrioridades" TEXT,
ADD COLUMN     "procedimentoTrabalho" TEXT,
ADD COLUMN     "treinamentosNecessarios" TEXT;

-- CreateTable
CREATE TABLE "pgr_cronograma_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pgrId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsible" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pgr_cronograma_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pgr_cronograma_marks" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,

    CONSTRAINT "pgr_cronograma_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pgr_cronograma_items_tenantId_idx" ON "pgr_cronograma_items"("tenantId");

-- CreateIndex
CREATE INDEX "pgr_cronograma_items_pgrId_idx" ON "pgr_cronograma_items"("pgrId");

-- CreateIndex
CREATE UNIQUE INDEX "pgr_cronograma_marks_itemId_year_month_key" ON "pgr_cronograma_marks"("itemId", "year", "month");

-- AddForeignKey
ALTER TABLE "pgr_cronograma_items" ADD CONSTRAINT "pgr_cronograma_items_pgrId_fkey" FOREIGN KEY ("pgrId") REFERENCES "pgrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pgr_cronograma_marks" ADD CONSTRAINT "pgr_cronograma_marks_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "pgr_cronograma_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

