-- CreateEnum
CREATE TYPE "ActionScheduleMode" AS ENUM ('DRAFT', 'DEFINED');
CREATE TYPE "ActionScheduleType" AS ENUM ('GERAL', 'W5H2');

-- CreateTable
CREATE TABLE "action_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "elaboratedAt" DATE NOT NULL,
    "mode" "ActionScheduleMode" NOT NULL DEFAULT 'DRAFT',
    "type" "ActionScheduleType" NOT NULL DEFAULT 'GERAL',
    "startMonth" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "action_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_schedule_items" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "what" TEXT NOT NULL,
    "why" TEXT,
    "place" TEXT,
    "how" TEXT,
    "responsible" TEXT,
    "totalCost" DECIMAL(14,2),
    "followUp" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "months" TEXT[],
    CONSTRAINT "action_schedule_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "action_schedules_tenantId_idx" ON "action_schedules"("tenantId");
CREATE INDEX "action_schedules_companyId_idx" ON "action_schedules"("companyId");
CREATE INDEX "action_schedule_items_scheduleId_idx" ON "action_schedule_items"("scheduleId");

ALTER TABLE "action_schedules" ADD CONSTRAINT "action_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "action_schedule_items" ADD CONSTRAINT "action_schedule_items_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "action_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
