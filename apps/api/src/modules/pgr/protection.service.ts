import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProtectionKind } from "@hydra/db";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { CreateProtectionCategoryDto, CreateProtectionEquipmentDto } from "./dto/pgr.dto";

/** Banco de Equipamentos de Proteção (EPC/EPI) do cliente. */
@Injectable()
export class ProtectionService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(tenantId: string, kind?: ProtectionKind) {
    return this.prisma.protectionCategory.findMany({ where: { tenantId, ...(kind ? { kind } : {}) }, orderBy: { name: "asc" } });
  }

  async createCategory(tenantId: string, dto: CreateProtectionCategoryDto) {
    const name = dto.name.trim();
    return this.prisma.protectionCategory.upsert({
      where: { tenantId_kind_name: { tenantId, kind: dto.kind, name } },
      update: {},
      create: { tenantId, kind: dto.kind, name },
    });
  }

  listEquipment(tenantId: string, kind?: ProtectionKind) {
    return this.prisma.protectionEquipment.findMany({
      where: { tenantId, deletedAt: null, ...(kind ? { kind } : {}) },
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async createEquipment(tenantId: string, dto: CreateProtectionEquipmentDto) {
    if (dto.categoryId) {
      const cat = await this.prisma.protectionCategory.findFirst({ where: { id: dto.categoryId, tenantId, kind: dto.kind } });
      if (!cat) throw new BadRequestException("Categoria não encontrada.");
    }
    return this.prisma.protectionEquipment.create({
      data: {
        tenantId,
        kind: dto.kind,
        categoryId: dto.categoryId || null,
        name: dto.name.trim(),
        usefulLifeMonths: dto.usefulLifeMonths ?? null,
        description: dto.description.trim(),
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }
}
