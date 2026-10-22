import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere, relatedCompanyScopeWhere } from "../org/scope.util";
import { countEmployeesForGhe } from "../pgr/pgr.service";
import type { ActionStatus, RiskLevel } from "@hydra/db";

/**
 * Agregações do hub "Módulo NR-01" (GRO) — sem tabelas próprias: lê PgrRisk,
 * PgrAction, Pgr e PsychosocialSurvey já existentes e resume em indicadores.
 * "Reavaliações" ainda não tem modelo próprio — reportado como 0, marcado
 * explicitamente como recurso em desenvolvimento (não é dado fictício).
 */
@Injectable()
export class Nr01Service {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const riskWhere = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr");
    const actionWhere = companyScopeWhere(assignments, PERMISSIONS.PGR_ACTION_READ, tenantId);
    const pgrWhere = companyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId);
    const surveyWhere = companyScopeWhere(assignments, PERMISSIONS.PSYCHOSOCIAL_READ, tenantId);

    const [risks, actionGroups, pgrCount, latestPgr, recentRisks, recentActions, recentSurveys] = await Promise.all([
      this.prisma.pgrRisk.findMany({
        where: riskWhere,
        select: {
          riskLevel: true,
          classification: true,
          adminControls: true,
          engineeringControls: true,
          epcMeasures: true,
          epiMeasures: true,
        },
      }),
      this.prisma.pgrAction.groupBy({ by: ["status"], where: actionWhere, _count: { _all: true } }),
      this.prisma.pgr.count({ where: { ...pgrWhere, deletedAt: null } }),
      this.prisma.pgr.findFirst({
        where: { ...pgrWhere, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, version: true, updatedAt: true, validUntil: true },
      }),
      this.prisma.pgrRisk.findMany({
        where: riskWhere,
        select: { id: true, createdAt: true, hazard: { select: { name: true } }, ghe: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      this.prisma.pgrAction.findMany({
        where: actionWhere,
        select: { id: true, description: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      this.prisma.psychosocialSurvey.findMany({
        where: surveyWhere,
        select: { id: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const byLevel: Record<RiskLevel, number> = { IRRELEVANT: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const r of risks) byLevel[r.riskLevel]++;
    const riskTotal = risks.length;
    const riskEvaluated = risks.filter((r) => !!r.classification).length;
    const hasControl = (r: (typeof risks)[number]) =>
      !!(r.adminControls || r.engineeringControls || r.epcMeasures || r.epiMeasures);
    const riskWithControls = risks.filter(hasControl).length;
    const riskNeedingControls = risks.filter(
      (r) => (r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL") && !hasControl(r),
    ).length;

    const byStatus: Record<ActionStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      LATE: 0,
      VALIDATING: 0,
      DONE: 0,
      CANCELED: 0,
    };
    for (const g of actionGroups) byStatus[g.status] = g._count._all;
    const actionsOpen = byStatus.OPEN + byStatus.IN_PROGRESS + byStatus.VALIDATING;
    const actionsLate = byStatus.LATE;
    const actionsDone = byStatus.DONE;

    const alerts: { severity: "error" | "warning" | "info"; message: string }[] = [];
    if (actionsLate > 0) alerts.push({ severity: "error", message: `${actionsLate} ação(ões) vencida(s)` });
    if (byLevel.CRITICAL > 0) alerts.push({ severity: "error", message: `${byLevel.CRITICAL} risco(s) crítico(s)` });
    if (byLevel.HIGH > 0) alerts.push({ severity: "warning", message: `${byLevel.HIGH} risco(s) elevado(s)` });
    if (riskTotal > riskEvaluated) {
      alerts.push({ severity: "warning", message: `${riskTotal - riskEvaluated} risco(s) sem classificação preenchida` });
    }

    type Activity = { label: string; at: Date };
    const activity: Activity[] = [
      ...recentRisks.map((r) => ({
        label: `Risco "${r.hazard.name}" identificado (GHE ${r.ghe.name})`,
        at: r.createdAt,
      })),
      ...recentActions.map((a) => ({
        label: `Ação "${a.description}" — ${ACTION_STATUS_LABEL[a.status]}`,
        at: a.updatedAt,
      })),
      ...recentSurveys.map((s) => ({
        label: `Pesquisa psicossocial "${s.title}" criada`,
        at: s.createdAt,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 8);

    return {
      risks: {
        total: riskTotal,
        evaluated: riskEvaluated,
        byLevel,
        elevated: byLevel.HIGH,
        critical: byLevel.CRITICAL,
        withControls: riskWithControls,
        needingControls: riskNeedingControls,
      },
      actions: {
        open: actionsOpen,
        late: actionsLate,
        done: actionsDone,
        byStatus,
      },
      reevaluations: { pending: 0, supported: false },
      pgr: {
        count: pgrCount,
        latest: latestPgr,
      },
      alerts,
      activity,
    };
  }

  async getInventory(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    // Mesma regra de segurança do getGheList: valida o escopo ANTES de aplicar
    // o filtro, nunca sobrescrever o "in: [...]" do RBAC sem checar primeiro.
    if (companyId) assertCompanyInScope(assignments, PERMISSIONS.PGR_READ, companyId);
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr") as {
      pgr?: Record<string, unknown>;
    } & Record<string, unknown>;
    const risks = await this.prisma.pgrRisk.findMany({
      // Um PGR excluído (soft-delete) não pode vazar aqui — mescla deletedAt: null
      // junto com o filtro de companyId (validado acima) ou o "in" já existente do RBAC.
      where: { ...where, pgr: { ...(companyId ? { companyId } : where.pgr), deletedAt: null } },
      include: {
        hazard: true,
        ghe: { include: { pgr: { select: { id: true, title: true, companyId: true, branchId: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Um PgrRisk sempre referencia um Ghe do mesmo Pgr (nunca um Ghe de LTCAT) —
    // `ghe.pgr` é seguro aqui, o `!` só contorna o tipo agora opcional pós-Fase 5.
    const companyIds = Array.from(new Set(risks.map((r) => r.ghe.pgr!.companyId)));
    const branchIds = Array.from(new Set(risks.map((r) => r.ghe.pgr!.branchId).filter((v): v is string => !!v)));
    const [companies, branches] = await Promise.all([
      companyIds.length
        ? this.prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      branchIds.length
        ? this.prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
    const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

    return risks.map((r) => ({
      id: r.id,
      companyId: r.ghe.pgr!.companyId,
      companyName: companyNameById.get(r.ghe.pgr!.companyId) ?? "—",
      branchName: r.ghe.pgr!.branchId ? (branchNameById.get(r.ghe.pgr!.branchId) ?? "—") : null,
      pgrId: r.ghe.pgr!.id,
      pgrTitle: r.ghe.pgr!.title,
      gheId: r.ghe.id,
      gheName: r.ghe.name,
      activityDescription: r.ghe.activityDescription,
      hazardId: r.hazard.id,
      hazardName: r.hazard.name,
      hazardCategory: r.hazard.category,
      riskLevel: r.riskLevel,
      classification: r.classification,
      updatedAt: r.updatedAt,
    }));
  }

  /** Lista consolidada de GHEs entre todos os PGRs em escopo — reaproveita o
   * cadastro do PGR (nenhum modelo/tabela novo), só dá uma visão própria. */
  async getGheList(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    // Valida o escopo ANTES de aplicar o filtro: o "where" de RBAC abaixo usa um
    // `pgr: { companyId: { in: [...] } }` — se a gente só sobrescrevesse essa chave
    // com `{ companyId }` sem validar antes, um companyId fora do escopo do usuário
    // passaria batido (a restrição por "in" seria descartada, não combinada).
    if (companyId) assertCompanyInScope(assignments, PERMISSIONS.PGR_READ, companyId);
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr") as {
      pgr?: Record<string, unknown>;
    } & Record<string, unknown>;
    const ghes = await this.prisma.ghe.findMany({
      // `pgrId: { not: null }` é a guarda contra GHEs de LTCAT (Fase 6): esta
      // consulta faz `g.pgr.companyId` mais abaixo, que quebraria num GHE sem
      // Pgr. Sem escopo de empresa, o filtro tenant-wide não teria essa guarda.
      where: { ...where, pgr: { ...(companyId ? { companyId } : where.pgr), deletedAt: null }, pgrId: { not: null } },
      include: {
        pgr: { select: { id: true, title: true, companyId: true } },
        functions: { select: { id: true, departmentId: true, positionId: true } },
        risks: { select: { id: true, riskLevel: true } },
      },
      orderBy: { name: "asc" },
    });

    // `pgrId: { not: null }` acima já garante que todo `g.pgr` aqui é não-nulo.
    const companyIds = Array.from(new Set(ghes.map((g) => g.pgr!.companyId)));
    const [companies, employees] = await Promise.all([
      companyIds.length
        ? this.prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      companyIds.length
        ? this.prisma.employee.findMany({
            where: { tenantId, companyId: { in: companyIds }, deletedAt: null, status: { not: "TERMINATED" } },
            select: { id: true, companyId: true, departmentId: true, positionId: true },
          })
        : Promise.resolve([]),
    ]);
    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

    return ghes.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      companyId: g.pgr!.companyId,
      companyName: companyNameById.get(g.pgr!.companyId) ?? "—",
      pgrId: g.pgr!.id,
      pgrTitle: g.pgr!.title,
      localDescription: g.localDescription,
      activityDescription: g.activityDescription,
      functionsCount: g.functions.length,
      risksCount: g.risks.length,
      criticalRisksCount: g.risks.filter((r) => r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH").length,
      employeesCount: countEmployeesForGhe(
        g.functions,
        employees.filter((e) => e.companyId === g.pgr!.companyId),
      ),
    }));
  }
}

const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "aberta",
  IN_PROGRESS: "em andamento",
  LATE: "atrasada",
  VALIDATING: "em validação",
  DONE: "concluída",
  CANCELED: "cancelada",
};
