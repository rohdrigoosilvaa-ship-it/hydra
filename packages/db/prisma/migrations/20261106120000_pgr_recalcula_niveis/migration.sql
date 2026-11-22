-- Os PGR passam a usar a matriz 5x5 (a mesma da avaliação do risco no cargo). Nenhum PGR estava aprovado, então
-- os riscos já avaliados mantêm probabilidade e severidade e têm o nível e a classificação recalculados.
-- Riscos "não avaliados" (evaluated = false) não são alterados.
UPDATE "pgr_risks" r
SET
  "riskLevel" = CASE g.lvl
    WHEN 1 THEN 'IRRELEVANT'::"RiskLevel"
    WHEN 2 THEN 'LOW'::"RiskLevel"
    WHEN 3 THEN 'MEDIUM'::"RiskLevel"
    WHEN 4 THEN 'HIGH'::"RiskLevel"
    ELSE 'CRITICAL'::"RiskLevel"
  END,
  "classification" = CASE g.lvl
    WHEN 1 THEN 'Aceitável'
    WHEN 2 THEN 'Tolerável'
    WHEN 3 THEN 'Moderado'
    WHEN 4 THEN 'Substancial'
    ELSE 'Intolerável'
  END
FROM (
  SELECT
    id,
    (ARRAY[[1,1,2,3,3],[1,2,3,3,4],[1,2,3,4,5],[2,2,3,4,5],[2,3,4,5,5]])
      [LEAST(5, GREATEST(1, "probability"))][LEAST(5, GREATEST(1, "severity"))] AS lvl
  FROM "pgr_risks"
) g
WHERE r.id = g.id AND r."evaluated" = true;
