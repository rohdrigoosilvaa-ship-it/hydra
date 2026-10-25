-- AlterTable
ALTER TABLE "pgrs"
  ADD COLUMN "modelHtml" TEXT,
  ADD COLUMN "coordinator" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "renewalAt" TIMESTAMP(3),
  ADD COLUMN "scheduleIds" TEXT[];
