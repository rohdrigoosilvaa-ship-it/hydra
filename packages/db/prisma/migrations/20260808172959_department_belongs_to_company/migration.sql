/*
  Warnings:

  - You are about to drop the column `unitId` on the `departments` table. All the data in the column will be lost.
  - Added the required column `companyId` to the `departments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_unitId_fkey";

-- DropIndex
DROP INDEX "departments_unitId_idx";

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "unitId",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "departments_companyId_idx" ON "departments"("companyId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
