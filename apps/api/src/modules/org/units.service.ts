import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateUnitDto } from "./dto/org.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "./scope.util";

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], branchId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.ORG_UNIT_READ, tenantId, "branch");
    return this.prisma.unit.findMany({
      where: { ...where, deletedAt: null, ...(branchId ? { branchId } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.ORG_UNIT_READ, tenantId, "branch");
    const unit = await this.prisma.unit.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!unit) throw new NotFoundException("Unidade não encontrada.");
    return unit;
  }

  async create(tenantId: string, dto: CreateUnitDto, userId: string, assignments: RoleAssignmentClaim[]) {
    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } });
    if (!branch) throw new NotFoundException("Filial não encontrada.");
    assertCompanyInScope(assignments, PERMISSIONS.ORG_UNIT_WRITE, branch.companyId);
    return this.prisma.unit.create({
      data: { ...dto, tenantId, createdById: userId, updatedById: userId },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateUnitDto>,
    userId: string,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.unit.update({ where: { id }, data: { ...dto, updatedById: userId } });
  }

  async remove(tenantId: string, id: string, userId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.ORG_UNIT_WRITE, tenantId, "branch");
    const unit = await this.prisma.unit.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!unit) throw new NotFoundException("Unidade não encontrada.");
    return unit;
  }
}
