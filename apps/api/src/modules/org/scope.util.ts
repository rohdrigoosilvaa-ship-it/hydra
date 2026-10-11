import { ForbiddenException } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { roleGrants, type Permission } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";

/**
 * Traduz os vínculos (papel + escopo) do usuário num filtro Prisma para
 * `employees` — é aqui que o RBAC "com escopo" da seção 08 vira código:
 * um GESTOR_SST vinculado só a uma filial não deve conseguir listar
 * colaboradores de outra, mesmo tendo a permissão de leitura.
 */
export function employeeScopeWhere(
  assignments: RoleAssignmentClaim[],
  permission: Permission,
  tenantId: string,
): Prisma.EmployeeWhereInput {
  const granting = assignments.filter((a) => roleGrants(a.role, permission));

  const hasTenantWideAccess = granting.some((a) => a.scopeType === "TENANT");
  if (hasTenantWideAccess) {
    return { tenantId, deletedAt: null };
  }

  const companyIds = granting.filter((a) => a.scopeType === "COMPANY" && a.scopeId).map((a) => a.scopeId as string);
  const branchIds = granting.filter((a) => a.scopeType === "BRANCH" && a.scopeId).map((a) => a.scopeId as string);
  const unitIds = granting.filter((a) => a.scopeType === "UNIT" && a.scopeId).map((a) => a.scopeId as string);

  return {
    tenantId,
    deletedAt: null,
    OR: [
      companyIds.length ? { companyId: { in: companyIds } } : undefined,
      branchIds.length ? { branchId: { in: branchIds } } : undefined,
      unitIds.length ? { unitId: { in: unitIds } } : undefined,
    ].filter(Boolean) as Prisma.EmployeeWhereInput[],
  };
}

/** true se algum vínculo do usuário concede `permission` em escopo TENANT (acesso a todas as empresas). */
export function hasTenantWideAccess(assignments: RoleAssignmentClaim[], permission: Permission): boolean {
  return assignments.some((a) => a.scopeType === "TENANT" && roleGrants(a.role, permission));
}

/** IDs de empresa aos quais o usuário tem acesso, para essa permissão específica. */
export function allowedCompanyIds(assignments: RoleAssignmentClaim[], permission: Permission): string[] {
  return assignments
    .filter((a) => a.scopeType === "COMPANY" && a.scopeId && roleGrants(a.role, permission))
    .map((a) => a.scopeId as string);
}

/**
 * Cláusula WHERE genérica para qualquer model com `companyId` direto —
 * generaliza o padrão de `employeeScopeWhere` para os demais ~20 módulos
 * (PGR, Saúde, Ocorrências, CIPA, LTCAT, Previdenciário, Financeiro, etc.).
 * Sem acesso TENANT, restringe às empresas do vínculo — se nenhuma, `in: []`
 * garante zero resultados (nunca "sem filtro" por omissão).
 */
export function companyScopeWhere(
  assignments: RoleAssignmentClaim[],
  permission: Permission,
  tenantId: string,
): { tenantId: string; companyId: { in: string[] } } | { tenantId: string } {
  if (hasTenantWideAccess(assignments, permission)) return { tenantId };
  return { tenantId, companyId: { in: allowedCompanyIds(assignments, permission) } };
}

/**
 * Mesma lógica de `companyScopeWhere`, para models sem `companyId` próprio
 * que precisam filtrar via relação (ex.: PgrRisk → pgr.companyId,
 * MedicalExam → employee.companyId).
 */
export function relatedCompanyScopeWhere(
  assignments: RoleAssignmentClaim[],
  permission: Permission,
  tenantId: string,
  relation: string,
): Record<string, unknown> {
  if (hasTenantWideAccess(assignments, permission)) return { tenantId };
  return { tenantId, [relation]: { companyId: { in: allowedCompanyIds(assignments, permission) } } };
}

/** true se o usuário tem acesso (nessa permissão) à empresa informada. */
export function isCompanyInScope(
  assignments: RoleAssignmentClaim[],
  permission: Permission,
  companyId: string,
): boolean {
  return hasTenantWideAccess(assignments, permission) || allowedCompanyIds(assignments, permission).includes(companyId);
}

/**
 * Usar em `create()`: o `companyId` vem do corpo da requisição (nunca confiável
 * por si só) — precisa ser validado contra o escopo do usuário autenticado.
 */
export function assertCompanyInScope(
  assignments: RoleAssignmentClaim[],
  permission: Permission,
  companyId: string,
): void {
  if (!isCompanyInScope(assignments, permission, companyId)) {
    throw new ForbiddenException("Você não tem acesso a esta empresa.");
  }
}
