import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePositionDto } from "./dto/org.dto";
import { assertCompanyInScope, companyScopeWhere } from "./scope.util";

const UPDATABLE_FIELDS = [
  "code", "name", "cbo", "description", "status", "color", "icon",
  "requiresEntryAptitude", "sectorInfo", "workSchedule", "additionalInfo", "technicalOpinion",
];

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    return this.prisma.position.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      orderBy: { name: "asc" },
      include: { environments: { select: { environmentId: true } } },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    const position = await this.prisma.position.findFirst({
      where: { ...where, id, deletedAt: null },
      include: { environments: { select: { environmentId: true } } },
    });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }

  async create(tenantId: string, dto: CreatePositionDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_POSITION_WRITE, dto.companyId);
    const { environmentIds, esocialStartDate, ...rest } = dto;
    const envIds = await this.validEnvironmentIds(tenantId, dto.companyId, environmentIds);
    return this.prisma.position.create({
      data: {
        ...rest,
        tenantId,
        esocialStartDate: esocialStartDate ? new Date(esocialStartDate) : undefined,
        environments: envIds.length ? { create: envIds.map((environmentId) => ({ environmentId })) } : undefined,
      },
      include: { environments: { select: { environmentId: true } } },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreatePositionDto>,
    assignments: RoleAssignmentClaim[],
  ) {
    const current = await this.assertWritable(tenantId, id, assignments);
    const { environmentIds, esocialStartDate } = dto;
    // o PATCH não passa pelo ValidationPipe (tipo Partial) — só estes campos podem mudar
    const rest = Object.fromEntries(Object.entries(dto).filter(([key]) => UPDATABLE_FIELDS.includes(key)));
    const envIds = environmentIds === undefined ? null : await this.validEnvironmentIds(tenantId, current.companyId, environmentIds);
    return this.prisma.$transaction(async (tx) => {
      if (envIds) {
        await tx.positionEnvironment.deleteMany({ where: { positionId: id } });
        if (envIds.length) await tx.positionEnvironment.createMany({ data: envIds.map((environmentId) => ({ positionId: id, environmentId })) });
      }
      return tx.position.update({
        where: { id },
        data: {
          ...rest,
          esocialStartDate: esocialStartDate === undefined ? undefined : esocialStartDate ? new Date(esocialStartDate) : null,
        },
        include: { environments: { select: { environmentId: true } } },
      });
    });
  }

  /** Só aceita ambientes da mesma empresa do cargo. */
  private async validEnvironmentIds(tenantId: string, companyId: string, ids?: string[]): Promise<string[]> {
    if (!ids?.length) return [];
    const found = await this.prisma.workEnvironment.findMany({
      where: { id: { in: ids }, tenantId, companyId, deletedAt: null },
      select: { id: true },
    });
    return found.map((e) => e.id);
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
