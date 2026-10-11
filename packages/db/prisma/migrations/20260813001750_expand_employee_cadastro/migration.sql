-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "address" TEXT,
ADD COLUMN     "address_number" TEXT,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "ctps" TEXT,
ADD COLUMN     "ctps_issue_date" TIMESTAMP(3),
ADD COLUMN     "ctps_series" TEXT,
ADD COLUMN     "ctps_state" TEXT,
ADD COLUMN     "disability_type" TEXT,
ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "home_phone" TEXT,
ADD COLUMN     "inactivated_at" TIMESTAMP(3),
ADD COLUMN     "leave_reason" TEXT,
ADD COLUMN     "mobile_phone" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "nit" TEXT,
ADD COLUMN     "rehabilitated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "rg_expiry_date" TIMESTAMP(3),
ADD COLUMN     "rg_issue_date" TIMESTAMP(3),
ADD COLUMN     "rg_issuer" TEXT,
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "sms_opt_in" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "employee_import_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "fileName" TEXT,
    "totalRows" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_import_logs_tenantId_idx" ON "employee_import_logs"("tenantId");

-- CreateIndex
CREATE INDEX "employees_cpf_idx" ON "employees"("cpf");
