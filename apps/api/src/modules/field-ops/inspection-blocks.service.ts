import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type { CreateInspectionBlockDto, UpdateInspectionBlockDto } from "./dto/field-ops.dto";

@Injectable()
export class InspectionBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.inspectionBlock.findMany({
      where: {
        ...where,
        active: true,
        ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
      },
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    const block = await this.prisma.inspectionBlock.findFirst({
      where: { ...where, id },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!block) throw new NotFoundException("Bloco não encontrado.");
    return block;
  }

  create(tenantId: string, dto: CreateInspectionBlockDto, userId: string, assignments: RoleAssignmentClaim[]) {
    if (dto.companyId) assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    return this.prisma.inspectionBlock.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        createdById: userId,
        items: {
          createMany: {
            data: dto.items.map((item) => ({
              tenantId,
              order: item.order,
              text: item.text,
              responseType: item.responseType,
              category: item.category,
              options: item.options ?? [],
              allowPhoto: item.allowPhoto,
            })),
          },
        },
      },
      include: { items: { orderBy: { order: "asc" } } },
    });
  }

  /**
   * Ao contrário do roteiro, um bloco nunca é respondido diretamente — só serve
   * de molde copiado (snapshot) no momento em que é inserido num roteiro. Por
   * isso é seguro substituir a lista de itens inteira aqui: nada que já existe
   * (roteiros/inspeções) referencia esses itens de volta.
   */
  async update(tenantId: string, id: string, dto: UpdateInspectionBlockDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const block = await this.prisma.inspectionBlock.findFirst({ where: { ...where, id } });
    if (!block) throw new NotFoundException("Bloco não encontrado.");

    if (dto.items) {
      await this.prisma.inspectionBlockItem.deleteMany({ where: { blockId: id } });
    }

    return this.prisma.inspectionBlock.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        ...(dto.items
          ? {
              items: {
                createMany: {
                  data: dto.items.map((item) => ({
                    tenantId,
                    order: item.order,
                    text: item.text,
                    responseType: item.responseType,
                    category: item.category,
                    options: item.options ?? [],
                    allowPhoto: item.allowPhoto,
                  })),
                },
              },
            }
          : {}),
      },
      include: { items: { orderBy: { order: "asc" } } },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const block = await this.prisma.inspectionBlock.findFirst({ where: { ...where, id } });
    if (!block) throw new NotFoundException("Bloco não encontrado.");
    await this.prisma.inspectionBlock.update({ where: { id }, data: { active: false } });
    return { success: true };
  }
}
