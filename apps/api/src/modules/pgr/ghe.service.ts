import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { CreateGheDto, UpdateGheDto } from "./dto/pgr.dto";
import { assertCompanyInScope, relatedCompanyScopeWhere } from "../org/scope.util";

const FUNCTIONS_INCLUDE = {
  functions: { include: { department: true, position: true } },
} as const;

interface GheOwner {
  pgrId: string | null;
  ltcatId: string | null;
}

@Injectable()
export class GheService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, assignments: RoleAssignmentClaim[], pgrId?: string) {
    const where = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr") as {
      pgr?: Record<string, unknown>;
    } & Record<string, unknown>;
    return this.prisma.ghe.findMany({
      // Mescla deletedAt: null no filtro de pgr já existente (RBAC tenant-wide
      // ou por empresa) — um PGR excluído (soft-delete) não pode vazar aqui.
      // `pgrId: { not: null }` é a guarda contra GHEs de LTCAT: sem isso, o
      // escopo tenant-wide (`{ tenantId }`, sem filtro de relação) devolveria
      // também os GHEs que pertencem a um Ltcat, não a um Pgr.
      where: { ...where, pgr: { ...where.pgr, deletedAt: null }, pgrId: pgrId ?? { not: null } },
      include: FUNCTIONS_INCLUDE,
      orderBy: { name: "asc" },
    });
  }

  async assertPgrEditable(tenantId: string, pgrId: string, assignments: RoleAssignmentClaim[]) {
    const pgr = await this.prisma.pgr.findFirst({ where: { id: pgrId, tenantId, deletedAt: null } });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.PGR_WRITE, pgr.companyId);
    return pgr;
  }

  async assertLtcatEditable(tenantId: string, ltcatId: string, assignments: RoleAssignmentClaim[]) {
    const ltcat = await this.prisma.ltcat.findFirst({ where: { id: ltcatId, tenantId, deletedAt: null } });
    if (!ltcat) throw new NotFoundException("LTCAT não encontrado.");
    assertCompanyInScope(assignments, PERMISSIONS.LTCAT_WRITE, ltcat.companyId);
    return ltcat;
  }

  /** Um GHE pertence a exatamente um dos dois — ramifica pra validação certa conforme o dono. */
  async assertGheOwnerEditable(tenantId: string, ghe: GheOwner, assignments: RoleAssignmentClaim[]) {
    if (ghe.pgrId) return this.assertPgrEditable(tenantId, ghe.pgrId, assignments);
    if (ghe.ltcatId) return this.assertLtcatEditable(tenantId, ghe.ltcatId, assignments);
    throw new NotFoundException("GHE sem PGR ou LTCAT associado.");
  }

  private async assertGheEditable(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    const ghe = await this.prisma.ghe.findFirst({ where: { id, tenantId } });
    if (!ghe) throw new NotFoundException("GHE não encontrado.");
    await this.assertGheOwnerEditable(tenantId, ghe, assignments);
    return ghe;
  }

  /**
   * Exclui o GHE do documento junto com seus riscos e vínculos de cargo. As ações do plano ligadas a esses
   * riscos continuam existindo (só perdem o vínculo com o risco), como na exclusão de um risco avulso.
   */
  async remove(tenantId: string, id: string, assignments: RoleAssignmentClaim[]) {
    await this.assertGheEditable(tenantId, id, assignments);
    await this.prisma.$transaction(async (tx) => {
      const riskIds = (await tx.pgrRisk.findMany({ where: { gheId: id }, select: { id: true } })).map((r) => r.id);
      if (riskIds.length) await tx.pgrAction.updateMany({ where: { pgrRiskId: { in: riskIds } }, data: { pgrRiskId: null } });
      await tx.pgrRisk.deleteMany({ where: { gheId: id } });
      await tx.gheFunction.deleteMany({ where: { gheId: id } });
      await tx.ltcatAgent.updateMany({ where: { gheId: id }, data: { gheId: null } });
      await tx.ghe.delete({ where: { id } });
    });
    return { success: true };
  }

  async create(tenantId: string, dto: CreateGheDto, assignments: RoleAssignmentClaim[]) {
    if (!dto.pgrId && !dto.ltcatId) throw new BadRequestException("Informe pgrId ou ltcatId.");
    if (dto.pgrId && dto.ltcatId) throw new BadRequestException("Um GHE pertence a um PGR ou a um LTCAT, nunca aos dois.");
    const owner = dto.pgrId
      ? await this.assertPgrEditable(tenantId, dto.pgrId, assignments)
      : await this.assertLtcatEditable(tenantId, dto.ltcatId!, assignments);

    const { departmentId, positionIds, ...gheData } = dto;
    if (!departmentId) {
      return this.prisma.ghe.create({ data: { ...gheData, tenantId }, include: FUNCTIONS_INCLUDE });
    }

    // GHE criado a partir de um Setor cadastrado: o setor (e os cargos escolhidos) já entram como vínculos.
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, companyId: owner.companyId, deletedAt: null },
    });
    if (!department) throw new NotFoundException("Setor não encontrado nesta empresa.");
    const uniquePositionIds = [...new Set(positionIds ?? [])];
    if (uniquePositionIds.length) {
      const found = await this.prisma.position.count({
        where: { id: { in: uniquePositionIds }, tenantId, companyId: owner.companyId, deletedAt: null },
      });
      if (found !== uniquePositionIds.length) throw new NotFoundException("Cargo não encontrado nesta empresa.");
    }
    return this.prisma.$transaction(async (tx) => {
      const ghe = await tx.ghe.create({ data: { ...gheData, tenantId } });
      await tx.gheFunction.createMany({
        data: (uniquePositionIds.length ? uniquePositionIds : [null]).map((positionId) => ({
          tenantId,
          gheId: ghe.id,
          departmentId,
          positionId,
        })),
      });
      return tx.ghe.findUniqueOrThrow({ where: { id: ghe.id }, include: FUNCTIONS_INCLUDE });
    });
  }

  /**
   * Setores da empresa com a quantidade de colaboradores ativos (total e por cargo) —
   * alimenta o seletor "Setor → GHE" e as contagens automáticas nos vínculos.
   */
  async departmentSummary(tenantId: string, assignments: RoleAssignmentClaim[], companyId: string) {
    assertCompanyInScope(assignments, PERMISSIONS.PGR_READ, companyId);
    const [departments, positions, groups] = await Promise.all([
      this.prisma.department.findMany({
        where: { tenantId, companyId, deletedAt: null, status: "ACTIVE" },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.position.findMany({
        where: { tenantId, companyId, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.employee.groupBy({
        by: ["departmentId", "positionId"],
        where: { tenantId, companyId, deletedAt: null, status: { not: "TERMINATED" } },
        _count: { _all: true },
      }),
    ]);
    const positionName = new Map(positions.map((p) => [p.id, p.name]));
    return departments.map((d) => {
      const own = groups.filter((g) => g.departmentId === d.id);
      return {
        ...d,
        employeeCount: own.reduce((n, g) => n + g._count._all, 0),
        positions: own
          .filter((g) => g.positionId && positionName.has(g.positionId))
          .map((g) => ({ id: g.positionId!, name: positionName.get(g.positionId!)!, count: g._count._all }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  }

  async update(tenantId: string, id: string, dto: UpdateGheDto, assignments: RoleAssignmentClaim[]) {
    await this.assertGheEditable(tenantId, id, assignments);
    return this.prisma.ghe.update({ where: { id }, data: dto, include: FUNCTIONS_INCLUDE });
  }
}
