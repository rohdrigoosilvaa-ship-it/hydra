-- Dados dos modelos de checklist (roda depois do schema, em outra transação, para poder usar os novos valores do enum).

-- 1) Código automático (CHK-0001...) por tenant e situação dos modelos já existentes.
UPDATE "inspection_templates" t
SET "code" = 'CHK-' || lpad(x.rn::text, 4, '0')
FROM (
  SELECT id, row_number() OVER (PARTITION BY "tenantId" ORDER BY "createdAt", id) AS rn
  FROM "inspection_templates"
) x
WHERE t.id = x.id AND t."code" IS NULL;

UPDATE "inspection_templates" SET "status" = 'ARQUIVADO' WHERE "active" = false;

-- 2) Itens criados pela versão anterior da tela de estrutura guardavam tipo/complementos/peso numa
--    entrada reservada "__cfg:..." dentro de `options`. Converte para as colunas próprias e remove a entrada.
WITH cfg AS (
  SELECT i.id,
         (SELECT o FROM unnest(i."options") AS o WHERE o LIKE '\_\_cfg:%' LIMIT 1) AS raw
  FROM "inspection_template_items" i
  WHERE EXISTS (SELECT 1 FROM unnest(i."options") AS o WHERE o LIKE '\_\_cfg:%')
), parsed AS (
  SELECT id,
         substring(raw from 'kind=([A-Z]+)')   AS kind,
         substring(raw from 'peso=([0-9]+)')   AS peso,
         substring(raw from 'text=([A-Z]+)')   AS txt,
         substring(raw from 'date=([A-Z]+)')   AS dt,
         substring(raw from 'list=([A-Z]+)')   AS lst,
         substring(raw from 'c=([a-z,]*)')     AS comps
  FROM cfg
)
UPDATE "inspection_template_items" i
SET "responseType" = (CASE p.kind
        WHEN 'TEXTO' THEN CASE WHEN p.txt = 'LONGO' THEN 'TEXTO_LONGO' ELSE 'TEXTO_CURTO' END
        WHEN 'DATA'  THEN CASE WHEN p.dt = 'HORA' THEN 'HORA' ELSE 'DATA' END
        WHEN 'LISTA' THEN CASE WHEN p.lst = 'MULTIPLA' THEN 'SELECAO_MULTIPLA' ELSE 'SELECAO_UNICA' END
        ELSE i."responseType"::text
      END)::"InspectionItemType",
    "weight" = CASE WHEN p.kind = 'AVALIATIVO' THEN p.peso::int END,
    "allowComment" = COALESCE(p.comps LIKE '%comentario%', false),
    "allowActionPlan" = COALESCE(p.comps LIKE '%plano%', false),
    "options" = ARRAY(
      SELECT u.o FROM unnest(i."options") WITH ORDINALITY AS u(o, n)
      WHERE u.o NOT LIKE '\_\_cfg:%'
      ORDER BY u.n
    )
FROM parsed p
WHERE i.id = p.id;
