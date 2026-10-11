import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateTechnicalReportDto } from "./dto/documents.dto";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";

@Injectable()
export class TechnicalReportsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.REPORT_READ, tenantId);
    return this.prisma.technicalReport.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  create(tenantId: string, dto: CreateTechnicalReportDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.REPORT_WRITE, dto.companyId);
    return this.prisma.technicalReport.create({
      data: {
        ...dto,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        tenantId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }
}
