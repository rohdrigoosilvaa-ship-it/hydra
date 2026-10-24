-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "complementaryInfoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "safetyRecommendations" TEXT,
ADD COLUMN     "gfipCode" TEXT,
ADD COLUMN     "ergonomicMethodology" TEXT,
ADD COLUMN     "generalNotes" TEXT,
ADD COLUMN     "technicalOpinionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ltcatOpinionNotes" TEXT,
ADD COLUMN     "ltcatOpinionConclusion" TEXT,
ADD COLUMN     "hazardPayOpinionNotes" TEXT,
ADD COLUMN     "hazardPayOpinionConclusion" TEXT,
ADD COLUMN     "unhealthinessOpinionNotes" TEXT,
ADD COLUMN     "unhealthinessOpinionConclusion" TEXT;

-- Os textos únicos que já existiam passam para os campos novos e ligam o botão correspondente.
UPDATE "positions" SET "generalNotes" = "additionalInfo", "complementaryInfoEnabled" = true
WHERE "additionalInfo" IS NOT NULL AND btrim("additionalInfo") <> '';

UPDATE "positions" SET "ltcatOpinionNotes" = "technicalOpinion", "technicalOpinionEnabled" = true
WHERE "technicalOpinion" IS NOT NULL AND btrim("technicalOpinion") <> '';
