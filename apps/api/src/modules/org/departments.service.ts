import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateDepartmentDto } from "./dto/org.dto";
import { assertCompanyInScope, companyScopeWhere } from "./scope.util";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_DEPARTMENT_READ, tenantId);
    return this.prisma.department.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_DEPARTMENT_READ, tenantId);
    const department = await this.prisma.department.findFirst({
      where: { ...where, id, deletedAt: null },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!department) throw new NotFoundException("Setor não encontrado.");
    return department;
  }

  create(tenantId: string, dto: CreateDepartmentDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_DEPARTMENT_WRITE, dto.companyId);
    return this.prisma.department.create({ data: { ...dto, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateDepartmentDto>,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.department.update({ where: { id }, data: { ...dto } });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_DEPARTMENT_WRITE, tenantId);
    const department = await this.prisma.department.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!department) throw new NotFoundException("Setor não encontrado.");
    return department;
  }
}
