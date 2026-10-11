import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateOccurrenceDto, UpdateOccurrenceDto } from "./dto/occurrence.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class OccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.occurrence.findMany({
      where: { ...where, deletedAt: null },
      include: { investigation: true, cat: true, involvedPeople: true },
      orderBy: { occurredAt: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    const occurrence = await this.prisma.occurrence.findFirst({
      where: { ...where, id, deletedAt: null },
      include: { investigation: true, cat: true, involvedPeople: true },
    });
    if (!occurrence) throw new NotFoundException("Ocorrência não encontrada.");
    return occurrence;
  }

  create(tenantId: string, dto: CreateOccurrenceDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    return this.prisma.occurrence.create({
      data: {
        ...dto,
        occurredAt: new Date(dto.occurredAt),
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateOccurrenceDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const occurrence = await this.prisma.occurrence.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!occurrence) throw new NotFoundException("Ocorrência não encontrada.");
    return this.prisma.occurrence.update({
      where: { id },
      data: { ...dto, updatedById: userId },
    });
  }
}
