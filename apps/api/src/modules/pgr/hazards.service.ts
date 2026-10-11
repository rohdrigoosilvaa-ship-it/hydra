import { Injectable, NotFoundException } from "@nestjs/common";
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
}
