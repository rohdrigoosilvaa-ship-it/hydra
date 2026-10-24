-- CreateTable
CREATE TABLE "cnae_nr04" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskGrade" INTEGER NOT NULL,

    CONSTRAINT "cnae_nr04_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cnae_nr04_code_key" ON "cnae_nr04"("code");

-- CreateIndex
CREATE INDEX "cnae_nr04_description_idx" ON "cnae_nr04"("description");
