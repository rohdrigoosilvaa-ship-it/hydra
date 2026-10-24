import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePositionDto, ImportPositionsDto, LinkPositionRisksDto, PositionRiskFieldsDto, UpdatePositionRiskDto } from "./dto/org.dto";
import { assertCompanyInScope, companyScopeWhere } from "./scope.util";

const UPDATABLE_FIELDS = [
  "code", "name", "cbo", "description", "status", "color", "icon",
  "requiresEntryAptitude", "sectorInfo", "workSchedule", "additionalInfo", "technicalOpinion",
  "complementaryInfoEnabled", "safetyRecommendations", "gfipCode", "ergonomicMethodology", "generalNotes",
  "technicalOpinionEnabled", "ltcatOpinionNotes", "ltcatOpinionConclusion", "hazardPayOpinionNotes",
  "hazardPayOpinionConclusion", "unhealthinessOpinionNotes", "unhealthinessOpinionConclusion",
];

const POSITION_INCLUDE = {
  environments: { select: { environmentId: true } },
  risks: {
    include: {
      hazard: { select: { name: true, category: true } },
      protection: { select: { equipmentId: true, equipment: { select: { id: true, kind: true, name: true } } } },
    },
    orderBy: { hazard: { name: "asc" } },
  },
  exams: { select: { id: true, name: true }, orderBy: { name: "asc" } },
} as const;

const RISK_COPY_KEYS = [
  "hazardId", "exposureType", "sendEsocial", "description", "damagePotential", "observations", "sourceCircumstances",
  "adminMeasures", "measurementType", "generatesUnhealthiness", "generatesHazardPay", "specialRetirement", "insertInAso",
  "epcStatus", "epiStatus", "probability", "severity", "certainty",
] as const;

type RiskWithProtection = { [K in (typeof RISK_COPY_KEYS)[number]]: unknown } & { protection: { equipmentId: string }[] };

