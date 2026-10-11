import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePcmsoDto } from "./dto/health.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class PcmsoService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.HEALTH_READ, tenantId);
    return this.prisma.pcmso.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.HEALTH_READ, tenantId);
    const doc = await this.prisma.pcmso.findFirst({
      where: { ...where, id, deletedAt: null },
      include: { exams: true },
    });
    if (!doc) throw new NotFoundException("PCMSO não encontrado.");
    return doc;
  }

  create(tenantId: string, dto: CreatePcmsoDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, dto.companyId);
    return this.prisma.pcmso.create({
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async approve(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.HEALTH_WRITE, tenantId);
    const doc = await this.prisma.pcmso.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!doc) throw new NotFoundException("PCMSO não encontrado.");
    if (doc.status === "APPROVED") throw new ForbiddenException("Este PCMSO já está aprovado.");
    return this.prisma.pcmso.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: userId, updatedById: userId },
    });
  }
}
