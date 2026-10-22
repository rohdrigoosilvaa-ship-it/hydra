import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { CreateEpiStockItemDto, UpdateEpiStockItemDto } from "./dto/epi.dto";

const clean = (v?: string | null) => (v === undefined ? undefined : v?.trim() || null);

@Injectable()
export class EpiStockService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.epiStockItem.findMany({ where: { tenantId }, orderBy: [{ name: "asc" }, { createdAt: "desc" }] });
  }

  create(tenantId: string, dto: CreateEpiStockItemDto, userId: string) {
    return this.prisma.epiStockItem.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        ca: clean(dto.ca) ?? null,
        category: clean(dto.category) ?? null,
        quantity: dto.quantity ?? 0,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: clean(dto.notes) ?? null,
        createdById: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEpiStockItemDto) {
    await this.get(tenantId, id);
    return this.prisma.epiStockItem.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        ca: clean(dto.ca),
        category: clean(dto.category),
        quantity: dto.quantity,
        expiresAt: dto.expiresAt === undefined ? undefined : dto.expiresAt === null ? null : new Date(dto.expiresAt),
        notes: clean(dto.notes),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.prisma.epiStockItem.delete({ where: { id } });
    return { success: true };
  }

  private async get(tenantId: string, id: string) {
    const item = await this.prisma.epiStockItem.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException("Item de estoque não encontrado.");
    return item;
  }
}