/** Cópia completa de um risco de cargo (dados editados, avaliação e EPC/EPI) para outro cargo. */
function cloneRisk(r: RiskWithProtection) {
  const data = Object.fromEntries(RISK_COPY_KEYS.map((k) => [k, r[k]]));
  return { ...data, protection: { create: r.protection.map((p) => ({ equipmentId: p.equipmentId })) } };
}

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], companyId?: string) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    return this.prisma.position.findMany({
      where: { ...where, deletedAt: null, ...(companyId ? { companyId } : {}) },
      orderBy: { name: "asc" },
      include: POSITION_INCLUDE,
    });
  }

  async get(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    const position = await this.prisma.position.findFirst({
      where: { ...where, id, deletedAt: null },
      include: POSITION_INCLUDE,
    });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }

  async create(tenantId: string, dto: CreatePositionDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_POSITION_WRITE, dto.companyId);
    const { environmentIds, esocialStartDate, ...rest } = dto;
    const envIds = await this.validEnvironmentIds(tenantId, dto.companyId, environmentIds);
    return this.prisma.position.create({
      data: {
        ...rest,
        tenantId,
        esocialStartDate: esocialStartDate ? new Date(esocialStartDate) : undefined,
        environments: envIds.length ? { create: envIds.map((environmentId) => ({ environmentId })) } : undefined,
      },
      include: POSITION_INCLUDE,
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreatePositionDto>,
    assignments: RoleAssignmentClaim[],
  ) {
    const current = await this.assertWritable(tenantId, id, assignments);
    const { environmentIds, esocialStartDate } = dto;
    // o PATCH não passa pelo ValidationPipe (tipo Partial) — só estes campos podem mudar
    const rest = Object.fromEntries(Object.entries(dto).filter(([key]) => UPDATABLE_FIELDS.includes(key)));
    const envIds = environmentIds === undefined ? null : await this.validEnvironmentIds(tenantId, current.companyId, environmentIds);
    return this.prisma.$transaction(async (tx) => {
      if (envIds) {
        await tx.positionEnvironment.deleteMany({ where: { positionId: id } });
        if (envIds.length) await tx.positionEnvironment.createMany({ data: envIds.map((environmentId) => ({ positionId: id, environmentId })) });
      }
      return tx.position.update({
        where: { id },
        data: {
          ...rest,
          esocialStartDate: esocialStartDate === undefined ? undefined : esocialStartDate ? new Date(esocialStartDate) : null,
        },
        include: POSITION_INCLUDE,
      });
    });
  }

  /**
   * Copia cargos já cadastrados (desta ou de outra empresa) para a empresa de destino.
   * Ambientes: na mesma empresa mantém os mesmos; em outra empresa liga aos de mesmo nome.
   */
  async importPositions(tenantId: string, dto: ImportPositionsDto, assignments: RoleAssignmentClaim[]) {
    assertCompanyInScope(assignments, PERMISSIONS.ORG_POSITION_WRITE, dto.targetCompanyId);
    const readWhere = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_READ, tenantId);
    const sources = await this.prisma.position.findMany({
      where: { ...readWhere, deletedAt: null, id: { in: dto.items.map((i) => i.sourcePositionId) } },
      include: {
        environments: { select: { environmentId: true, environment: { select: { name: true } } } },
        risks: { include: { protection: true } },
        exams: true,
      },
    });
    if (sources.length !== new Set(dto.items.map((i) => i.sourcePositionId)).size) {
      throw new NotFoundException("Cargo de origem não encontrado.");
    }
    const targetEnvs = await this.prisma.workEnvironment.findMany({
      where: { tenantId, companyId: dto.targetCompanyId, deletedAt: null },
      select: { id: true, name: true },
    });
    const byName = new Map(targetEnvs.map((e) => [e.name.trim().toLowerCase(), e.id]));
    const targetIds = new Set(targetEnvs.map((e) => e.id));

    const created = await this.prisma.$transaction(async (tx) => {
      const out = [];
      for (const item of dto.items) {
        const src = sources.find((s) => s.id === item.sourcePositionId)!;
        const excluded = new Set(item.excludeEnvironmentIds ?? []);
        const envIds = new Set<string>();
        if (item.copyEnvironments !== false) {
          for (const link of src.environments) {
            if (excluded.has(link.environmentId)) continue;
            const sameCompany = src.companyId === dto.targetCompanyId && targetIds.has(link.environmentId);
            const id = sameCompany ? link.environmentId : byName.get(link.environment.name.trim().toLowerCase());
            if (id) envIds.add(id);
          }
        }
        const exclHazards = new Set(item.excludeHazardIds ?? []);
        const exclExams = new Set(item.excludeExamIds ?? []);
        const riskRows = item.copyRisks === false ? [] : src.risks.filter((r) => !exclHazards.has(r.hazardId));
        const examRows = item.copyExams === false ? [] : src.exams.filter((x) => !exclExams.has(x.id));
        const {
          id: _id, tenantId: _t, companyId: _c, name: _n, code: _code, createdAt: _ca, updatedAt: _ua, deletedAt: _d,
          environments: _e, risks: _r, exams: _x, ...data
        } = src;
        out.push(
          await tx.position.create({
            data: {
              ...data,
              tenantId,
              companyId: dto.targetCompanyId,
              name: item.newName.trim(),
              environments: envIds.size ? { create: [...envIds].map((environmentId) => ({ environmentId })) } : undefined,
              risks: { create: riskRows.map((r) => cloneRisk(r) as never) },
              exams: { create: examRows.map((x) => ({ tenantId, name: x.name })) },
            },
            select: { id: true },
          }),
        );
      }
      return out;
    });
    return { imported: created.length };
  }

  /** Só aceita ambientes da mesma empresa do cargo. */
  private async validEnvironmentIds(tenantId: string, companyId: string, ids?: string[]): Promise<string[]> {
    if (!ids?.length) return [];
    const found = await this.prisma.workEnvironment.findMany({
      where: { id: { in: ids }, tenantId, companyId, deletedAt: null },
      select: { id: true },
    });
    return found.map((e) => e.id);
  }

  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    return this.prisma.position.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async assertWritable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.ORG_POSITION_WRITE, tenantId);
    const position = await this.prisma.position.findFirst({ where: { ...where, id, deletedAt: null } });
    if (!position) throw new NotFoundException("Cargo não encontrado.");
    return position;
  }

  /** Vincula um risco do catálogo a um ou mais cargos, já com os dados do cadastro (o que vier no corpo substitui). */
  async linkRisks(tenantId: string, dto: LinkPositionRisksDto, assignments: RoleAssignmentClaim[]) {
    const ids = dto.hazardId ? [dto.hazardId] : (dto.hazardIds ?? []);
    if (ids.length === 0) throw new BadRequestException("Escolha o risco.");
    if (ids.length > 1) {
      let linked = 0;
      for (const hazardId of ids) {
        const res = await this.linkRisks(tenantId, { ...dto, hazardId, hazardIds: undefined }, assignments).catch(() => ({ linked: 0 }));
        linked += res.linked;
      }
      return { linked };
    }
    return this.linkOne(tenantId, ids[0]!, dto, assignments);
  }

  private async linkOne(tenantId: string, hazardId: string, dto: LinkPositionRisksDto, assignments: RoleAssignmentClaim[]) {
    for (const id of dto.positionIds) await this.assertWritable(tenantId, id, assignments);
    const hazard = await this.prisma.hazard.findFirst({
      where: { id: hazardId, tenantId, deletedAt: null },
      include: { protections: { select: { equipmentId: true } } },
    });
    if (!hazard) throw new BadRequestException("Risco não encontrado.");
    const equipmentIds = await this.validEquipmentIds(tenantId, dto.equipmentIds ?? hazard.protections.map((p) => p.equipmentId));
    const data = this.riskData(hazard, dto);
    const existing = await this.prisma.positionRisk.findMany({
      where: { hazardId: hazard.id, positionId: { in: dto.positionIds } },
      select: { positionId: true },
    });
    const have = new Set(existing.map((e) => e.positionId));
    const fresh = dto.positionIds.filter((id) => !have.has(id));
    if (fresh.length === 0) throw new BadRequestException("Este risco já está vinculado ao cargo. Clique nele na lista para editar.");
    await this.prisma.$transaction(
      fresh.map((positionId) =>
        this.prisma.positionRisk.create({
          data: { ...data, positionId, hazardId: hazard.id, protection: { create: equipmentIds.map((equipmentId) => ({ equipmentId })) } },
        }),
      ),
    );
    return { linked: fresh.length };
  }

  async updateRisk(tenantId: string, id: string, hazardId: string, dto: UpdatePositionRiskDto, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    const current = await this.prisma.positionRisk.findUnique({ where: { positionId_hazardId: { positionId: id, hazardId } } });
    if (!current) throw new NotFoundException("Risco não vinculado a este cargo.");
    const equipmentIds = dto.equipmentIds === undefined ? null : await this.validEquipmentIds(tenantId, dto.equipmentIds);
    const data = this.riskData(current, dto);
    return this.prisma.$transaction(async (tx) => {
      if (equipmentIds) {
        await tx.positionRiskProtection.deleteMany({ where: { positionId: id, hazardId } });
        if (equipmentIds.length) {
          await tx.positionRiskProtection.createMany({ data: equipmentIds.map((equipmentId) => ({ positionId: id, hazardId, equipmentId })) });
        }
      }
      return tx.positionRisk.update({ where: { positionId_hazardId: { positionId: id, hazardId } }, data });
    });
  }

  /** Base (cadastro do risco ou valor atual) com os campos enviados por cima. */
  private riskData(base: { [K in keyof PositionRiskFieldsDto]?: PositionRiskFieldsDto[K] | null }, over: PositionRiskFieldsDto) {
    const pick = <K extends keyof PositionRiskFieldsDto>(k: K) => (over[k] !== undefined ? over[k] : base[k]);
    return {
      exposureType: pick("exposureType") ?? null,
      sendEsocial: pick("sendEsocial") ?? true,
      description: pick("description") ?? null,
      damagePotential: pick("damagePotential") ?? null,
      observations: pick("observations") ?? null,
      sourceCircumstances: pick("sourceCircumstances") ?? null,
      adminMeasures: pick("adminMeasures") ?? null,
      measurementType: pick("measurementType") ?? "QUALITATIVO",
      generatesUnhealthiness: pick("generatesUnhealthiness") ?? false,
      generatesHazardPay: pick("generatesHazardPay") ?? false,
      specialRetirement: pick("specialRetirement") ?? false,
      insertInAso: pick("insertInAso") ?? true,
      epcStatus: pick("epcStatus") ?? "NAO_SE_APLICA",
      epiStatus: pick("epiStatus") ?? "NAO_SE_APLICA",
      probability: over.probability !== undefined ? over.probability : (base.probability ?? null),
      severity: over.severity !== undefined ? over.severity : (base.severity ?? null),
      certainty: over.certainty !== undefined ? over.certainty : (base.certainty ?? null),
    };
  }

  private async validEquipmentIds(tenantId: string, ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const found = await this.prisma.protectionEquipment.findMany({ where: { id: { in: ids }, tenantId, deletedAt: null }, select: { id: true } });
    return found.map((e) => e.id);
  }

  async clearRisks(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    const res = await this.prisma.positionRisk.deleteMany({ where: { positionId: id } });
    return { removed: res.count };
  }

  async removeRisk(tenantId: string, id: string, hazardId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    await this.prisma.positionRisk.deleteMany({ where: { positionId: id, hazardId } });
    return { success: true };
  }

  async importRisks(tenantId: string, id: string, sourceId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    await this.get(tenantId, sourceId, assignments);
    const source = await this.prisma.positionRisk.findMany({ where: { positionId: sourceId }, include: { protection: true } });
    const have = new Set((await this.prisma.positionRisk.findMany({ where: { positionId: id }, select: { hazardId: true } })).map((r) => r.hazardId));
    const fresh = source.filter((r) => !have.has(r.hazardId));
    await this.prisma.$transaction(fresh.map((r) => this.prisma.positionRisk.create({ data: { ...cloneRisk(r), positionId: id } as never })));
    return { linked: fresh.length };
  }

  async addExams(tenantId: string, id: string, names: string[], assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    const existing = await this.prisma.positionExam.findMany({ where: { positionId: id }, select: { name: true } });
    const have = new Set(existing.map((e) => e.name.toLowerCase()));
    const fresh = [...new Set(names.map((n) => n.trim()).filter(Boolean))].filter((n) => !have.has(n.toLowerCase()));
    const res = await this.prisma.positionExam.createMany({ data: fresh.map((name) => ({ tenantId, positionId: id, name })) });
    return { added: res.count };
  }

  async clearExams(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    const res = await this.prisma.positionExam.deleteMany({ where: { positionId: id } });
    return { removed: res.count };
  }

  async removeExam(tenantId: string, id: string, examId: string, assignments: RoleAssignmentClaim[]) {
    await this.assertWritable(tenantId, id, assignments);
    await this.prisma.positionExam.deleteMany({ where: { id: examId, positionId: id } });
    return { success: true };
  }

  async importExams(tenantId: string, id: string, sourceId: string, assignments: RoleAssignmentClaim[]) {
    const source = await this.get(tenantId, sourceId, assignments);
    return this.addExams(tenantId, id, source.exams.map((e) => e.name), assignments);
  }
}
