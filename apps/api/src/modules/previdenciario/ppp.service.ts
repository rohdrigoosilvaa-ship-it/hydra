import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePppDto } from "./dto/previdenciario.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class PppService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], employeeId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PPP_READ, tenantId);
    return this.prisma.ppp.findMany({
      where: { ...where, ...(employeeId ? { employeeId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  create(tenantId: string, dto: CreatePppDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.PPP_WRITE, dto.companyId);
    return this.prisma.ppp.create({
      data: {
        ...dto,
        periodStart: new Date(dto.periodStart),
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        tenantId,
        createdById: userId,
      },
    });
  }
}
