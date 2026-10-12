import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type { CreateInspectionDto, UpdateInspectionDto, UpsertInspectionResponseDto } from "./dto/field-ops.dto";

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    return this.prisma.inspection.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      include: {
        template: true,
        _count: { select: { responses: true, nonConformities: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_READ, tenantId);
    const inspection = await this.prisma.inspection.findFirst({
      where: { ...where, id },
      include: {
        template: { include: { sections: { orderBy: { order: "asc" } }, items: { orderBy: { order: "asc" } } } },
        responses: true,
        nonConformities: true,
      },
    });
    if (!inspection) throw new NotFoundException("Inspeção não encontrada.");
    return inspection;
  }

  create(tenantId: string, dto: CreateInspectionDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.OCCURRENCE_WRITE, dto.companyId);
    return this.prisma.inspection.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        departmentId: dto.departmentId,
        templateId: dto.templateId,
        inspectorId: dto.inspectorId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        createdById: userId,
      },
      include: { template: { include: { sections: { orderBy: { order: "asc" } }, items: { orderBy: { order: "asc" } } } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateInspectionDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const inspection = await this.prisma.inspection.findFirst({ where: { ...where, id } });
    if (!inspection) throw new NotFoundException("Inspeção não encontrada.");
    return this.prisma.inspection.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        completedAt: dto.status === "CONCLUIDA" ? new Date() : undefined,
      },
    });
  }

  async upsertResponse(
    tenantId: string,
    inspectionId: string,
    dto: UpsertInspectionResponseDto,
    assignments: RoleAssignmentClaim[],
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const inspection = await this.prisma.inspection.findFirst({ where: { ...where, id: inspectionId } });
    if (!inspection) throw new NotFoundException("Inspeção não encontrada.");

    const existing = await this.prisma.inspectionItemResponse.findFirst({
      where: { inspectionId, templateItemId: dto.templateItemId, repetition: dto.repetition ?? 0 },
    });

    if (existing) {
      return this.prisma.inspectionItemResponse.update({
        where: { id: existing.id },
        data: { value: dto.value, textValue: dto.textValue, comment: dto.comment },
      });
    }

    const templateItem = await this.prisma.inspectionTemplateItem.findFirst({
      where: { id: dto.templateItemId, tenantId },
    });
    if (!templateItem) throw new NotFoundException("Item do roteiro não encontrado.");

    return this.prisma.inspectionItemResponse.create({
      data: {
        tenantId,
        inspectionId,
        templateItemId: dto.templateItemId,
        value: dto.value,
        textValue: dto.textValue,
        comment: dto.comment,
        order: templateItem.order,
        repetition: dto.repetition ?? 0,
      },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.OCCURRENCE_WRITE, tenantId);
    const inspection = await this.prisma.inspection.findFirst({ where: { ...where, id } });
    if (!inspection) throw new NotFoundException("Inspeção não encontrada.");
    await this.prisma.inspection.delete({ where: { id } });
    return { success: true };
  }
}
