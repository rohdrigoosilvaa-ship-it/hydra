import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { del } from "@vercel/blob";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { assertCompanyInScope, companyScopeWhere } from "../org/scope.util";
import type {
  CreateEpiDeliveryDto,
  CreateEpiDeliveryItemDto,
  UpdateEpiDeliveryDto,
  UpdateEpiDeliveryItemDto,
} from "./dto/epi.dto";

export type EpiSigningStatus = "NAO_ENVIADA" | "AGUARDANDO_ASSINATURA" | "ASSINADA";

function computeSigningStatus(signature: { signedAt: Date | null } | null): EpiSigningStatus {
  if (!signature) return "NAO_ENVIADA";
  return signature.signedAt ? "ASSINADA" : "AGUARDANDO_ASSINATURA";
}

/** Soma meses a uma data em UTC — mesma técnica usada no front pra sugerir vencimento. */
function addMonthsUtc(base: Date, months: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()));
}

@Injectable()
export class EpiDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    if (companyId) assertCompanyInScope(assignments, PERMISSIONS.EPI_READ, companyId);
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_READ, tenantId);
    const deliveries = await this.prisma.epiDelivery.findMany({
      where: { ...where, ...(companyId ? { companyId } : {}) },
      include: { items: true, signature: { select: { signedAt: true } } },
      orderBy: { deliveryDate: "desc" },
    });
    return deliveries.map((d) => ({ ...d, signingStatus: computeSigningStatus(d.signature) }));
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_READ, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({
      where: { ...where, id },
      include: {
        items: { include: { catalogItem: true }, orderBy: { createdAt: "asc" } },
        signature: { select: { signedAt: true, signerName: true, ip: true } },
      },
    });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");
    return { ...delivery, signingStatus: computeSigningStatus(delivery.signature) };
  }

  async create(tenantId: string, dto: CreateEpiDeliveryDto, userId: string, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.EPI_WRITE, dto.companyId);

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, id: dto.employeeId, companyId: dto.companyId, deletedAt: null },
      include: { department: true, position: true },
    });
    if (!employee) throw new NotFoundException("Colaborador não encontrado nesta empresa.");

    const deliveryDate = new Date(dto.deliveryDate);

    // Puxa automaticamente os EPIs cadastrados como exigidos pelo Cargo do
    // colaborador (Cadastros > Cargos > "EPIs exigidos") — mesmo princípio já
    // usado na Ordem de Serviço, só que aqui os itens continuam editáveis
    // (a ficha de EPI não é imutável até ser assinada).
    const requiredEpis = employee.positionId
      ? await this.prisma.positionRequiredEpi.findMany({
          where: { tenantId, positionId: employee.positionId },
          include: { catalogItem: true },
        })
      : [];

    const created = await this.prisma.epiDelivery.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        deliveryDate,
        employeeName: employee.name,
        departmentName: employee.department?.name ?? null,
        positionName: employee.position?.name ?? null,
        admittedAt: employee.admittedAt,
        createdById: userId,
      },
    });

    if (requiredEpis.length) {
      await this.prisma.epiDeliveryItem.createMany({
        data: requiredEpis.map((req) => ({
          tenantId,
          deliveryId: created.id,
          epiCatalogItemId: req.epiCatalogItemId,
          epiName: req.catalogItem?.name ?? req.epiName,
          ca: req.ca,
          periodicityMonths: req.periodicityMonths,
          expiresAt: req.periodicityMonths ? addMonthsUtc(deliveryDate, req.periodicityMonths) : undefined,
          observation: req.notes,
        })),
      });
    }

    return this.prisma.epiDelivery.findUniqueOrThrow({ where: { id: created.id }, include: { items: true } });
  }

  async update(tenantId: string, id: string, dto: UpdateEpiDeliveryDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_WRITE, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({ where: { ...where, id }, include: { signature: true } });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");
    if (delivery.signature?.signedAt) throw new ConflictException("Ficha já assinada — não é possível editar.");

    return this.prisma.epiDelivery.update({
      where: { id },
      data: {
        ...(dto.deliveryDate !== undefined ? { deliveryDate: new Date(dto.deliveryDate) } : {}),
      },
      include: { items: true },
    });
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_WRITE, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({ where: { ...where, id } });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");
    if (delivery.pdfUrl) await del(delivery.pdfUrl);
    await this.prisma.epiDelivery.delete({ where: { id } });
    return { success: true };
  }

  async addItem(tenantId: string, deliveryId: string, dto: CreateEpiDeliveryItemDto, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_WRITE, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({ where: { ...where, id: deliveryId }, include: { signature: true } });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");
    if (delivery.signature?.signedAt) throw new ConflictException("Ficha já assinada — não é possível adicionar itens.");

    return this.prisma.epiDeliveryItem.create({
      data: {
        tenantId,
        deliveryId,
        epiCatalogItemId: dto.epiCatalogItemId,
        epiName: dto.epiName,
        ca: dto.ca,
        quantity: dto.quantity,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        periodicityMonths: dto.periodicityMonths,
        observation: dto.observation,
      },
    });
  }

  async updateItem(
    tenantId: string,
    deliveryId: string,
    itemId: string,
    dto: UpdateEpiDeliveryItemDto,
    assignments: RoleAssignmentClaim[],
  ) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_WRITE, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({ where: { ...where, id: deliveryId }, include: { signature: true } });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");
    if (delivery.signature?.signedAt) throw new ConflictException("Ficha já assinada — não é possível editar itens.");

    const item = await this.prisma.epiDeliveryItem.findFirst({ where: { id: itemId, deliveryId } });
    if (!item) throw new NotFoundException("Item não encontrado nesta ficha.");

    return this.prisma.epiDeliveryItem.update({
      where: { id: itemId },
      data: {
        ...(dto.epiCatalogItemId !== undefined ? { epiCatalogItemId: dto.epiCatalogItemId || null } : {}),
        ...(dto.epiName !== undefined ? { epiName: dto.epiName } : {}),
        ...(dto.ca !== undefined ? { ca: dto.ca || null } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity || null } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}),
        ...(dto.periodicityMonths !== undefined ? { periodicityMonths: dto.periodicityMonths } : {}),
        ...(dto.observation !== undefined ? { observation: dto.observation || null } : {}),
      },
    });
  }

  async removeItem(tenantId: string, deliveryId: string, itemId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.EPI_WRITE, tenantId);
    const delivery = await this.prisma.epiDelivery.findFirst({ where: { ...where, id: deliveryId }, include: { signature: true } });
    if (!delivery) throw new NotFoundException("Ficha de EPI não encontrada.");
    if (delivery.signature?.signedAt) throw new ConflictException("Ficha já assinada — não é possível remover itens.");

    const item = await this.prisma.epiDeliveryItem.findFirst({ where: { id: itemId, deliveryId } });
    if (!item) throw new NotFoundException("Item não encontrado nesta ficha.");
    await this.prisma.epiDeliveryItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async savePdfUrl(tenantId: string, id: string, pdfUrl: string, pdfSha256?: string) {
    const existing = await this.prisma.epiDelivery.findFirst({ where: { tenantId, id } });
    if (existing?.pdfUrl) await del(existing.pdfUrl);
    return this.prisma.epiDelivery.update({
      where: { id },
      data: { pdfUrl, pdfGeneratedAt: new Date(), ...(pdfSha256 ? { pdfSha256 } : {}) },
    });
  }
}
