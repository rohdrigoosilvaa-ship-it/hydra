import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { SaveActionScheduleDto } from "./dto/action-schedules.dto";
import { assertCompanyInScope, isCompanyInScope } from "./scope.util";

const INCLUDE = { items: { orderBy: { position: "asc" as const } } };

/** Plano / Cronograma de Ações da empresa. Um cronograma "Definido" não pode mais ser editado. */
@Injectable()
export class ActionSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, companyId: string, assignments: RoleAssignmentClaim[]) {
    if (!isCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_READ, companyId)) throw new NotFoundException("Empresa não encontrada.");
    return this.prisma.actionSchedule.findMany({
      where: { tenantId, companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: INCLUDE,
    });
  }

  async create(tenantId: string, dto: SaveActionScheduleDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_WRITE, dto.companyId);
    const company = await this.prisma.company.findFirst({ where: { id: dto.companyId, tenantId }, select: { id: true } });
    if (!company) throw new NotFoundException("Empresa não encontrada.");
    return this.prisma.actionSchedule.create({ data: this.data(tenantId, dto), include: INCLUDE });
  }

  async update(tenantId: string, id: string, dto: SaveActionScheduleDto, assignments: RoleAssignmentClaim[]) {
    const current = await this.writable(tenantId, id, assignments);
    if (current.mode === "DEFINED") throw new BadRequestException("Cronograma definido não pode ser editado. Reabra-o como rascunho.");
    return this.prisma.$transaction(async (tx) => {
      await tx.actionScheduleItem.deleteMany({ where: { scheduleId: id } });
      const { companyId: _c, tenantId: _t, ...data } = this.data(tenantId, { ...dto, companyId: current.companyId });
      return tx.actionSchedule.update({ where: { id }, data, include: INCLUDE });
    });
  }

  async setMode(tenantId: string, id: string, mode: "DRAFT" | "DEFINED", assignments: RoleAssignmentClaim[]) {
    await this.writable(tenantId, id, assignments);
    return this.prisma.actionSchedule.update({ where: { id }, data: { mode }, include: INCLUDE });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.writable(tenantId, id, assignments);
    await this.prisma.actionSchedule.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async writable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const found = await this.prisma.actionSchedule.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!found || !isCompanyInScope(assignments, PERMISSIONS.ORG_COMPANY_WRITE, found.companyId)) throw new NotFoundException("Cronograma não encontrado.");
    return found;
  }

  private data(tenantId: string, dto: SaveActionScheduleDto) {
    return {
      tenantId,
      companyId: dto.companyId,
      name: dto.name.trim(),
      author: dto.author.trim(),
      elaboratedAt: new Date(dto.elaboratedAt),
      type: dto.type,
      startMonth: new Date(dto.startMonth),
      items: {
        create: dto.items.map((it, position) => ({
          position,
          what: it.what.trim(),
          why: it.why?.trim() || null,
          place: it.place?.trim() || null,
          how: it.how?.trim() || null,
          responsible: it.responsible?.trim() || null,
          totalCost: it.totalCost ?? null,
          followUp: it.followUp?.trim() || null,
          priority: it.priority ?? 0,
          months: [...new Set(it.months)].sort(),
        })),
      },
    };
  }
}
