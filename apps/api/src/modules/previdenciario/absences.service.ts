import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateAbsenceDto } from "./dto/previdenciario.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

@Injectable()
export class AbsencesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], employeeId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.PREV_READ, tenantId, "employee");
    return this.prisma.absence.findMany({
      where: { ...where, ...(employeeId ? { employeeId } : {}) },
      orderBy: { startDate: "desc" },
    });
  }

  async create(tenantId: string, dto: CreateAbsenceDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PREV_WRITE, employee.companyId);

    return this.prisma.absence.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        tenantId,
        createdById: userId,
      },
    });
  }
}
