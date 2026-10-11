import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateLtcatDto, UpdateLtcatDto } from "./dto/documents.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import { copyGheStructure } from "../pgr/ghe-copy.util";
import { countEmployeesForGhe } from "../pgr/pgr.service";

@Injectable()
export class LtcatService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_READ, tenantId);
    return this.prisma.ltcat.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      include: { _count: { select: { agents: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_READ, tenantId);
    const ltcat = await this.prisma.ltcat.findFirst({
      where: { ...where, id, deletedAt: null },
      include: {
        ghes: { include: { functions: { include: { department: true, position: true } } } },
        agents: { include: { ghe: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, companyId: ltcat.companyId, deletedAt: null, status: { not: "TERMINATED" } },
      select: { id: true, departmentId: true, positionId: true },
    });
    const ghes = ltcat.ghes.map((ghe) => ({
      ...ghe,
      employeesCount: countEmployeesForGhe(ghe.functions, employees),
    }));

    return { ...ltcat, ghes };
  }

  create(tenantId: string, dto: CreateLtcatDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.LTCAT_WRITE, dto.companyId);
    return this.prisma.ltcat.create({
      data: {
        ...dto,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLtcatDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_WRITE, tenantId);
    const ltcat = await this.prisma.ltcat.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");
    return this.prisma.ltcat.update({
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

  async approve(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_WRITE, tenantId);
    const doc = await this.prisma.ltcat.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!doc) throw new NotFoundException("LTCAT não encontrado.");
    if (doc.status === "APPROVED") throw new ForbiddenException("Este LTCAT já está aprovado.");
    return this.prisma.ltcat.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: userId, updatedById: userId },
    });
  }

  /** Soft-delete — mesmo padrão do PGR. */
  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_WRITE, tenantId);
    const doc = await this.prisma.ltcat.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!doc) throw new NotFoundException("LTCAT não encontrado.");
    await this.prisma.ltcat.update({ where: { id }, data: { deletedAt: new Date(), updatedById: userId } });
    return { success: true };
  }

  /** Importa a estrutura de GHE do PGR Aprovado mais recente da empresa — sem
   * recadastrar. Recusa se o LTCAT já tiver GHE, pra não duplicar. */
  async importGheFromPgr(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_WRITE, tenantId);
    const ltcat = await this.prisma.ltcat.findFirst({ where: { ...where, id, deletedAt: null }, include: { ghes: true } });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");
    if (ltcat.ghes.length > 0) {
      throw new ConflictException("Este LTCAT já tem uma estrutura de GHE — remova antes de importar novamente.");
    }

    const sourcePgr = await this.prisma.pgr.findFirst({
      where: { tenantId, companyId: ltcat.companyId, status: "APPROVED", deletedAt: null },
      orderBy: { approvedAt: "desc" },
      include: { ghes: { include: { functions: true } } },
    });
    if (!sourcePgr) throw new BadRequestException("Não há PGR aprovado para esta empresa ainda.");

    await this.prisma.$transaction(async (tx) => {
      await copyGheStructure(tx, tenantId, sourcePgr.ghes, { ltcatId: id });
    });
    return this.get(tenantId, id, assignments);
  }

  /** Copia a estrutura de GHE do LTCAT anterior da empresa (revisão) — não
   * copia os agentes, cada revisão reavalia do zero (igual o PGR não copia PgrRisk). */
  async copyGheFromPreviousLtcat(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.LTCAT_WRITE, tenantId);
    const ltcat = await this.prisma.ltcat.findFirst({ where: { ...where, id, deletedAt: null }, include: { ghes: true } });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");
    if (ltcat.ghes.length > 0) {
      throw new ConflictException("Este LTCAT já tem uma estrutura de GHE — remova antes de importar novamente.");
    }

    const previousLtcat = await this.prisma.ltcat.findFirst({
      where: { tenantId, companyId: ltcat.companyId, id: { not: id }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { ghes: { include: { functions: true } } },
    });
    if (!previousLtcat) throw new BadRequestException("Não há LTCAT anterior desta empresa para copiar.");

    await this.prisma.$transaction(async (tx) => {
      await copyGheStructure(tx, tenantId, previousLtcat.ghes, { ltcatId: id });
    });
    return this.get(tenantId, id, assignments);
  }
}
