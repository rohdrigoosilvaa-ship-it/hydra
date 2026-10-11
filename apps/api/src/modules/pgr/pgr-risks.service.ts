import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePgrRiskDto, UpdatePgrRiskDto } from "./dto/pgr.dto";
import { computeRiskLevel } from "./risk-level.util";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

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
        riskLevel: computeRiskLevel(dto.probability, dto.severity),
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

    const probability = dto.probability ?? risk.probability;
    const severity = dto.severity ?? risk.severity;

    return this.prisma.pgrRisk.update({
      where: { id },
      data: {
        ...dto,
        riskLevel: computeRiskLevel(probability, severity),
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
