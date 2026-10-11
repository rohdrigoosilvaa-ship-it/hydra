import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateMedicalExamDto } from "./dto/health.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

@Injectable()
export class MedicalExamsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], employeeId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.HEALTH_READ, tenantId, "employee");
    return this.prisma.medicalExam.findMany({
      where: { ...where, ...(employeeId ? { employeeId } : {}) },
      include: { aso: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, dto: CreateMedicalExamDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, employee.companyId);

    return this.prisma.medicalExam.create({
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
        tenantId,
        createdById: userId,
      },
    });
  }
}
