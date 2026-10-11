-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "referencePgrId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "employeeName" TEXT NOT NULL,
    "departmentName" TEXT,
    "positionName" TEXT,
    "admittedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "pdfSha256" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_risk_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "hazardName" TEXT NOT NULL,
    "hazardCategory" "RiskCategory" NOT NULL,
    "gheName" TEXT,
    "typicalInjuries" TEXT,
    "epiMeasures" TEXT,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_risk_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_epi_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "epiName" TEXT NOT NULL,
    "ca" TEXT,
    "periodicityMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_epi_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_signatures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerCpf" TEXT,
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

    CONSTRAINT "work_order_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_orders_tenantId_idx" ON "work_orders"("tenantId");

-- CreateIndex
CREATE INDEX "work_orders_companyId_idx" ON "work_orders"("companyId");

-- CreateIndex
CREATE INDEX "work_orders_employeeId_idx" ON "work_orders"("employeeId");

-- CreateIndex
CREATE INDEX "work_order_risk_items_tenantId_idx" ON "work_order_risk_items"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_risk_items_workOrderId_idx" ON "work_order_risk_items"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_epi_items_tenantId_idx" ON "work_order_epi_items"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_epi_items_workOrderId_idx" ON "work_order_epi_items"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_signatures_workOrderId_key" ON "work_order_signatures"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_signatures_tokenHash_key" ON "work_order_signatures"("tokenHash");

-- CreateIndex
CREATE INDEX "work_order_signatures_tenantId_idx" ON "work_order_signatures"("tenantId");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_risk_items" ADD CONSTRAINT "work_order_risk_items_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_epi_items" ADD CONSTRAINT "work_order_epi_items_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_signatures" ADD CONSTRAINT "work_order_signatures_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

