-- AlterTable
ALTER TABLE "pgr_actions" ADD COLUMN     "companyId" TEXT;

-- CreateIndex
CREATE INDEX "pgr_actions_companyId_idx" ON "pgr_actions"("companyId");
