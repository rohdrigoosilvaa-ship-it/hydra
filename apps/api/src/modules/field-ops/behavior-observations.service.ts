import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type { CreateBehaviorObservationDto } from "./dto/field-ops.dto";

@Injectable()
export class BehaviorObservationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.behaviorObservation.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  create(tenantId: string, dto: CreateBehaviorObservationDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    return this.prisma.behaviorObservation.create({
      data: { ...dto, tenantId, createdById: userId },
    });
  }
}
