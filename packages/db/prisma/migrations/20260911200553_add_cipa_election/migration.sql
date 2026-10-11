-- CreateEnum
CREATE TYPE "CipaElectionType" AS ENUM ('PRIMEIRA', 'RENOVACAO');

-- CreateEnum
CREATE TYPE "CipaScheduleOrigin" AS ENUM ('LEGAL', 'PROGRAMADA');

-- CreateTable
CREATE TABLE "cipa_elections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "CipaElectionType" NOT NULL,
    "grauRisco" INTEGER NOT NULL,
    "gestaoLabel" TEXT NOT NULL,
    "posseDate" TIMESTAMP(3) NOT NULL,
    "dataTerminoMandatoAtual" TIMESTAMP(3),
    "previousTermId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "cipa_elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipa_election_schedule_steps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "regra" TEXT NOT NULL,
    "origem" "CipaScheduleOrigin" NOT NULL,
    "baseLegal" TEXT,
    "diasRelativos" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "cipa_election_schedule_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cipa_elections_tenantId_idx" ON "cipa_elections"("tenantId");

-- CreateIndex
CREATE INDEX "cipa_elections_companyId_idx" ON "cipa_elections"("companyId");

-- CreateIndex
CREATE INDEX "cipa_election_schedule_steps_tenantId_idx" ON "cipa_election_schedule_steps"("tenantId");

-- CreateIndex
CREATE INDEX "cipa_election_schedule_steps_electionId_idx" ON "cipa_election_schedule_steps"("electionId");

-- AddForeignKey
ALTER TABLE "cipa_election_schedule_steps" ADD CONSTRAINT "cipa_election_schedule_steps_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "cipa_elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
