import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { del, put } from "@vercel/blob";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateCompanyDto } from "./dto/org.dto";
import { lastMonths } from "../dashboard/monthly-series.util";
import { allowedCompanyIds, employeeScopeWhere, hasTenantWideAccess, isCompanyInScope } from "./scope.util";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = this.scopedIdWhere(tenantId, assignments, PERMISSIONS.ORG_COMPANY_READ);
    return this.prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  /** Lista com a quantidade de funcionários ativos, cargos ativos e GHEs de cada empresa (para os cards da tela Empresas). */
  async listWithCounts(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const companies = await this.list(tenantId, assignments);
    const employeeScope = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);
    return Promise.all(
      companies.map(async (company) => {
        const [employees, positions, ghes] = await Promise.all([
          this.prisma.employee.count({ where: { ...employeeScope, companyId: company.id, status: "ACTIVE" } }),
          this.prisma.position.count({ where: { tenantId, companyId: company.id, deletedAt: null, status: "ACTIVE" } }),
          this.prisma.workEnvironment.count({ where: { tenantId, companyId: company.id, deletedAt: null } }),
        ]);
        const openStatuses = ["OPEN", "IN_PROGRESS", "LATE", "VALIDATING"] as const;
        const [pendingActions, priorityRisks, pgr] = await Promise.all([
          this.prisma.pgrAction.count({ where: { tenantId, companyId: company.id, status: { in: [...openStatuses] } } }),
          this.prisma.pgrRisk.count({
            where: { tenantId, riskLevel: { in: ["HIGH", "CRITICAL"] }, pgr: { companyId: company.id, deletedAt: null } },
          }),
          this.prisma.pgr.findFirst({
            where: { tenantId, companyId: company.id, deletedAt: null },
            orderBy: { updatedAt: "desc" },
            select: { id: true, title: true, status: true, updatedAt: true },
          }),
        ]);
        return { ...company, counts: { employees, positions, ghes, pendingActions, priorityRisks }, pgr };
      }),
    );
  }

  /** Números do painel da empresa (aba Dashboard). */
  async summary(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const company = await this.get(tenantId, id, assignments);
    const employeeScope = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);
    const [positions, ghes, lives, esocialEvents, asos, cats, absent, draftPgr, draftLtcat] = await Promise.all([
      this.prisma.position.count({ where: { tenantId, companyId: id, deletedAt: null, status: "ACTIVE" } }),
      this.prisma.workEnvironment.count({ where: { tenantId, companyId: id, deletedAt: null } }),
      this.prisma.employee.count({ where: { ...employeeScope, companyId: id, status: "ACTIVE" } }),
      this.prisma.esocialEvent.count({ where: { tenantId, companyId: id } }),
      this.prisma.aso.count({ where: { tenantId, exam: { employee: { companyId: id } } } }),
      this.prisma.cat.count({ where: { tenantId, occurrence: { companyId: id } } }),
      this.prisma.employee.count({ where: { ...employeeScope, companyId: id, status: "ON_LEAVE" } }),
      this.prisma.pgr.count({ where: { tenantId, companyId: id, deletedAt: null, status: "DRAFT" } }),
      this.prisma.ltcat.count({ where: { tenantId, companyId: id, deletedAt: null, status: "DRAFT" } }),
    ]);
    const months = lastMonths(6);
    const since = months[0]!.start;
    const [recentEsocial, openActions, totalActions, environments, pgr] = await Promise.all([
      this.prisma.esocialEvent.count({ where: { tenantId, companyId: id, createdAt: { gte: since } } }),
      this.prisma.pgrAction.count({ where: { tenantId, companyId: id, status: { in: ["OPEN", "IN_PROGRESS", "LATE", "VALIDATING"] } } }),
      this.prisma.pgrAction.count({ where: { tenantId, companyId: id } }),
      this.prisma.workEnvironment.count({ where: { tenantId, companyId: id, deletedAt: null } }),
      this.prisma.pgr.findFirst({
        where: { tenantId, companyId: id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true },
      }),
    ]);
    const pgrProgress = pgr ? await this.pgrProgress(tenantId, pgr) : null;
    const asosByMonth = await Promise.all(
      months.map(async (m) => ({
        label: m.label,
        value: await this.prisma.aso.count({
          where: { tenantId, issuedAt: { gte: m.start, lt: m.end }, exam: { employee: { companyId: id } } },
        }),
      })),
    );
    const catsByMonth = await Promise.all(
      months.map(async (m) => ({
        label: m.label,
        value: await this.prisma.cat.count({
          where: { tenantId, createdAt: { gte: m.start, lt: m.end }, occurrence: { companyId: id } },
        }),
      })),
    );
    const contracted = company.contractedLives ?? null;
    return {
      esocialEventsRecent: recentEsocial,
      actions: { open: openActions, total: totalActions },
      environments,
      pgr: pgrProgress,
      asosByMonth,
      catsByMonth,
      positions,
      ghes,
      lives,
      contractedLives: contracted,
      excessLives: contracted === null ? null : Math.max(0, lives - contracted),
      esocialEvents,
      asos,
      cats,
      absentEmployees: absent,
      draftDocuments: draftPgr + draftLtcat,
    };
  }

  /** Andamento do PGR em 6 etapas, para o banner "PGR em andamento" do painel da empresa. */
  private async pgrProgress(tenantId: string, pgr: { id: string; title: string; status: string }) {
    const [ghes, risks, actions, cronograma] = await Promise.all([
      this.prisma.ghe.count({ where: { tenantId, pgrId: pgr.id } }),
      this.prisma.pgrRisk.count({ where: { tenantId, pgrId: pgr.id } }),
      this.prisma.pgrAction.count({ where: { tenantId, pgrId: pgr.id } }),
      this.prisma.pgrCronogramaItem.count({ where: { tenantId, pgrId: pgr.id } }),
    ]);
    const steps = [
      { label: "Dados gerais", done: true },
      { label: "GHE", done: ghes > 0 },
      { label: "Inventário de riscos", done: risks > 0 },
      { label: "Plano de ações", done: actions > 0 },
      { label: "Cronograma", done: cronograma > 0 },
      { label: "Finalização", done: pgr.status === "APPROVED" },
    ];
    const done = steps.filter((s) => s.done).length;
    const lastDone = [...steps].reverse().find((s) => s.done)?.label ?? null;
    const next = steps.find((s) => !s.done)?.label ?? null;
    return { id: pgr.id, title: pgr.title, status: pgr.status, percent: Math.round((done / steps.length) * 100), lastDone, next };
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    if (!isCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_READ, id)) {
      throw new NotFoundException("Empresa não encontrada.");
    }
    const company = await this.prisma.company.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!company) throw new NotFoundException("Empresa não encontrada.");
    return this.attachAuditNames(company);
  }

  /** Só administradores com escopo TENANT podem cadastrar novas empresas. */
  create(tenantId: string, dto: CreateCompanyDto, userId: string, assignments: RoleAssignmentClaim[]) {
    if (!hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_WRITE)) {
      throw new ForbiddenException("Apenas administradores podem cadastrar novas empresas.");
    }
    return this.prisma.company.create({
      data: {
        ...dto,
        dataContrato: dto.dataContrato ? new Date(dto.dataContrato) : undefined,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateCompanyDto>,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.get(tenantId, id, assignments);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        dataContrato: dto.dataContrato ? new Date(dto.dataContrato) : undefined,
        updatedById: userId,
      },
    });
  }

  /** Só administradores com escopo TENANT podem remover empresas. */
  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    if (!hasTenantWideAccess(assignments, PERMISSIONS.ORG_COMPANY_WRITE)) {
      throw new ForbiddenException("Apenas administradores podem remover empresas.");
    }
    await this.get(tenantId, id, assignments);
    return this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  async uploadLogo(
    tenantId: string,
    id: string,
    file: Express.Multer.File,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const company = await this.get(tenantId, id, assignments);
    if (company.logoUrl) await del(company.logoUrl);
    const pathname = `company-logos/${tenantId}/${id}/${Date.now()}-${file.originalname}`;
    const blob = await put(pathname, file.buffer, { access: "public", contentType: file.mimetype });
    return this.prisma.company.update({
      where: { id },
      data: { logoUrl: blob.url, updatedById: userId },
    });
  }

  async removeLogo(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const company = await this.get(tenantId, id, assignments);
    if (company.logoUrl) await del(company.logoUrl);
    return this.prisma.company.update({
      where: { id },
      data: { logoUrl: null, updatedById: userId },
    });
  }

  /**
   * Para Company, o "companyId" do escopo É o próprio `id` do registro —
   * por isso não dá para reaproveitar `companyScopeWhere` (que espera um
   * campo `companyId` estrangeiro); filtramos por `id: { in: [...] }`.
   */
  private scopedIdWhere(tenantId: string, assignments: RoleAssignmentClaim[], permission: typeof PERMISSIONS.ORG_COMPANY_READ) {
    const base = { tenantId, deletedAt: null } as const;
    if (hasTenantWideAccess(assignments, permission)) return base;
    return { ...base, id: { in: allowedCompanyIds(assignments, permission) } };
  }

  /**
   * createdById/updatedById são apenas strings (sem relação no Prisma —
   * mesmo padrão de Employee, ver comentário no schema), então o nome
   * precisa ser resolvido manualmente para a seção "Log" da ficha da empresa.
   */
  private async attachAuditNames<T extends { createdById: string | null; updatedById: string | null }>(
    company: T,
  ) {
    const ids = [company.createdById, company.updatedById].filter((v): v is string => !!v);
    if (ids.length === 0) return { ...company, createdByName: null, updatedByName: null };

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string | null) => (id ? (users.find((u) => u.id === id)?.name ?? null) : null);

    return {
      ...company,
      createdByName: nameOf(company.createdById),
      updatedByName: nameOf(company.updatedById),
    };
  }
}
