import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import { allowedCompanyIds, companyScopeWhere, employeeScopeWhere, hasTenantWideAccess, relatedCompanyScopeWhere } from "../org/scope.util";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { lastMonths, type MonthPoint } from "./monthly-series.util";

export interface CompanySummary {
  id: string;
  name: string;
  employeeCount: number;
  lateActionsCount: number;
  monthIncidentsCount: number;
}

export interface ExecutiveSummary {
  /** ASOs emitidos e incidentes por mês (últimos 6 meses). */
  asosByMonth: MonthPoint[];
  incidentsByMonth: MonthPoint[];
  activeCompanies: number;
  activeEmployees: number;
  ghes: number;
  positions: number;
  employees: number;
  complianceRate: number | null;
  incidentsThisMonth: number;
  pendingActions: number;
  trainingsExpiringSoon: number;
  documentsNeedingAttention: number;
  criticalRisks: number;
  audits: null;
  generatedAt: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async companiesSummary(tenantId: string, assignments: RoleAssignmentClaim[]): Promise<CompanySummary[]> {
    const companyWhere = hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_READ)
      ? { tenantId, deletedAt: null }
      : { tenantId, deletedAt: null, id: { in: allowedCompanyIds(assignments, PERMISSIONS.ORG_COMPANY_READ) } };
    const companies = await this.prisma.company.findMany({
      where: companyWhere,
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const employeeScope = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);

    return Promise.all(
      companies.map(async (company) => {
        const [employeeCount, lateActionsCount, monthIncidentsCount] = await Promise.all([
          this.prisma.employee.count({ where: { ...employeeScope, companyId: company.id } }),
          this.prisma.pgrAction.count({
            where: {
              tenantId,
              companyId: company.id,
              OR: [
                { status: "LATE" },
                { status: { notIn: ["DONE", "CANCELED", "LATE"] }, dueDate: { lt: now } },
              ],
            },
          }),
          this.prisma.occurrence.count({
            where: {
              tenantId,
              companyId: company.id,
              deletedAt: null,
              occurredAt: { gte: monthStart, lt: monthEnd },
            },
          }),
        ]);

        return { id: company.id, name: company.name, employeeCount, lateActionsCount, monthIncidentsCount };
      }),
    );
  }

  /**
   * KPIs do dashboard executivo. "Conformidade" é calculada como % de
   * documentos de colaboradores ainda não vencidos (proxy real, não um
   * índice legal formal). "Auditorias" não tem modelo no sistema ainda —
   * retorna null em vez de inventar um número.
   */
  async executiveSummary(tenantId: string, assignments: RoleAssignmentClaim[]): Promise<ExecutiveSummary> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const employeeScope = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);
    const actionWhere = companyScopeWhere(assignments, PERMISSIONS.PGR_ACTION_READ, tenantId);
    const docWhere = companyScopeWhere(assignments, PERMISSIONS.EMPLOYEE_DOCUMENT_READ, tenantId);
    const riskWhere = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr");
    const occurrenceWhere = hasTenantWideAccess(assignments, PERMISSIONS.OCCURRENCE_READ)
      ? { tenantId }
      : { tenantId, companyId: { in: allowedCompanyIds(assignments, PERMISSIONS.OCCURRENCE_READ) } };

    const companyWhere = hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_READ)
      ? { tenantId, deletedAt: null, status: "ACTIVE" as const }
      : { tenantId, deletedAt: null, status: "ACTIVE" as const, id: { in: allowedCompanyIds(assignments, PERMISSIONS.ORG_COMPANY_READ) } };
    const positionWhere = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);

    const [
      activeCompanies,
      activeEmployees,
      ghes,
      positions,
      employees,
      pendingActions,
      incidentsThisMonth,
      criticalRisks,
      docsWithExpiry,
      docsExpired,
      trainingsExpiringSoon,
      documentsNeedingAttention,
    ] = await Promise.all([
      this.prisma.company.count({ where: companyWhere }),
      this.prisma.employee.count({ where: { ...employeeScope, status: "ACTIVE" } }),
      this.prisma.ghe.count({ where: { ...riskWhere, pgrId: { not: null } } }),
      this.prisma.position.count({ where: { ...positionWhere, deletedAt: null, status: "ACTIVE" } }),
      this.prisma.employee.count({ where: employeeScope }),
      this.prisma.pgrAction.count({ where: { ...actionWhere, status: { notIn: ["DONE", "CANCELED"] } } }),
      this.prisma.occurrence.count({
        where: { ...occurrenceWhere, deletedAt: null, occurredAt: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.pgrRisk.count({ where: { ...riskWhere, riskLevel: "CRITICAL" } }),
      this.prisma.employeeDocument.count({ where: { ...docWhere, expiryDate: { not: null } } }),
      this.prisma.employeeDocument.count({ where: { ...docWhere, expiryDate: { lt: now } } }),
      this.prisma.employeeDocument.count({
        where: { ...docWhere, type: "TREINAMENTO", expiryDate: { not: null, lt: in30Days } },
      }),
      this.prisma.employeeDocument.count({ where: { ...docWhere, expiryDate: { not: null, lt: in30Days } } }),
    ]);

    const months = lastMonths(6, now);
    const asosByMonth = await Promise.all(
      months.map(async (m) => ({
        label: m.label,
        value: await this.prisma.aso.count({
          where: { tenantId, issuedAt: { gte: m.start, lt: m.end }, exam: { employee: employeeScope } },
        }),
      })),
    );
    const incidentsByMonth = await Promise.all(
      months.map(async (m) => ({
        label: m.label,
        value: await this.prisma.occurrence.count({
          where: { ...occurrenceWhere, deletedAt: null, occurredAt: { gte: m.start, lt: m.end } },
        }),
      })),
    );

    const complianceRate = docsWithExpiry > 0 ? Math.round(((docsWithExpiry - docsExpired) / docsWithExpiry) * 100) : null;

    return {
      asosByMonth,
      incidentsByMonth,
      activeCompanies,
      activeEmployees,
      ghes,
      positions,
      employees,
      complianceRate,
      incidentsThisMonth,
      pendingActions,
      trainingsExpiringSoon,
      documentsNeedingAttention,
      criticalRisks,
      audits: null,
      generatedAt: now.toISOString(),
    };
  }
}
