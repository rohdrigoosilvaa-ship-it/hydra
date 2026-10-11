import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateAsoDto } from "./dto/health.dto";
import { allowedCompanyIds, assertCompanyInScope, hasTenantWideAccess } from "../org/scope.util";

@Injectable()
export class AsoService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[]) {
    const where: Prisma.AsoWhereInput = hasTenantWideAccess(assignments, PERMISSIONS.HEALTH_READ)
      ? { tenantId }
      : {
          tenantId,
          exam: { employee: { companyId: { in: allowedCompanyIds(assignments, PERMISSIONS.HEALTH_READ) } } },
        };
    return this.prisma.aso.findMany({
      where,
      include: { exam: true },
      orderBy: { issuedAt: "desc" },
    });
  }

  async create(tenantId: string, dto: CreateAsoDto, assignments: RoleAssignmentClaim[]) {
    const exam = await this.prisma.medicalExam.findFirst({ where: { id: dto.examId, tenantId } });
    if (!exam) throw new NotFoundException("Exame não encontrado.");
    const employee = await this.prisma.employee.findFirst({ where: { id: exam.employeeId, tenantId } });
    if (!employee) throw new NotFoundException("Colaborador não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.HEALTH_WRITE, employee.companyId);

    const [aso] = await this.prisma.$transaction([
      this.prisma.aso.create({ data: { ...dto, tenantId } }),
      this.prisma.medicalExam.update({ where: { id: dto.examId }, data: { result: dto.result } }),
    ]);
    return aso;
  }
}
