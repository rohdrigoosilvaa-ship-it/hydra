import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePositionRequiredEpiDto, UpdatePositionRequiredEpiDto } from "./dto/position-required-epi.dto";
import { companyScopeWhere } from "./scope.util";

@Injectable()
export class PositionRequiredEpisService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, positionId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertPositionReadable(tenantId, positionId, assignments);
    return this.prisma.positionRequiredEpi.findMany({
      where: { tenantId, positionId },
      include: { catalogItem: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(
    tenantId: string,
    positionId: string,
    dto: CreatePositionRequiredEpiDto,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertPositionWritable(tenantId, positionId, assignments);
    return this.prisma.positionRequiredEpi.create({
      data: {
        tenantId,
        positionId,
        epiCatalogItemId: dto.epiCatalogItemId,
        epiName: dto.epiName,
        ca: dto.ca,
        periodicityMonths: dto.periodicityMonths,
        notes: dto.notes,
      },
      include: { catalogItem: true },
    });
  }

  async update(
    tenantId: string,
    positionId: string,
    id: string,
    dto: UpdatePositionRequiredEpiDto,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertPositionWritable(tenantId, positionId, assignments);
    const entry = await this.prisma.positionRequiredEpi.findFirst({ where: { id, positionId } });
    if (!entry) throw new NotFoundException("EPI exigido não encontrado neste cargo.");

    return this.prisma.positionRequiredEpi.update({
      where: { id },
      data: {
        ...(dto.epiCatalogItemId !== undefined ? { epiCatalogItemId: dto.epiCatalogItemId || null } : {}),
        ...(dto.epiName !== undefined ? { epiName: dto.epiName } : {}),
        ...(dto.ca !== undefined ? { ca: dto.ca || null } : {}),
        ...(dto.periodicityMonths !== undefined ? { periodicityMonths: dto.periodicityMonths } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
      include: { catalogItem: true },
    });
  }

  async remove(tenantId: string, positionId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertPositionWritable(tenantId, positionId, assignments);
    const entry = await this.prisma.positionRequiredEpi.findFirst({ where: { id, positionId } });
    if (!entry) throw new NotFoundException("EPI exigido não encontrado neste cargo.");
    await this.prisma.positionRequiredEpi.delete({ where: { id } });
    return { success: true };
  }

  private async assertPositionReadable(tenantId: string, positionId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    const position = await this.prisma.position.findFirst({ where: { ...where, id: positionId, deletedAt: null } });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }

  private async assertPositionWritable(tenantId: string, positionId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_WRITE, tenantId);
    const position = await this.prisma.position.findFirst({ where: { ...where, id: positionId, deletedAt: null } });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }
}
