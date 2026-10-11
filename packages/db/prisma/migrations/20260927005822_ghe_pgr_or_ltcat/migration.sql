-- DropForeignKey
ALTER TABLE "ghe" DROP CONSTRAINT "ghe_pgrId_fkey";

-- AlterTable
ALTER TABLE "ghe" ADD COLUMN     "ltcatId" TEXT,
ALTER COLUMN "pgrId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ghe_ltcatId_idx" ON "ghe"("ltcatId");

-- AddForeignKey
ALTER TABLE "ghe" ADD CONSTRAINT "ghe_pgrId_fkey" FOREIGN KEY ("pgrId") REFERENCES "pgrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ghe" ADD CONSTRAINT "ghe_ltcatId_fkey" FOREIGN KEY ("ltcatId") REFERENCES "ltcats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

