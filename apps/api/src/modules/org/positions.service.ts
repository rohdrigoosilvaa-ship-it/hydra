import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePositionDto } from "./dto/org.dto";
import { assertCompanyInScope, companyScopeWhere } from "./scope.util";

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    return this.prisma.position.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    const position = await this.prisma.position.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }

  create(tenantId: string, dto: CreatePositionDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_POSITION_WRITE, dto.companyId);
    return this.prisma.position.create({ data: { ...dto, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreatePositionDto>,
    assignments: RoleAssignmentClaim[],
  ) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.position.update({ where: { id }, data: { ...dto } });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.position.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_WRITE, tenantId);
    const position = await this.prisma.position.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }
}
