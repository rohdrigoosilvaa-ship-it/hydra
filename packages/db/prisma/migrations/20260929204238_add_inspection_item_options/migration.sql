-- AlterEnum
ALTER TYPE "InspectionItemType" ADD VALUE 'SELECAO_MULTIPLA';

-- AlterTable
ALTER TABLE "inspection_template_items" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

