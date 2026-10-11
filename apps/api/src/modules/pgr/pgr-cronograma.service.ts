import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import type {
  CreatePgrCronogramaItemDto,
  TogglePgrCronogramaMarkDto,
  UpdatePgrCronogramaItemDto,
} from "./dto/pgr.dto";

@Injectable()
export class PgrCronogramaService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPgr(tenantId: string, pgrId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_WRITE, tenantId);
    const pgr = await this.prisma.pgr.findFirst({ where: { ...where, id: pgrId, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    return pgr;
  }

  private async assertItem(tenantId: string, itemId: string, assignments: RoleAssignmentClaim[]) {
    const item = await this.prisma.pgrCronogramaItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException("Item do cronograma não encontrado.");
    await this.assertPgr(tenantId, item.pgrId, assignments);
    return item;
  }

  async create(tenantId: string, pgrId: string, dto: CreatePgrCronogramaItemDto, assignments: RoleAssignmentClaim[]) {
    await this.assertPgr(tenantId, pgrId, assignments);
    const last = await this.prisma.pgrCronogramaItem.findFirst({
      where: { tenantId, pgrId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    return this.prisma.pgrCronogramaItem.create({
      data: {
        tenantId,
        pgrId,
        description: dto.description,
        responsible: dto.responsible,
        order: (last?.order ?? -1) + 1,
      },
      include: { marks: true },
    });
  }

  async update(tenantId: string, itemId: string, dto: UpdatePgrCronogramaItemDto, assignments: RoleAssignmentClaim[]) {
    await this.assertItem(tenantId, itemId, assignments);
    return this.prisma.pgrCronogramaItem.update({
      where: { id: itemId },
      data: { description: dto.description, responsible: dto.responsible },
      include: { marks: true },
    });
  }

  async remove(tenantId: string, itemId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertItem(tenantId, itemId, assignments);
    await this.prisma.pgrCronogramaItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  /** Liga/desliga a marca de um mês — idempotente do ponto de vista do usuário (clique alterna). */
  async toggleMark(tenantId: string, itemId: string, dto: TogglePgrCronogramaMarkDto, assignments: RoleAssignmentClaim[]) {
    await this.assertItem(tenantId, itemId, assignments);
    const existing = await this.prisma.pgrCronogramaMark.findUnique({
      where: { itemId_year_month: { itemId, year: dto.year, month: dto.month } },
    });
    if (existing) {
      await this.prisma.pgrCronogramaMark.delete({ where: { id: existing.id } });
      return { marked: false };
    }
    await this.prisma.pgrCronogramaMark.create({ data: { itemId, year: dto.year, month: dto.month } });
    return { marked: true };
  }
}
