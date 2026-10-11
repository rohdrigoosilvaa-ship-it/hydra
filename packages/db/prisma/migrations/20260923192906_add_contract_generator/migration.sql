-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ATIVO', 'CANCELADO');

-- CreateTable
CREATE TABLE "contract_issuers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "repNome" TEXT,
    "repNacionalidade" TEXT,
    "repEstadoCivil" TEXT,
    "repProfissao" TEXT,
    "repRg" TEXT,
    "repCpf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_template_clauses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "contract_template_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_service_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "contract_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "templateId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "repNome" TEXT NOT NULL,
    "repNacionalidade" TEXT,
    "repEstadoCivil" TEXT,
    "repProfissao" TEXT,
    "repRg" TEXT,
    "repCpf" TEXT,
    "quantidadeVidas" INTEGER,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "prazoMeses" INTEGER NOT NULL DEFAULT 12,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "valorMensalidade" DOUBLE PRECISION NOT NULL,
    "valorPrimeiraParcela" DOUBLE PRECISION,
    "dataVencimentoPrimeiraParcela" TIMESTAMP(3),
    "diaVencimentoMensal" INTEGER,
    "formaPagamento" TEXT,
    "qtdVisitas" INTEGER,
    "frequenciaVisitas" TEXT,
    "observacoes" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ATIVO',
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_selected_services" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,

    CONSTRAINT "contract_selected_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_issuers_tenantId_key" ON "contract_issuers"("tenantId");

-- CreateIndex
CREATE INDEX "contract_templates_tenantId_idx" ON "contract_templates"("tenantId");

-- CreateIndex
CREATE INDEX "contract_template_clauses_tenantId_idx" ON "contract_template_clauses"("tenantId");

-- CreateIndex
CREATE INDEX "contract_template_clauses_templateId_idx" ON "contract_template_clauses"("templateId");

-- CreateIndex
CREATE INDEX "contract_service_items_tenantId_idx" ON "contract_service_items"("tenantId");

-- CreateIndex
CREATE INDEX "contract_service_items_templateId_idx" ON "contract_service_items"("templateId");

-- CreateIndex
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE INDEX "contracts_templateId_idx" ON "contracts"("templateId");

-- CreateIndex
CREATE INDEX "contract_selected_services_tenantId_idx" ON "contract_selected_services"("tenantId");

-- CreateIndex
CREATE INDEX "contract_selected_services_contractId_idx" ON "contract_selected_services"("contractId");

-- AddForeignKey
ALTER TABLE "contract_template_clauses" ADD CONSTRAINT "contract_template_clauses_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_service_items" ADD CONSTRAINT "contract_service_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_selected_services" ADD CONSTRAINT "contract_selected_services_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_selected_services" ADD CONSTRAINT "contract_selected_services_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "contract_service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
