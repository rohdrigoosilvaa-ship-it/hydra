-- AlterTable
ALTER TABLE "ltcats" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "companyResponsibleName" TEXT,
ADD COLUMN     "companyResponsibleRole" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "preparedBy" TEXT,
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "technicalResponsibleCouncil" TEXT,
ADD COLUMN     "technicalResponsibleName" TEXT,
ADD COLUMN     "technicalResponsibleRegistry" TEXT,
ADD COLUMN     "technicalResponsibleSpecialty" TEXT,
ADD COLUMN     "technicalResponsibleUf" TEXT;

-- CreateTable
CREATE TABLE "ltcat_agents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ltcatId" TEXT NOT NULL,
    "gheId" TEXT,
    "agentCategory" "RiskCategory" NOT NULL,
    "agentName" TEXT NOT NULL,
    "intensityConcentration" TEXT,
    "toleranceLimit" TEXT,
    "measurementMethod" TEXT,
    "exposureTechnique" TEXT,
    "effectiveEpi" TEXT,
    "conclusion" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ltcat_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ltcat_agents_tenantId_idx" ON "ltcat_agents"("tenantId");

-- CreateIndex
CREATE INDEX "ltcat_agents_ltcatId_idx" ON "ltcat_agents"("ltcatId");

-- AddForeignKey
ALTER TABLE "ltcat_agents" ADD CONSTRAINT "ltcat_agents_ltcatId_fkey" FOREIGN KEY ("ltcatId") REFERENCES "ltcats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ltcat_agents" ADD CONSTRAINT "ltcat_agents_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "ghe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

