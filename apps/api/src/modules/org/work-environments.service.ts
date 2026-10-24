import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateWorkEnvironmentDto, UpdateWorkEnvironmentDto } from "./dto/org.dto";
import { assertCompanyInScope, isCompanyInScope } from "./scope.util";

/** Ambientes de trabalho de uma empresa — os cargos transitam por eles. */
@Injectable()
export class WorkEnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, companyId: string, assignments: RoleAssignmentClaim[]) {
    if (!isCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_READ, companyId)) {
      throw new NotFoundException("Empresa não encontrada.");
    }
    return this.prisma.workEnvironment.findMany({
      where: { tenantId, companyId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { positions: true } } },
    });
  }

  create(tenantId: string, dto: CreateWorkEnvironmentDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_WRITE, dto.companyId);
    return this.prisma.workEnvironment.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        name: dto.name.trim(),
        color: dto.color || null,
        icon: dto.icon || null,
        description: dto.description?.trim() || null,
        location: dto.location?.trim() || null,
        unitType: dto.unitType ?? "MATRIZ",
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateWorkEnvironmentDto, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.workEnvironment.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        color: dto.color,
        icon: dto.icon,
        description: dto.description,
        location: dto.location,
        unitType: dto.unitType,
      },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    await this.prisma.workEnvironment.update({ where: { id }, data: { deletedAt: new Date() } });
    // o ambiente excluído deixa de ser transitado pelos cargos
    await this.prisma.positionEnvironment.deleteMany({ where: { environmentId: id } });
    return { success: true };
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const env = await this.prisma.workEnvironment.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!env) throw new NotFoundException("Ambiente não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_WRITE, env.companyId);
    return env;
  }
}
