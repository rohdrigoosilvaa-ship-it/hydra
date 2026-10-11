import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePgrDto, UpdatePgrDto } from "./dto/pgr.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import { copyGheStructure } from "./ghe-copy.util";

@Injectable()
export class PgrService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId);
    return this.prisma.pgr.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      include: { _count: { select: { risks: true, actions: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId);
    const pgr = await this.prisma.pgr.findFirst({
      where: { ...where, id, deletedAt: null },
      include: {
        ghes: { include: { functions: { include: { department: true, position: true } } } },
        risks: { include: { hazard: true, ghe: true } },
        actions: true,
        cronograma: { include: { marks: true }, orderBy: { order: "asc" } },
      },
    });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    const attachmentsCount = await this.prisma.evidence.count({
      where: { tenantId, sourceType: "PGR", sourceId: id },
    });

    // Colaboradores "pertencentes" a um GHE = funcionários da mesma empresa cujo
    // setor+cargo batem com algum vínculo (GheFunction) daquele GHE. Buscamos os
    // funcionários uma única vez e casamos em memória, em vez de uma query por GHE.
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, companyId: pgr.companyId, deletedAt: null, status: { not: "TERMINATED" } },
      select: { id: true, departmentId: true, positionId: true },
    });
    const ghes = pgr.ghes.map((ghe) => ({
      ...ghe,
      employeesCount: countEmployeesForGhe(ghe.functions, employees),
    }));

    return { ...pgr, ghes, progressPercent: computeProgressPercent(pgr, attachmentsCount) };
  }

  async create(tenantId: string, dto: CreatePgrDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, dto.companyId);

    // PGR mais recente da mesma empresa — se existir, seus GHEs e vínculos de
    // Setor/Cargo são copiados pro PGR novo (não os riscos: cada revisão avalia
    // riscos do zero, só a estrutura de GHE não precisa ser retrabalhada à mão).
    const previousPgr = await this.prisma.pgr.findFirst({
      where: { tenantId, companyId: dto.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { ghes: { include: { functions: true } } },
    });

    // Snapshot da empresa (CNAE / grau de risco / nº de colaboradores): o PGR é um
    // documento datado, então não acompanha edições posteriores do cadastro.
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId },
      select: { cnae: true, grauRisco: true },
    });
    const employeeCount = await this.prisma.employee.count({
      where: { tenantId, companyId: dto.companyId, deletedAt: null, status: { not: "TERMINATED" } },
    });

    return this.prisma.$transaction(async (tx) => {
      const pgr = await tx.pgr.create({
        data: {
          ...dto,
          cnae: company?.cnae ?? undefined,
          grauRisco: company?.grauRisco ?? undefined,
          employeeCount,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
          validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          tenantId,
          createdById: userId,
          updatedById: userId,
        },
      });

      if (previousPgr) {
        await copyGheStructure(tx, tenantId, previousPgr.ghes, { pgrId: pgr.id });
      }

      return pgr;
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePgrDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_WRITE, tenantId);
    const pgr = await this.prisma.pgr.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    return this.prisma.pgr.update({
      where: { id },
      data: {
        ...dto,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        updatedById: userId,
      },
    });
  }

  /** Soft-delete — os GHEs/riscos/ações continuam no banco, só ficam inacessíveis
   * porque nada mais navega até um PGR com `deletedAt` preenchido. */
  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_WRITE, tenantId);
    const pgr = await this.prisma.pgr.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    await this.prisma.pgr.update({ where: { id }, data: { deletedAt: new Date(), updatedById: userId } });
    return { success: true };
  }

  /** Só um PGR em revisão pode ser aprovado — vira a versão vigente. */
  async approve(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_APPROVE, tenantId);
    const pgr = await this.prisma.pgr.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    if (pgr.status === "APPROVED") {
      throw new ForbiddenException("Este PGR já está aprovado.");
    }
    return this.prisma.pgr.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: userId, updatedById: userId },
    });
  }
}

const hasText = (v: string | null | undefined) => !!v && v.trim().length > 0;

/** Progresso = abas preenchidas / 6 (Dados gerais, GHE, Inventário, Plano de ações,
 * Cronograma, Finalização). */
function computeProgressPercent(
  pgr: {
    validFrom: Date | null;
    validUntil: Date | null;
    technicalResponsibleName: string | null;
    procedimentoTrabalho: string | null;
    treinamentosNecessarios: string | null;
    episRecomendados: string | null;
    metasPrioridades: string | null;
    consideracoesFinais: string | null;
    ghes: unknown[];
    risks: unknown[];
    actions: unknown[];
    cronograma: unknown[];
  },
  attachmentsCount: number,
): number {
  const steps = [
    !!pgr.validFrom && !!pgr.validUntil && hasText(pgr.technicalResponsibleName),
    pgr.ghes.length > 0,
    pgr.risks.length > 0,
    pgr.actions.length > 0 ||
      [pgr.procedimentoTrabalho, pgr.treinamentosNecessarios, pgr.episRecomendados, pgr.metasPrioridades].some(hasText),
    pgr.cronograma.length > 0,
    hasText(pgr.consideracoesFinais) || attachmentsCount > 0,
  ];
  return Math.round((steps.filter(Boolean).length / steps.length) * 100);
}

interface EmployeeForMatch {
  id: string;
  departmentId: string | null;
  positionId: string | null;
}
interface GheFunctionForMatch {
  departmentId: string | null;
  positionId: string | null;
}

/**
 * Um funcionário "pertence" a uma função (GheFunction) quando bate com todo lado
 * preenchido do vínculo — setor e/ou cargo. Uma função sem setor nem cargo não
 * identifica ninguém, então não conta. Reaproveitado pela Ordem de Serviço pra
 * achar os GHEs (e riscos) da função de um colaborador específico.
 */
export function employeeMatchesAnyFunction(functions: GheFunctionForMatch[], employee: EmployeeForMatch): boolean {
  return functions.some((fn) => {
    if (!fn.departmentId && !fn.positionId) return false;
    if (fn.departmentId && employee.departmentId !== fn.departmentId) return false;
    if (fn.positionId && employee.positionId !== fn.positionId) return false;
    return true;
  });
}

/** Deduplicamos por employee.id porque um mesmo funcionário pode bater com mais de uma função do mesmo GHE. */
export function countEmployeesForGhe(functions: GheFunctionForMatch[], employees: EmployeeForMatch[]): number {
  const matched = new Set<string>();
  for (const emp of employees) {
    if (employeeMatchesAnyFunction(functions, emp)) matched.add(emp.id);
  }
  return matched.size;
}
