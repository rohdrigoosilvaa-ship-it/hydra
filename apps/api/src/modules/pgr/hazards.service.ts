import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { CreateHazardDto, UpdateHazardDto } from "./dto/pgr.dto";

const HAZARD_INCLUDE = {
  protections: { select: { equipment: { select: { id: true, kind: true, name: true } } } },
} as const;

@Injectable()
export class HazardsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.hazard.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      include: HAZARD_INCLUDE,
    });
  }

  async get(tenantId: string, id: string) {
    const hazard = await this.prisma.hazard.findFirst({ where: { id, tenantId, deletedAt: null }, include: HAZARD_INCLUDE });
    if (!hazard) throw new NotFoundException("Perigo/agente não encontrado.");
    return hazard;
  }

  async create(tenantId: string, dto: CreateHazardDto) {
    const { equipmentIds, ...rest } = dto;
    const ids = await this.validEquipmentIds(tenantId, equipmentIds);
    return this.prisma.hazard.create({
      data: { ...rest, tenantId, protections: { create: ids.map((equipmentId) => ({ equipmentId })) } },
      include: HAZARD_INCLUDE,
    });
  }

  /** Só aceita equipamentos do banco do próprio cliente. */
  private async validEquipmentIds(tenantId: string, ids?: string[]): Promise<string[]> {
    if (!ids?.length) return [];
    const found = await this.prisma.protectionEquipment.findMany({ where: { id: { in: ids }, tenantId, deletedAt: null }, select: { id: true } });
    return found.map((e) => e.id);
  }

  async update(tenantId: string, id: string, dto: UpdateHazardDto) {
    await this.get(tenantId, id);
    const { equipmentIds, ...rest } = dto;
    const ids = equipmentIds === undefined ? null : await this.validEquipmentIds(tenantId, equipmentIds);
    return this.prisma.$transaction(async (tx) => {
      if (ids) {
        await tx.hazardProtection.deleteMany({ where: { hazardId: id } });
        if (ids.length) await tx.hazardProtection.createMany({ data: ids.map((equipmentId) => ({ hazardId: id, equipmentId })) });
      }
      return tx.hazard.update({ where: { id }, data: rest, include: HAZARD_INCLUDE });
    });
  }

  /** Exclusão lógica. Perigo em uso no inventário de algum PGR não pode ser excluído. */
  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    const inUse = await this.prisma.pgrRisk.count({ where: { tenantId, hazardId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Este perigo está em uso em ${inUse} risco(s) do inventário. Remova ou troque esses riscos antes de excluí-lo.`,
      );
    }
    const linked = await this.prisma.positionRisk.count({ where: { hazardId: id, position: { tenantId, deletedAt: null } } });
    if (linked > 0) {
      throw new BadRequestException(`Este risco está vinculado a ${linked} cargo(s). Desvincule-o dos cargos antes de excluí-lo.`);
    }
    await this.prisma.hazard.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
