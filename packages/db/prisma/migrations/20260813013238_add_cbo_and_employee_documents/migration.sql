-- CreateEnum
CREATE TYPE "EmployeeDocumentType" AS ENUM ('RG', 'ASO', 'PPP', 'TREINAMENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "EmployeeDocumentType" NOT NULL,
    "name" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbo_occupations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "cbo_occupations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_documents_tenantId_idx" ON "employee_documents"("tenantId");

-- CreateIndex
CREATE INDEX "employee_documents_companyId_idx" ON "employee_documents"("companyId");

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "employee_documents"("employeeId");

-- CreateIndex
CREATE INDEX "employee_documents_expiryDate_idx" ON "employee_documents"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "cbo_occupations_code_key" ON "cbo_occupations"("code");

-- CreateIndex
CREATE INDEX "cbo_occupations_title_idx" ON "cbo_occupations"("title");

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
