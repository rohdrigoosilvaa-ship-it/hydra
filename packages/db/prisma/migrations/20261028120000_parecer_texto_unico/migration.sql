-- Cada parecer técnico passa a ter um único texto ("observações e conclusão"), guardado na coluna *Notes.
-- O que já estava escrito em "conclusão" é juntado ao texto e a coluna antiga fica sem uso.
UPDATE "positions" SET
  "ltcatOpinionNotes" = NULLIF(concat_ws(E'\n\n', NULLIF(btrim("ltcatOpinionNotes"), ''), NULLIF(btrim("ltcatOpinionConclusion"), '')), ''),
  "ltcatOpinionConclusion" = NULL
WHERE "ltcatOpinionConclusion" IS NOT NULL;

UPDATE "positions" SET
  "hazardPayOpinionNotes" = NULLIF(concat_ws(E'\n\n', NULLIF(btrim("hazardPayOpinionNotes"), ''), NULLIF(btrim("hazardPayOpinionConclusion"), '')), ''),
  "hazardPayOpinionConclusion" = NULL
WHERE "hazardPayOpinionConclusion" IS NOT NULL;

UPDATE "positions" SET
  "unhealthinessOpinionNotes" = NULLIF(concat_ws(E'\n\n', NULLIF(btrim("unhealthinessOpinionNotes"), ''), NULLIF(btrim("unhealthinessOpinionConclusion"), '')), ''),
  "unhealthinessOpinionConclusion" = NULL
WHERE "unhealthinessOpinionConclusion" IS NOT NULL;
