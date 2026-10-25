import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePgrDto, GeneratePgrDto, UpdatePgrDto } from "./dto/pgr.dto";
import type { ExposureType, Prisma, RiskLevel } from "@hydra/db";
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
          renewalAt: dto.renewalAt ? new Date(dto.renewalAt) : undefined,
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

  /**
   * Gera o PGR a partir dos dados já cadastrados da empresa: cada ambiente escolhido vira um GHE, os cargos
   * ligados ao ambiente viram as funções do GHE, os riscos dos cargos viram o inventário e os cronogramas de
   * ação escolhidos viram o plano de ação.
   */
  async generate(tenantId: string, dto: GeneratePgrDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, dto.companyId);
    const company = await this.prisma.company.findFirst({ where: { id: dto.companyId, tenantId }, select: { cnae: true, grauRisco: true } });
    if (!company) throw new NotFoundException("Empresa não encontrada.");
    const environments = await this.prisma.workEnvironment.findMany({
      where: { id: { in: dto.environmentIds }, tenantId, companyId: dto.companyId, deletedAt: null },
      include: { positions: { include: { position: { include: POSITION_RISKS_INCLUDE } } } },
    });
    const schedules = dto.scheduleIds?.length
      ? await this.prisma.actionSchedule.findMany({
          where: { id: { in: dto.scheduleIds }, tenantId, companyId: dto.companyId, deletedAt: null },
          include: { items: { orderBy: { position: "asc" } } },
        })
      : [];
    const employeeCount = await this.prisma.employee.count({
      where: { tenantId, companyId: dto.companyId, deletedAt: null, status: { not: "TERMINATED" } },
    });
    const { environmentIds: _e, scheduleIds: _s, ...docFields } = dto;

    return this.prisma.$transaction(async (tx) => {
      const pgr = await tx.pgr.create({
        data: {
          ...docFields,
          cnae: company.cnae ?? undefined,
          grauRisco: company.grauRisco ?? undefined,
          employeeCount,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
          validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          renewalAt: dto.renewalAt ? new Date(dto.renewalAt) : undefined,
          scheduleIds: schedules.map((s) => s.id),
          tenantId,
          createdById: userId,
          updatedById: userId,
        },
      });

      for (const env of environments) {
        const positions = env.positions.map((l) => l.position).filter((pos) => !pos.deletedAt);
        const ghe = await tx.ghe.create({
          data: {
            tenantId,
            pgrId: pgr.id,
            name: env.name,
            localDescription: [env.description, env.location].filter(Boolean).join(" — ") || null,
            functions: {
              create: positions.map((pos) => ({ tenantId, positionId: pos.id, activityDescription: pos.description })),
            },
          },
        });
        await addRisksToGhe(tx, { tenantId, pgrId: pgr.id, gheId: ghe.id, positions, userId });
      }

      for (const sch of schedules) {
        for (const it of sch.items) {
          const last = [...it.months].sort().pop();
          await tx.pgrAction.create({
            data: {
              tenantId,
              companyId: dto.companyId,
              pgrId: pgr.id,
              description: it.why ? `${it.what} — ${it.why}` : it.what,
              dueDate: last ? endOfMonth(last) : null,
              priority: it.priority >= 4 ? 1 : it.priority === 3 || it.priority === 0 ? 2 : 3,
              createdById: userId,
              updatedById: userId,
            },
          });
        }
      }
      return pgr;
    });
  }

  /**
   * Atualiza um PGR com o cadastro atual da empresa: traz os GHEs (ambientes) que ainda não estão no PGR e,
   * para cada GHE, os riscos dos cargos que ainda não foram lançados. Nada que já existe é alterado ou duplicado.
   */
  async syncFromCompany(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_WRITE, tenantId);
    const pgr = await this.prisma.pgr.findFirst({ where: { ...where, id, deletedAt: null }, include: { ghes: true } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    const environments = await this.prisma.workEnvironment.findMany({
      where: { tenantId, companyId: pgr.companyId, deletedAt: null },
      include: { positions: { include: { position: { include: POSITION_RISKS_INCLUDE } } } },
    });
    const norm = (n: string) => n.trim().toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      let ghesAdded = 0;
      let risksAdded = 0;
      for (const env of environments) {
        const positions = env.positions.map((l) => l.position).filter((pos) => !pos.deletedAt);
        let ghe = pgr.ghes.find((g) => norm(g.name) === norm(env.name));
        if (!ghe) {
          ghe = await tx.ghe.create({
            data: {
              tenantId,
              pgrId: pgr.id,
              name: env.name,
              localDescription: [env.description, env.location].filter(Boolean).join(" — ") || null,
              functions: { create: positions.map((pos) => ({ tenantId, positionId: pos.id, activityDescription: pos.description })) },
            },
          });
          ghesAdded++;
        } else {
          const have = new Set((await tx.gheFunction.findMany({ where: { gheId: ghe.id }, select: { positionId: true } })).map((f) => f.positionId));
          const fresh = positions.filter((pos) => !have.has(pos.id));
          if (fresh.length) {
            await tx.gheFunction.createMany({ data: fresh.map((pos) => ({ tenantId, gheId: ghe!.id, positionId: pos.id, activityDescription: pos.description })) });
          }
        }
        risksAdded += await addRisksToGhe(tx, { tenantId, pgrId: pgr.id, gheId: ghe.id, positions, userId });
      }
      return { ghesAdded, risksAdded };
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
        renewalAt: dto.renewalAt ? new Date(dto.renewalAt) : undefined,
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


/** Matriz 5x5 (linha = probabilidade, coluna = severidade) → nível de 1 a 5, a mesma da tela de avaliação do cargo. */
const RISK_GRID = [
  [1, 1, 2, 3, 3],
  [1, 2, 3, 3, 4],
  [1, 2, 3, 4, 5],
  [2, 2, 3, 4, 5],
  [2, 3, 4, 5, 5],
];
const LEVEL_TO_ENUM: Record<number, RiskLevel> = { 1: "IRRELEVANT", 2: "LOW", 3: "MEDIUM", 4: "HIGH", 5: "CRITICAL" };
const LEVEL_CLASSIFICATION: Record<number, string> = { 1: "Aceitável", 2: "Tolerável", 3: "Moderado", 4: "Substancial", 5: "Intolerável" };

function positionRiskLevel(probability: number | null, severity: number | null): number | null {
  return probability && severity ? RISK_GRID[probability - 1]![severity - 1]! : null;
}

/** Último dia do mês "AAAA-MM". */
function endOfMonth(ym: string): Date {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0));
}


