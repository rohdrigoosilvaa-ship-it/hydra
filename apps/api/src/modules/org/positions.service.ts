import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreatePositionDto, ImportPositionsDto, LinkPositionRisksDto } from "./dto/org.dto";
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
    select: { hazardId: true, exposureType: true, sendEsocial: true, hazard: { select: { name: true, category: true } } },
    orderBy: { hazard: { name: "asc" } },
  },
  exams: { select: { id: true, name: true }, orderBy: { name: "asc" } },
} as const;

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
        risks: true,
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
              risks: { create: riskRows.map((r) => ({ hazardId: r.hazardId, exposureType: r.exposureType, sendEsocial: r.sendEsocial })) },
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

  /** Vincula riscos do catálogo a um ou mais cargos (ignora o que já está vinculado). */
  async linkRisks(tenantId: string, dto: LinkPositionRisksDto, assignments: RoleAssignmentClaim[]) {
    for (const id of dto.positionIds) await this.assertWritable(tenantId, id, assignments);
    const hazards = await this.prisma.hazard.findMany({
      where: { id: { in: dto.hazardIds }, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (hazards.length !== new Set(dto.hazardIds).size) throw new BadRequestException("Risco não encontrado.");
    const data = dto.positionIds.flatMap((positionId) =>
      hazards.map((h) => ({ positionId, hazardId: h.id, exposureType: dto.exposureType ?? null, sendEsocial: dto.sendEsocial ?? true })),
    );
    const res = await this.prisma.positionRisk.createMany({ data, skipDuplicates: true });
    return { linked: res.count };
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
    const source = await this.get(tenantId, sourceId, assignments);
    const res = await this.prisma.positionRisk.createMany({
      data: source.risks.map((r) => ({ positionId: id, hazardId: r.hazardId, exposureType: r.exposureType, sendEsocial: r.sendEsocial })),
      skipDuplicates: true,
    });
    return { linked: res.count };
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
