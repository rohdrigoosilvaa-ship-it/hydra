-- AlterTable
ALTER TABLE "pgr_risks" ADD COLUMN     "description" TEXT,
ADD COLUMN     "legalBasis" TEXT,
ADD COLUMN     "exposureTime" TEXT,
ADD COLUMN     "usesEpc" TEXT,
ADD COLUMN     "epcEffective" TEXT,
ADD COLUMN     "usesEpi" TEXT,
ADD COLUMN     "epiEffective" TEXT,
ADD COLUMN     "requiredActions" TEXT,
ADD COLUMN     "guidance" TEXT;