const POSITION_RISKS_INCLUDE = {
  risks: { include: { hazard: true, protection: { include: { equipment: { select: { name: true, kind: true } } } } } },
} as const;

type PositionWithRisks = Prisma.PositionGetPayload<{ include: typeof POSITION_RISKS_INCLUDE }>;

/**
 * Lança no GHE os riscos dos cargos (um por perigo; vale o de maior nível). Perigos que o GHE já tem são pulados.
 * Devolve quantos riscos foram criados.
 */
async function addRisksToGhe(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; pgrId: string; gheId: string; positions: PositionWithRisks[]; userId: string },
): Promise<number> {
  const { tenantId, pgrId, gheId, positions, userId } = args;
  const present = new Set((await tx.pgrRisk.findMany({ where: { gheId }, select: { hazardId: true } })).map((r) => r.hazardId));
  const byHazard = new Map<string, { risk: PositionWithRisks["risks"][number]; level: number }>();
  for (const pos of positions) {
    for (const r of pos.risks) {
      if (present.has(r.hazardId)) continue;
      const level = positionRiskLevel(r.probability, r.severity) ?? 0;
      const cur = byHazard.get(r.hazardId);
      if (!cur || level > cur.level) byHazard.set(r.hazardId, { risk: r, level });
    }
  }
  for (const { risk: r, level } of byHazard.values()) {
    const names = (kind: "EPC" | "EPI") => r.protection.filter((p) => p.equipment.kind === kind).map((p) => p.equipment.name).join("; ") || null;
    await tx.pgrRisk.create({
      data: {
        tenantId,
        pgrId,
        gheId,
        hazardId: r.hazardId,
        description: r.description,
        typicalInjuries: r.damagePotential,
        sourceCircumstances: r.sourceCircumstances,
        exposureType: r.exposureType as ExposureType | null,
        evaluationCriteria: r.measurementType,
        probability: r.probability ?? 1,
        severity: r.severity ?? 1,
        riskLevel: LEVEL_TO_ENUM[level] ?? "IRRELEVANT",
        classification: level ? LEVEL_CLASSIFICATION[level] : "Não avaliado",
        adminControls: r.adminMeasures,
        epcMeasures: names("EPC"),
        epiMeasures: names("EPI"),
        usesEpc: r.epcStatus,
        usesEpi: r.epiStatus,
        createdById: userId,
        updatedById: userId,
      },
    });
  }
  return byHazard.size;
}
