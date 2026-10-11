import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS, roleGrants } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { employeeScopeWhere, companyScopeWhere, relatedCompanyScopeWhere } from "../org/scope.util";

export interface SearchResult {
  type: string;
  label: string;
  sublabel: string | null;
  link: string;
}

const LIMIT_PER_TYPE = 5;

function hasAny(assignments: RoleAssignmentClaim[], permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  return assignments.some((a) => roleGrants(a.role, permission));
}

/**
 * Busca global — cobre as entidades que já têm cadastro real hoje
 * (Funcionário, Unidade, Setor, Cargo, GHE, Perigo/Risco, PGR). Documento,
 * Ação, Incidente, Treinamento, PPP e LTCAT ainda não têm indexação própria
 * e ficam de fora por enquanto, em vez de fingir resultado.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, assignments: RoleAssignmentClaim[], q: string): Promise<SearchResult[]> {
    const query = q.trim();
    if (query.length < 2) return [];

    const results: SearchResult[] = [];
    const contains = { contains: query, mode: "insensitive" as const };

    if (hasAny(assignments, PERMISSIONS.ORG_EMPLOYEE_READ)) {
      const where = employeeScopeWhere(assignments, PERMISSIONS.ORG_EMPLOYEE_READ, tenantId);
      const employees = await this.prisma.employee.findMany({
        where: { ...where, name: contains },
        select: { id: true, name: true, position: { select: { name: true } }, department: { select: { name: true } } },
        take: LIMIT_PER_TYPE,
      });
      for (const e of employees) {
        results.push({
          type: "Funcionário",
          label: e.name,
          sublabel: [e.position?.name, e.department?.name].filter(Boolean).join(" · ") || null,
          link: `/cadastros/estrutura/funcionarios/${e.id}`,
        });
      }
    }

    if (hasAny(assignments, PERMISSIONS.ORG_BRANCH_READ)) {
      const where = companyScopeWhere(assignments, PERMISSIONS.ORG_BRANCH_READ, tenantId);
      const branches = await this.prisma.branch.findMany({
        where: { ...where, name: contains },
        select: { id: true, name: true },
        take: LIMIT_PER_TYPE,
      });
      for (const b of branches) {
        results.push({ type: "Unidade", label: b.name, sublabel: null, link: "/cadastros/estrutura/unidades" });
      }
    }

    if (hasAny(assignments, PERMISSIONS.ORG_DEPARTMENT_READ)) {
      const where = companyScopeWhere(assignments, PERMISSIONS.ORG_DEPARTMENT_READ, tenantId);
      const departments = await this.prisma.department.findMany({
        where: { ...where, name: contains },
        select: { id: true, name: true },
        take: LIMIT_PER_TYPE,
      });
      for (const d of departments) {
        results.push({ type: "Setor", label: d.name, sublabel: null, link: "/cadastros/estrutura/setores" });
      }
    }

    if (hasAny(assignments, PERMISSIONS.ORG_POSITION_READ)) {
      const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
      const positions = await this.prisma.position.findMany({
        where: { ...where, name: contains },
        select: { id: true, name: true },
        take: LIMIT_PER_TYPE,
      });
      for (const p of positions) {
        results.push({ type: "Cargo", label: p.name, sublabel: null, link: "/cadastros/estrutura/cargos" });
      }
    }

    if (hasAny(assignments, PERMISSIONS.PGR_READ)) {
      const pgrWhere = companyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId);
      const pgrs = await this.prisma.pgr.findMany({
        where: { ...pgrWhere, deletedAt: null, title: contains },
        select: { id: true, title: true, code: true },
        take: LIMIT_PER_TYPE,
      });
      for (const p of pgrs) {
        results.push({ type: "PGR", label: p.title, sublabel: p.code, link: `/pgr/${p.id}` });
      }

      const gheWhere = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr");
      const ghes = await this.prisma.ghe.findMany({
        // pgrId: { not: null } — a busca por GHE é sobre GHEs de PGR; GHEs de
        // LTCAT (Fase 6) não têm `pgr` e não fazem sentido nesta busca.
        where: { ...gheWhere, name: contains, pgrId: { not: null } },
        select: { id: true, name: true, pgr: { select: { title: true } } },
        take: LIMIT_PER_TYPE,
      });
      for (const g of ghes) {
        results.push({ type: "GHE", label: g.name, sublabel: g.pgr!.title, link: "/nr01/ghe" });
      }

      const hazards = await this.prisma.hazard.findMany({
        where: { tenantId, deletedAt: null, name: contains },
        select: { id: true, name: true, category: true },
        take: LIMIT_PER_TYPE,
      });
      for (const h of hazards) {
        results.push({ type: "Perigo/Risco", label: h.name, sublabel: h.category, link: "/nr01/inventario" });
      }
    }

    return results;
  }
}
