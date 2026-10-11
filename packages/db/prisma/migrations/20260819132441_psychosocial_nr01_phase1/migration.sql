-- CreateEnum
CREATE TYPE "PsychosocialSurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "psychosocial_surveys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PsychosocialSurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "psychosocial_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychosocial_questions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "psychosocial_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychosocial_invites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "psychosocial_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychosocial_responses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychosocial_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychosocial_answers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "psychosocial_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "psychosocial_surveys_tenantId_idx" ON "psychosocial_surveys"("tenantId");

-- CreateIndex
CREATE INDEX "psychosocial_surveys_companyId_idx" ON "psychosocial_surveys"("companyId");

-- CreateIndex
CREATE INDEX "psychosocial_questions_tenantId_idx" ON "psychosocial_questions"("tenantId");

-- CreateIndex
CREATE INDEX "psychosocial_questions_surveyId_idx" ON "psychosocial_questions"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "psychosocial_invites_token_key" ON "psychosocial_invites"("token");

-- CreateIndex
CREATE INDEX "psychosocial_invites_tenantId_idx" ON "psychosocial_invites"("tenantId");

-- CreateIndex
CREATE INDEX "psychosocial_invites_surveyId_idx" ON "psychosocial_invites"("surveyId");

-- CreateIndex
CREATE INDEX "psychosocial_invites_employeeId_idx" ON "psychosocial_invites"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "psychosocial_invites_surveyId_employeeId_key" ON "psychosocial_invites"("surveyId", "employeeId");

-- CreateIndex
CREATE INDEX "psychosocial_responses_tenantId_idx" ON "psychosocial_responses"("tenantId");

-- CreateIndex
CREATE INDEX "psychosocial_responses_surveyId_idx" ON "psychosocial_responses"("surveyId");

-- CreateIndex
CREATE INDEX "psychosocial_answers_tenantId_idx" ON "psychosocial_answers"("tenantId");

-- CreateIndex
CREATE INDEX "psychosocial_answers_responseId_idx" ON "psychosocial_answers"("responseId");

-- AddForeignKey
ALTER TABLE "psychosocial_questions" ADD CONSTRAINT "psychosocial_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "psychosocial_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychosocial_invites" ADD CONSTRAINT "psychosocial_invites_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "psychosocial_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychosocial_responses" ADD CONSTRAINT "psychosocial_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "psychosocial_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychosocial_answers" ADD CONSTRAINT "psychosocial_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "psychosocial_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychosocial_answers" ADD CONSTRAINT "psychosocial_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "psychosocial_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
