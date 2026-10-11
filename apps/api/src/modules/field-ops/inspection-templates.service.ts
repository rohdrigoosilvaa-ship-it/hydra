import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type {
  CreateInspectionTemplateDto,
  UpdateInspectionTemplateDto,
  UpdateInspectionTemplateItemDto,
} from "./dto/field-ops.dto";

@Injectable()
export class InspectionTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.inspectionTemplate.findMany({
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
    const template = await this.prisma.inspectionTemplate.findFirst({
      where: { ...where, id },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!template) throw new NotFoundException("Roteiro de inspeção não encontrado.");
    return template;
  }

  create(tenantId: string, dto: CreateInspectionTemplateDto, userId: string, assignments: RoleAssignmentClaim[]) {
    if (dto.companyId) assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    return this.prisma.inspectionTemplate.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
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
              blockLabel: item.blockLabel,
              allowPhoto: item.allowPhoto,
            })),
          },
        },
      },
      include: { items: { orderBy: { order: "asc" } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateInspectionTemplateDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { ...where, id } });
    if (!template) throw new NotFoundException("Roteiro de inspeção não encontrado.");
    return this.prisma.inspectionTemplate.update({
      where: { id },
      data: { name: dto.name, description: dto.description, category: dto.category },
      include: { items: { orderBy: { order: "asc" } } },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { ...where, id } });
    if (!template) throw new NotFoundException("Roteiro de inspeção não encontrado.");
    await this.prisma.inspectionTemplate.update({ where: { id }, data: { active: false } });
    return { success: true };
  }

  /**
   * Só título (text), seção (blockLabel) e subtítulo (category) do item são
   * editáveis depois de criado — tipo de resposta e opções ficam travados porque
   * inspeções já respondidas com este item dependem de como ele foi interpretado
   * na hora (mudar isso invalidaria respostas antigas). Nenhum dos campos
   * liberados afeta isso porque o vínculo com InspectionItemResponse é pelo id
   * do item, que não muda.
   */
  async updateItem(
    tenantId: string,
    templateId: string,
    itemId: string,
    dto: UpdateInspectionTemplateItemDto,
    assignments: RoleAssignmentClaim[],
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { ...where, id: templateId } });
    if (!template) throw new NotFoundException("Roteiro de inspeção não encontrado.");
    const item = await this.prisma.inspectionTemplateItem.findFirst({ where: { id: itemId, templateId } });
    if (!item) throw new NotFoundException("Item não encontrado neste roteiro.");
    return this.prisma.inspectionTemplateItem.update({
      where: { id: itemId },
      data: { text: dto.text, blockLabel: dto.blockLabel, category: dto.category, allowPhoto: dto.allowPhoto },
    });
  }
}
