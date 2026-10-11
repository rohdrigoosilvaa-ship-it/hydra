import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateBranchDto } from "./dto/org.dto";
import { assertCompanyInScope, companyScopeWhere } from "./scope.util";

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_BRANCH_READ, tenantId);
    return this.prisma.branch.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_BRANCH_READ, tenantId);
    const branch = await this.prisma.branch.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!branch) throw new NotFoundException("Filial não encontrada.");
    return branch;
  }

  create(tenantId: string, dto: CreateBranchDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_BRANCH_WRITE, dto.companyId);
    return this.prisma.branch.create({
      data: { ...dto, tenantId, createdById: userId, updatedById: userId },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateBranchDto>,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.branch.update({ where: { id }, data: { ...dto, updatedById: userId } });
  }

  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_BRANCH_WRITE, tenantId);
    const branch = await this.prisma.branch.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!branch) throw new NotFoundException("Filial não encontrada.");
    return branch;
  }
}
