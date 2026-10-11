import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type { CreateNonConformityDto } from "./dto/field-ops.dto";
import type { NonConformityStatus } from "@hydra/db";

@Injectable()
export class NonConformitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.nonConformity.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      include: { actions: true, inspection: { select: { id: true, templateId: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  create(tenantId: string, dto: CreateNonConformityDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    return this.prisma.$transaction(async (tx) => {
      const nonConformity = await tx.nonConformity.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          inspectionId: dto.inspectionId,
          inspectionItemResponseId: dto.inspectionItemResponseId,
          description: dto.description,
          severity: dto.severity,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          createdById: userId,
        },
      });

      await tx.pgrAction.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          nonConformityId: nonConformity.id,
          description: `Não conformidade: ${dto.description}`,
          dueDate: nonConformity.dueDate,
          priority: dto.severity === "CRITICA" || dto.severity === "ALTA" ? 1 : 2,
          createdById: userId,
        },
      });

      return tx.nonConformity.findUniqueOrThrow({ where: { id: nonConformity.id }, include: { actions: true } });
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: NonConformityStatus,
    assignments: RoleAssignmentClaim[],
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const nonConformity = await this.prisma.nonConformity.findFirst({ where: { ...where, id } });
    if (!nonConformity) throw new NotFoundException("Não conformidade não encontrada.");
    return this.prisma.nonConformity.update({ where: { id }, data: { status } });
  }
}
