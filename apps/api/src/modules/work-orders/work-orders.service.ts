import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { del } from "@vercel/blob";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import { employeeMatchesAnyFunction } from "../pgr/pgr.service";
import type { CreateWorkOrderDto } from "./dto/work-order.dto";

export type WorkOrderSigningStatus = "NAO_ENVIADA" | "AGUARDANDO_ASSINATURA" | "ASSINADA";

function computeSigningStatus(signature: { signedAt: Date | null } | null): WorkOrderSigningStatus {
  if (!signature) return "NAO_ENVIADA";
  return signature.signedAt ? "ASSINADA" : "AGUARDANDO_ASSINATURA";
}

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    if (companyId) assertCompanyInScope(assignments, PERMISSIONS.WORK_ORDER_READ, companyId);
    const where = companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_READ, tenantId);
    const workOrders = await this.prisma.workOrder.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      include: { riskItems: true, epiItems: true, signature: { select: { signedAt: true } } },
      orderBy: { issueDate: "desc" },
    });
    return workOrders.map((wo) => ({ ...wo, signingStatus: computeSigningStatus(wo.signature) }));
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_READ, tenantId);
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { ...where, id },
      include: {
        riskItems: { orderBy: { createdAt: "asc" } },
        epiItems: { orderBy: { createdAt: "asc" } },
        signature: { select: { signedAt: true, signerName: true, ip: true } },
      },
    });
    if (!workOrder) throw new NotFoundException("Ordem de Serviço não encontrada.");
    return { ...workOrder, signingStatus: computeSigningStatus(workOrder.signature) };
  }

  /**
   * Puxa automaticamente riscos e EPIs da função do colaborador e congela
   * (snapshot) tudo na criação — é um documento assinado, não pode mudar
   * sozinho se o PGR de origem ou o cadastro de EPIs do cargo mudarem depois.
   */
  async create(tenantId: string, dto: CreateWorkOrderDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.WORK_ORDER_WRITE, dto.companyId);

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: dto.employeeId, companyId: dto.companyId, deletedAt: null },
      include: { department: true, position: true },
    });
    if (!employee) throw new NotFoundException("Colaborador não encontrado nesta empresa.");

    const referencePgr = await this.prisma.pgr.findFirst({
      where: { tenantId, companyId: dto.companyId, status: "APPROVED", deletedAt: null },
      orderBy: { approvedAt: "desc" },
      include: { ghes: { include: { functions: true, risks: { include: { hazard: true } } } } },
    });
    if (!referencePgr) {
      throw new BadRequestException(
        "Não há PGR aprovado para esta empresa ainda. Aprove um PGR antes de criar uma Ordem de Serviço.",
      );
    }

    const matchingGhes = referencePgr.ghes.filter((ghe) => employeeMatchesAnyFunction(ghe.functions, employee));
    const riskItemsData = matchingGhes.flatMap((ghe) =>
      ghe.risks.map((risk) => ({
        tenantId,
        hazardName: risk.hazard.name,
        hazardCategory: risk.hazard.category,
        gheName: ghe.name,
        typicalInjuries: risk.typicalInjuries,
        epiMeasures: risk.epiMeasures,
        riskLevel: risk.riskLevel,
      })),
    );

    const requiredEpis = employee.positionId
      ? await this.prisma.positionRequiredEpi.findMany({
          where: { tenantId, positionId: employee.positionId },
          include: { catalogItem: true },
        })
      : [];
    const epiItemsData = requiredEpis.map((req) => ({
      tenantId,
      epiName: req.catalogItem?.name ?? req.epiName,
      ca: req.ca,
      periodicityMonths: req.periodicityMonths,
    }));

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          employeeId: dto.employeeId,
          referencePgrId: referencePgr.id,
          issueDate: new Date(dto.issueDate),
          employeeName: employee.name,
          departmentName: employee.department?.name ?? null,
          positionName: employee.position?.name ?? null,
          admittedAt: employee.admittedAt,
          createdById: userId,
        },
      });
      if (riskItemsData.length) {
        await tx.workOrderRiskItem.createMany({
          data: riskItemsData.map((item) => ({ ...item, workOrderId: workOrder.id })),
        });
      }
      if (epiItemsData.length) {
        await tx.workOrderEpiItem.createMany({
          data: epiItemsData.map((item) => ({ ...item, workOrderId: workOrder.id })),
        });
      }
      return tx.workOrder.findUniqueOrThrow({
        where: { id: workOrder.id },
        include: { riskItems: true, epiItems: true },
      });
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_WRITE, tenantId);
    const workOrder = await this.prisma.workOrder.findFirst({ where: { ...where, id } });
    if (!workOrder) throw new NotFoundException("Ordem de Serviço não encontrada.");
    if (workOrder.pdfUrl) await del(workOrder.pdfUrl);
    await this.prisma.workOrder.delete({ where: { id } });
    return { success: true };
  }

  async removeRiskItem(tenantId: string, workOrderId: string, itemId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_WRITE, tenantId);
    const workOrder = await this.prisma.workOrder.findFirst({ where: { ...where, id: workOrderId }, include: { signature: true } });
    if (!workOrder) throw new NotFoundException("Ordem de Serviço não encontrada.");
    if (workOrder.signature?.signedAt) throw new ConflictException("Ordem já assinada — não é possível remover itens.");

    const item = await this.prisma.workOrderRiskItem.findFirst({ where: { id: itemId, workOrderId } });
    if (!item) throw new NotFoundException("Item não encontrado nesta Ordem de Serviço.");
    await this.prisma.workOrderRiskItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async removeEpiItem(tenantId: string, workOrderId: string, itemId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.WORK_ORDER_WRITE, tenantId);
    const workOrder = await this.prisma.workOrder.findFirst({ where: { ...where, id: workOrderId }, include: { signature: true } });
    if (!workOrder) throw new NotFoundException("Ordem de Serviço não encontrada.");
    if (workOrder.signature?.signedAt) throw new ConflictException("Ordem já assinada — não é possível remover itens.");

    const item = await this.prisma.workOrderEpiItem.findFirst({ where: { id: itemId, workOrderId } });
    if (!item) throw new NotFoundException("Item não encontrado nesta Ordem de Serviço.");
    await this.prisma.workOrderEpiItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async savePdfUrl(tenantId: string, id: string, pdfUrl: string, pdfSha256?: string) {
    const existing = await this.prisma.workOrder.findFirst({ where: { tenantId, id } });
    if (existing?.pdfUrl) await del(existing.pdfUrl);
    return this.prisma.workOrder.update({
      where: { id },
      data: { pdfUrl, pdfGeneratedAt: new Date(), ...(pdfSha256 ? { pdfSha256 } : {}) },
    });
  }
}
