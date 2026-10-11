import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateFapRecordDto } from "./dto/previdenciario.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class FapRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PREV_READ, tenantId);
    return this.prisma.fapRecord.findMany({
      where,
      orderBy: { year: "desc" },
    });
  }

  create(tenantId: string, dto: CreateFapRecordDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.PREV_WRITE, dto.companyId);
    return this.prisma.fapRecord.create({ data: { ...dto, tenantId } });
  }
}
