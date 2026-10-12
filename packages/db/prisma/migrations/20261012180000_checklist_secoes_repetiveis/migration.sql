-- AlterTable
ALTER TABLE "inspection_template_sections" ADD COLUMN     "repeatLabel" TEXT,
ADD COLUMN     "repeatable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "inspection_item_responses" ADD COLUMN     "repetition" INTEGER NOT NULL DEFAULT 0;
