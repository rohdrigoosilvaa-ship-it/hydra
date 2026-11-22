import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePgrRiskDto, UpdatePgrRiskDto } from "./dto/pgr.dto";
import { NOT_EVALUATED, computeRiskLevel, riskClassification } from "./risk-level.util";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

/** Probabilidade e severidade → nível e classificação; sem os dois, o risco fica "não avaliado" (nunca "aceitável"). */
function evaluate(probability: number | null | undefined, severity: number | null | undefined) {
  if (probability == null || severity == null) return { ...NOT_EVALUATED };
  const level = computeRiskLevel(probability, severity);
  return { probability, severity, riskLevel: level, classification: riskClassification(level), evaluated: true };
}

@Injectable()
export class PgrRisksService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], pgrId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr") as {
      pgr?: Record<string, unknown>;
    } & Record<string, unknown>;
    return this.prisma.pgrRisk.findMany({
      where: { ...where, pgr: { ...where.pgr, deletedAt: null }, ...(pgrId ? { pgrId } : {}) },
      include: { hazard: true, ghe: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(tenantId: string, dto: CreatePgrRiskDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const pgr = await this.prisma.pgr.findFirst({ where: { id: dto.pgrId, tenantId, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, pgr.companyId);

    return this.prisma.pgrRisk.create({
      data: {
        ...dto,
        ...evaluate(dto.probability, dto.severity),
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
      include: { hazard: true, ghe: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePgrRiskDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const risk = await this.prisma.pgrRisk.findFirst({ where: { id, tenantId }, include: { pgr: true } });
    if (!risk) throw new NotFoundException("Risco não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, risk.pgr.companyId);

    // valor não enviado mantém o atual (se o risco já estava avaliado); null ou vazio volta para "não avaliado"
    const probability = dto.probability === undefined ? (risk.evaluated ? risk.probability : null) : dto.probability;
    const severity = dto.severity === undefined ? (risk.evaluated ? risk.severity : null) : dto.severity;

    return this.prisma.pgrRisk.update({
      where: { id },
      data: {
        ...dto,
        ...evaluate(probability, severity),
        updatedById: userId,
      },
      include: { hazard: true, ghe: true },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const risk = await this.prisma.pgrRisk.findFirst({ where: { id, tenantId }, include: { pgr: true } });
    if (!risk) throw new NotFoundException("Risco não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, risk.pgr.companyId);

    // Ações do plano de ação ligadas a este risco não são apagadas — só
    // desvinculadas, já que podem continuar valendo como ação avulsa
    // (PgrAction.pgrRiskId é opcional exatamente para permitir isso).
    await this.prisma.pgrAction.updateMany({ where: { pgrRiskId: id }, data: { pgrRiskId: null } });
    await this.prisma.pgrRisk.delete({ where: { id } });
    return { ok: true };
  }
}
