import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { CreateHazardDto, UpdateHazardDto } from "./dto/pgr.dto";
import { syncPositionExams } from "../org/position-exams.util";
import { MASTER_HAZARDS, MASTER_HAZARDS_REF } from "./master-hazards.data";

const HAZARD_INCLUDE = {
  protections: { select: { equipment: { select: { id: true, kind: true, name: true } } } },
  exams: { select: { id: true, name: true, periodicityMonths: true }, orderBy: { name: "asc" } },
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
    const { equipmentIds, exams, ...rest } = dto;
    const ids = await this.validEquipmentIds(tenantId, equipmentIds);
    return this.prisma.hazard.create({
      data: {
        ...rest,
        tenantId,
        protections: { create: ids.map((equipmentId) => ({ equipmentId })) },
        exams: { create: (exams ?? []).map((e) => ({ tenantId, name: e.name.trim(), periodicityMonths: e.periodicityMonths ?? 12 })) },
      },
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
    const { equipmentIds, exams, ...rest } = dto;
    const ids = equipmentIds === undefined ? null : await this.validEquipmentIds(tenantId, equipmentIds);
    return this.prisma.$transaction(async (tx) => {
      if (exams) {
        await tx.hazardExam.deleteMany({ where: { hazardId: id } });
        if (exams.length) {
          await tx.hazardExam.createMany({ data: exams.map((e) => ({ tenantId, hazardId: id, name: e.name.trim(), periodicityMonths: e.periodicityMonths ?? 12 })) });
        }
        // cargos que têm este risco passam a ter os exames atualizados
        const linked = await tx.positionRisk.findMany({ where: { hazardId: id }, select: { positionId: true } });
        for (const { positionId } of linked) await syncPositionExams(tx, tenantId, positionId);
      }
      if (ids) {
        await tx.hazardProtection.deleteMany({ where: { hazardId: id } });
        if (ids.length) await tx.hazardProtection.createMany({ data: ids.map((equipmentId) => ({ hazardId: id, equipmentId })) });
      }
      return tx.hazard.update({ where: { id }, data: rest, include: HAZARD_INCLUDE });
    });
  }

  /**
   * Carrega a base mestra de riscos ocupacionais no catálogo do cliente. O que ainda não existe (mesmo nome, sem
   * diferenciar maiúsculas) é criado; o que já existe recebe o texto padrão e o valor anterior fica no histórico
   * (auditoria). Exposição, eSocial, insalubridade, periculosidade, aposentadoria especial, ASO, EPC/EPI,
   * exames e equipamentos do cliente não são alterados. Pode ser repetido sem duplicar.
   */
  async loadMaster(tenantId: string, userId: string) {
    const existing = await this.prisma.hazard.findMany({ where: { tenantId, deletedAt: null } });
    const byName = new Map(existing.map((h) => [h.name.trim().toLowerCase(), h]));
    let created = 0;
    let updated = 0;
    for (const m of MASTER_HAZARDS) {
      const content = {
        category: m.category,
        esocialCode: m.esocialCode,
        description: m.description,
        damagePotential: m.damagePotential,
        observations: m.observations,
        sourceCircumstances: m.sourceCircumstances,
        adminMeasures: m.adminMeasures,
        measurementType: m.measurementType,
      };
      const cur = byName.get(m.name.trim().toLowerCase());
      if (!cur) {
        await this.prisma.hazard.create({ data: { tenantId, name: m.name, ...content, insertInAso: false } });
        created++;
        continue;
      }
      const changed = (Object.keys(content) as (keyof typeof content)[]).some((k) => (cur[k] ?? null) !== content[k]);
      if (!changed) continue;
      const before = Object.fromEntries((Object.keys(content) as (keyof typeof content)[]).map((k) => [k, cur[k] ?? null]));
      await this.prisma.$transaction([
        this.prisma.auditLog.create({
          data: { tenantId, userId, action: "hazard.master_update", entityType: "hazard", entityId: cur.id, metadata: { source: MASTER_HAZARDS_REF, before } },
        }),
        this.prisma.hazard.update({ where: { id: cur.id }, data: content }),
      ]);
      updated++;
    }
    return { total: MASTER_HAZARDS.length, created, updated, unchanged: MASTER_HAZARDS.length - created - updated };
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
