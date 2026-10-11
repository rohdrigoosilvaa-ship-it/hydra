-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "numero" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE INDEX "departments_branchId_idx" ON "departments"("branchId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
