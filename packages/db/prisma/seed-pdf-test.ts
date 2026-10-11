import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const pgr = await prisma.pgr.findFirst({ where: { title: "PGR Teste PDF" } });
  if (!pgr) throw new Error("PGR Teste PDF não encontrado");

  const tenantId = pgr.tenantId;
  const companyId = pgr.companyId;

  const dept = await prisma.department.findFirst({ where: { companyId, name: "Operacional" } });
  const pos = await prisma.position.findFirst({ where: { companyId, name: "Operador de Prensa" } });

  const ghe = await prisma.ghe.create({
    data: {
      tenantId,
      pgrId: pgr.id,
      name: "GHE OPERACIONAL PDF TESTE",
      code: "GHE-PDF-01",
      localDescription: "Galpão industrial, piso de concreto, cobertura metálica, ventilação natural.",
      activityDescription: "Atividades operacionais de produção, prensagem e movimentação de materiais metálicos.",
    },
  });

  await prisma.gheFunction.create({
    data: {
      tenantId,
      gheId: ghe.id,
      departmentId: dept?.id,
      positionId: pos?.id,
      activityDescription: "Operar prensa hidráulica para conformação de peças metálicas, seguindo procedimento operacional padrão.",
    },
  });

  const hazard = await prisma.hazard.create({
    data: {
      tenantId,
      category: "ERGONOMICO",
      name: "Postura inadequada de membros inferiores",
      esocialCode: "09.01.001",
    },
  });

  const risk = await prisma.pgrRisk.create({
    data: {
      tenantId,
      pgrId: pgr.id,
      gheId: ghe.id,
      hazardId: hazard.id,
      typicalInjuries: "Lesão ou desconforto em membros inferiores",
      sourceCircumstances: "Ausência de apoio para os pés",
      exposureType: "PERMANENTE",
      evaluationCriteria: "QUALITATIVO",
      exposureProfile: "Habitual e permanente",
      probability: 3,
      severity: 2,
      riskLevel: "MEDIUM",
      classification: "Tolerável",
      conclusion: "A avaliação qualitativa do posto de trabalho indicou necessidade de melhoria ergonômica no apoio para os pés.",
      adminControls: "Cadeira de trabalho ergonômica, possibilidade de alternância postural",
    },
  });

  const action = await prisma.pgrAction.create({
    data: {
      tenantId,
      companyId,
      pgrId: pgr.id,
      pgrRiskId: risk.id,
      description: "Adquirir apoio para os pés ajustável para os postos de trabalho do setor Operacional",
      dueDate: new Date("2026-12-31"),
      priority: 2,
      status: "OPEN",
    },
  });

  console.log("GHE:", ghe.id, "Risk:", risk.id, "Action:", action.id);
}
main().finally(() => prisma.$disconnect());
