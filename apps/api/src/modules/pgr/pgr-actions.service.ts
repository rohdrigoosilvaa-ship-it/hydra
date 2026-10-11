import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePgrActionDto } from "./dto/pgr.dto";
import type { ActionStatus } from "@hydra/db";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class PgrActionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista unificada do Hydra Actions (item 16 do escopo) — hoje só a origem PGR alimenta. */
  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_ACTION_READ, tenantId);
    return this.prisma.pgrAction.findMany({
      where,
      include: {
        pgr: { select: { id: true, title: true } },
        nonConformity: { select: { id: true, description: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
  }

  create(tenantId: string, dto: CreatePgrActionDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.PGR_ACTION_WRITE, dto.companyId);
    return this.prisma.pgrAction.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: ActionStatus,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_ACTION_WRITE, tenantId);
    const action = await this.prisma.pgrAction.findFirst({ where: { ...where, id } });
    if (!action) throw new NotFoundException("Ação não encontrada.");
    return this.prisma.pgrAction.update({
      where: { id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
        updatedById: userId,
      },
    });
  }
}
