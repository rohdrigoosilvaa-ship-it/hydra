import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { CreateHazardDto, UpdateHazardDto } from "./dto/pgr.dto";

@Injectable()
export class HazardsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.hazard.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async get(tenantId: string, id: string) {
    const hazard = await this.prisma.hazard.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!hazard) throw new NotFoundException("Perigo/agente não encontrado.");
    return hazard;
  }

  create(tenantId: string, dto: CreateHazardDto) {
    return this.prisma.hazard.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpdateHazardDto) {
    await this.get(tenantId, id);
    return this.prisma.hazard.update({ where: { id }, data: dto });
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
