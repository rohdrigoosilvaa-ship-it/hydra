-- CreateEnum
CREATE TYPE "ContractSignatureRole" AS ENUM ('CONTRATANTE', 'CONTRATADA');

-- CreateEnum
CREATE TYPE "ContractSignatureMethod" AS ENUM ('DRAWN', 'TYPED');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "pdfSha256" TEXT;

-- CreateTable
CREATE TABLE "contract_signatures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "role" "ContractSignatureRole" NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerCpf" TEXT,
    "signedByUserId" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureImage" BYTEA,
    "signatureMethod" "ContractSignatureMethod",
    "contentHash" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_signatures_tokenHash_key" ON "contract_signatures"("tokenHash");

-- CreateIndex
CREATE INDEX "contract_signatures_tenantId_idx" ON "contract_signatures"("tenantId");

-- CreateIndex
CREATE INDEX "contract_signatures_contractId_idx" ON "contract_signatures"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_signatures_contractId_role_key" ON "contract_signatures"("contractId", "role");

-- AddForeignKey
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
